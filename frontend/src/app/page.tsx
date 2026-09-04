"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Hero } from "@/components/landing/Hero";

// ── Color tokens ──────────────────────────────────────────────────────────────
const ORANGE = "#f97316";
const CYAN   = "#0891b2";
const DARK   = "#0f172a";
const SLATE  = "#1e293b";

// ── Animated Counter ──────────────────────────────────────────────────────────
function Counter({ target, prefix = "", suffix = "", duration = 1800 }: {
  target: number; prefix?: string; suffix?: string; duration?: number;
}) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setValue(Math.round(ease * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);
  return <div ref={ref}>{prefix}{value.toLocaleString()}{suffix}</div>;
}

// ── Navigation ────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 999,
      padding: "0 40px", height: 68,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: scrolled ? "rgba(255,255,255,0.95)" : "transparent",
      backdropFilter: scrolled ? "blur(16px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(0,0,0,0.06)" : "1px solid transparent",
      transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
      boxShadow: scrolled ? "0 4px 20px rgba(0,0,0,0.04)" : "none",
    }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `linear-gradient(135deg, ${ORANGE}, #ea580c)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 19, color: "white",
          boxShadow: `0 4px 14px rgba(249,115,22,0.35)`,
        }}>S</div>
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 800, color: DARK }}>SkillX</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: ORANGE, background: "rgba(249,115,22,0.1)", padding: "2px 7px", borderRadius: 999, border: "1px solid rgba(249,115,22,0.25)", marginLeft: 2 }}>SIH 2026</span>
      </Link>

      {/* Nav links */}
      <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
        {[["#platform", "How It Works"], ["#engines", "Engines"], ["#portals", "Portals"]].map(([href, label]) => (
          <a key={href} href={href} style={{ color: "rgba(15,23,42,0.65)", textDecoration: "none", fontSize: 14, fontWeight: 700, transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = DARK)}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(15,23,42,0.65)")}>
            {label}
          </a>
        ))}
      </div>

      {/* CTAs */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/student" className="btn-light" style={{ padding: "9px 20px", fontSize: 13, border: "1.5px solid rgba(37,99,235,0.2)", textDecoration: "none" }}>
          Student Portal
        </Link>
        <Link href="/login" style={{
          padding: "9px 22px", borderRadius: 999, fontSize: 13, fontWeight: 800,
          background: `linear-gradient(135deg, ${ORANGE}, #ea580c)`,
          color: "white", textDecoration: "none",
          boxShadow: "0 4px 16px rgba(249,115,22,0.3)",
          transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 8px 20px rgba(249,115,22,0.45)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "none"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 16px rgba(249,115,22,0.3)"; }}
        >Govt. Login →</Link>
      </div>
    </nav>
  );
}

// ── Floating animated blob ─────────────────────────────────────────────────────
function Blob({ style }: { style: React.CSSProperties }) {
  return (
    <div style={{
      position: "absolute", borderRadius: "50%",
      filter: "blur(80px)", pointerEvents: "none",
      ...style,
    }} />
  );
}

// ── Pipeline step card ────────────────────────────────────────────────────────
function PipelineCard({ icon, step, title, sub, color }: {
  icon: string; step: string; title: string; sub: string; color: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? `rgba(30,41,59,0.95)` : "rgba(30,41,59,0.75)",
        backdropFilter: "blur(16px)",
        border: `1px solid ${hovered ? color : color + "44"}`,
        borderRadius: 18, padding: "24px 14px 20px",
        display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        transform: hovered ? "translateY(-6px)" : "none",
        boxShadow: hovered ? `0 16px 40px ${color}33` : "0 4px 16px rgba(0,0,0,0.2)",
        cursor: "default",
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14, marginBottom: 14,
        background: `${color}20`, border: `1.5px solid ${color}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, boxShadow: `0 4px 14px ${color}30`,
      }}>{icon}</div>
      <div style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: "0.12em", marginBottom: 6 }}>{step}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 6, lineHeight: 1.3 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{sub}</div>
    </div>
  );
}

// ── Engine card ───────────────────────────────────────────────────────────────
function EngineCard({ num, title, tag, desc, color, bg }: {
  num: string; title: string; tag: string; desc: string; color: string; bg: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: 32, borderRadius: 20, background: "white",
        border: `1px solid ${hovered ? color + "60" : "rgba(0,0,0,0.07)"}`,
        boxShadow: hovered ? `0 20px 48px ${color}15` : "0 4px 16px rgba(0,0,0,0.04)",
        transition: "all 0.3s cubic-bezier(0.2,0,0,1)",
        transform: hovered ? "translateY(-6px)" : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: "0.1em" }}>{num}</span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: bg, color }}>{tag}</span>
      </div>
      <div style={{
        width: 48, height: 48, borderRadius: 14, background: bg, marginBottom: 16,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22,
      }}>
        {num === "ENGINE 01" ? "🏭" : num === "ENGINE 02" ? "🔍" : num === "ENGINE 03" ? "🧠" : "📊"}
      </div>
      <h3 style={{ fontSize: 19, fontWeight: 800, color: DARK, marginBottom: 10, fontFamily: "'Playfair Display', serif" }}>{title}</h3>
      <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7 }}>{desc}</p>
    </div>
  );
}

// ── Live console preview ───────────────────────────────────────────────────────
function LiveConsole() {
  const rows = [
    { course: "Electrician Trade (DVET)", score: 85.7, status: "ALIGNED",  color: "#16a34a" },
    { course: "Fitter Trade (DVET)",       score: 72.3, status: "MODERATE", color: "#d97706" },
    { course: "Solar Technician (MSSDS)",  score: 20.3, status: "DEFICIT",  color: "#dc2626" },
    { course: "EV Technician (MSSDS)",     score: 34.1, status: "DEFICIT",  color: "#dc2626" },
    { course: "CNC Machinist (DVET)",      score: 78.9, status: "MODERATE", color: "#d97706" },
  ];
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActive(a => (a + 1) % rows.length), 2000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      borderRadius: 20, overflow: "hidden",
      boxShadow: "0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.06)",
      background: "#0f172a",
    }}>
      {/* Title bar */}
      <div style={{ background: "#1e293b", padding: "12px 18px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginLeft: 8, fontFamily: "monospace" }}>
          SkillX · Gap Analysis · Pune District
        </span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#22c55e", fontWeight: 700 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", animation: "pulse 1.5s ease-in-out infinite", display: "inline-block" }} />
          LIVE
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ padding: "18px 20px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Batch Progress</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>50 / 547 courses</span>
        </div>
        <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ height: "100%", width: "9.14%", background: `linear-gradient(90deg, ${ORANGE}, #ea580c)`, borderRadius: 999, boxShadow: `0 0 10px ${ORANGE}80` }} />
        </div>
      </div>

      {/* Course rows */}
      <div style={{ padding: "8px 0" }}>
        {rows.map((row, i) => (
          <div key={row.course} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "11px 20px",
            background: active === i ? "rgba(255,255,255,0.04)" : "transparent",
            transition: "background 0.3s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {active === i && <span style={{ width: 6, height: 6, borderRadius: "50%", background: ORANGE, display: "inline-block", boxShadow: `0 0 8px ${ORANGE}` }} />}
              <span style={{ fontSize: 13, color: active === i ? "white" : "rgba(255,255,255,0.6)", fontWeight: 600, transition: "color 0.3s" }}>{row.course}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: row.color, fontFamily: "monospace" }}>{row.score}%</span>
              <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: `${row.color}18`, color: row.color, border: `1px solid ${row.color}30` }}>{row.status}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>engine_4.gap_analysis · 47ms</span>
        <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>✓ Zero API calls</span>
      </div>
    </div>
  );
}

// ── Portal card ───────────────────────────────────────────────────────────────
function PortalCard({ icon, role, headline, desc, features, href, cta, accentColor, accentBg }: {
  icon: string; role: string; headline: string; desc: string;
  features: string[]; href: string; cta: string;
  accentColor: string; accentBg: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "white", borderRadius: 24, padding: "40px 36px",
        border: `1.5px solid ${hovered ? accentColor + "50" : "rgba(0,0,0,0.07)"}`,
        boxShadow: hovered ? `0 24px 60px ${accentColor}15` : "0 4px 20px rgba(0,0,0,0.05)",
        transition: "all 0.35s cubic-bezier(0.2,0,0,1)",
        transform: hovered ? "translateY(-8px)" : "none",
        display: "flex", flexDirection: "column",
      }}
    >
      <div style={{ width: 60, height: 60, borderRadius: 18, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 20, border: `1px solid ${accentColor}20` }}>
        {icon}
      </div>
      <div style={{ fontSize: 11, fontWeight: 800, color: accentColor, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{role}</div>
      <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 800, color: DARK, marginBottom: 12, lineHeight: 1.25 }}>{headline}</h3>
      <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.7, marginBottom: 24 }}>{desc}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
        {features.map(f => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", background: accentBg, border: `1px solid ${accentColor}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: accentColor, fontWeight: 800, flexShrink: 0 }}>✓</span>
            <span style={{ fontSize: 14, color: "#334155", fontWeight: 500 }}>{f}</span>
          </div>
        ))}
      </div>
      <Link href={href} style={{
        marginTop: "auto", padding: "14px 28px", borderRadius: 999, textAlign: "center",
        background: hovered ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` : accentBg,
        color: hovered ? "white" : accentColor,
        fontWeight: 800, fontSize: 14, textDecoration: "none",
        border: `2px solid ${accentColor}`,
        transition: "all 0.25s",
        boxShadow: hovered ? `0 8px 24px ${accentColor}35` : "none",
        display: "block",
      }}>
        {cta}
      </Link>
    </div>
  );
}

// ── MAIN LANDING PAGE ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [navLoading, setNavLoading] = useState(false);

  const PIPELINE = [
    { icon: "🏭", step: "STEP 01", title: "Industry Demand", sub: "3,200+ job listings across NCS & MIDC clusters", color: ORANGE },
    { icon: "🔍", step: "STEP 02", title: "Job Scanning",    sub: "Engine 2 extracts required skill terms in real-time", color: "#38bdf8" },
    { icon: "🧠", step: "STEP 03", title: "Skill Extraction", sub: "500+ synonyms mapped to NSQF taxonomy", color: "#a855f7" },
    { icon: "📊", step: "STEP 04", title: "Gap Analysis",    sub: "Engine 4 scores 547 syllabi against live demand", color: "#f87171" },
    { icon: "📋", step: "STEP 05", title: "Bridge Plans",    sub: "20-hour targeted training modules generated", color: "#4ade80" },
    { icon: "⚡", step: "STEP 06", title: "Govt. Action",   sub: "Collector approves & deploys in 20 days", color: "#22d3ee" },
  ];

  const ENGINES = [
    { num: "ENGINE 01", title: "Automated Course Ingestion", tag: "Source Ingestion", color: ORANGE, bg: "#fff7ed", desc: "SHA-256 change detection automatically ingests all 85 DVET ITI Trades and 1,200+ MSSDS entries. Full audit trail — records are versioned, never deleted." },
    { num: "ENGINE 02", title: "Market Demand Scanner", tag: "Demand Crawler", color: CYAN, bg: "#ecfeff", desc: "Continuously monitors NCS.gov.in and industrial job boards across Maharashtra's 36 districts and MIDC hubs in Pune, Nashik, Thane, Nagpur and Sambhajinagar." },
    { num: "ENGINE 03", title: "Central Skill Dictionary", tag: "Local NLP", color: "#7c3aed", bg: "#f5f3ff", desc: "6-category NSQF-aligned skill taxonomy with synonym normalization and confidence-scored unknown skill detection — operates fully offline with zero external API calls." },
    { num: "ENGINE 04", title: "3-Tier Gap Analysis Matrix", tag: "Policy Analytics", color: "#16a34a", bg: "#f0fdf4", desc: "Classifies curriculum coverage into Fully Covered, Partially Covered, and Critical Deficit. Computes a demand-weighted alignment score for every course." },
  ];

  const STATS = [
    { num: 547,  suffix: "+",   label: "Courses Analyzed",      color: ORANGE },
    { num: 36,   suffix: "",    label: "Maharashtra Districts",  color: CYAN   },
    { num: 3200, suffix: "+",   label: "Job Postings Scanned",   color: "#a855f7" },
    { num: 20,   suffix: " days", label: "to Full District Plan", color: "#4ade80" },
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#fff", color: DARK, overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.45; } }
        @keyframes float  { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-16px); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer{ 0%{ background-position:-400px 0 } 100%{ background-position:400px 0 } }
        .fade-up { animation: fadeUp 0.8s cubic-bezier(0.2,0,0,1) both; }
        .fade-up-1 { animation-delay: 0.1s; }
        .fade-up-2 { animation-delay: 0.22s; }
        .fade-up-3 { animation-delay: 0.36s; }
        .fade-up-4 { animation-delay: 0.5s; }
        .pipeline-line { 
          position:absolute; top:44px; left:8%; right:8%; height:2px;
          background: linear-gradient(90deg, ${ORANGE} 0%, #38bdf8 20%, #a855f7 40%, #f87171 60%, #4ade80 80%, #22d3ee 100%);
          box-shadow: 0 0 12px rgba(56,189,248,0.6); border-radius:999px; z-index:0;
        }
        @media (max-width:900px) {
          .hero-split { grid-template-columns: 1fr !important; }
          .pipeline-grid { grid-template-columns: repeat(2,1fr) !important; }
          .engines-grid  { grid-template-columns: 1fr !important; }
          .portals-grid  { grid-template-columns: 1fr !important; }
          .stats-grid    { grid-template-columns: repeat(2,1fr) !important; }
          .footer-grid   { flex-direction: column !important; gap: 32px !important; }
          .pipeline-line { display: none; }
        }
      `}</style>

      <Navbar />

      {/* ── OLD HERO ──────────────────────────────────────────────────────────────── */}
      <Hero />

      {/* ── ANIMATED STATS ─────────────────────────────────────────────────────── */}
      <section style={{ background: "#fff", padding: "64px 40px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }} className="stats-grid">
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: "center", padding: "20px" }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(36px,3.5vw,52px)", fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: 8 }}>
                <Counter target={s.num} suffix={s.suffix} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#64748b" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS (6-step pipeline) ──────────────────────────────────── */}
      <section id="platform" style={{ padding: "100px 40px", background: `linear-gradient(180deg, #0b1329 0%, ${DARK} 100%)`, color: "white", position: "relative", overflow: "hidden" }}>
        <Blob style={{ top: "10%", left: "5%",    width: 450, height: 450, background: `radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 70%)` }} />
        <Blob style={{ bottom: "5%", right: "5%", width: 500, height: 500, background: `radial-gradient(circle, rgba(56,189,248,0.10) 0%, transparent 70%)` }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 16px", borderRadius: 999, background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)", fontSize: 12, fontWeight: 800, color: ORANGE, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
              ⚡ THE FULL PIPELINE
            </div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(32px,4.5vw,48px)", fontWeight: 800, color: "white", marginBottom: 16, lineHeight: 1.2 }}>
              From <span style={{ color: ORANGE }}>Industry Demand</span> to{" "}
              <span style={{ background: "linear-gradient(135deg, #38bdf8, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Government Action</span>
            </h2>
            <p style={{ fontSize: 17, color: "#94a3b8", maxWidth: 580, margin: "0 auto", lineHeight: 1.7 }}>
              One continuous AI intelligence loop connecting employer hiring needs with vocational syllabi — fully automated, zero manual effort.
            </p>
          </div>

          {/* Pipeline cards */}
          <div style={{ position: "relative", marginBottom: 72 }}>
            <div className="pipeline-line" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 14, position: "relative", zIndex: 1 }} className="pipeline-grid">
              {PIPELINE.map((item, i) => (
                <div key={i} style={{ position: "relative" }}>
                  {i < 5 && (
                    <div style={{ position: "absolute", right: -10, top: 32, zIndex: 3, fontSize: 14, color: item.color, fontWeight: 900, textShadow: `0 0 10px ${item.color}` }}>➔</div>
                  )}
                  <PipelineCard {...item} />
                </div>
              ))}
            </div>
          </div>

          {/* Impact metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, padding: "36px 32px", borderRadius: 24, background: "rgba(30,41,59,0.55)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.10)" }} className="stats-grid">
            {[
              { stat: "47%",       color: ORANGE,   glow: "rgba(249,115,22,0.35)",  title: "Skill Mismatch Rate",        desc: "Nearly half of ITI graduates lack skills employers actively demand in Maharashtra's growth sectors." },
              { stat: "₹2,400 Cr", color: "#f87171", glow: "rgba(248,113,113,0.35)", title: "Annual Income Loss",         desc: "Estimated productivity loss from curriculum gaps across 1.2 lakh vocational trainees per year." },
              { stat: "20 Days",   color: "#38bdf8", glow: "rgba(56,189,248,0.35)",  title: "To Full District Plan",     desc: "From raw data ingestion to a complete, printable government intervention plan — zero manual effort." },
            ].map((m, i) => (
              <div key={i} style={{ padding: "8px 16px" }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(36px,3.5vw,48px)", fontWeight: 900, color: m.color, lineHeight: 1, marginBottom: 10, textShadow: `0 4px 20px ${m.glow}` }}>{m.stat}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "white", marginBottom: 6 }}>{m.title}</div>
                <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ENGINES SHOWCASE ────────────────────────────────────────────────────── */}
      <section id="engines" style={{ padding: "100px 40px", background: "#fff" }}>
        <div style={{ maxWidth: 1150, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em", color: ORANGE, textTransform: "uppercase", display: "block", marginBottom: 14 }}>Architecture & Core Pipeline</span>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(32px,4vw,46px)", fontWeight: 800, color: DARK, marginBottom: 16, lineHeight: 1.2 }}>Four Zero-API Engines</h2>
            <p style={{ fontSize: 17, color: "#64748b", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
              Each engine operates independently, locally, with no external API calls — ensuring data sovereignty and sub-200ms response times.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 24 }} className="engines-grid">
            {ENGINES.map(e => <EngineCard key={e.num} {...e} />)}
          </div>
        </div>
      </section>

      {/* ── DUAL PORTAL SPLIT ──────────────────────────────────────────────────── */}
      <section id="portals" style={{ padding: "100px 40px", background: "#f8fafc" }}>
        <div style={{ maxWidth: 1150, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em", color: CYAN, textTransform: "uppercase", display: "block", marginBottom: 14 }}>Two Portals, One Platform</span>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(32px,4vw,46px)", fontWeight: 800, color: DARK, marginBottom: 16, lineHeight: 1.2 }}>Built For Every Stakeholder</h2>
            <p style={{ fontSize: 17, color: "#64748b", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
              Whether you&apos;re a government officer making policy decisions or a student planning your career, SkillX speaks your language.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }} className="portals-grid">
            <PortalCard
              icon="🏛️"
              role="For Government Officers"
              headline="AI-Powered Decision Console"
              desc="A clean, judge-friendly dashboard that tells you exactly what needs to change — course by course, district by district."
              features={[
                "Priority-ranked courses by urgency score",
                "One-click 20-hour Skill Bridge Pack generation",
                "Approve, defer, or reject AI recommendations",
                "Real executive briefing with actual gap data",
                "District-level intervention plans",
              ]}
              href="/login"
              cta="Enter Government Portal →"
              accentColor={ORANGE}
              accentBg="#fff7ed"
            />
            <PortalCard
              icon="🎓"
              role="For Vocational Students"
              headline="Your Personal Career AI Coach"
              desc="A personalized guide that knows your skills, your district, and your goals — and builds a roadmap to get you there."
              features={[
                "AI-generated 6-week personalized roadmap",
                "Course recommendations matched to your career goal",
                "Job readiness score and skill gap tracker",
                "Chat with an AI coach that actually knows you",
                "Bridge Pack modules to close your skill gaps",
              ]}
              href="/student"
              cta="Open Student Portal →"
              accentColor={CYAN}
              accentBg="#ecfeff"
            />
          </div>
        </div>
      </section>

      {/* ── LIVE CONSOLE + BATCH SECTION ──────────────────────────────────────── */}
      <section style={{ padding: "100px 40px", background: "#fff" }}>
        <div style={{ maxWidth: 1150, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }} className="hero-split">
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em", color: "#ea580c", textTransform: "uppercase", display: "block", marginBottom: 14 }}>Scalable Batch Processing</span>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(30px,3.8vw,42px)", fontWeight: 800, color: DARK, marginBottom: 18, lineHeight: 1.25 }}>
              Analyse 547 Courses.<br />50 at a Time.
            </h2>
            <p style={{ fontSize: 16, color: "#475569", lineHeight: 1.8, marginBottom: 28 }}>
              Officers trigger 50-course analysis batches on demand. The system tracks progress, saves offsets across sessions, and generates printable district reports — all in under 200ms per batch.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
              {[
                ["⚡", "Batch processing completes 50 courses in under 200ms"],
                ["📋", "Tracks remaining courses across all 36 districts"],
                ["📥", "Instant PDF export for District Skill Deficit Reports"],
                ["🔄", "Auto-saves progress for seamless multi-session usage"],
                ["🔒", "SHA-256 audit trail — every change logged & versioned"],
              ].map(([icon, text]) => (
                <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: "#fff7ed", border: "1px solid #ffedd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                  <span style={{ fontSize: 14, color: "#334155", lineHeight: 1.6, fontWeight: 500 }}>{text}</span>
                </div>
              ))}
            </div>
            <Link href="/login" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "14px 32px", borderRadius: 999, border: "none",
              background: `linear-gradient(135deg, ${ORANGE}, #ea580c)`,
              color: "white", fontWeight: 800, fontSize: 15, textDecoration: "none",
              boxShadow: "0 8px 24px rgba(249,115,22,0.35)",
              transition: "all 0.25s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 14px 32px rgba(249,115,22,0.45)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "none"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 8px 24px rgba(249,115,22,0.35)"; }}
            >Open Admin Dashboard →</Link>
          </div>

          {/* Bigger console */}
          <LiveConsole />
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: "100px 40px", background: `linear-gradient(135deg, ${DARK} 0%, #0d1b2e 100%)`, position: "relative", overflow: "hidden" }}>
        <Blob style={{ top: "20%", left: "10%", width: 500, height: 500, background: "radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)" }} />
        <Blob style={{ bottom: "10%", right: "10%", width: 400, height: 400, background: "radial-gradient(circle, rgba(8,145,178,0.12) 0%, transparent 70%)" }} />
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 16px", borderRadius: 999, background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)", fontSize: 12, fontWeight: 800, color: ORANGE, letterSpacing: "0.10em", marginBottom: 24 }}>
            🇮🇳 SIH 2026 — Smart India Hackathon
          </div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(34px,5vw,56px)", fontWeight: 800, color: "white", lineHeight: 1.15, marginBottom: 20 }}>
            Ready to Bridge{" "}
            <span style={{ background: `linear-gradient(135deg, ${ORANGE}, #fb923c)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Maharashtra&apos;s</span>{" "}
            Skill Gap?
          </h2>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.60)", lineHeight: 1.7, marginBottom: 40 }}>
            Join the movement to build a future-ready workforce for the state's 1.2 lakh vocational trainees.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/login" style={{
              padding: "16px 40px", borderRadius: 999, fontSize: 16, fontWeight: 800,
              background: `linear-gradient(135deg, ${ORANGE}, #ea580c)`,
              color: "white", textDecoration: "none",
              boxShadow: "0 8px 28px rgba(249,115,22,0.45)",
              transition: "all 0.25s", display: "inline-flex", alignItems: "center", gap: 8,
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 12px 36px rgba(249,115,22,0.6)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "none"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 8px 28px rgba(249,115,22,0.45)"; }}
            >🏛️ Government Portal →</Link>
            <Link href="/student" className="btn-light" style={{ padding: "16px 36px", fontSize: 16, border: "2px solid rgba(37,99,235,0.2)", textDecoration: "none" }}>
              🎓 Student Portal
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────────── */}
      <footer style={{ background: "#060c18", padding: "60px 40px 36px", borderTop: "1px solid rgba(255,255,255,0.06)", color: "white" }}>
        <div style={{ maxWidth: 1150, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 40, marginBottom: 52, flexWrap: "wrap" }} className="footer-grid">
            {/* Brand */}
            <div style={{ maxWidth: 320 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: ORANGE, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 19, color: "white" }}>S</div>
                <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 800 }}>SkillX</span>
              </div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.8, marginBottom: 20 }}>
                Maharashtra&apos;s sovereign Labour Market Intelligence Platform. Built for the state&apos;s 1.2 lakh vocational trainees and 36 district governments.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["DVET", "MSSDS", "NCVET", "Skill India", "MIDC"].map(b => (
                  <span key={b} style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", padding: "3px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)" }}>{b}</span>
                ))}
              </div>
            </div>

            {/* Links */}
            <div style={{ display: "flex", gap: 56 }}>
              {[
                { heading: "Platform", links: [{ name: "Student Portal", href: "/student" }, { name: "Govt. Login", href: "/login" }, { name: "District Plans", href: "/district-plan/Pune" }] },
                { heading: "Resources", links: [{ name: "How It Works", href: "#platform" }, { name: "Engines", href: "#engines" }, { name: "Portals", href: "#portals" }] },
              ].map(col => (
                <div key={col.heading}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 18 }}>{col.heading}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {col.links.map(link => (
                      <Link key={link.name} href={link.href} style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", textDecoration: "none", transition: "color 0.2s" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "white")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}>
                        {link.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA block */}
            <div style={{ background: "rgba(249,115,22,0.10)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 16, padding: "24px 28px", maxWidth: 240 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "white", marginBottom: 8 }}>Try the Live Demo</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 16, lineHeight: 1.6 }}>No login needed for the student portal. See SkillX in action right now.</div>
              <Link href="/student" className="btn-light" style={{ display: "block", padding: "10px 20px", fontSize: 13, border: "1px solid rgba(37,99,235,0.2)", textDecoration: "none" }}>
                Open Student Portal →
              </Link>
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>© 2026 SkillX · Department of Skills, Employment & Innovation · Government of Maharashtra</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>SIH 2026 · PS 134 · Built for Maharashtra&apos;s skilled workforce</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
