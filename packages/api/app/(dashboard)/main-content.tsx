"use client";

import { useSidebar } from "./sidebar-context";
import { TopBar } from "./top-bar";

export function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div
      className="dash-main flex flex-col min-h-dvh"
      style={{ marginLeft: collapsed ? "4.5rem" : "16rem" }}
    >
      <TopBar />
      <main className="flex-1 p-6 md:p-8 pb-24 md:pb-8">{children}</main>
    </div>
  );
}
