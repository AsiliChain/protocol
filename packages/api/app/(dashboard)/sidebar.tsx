"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function NavIcon({ href }: { href: string }) {
  const className = "h-5 w-5";
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
    case "/loans":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
    case "/agents":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12.972l1.796-.539A4.5 4.5 0 0 0 7.1 9.995l1.213-2.42A4.5 4.5 0 0 1 12 6m0 0c.56 0 1.119.123 1.687.363l1.213 2.42a4.5 4.5 0 0 0 3.054 2.438l1.796.539-1.796.539a4.5 4.5 0 0 0-3.054 2.438l-1.213 2.42A4.5 4.5 0 0 1 12 18m0 0V6" />
        </svg>
      );
    case "/purchase-orders":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      );
    case "/cooperatives":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
        </svg>
      );
    case "/agents/workspace":
    case "/ccip":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      );
    default:
      return null;
  }
}

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/farmers", label: "Farmers" },
  { href: "/batches", label: "Batches" },
  { href: "/loans", label: "Loans" },
  { href: "/purchase-orders", label: "Purchase Orders" },
  { href: "/cooperatives", label: "Cooperatives" },
  { href: "/agents", label: "AI Agents" },
  { href: "/agents/workspace", label: "Agent Workspace" },
  { href: "/ccip", label: "CCIP Bridge" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-dvh w-64 flex-col ${
        scrolled ? "backdrop-blur-xl" : ""
      }`}
      style={{
        backgroundColor: scrolled
          ? "oklch(20% 0.009 52 / 0.85)"
          : "oklch(20% 0.009 52)",
        borderRight: "1px solid oklch(24% 0.008 55)",
        transition: "background-color 300ms ease, backdrop-filter 300ms ease",
      }}
    >
      {/* Logo */}
      <a
        href="/"
        className="flex h-16 items-center gap-3 px-7 transition-colors hover:opacity-80"
        style={{ borderBottom: "1px solid oklch(24% 0.008 55)" }}
      >
        <img
          src="/asilichain_logo.png"
          alt="Asilichain"
          className="h-8 w-8 rounded-full"
        />
        <span className="text-sm font-semibold" style={{ color: "oklch(93% 0.006 60)" }}>
          Asili
        </span>
        <span style={{ color: "oklch(72% 0.16 80)", fontWeight: 600, fontSize: "14px" }}>
          Chain
        </span>
      </a>

      {/* Nav items */}
      <nav className="mt-3 flex-1 px-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive ? "dash-nav-active" : ""
              }`}
              style={{
                color: isActive
                  ? "oklch(72% 0.16 80)"
                  : "oklch(68% 0.01 58)",
                paddingLeft: "12px",
                height: "44px",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor =
                    "oklch(23% 0.010 50)";
                  e.currentTarget.style.color = "oklch(93% 0.006 60)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "oklch(68% 0.01 58)";
                }
              }}
            >
              <span className="flex items-center justify-center">
                <NavIcon href={item.href} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Network indicator */}
      <div
        className="px-4 py-4"
        style={{ borderTop: "1px solid oklch(24% 0.008 55)" }}
      >
        <div
          className="flex items-center gap-3 rounded-lg px-3 py-3"
          style={{ backgroundColor: "oklch(17% 0.008 55)" }}
        >
          <span
            className="dash-status-dot"
            style={{ color: "oklch(62% 0.17 155)", backgroundColor: "oklch(62% 0.17 155)", flexShrink: 0 }}
          />
          <div className="min-w-0">
            <p
              className="text-xs font-medium truncate"
              style={{ color: "oklch(93% 0.006 60)" }}
            >
              Mantle Sepolia
            </p>
            <p
              className="text-[11px] truncate"
              style={{ color: "oklch(42% 0.012 55)" }}
            >
              Testnet · Chain 5003
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
