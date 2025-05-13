import { ReactNode } from "react";

export default function WebAppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="webapp-layout">
      {/* Add web app-specific navigation or header here if needed */}
      {children}
    </div>
  );
}
