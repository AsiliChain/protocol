export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-48 rounded-md" style={{ backgroundColor: "oklch(85% 0.004 60)" }} />
        <div className="mt-2 h-4 w-72 rounded-md" style={{ backgroundColor: "oklch(90% 0.003 60)" }} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="dash-card"
            style={{ backgroundColor: "oklch(98% 0 0)" }}
          >
            <div className="h-4 w-24 rounded-sm" style={{ backgroundColor: "oklch(88% 0.004 60)" }} />
            <div className="mt-3 h-8 w-32 rounded-sm" style={{ backgroundColor: "oklch(88% 0.004 60)" }} />
          </div>
        ))}
      </div>

      <div className="dash-card" style={{ backgroundColor: "oklch(98% 0 0)" }}>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-lg"
              style={{ height: 48 }}
            >
              <div className="h-4 w-1/4 rounded-sm" style={{ backgroundColor: "oklch(88% 0.004 60)" }} />
              <div className="h-4 w-1/6 rounded-sm" style={{ backgroundColor: "oklch(88% 0.004 60)" }} />
              <div className="h-4 w-1/6 rounded-sm" style={{ backgroundColor: "oklch(88% 0.004 60)" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
