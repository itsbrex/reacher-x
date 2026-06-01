import Link from "next/link";
import {
  GITHUB_REPO_ISSUES_URL,
  GITHUB_REPO_URL,
} from "@/features/landing/lib/github";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/shared/ui/components/Card";
import { ArrowForwardIcon } from "@/shared/ui/components/icons";

const CARDS = [
  {
    title: "Read the code",
    description:
      "Every workflow, search strategy, and qualification rule is visible on GitHub.",
    linkLabel: "View source",
    href: GITHUB_REPO_URL,
  },
  {
    title: "Self-host it",
    description:
      "Run ReacherX on your own infrastructure. Same product. Your data stays with you.",
    linkLabel: "Read the docs",
    href: "#",
  },
  {
    title: "Contribute",
    description:
      "Found a bug, want a feature, or disagree with how something works? Open a PR.",
    linkLabel: "Open an issue",
    href: GITHUB_REPO_ISSUES_URL,
  },
] as const;

export function OpenSourceSection() {
  return (
    <section
      aria-labelledby="open-source-heading"
      className="px-4 py-16 md:py-24"
    >
      <h2
        id="open-source-heading"
        className="mb-12 text-center text-3xl font-medium md:mb-16 md:text-4xl"
      >
        Ads are closed source. <br className="hidden md:block" />△ Agent is open
        source.
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {CARDS.map(({ title, description, linkLabel, href }) => (
          <Card
            key={title}
            className="flex min-h-[474px] flex-col justify-between rounded-xl shadow-none"
          >
            <CardHeader className="p-4">
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="text-foreground">
                {description}
              </CardDescription>
            </CardHeader>
            <CardFooter className="p-4 pt-0">
              <Link
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={
                  href.startsWith("http") ? "noopener noreferrer" : undefined
                }
                className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
              >
                {linkLabel}
                <ArrowForwardIcon className="size-4 fill-current" />
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
