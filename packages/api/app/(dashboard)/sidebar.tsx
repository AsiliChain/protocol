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
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
        </svg>
      );
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
  { href: "/agents", label: "AI Agents" },
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
