import Link from "next/link";

const MANTLESCAN_LINK =
  "https://sepolia.mantlescan.org/address/0x62a6b58f8c3625F0c5f46D6C86A65595AA769C89";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ─── Nav ────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-navy-900/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <img
              src="/asilichain_logo.png"
              alt="Asilichain"
              className="h-8 w-8 rounded-full"
            />
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-wide text-white">Asilichain</div>
              <div className="text-[11px] font-bold tracking-widest text-navy-400">Protocol</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={MANTLESCAN_LINK}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-navy-300 transition-colors hover:text-white"
            >
              MantleScan
            </a>
            <Link
              href="/dashboard"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ───────────────────────────────────────────── */}
      <section className="relative flex min-h-screen items-center overflow-hidden bg-navy-900">
        {/* Geometric background pattern */}
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-brand-600 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gold-500 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 h-64 w-64 rounded-full bg-earth-700 blur-3xl" />
          <svg className="h-full w-full" viewBox="0 0 1440 900" fill="none">
            <path d="M0 450 Q 360 300, 720 450 T 1440 450" stroke="currentColor" strokeWidth="0.5" className="text-white/20" fill="none" />
            <path d="M0 550 Q 360 400, 720 550 T 1440 550" stroke="currentColor" strokeWidth="0.5" className="text-white/10" fill="none" />
            <path d="M0 350 Q 360 500, 720 350 T 1440 350" stroke="currentColor" strokeWidth="0.3" className="text-white/10" fill="none" />
          </svg>
        </div>

        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Asilichain is the financial infrastructure maximizing value for
            farmers across the{" "}
            <span className="text-gold-500">African coffee supply chain</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-navy-300">
            GPS-verified crops on Mantle Network. Instant mobile money payments.
            Automated EUDR compliance. One platform uniting farmers, exporters,
            and regulators.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="rounded-lg bg-brand-600 px-8 py-3 text-base font-semibold text-white transition-all hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-600/25"
            >
              Explore Dashboard
            </Link>
            <a
              href={MANTLESCAN_LINK}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-navy-500 px-8 py-3 text-base font-medium text-navy-200 transition-colors hover:border-navy-400 hover:text-white"
            >
              View on MantleScan
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="h-8 w-5 rounded-full border-2 border-navy-500">
            <div className="mx-auto mt-1.5 h-2 w-1 animate-bounce rounded-full bg-gold-500" />
          </div>
        </div>
      </section>

      {/* ─── Core Insight ───────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-navy-900 sm:text-4xl">
              One dataset, two breakthroughs
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-navy-500">
              The same GPS farm data that satisfies European Union Deforestation
              Regulation audits unlocks instant working capital for farmers.
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
            {/* Bridge accent */}
            <div className="absolute top-1/2 left-1/2 hidden h-0.5 w-16 -translate-x-1/2 bg-gold-500 md:block" />
            <div className="absolute top-1/2 left-1/2 hidden h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold-500 bg-white md:flex items-center justify-center">
              <span className="text-lg font-bold text-gold-500">&amp;</span>
            </div>

            {/* EUDR Compliance */}
            <div className="rounded-2xl border border-navy-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
                <svg className="h-6 w-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-navy-900">
                EUDR Compliance
              </h3>
              <p className="mt-3 text-navy-500">
                Every farm registered with MAAIF GPS coordinates generates an
                automated Due Diligence Statement — audit-ready for European
                buyers under EUDR regulation.
              </p>
            </div>

            {/* Working Capital */}
            <div className="rounded-2xl border border-navy-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gold-50">
                <svg className="h-6 w-6 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-navy-900">
                Working Capital
              </h3>
              <p className="mt-3 text-navy-500">
                GPS-verified crop data feeds on-chain credit scoring. Farmers
                    access loans based on land, crop quality, and coffee prices — no
                collateral required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ───────────────────────────────────── */}
      <section className="bg-navy-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-navy-900 sm:text-4xl">
              From farm to finance in four steps
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-navy-500">
              A supply chain built for speed, transparency, and trust.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            {steps.map((step, i) => (
              <div key={step.title} className="relative">
                {i < 3 && (
                  <div className="absolute top-8 left-full hidden h-0.5 w-[calc(100%-3rem)] bg-brand-200 md:block" />
                )}
                <div className="relative z-10 rounded-2xl bg-white p-6 shadow-sm">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
                    {i + 1}
                  </div>
                  <h3 className="text-lg font-semibold text-navy-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-navy-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl bg-white p-4 text-center text-sm text-navy-400 shadow-sm">
            <span className="font-medium text-navy-600">Two registration paths:</span>{" "}
            MAAIF government GPS data import{" "}
            <span className="text-navy-300">|</span> Field agent mobile
            registration
          </div>
        </div>
      </section>

      {/* ─── Stakeholder Panels ─────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-navy-900 sm:text-4xl">
              Built for everyone in the chain
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Farmers */}
            <div className="relative overflow-hidden rounded-2xl bg-navy-900 p-8 text-white">
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-brand-600/20 blur-2xl" />
              <div className="relative">
                <h3 className="text-2xl font-bold">For Farmers</h3>
                <ul className="mt-6 space-y-4">
                  {farmerBenefits.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-navy-200">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Exporters */}
            <div className="relative overflow-hidden rounded-2xl bg-earth-800 p-8 text-white">
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gold-500/20 blur-2xl" />
              <div className="relative">
                <h3 className="text-2xl font-bold">For Exporters &amp; Regulators</h3>
                <ul className="mt-6 space-y-4">
                  {exporterBenefits.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-earth-200">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Tech Stack ─────────────────────────────────────── */}
      <section className="bg-navy-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-navy-900 sm:text-4xl">
              How it works
            </h2>
          </div>

          <div className="flex flex-col items-center gap-4 md:flex-row md:justify-center">
            {techLayers.map((layer, i) => (
              <div key={layer.name} className="flex flex-col items-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <span className="text-2xl">{layer.icon}</span>
                </div>
                <p className="mt-3 text-center text-sm font-semibold text-navy-900">
                  {layer.name}
                </p>
                <p className="text-center text-xs text-navy-400">
                  {layer.sub}
                </p>
                {i < techLayers.length - 1 && (
                  <div className="mt-2 text-gold-500 md:ml-4 md:mt-0">
                    <svg className="h-5 w-5 rotate-90 md:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 text-center text-sm text-navy-400">
            <span className="font-medium text-navy-600">Hedera Consensus Service</span> governed by{" "}
            Google • Boeing • FedEx • IBM — immutable audit trail for every batch
          </div>
        </div>
      </section>

      {/* ─── AI Agents ──────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-navy-900 sm:text-4xl">
              Autonomous AI agents
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-navy-500">
              Registered on-chain via{" "}
              <span className="font-mono text-brand-600">ERC-8004</span> agent
              identity
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {agents.map((agent) => (
              <div
                key={agent.name}
                className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-xl">
                    {agent.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-900">
                      {agent.name}
                    </h3>
                    <p className="text-sm text-navy-400">
                      Agent ID {agent.id}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-navy-500">{agent.desc}</p>
                <a
                  href={`/agents`}
                  className="mt-4 inline-flex text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  View on dashboard &rarr;
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────────── */}
      <section className="bg-navy-900 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to see it in action?
          </h2>
          <p className="mt-4 text-lg text-navy-300">
            Explore the live dashboard — batches, loans, AI agent reports, and
            on-chain data from Mantle Sepolia.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="rounded-lg bg-brand-600 px-8 py-3 text-base font-semibold text-white transition-all hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-600/25"
            >
              Explore Dashboard
            </Link>
            <a
              href={MANTLESCAN_LINK}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-navy-500 px-8 py-3 text-base font-medium text-navy-200 transition-colors hover:border-navy-400 hover:text-white"
            >
              IdentityRegistry on MantleScan
            </a>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-navy-800 bg-navy-950 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <img
                src="/asilichain_logo.png"
                alt="Asilichain"
                className="h-8 w-8 rounded-full"
              />
              <span className="text-sm font-semibold text-white">
                Asilichain
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-navy-400">
              <a
                href="https://asilichain.github.io/docs"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white"
              >
                Docs
              </a>
              <a
                href={`mailto:hello@asilichain.xyz`}
                className="hover:text-white"
              >
                hello@asilichain.xyz
              </a>
              <a
                href={MANTLESCAN_LINK}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white"
              >
                MantleScan
              </a>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-navy-700 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              <span className="text-xs text-navy-400">
                Mantle Sepolia Testnet
              </span>
            </div>
          </div>
          <div className="mt-8 border-t border-navy-800 pt-6 text-center text-xs text-navy-500">
            &copy; {new Date().getFullYear()} Asilichain. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Data ──────────────────────────────────────────────

const steps = [
  {
    title: "Farm Registration",
    desc: "MAAIF government GPS data or field agent mobile app registration — both paths feed the same on-chain identity.",
  },
  {
    title: "On-Chain Verification",
    desc: "Crop data, GPS coordinates, and quality grades recorded on Mantle Network for immutable provenance.",
  },
  {
    title: "Credit Scoring",
    desc: "AI agents compute LTV from coffee price oracles, land size, and quality multipliers — no collateral needed.",
  },
  {
    title: "Instant Payment",
    desc: "Approved loans paid via Fonbnk → MTN Mobile Money in under 60 seconds. Farmers receive funds on their phone.",
  },
];

const farmerBenefits = [
  "No collateral — borrow against your verified crop data",
  "GPS-verified credit score follows you across seasons",
  "Receive funds via MTN Mobile Money in under 60 seconds",
  "Full transparency on coffee prices and loan terms",
];

const exporterBenefits = [
  "Automated EUDR Due Diligence Statements for every batch",
  "Immutable GPS provenance from farm to port",
  "Real-time batch tracking with 7-stage supply chain timeline",
  "Audit-ready data for European regulators",
];

const techLayers = [
  { name: "Ethereum", sub: "Security", icon: "⬡" },
  { name: "Mantle", sub: "Abstraction", icon: "◆" },
  { name: "HCS", sub: "Governance", icon: "◈" },
  { name: "Fonbnk", sub: "Mobile Money", icon: "📱" },
];

const agents = [
  {
    name: "Risk Monitor",
    id: 0,
    icon: "🛡️",
    desc: "Monitors LTV ratios across all active loans using coffee price oracles and quality multipliers. Classifies each loan as healthy, warning, or critical.",
  },
  {
    name: "Anomaly Detector",
    id: 1,
    icon: "🔍",
    desc: "Scans batch supply chain data for anomalies — missing purchase orders, stale exports, weight outliers, and grade inconsistencies.",
  },
];
