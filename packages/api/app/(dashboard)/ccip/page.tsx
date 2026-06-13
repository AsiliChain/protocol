import Link from "next/link";

const MANTLESCAN_CCIP_TX =
  "https://sepolia.mantlescan.xyz/tx/0x62a6b58f8c3625F0c5f46D6C86A65595AA769C89";

const BRIDGE_DATA = [
  {
    title: "Source Chain",
    value: "Mantle Sepolia",
    detail: "Chain ID 5003",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.715-6.75M17.25 6.75 12 12m0 0-1.5-1.5M12 12l1.5-1.5M3.495 12.198a9.004 9.004 0 0 0 8.715 6.75m0 0a9.004 9.004 0 0 0 8.715-6.75m-17.43 0a9.004 9.004 0 0 1 8.715-6.75m0 0A8.997 8.997 0 0 1 21 12.198" />
      </svg>
    ),
  },
  {
    title: "Destination Chain",
    value: "Base Sepolia",
    detail: "Chain selector 10344971235874465080",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    title: "Router",
    value: "0xFd33fd627017fEf041445FC19a2B6521C9778f86",
    detail: "Mantle Sepolia CCIP Router",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    title: "OnRamp",
    value: "0x056A1FAb28562750a54063E37DDc66d506e320d2",
    detail: "Mantle → Base message gateway",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0-6.75 6.75M12 4.5l6.75 6.75" />
      </svg>
    ),
  },
  {
    title: "OffRamp",
    value: "0x4d8193f845Eb3540e0BdA9451296600362E22B15",
    detail: "Base ← Mantle message receiver",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
      </svg>
    ),
  },
  {
    title: "Token Bridged",
    value: "CCIP-BnM",
    detail: "0xEA8cA8AE1c54faB8D185FC1fd7C2d70Bee8a417e (Mantle) → 0x88A2d74F47a237a62e7A51cdDa67270CE381555e (Base)",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3 0h6M3 6h3m15 12h-3M3 18h3m12-12h3M6 3v18" />
      </svg>
    ),
  },
];

function BridgeCard({
  icon,
  title,
  value,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: "oklch(100% 0 0)", border: "1px solid oklch(88% 0.006 60)", transition: "transform 200ms, border-color 200ms, box-shadow 200ms" }}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: "oklch(23% 0.010 50)", color: "oklch(72% 0.16 80)" }}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "oklch(55% 0.012 60)" }}>
            {title}
          </p>
          <p className="mt-0.5 break-all font-mono text-sm" style={{ color: "oklch(18% 0.01 60)" }}>
            {value}
          </p>
          <p className="mt-1 text-xs" style={{ color: "oklch(55% 0.012 60)" }}>{detail}</p>
        </div>
      </div>
    </div>
  );
}

export default function CcipPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "oklch(18% 0.01 60)" }}>
          Cross-Chain Bridge (CCIP)
        </h2>
        <p className="mt-1 text-sm" style={{ color: "oklch(55% 0.012 60)" }}>
          Chainlink CCIP powers cross-chain settlements between Mantle Sepolia
          and Base Sepolia. Batches originate on Mantle; payouts settle on Base.
        </p>
      </div>

      {/* Bridge info grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {BRIDGE_DATA.map((item) => (
          <BridgeCard key={item.title} {...item} />
        ))}
      </div>

      {/* MantleScan link */}
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: "oklch(100% 0 0)", border: "1px solid oklch(88% 0.006 60)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold" style={{ color: "oklch(18% 0.01 60)" }}>
              Latest Bridge Transaction
            </h3>
            <p className="mt-1 text-sm" style={{ color: "oklch(55% 0.012 60)" }}>
              1 CCIP-BnM bridged Mantle Sepolia → Base Sepolia via Router. View
              on MantleScan for full details.
            </p>
          </div>
          <a
            href={MANTLESCAN_CCIP_TX}
            target="_blank"
            rel="noreferrer"
            className="dash-btn-primary shrink-0 no-underline"
          >
            View on MantleScan →
          </a>
        </div>
      </div>

      {/* Fee info */}
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: "oklch(100% 0 0)", border: "1px solid oklch(88% 0.006 60)" }}
      >
        <h3 className="font-semibold" style={{ color: "oklch(18% 0.01 60)" }}>Fee Configuration</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "oklch(55% 0.012 60)" }}>
              Fee Token
            </p>
            <p className="mt-0.5 font-mono text-sm" style={{ color: "oklch(18% 0.01 60)" }}>
              address(0) — native MNT
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "oklch(55% 0.012 60)" }}>
              ExtraArgs
            </p>
            <p className="mt-0.5 font-mono text-sm" style={{ color: "oklch(18% 0.01 60)" }}>
              0x97a657c9 + abi.encode(uint256(gasLimit))
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
