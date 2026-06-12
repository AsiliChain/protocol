"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "./sidebar-context";
import { useEffect, useState } from "react";
import { getAuthRole } from "@/lib/auth-client";

function NavIcon({ href }: { href: string }) {
  const className = "h-5 w-5 shrink-0";
  switch (href) {
    case "/dashboard":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      );
    case "/farmers":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
      );
    case "/batches":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
        </svg>
      );
    case "/field-ops":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
        </svg>
      );
    case "/loans":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
    case "/agents":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
        </svg>
      );
    case "/ccip":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      );
  }
}

const allNavItems = [
  { href: "/dashboard", label: "Open Dashboard", roles: ["COOP_ROLE", "FIELD_OPS_ROLE"] },
  { href: "/farmers", label: "Farmers", roles: ["COOP_ROLE", "FIELD_OPS_ROLE"] },
  { href: "/batches", label: "Batches", roles: ["COOP_ROLE", "FIELD_OPS_ROLE"] },
  { href: "/loans", label: "Loans", roles: ["COOP_ROLE", "FIELD_OPS_ROLE"] },
  { href: "/field-ops", label: "Field Ops", roles: ["COOP_ROLE", "FIELD_OPS_ROLE"] },
  { href: "/agents", label: "AI Agents", roles: ["COOP_ROLE", "FIELD_OPS_ROLE"] },
  { href: "/team", label: "Team", roles: ["COOP_ROLE"] },
  { href: "/ccip", label: "CCIP Bridge", roles: ["COOP_ROLE", "FIELD_OPS_ROLE"] },
];

function useRole() {
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    setRole(getAuthRole());
  }, []);
  return role;
}

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const role = useRole();
  const navItems = role ? allNavItems.filter((item) => item.roles.includes(role)) : allNavItems;

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/agents") return pathname === "/agents" || (pathname.startsWith("/agents/") && !pathname.startsWith("/field-ops"));
    if (href === "/team") return pathname.startsWith("/team");
    return pathname.startsWith(href);
  };

  return (
    <>
      <div
        className={`dash-sidebar-overlay ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`dash-sidebar ${mobileOpen ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
        <div className="dash-sidebar-logo">
          <a href="/" className="flex items-center gap-3 no-underline">
            <img
              src="/asilichain-symbol.svg"
              alt="AsiliChain"
              className="h-8 w-8 shrink-0"
            />
            <div className="dash-sidebar-logo-text leading-tight">
              <div className="text-sm font-bold tracking-wide" style={{ color: "oklch(18% 0.01 60)" }}>
                AsiliChain
              </div>
                <div className="text-[11px] font-bold tracking-widest" style={{ color: "oklch(60% 0.01 58)" }}>
                  Open Dashboard
                </div>
            </div>
          </a>
        </div>

        <nav className="dash-sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`dash-sidebar-link ${isActive(item.href) ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
            >
              <NavIcon href={item.href} />
              <span className="dash-sidebar-link-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="dash-sidebar-bottom">
          <div className="flex items-center gap-2 px-3 pt-3 pb-1">
            <a
              href="https://docs.asilichain.xyz"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium no-underline hover:opacity-80 transition-opacity"
              style={{ color: "oklch(45% 0.012 60)" }}
            >
              Docs
            </a>
            <span className="text-sm" style={{ color: "oklch(75% 0.006 60)" }}>·</span>
            <a
              href="https://sepolia.mantlescan.org"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium no-underline hover:opacity-80 transition-opacity"
              style={{ color: "oklch(45% 0.012 60)" }}
            >
              MantleScan
            </a>
          </div>

          <button
            type="button"
            className="dash-sidebar-toggle"
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="dash-sidebar-toggle-icon h-4 w-4"
            >
              {collapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="m18.75 4.5-7.5 7.5 7.5 7.5m-6-15L5.25 12l7.5 7.5" />
              )}
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}
