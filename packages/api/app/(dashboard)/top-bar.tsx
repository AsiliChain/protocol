"use client";

import { usePathname } from "next/navigation";
import { useSidebar } from "./sidebar-context";
import { useEffect, useState } from "react";
import { getAuthToken, clearAuthToken } from "@/lib/auth-client";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Open Dashboard",
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
  const [wallet, setWallet] = useState<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setWallet(payload.wallet);
      } catch {
        clearAuthToken();
      }
    }
  }, []);

  function handleLogout() {
    clearAuthToken();
    setWallet(null);
    window.location.reload();
  }

  const page = pageTitles[pathname] ?? {
    title: "Open Dashboard",
    subtitle: "Uganda Coffee Supply Chain Finance",
  };

  return (
    <header className="dash-topbar">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          type="button"
          className="flex md:hidden items-center justify-center p-1.5 rounded-lg text-fg-muted hover:bg-[oklch(92%_0.008_60)] hover:text-fg-default transition-colors"
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
          className="hidden md:inline-flex items-center justify-center p-1.5 rounded-lg text-fg-muted hover:bg-[oklch(92%_0.008_60)] hover:text-fg-default transition-colors"
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            )}
          </svg>
        </button>

        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-semibold truncate" style={{ color: "oklch(18% 0.01 60)" }}>
            {page.title}
          </h1>
          <p className="text-xs truncate hidden md:block" style={{ color: "oklch(55% 0.012 60)" }}>
            {page.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 md:gap-3">
        {wallet ? (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs font-mono" style={{ color: "oklch(55% 0.012 60)" }}>
              {wallet.slice(0, 6)}...{wallet.slice(-4)}
            </span>
            <button onClick={handleLogout} className="dash-btn-ghost no-underline text-xs md:text-sm">
              Logout
            </button>
          </div>
        ) : (
          <a href="/login" className="dash-btn-ghost no-underline text-xs md:text-sm">
            Login
          </a>
        )}
        <a
          href="https://docs.asilichain.xyz"
          target="_blank"
          rel="noreferrer"
          className="dash-btn-ghost no-underline text-xs md:text-sm"
        >
          Docs
        </a>
        <a
          href="https://sepolia.mantlescan.org"
          target="_blank"
          rel="noreferrer"
          className="dash-btn-ghost no-underline hidden sm:inline-flex"
        >
          MantleScan
        </a>
      </div>
    </header>
  );
}
