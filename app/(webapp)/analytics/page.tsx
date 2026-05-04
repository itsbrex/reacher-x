// app/(webapp)/analytics/page.tsx
"use client";

import { useRouter } from "next/navigation";
import {
  PageLayout,
  PageHeader,
  PageContent,
} from "@/features/webapp/ui/components";
import { AnalyticsDashboard } from "@/features/analytics/ui/AnalyticsDashboard";
import { WorkspacePlanLimitAlert } from "@/features/billing/ui/components/WorkspacePlanLimitAlert";
import { useActiveUseCaseLabels } from "@/shared/hooks";

export default function AnalyticsPage() {
  const router = useRouter();
  const { pageLabels } = useActiveUseCaseLabels();

  return (
    <PageLayout className="flex max-w-none flex-col overflow-hidden border-none">
      <PageHeader title={pageLabels.analytics} onBack={() => router.back()} />
      <PageContent className="scroll-fade-effect-y min-h-0 flex-1 overflow-y-auto p-4">
        <WorkspacePlanLimitAlert className="mb-4" />
        <AnalyticsDashboard />
      </PageContent>
    </PageLayout>
  );
}
