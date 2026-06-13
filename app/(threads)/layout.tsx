import { Suspense } from "react";
import { getGitHubStarsCount } from "@/features/landing/lib/getGitHubStars";
import { Header } from "@/features/landing/ui/components/Header";
import { Footer } from "@/features/landing/ui/components/Footer";
import { LandingAutoPlayProvider } from "@/features/landing/ui/components/LandingAutoPlayProvider";

export default async function ThreadsShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const githubStarsCount = await getGitHubStarsCount();

  return (
    <div>
      <Suspense fallback={null}>
        <Header githubStarsCount={githubStarsCount} />
      </Suspense>
      <Suspense fallback={null}>
        <LandingAutoPlayProvider>
          <main>{children}</main>
        </LandingAutoPlayProvider>
      </Suspense>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}
