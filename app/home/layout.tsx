// app/home/layout.tsx
import type { Metadata } from "next";
import { APP_NAME } from "@/shared/lib/metadata";

export const metadata: Metadata = {
  title: APP_NAME,
  description:
    "Open-source, self-improving agent that finds the people you need in real time.",
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
