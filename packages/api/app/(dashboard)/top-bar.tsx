"use client";

import { usePathname } from "next/navigation";
import { useSidebar } from "./sidebar-context";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Uganda Coffee Supply Chain Finance",
  },
  "/farmers": {
    title: "Farmers",
    subtitle: "Registered farmer profiles",
  },
  "/batches": {
    title: "Batches",
    subtitle: "Coffee batch lifecycle",
  },
  "/loans": {
    title: "Loans",
    subtitle: "Active loan positions with LTV status",
  },
  "/agents": {
    title: "AI Agents",
    subtitle: "On-chain autonomous agents with ERC-8004 identity",
  },
  "/ccip": {
    title: "Cross-Chain Bridge (CCIP)",
    subtitle: "Chainlink CCIP — Mantle Sepolia ↔ Base Sepolia",
  },
};

export function TopBar() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed, setMobileOpen } = useSidebar();

  const page = pageTitles[pathname] ?? {
    title: "Dashboard",
    subtitle: "Uganda Coffee Supply Chain Finance",
  };

  return (
    <header className="dash-topbar">
      <div className="flex items-center gap-3">
        {/* Hamburger — visible on mobile, also visible on desktop as sidebar toggle */}
        <button
          type="button"
          className="dash-btn-ghost p-1.5 md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* Sidebar collapse toggle — desktop only */}
        <button
          type="button"
          className="dash-btn-ghost p-1.5 hidden md:flex"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-5 w-5"
          >
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            )}
          </svg>
        </button>

        <div>
          <h1 className="text-lg font-semibold" style={{ color: "oklch(18% 0.01 60)" }}>
            {page.title}
          </h1>
          <p className="text-xs" style={{ color: "oklch(55% 0.012 60)" }}>
            {page.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <a
          href="https://docs.asilichain.xyz"
          target="_blank"
          rel="noreferrer"
          className="dash-btn-ghost no-underline"
        >
          Docs
        </a>
        <a
          href="https://sepolia.mantlescan.org"
          target="_blank"
          rel="noreferrer"
          className="dash-btn-ghost no-underline"
        >
          MantleScan
        </a>
      </div>
    </header>
  );
}
