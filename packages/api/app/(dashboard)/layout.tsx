import "../globals.css";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { SidebarProvider } from "./sidebar-context";
import { MainContent } from "./main-content";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="dash-body">
        <Sidebar />
        <MainContent>{children}</MainContent>
        <MobileNav />
      </div>
    </SidebarProvider>
  );
}
