import type { Metadata } from "next";
import { USE_CASES } from "@/features/landing/lib/useCases";
import { UseCaseCard } from "@/features/landing/ui/components/UseCaseCard";

export const metadata: Metadata = {
  title: "Use Cases — ReacherX",
  description:
    "Customers, candidates, investors, partners, creators, community members, podcast guests, and more. One agent that adapts to who you need.",
  openGraph: {
    title: "Use Cases — ReacherX",
    description:
      "One agent that adapts to who you need. Customers, candidates, investors, partners, and more.",
    images: ["/og-default.jpg"],
    url: "https://reacherx.com/home/use-cases",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Use Cases — ReacherX",
    description:
      "One agent that adapts to who you need. Customers, candidates, investors, partners, and more.",
    images: ["/og-default.jpg"],
  },
};

export default function UseCasesPage() {
  return (
    <div className="mx-auto w-full max-w-[1288px] px-4 py-16 md:py-24">
      {/* Header — matches design language of other landing sections */}
      <div className="mb-12 flex flex-col items-center text-center md:mb-16">
        <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
          One Agent that adapts to who you need.
        </h1>
        <p className="mt-4 max-w-xl text-base md:text-lg">
          Customers, candidates, investors, partners, creators, community
          members, podcast guests, and more.
        </p>

        {/* Static "All" filter pill */}
        <button
          type="button"
          disabled
          className="border-border text-foreground mt-6 inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium"
        >
          All
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="opacity-50"
            aria-hidden="true"
          >
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {USE_CASES.map((uc) => (
          <UseCaseCard key={uc.slug} useCase={uc} />
        ))}
      </div>
    </div>
  );
}
