"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const GOLD = "#C8922A";
const GREEN = "#2D6A2D";
const BROWN = "#4B2E0A";
const NAVY = "#1A3557";
const MUTED = "oklch(50% 0.03 90)";
const BORDER = "oklch(88% 0.02 90)";
const SURFACE = "oklch(99% 0.008 85)";

const STAGES = [
  { num: 1, tag: "Onboard", label: "REGISTERED", desc: "Farm GPS mapped, farmer ID verified on-chain. The starting point for every traceable batch. Recorded by MAAIF NTS.", color: GREEN },
  { num: 2, tag: "Collect", label: "DELIVERED", desc: "Coffee weighed and submitted at collection point. BatchToken minted on Mantle with weight, grade, and origin data. Recorded by field operator via USSD.", color: GREEN },
  { num: 3, tag: "Assess", label: "GRADED", desc: "Quality assessment — moisture content, screen size classification, FAQ assigned. LTV updates if a loan is active. Recorded by cooperative quality officer.", color: BROWN },
  { num: 4, tag: "Process", label: "MILLED", desc: "Coffee processed — hulled, cleaned, sorted for export readiness. Physical custody transfers to the mill. Recorded by mill operator.", color: BROWN },
  { num: 5, tag: "Store", label: "WAREHOUSED", desc: "Physical coffee stored under bonded warehouse receipt. Collateral loan LTV assessed at 70%. PurchaseOrder can now be created. Recorded by warehouse manager.", color: BROWN },
  { num: 6, tag: "Commit", label: "COMMITTED", desc: "Buyer PurchaseOrder confirmed on-chain. Token locked — no transfer. LTV increases to 80%. Shipment preparation begins. Recorded by cooperative or exporter.", color: GOLD },
  { num: 7, tag: "Ship", label: "EXPORTED", desc: "Shipment leaves Uganda. Auto-repayment triggered. EUDR DDS generated. CreditScore +50 on settlement. Recorded by exporter with DCD permit.", color: GOLD },
  { num: 8, tag: "Close", label: "SETTLED", desc: "Buyer USDC payment received. Protocol fee withheld (4% APR). Reserve accrued (2% APR). Farmer paid via MTN MoMo in under 60 seconds. Token burned.", color: NAVY },
];

const OUTPUTS = [
  { icon: "⚡", title: "60-second payment", desc: "Fonbnk converts merchant balance to UGX, credits MTN MoMo instantly", color: GREEN },
  { icon: "✅", title: "EUDR compliance", desc: "GPS + stage data auto-generates DDS at export time", color: NAVY },
  { icon: "📊", title: "Price transparency", desc: "Chainlink oracle prices visible to cooperative dashboard", color: GOLD },
  { icon: "📈", title: "Credit history", desc: "CreditScore builds from first delivery for future loans", color: BROWN },
];

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.unobserve(el); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function StageCard({ stage, isActive }: { stage: typeof STAGES[number]; isActive: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !visible) setVisible(true);
        if (!entry.isIntersecting && entry.boundingClientRect.top > 0) setVisible(false);
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible]);

  return (
    <div ref={ref} data-stage={stage.num - 1}
      className="relative pl-16"
      style={{
        minHeight: 320,
        paddingTop: 40,
        paddingBottom: 40,
        opacity: visible ? 1 : 0.25,
        transition: "opacity 0.5s ease",
      }}>
      {/* Left accent line + dot */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: BORDER }}>
        <div className="absolute top-0 left-0 right-0 transition-all duration-700 ease-out rounded-full"
          style={{ background: isActive ? GOLD : "transparent", height: isActive ? "100%" : "0%" }} />
      </div>
      <div className="absolute -left-[5px] transition-all duration-500"
        style={{ top: 40, width: 11, height: 11, borderRadius: "50%", background: isActive ? GOLD : BORDER, boxShadow: isActive ? `0 0 16px ${GOLD}40` : "none" }} />

      {/* Category tag */}
      <p className="text-xs font-semibold uppercase tracking-[0.1em] mb-3" style={{ color: stage.color }}>
        {stage.tag}
      </p>
      {/* Heading */}
      <h3 className="text-2xl font-bold tracking-[-0.02em] mb-4 transition-colors duration-500"
        style={{ color: isActive ? stage.color : NAVY, fontFamily: "var(--font-archivo), system-ui" }}>
        {stage.label}
      </h3>
      {/* Description */}
      <p className="text-base leading-relaxed max-w-xl" style={{ color: MUTED }}>
        {stage.desc}
      </p>
    </div>
  );
}

function SideProgress({ active, stages, onNavigate, containerRef }: { active: number; stages: typeof STAGES; onNavigate: (n: number) => void; containerRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div className="sticky flex-shrink-0 hidden md:block" style={{ top: 120, width: 4, height: "fit-content", marginRight: 24 }}>
      <div className="relative rounded-full" style={{ background: BORDER, height: stages.length * 80 }}>
        <div className="absolute top-0 left-0 right-0 rounded-full transition-all duration-700 ease-out"
          style={{
            background: `linear-gradient(to bottom, ${GREEN}, ${BROWN}, ${GOLD}, ${NAVY})`,
            height: `${((active + 1) / stages.length) * 100}%`,
          }} />
      </div>
      {stages.map((_, i) => (
        <button
          key={i}
          onClick={() => onNavigate(i)}
          className="absolute left-1/2 -translate-x-1/2 rounded-full transition-all duration-500"
          style={{
            width: 8, height: 8,
            top: i * 80 + 36,
            background: i === active ? "#fff" : "transparent",
            border: i === active ? `2px solid ${GOLD}` : "none",
            boxShadow: i === active ? `0 0 8px ${GOLD}60` : "none",
          }}>
          <span className="sr-only">Stage {i + 1}</span>
        </button>
      ))}
    </div>
  );
}

function CreditFlow() {
  const steps = [
    { label: "Collateral", detail: "GrowingCropToken (LTV 30–65%)" },
    { label: "Loan", detail: "14–18% APR pre-harvest" },
    { label: "Stablecoin", detail: "USDC via LendingVault" },
    { label: "Repay", detail: "Auto at settlement +50 score" },
  ];
  return (
    <div className="flex items-center justify-center gap-0 flex-wrap md:flex-nowrap">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center">
          <div className="flex flex-col items-center text-center px-3" style={{ minWidth: 100 }}>
            <div className="rounded-full mb-2" style={{ width: 12, height: 12, background: i < steps.length - 1 ? GOLD : GREEN }} />
            <span className="text-xs font-bold" style={{ color: NAVY }}>{s.label}</span>
            <span className="text-[10px] leading-tight mt-0.5" style={{ color: MUTED }}>{s.detail}</span>
          </div>
          {i < steps.length - 1 && (
            <svg width="32" height="2" viewBox="0 0 32 2" preserveAspectRatio="none" className="flex-shrink-0">
              <line x1="0" y1="1" x2="32" y2="1" stroke={GOLD} strokeWidth="1.5" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

function OutputsHub() {
  const { ref, inView } = useInView(0.1);

  // Diamond positions: top, right, bottom, left
  const positions = [
    { x: "50%", y: "10%", data: OUTPUTS[0] },  // 60s payment - top
    { x: "85%", y: "35%", data: OUTPUTS[1] },  // EUDR - right
    { x: "50%", y: "60%", data: OUTPUTS[2] },  // Price - bottom
    { x: "15%", y: "35%", data: OUTPUTS[3] },  // Credit - left
  ];

  const stats = ["60s", "DDS", "Spot", "50+"];

  return (
    <div ref={ref} className="relative w-full overflow-hidden">
      {/* Wave divider: cream → brown */}
      <div className="relative" style={{ background: "oklch(97% 0.015 90)" }}>
        <svg viewBox="0 0 1440 80" className="w-full h-auto block" preserveAspectRatio="none">
          <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,30 1440,40 L1440,80 L0,80 Z" fill="#3d2310" />
        </svg>
      </div>
      {/* Brown field */}
      <div className="relative py-20 px-4" style={{ background: "#3d2310" }}>
        <p className="text-center text-xs font-semibold uppercase tracking-[0.1em] mb-4" style={{ color: GOLD }}>
          Four Outputs for Every Farmer
        </p>

        {/* Hub-and-spoke layout */}
        <div className="relative max-w-2xl mx-auto" style={{ height: 420 }}>
          {/* Connecting lines from center to cards */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            {positions.map((p, i) => (
              <line key={i} x1="50%" y1="35%" x2={p.x} y2={p.y}
                stroke={GOLD} strokeWidth="1" opacity={inView ? 0.5 : 0}
                strokeDasharray="4 3"
                style={{ transition: `opacity 0.8s ${0.3 + i * 0.15}s ease` }} />
            ))}
          </svg>

          {/* Central hub — farmer */}
          <div className="absolute flex flex-col items-center"
            style={{
              left: "50%", top: "35%", transform: "translate(-50%, -50%)", zIndex: 10,
              opacity: inView ? 1 : 0, transition: "opacity 0.6s 0.1s ease",
            }}>
            <div className="flex items-center justify-center rounded-full"
              style={{ width: 88, height: 88, background: `radial-gradient(circle, ${GREEN}30, ${BROWN}80)`, border: `3px solid ${GOLD}` }}>
              <span className="text-4xl">👨‍🌾</span>
            </div>
            <span className="text-xs font-semibold mt-2 tracking-wide" style={{ color: GOLD }}>Every Farmer</span>
          </div>

          {/* 4 output cards radiating */}
          {positions.map((p, i) => (
            <div key={p.data.title}
              className="absolute text-center"
              style={{
                left: p.x, top: p.y, transform: "translate(-50%, -50%)", zIndex: 10,
                opacity: inView ? 1 : 0,
                transition: `all 0.6s ${0.2 + i * 0.15}s cubic-bezier(0.16, 1, 0.3, 1)`,
              }}>
              {/* Stat badge */}
              <div className="flex items-center justify-center mx-auto rounded-full mb-2"
                style={{ width: 44, height: 44, border: `2px solid ${GOLD}`, background: "rgba(0,0,0,0.3)" }}>
                <span className="text-xs font-bold" style={{ color: GOLD }}>{stats[i]}</span>
              </div>
              {/* Title */}
              <span className="block text-xs font-bold mb-1" style={{ color: "#fff" }}>{p.data.title}</span>
              {/* Description */}
              <span className="block text-[10px] leading-tight max-w-[120px] mx-auto" style={{ color: "oklch(70% 0.02 80)" }}>
                {p.data.desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HowItWorks() {
  const { ref: sectionRef, inView } = useInView(0.05);
  const [activeStage, setActiveStage] = useState(0);
  const cardsRef = useRef<HTMLDivElement>(null);

  // Scroll-driven: find which stage is most visible — debounced for stability
  useEffect(() => {
    const container = cardsRef.current;
    if (!container) return;

    let timeout: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const cards = container.querySelectorAll("[data-stage]");
        let bestIdx = 0;
        let bestDist = Infinity;
        const viewMiddle = window.innerHeight * 0.3;

        cards.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const dist = Math.abs(rect.top - viewMiddle);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = Number(el.getAttribute("data-stage") ?? 0);
          }
        });

        setActiveStage(bestIdx);
      }, 150);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeout);
    };
  }, []);

  const scrollTo = useCallback((n: number) => {
    const el = cardsRef.current?.querySelector(`[data-stage="${n}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div ref={sectionRef}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(24px)",
        transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
      <div className="text-center mb-20 px-4">
        <p className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: GOLD }}>How it works</p>
        <h2 className="mt-4 font-['var(--font-archivo)'] text-4xl font-bold tracking-[-0.02em] sm:text-5xl" style={{ color: NAVY }}>
          Automate all your workflows in one system
        </h2>
        <p className="mt-4 max-w-xl mx-auto text-base leading-relaxed" style={{ color: MUTED }}>
          AsiliChain auto-detects where to automate, recommends verified stage blueprints, and provides a complete build and management platform for scale.
        </p>
      </div>

      <div className="flex max-w-3xl mx-auto px-4">
        <SideProgress active={activeStage} stages={STAGES} onNavigate={scrollTo} containerRef={cardsRef} />
        <div ref={cardsRef} className="flex-1 min-w-0">
          {STAGES.map((stage, i) => (
            <StageCard key={stage.num} stage={stage} isActive={i === activeStage} />
          ))}
        </div>
      </div>

      <div className="text-center mt-24 mb-12 px-4">
        <p className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: GOLD }}>The engine behind the flow</p>
        <h3 className="mt-2 text-xl font-bold" style={{ color: NAVY }}>Credit moves alongside every stage</h3>
      </div>
      <div className="max-w-3xl mx-auto px-4 mb-24">
        <CreditFlow />
      </div>

      <OutputsHub />
    </div>
  );
}
