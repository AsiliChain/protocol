import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/farmers", label: "Farmers", icon: "👥" },
  { href: "/batches", label: "Batches", icon: "📦" },
  { href: "/loans", label: "Loans", icon: "💰" },
  { href: "/agents", label: "AI Agents", icon: "🤖" },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-navy-200 bg-white">
      <a href="/" className="flex h-16 items-center px-6 border-b border-navy-100 hover:bg-navy-50/50 transition-colors">
        <img src="/asilichain_logo.png" alt="Asilichain" className="h-8 w-8 rounded-full" />
      </a>

      <nav className="mt-2 px-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-navy-600 transition-colors hover:bg-brand-50 hover:text-brand-700 aria-[current=page]:bg-brand-100 aria-[current=page]:text-brand-800"
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 border-t border-navy-100 p-4">
        <div className="rounded-lg bg-brand-50 p-3">
          <p className="text-xs font-medium text-brand-800">Mantle Sepolia</p>
          <p className="mt-0.5 text-[10px] text-navy-400">Testnet • Chain 5003</p>
        </div>
      </div>
    </aside>
  );
}
