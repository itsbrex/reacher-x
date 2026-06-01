import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/shared/ui/components/Card";
import { ArrowForwardIcon } from "@/shared/ui/components/icons";

const USE_CASES = [
  {
    title: "Customers",
    description: "Find people who need what you sell or offer.",
  },
  {
    title: "Recruit",
    description: "Find candidates who match your criteria/job description.",
  },
  {
    title: "Investors",
    description: "Find investors actively looking to fund you.",
  },
  {
    title: "Partner",
    description: "Find collaborators in your industry.",
  },
  {
    title: "Community",
    description: "Find early members who care about your topic.",
  },
  {
    title: "Creators",
    description: "Find influencers who align with your brand.",
  },
  {
    title: "Research",
    description: "Find study participants who match your needs.",
  },
  {
    title: "Podcasts",
    description: "Find guests with real expertise.",
  },
] as const;

export function UseCasesSection() {
  return (
    <section
      id="use-cases"
      aria-labelledby="use-cases-heading"
      className="px-4 py-16 md:py-24"
    >
      <h2
        id="use-cases-heading"
        className="mb-12 text-center text-3xl font-medium md:mb-16 md:text-4xl"
      >
        One △ Agent that adapts to who you need.
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {USE_CASES.map(({ title, description }) => (
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
                href="#"
                className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
              >
                Explore
                <ArrowForwardIcon className="size-4 fill-current" />
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
