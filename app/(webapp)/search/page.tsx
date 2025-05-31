// app/(webapp)/search/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/shared/ui/components/Button";
// import { FilterIcon, } from "@/shared/ui/components/icons";

export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";
  const exactMatch = searchParams.get("exact") === "true";

  const handleSearchInputClick = () => {
    // Navigate to search input page with current parameters
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (exactMatch) params.set("exact", "true");

    router.push(`/search/input?${params.toString()}`);
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Search header - clickable but shows as input */}
      <div className="mb-6">
        <div
          onClick={handleSearchInputClick}
          className="relative cursor-pointer"
        >
          <input
            type="text"
            value={query}
            readOnly
            className="w-full rounded-md border border-input bg-background px-3 py-2 pr-20 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Type keywords..."
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {/* <RandomizeIcon className="h-4 w-4 fill-muted-foreground" /> */}
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
              {/* <FilterIcon className="h-4 w-4 fill-current" /> */}
            </Button>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button className="border-b-2 border-primary pb-2 text-sm font-medium">
            All
          </button>
          <button className="pb-2 text-sm text-muted-foreground hover:text-foreground">
            Posts
          </button>
          <button className="pb-2 text-sm text-muted-foreground hover:text-foreground">
            Replies
          </button>
          <button className="pb-2 text-sm text-muted-foreground hover:text-foreground">
            Quotes
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            {/* <FilterIcon className="mr-2 h-4 w-4 fill-current" /> */}
            Filter
          </Button>
          <Button variant="ghost" size="sm">
            {/* <RandomizeIcon className="h-4 w-4 fill-current" /> */}
          </Button>
        </div>
      </div>

      {/* Search results */}
      <div className="space-y-4">
        {/* Mock search result */}
        <div className="rounded-lg border p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <span className="text-sm font-medium">C</span>
            </div>
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-medium">Customer</span>
                <span className="text-sm text-muted-foreground">@Customer</span>
                <span className="rounded bg-black px-2 py-0.5 text-xs text-white">
                  Load new
                </span>
              </div>
              <div className="mb-2 text-sm text-muted-foreground">
                Replying to <span className="text-primary">@Customer</span>
              </div>
              <p className="mb-3 text-sm">
                @Vecterz Find <span className="text-amber-600">#unlimited</span>{" "}
                <span className="font-medium">customers</span> for your{" "}
                <span className="font-medium">products/services</span> with the
                help of advance search of ReacherX.
              </p>
              <a
                href="https://reacherx.com"
                className="text-sm text-primary hover:underline"
              >
                https://reacherx.com
              </a>

              {/* Placeholder images grid */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-video rounded bg-muted" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* More results placeholder */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="text-center text-sm text-muted-foreground">
            More search results would appear here...
          </div>
        </div>
      </div>
    </div>
  );
}
