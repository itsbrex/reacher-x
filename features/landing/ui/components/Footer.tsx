import { FooterClient } from "./FooterClient";

async function getCurrentYear() {
  "use cache";

  return new Date().getFullYear();
}

export async function Footer({ className }: { className?: string }) {
  const currentYear = await getCurrentYear();

  return <FooterClient className={className} currentYear={currentYear} />;
}
