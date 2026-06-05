import type { PortfolioHealth } from "@/lib/dashboard";

const STROKE = 28;
const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Segment {
  label: string;
  count: number;
  color: string;
  offset: number;
}

function buildSegments(health: PortfolioHealth): Segment[] {
  const total = health.totalAssessed || 1;
  const segs: Segment[] = [];

  const entries: { label: string; count: number; color: string }[] = [
    { label: "Healthy", count: health.healthyCount, color: "#16a34a" },
    { label: "Warning", count: health.warningCount, color: "#ea580c" },
    { label: "Critical", count: health.criticalCount, color: "#dc2626" },
  ];

  let offset = 0;
  for (const e of entries) {
    if (e.count > 0) {
      const portion = e.count / total;
      segs.push({
        label: e.label,
        count: e.count,
        color: e.color,
        offset,
      });
      offset += portion * CIRCUMFERENCE;
    }
  }
  return segs;
}

export function PortfolioDonut({
  health,
}: {
  health: PortfolioHealth | null;
}) {
  if (!health || health.totalAssessed === 0) {
    return (
      <div className="dash-card">
        <h2 className="text-base font-semibold" style={{ color: "oklch(93% 0.006 60)" }}>
          Portfolio Health
        </h2>
        <p className="mt-4 text-sm" style={{ color: "oklch(42% 0.012 55)" }}>
          No active loans to assess.
        </p>
      </div>
    );
  }

  const segments = buildSegments(health);

  return (
    <div className="dash-card dash-card-glow">
      <div className="relative z-10">
        <h2 className="text-base font-semibold" style={{ color: "oklch(93% 0.006 60)" }}>
          Portfolio Health
        </h2>

        <div className="mt-4 flex items-center gap-6">
          <svg
            width={160}
            height={160}
            viewBox="0 0 160 160"
            className="shrink-0"
          >
            <g transform="translate(80, 80) rotate(-90)">
              {segments.map((seg) => {
                const dashLength =
                  (seg.count / health.totalAssessed) * CIRCUMFERENCE;
                return (
                  <circle
                    key={seg.label}
                    r={RADIUS}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={STROKE}
                    strokeDasharray={`${dashLength} ${CIRCUMFERENCE}`}
                    strokeDashoffset={-seg.offset}
                  />
                );
              })}
              {segments.length === 0 && (
                <circle
                  r={RADIUS}
                  fill="none"
                  stroke="oklch(24% 0.008 55)"
                  strokeWidth={STROKE}
                  strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                />
              )}
            </g>
          </svg>

          <div className="space-y-3">
            {segments.map((seg) => (
              <div key={seg.label} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-sm" style={{ color: "oklch(68% 0.01 58)" }}>
                  {seg.label}{" "}
                  <span className="font-semibold" style={{ color: "oklch(93% 0.006 60)" }}>
                    {seg.count}
                  </span>
                </span>
              </div>
            ))}
            <div
              className="pt-2 text-xs"
              style={{
                borderTop: "1px solid oklch(24% 0.008 55)",
                color: "oklch(42% 0.012 55)",
              }}
            >
              Weighted avg LTV:{" "}
              <span style={{ color: "oklch(93% 0.006 60)" }}>
                {(health.weightedAvgLtvBps / 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
