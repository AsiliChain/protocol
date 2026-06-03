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
      <div className="rounded-lg border border-navy-200 bg-white p-6">
        <h2 className="text-base font-semibold text-navy-900">
          Portfolio Health
        </h2>
        <p className="mt-4 text-sm text-navy-400">
          No active loans to assess.
        </p>
      </div>
    );
  }

  const segments = buildSegments(health);

  return (
    <div className="rounded-lg border border-navy-200 bg-white p-6">
      <h2 className="text-base font-semibold text-navy-900">
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
                stroke="#e5e7eb"
                strokeWidth={STROKE}
              />
            )}
          </g>
        </svg>

        <div className="space-y-2">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-2 text-sm">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-navy-600">{seg.label}</span>
              <span className="ml-auto font-semibold text-navy-900">
                {seg.count}
              </span>
            </div>
          ))}
          <div className="border-t border-navy-100 pt-1 text-xs text-navy-400">
            Weighted avg LTV:{" "}
            {(health.weightedAvgLtvBps / 100).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}
