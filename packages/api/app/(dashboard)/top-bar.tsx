"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const page = pageTitles[pathname] ?? {
    title: "Dashboard",
    subtitle: "Uganda Coffee Supply Chain Finance",
  };

  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center justify-between px-8"
      style={{
        backgroundColor: scrolled
          ? "oklch(12% 0.005 60 / 0.85)"
          : "oklch(12% 0.005 60)",
        borderBottom: "1px solid oklch(24% 0.008 55)",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        transition: "background-color 300ms ease, backdrop-filter 300ms ease",
      }}
    >
      <div>
        <h1
          className="text-lg font-semibold"
          style={{ color: "oklch(93% 0.006 60)" }}
        >
          {page.title}
        </h1>
        <p
          className="text-xs"
          style={{ color: "oklch(42% 0.012 55)" }}
        >
          {page.subtitle}
        </p>
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
