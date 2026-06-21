import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  requireOwnedProspect,
  requireOwnedWorkspace,
  requireUser,
} from "./lib/accessHelpers";
import {
  type FeedAnchorKey,
  normalizeProspectListSort,
  summaryRowToAnchorKey,
} from "./lib/prospectListFeedUtils";
import { mutation, query } from "./lib/functionBuilders";
import { listWorkspaceProspectSummariesPage } from "./prospectSummaries";
import { getCurrentUTCTimestamp } from "../shared/lib/utils/time/timeUtils";
import {
  prospectListSortValidator,
  prospectPlatformValidator,
  prospectStatusValidator,
  prospectTypeValidator,
  prospectVisibilityModeValidator,
} from "./validators";

const MAX_SCAN_FIRST_PAGE = 3000;
const MAX_PENDING_SCAN = 500;
const MAX_TRACKED_VISIBLE_PROSPECTS = 200;
const CURSOR_PREFIX = "ppfs1:";

type FeedAccessCtx = Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">;
type FeedScopeArgs = {
  platform?: Doc<"prospects">["platform"];
  prospectType?: Doc<"prospects">["prospectType"];
  fitScoreMin?: number;
  fitScoreMax?: number;
  createdAfterMs?: number;
  createdBeforeMs?: number;
  visibilityMode?: "all" | "ready_only" | "actionable_only";
};
type FeedSnapshotDoc = Doc<"prospectListFeedAnchors">;
type FeedSnapshotState = {
  anchor: FeedAnchorKey;
  visibleProspectIds: Id<"prospects">[];
};

function encodeCursor(offset: number): string {
  return `${CURSOR_PREFIX}${offset}`;
}

function decodeCursor(cursor: string | null): number {
  if (!cursor?.startsWith(CURSOR_PREFIX)) {
    return 0;
  }

  const value = Number(cursor.slice(CURSOR_PREFIX.length));
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.floor(value);
}

function anchorFromDoc(
  doc: Doc<"prospectListFeedAnchors">
): FeedAnchorKey | null {
  if (doc.anchorProspectId === undefined) {
    return null;
  }
  return {
    sortBy: normalizeProspectListSort(doc.sortBy),
    anchorSortScore: doc.anchorSortScore,
    anchorProspectCreatedAt: doc.anchorProspectCreatedAt,
    anchorProspectType: doc.anchorProspectType ?? "unknown",
    anchorProspectId: doc.anchorProspectId,
  };
}

function buildFeedScopeKey(args: FeedScopeArgs): string {
  return JSON.stringify({
    visibilityMode: args.visibilityMode ?? "all",
    platform: args.platform ?? null,
    prospectType: args.prospectType ?? null,
    fitScoreMin: args.fitScoreMin ?? null,
    fitScoreMax: args.fitScoreMax ?? null,
    createdAfterMs:
      args.createdAfterMs !== undefined
        ? Math.round(args.createdAfterMs)
        : null,
    createdBeforeMs:
      args.createdBeforeMs !== undefined
        ? Math.round(args.createdBeforeMs)
        : null,
  });
}

async function listFeedSnapshotCandidates(
  ctx: FeedAccessCtx,
  args: {
    userId: Id<"users">;
    workspaceId: Id<"workspaces">;
    status: Doc<"prospectSummaries">["status"];
    sortBy: ReturnType<typeof normalizeProspectListSort>;
  }
): Promise<FeedSnapshotDoc[]> {
  return await ctx.db
    .query("prospectListFeedAnchors")
    .withIndex("by_user_workspace_status_sort", (q) =>
      q
        .eq("userId", args.userId)
        .eq("workspaceId", args.workspaceId)
        .eq("status", args.status)
        .eq("sortBy", args.sortBy)
    )
    .collect();
}

function selectLatestSnapshot(docs: FeedSnapshotDoc[]): FeedSnapshotDoc | null {
  const [latest] = [...docs].sort(
    (left, right) => right.updatedAt - left.updatedAt
  );
  return latest ?? null;
}

function selectFeedSnapshotForRead(
  docs: FeedSnapshotDoc[],
  scopeKey: string
): FeedSnapshotDoc | null {
  return selectLatestSnapshot(docs.filter((doc) => doc.scopeKey === scopeKey));
}

function selectFeedSnapshotForWrite(
  docs: FeedSnapshotDoc[],
  scopeKey: string
): FeedSnapshotDoc | null {
  return (
    selectFeedSnapshotForRead(docs, scopeKey) ??
    selectLatestSnapshot(docs.filter((doc) => doc.scopeKey === undefined))
  );
}

function getFeedSnapshotState(
  doc: FeedSnapshotDoc | null
): FeedSnapshotState | null {
  if (!doc) {
    return null;
  }

  const anchor = anchorFromDoc(doc);
  const visibleProspectIds =
    doc.visibleProspectIds?.slice(0, MAX_TRACKED_VISIBLE_PROSPECTS) ?? [];

  if (!anchor || visibleProspectIds.length === 0) {
    return null;
  }

  return {
    anchor,
    visibleProspectIds,
  };
}

function buildCanonicalVisibleRows(
  rows: Doc<"prospectSummaries">[],
  visibleProspectIds: Id<"prospects">[]
): Doc<"prospectSummaries">[] {
  const cappedIds = visibleProspectIds.slice(0, MAX_TRACKED_VISIBLE_PROSPECTS);
  if (cappedIds.length === 0) {
    return [];
  }

  const visibleIdSet = new Set(cappedIds);
  return rows.filter((row) => visibleIdSet.has(row.prospectId));
}

function buildStableFeedRows(
  rows: Doc<"prospectSummaries">[],
  snapshot: FeedSnapshotState
) {
  const visibleIdSet = new Set(snapshot.visibleProspectIds);
  const visibleRows = rows.filter((row) => visibleIdSet.has(row.prospectId));
  const lastVisibleIndex = rows.findIndex(
    (row) => row.prospectId === snapshot.anchor.anchorProspectId
  );

  if (lastVisibleIndex < 0) {
    return {
      stableRows: visibleRows,
      pendingRows: [] as Doc<"prospectSummaries">[],
    };
  }

  const pendingRows = rows
    .slice(0, lastVisibleIndex + 1)
    .filter((row) => !visibleIdSet.has(row.prospectId));
  const trailingRows = rows
    .slice(lastVisibleIndex + 1)
    .filter((row) => !visibleIdSet.has(row.prospectId));

  return {
    stableRows: [...visibleRows, ...trailingRows],
    pendingRows,
  };
}

export const listStableWorkspaceProspectSummaries = query({
  args: {
    workspaceId: v.id("workspaces"),
    status: prospectStatusValidator,
    sortBy: v.optional(prospectListSortValidator),
    platform: v.optional(prospectPlatformValidator),
    prospectType: v.optional(prospectTypeValidator),
    fitScoreMin: v.optional(v.number()),
    fitScoreMax: v.optional(v.number()),
    createdAfterMs: v.optional(v.number()),
    createdBeforeMs: v.optional(v.number()),
    visibilityMode: v.optional(prospectVisibilityModeValidator),
    paginationOpts: paginationOptsValidator,
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, { notFoundMessage: "User not found" });
    await requireOwnedWorkspace(ctx, args.workspaceId, {
      user,
      notFoundMessage: "Workspace not found",
      notAuthorizedMessage: "Not authorized to view this workspace",
    });

    if (args.searchQuery?.trim()) {
      return await listWorkspaceProspectSummariesPage(ctx.db, {
        workspaceId: args.workspaceId,
        sortBy: args.sortBy,
        platform: args.platform,
        prospectType: args.prospectType,
        status: args.status,
        fitScoreMin: args.fitScoreMin,
        fitScoreMax: args.fitScoreMax,
        createdAfterMs: args.createdAfterMs,
        createdBeforeMs: args.createdBeforeMs,
        visibilityMode: args.visibilityMode,
        searchQuery: args.searchQuery.trim(),
        paginationOpts: args.paginationOpts,
      });
    }
    const sortBy = normalizeProspectListSort(args.sortBy);
    const scopeKey = buildFeedScopeKey(args);
    const snapshotDoc = selectFeedSnapshotForRead(
      await listFeedSnapshotCandidates(ctx, {
        userId: user._id,
        workspaceId: args.workspaceId,
        status: args.status,
        sortBy,
      }),
      scopeKey
    );

    const numItems = args.paginationOpts.numItems;
    const start = decodeCursor(args.paginationOpts.cursor);

    const orderedResult = await listWorkspaceProspectSummariesPage(ctx.db, {
      workspaceId: args.workspaceId,
      sortBy,
      platform: args.platform,
      prospectType: args.prospectType,
      status: args.status,
      fitScoreMin: args.fitScoreMin,
      fitScoreMax: args.fitScoreMax,
      createdAfterMs: args.createdAfterMs,
      createdBeforeMs: args.createdBeforeMs,
      visibilityMode: args.visibilityMode,
      paginationOpts: { cursor: null, numItems: MAX_SCAN_FIRST_PAGE },
    });
    const snapshot = getFeedSnapshotState(snapshotDoc);
    const stable = snapshot
      ? buildStableFeedRows(orderedResult.page, snapshot).stableRows
      : orderedResult.page;

    const page = stable.slice(start, start + numItems);
    const hasMoreInSlice = stable.length > start + numItems;
    const isDone = !hasMoreInSlice && orderedResult.isDone;
    const continueCursor =
      !isDone && page.length > 0 ? encodeCursor(start + page.length) : "";

    return {
      page,
      isDone,
      continueCursor,
    };
  },
});

export const getProspectListFeedState = query({
  args: {
    workspaceId: v.id("workspaces"),
    status: prospectStatusValidator,
    sortBy: v.optional(prospectListSortValidator),
    platform: v.optional(prospectPlatformValidator),
    prospectType: v.optional(prospectTypeValidator),
    fitScoreMin: v.optional(v.number()),
    fitScoreMax: v.optional(v.number()),
    createdAfterMs: v.optional(v.number()),
    createdBeforeMs: v.optional(v.number()),
    visibilityMode: v.optional(prospectVisibilityModeValidator),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, { notFoundMessage: "User not found" });
    await requireOwnedWorkspace(ctx, args.workspaceId, {
      user,
      notFoundMessage: "Workspace not found",
      notAuthorizedMessage: "Not authorized to view this workspace",
    });

    const sortBy = normalizeProspectListSort(args.sortBy);
    const scopeKey = buildFeedScopeKey(args);
    const snapshotDoc = selectFeedSnapshotForRead(
      await listFeedSnapshotCandidates(ctx, {
        userId: user._id,
        workspaceId: args.workspaceId,
        status: args.status,
        sortBy,
      }),
      scopeKey
    );
    const snapshot = getFeedSnapshotState(snapshotDoc);

    if (!snapshot) {
      return {
        hasAnchor: false,
        pendingCount: 0,
        pendingCountCapped: false,
        visibleProspectIds: [] as Id<"prospects">[],
        pendingPreview: [] as Array<{
          prospectId: Id<"prospects">;
          displayName: string;
          avatarUrl?: string;
        }>,
      };
    }

    const orderedResult = await listWorkspaceProspectSummariesPage(ctx.db, {
      workspaceId: args.workspaceId,
      sortBy,
      platform: args.platform,
      prospectType: args.prospectType,
      status: args.status,
      fitScoreMin: args.fitScoreMin,
      fitScoreMax: args.fitScoreMax,
      createdAfterMs: args.createdAfterMs,
      createdBeforeMs: args.createdBeforeMs,
      visibilityMode: args.visibilityMode,
      paginationOpts: { cursor: null, numItems: MAX_PENDING_SCAN },
    });
    const { pendingRows } = buildStableFeedRows(orderedResult.page, snapshot);
    const pendingPreview: Array<{
      prospectId: Id<"prospects">;
      displayName: string;
      avatarUrl?: string;
    }> = [];

    for (const row of pendingRows) {
      if (pendingPreview.length >= 3) {
        break;
      }
      pendingPreview.push({
        prospectId: row.prospectId,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
      });
    }

    const pendingCountCapped =
      pendingRows.length >= MAX_PENDING_SCAN && !orderedResult.isDone;

    return {
      hasAnchor: true,
      pendingCount: pendingRows.length,
      pendingCountCapped,
      visibleProspectIds: snapshot.visibleProspectIds,
      pendingPreview,
    };
  },
});

export const getProspectOpenedMap = query({
  args: {
    workspaceId: v.id("workspaces"),
    prospectIds: v.array(v.id("prospects")),
  },
  handler: async (ctx, { workspaceId, prospectIds }) => {
    const user = await requireUser(ctx, { notFoundMessage: "User not found" });
    await requireOwnedWorkspace(ctx, workspaceId, {
      user,
      notFoundMessage: "Workspace not found",
      notAuthorizedMessage: "Not authorized to view this workspace",
    });

    const capped = prospectIds.slice(0, 50);
    const opened: Record<string, boolean> = {};
    for (const prospectId of capped) {
      const row = await ctx.db
        .query("prospectViews")
        .withIndex("by_user_prospect", (q) =>
          q.eq("userId", user._id).eq("prospectId", prospectId)
        )
        .first();
      opened[prospectId] = !!row;
    }
    return opened;
  },
});

export const syncProspectListFeedSnapshot = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    status: prospectStatusValidator,
    sortBy: v.optional(prospectListSortValidator),
    platform: v.optional(prospectPlatformValidator),
    prospectType: v.optional(prospectTypeValidator),
    fitScoreMin: v.optional(v.number()),
    fitScoreMax: v.optional(v.number()),
    createdAfterMs: v.optional(v.number()),
    createdBeforeMs: v.optional(v.number()),
    visibilityMode: v.optional(prospectVisibilityModeValidator),
    visibleProspectIds: v.array(v.id("prospects")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, { notFoundMessage: "User not found" });
    await requireOwnedWorkspace(ctx, args.workspaceId, {
      user,
      notFoundMessage: "Workspace not found",
      notAuthorizedMessage: "Not authorized to update this workspace",
    });
    const sortBy = normalizeProspectListSort(args.sortBy);
    const scopeKey = buildFeedScopeKey(args);
    const existing = selectFeedSnapshotForWrite(
      await listFeedSnapshotCandidates(ctx, {
        userId: user._id,
        workspaceId: args.workspaceId,
        status: args.status,
        sortBy,
      }),
      scopeKey
    );
    const orderedResult = await listWorkspaceProspectSummariesPage(ctx.db, {
      workspaceId: args.workspaceId,
      sortBy,
      platform: args.platform,
      prospectType: args.prospectType,
      status: args.status,
      fitScoreMin: args.fitScoreMin,
      fitScoreMax: args.fitScoreMax,
      createdAfterMs: args.createdAfterMs,
      createdBeforeMs: args.createdBeforeMs,
      visibilityMode: args.visibilityMode,
      paginationOpts: { cursor: null, numItems: MAX_SCAN_FIRST_PAGE },
    });
    const canonicalVisibleRows = buildCanonicalVisibleRows(
      orderedResult.page,
      args.visibleProspectIds
    );

    if (canonicalVisibleRows.length === 0) {
      return;
    }

    const lastVisible = canonicalVisibleRows[canonicalVisibleRows.length - 1];
    const key = summaryRowToAnchorKey(lastVisible, sortBy);
    const patch = {
      scopeKey,
      visibleProspectIds: canonicalVisibleRows.map((row) => row.prospectId),
      anchorSortScore: key.anchorSortScore,
      anchorProspectCreatedAt: key.anchorProspectCreatedAt,
      anchorProspectType: key.anchorProspectType,
      anchorProspectId: key.anchorProspectId,
      updatedAt: getCurrentUTCTimestamp(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return;
    }

    await ctx.db.insert("prospectListFeedAnchors", {
      userId: user._id,
      workspaceId: args.workspaceId,
      status: args.status,
      sortBy,
      ...patch,
    });
  },
});

export const mergePendingProspects = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    status: prospectStatusValidator,
    sortBy: v.optional(prospectListSortValidator),
    platform: v.optional(prospectPlatformValidator),
    prospectType: v.optional(prospectTypeValidator),
    fitScoreMin: v.optional(v.number()),
    fitScoreMax: v.optional(v.number()),
    createdAfterMs: v.optional(v.number()),
    createdBeforeMs: v.optional(v.number()),
    visibilityMode: v.optional(prospectVisibilityModeValidator),
    visibleProspectIds: v.array(v.id("prospects")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, { notFoundMessage: "User not found" });
    await requireOwnedWorkspace(ctx, args.workspaceId, {
      user,
      notFoundMessage: "Workspace not found",
      notAuthorizedMessage: "Not authorized to update this workspace",
    });
    const sortBy = normalizeProspectListSort(args.sortBy);
    const scopeKey = buildFeedScopeKey(args);
    const existing = selectFeedSnapshotForWrite(
      await listFeedSnapshotCandidates(ctx, {
        userId: user._id,
        workspaceId: args.workspaceId,
        status: args.status,
        sortBy,
      }),
      scopeKey
    );
    const orderedResult = await listWorkspaceProspectSummariesPage(ctx.db, {
      workspaceId: args.workspaceId,
      sortBy,
      platform: args.platform,
      prospectType: args.prospectType,
      status: args.status,
      fitScoreMin: args.fitScoreMin,
      fitScoreMax: args.fitScoreMax,
      createdAfterMs: args.createdAfterMs,
      createdBeforeMs: args.createdBeforeMs,
      visibilityMode: args.visibilityMode,
      paginationOpts: { cursor: null, numItems: MAX_SCAN_FIRST_PAGE },
    });
    const canonicalVisibleRows = buildCanonicalVisibleRows(
      orderedResult.page,
      args.visibleProspectIds
    );

    if (canonicalVisibleRows.length === 0) {
      return;
    }

    const lastVisible = canonicalVisibleRows[canonicalVisibleRows.length - 1];
    const lastVisibleIndex = orderedResult.page.findIndex(
      (row) => row.prospectId === lastVisible.prospectId
    );
    const mergedVisibleRows =
      lastVisibleIndex >= 0
        ? orderedResult.page.slice(0, lastVisibleIndex + 1)
        : canonicalVisibleRows;
    const key = summaryRowToAnchorKey(lastVisible, sortBy);
    const patch = {
      scopeKey,
      visibleProspectIds: mergedVisibleRows.map((row) => row.prospectId),
      anchorSortScore: key.anchorSortScore,
      anchorProspectCreatedAt: key.anchorProspectCreatedAt,
      anchorProspectType: key.anchorProspectType,
      anchorProspectId: key.anchorProspectId,
      updatedAt: getCurrentUTCTimestamp(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return;
    }

    await ctx.db.insert("prospectListFeedAnchors", {
      userId: user._id,
      workspaceId: args.workspaceId,
      status: args.status,
      sortBy,
      ...patch,
    });
  },
});

export const markProspectOpened = mutation({
  args: {
    prospectId: v.id("prospects"),
  },
  handler: async (ctx, { prospectId }) => {
    const user = await requireUser(ctx, { notFoundMessage: "User not found" });
    const prospect = await requireOwnedProspect(ctx, prospectId, { user });

    const existing = await ctx.db
      .query("prospectViews")
      .withIndex("by_user_prospect", (q) =>
        q.eq("userId", user._id).eq("prospectId", prospectId)
      )
      .first();

    if (existing) {
      return;
    }

    await ctx.db.insert("prospectViews", {
      userId: user._id,
      workspaceId: prospect.workspaceId,
      prospectId,
      openedAt: getCurrentUTCTimestamp(),
    });
  },
});
