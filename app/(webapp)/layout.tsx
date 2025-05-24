import { Header } from "@/features/webapp/ui/components/Header";
import { ReactNode } from "react";

export default function WebAppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="webapp-layout">
      {/* Add web app-specific navigation or header here if needed */}
      <Header />
      <main>{children}</main>
    </div>
  );
}
