import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { APP_NAME } from "@/shared/lib/metadata";
import { PricingSection } from "@/features/landing/ui/components/sections/PricingSection";
import { FinalCtaSection } from "@/features/landing/ui/components/sections/FinalCtaSection";
import {
  parseWorkspaceUseCaseKeyParam,
  WORKSPACE_USE_CASE_STORAGE_KEY,
} from "@/shared/lib/workspaceUseCaseCache";
import { DEFAULT_WORKSPACE_USE_CASE_KEY } from "@/shared/lib/workspaceUseCases";

export const metadata: Metadata = {
  title: `Pricing — ${APP_NAME}`,
  description:
    "Simple, transparent pricing for ReacherX. Start free, upgrade when you're ready.",
  openGraph: {
    title: `Pricing — ${APP_NAME}`,
    description:
      "Simple, transparent pricing for ReacherX. Start free, upgrade when you're ready.",
    url: "https://reacherx.com/home/pricing",
    type: "website",
  },
};

export default function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-[1288px]">
      <Suspense
        fallback={
          <PricingSection initialUseCaseKey={DEFAULT_WORKSPACE_USE_CASE_KEY} />
        }
      >
        <PricingSectionRuntime />
      </Suspense>
      <FinalCtaSection />
    </div>
  );
}

async function PricingSectionRuntime() {
  const cookieStore = await cookies();
  const initialUseCaseKey =
    parseWorkspaceUseCaseKeyParam(
      cookieStore.get(WORKSPACE_USE_CASE_STORAGE_KEY)?.value
    ) ?? DEFAULT_WORKSPACE_USE_CASE_KEY;

  return <PricingSection initialUseCaseKey={initialUseCaseKey} />;
}
