// app/(webapp)/layout.tsx
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
} from "@/shared/ui/components/Sidebar";
import { Header } from "@/features/webapp/ui/components/Header";
import { ReactNode } from "react";
import { KeywordHistory } from "@/features/history/ui/components/KeywordHistory";

export default function WebAppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Header />
      <div className="pt-12">
        {/* Match header height */}
        <div className="flex">
          <Sidebar className="hidden md:block">
            <SidebarContent>
              <KeywordHistory />
            </SidebarContent>
          </Sidebar>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
