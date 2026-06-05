import "../globals.css";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh dash-body">
      <Sidebar />
      <div className="flex flex-1 flex-col ml-64">
        <TopBar />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
