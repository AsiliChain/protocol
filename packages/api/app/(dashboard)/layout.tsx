import "../globals.css";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { MobileNav } from "./mobile-nav";
import { SidebarProvider } from "./sidebar-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="dash-body">
        <Sidebar />
        <div className="dash-main flex flex-col min-h-dvh">
          <TopBar />
          <main className="flex-1 p-6 md:p-8 pb-24 md:pb-8">{children}</main>
        </div>
        <MobileNav />
      </div>
    </SidebarProvider>
  );
}
