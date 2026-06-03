import Link from "next/link";

const MANTLESCAN_CCIP_TX =
  "https://sepolia.mantlescan.org/tx/0x62a6b58f8c3625F0c5f46D6C86A65595AA769C89";

const BRIDGE_DATA = [
  {
    title: "Source Chain",
    value: "Mantle Sepolia",
    detail: "Chain ID 5003",
    icon: "🌐",
  },
  {
    title: "Destination Chain",
    value: "Base Sepolia",
    detail: "Chain selector 10344971235874465080",
    icon: "🎯",
  },
  {
    title: "Router",
    value: "0xFd33fd627017fEf041445FC19a2B6521C9778f86",
    detail: "Mantle Sepolia CCIP Router",
    icon: "🔀",
  },
  {
    title: "OnRamp",
    value: "0x056A1FAb28562750a54063E37DDc66d506e320d2",
    detail: "Mantle → Base message gateway",
    icon: "⬆️",
  },
  {
    title: "OffRamp",
    value: "0x4d8193f845Eb3540e0BdA9451296600362E22B15",
    detail: "Base ← Mantle message receiver",
    icon: "⬇️",
  },
  {
    title: "Token Bridged",
    value: "CCIP-BnM",
    detail: "0xEA8cA8AE1c54faB8D185FC1fd7C2d70Bee8a417e (Mantle) → 0x88A2d74F47a237a62e7A51cdDa67270CE381555e (Base)",
    icon: "🪙",
  },
];

function BridgeCard({
  icon,
  title,
  value,
  detail,
}: {
  icon: string;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-navy-200 bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-xl">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
            {title}
          </p>
          <p className="mt-0.5 break-all font-mono text-sm text-navy-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-navy-400">{detail}</p>
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
        <h2 className="text-2xl font-bold text-navy-900">
          Cross-Chain Bridge (CCIP)
        </h2>
        <p className="mt-1 text-sm text-navy-400">
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
      <div className="rounded-xl border border-navy-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-navy-900">
              Latest Bridge Transaction
            </h3>
            <p className="mt-1 text-sm text-navy-400">
              1 CCIP-BnM bridged Mantle Sepolia → Base Sepolia via Router. View
              on MantleScan for full details.
            </p>
          </div>
          <a
            href={MANTLESCAN_CCIP_TX}
            target="_blank"
            rel="noreferrer"
            className="flex-shrink-0 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            View on MantleScan →
          </a>
        </div>
      </div>

      {/* Fee info */}
      <div className="rounded-xl border border-navy-200 bg-white p-5">
        <h3 className="font-semibold text-navy-900">Fee Configuration</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
              Fee Token
            </p>
            <p className="mt-0.5 font-mono text-sm text-navy-900">
              address(0) — native MNT
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
              ExtraArgs
            </p>
            <p className="mt-0.5 font-mono text-sm text-navy-900">
              0x97a657c9 + abi.encode(uint256(gasLimit))
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
