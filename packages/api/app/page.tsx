"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const MANTLESCAN_LINK =
  "https://sepolia.mantlescan.org/address/0x62a6b58f8c3625F0c5f46D6C86A65595AA769C89";

function useRevealObserver() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = rootRef.current?.querySelectorAll(
      ".reveal, .reveal-fade, .reveal-scale, .reveal-right, .stats-reveal, .line-reveal",
    );
    if (!els || els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "-60px 0px" },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return rootRef;
}

export default function LandingPage() {
  const rootRef = useRevealObserver();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div ref={rootRef} className="min-h-screen" style={{ backgroundColor: "oklch(97.5% 0.005 85)" }}>
      {/* Navigation */}
      <nav className={`landing-header ${scrolled ? "compact" : ""}`}>
        <div className="header-inner mx-auto flex max-w-[72rem] items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <img src="/asilichain-symbol.svg" alt="AsiliChain" className="header-logo-img" />
            <span className="header-logo-text text-sm font-bold tracking-wide" style={{ color: "oklch(18% 0.01 60)" }}>AsiliChain</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <a href={MANTLESCAN_LINK} target="_blank" rel="noreferrer" className="text-sm font-medium text-fg-muted transition-colors hover:text-fg-default">MantleScan</a>
            <Link href="/dashboard" className="inline-flex items-center justify-center rounded-lg bg-fg-default px-5 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-white transition-all hover:bg-[oklch(28%_0.015_60)] hover:-translate-y-0.5">Dashboard</Link>
          </div>
          <button onClick={() => setMobileOpen(true)} className="flex md:hidden items-center justify-center p-2 -mr-2 rounded-lg text-fg-muted hover:text-fg-default hover:bg-bg-subtle transition-colors" aria-label="Open menu">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
          </button>
        </div>
      </nav>
      {mobileOpen && <div className="fixed inset-0 z-55 bg-black/20 md:hidden" onClick={() => setMobileOpen(false)} />}
      <div className={`landing-mobile-menu ${mobileOpen ? "open" : ""} md:hidden`}>
        <div className="flex justify-end">
          <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg text-fg-muted hover:text-fg-default transition-colors" aria-label="Close menu">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <a href={MANTLESCAN_LINK} target="_blank" rel="noreferrer" className="text-base font-medium text-fg-muted hover:text-fg-default transition-colors">MantleScan</a>
          <Link href="/dashboard" className="inline-flex items-center justify-center rounded-lg bg-fg-default px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.06em] text-white" onClick={() => setMobileOpen(false)}>Dashboard</Link>
        </div>
      </div>

      {/* Hero */}
      <section className="relative min-h-[85vh] overflow-hidden">
        <div className="hero-orb" /><div className="hero-orb" /><div className="hero-orb" />
        <div className="hero-ring" style={{ width: "600px", height: "600px", top: "-15%", right: "-10%" }} />
        <div className="hero-ring" style={{ width: "400px", height: "400px", bottom: "5%", left: "55%" }} />
        <div className="relative z-10 mx-auto grid min-h-[85vh] max-w-[72rem] grid-cols-1 gap-0 md:grid-cols-2">
          <div className="flex flex-col justify-center gap-6 px-8 py-28 md:px-12 md:py-32">
            <h1 className="reveal font-['var(--font-archivo)'] text-4xl font-black leading-[1.05] tracking-[-0.025em] text-fg-default sm:text-5xl md:text-[clamp(2.5rem,4vw,4rem)]">
              AsiliChain is the financial infrastructure maximizing value for farmers across the{" "}
              <span className="text-gold-accent">African coffee supply chain</span>.
            </h1>
            <p className="reveal max-w-md text-lg leading-relaxed text-fg-muted">
              GPS-verified crops on Mantle Network. Instant mobile money payments. Automated EUDR compliance. One platform uniting farmers, exporters, and regulators.
            </p>
            <div className="reveal flex flex-wrap gap-8 border-t border-border-light pt-7">
              <div className="stats-reveal flex flex-col gap-0.5">
                <span className="text-2xl font-bold tabular-nums text-gold-accent">3.5M</span>
                <span className="text-xs text-fg-subtle">Farmers targeted</span>
              </div>
              <div className="stats-reveal flex flex-col gap-0.5" style={{ transitionDelay: "0.15s" }}>
                <span className="text-2xl font-bold tabular-nums text-gold-accent">$2.4B</span>
                <span className="text-xs text-fg-subtle">Uganda exports FY24/25</span>
              </div>
              <div className="stats-reveal flex flex-col gap-0.5" style={{ transitionDelay: "0.3s" }}>
                <span className="text-2xl font-bold tabular-nums text-gold-accent">&lt;60s</span>
                <span className="text-xs text-fg-subtle">Payment speed</span>
              </div>
            </div>
            <div className="reveal flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link href="/dashboard" className="inline-flex items-center justify-center rounded-lg bg-fg-default px-8 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition-all hover:bg-[oklch(28%_0.015_60)] hover:-translate-y-0.5">Explore Dashboard</Link>
              <a href={MANTLESCAN_LINK} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-lg border border-border-med px-8 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-fg-muted transition-all hover:border-fg-subtle hover:text-fg-default">View on MantleScan</a>
            </div>
          </div>
          <div className="reveal-right flex items-start justify-center px-8 py-12 md:justify-end md:py-24 md:pl-8 md:pr-12">
            <div className="w-full max-w-sm space-y-2.5">
              <div className="card-hover flex items-center gap-3 rounded-lg border border-brand-200 bg-white px-4 py-3.5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-brand-100">
                  <svg className="h-4 w-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.707.707m12.02 12.02.707.707M1 12h2m18 0h2M4.22 19.78l.707-.707M18.95 5.636l-.707.707M12 7a5 5 0 0 1 5 5m-5-5a5 5 0 0 0-5 5m5-5v2m0 6v2" /></svg>
                </div>
                <div><div className="text-sm font-semibold text-fg-default">Farmer</div><div className="text-xs text-fg-subtle">Registers, delivers coffee, receives payment</div></div>
              </div>
              <div className="card-hover flex items-center gap-3 rounded-lg border border-gold-200 bg-white px-4 py-3.5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-gold-100">
                  <svg className="h-4 w-4 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
                </div>
                <div><div className="text-sm font-semibold text-fg-default">Cooperative</div><div className="text-xs text-fg-subtle">Manages agents, represents farmer collective</div></div>
              </div>
              <div className="card-hover flex items-center gap-3 rounded-lg border border-earth-200 bg-white px-4 py-3.5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-earth-100">
                  <svg className="h-4 w-4 text-earth-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>
                </div>
                <div><div className="text-sm font-semibold text-fg-default">Batch Token</div><div className="text-xs text-fg-subtle">NFT-backed traceability from farm to export</div></div>
              </div>
              <div className="card-hover flex items-center gap-3 rounded-lg border border-gold-200 bg-white px-4 py-3.5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-gold-100">
                  <svg className="h-4 w-4 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 0 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m0 0v.375c0 .621-.504 1.125-1.125 1.125H6.75" /></svg>
                </div>
                <div><div className="text-sm font-semibold text-fg-default">Mobile Money Payout</div><div className="text-xs text-fg-subtle">MTN MoMo via Fonbnk, settled in seconds</div></div>
              </div>
              <div className="flex justify-center py-2">
                <svg className="h-6 w-6 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" /></svg>
              </div>
              <div className="dash-card-glow flex items-center gap-3 rounded-lg border-2 border-gold-300 bg-white px-4 py-3.5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-gold-100">
                  <svg className="h-4 w-4 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                </div>
                <div><div className="text-sm font-semibold text-gold-700">Farmer Gets Paid</div><div className="text-xs text-gold-600/70">+16% APR sustainable credit</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* One dataset, two outcomes */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-[72rem] px-6">
          <div className="mb-16 text-center">
            <p className="reveal text-xs font-semibold uppercase tracking-[0.08em] text-gold-accent">One dataset</p>
            <h2 className="reveal mt-3 font-['var(--font-archivo)'] text-3xl font-bold tracking-[-0.015em] text-fg-default sm:text-4xl">Two outcomes</h2>
            <p className="reveal mx-auto mt-4 max-w-2xl text-lg text-fg-muted">The same GPS farm data that satisfies European Union Deforestation Regulation audits unlocks instant working capital for farmers.</p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
            <div className="reveal space-y-4 rounded-xl border border-border-light bg-bg-base p-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
                <svg className="h-5 w-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-fg-default">EUDR Compliance</h3>
              <p className="text-sm leading-relaxed text-fg-muted">GPS polygon data proves coffee wasnt grown on deforested land. Regulators get verifiable evidence without satellite imagery costs. Automated reports for every export batch.</p>
              <ul className="space-y-2 text-sm text-fg-muted">
                <li className="flex items-center gap-2"><svg className="h-4 w-4 text-brand-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>GPS polygon verification</li>
                <li className="flex items-center gap-2"><svg className="h-4 w-4 text-brand-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>Automated deforestation checks</li>
                <li className="flex items-center gap-2"><svg className="h-4 w-4 text-brand-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>Batch-level compliance reports</li>
              </ul>
            </div>
            <div className="reveal space-y-4 rounded-xl border border-border-light bg-bg-base p-8" style={{ transitionDelay: "0.15s" }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-100">
                <svg className="h-5 w-5 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-fg-default">Working Capital</h3>
              <p className="text-sm leading-relaxed text-fg-muted">The same verified farm data creates a credit profile. Farmers access loans at 16% APR — significantly below the 30-40% typical MFI rates in Uganda. Repayment is automated at export settlement.</p>
              <ul className="space-y-2 text-sm text-fg-muted">
                <li className="flex items-center gap-2"><svg className="h-4 w-4 text-gold-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>Data-backed credit scoring</li>
                <li className="flex items-center gap-2"><svg className="h-4 w-4 text-gold-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>16% APR sustainable credit</li>
                <li className="flex items-center gap-2"><svg className="h-4 w-4 text-gold-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>Automated repayment at settlement</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24" style={{ backgroundColor: "oklch(95% 0.006 85)" }}>
        <div className="mx-auto max-w-[72rem] px-6">
          <div className="mb-16 text-center">
            <p className="reveal text-xs font-semibold uppercase tracking-[0.08em] text-gold-accent">Simple flow</p>
            <h2 className="reveal mt-3 font-['var(--font-archivo)'] text-3xl font-bold tracking-[-0.015em] text-fg-default sm:text-4xl">How it works</h2>
            <p className="reveal mx-auto mt-4 max-w-2xl text-lg text-fg-muted">From farm to payout — every step recorded on Mantle Network.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "01", title: "Farmer registered", desc: "NIN-linked wallet created. Farm GPS polygon recorded on-chain. Identity verified through cooperative agents." },
              { step: "02", title: "Coffee delivered", desc: "Batch token minted with weight, grade (screen 18), and origin. Tokenized coffee moves through supply chain with full traceability." },
              { step: "03", title: "Loan originated", desc: "Verified batch data triggers credit evaluation. Funds disbursed in USDC via LendingVault. 16% APR, automated at settlement." },
              { step: "04", title: "Export & payout", desc: "Buyer settles in USDC. Loan repaid, farmer receives net payout via mobile money (MTN MoMo). Hedera HCS audit trail recorded." },
            ].map((item, i) => (
              <div key={item.step} className="reveal rounded-xl bg-white p-6 shadow-sm border border-border-light" style={{ transitionDelay: `${i * 0.1}s` }}>
                <span className="text-3xl font-black text-gold-300">{item.step}</span>
                <h3 className="mt-3 text-base font-bold text-fg-default">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Powered by Mantle Network */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-[72rem] px-6">
          <div className="text-center">
            <p className="reveal text-xs font-semibold uppercase tracking-[0.08em] text-gold-accent">Built on</p>
            <h2 className="reveal mt-3 font-['var(--font-archivo)'] text-3xl font-bold tracking-[-0.015em] text-fg-default sm:text-4xl">Mantle Network</h2>
            <p className="reveal mx-auto mt-4 max-w-2xl text-lg text-fg-muted">Eight smart contracts powering the entire supply chain finance lifecycle.</p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "FarmerRegistry", desc: "NIN-based identity. Role-based access for cooperatives and agents." },
              { title: "BatchToken", desc: "ERC-721 coffee batches. Grade, weight, origin stored on-chain." },
              { title: "LendingVault", desc: "USDC lending pool. APR-based fees. Automated settlement." },
              { title: "TraceLog", desc: "Stage-gated batch lifecycle. GPS polygon verification." },
              { title: "CreditScore", desc: "Data-driven farmer credit profiles. Risk assessment engine." },
              { title: "ProtocolFee", desc: "4% APR protocol fee. MULTISIG distribution to treasury." },
              { title: "IdentityRegistry", desc: "ERC-8004 agent NFTs. On-chain AI agent identity." },
              { title: "PurchaseOrder", desc: "Buyer PO creation. Loan origination trigger." },
            ].map((contract, i) => (
              <div key={contract.title} className="reveal rounded-xl border border-border-light bg-bg-base p-5" style={{ transitionDelay: `${i * 0.05}s` }}>
                <h3 className="text-sm font-bold text-fg-default">{contract.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-fg-muted">{contract.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For the stakeholders */}
      <section className="py-24" style={{ backgroundColor: "oklch(95% 0.006 85)" }}>
        <div className="mx-auto max-w-[72rem] px-6">
          <div className="mb-16 text-center">
            <p className="reveal text-xs font-semibold uppercase tracking-[0.08em] text-gold-accent">For everyone</p>
            <h2 className="reveal mt-3 font-['var(--font-archivo)'] text-3xl font-bold tracking-[-0.015em] text-fg-default sm:text-4xl">Built for the ecosystem</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                role: "Farmers",
                items: ["Wallet derived from NIN — no private keys to lose", "Instant MTN Mobile Money payouts", "Credit at 16% APR vs 30-40% market rate", "Farm data creates portable credit profile"],
              },
              {
                role: "Exporters & MFIs",
                items: ["Verified batch data reduces due diligence cost", "Automated loan repayment at settlement", "Real-time LTV portfolio monitoring", "Cross-border USDC settlement via CCIP"],
              },
              {
                role: "Regulators",
                items: ["Hedera HCS immutable audit trail", "EUDR compliance automation", "On-chain batch traceability", "Government data integration (MAAIF NTS)"],
              },
            ].map((group, i) => (
              <div key={group.role} className="reveal rounded-xl border border-border-light bg-white p-6 shadow-sm" style={{ transitionDelay: `${i * 0.1}s` }}>
                <h3 className="text-lg font-bold text-fg-default">{group.role}</h3>
                <ul className="mt-4 space-y-3">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-fg-muted">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key metrics */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-[72rem] px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { value: "8", label: "Smart contracts", sub: "Deployed on Mantle Sepolia" },
              { value: "16%", label: "APR all-in cost", sub: "Interest + fees + reserve" },
              { value: "2", label: "AI agents live", sub: "Risk monitor + anomaly detector" },
              { value: "95+", label: "Doc pages", sub: "Full protocol documentation" },
            ].map((metric, i) => (
              <div key={metric.label} className="reveal text-center" style={{ transitionDelay: `${i * 0.1}s` }}>
                <p className="text-3xl font-black text-gold-accent tabular-nums">{metric.value}</p>
                <p className="mt-1 text-sm font-semibold text-fg-default">{metric.label}</p>
                <p className="text-xs text-fg-subtle">{metric.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24" style={{ backgroundColor: "oklch(95% 0.006 85)" }}>
        <div className="mx-auto max-w-[72rem] px-6 text-center">
          <h2 className="reveal font-['var(--font-archivo)'] text-3xl font-bold tracking-[-0.015em] text-fg-default sm:text-4xl">Ready to transform coffee finance?</h2>
          <p className="reveal mx-auto mt-4 max-w-xl text-lg text-fg-muted">Explore the live dashboard. Track batches, monitor loan health, and see AI agents in action on Mantle Sepolia.</p>
          <div className="reveal mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/dashboard" className="inline-flex items-center justify-center rounded-lg bg-fg-default px-8 py-3 text-sm font-semibold text-white transition-all hover:bg-[oklch(28%_0.015_60)] hover:-translate-y-0.5">Launch Dashboard</Link>
            <a href={MANTLESCAN_LINK} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-lg border border-border-med px-8 py-3 text-sm font-semibold text-fg-muted transition-all hover:border-fg-subtle hover:text-fg-default">View on MantleScan</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-light bg-white py-12">
        <div className="mx-auto max-w-[72rem] px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <img src="/asilichain-symbol.svg" alt="AsiliChain" className="h-7 w-7" />
              <div>
                <div className="text-sm font-bold text-fg-default">AsiliChain</div>
                <div className="text-[10px] font-bold tracking-widest text-fg-subtle">Origin. Finance. Trust.</div>
              </div>
            </div>
            <p className="text-xs text-fg-subtle">AsiliChain Protocol &copy; 2026 &mdash; <a href="https://docs.asilichain.xyz" target="_blank" rel="noreferrer" className="text-fg-muted underline underline-offset-2 hover:text-fg-default transition-colors">Documentation</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
