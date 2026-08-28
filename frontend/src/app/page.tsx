"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import Lenis from "lenis";

// ── Reusable Instant Navigation Button with Prefetch & 0ms Loading Feedback ──
function EnterDashboardButton({ className, style, label }: { className?: string; style?: React.CSSProperties; label: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  return (
    <button
      onClick={() => {
        setLoading(true);
        router.push("/dashboard");
      }}
      className={className}
      disabled={loading}
      style={{
        ...style,
        border: "none",
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.85 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
      }}
    >
      {loading ? (
        <>
          <span style={{ display: "inline-block", animation: "pulse 1s infinite" }}>⏳</span>
          <span>Entering Dashboard...</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}

const PARTNER_LOGOS = [
  { name: "DVET Maharashtra", short: "DVET" },
  { name: "MSSDS", short: "MSSDS" },
  { name: "National Career Service", short: "NCS" },
  { name: "Skill India", short: "Skill India" },
  { name: "MSEDCL", short: "MSEDCL" },
  { name: "Ministry of Skill Development", short: "MoSDE" },
  { name: "NSDC", short: "NSDC" },
  { name: "Mahindra & Mahindra", short: "Mahindra" },
  { name: "Tata Motors", short: "Tata" },
  { name: "Bajaj Auto", short: "Bajaj" },
  { name: "Bharat Forge", short: "Bharat Forge" },
  { name: "MIDC Maharashtra", short: "MIDC" },
];

const FEATURES = [
  {
    engine: "ENGINE 01",
    title: "Real-Time Course Ingestion",
    description: "SHA-256 change detection automatically ingests all 85 DVET ITI Trades and 1,200+ MSSDS entries. Historical course records are marked inactive but never deleted for complete auditability.",
    tag: "Source Ingestion",
    color: "#f97316",
    bg: "#fff7ed",
  },
  {
    engine: "ENGINE 02",
    title: "Live Job Market Scanning",
    description: "Continuously monitors NCS.gov.in and industrial job postings across Maharashtra's 36 districts and MIDC hubs in Pune, Nashik, Thane, Nagpur, and Chhatrapati Sambhajinagar.",
    tag: "Demand Crawler",
    color: "#2563eb",
    bg: "#eff6ff",
  },
  {
    engine: "ENGINE 03",
    title: "Central Skill Dictionary",
    description: "6-category NSQF-aligned skill taxonomy with synonym normalization and confidence-scored unknown skill flagging — operates locally with zero external API dependencies.",
    tag: "Local NLP",
    color: "#7c3aed",
    bg: "#f5f3ff",
  },
  {
    engine: "ENGINE 04",
    title: "3-Tier Gap Analysis Matrix",
    description: "Classifies curriculum coverage into Fully Covered, Partially Covered, and Missing Deficits. Computes a demand-weighted alignment score to empower government decision-making.",
    tag: "Policy Analytics",
    color: "#15803d",
    bg: "#f0fdf4",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Select District & Batch",
    desc: "Government officer selects a Maharashtra district and triggers a 50-course analysis batch from the central catalogue.",
  },
  {
    num: "02",
    title: "Engines Execute Live",
    desc: "Four zero-API engines ingest, normalize, match and evaluate all 50 courses against active employer demand in under 200ms.",
  },
  {
    num: "03",
    title: "Deploy Skill Bridge Packs",
    desc: "Export district deficit reports, generate targeted 20-hour Skill Bridge Pack PDFs, and align training budgets with industry demand.",
  },
];

// ── INTENSE IMPERIAL INDIAN JAALI LATTICE SVG PATTERN + VIVID TRI-GRADIENT ──
function RoyalTajMahalJaaliBackground() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
        background: `
          linear-gradient(
            180deg,
            rgba(30, 58, 138, 0.42) 0%,
            rgba(186, 230, 253, 0.65) 18%,
            #ffffff 48%,
            #ffedd5 80%,
            rgba(249, 115, 22, 0.45) 100%
          )
        `,
      }}
    >
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Imperial Indian Geometric Starburst Jaali Pattern (Fine-Tuned Intensity) */}
          <pattern id="strikingJaaliPattern" width="70" height="70" patternUnits="userSpaceOnUse">
            {/* Outer Diamond Lattice */}
            <path d="M 35 0 L 70 35 L 35 70 L 0 35 Z" fill="none" stroke="rgba(30,32,51,0.075)" strokeWidth="1" />
            {/* Inner Octagonal Arch Starburst */}
            <path d="M 35 12 L 51 19 L 58 35 L 51 51 L 35 58 L 19 51 L 12 35 L 19 19 Z" fill="none" stroke="rgba(249,115,22,0.085)" strokeWidth="0.9" />
            {/* Central Floral Rosette Circle */}
            <circle cx="35" cy="35" r="6" fill="none" stroke="rgba(30,32,51,0.065)" strokeWidth="0.8" />
            {/* Corner Filigree Crosses */}
            <path d="M 0 0 L 15 15 M 70 0 L 55 15 M 70 70 L 55 55 M 0 70 L 15 55" stroke="rgba(30,32,51,0.055)" strokeWidth="0.8" />
          </pattern>
          {/* Vivid Ambient Radial Glows */}
          <radialGradient id="heroTopBlueGlow" cx="50%" cy="10%" r="60%">
            <stop offset="0%" stopColor="rgba(37,99,235,0.40)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <radialGradient id="heroOrangeGlow" cx="50%" cy="85%" r="65%">
            <stop offset="0%" stopColor="rgba(249,115,22,0.45)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#strikingJaaliPattern)" />
        <rect width="100%" height="100%" fill="url(#heroTopBlueGlow)" />
        <rect width="100%" height="100%" fill="url(#heroOrangeGlow)" />
      </svg>
    </div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const enginesGridRef = useRef<HTMLDivElement>(null);
  const workflowGridRef = useRef<HTMLDivElement>(null);
  const batchCardRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Initialize Lenis Smooth Scroll & GSAP Scroll Animations
  useEffect(() => {
    // Lenis Momentum Smooth Scrolling
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // 1. GSAP Hero Section Entrance Animation
    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current.children,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          stagger: 0.15,
          ease: "power3.out",
        }
      );
    }

    // 2. GSAP Hero Stats Pop-in Animation
    if (statsRef.current) {
      gsap.fromTo(
        statsRef.current.children,
        { opacity: 0, scale: 0.88, y: 24 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          delay: 0.4,
          ease: "back.out(1.5)",
        }
      );
    }

    // 3. Intersection Observer for GSAP Scroll Animations on Feature Cards
    const observerOptions = { threshold: 0.15 };

    const enginesObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && enginesGridRef.current) {
        gsap.fromTo(
          enginesGridRef.current.children,
          { opacity: 0, y: 48, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.75,
            stagger: 0.12,
            ease: "power3.out",
          }
        );
        enginesObserver.disconnect();
      }
    }, observerOptions);

    if (enginesGridRef.current) enginesObserver.observe(enginesGridRef.current);

    // 4. Intersection Observer for Workflow Cards
    const workflowObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && workflowGridRef.current) {
        gsap.fromTo(
          workflowGridRef.current.children,
          { opacity: 0, x: -30, y: 30 },
          {
            opacity: 1,
            x: 0,
            y: 0,
            duration: 0.8,
            stagger: 0.18,
            ease: "power3.out",
          }
        );
        workflowObserver.disconnect();
      }
    }, observerOptions);

    if (workflowGridRef.current) workflowObserver.observe(workflowGridRef.current);

    // 5. Intersection Observer for Batch Console Card + Progress Bar Fill Animation
    const batchObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (batchCardRef.current) {
          gsap.fromTo(
            batchCardRef.current,
            { opacity: 0, y: 50, scale: 0.94 },
            { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: "power3.out" }
          );
        }
        if (progressBarRef.current) {
          gsap.fromTo(
            progressBarRef.current,
            { width: "0%" },
            { width: "9.1%", duration: 1.4, delay: 0.3, ease: "power2.out" }
          );
        }
        batchObserver.disconnect();
      }
    }, observerOptions);

    if (batchCardRef.current) batchObserver.observe(batchCardRef.current);

    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      lenis.destroy();
      enginesObserver.disconnect();
      workflowObserver.disconnect();
      batchObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#ffffff", color: "#1e2033", overflowX: "hidden" }}>

      {/* ── NAV (Transparent at start, translucent white on scroll) ─────── */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          transition: "background 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease",
          background: scrolled ? "rgba(255,255,255,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          boxShadow: scrolled ? "0 1px 0 rgba(0,0,0,0.06)" : "none",
          borderBottom: scrolled ? "1px solid rgba(0,0,0,0.06)" : "none",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
          {/* Logo */}
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 18, color: "white",
              boxShadow: "0 4px 14px rgba(249,115,22,0.35)"
            }}>
              S
            </div>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#1e2033", letterSpacing: "-0.02em" }}>
              SkillX
            </span>
          </Link>

          {/* Center Links */}
          <nav style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {[
              { name: "Platform", href: "#platform" },
              { name: "Engines", href: "#engines" },
              { name: "Workflow", href: "#workflow" },
              { name: "Batch Manager", href: "#batch" },
            ].map((item) => (
              <a
                key={item.name}
                href={item.href}
                style={{
                  padding: "8px 16px",
                  fontSize: 14,
                  color: "#5a5a5a",
                  textDecoration: "none",
                  fontWeight: 500,
                  borderRadius: 8,
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#f97316")}
                onMouseLeave={e => (e.currentTarget.style.color = "#5a5a5a")}
              >
                {item.name}
              </a>
            ))}
          </nav>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link href="/student" className="btn-light" style={{ padding: "9px 20px", fontSize: 14 }}>
              Student Portal
            </Link>
            <EnterDashboardButton label="Enter Dashboard →" className="btn-dark" style={{ padding: "10px 24px", fontSize: 14 }} />
          </div>
        </div>
      </header>

      {/* ── CENTERED HERO SECTION ───────────────────────────────────────── */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", paddingTop: 130, paddingBottom: 80, textAlign: "center" }}>
        {/* Royal Taj Mahal Jaali Background */}
        <RoyalTajMahalJaaliBackground />

        <div ref={heroRef} style={{ position: "relative", zIndex: 2, maxWidth: 960, margin: "0 auto", padding: "0 24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          
          {/* H1 Headline — Clean Vector Typography (High Contrast #0F172A) */}
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "clamp(42px, 5.8vw, 70px)",
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            marginBottom: 24,
          }}>
            <span style={{
              background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              display: "inline-block",
            }}>
              Where Maharashtra’s Skills
            </span>
            <br />
            <span style={{ color: "#0f172a" }}>
              Meet Industry Demand
            </span>
          </h1>

          {/* Sub-Headline — Centered */}
          <p style={{ fontSize: "clamp(17px, 2vw, 20px)", color: "#5a5a5a", lineHeight: 1.8, marginBottom: 40, maxWidth: 720 }}>
            Real government data. Four intelligent engines. One mission — building a future-ready workforce for the jobs of tomorrow.
          </p>

          {/* Centered Gradient CTAs */}
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 60 }}>
            <EnterDashboardButton label="Enter Admin Dashboard →" className="btn-dark" style={{ padding: "16px 36px", fontSize: 16 }} />
            <Link href="/student" className="btn-light" style={{ padding: "16px 32px", fontSize: 16 }}>
              Student Portal
            </Link>
          </div>

          {/* Key Data Highlights — Centered Grid */}
          <div ref={statsRef} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, width: "100%", maxWidth: 840, paddingTop: 32, borderTop: "1px solid rgba(0,0,0,0.08)" }}>
            <div className="dash-card" style={{ background: "rgba(255,255,255,0.85)", borderRadius: 16, padding: "20px 16px", border: "1px solid rgba(249,115,22,0.15)", backdropFilter: "blur(8px)" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: "#f97316", lineHeight: 1 }}>85</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#5a5a5a", marginTop: 8 }}>DVET Trades</div>
            </div>
            <div className="dash-card" style={{ background: "rgba(255,255,255,0.85)", borderRadius: 16, padding: "20px 16px", border: "1px solid rgba(37,99,235,0.15)", backdropFilter: "blur(8px)" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: "#2563eb", lineHeight: 1 }}>1,004</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#5a5a5a", marginTop: 8 }}>Total ITIs</div>
            </div>
            <div className="dash-card" style={{ background: "rgba(255,255,255,0.85)", borderRadius: 16, padding: "20px 16px", border: "1px solid rgba(249,115,22,0.15)", backdropFilter: "blur(8px)" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: "#f97316", lineHeight: 1 }}>1,200+</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#5a5a5a", marginTop: 8 }}>MSSDS Courses</div>
            </div>
            <div className="dash-card" style={{ background: "rgba(255,255,255,0.85)", borderRadius: 16, padding: "20px 16px", border: "1px solid rgba(21,128,61,0.15)", backdropFilter: "blur(8px)" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: "#15803d", lineHeight: 1 }}>36</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#5a5a5a", marginTop: 8 }}>Districts Mapped</div>
            </div>
          </div>

        </div>
      </section>

      {/* ── PARTNER LOGO CAROUSEL ────────────────────────────────────────── */}
      <section style={{ borderTop: "1px solid rgba(0,0,0,0.06)", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#fafafa", padding: "28px 0" }}>
        <div style={{ overflow: "hidden", width: "100%" }}>
          <p style={{ textAlign: "center", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#8a8a8a", textTransform: "uppercase", marginBottom: 18 }}>
            Maharashtra Skilling Ecosystem Integrations
          </p>
          <div className="logo-track">
            {[...PARTNER_LOGOS, ...PARTNER_LOGOS].map((logo, i) => (
              <div key={i} style={{ flexShrink: 0, padding: "0 8px" }}>
                <div style={{
                  padding: "8px 20px", borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.06)",
                  background: "white",
                  fontSize: 13, fontWeight: 700, color: "#5a5a5a",
                  letterSpacing: "0.02em", whiteSpace: "nowrap",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}>
                  {logo.short}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── KILLER NARRATIVE STRIP: The Full Story ──────────────────────────── */}
      <section id="platform" style={{ padding: "80px 40px", background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)", color: "white" }}>
        <div style={{ maxWidth: 1150, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.2em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 12 }}>THE FULL STORY · HOW SKILLX WORKS</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px,4vw,42px)", fontWeight: 700, marginBottom: 12, letterSpacing: "-0.01em" }}>
              From <span style={{ color: "#f97316" }}>Industry Demand</span> to{" "}
              <span style={{ background: "linear-gradient(135deg, #0891b2, #7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Government Action</span>
            </h2>
            <p style={{ fontSize: 17, color: "#94a3b8", maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>
              One intelligence loop that connects what employers need with what ITI graduates learn — and shows you exactly where the gap is.
            </p>
          </div>

          {/* 6-Step Flow */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 0, position: "relative" }}>
            {[
              { icon: "🏭", step: "01", label: "Industry Demand", sub: "Tata, Bajaj, Bharat Forge post 3,000+ job listings on NCS & MIDC portals", color: "#f97316" },
              { icon: "🔍", step: "02", label: "Job Scanning", sub: "Engine 2 crawls every posting, extracting required skill terms in real-time", color: "#0284c7" },
              { icon: "🧠", step: "03", label: "Skill Extraction", sub: "Engine 3 normalizes 500+ skill synonyms into a canonical NSQF taxonomy", color: "#7c3aed" },
              { icon: "📊", step: "04", label: "Gap Analysis", sub: "Engine 4 compares each of 547 syllabi against live demand — score 0–100", color: "#dc2626" },
              { icon: "📋", step: "05", label: "Bridge Plans", sub: "Engine 5 auto-generates 20-hour training interventions with GeM equipment specs", color: "#16a34a" },
              { icon: "⚡", step: "06", label: "Govt. Action", sub: "District Collector sees the plan, approves budget, and deploys in 30 days", color: "#0891b2" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 8px", position: "relative" }}>
                {/* Connector arrow */}
                {i < 5 && (
                  <div style={{ position: "absolute", right: -12, top: 28, fontSize: 18, color: "#334155", zIndex: 2 }}>→</div>
                )}
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${item.color}20`, border: `2px solid ${item.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 14 }}>
                  {item.icon}
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, color: item.color, letterSpacing: "0.1em", marginBottom: 6 }}>STEP {item.step}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "white", marginBottom: 6, textAlign: "center", lineHeight: 1.3 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, textAlign: "center" }}>{item.sub}</div>
              </div>
            ))}
          </div>

          {/* The Problem Statement */}
          <div style={{ marginTop: 60, padding: "32px 40px", borderRadius: 20, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 32 }}>
            <div>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#f97316", marginBottom: 8 }}>47%</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 4 }}>Skill Mismatch Rate</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Nearly half of ITI graduates lack skills employers demand in Maharashtra&apos;s fastest-growing sectors</div>
            </div>
            <div>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#dc2626", marginBottom: 8 }}>₹2,400 Cr</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 4 }}>Annual Income Loss</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Estimated annual productivity loss due to curriculum gaps across 1.2 lakh vocational trainees</div>
            </div>
            <div>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#0891b2", marginBottom: 8 }}>20 Days</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 4 }}>To Full District Plan</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>From data ingestion to a complete, printable government intervention plan — zero manual effort</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHO THIS IS FOR ──────────────────────────────────────────────────── */}
      <section style={{ padding: "60px 40px", background: "#f8fafc" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.2em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 10 }}>PS 26134 · WHO THIS TOOL SERVES</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px,3vw,36px)", fontWeight: 700, color: "#0f172a" }}>Built for Government Decision Makers</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
            {[
              { icon: "🏛️", role: "District Collector", org: "District Administration", use: "Review district-wide skill gap plans, approve training budgets", color: "#1e1b4b" },
              { icon: "📋", role: "DVET Commissioner", org: "Govt. of Maharashtra", use: "Monitor state-wide curriculum alignment across all 36 districts", color: "#7c3aed" },
              { icon: "📊", role: "MSSDS Officers", org: "Maharashtra SSDS", use: "Identify which MSSDS courses need urgent curriculum revision", color: "#0891b2" },
              { icon: "🏫", role: "ITI Principals", org: "Govt. ITI Institutes", use: "Download bridge pack plans and procure lab equipment via GeM", color: "#f97316" },
            ].map((user, i) => (
              <div key={i}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 28px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
                style={{ background: "white", borderRadius: 16, padding: "24px 20px", border: "1px solid rgba(0,0,0,0.07)", borderTop: `3px solid ${user.color}`, transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)", cursor: "default" }}
              >
                <div style={{ fontSize: 28, marginBottom: 12 }}>{user.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{user.role}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: user.color, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>{user.org}</div>
                <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{user.use}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CENTERED PLATFORM ENGINES SHOWCASE (GSAP Animated Grid) ─────── */}
      <section id="engines" style={{ padding: "100px 40px", background: "#ffffff" }}>

        <div style={{ maxWidth: 1150, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span className="badge-india" style={{ marginBottom: 14 }}>
              Architecture & Core Pipeline
            </span>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(32px, 4vw, 46px)", fontWeight: 600, letterSpacing: "-0.02em", color: "#1e2033", lineHeight: 1.2, marginBottom: 16 }}>
              Four Zero-API Engines
            </h2>
            <p style={{ fontSize: 17, color: "#5a5a5a", maxWidth: 580, margin: "0 auto", lineHeight: 1.7 }}>
              Operating independently to ingest, analyze, normalize, and score Maharashtra's workforce data in real time.
            </p>
          </div>

          <div ref={enginesGridRef} style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                padding: "36px", borderRadius: 20,
                background: "white",
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                transition: "all 0.3s cubic-bezier(0.2,0,0,1)",
                cursor: "pointer",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-6px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 18px 44px rgba(249,115,22,0.12)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.03)"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: f.color, letterSpacing: "0.1em" }}>{f.engine}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: f.bg, color: f.color }}>{f.tag}</span>
                </div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: "#1e2033", marginBottom: 12, lineHeight: 1.3 }}>{f.title}</h3>
                <p style={{ fontSize: 15, color: "#5a5a5a", lineHeight: 1.75 }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WORKFLOW (GSAP Animated Cards) ──────────────────────────────── */}
      <section id="workflow" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)", padding: "100px 40px", color: "white" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "#f97316", textTransform: "uppercase" }}>Workflow</span>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(32px, 4vw, 46px)", fontWeight: 600, color: "white", marginTop: 16, marginBottom: 16, lineHeight: 1.2 }}>
            From Raw Data to Policy Action<br />in Seconds
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.7)", marginBottom: 60, maxWidth: 580, margin: "0 auto 60px" }}>
            Designed for Maharashtra government decision-makers, district collectors, and ITI principals.
          </p>

          <div ref={workflowGridRef} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, textAlign: "left" }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{
                padding: "32px", borderRadius: 18,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                transition: "all 0.3s cubic-bezier(0.2,0,0,1)",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(249,115,22,0.14)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
              >
                <div style={{ fontSize: 36, fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#f97316", marginBottom: 16 }}>{step.num}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "white", marginBottom: 10 }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.75 }}>{step.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 56, display: "flex", gap: 16, justifyContent: "center" }}>
            <Link href="/dashboard" className="btn-dark" style={{ padding: "16px 34px", fontSize: 15 }}>
              Open Admin Dashboard →
            </Link>
            <Link href="/student" className="btn-light" style={{ padding: "16px 30px", fontSize: 15 }}>
              Student Portal
            </Link>
          </div>
        </div>
      </section>

      {/* ── BATCH ANALYSIS PANEL (GSAP Parallax Card & Animated Progress) ──── */}
      <section id="batch" style={{ padding: "100px 40px", background: "#ffffff" }}>
        <div style={{ maxWidth: 1150, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
          <div>
            <span className="badge-india" style={{ marginBottom: 14 }}>Scalable Engine Execution</span>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(30px, 3.8vw, 42px)", fontWeight: 600, color: "#1e2033", marginTop: 14, marginBottom: 18, lineHeight: 1.25 }}>
              Analyse 500+ Courses<br />50 at a Time
            </h2>
            <p style={{ fontSize: 16, color: "#5a5a5a", lineHeight: 1.8, marginBottom: 28 }}>
              The Admin Dashboard tracks the precise number of unanalysed courses in Maharashtra's catalogue. Officers trigger 50-course analysis batches on demand with zero latency bottlenecks.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                "⚡  Batch processing completes 50 courses in under 200ms",
                "📋  Tracks 497 remaining course entries across 36 districts",
                "📥  Instant PDF download for District Skill Deficit Reports",
                "🔄  Auto-saves offset state for seamless multi-session usage",
              ].map((item) => (
                <div key={item} style={{ fontSize: 15, color: "#5a5a5a", display: "flex", alignItems: "center", gap: 10 }}>
                  {item}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 32 }}>
              <Link href="/dashboard" className="btn-dark" style={{ padding: "14px 30px" }}>Open Dashboard →</Link>
            </div>
          </div>

          {/* Batch Console Card with GSAP Parallax Reveal */}
          <div ref={batchCardRef} style={{ background: "white", borderRadius: 20, border: "1px solid rgba(0,0,0,0.08)", overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.08)" }}>
            <div style={{ background: "#0f172a", padding: "16px 20px", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginLeft: 8 }}>Batch Engine Console — Pune District</span>
            </div>
            <div style={{ padding: "28px" }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1e2033" }}>Batch Analysis Progress</span>
                  <span style={{ fontSize: 13, color: "#8a8a8a", fontWeight: 600 }}>50 / 547</span>
                </div>
                <div style={{ height: 10, background: "#f0f0f0", borderRadius: 5, overflow: "hidden" }}>
                  <div ref={progressBarRef} style={{ width: "0%", height: "100%", background: "linear-gradient(135deg, #f97316, #ea580c)", borderRadius: 5 }} />
                </div>
                <div style={{ fontSize: 12, color: "#8a8a8a", marginTop: 8 }}>497 courses remaining in catalogue</div>
              </div>

              {[
                { course: "Electrician Trade (DVET)", score: 85.7, status: "ALIGNED", color: "#15803d" },
                { course: "Fitter Trade (DVET)", score: 72.3, status: "MODERATE", color: "#d97706" },
                { course: "Solar Technician (MSSDS)", score: 20.3, status: "DEFICIT", color: "#dc2626" },
                { course: "EV Technician (MSSDS)", score: 34.1, status: "DEFICIT", color: "#dc2626" },
              ].map((row) => (
                <div key={row.course} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                  <span style={{ fontSize: 14, color: "#1e2033", fontWeight: 500 }}>{row.course}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#1e2033" }}>{row.score}%</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: `${row.color}14`, color: row.color }}>{row.status}</span>
                  </div>
                </div>
              ))}

              <button style={{
                marginTop: 24, width: "100%", padding: "14px", borderRadius: 12,
                background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                color: "white", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer",
                boxShadow: "0 4px 16px rgba(249,115,22,0.3)",
                transition: "transform 0.2s",
              }}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(0.98)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
              >
                ⚡ Run Next 50-Course Batch →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{ background: "#0f172a", padding: "56px 40px 36px", borderTop: "1px solid rgba(255,255,255,0.08)", color: "white" }}>
        <div style={{ maxWidth: 1150, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 40, marginBottom: 44 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, color: "white" }}>S</div>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "white" }}>SkillX</span>
              </div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", maxWidth: 300, lineHeight: 1.75 }}>
                Maharashtra's Sovereign Labour Market Intelligence Platform.<br />
                SIH 2026 — Government of Maharashtra.
              </p>
            </div>

            <div style={{ display: "flex", gap: 64 }}>
              {[
                { heading: "Platform", links: ["Admin Dashboard", "Student Portal", "District Map", "Skill Dictionary"] },
                { heading: "Engine Pipeline", links: ["Ingestion Engine", "Demand Crawler", "Local NLP", "Gap Analytics"] },
              ].map((col) => (
                <div key={col.heading}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 16 }}>{col.heading}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {col.links.map((link) => (
                      <a key={link} href="#" style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", textDecoration: "none", transition: "color 0.2s" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "white")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
                      >{link}</a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>© 2026 SkillX · Government of Maharashtra · SIH 2026</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Built for India's skilled workforce</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
