"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const MANTLESCAN_LINK =
  "https://sepolia.mantlescan.org/address/0x62a6b58f8c3625F0c5f46D6C86A65595AA769C89";

/* ── Intersection observer hook ─────────────────────────── */

function useRevealObserver() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = rootRef.current?.querySelectorAll(".reveal, .reveal-fade, .reveal-scale, .reveal-right, .stats-reveal, .line-reveal");
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
      { threshold: 0.15, rootMargin: "-60px 0px" }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return rootRef;
}

export default function LandingPage() {
  const rootRef = useRevealObserver();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={rootRef} className="min-h-screen bg-cream">
      {/* ── Navigation ──────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-navy-deep/90 shadow-lg shadow-black/10 backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-[72rem] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <img
              src="/asilichain_logo.png"
              alt="Asilichain"
              className="h-8 w-8 rounded-full"
            />
            <div className="leading-tight">
              <div
                className={`text-sm font-bold tracking-wide transition-colors ${
                  scrolled ? "text-white" : "text-white/90"
                }`}
              >
                Asilichain
              </div>
              <div className="text-[11px] font-bold tracking-widest text-white/40">
                Protocol
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={MANTLESCAN_LINK}
              target="_blank"
              rel="noreferrer"
              className={`text-sm transition-colors ${
                scrolled ? "text-white/60 hover:text-white" : "text-white/50 hover:text-white/80"
              }`}
            >
              MantleScan
            </a>
            <Link
              href="/dashboard"
              className="rounded-none bg-gold-accent px-5 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-navy-deep transition-all hover:bg-gold-hover hover:-translate-y-0.5"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative min-h-[85vh] overflow-hidden bg-navy-deep">
        {/* Ambient orbs */}
        <div className="hero-orb" />
        <div className="hero-orb" />
        <div className="hero-orb" />
        <div className="hero-ring" style={{ width: "600px", height: "600px", top: "-15%", right: "-10%" }} />
        <div className="hero-ring" style={{ width: "400px", height: "400px", bottom: "5%", left: "55%" }} />

        <div className="relative z-10 mx-auto grid min-h-[85vh] max-w-[72rem] grid-cols-1 gap-0 md:grid-cols-2">
          {/* Left column */}
          <div className="flex flex-col justify-center gap-7 px-8 py-28 md:px-12 md:py-32">
            {/* Live badge */}
            <div className="reveal flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              <span className="text-[11px] tracking-[0.08em] text-white/50">
                LIVE ON MANTLE SEPOLIA
              </span>
            </div>

            {/* Headline */}
            <h1 className="reveal font-['var(--font-archivo)'] text-4xl font-black leading-[1.05] tracking-[-0.025em] text-white sm:text-5xl md:text-[clamp(2.5rem,4vw,4rem)]">
              Asilichain is the financial infrastructure maximizing value for farmers
              across the{" "}
              <span className="text-gold-accent">African coffee supply chain</span>.
            </h1>

            {/* Subheadline */}
            <p className="reveal max-w-md text-lg leading-relaxed text-white/60">
              GPS-verified crops on Mantle Network. Instant mobile money payments.
              Automated EUDR compliance. One platform uniting farmers, exporters,
              and regulators.
            </p>

            {/* Stats row */}
            <div className="reveal flex flex-wrap gap-8 border-t border-white/10 pt-7">
              <div className="stats-reveal flex flex-col gap-0.5">
                <span className="text-2xl font-bold tabular-nums text-gold-accent">3.5M</span>
                <span className="text-xs text-white/40">Farmers targeted</span>
              </div>
              <div className="stats-reveal flex flex-col gap-0.5" style={{ transitionDelay: "0.15s" }}>
                <span className="text-2xl font-bold tabular-nums text-gold-accent">$2.4B</span>
                <span className="text-xs text-white/40">Uganda exports FY24/25</span>
              </div>
              <div className="stats-reveal flex flex-col gap-0.5" style={{ transitionDelay: "0.3s" }}>
                <span className="text-2xl font-bold tabular-nums text-gold-accent">&lt;60s</span>
                <span className="text-xs text-white/40">Payment speed</span>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="reveal flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link
                href="/dashboard"
                className="rounded-none bg-gold-accent px-8 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-navy-deep transition-all hover:bg-gold-hover hover:-translate-y-0.5 hover:shadow-[0_8px_30px_oklch(72%_0.16_80_/_0.3)]"
              >
                Explore Dashboard
              </Link>
              <a
                href={MANTLESCAN_LINK}
                target="_blank"
                rel="noreferrer"
                className="rounded-none border border-white/15 px-8 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white/70 transition-all hover:border-white/30 hover:text-white"
              >
                View on MantleScan
              </a>
            </div>
          </div>

          {/* Right column — chain flow cards */}
          <div className="reveal-right flex items-center justify-center px-8 py-20 md:px-10 md:py-32">
            <div className="w-full max-w-sm space-y-3">
              {/* Card 1 — Farmer */}
              <div className="card-hover flex items-center gap-3 border border-brand-500/20 bg-navy-mid px-4 py-3.5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center bg-brand-500/15">
                  <svg className="h-4 w-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.707.707m12.02 12.02.707.707M1 12h2m18 0h2M4.22 19.78l.707-.707M18.95 5.636l-.707.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white/85">Amina Nakato · Mbale</p>
                  <p className="text-xs text-white/40">2 ha · Grade AA Arabica</p>
                </div>
                <span className="flex-shrink-0 border border-brand-500/30 bg-navy-deep px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-500">
                  Registered
                </span>
              </div>

              {/* Connector */}
              <div className="ml-7 h-3 w-px bg-white/10" />

              {/* Card 2 — Batch on Mantle */}
              <div className="card-hover flex items-center gap-3 border border-gold-accent/20 bg-navy-mid px-4 py-3.5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center bg-gold-accent/15">
                  <svg className="h-4 w-4 text-gold-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white/85">Batch #0042 · Mantle Sepolia</p>
                  <p className="text-xs text-white/40">420 kg · Stage: EXPORTED</p>
                </div>
                <span className="flex-shrink-0 border border-gold-accent/30 bg-navy-deep px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-gold-accent">
                  On-chain
                </span>
              </div>

              {/* Connector */}
              <div className="ml-7 h-3 w-px bg-white/10" />

              {/* Card 3 — AI Agent */}
              <div className="card-hover flex items-center gap-3 border border-earth-500/20 bg-navy-mid px-4 py-3.5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center bg-earth-500/15">
                  <svg className="h-4 w-4 text-earth-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393M9.75 3.104c-.251.023-.501.05-.75.082M9.75 3.104V12" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white/85">AI Agent · Risk Monitor</p>
                  <p className="text-xs text-white/40">Agent 0 · ERC-8004</p>
                </div>
                <span className="flex-shrink-0 border border-earth-500/30 bg-navy-deep px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-earth-500">
                  Scanning
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── "One dataset, two outcomes" ──────────────────── */}
      <section className="bg-cream py-24">
        <div className="mx-auto max-w-[72rem] px-6">
          <div className="mb-16 text-center">
            <p className="reveal text-xs font-semibold uppercase tracking-[0.08em] text-gold-accent">
              One dataset
            </p>
            <h2 className="reveal mt-3 font-['var(--font-archivo)'] text-3xl font-semibold tracking-[-0.015em] text-ink sm:text-4xl">
              Two outcomes
            </h2>
            <p className="reveal mx-auto mt-4 max-w-2xl text-lg text-ink-muted">
              The same GPS farm data that satisfies European Union Deforestation
              Regulation audits unlocks instant working capital for farmers.
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
            {/* Connector line & "&" */}
            <div className="absolute top-1/2 left-1/2 hidden h-px w-16 -translate-x-1/2 bg-gold-dim md:block" />
            <div className="absolute top-1/2 left-1/2 hidden h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gold-dim bg-surface md:flex">
              <span className="text-lg font-bold text-gold-accent">&amp;</span>
            </div>

            <div className="reveal card-hover border border-white/80 bg-surface p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center bg-brand-50">
                <svg className="h-6 w-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-ink">
                EUDR Compliance
              </h3>
              <p className="mt-3 text-ink-muted">
                Every farm registered with MAAIF GPS coordinates generates an
                automated Due Diligence Statement — audit-ready for European
                buyers under EUDR regulation.
              </p>
            </div>

            <div className="reveal card-hover border border-white/80 bg-surface p-8" style={{ transitionDelay: "0.15s" }}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center bg-gold-50">
                <svg className="h-6 w-6 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-ink">
                Working Capital
              </h3>
              <p className="mt-3 text-ink-muted">
                GPS-verified crop data feeds on-chain credit scoring. Farmers
                access loans based on land, crop quality, and coffee prices — no
                collateral required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── "From farm to finance in four steps" ─────────── */}
      <section className="bg-surface py-24">
        <div className="mx-auto max-w-[72rem] px-6">
          <div className="mb-16 text-center">
            <p className="reveal text-xs font-semibold uppercase tracking-[0.08em] text-gold-accent">
              How it works
            </p>
            <h2 className="reveal mt-3 font-['var(--font-archivo)'] text-3xl font-semibold tracking-[-0.015em] text-ink sm:text-4xl">
              From farm to finance in four steps
            </h2>
            <p className="reveal mx-auto mt-4 max-w-2xl text-lg text-ink-muted">
              A supply chain built for speed, transparency, and trust.
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="absolute top-16 left-[12.5%] right-[12.5%] hidden h-px border-t border-dashed border-gold-dim md:block" />

            {steps.map((step, i) => (
              <div key={step.title} className="stagger relative flex flex-col items-center text-center">
                <div className="reveal relative z-10 flex h-28 w-28 items-center justify-center border border-white/80 bg-surface shadow-sm card-hover">
                  {stepIcons[i]}
                </div>
                <h3 className="reveal mt-5 text-lg font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="reveal mt-2 max-w-[18rem] text-sm text-ink-muted">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="reveal mt-10 border border-white/80 bg-surface p-4 text-center text-sm text-ink-muted">
            <span className="font-medium text-ink">Two registration paths:</span>{" "}
            MAAIF government GPS data import{" "}
            <span className="text-ink-muted/50">|</span> Field agent mobile
            registration
          </div>
        </div>
      </section>

      {/* ── "Built for everyone in the chain" ───────────── */}
      <section className="bg-cream py-24">
        <div className="mx-auto max-w-[72rem] px-6">
          <div className="mb-16 text-center">
            <p className="reveal text-xs font-semibold uppercase tracking-[0.08em] text-gold-accent">
              For everyone
            </p>
            <h2 className="reveal mt-3 font-['var(--font-archivo)'] text-3xl font-semibold tracking-[-0.015em] text-ink sm:text-4xl">
              Built for everyone in the chain
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="reveal card-hover border-t-4 border-brand-600 bg-surface p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center bg-brand-50">
                <svg className="h-6 w-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-ink">For the Farmer</h3>
              <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                A farmer sends a USSD message from any mobile phone — no
                smartphone needed. They deliver their coffee. Within 60 seconds,
                payment arrives to their MTN Mobile Money account. They never
                see a blockchain, never hold cryptocurrency, never pay a fee.
              </p>
            </div>

            <div className="reveal card-hover border-t-4 border-gold-accent bg-surface p-8" style={{ transitionDelay: "0.15s" }}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center bg-gold-50">
                <svg className="h-6 w-6 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-ink">For the Cooperative</h3>
              <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                Real-time payment reconciliation. EU compliance documents
                generated automatically from normal operations. Lower default
                rates because loan repayment executes automatically when coffee
                is exported — no collection agent required.
              </p>
            </div>

            <div className="reveal card-hover border-t-4 border-earth-700 bg-surface p-8" style={{ transitionDelay: "0.3s" }}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center bg-earth-50">
                <svg className="h-6 w-6 text-earth-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-ink">For the European Buyer</h3>
              <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                A verifiable, government-backed Due Diligence Statement for every
                shipment. Signed, permanently stored, verifiable by EU customs
                without contacting AsiliChain.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Protocol Architecture ────────────────────────── */}
      <section className="bg-navy-deep py-24">
        <div className="mx-auto max-w-[72rem] px-6">
          <div className="mb-16 text-center">
            <p className="reveal text-xs font-semibold uppercase tracking-[0.08em] text-gold-accent">
              Architecture
            </p>
            <h2 className="reveal mt-3 font-['var(--font-archivo)'] text-3xl font-semibold tracking-[-0.015em] text-white sm:text-4xl">
              Protocol Architecture
            </h2>
            <p className="reveal mx-auto mt-4 max-w-2xl text-lg text-white/60">
              Four layers connecting Ugandan farmers to global markets
            </p>
          </div>

          <div className="flex flex-col items-center">
            {/* Layer 1 */}
            <div className="reveal flex w-full max-w-lg flex-col items-center border border-white/10 bg-navy-mid p-6">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-gold-accent">
                Farmer Interface
              </span>
              <span className="mt-1 text-sm text-white/40">
                USSD + Mobile App
              </span>
            </div>

            <svg className="reveal my-1 h-6 w-6 text-gold-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>

            {/* Layer 2 */}
            <div className="reveal flex w-full max-w-lg flex-col items-center border border-white/10 bg-navy-mid p-6">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-white/80">
                Mantle Network
              </span>
              <span className="mt-1 text-sm text-white/40">
                Smart Contracts — BatchToken, LendingVault, FarmerRegistry
              </span>
            </div>

            <svg className="reveal my-1 h-6 w-6 text-gold-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>

            {/* Layer 3 */}
            <div className="reveal flex w-full max-w-lg flex-col items-center border border-gold-accent/20 bg-navy-mid p-6">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-gold-accent">
                AI Agent Layer
              </span>
              <span className="mt-1 text-sm text-white/40">
                Risk Monitor + Anomaly Detector (ERC-8004)
              </span>
            </div>

            <svg className="reveal my-1 h-6 w-6 text-gold-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>

            {/* Layer 4 */}
            <div className="reveal flex w-full max-w-lg flex-col items-center border border-earth-500/20 bg-navy-mid p-6">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-earth-500">
                Audit &amp; Payments
              </span>
              <span className="mt-1 text-sm text-white/40">
                Hedera HCS + Fonbnk MTN Mobile Money
              </span>
            </div>
          </div>

          <div className="reveal mt-12 text-center text-sm text-white/40">
            <span className="font-medium text-white/70">Hedera Consensus Service</span> governed by{" "}
            Google &bull; Boeing &bull; FedEx &bull; IBM &mdash; immutable audit trail for every batch
          </div>
        </div>
      </section>

      {/* ── Autonomous AI Agents ─────────────────────────── */}
      <section className="bg-cream py-24">
        <div className="mx-auto max-w-[72rem] px-6">
          <div className="mb-16 text-center">
            <p className="reveal text-xs font-semibold uppercase tracking-[0.08em] text-gold-accent">
              Intelligence layer
            </p>
            <h2 className="reveal mt-3 font-['var(--font-archivo)'] text-3xl font-semibold tracking-[-0.015em] text-ink sm:text-4xl">
              Autonomous AI agents
            </h2>
            <p className="reveal mx-auto mt-4 max-w-2xl text-lg text-ink-muted">
              Registered on-chain via{" "}
              <span className="font-mono text-brand-600">ERC-8004</span> agent
              identity
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {agents.map((agent, i) => (
              <div
                key={agent.name}
                className="reveal card-hover border border-white/80 bg-surface p-6"
                style={{ transitionDelay: `${i * 0.15}s` }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center bg-brand-50 text-xl">
                    {agent.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-ink">
                        {agent.name}
                      </h3>
                      <span className="flex items-center gap-1.5 bg-green-50 px-2.5 py-0.5 text-[11px] font-medium text-green-700">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                        </span>
                        Active on Mantle Sepolia
                      </span>
                    </div>
                    <p className="text-sm text-ink-muted">
                      Agent ID {agent.id}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-ink-muted">{agent.desc}</p>
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

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="bg-navy-deep py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="reveal font-['var(--font-archivo)'] text-3xl font-semibold tracking-[-0.015em] text-white sm:text-4xl">
            Ready to see it in action?
          </h2>
          <p className="reveal mt-4 text-lg text-white/60">
            Explore the live dashboard — batches, loans, AI agent reports, and
            on-chain data from Mantle Sepolia.
          </p>
          <div className="reveal mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="rounded-none bg-gold-accent px-8 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-navy-deep transition-all hover:bg-gold-hover hover:-translate-y-0.5 hover:shadow-[0_8px_30px_oklch(72%_0.16_80_/_0.3)]"
            >
              Explore Dashboard
            </Link>
            <a
              href={MANTLESCAN_LINK}
              target="_blank"
              rel="noreferrer"
              className="rounded-none border border-white/15 px-8 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white/70 transition-all hover:border-white/30 hover:text-white"
            >
              IdentityRegistry on MantleScan
            </a>
            <a
              href="https://asilichain.github.io/docs"
              target="_blank"
              rel="noreferrer"
              className="rounded-none border border-white/15 px-8 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white/70 transition-all hover:border-white/30 hover:text-white"
            >
              Read the Docs &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="border-t border-white/5 bg-navy-deep py-12">
        <div className="mx-auto max-w-[72rem] px-6">
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
            <div className="flex items-center gap-6 text-sm text-white/40">
              <a
                href="https://asilichain.github.io/docs"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white"
              >
                Docs
              </a>
              <a
                href="mailto:hello@asilichain.xyz"
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
            <div className="flex items-center gap-2 border border-white/10 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs text-white/40">
                Mantle Sepolia Testnet
              </span>
            </div>
          </div>
          <div className="mt-8 border-t border-white/5 pt-6 text-center text-xs text-white/30">
            &copy; {new Date().getFullYear()} Asilichain. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Data ──────────────────────────────────────────────── */

const stepIcons = [
  <svg key="step1" className="h-12 w-12 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21h7.5" />
  </svg>,

  <svg key="step2" className="h-12 w-12 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>,

  <svg key="step3" className="h-12 w-12 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>,

  <svg key="step4" className="h-12 w-12 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
  </svg>,
];

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

const agents = [
  {
    name: "Risk Monitor",
    id: 0,
    icon: "\u{1F6E1}\u{FE0F}",
    desc: "Monitors LTV ratios across all active loans using coffee price oracles and quality multipliers. Classifies each loan as healthy, warning, or critical.",
  },
  {
    name: "Anomaly Detector",
    id: 1,
    icon: "\u{1F50D}",
    desc: "Scans batch supply chain data for anomalies — missing purchase orders, stale exports, weight outliers, and grade inconsistencies.",
  },
];
