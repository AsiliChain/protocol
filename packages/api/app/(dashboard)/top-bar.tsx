export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-navy-200 bg-white/80 backdrop-blur-sm px-6">
      <div>
        <h1 className="text-lg font-semibold text-navy-900">Dashboard</h1>
        <p className="text-xs text-navy-400">Uganda Coffee Supply Chain Finance</p>
      </div>
      <div className="flex items-center gap-3">
        <a
          href="https://sepolia.mantlescan.org"
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-navy-200 px-3 py-1.5 text-xs font-medium text-navy-500 transition-colors hover:bg-navy-50"
        >
          MantleScan
        </a>
      </div>
    </header>
  );
}
