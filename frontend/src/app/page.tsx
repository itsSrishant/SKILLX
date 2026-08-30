"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import Lenis from "lenis";

import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { PartnerLogos } from "@/components/landing/PartnerLogos";

import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

// ── Reusable Instant Navigation Button with Prefetch & 0ms Loading Feedback ──
function EnterDashboardButton({ className, style, label }: { className?: string; style?: React.CSSProperties; label: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const targetRoute = user ? "/dashboard" : "/login";
  const displayLabel = user ? "Enter Dashboard →" : "Admin Login →";

  useEffect(() => {
    router.prefetch(targetRoute);
  }, [router, targetRoute]);

  return (
    <button
      onClick={() => {
        setLoading(true);
        router.push(targetRoute);
      }}
      className={`btn-dark ${className || ""}`}
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
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
      }}
    >
      {loading ? (
        <>
          <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span>
          <span>Entering Dashboard...</span>
        </>
      ) : (
        <span>{displayLabel}</span>
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
    title: "Automated Course Ingestion",
    description: "SHA-256 change detection automatically ingests all 85 DVET ITI Trades and 1,200+ MSSDS entries. Historical course records are marked inactive but never deleted for complete auditability.",
    tag: "Source Ingestion",
    color: "#f97316",
    bg: "#fff7ed",
  },
  {
    engine: "ENGINE 02",
    title: "Automated Market Scanning",
    description: "Regularly monitors NCS.gov.in and industrial job postings across Maharashtra's 36 districts and MIDC hubs in Pune, Nashik, Thane, Nagpur, and Chhatrapati Sambhajinagar.",
    tag: "Demand Crawler",
    color: "#0891b2",
    bg: "#ecfeff",
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
    color: "#16a34a",
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

// ── HIGH-RESOLUTION GENUINE MAHARASHTRA HERITAGE & INFRASTRUCTURE BACKDROP ──
function HighVisibilityLandmarkBackground() {
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
            #fffdfa 0%,
            #fff8f0 35%,
            #f0fdfa 75%,
            #ffffff 100%
          )
        `,
      }}
    >
      {/* High-Resolution Generated Artwork Image */}
      <div
        style={{
          position: "absolute",
          top: 72,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url('/images/maharashtra_hero_bg.png')`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
          opacity: 0.88,
          filter: "drop-shadow(0 12px 32px rgba(0,0,0,0.06))",
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0) 100%)",
        }}
      />

      {/* Atmospheric Radial Orbs */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "5%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(249,115,22,0.18) 0%, rgba(249,115,22,0) 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "20%",
          right: "5%",
          width: 550,
          height: 550,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(8,145,178,0.18) 0%, rgba(8,145,178,0) 70%)",
          filter: "blur(40px)",
        }}
      />
    </div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const enginesGridRef = useRef<HTMLDivElement>(null);
  const workflowGridRef = useRef<HTMLDivElement>(null);
  const batchCardRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Initialize Lenis Momentum Smooth Scrolling & GSAP Animations
  useEffect(() => {
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

    // GSAP Hero Entrance Animation
    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current.children,
        { opacity: 0, y: 36 },
        {
          opacity: 1,
          y: 0,
          duration: 1.0,
          stagger: 0.12,
          ease: "power3.out",
        }
      );
    }

    // Intersection Observers for GSAP Scroll Animations
    const enginesObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && enginesGridRef.current) {
        gsap.fromTo(
          enginesGridRef.current.children,
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: "power2.out" }
        );
        enginesObserver.disconnect();
      }
    }, { threshold: 0.2 });

    if (enginesGridRef.current) enginesObserver.observe(enginesGridRef.current);

    const workflowObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && workflowGridRef.current) {
        gsap.fromTo(
          workflowGridRef.current.children,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.2, ease: "power2.out" }
        );
        workflowObserver.disconnect();
      }
    }, { threshold: 0.2 });

    if (workflowGridRef.current) workflowObserver.observe(workflowGridRef.current);

    const batchObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (batchCardRef.current) {
          gsap.fromTo(batchCardRef.current, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.8, ease: "power2.out" });
        }
        if (progressBarRef.current) {
          gsap.fromTo(progressBarRef.current, { width: "0%" }, { width: "9.14%", duration: 1.5, ease: "power3.out", delay: 0.3 });
        }
        batchObserver.disconnect();
      }
    }, { threshold: 0.2 });

    if (batchCardRef.current) batchObserver.observe(batchCardRef.current);

    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => {
      lenis.destroy();
      window.removeEventListener("scroll", onScroll);
      enginesObserver.disconnect();
      workflowObserver.disconnect();
      batchObserver.disconnect();
    };
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#ffffff", color: "#0f172a", overflowX: "hidden", minHeight: "100vh" }}>
      <style jsx global>{`
        .btn-dark {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 28px; borderRadius: 999px; border: none; cursor: pointer;
          font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 800;
          color: white !important;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          box-shadow: 0 6px 20px rgba(249,115,22,0.4), inset 0 1px 0 rgba(255,255,255,0.3);
          transition: all 0.25s cubic-bezier(0.2,0,0,1);
          text-decoration: none;
        }
        .btn-dark:hover {
          transform: translateY(-3px) scale(1.03);
          box-shadow: 0 14px 34px rgba(249,115,22,0.55), inset 0 1px 0 rgba(255,255,255,0.4);
        }
        .btn-dark:active {
          transform: translateY(1px) scale(0.97);
        }
        .btn-light {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 11px 24px; borderRadius: 999px; cursor: pointer;
          font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700;
          color: #0891b2 !important;
          background: #ecfeff;
          border: 2px solid #0891b2;
          box-shadow: 0 4px 14px rgba(8,145,178,0.12);
          transition: all 0.25s cubic-bezier(0.2,0,0,1);
          text-decoration: none;
        }
        .btn-light:hover {
          background: #0891b2;
          color: #ffffff !important;
          transform: translateY(-3px) scale(1.03);
          box-shadow: 0 12px 28px rgba(8,145,178,0.35);
        }
        .btn-light:active {
          transform: translateY(1px) scale(0.97);
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        .hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          align-items: center;
        }
        
        .features-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .nav-links {
          display: flex;
          gap: 6px;
          align-items: center;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(249,115,22,0.18);
          border-radius: 999px;
          padding: 5px 10px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }

        @media (max-width: 1024px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .hero-grid {
            grid-template-columns: 1fr;
            text-align: center;
          }
          .hero-grid > div:first-child {
            align-items: center !important;
            text-align: center !important;
          }
          .features-grid {
            grid-template-columns: 1fr;
          }
          .nav-links {
            display: none !important;
          }
        }
      `}</style>

      
      <Navbar scrolled={scrolled} />
      <Hero ref={heroRef} />
      <PartnerLogos />
{/* ── KILLER NARRATIVE STRIP: The Full Story ──────────────────────────── */}
      <section id="platform" style={{ padding: "100px 40px", background: "linear-gradient(180deg, #0b1329 0%, #0f172a 100%)", color: "white", position: "relative", overflow: "hidden" }}>
        {/* Subtle Ambient Glow Orbs */}
        <div style={{ position: "absolute", top: "10%", left: "10%", width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)", filter: "blur(60px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)", filter: "blur(60px)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 16px", borderRadius: 999, background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)", fontSize: 12, fontWeight: 800, color: "#f97316", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
              <span>⚡</span> THE FULL STORY · HOW SKILLX WORKS
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(32px, 4.5vw, 48px)", fontWeight: 800, color: "#FFFFFF", marginBottom: 16, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              From <span style={{ color: "#f97316" }}>Industry Demand</span> to{" "}
              <span style={{ background: "linear-gradient(135deg, #38bdf8, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Government Action</span>
            </h2>
            <p style={{ fontSize: 18, color: "#CBD5E1", maxWidth: 660, margin: "0 auto", lineHeight: 1.7 }}>
              One continuous intelligence loop that connects employer hiring needs with vocational ITI syllabi — and automates targeted district intervention plans.
            </p>
          </div>

          {/* 6-Step Pipeline Grid with Translucent Glass Cards & Thin Glowing Pipeline Line */}
          <div style={{ position: "relative", marginBottom: 72 }}>
            {/* Glowing Horizontal Pipeline Connector Line behind Glass Cards */}
            <div
              style={{
                position: "absolute",
                top: 44,
                left: "8%",
                right: "8%",
                height: 3,
                background: "linear-gradient(90deg, #f97316 0%, #38bdf8 20%, #a855f7 40%, #f87171 60%, #4ade80 80%, #22d3ee 100%)",
                boxShadow: "0 0 14px rgba(56, 189, 248, 0.7)",
                borderRadius: 999,
                zIndex: 0,
              }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14, position: "relative", zIndex: 1 }}>
              {[
                { icon: "🏭", step: "STEP 01", title: "Industry Demand", sub: "3,000+ job listings analyzed across NCS & MIDC", color: "#f97316", border: "rgba(249,115,22,0.3)" },
                { icon: "🔍", step: "STEP 02", label: "Job Scanning", title: "Job Scanning", sub: "Engine 2 extracts required skill terms in real time", color: "#38bdf8", border: "rgba(56,189,248,0.3)" },
                { icon: "🧠", step: "STEP 03", label: "Skill Extraction", title: "Skill Extraction", sub: "Engine 3 maps 500+ synonyms to NSQF taxonomy", color: "#a855f7", border: "rgba(168,85,247,0.3)" },
                { icon: "📊", step: "STEP 04", label: "Gap Analysis", title: "Gap Analysis", sub: "Engine 4 scores 547 syllabi against live demand", color: "#f87171", border: "rgba(248,113,113,0.3)" },
                { icon: "📋", step: "STEP 05", label: "Bridge Plans", title: "Bridge Plans", sub: "Engine 5 generates 20-hr training interventions", color: "#4ade80", border: "rgba(74,222,128,0.3)" },
                { icon: "⚡", step: "STEP 06", label: "Govt Action", title: "Govt Action", sub: "Collector approves budget & deploys in 30 days", color: "#22d3ee", border: "rgba(34,211,238,0.3)" },
              ].map((item, i) => (
                <div key={i} style={{ position: "relative" }}>
                  {/* Glowing Arrow Sitting Directly on Pipeline Connector */}
                  {i < 5 && (
                    <div
                      style={{
                        position: "absolute",
                        right: -10,
                        top: 32,
                        zIndex: 3,
                        fontSize: 14,
                        color: item.color,
                        fontWeight: 900,
                        textShadow: `0 0 10px ${item.color}`,
                      }}
                    >
                      ➔
                    </div>
                  )}

                  {/* Translucent Navy/White Glass Card */}
                  <div
                    style={{
                      background: "rgba(30, 41, 59, 0.75)",
                      backdropFilter: "blur(14px)",
                      WebkitBackdropFilter: "blur(14px)",
                      border: `1px solid ${item.border}`,
                      borderRadius: 18,
                      padding: "24px 14px 20px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      cursor: "pointer",
                      height: "100%",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
                      (e.currentTarget as HTMLDivElement).style.borderColor = item.color;
                      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 32px ${item.color}33`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.transform = "none";
                      (e.currentTarget as HTMLDivElement).style.borderColor = item.border;
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
                    }}
                  >
                    {/* Icon Badge */}
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        background: `${item.color}18`,
                        border: `1.5px solid ${item.color}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        marginBottom: 14,
                        boxShadow: `0 4px 14px ${item.color}25`,
                      }}
                    >
                      {item.icon}
                    </div>

                    {/* Step Tag */}
                    <div style={{ fontSize: 10, fontWeight: 800, color: item.color, letterSpacing: "0.12em", marginBottom: 6 }}>
                      {item.step}
                    </div>

                    {/* Title (Crisp White) */}
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#FFFFFF", marginBottom: 6, lineHeight: 1.3 }}>
                      {item.title}
                    </div>

                    {/* Subtitle (Bright Slate #CBD5E1) */}
                    <div style={{ fontSize: 12, color: "#CBD5E1", lineHeight: 1.5, fontWeight: 500 }}>
                      {item.sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* High-Impact Bottom Metrics Cards (Dominant Numbers + Crisp Text) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 24,
              padding: "36px 32px",
              borderRadius: 24,
              background: "rgba(30, 41, 59, 0.55)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.3)",
            }}
          >
            {[
              {
                stat: "47%",
                color: "#f97316",
                glow: "rgba(249,115,22,0.35)",
                title: "Skill Mismatch Rate",
                desc: "Nearly half of ITI graduates lack skills employers demand in Maharashtra's fastest-growing sectors.",
              },
              {
                stat: "₹2,400 Cr",
                color: "#f87171",
                glow: "rgba(248,113,113,0.35)",
                title: "Annual Income Loss",
                desc: "Estimated annual productivity loss due to curriculum gaps across 1.2 lakh vocational trainees.",
              },
              {
                stat: "20 Days",
                color: "#38bdf8",
                glow: "rgba(56,189,248,0.35)",
                title: "To Full District Plan",
                desc: "From data ingestion to a complete, printable government intervention plan — zero manual effort.",
              },
            ].map((metric, i) => (
              <div key={i} style={{ padding: "8px 16px" }}>
                {/* Dominant Number */}
                <div
                  style={{
                    fontSize: "clamp(38px, 3.8vw, 48px)",
                    fontWeight: 900,
                    color: metric.color,
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                    marginBottom: 10,
                    textShadow: `0 4px 20px ${metric.glow}`,
                  }}
                >
                  {metric.stat}
                </div>

                {/* Title (Crisp White) */}
                <div style={{ fontSize: 16, fontWeight: 800, color: "#FFFFFF", marginBottom: 6, letterSpacing: "-0.01em" }}>
                  {metric.title}
                </div>

                {/* Description (Bright Slate #CBD5E1) */}
                <div style={{ fontSize: 13, color: "#CBD5E1", lineHeight: 1.6, fontWeight: 400 }}>
                  {metric.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ENGINES SHOWCASE ────────────────────────────────────────────── */}
      <section id="engines" ref={enginesGridRef} style={{ padding: "100px 40px", background: "#ffffff" }}>
        <div style={{ maxWidth: 1150, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em", color: "#f97316", textTransform: "uppercase" }}>
              Architecture &amp; Core Pipeline
            </span>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(32px, 4vw, 46px)", fontWeight: 600, letterSpacing: "-0.02em", color: "#0f172a", lineHeight: 1.2, marginTop: 12, marginBottom: 16 }}>
              Four Zero-API Engines
            </h2>
            <p style={{ fontSize: 17, color: "#64748b", maxWidth: 580, margin: "0 auto", lineHeight: 1.7 }}>
              Operating independently to ingest, analyze, normalize, and score Maharashtra&apos;s workforce data in real time.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                padding: "36px", borderRadius: 20,
                background: "white",
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                transition: "all 0.3s cubic-bezier(0.2,0,0,1)",
                cursor: "pointer",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-6px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 18px 44px rgba(249,115,22,0.12)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.04)"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: f.color, letterSpacing: "0.1em" }}>{f.engine}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: f.bg, color: f.color }}>{f.tag}</span>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 10, fontFamily: "'Playfair Display', serif" }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7 }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WORKFLOW TIMELINE ───────────────────────────────────────────── */}
      <section id="workflow" ref={workflowGridRef} style={{ padding: "90px 40px", background: "#f8fafc" }}>
        <div style={{ maxWidth: 1150, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em", color: "#0891b2", textTransform: "uppercase" }}>
              Simplified Execution
            </span>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(30px, 4vw, 42px)", fontWeight: 700, color: "#0f172a", marginTop: 10 }}>
              Three Steps to District Alignment
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ background: "white", padding: "32px", borderRadius: 20, border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#0891b2", opacity: 0.8, marginBottom: 14 }}>{s.num}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BATCH MANAGER CONSOLE CARD (Restored with GSAP Parallax Reveal) ── */}
      <section id="batch" style={{ padding: "100px 40px", background: "#ffffff" }}>
        <div style={{ maxWidth: 1150, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em", color: "#ea580c", textTransform: "uppercase", display: "inline-block", marginBottom: 14 }}>Scalable Engine Execution</span>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(30px, 3.8vw, 42px)", fontWeight: 700, color: "#0f172a", marginTop: 10, marginBottom: 18, lineHeight: 1.25 }}>
              Analyse 500+ Courses<br />50 at a Time
            </h2>
            <p style={{ fontSize: 16, color: "#475569", lineHeight: 1.8, marginBottom: 28 }}>
              The Admin Dashboard tracks the precise number of unanalysed courses in Maharashtra&apos;s catalogue. Officers trigger 50-course analysis batches on demand with zero latency bottlenecks.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                "⚡  Batch processing completes 50 courses in under 200ms",
                "📋  Tracks 497 remaining course entries across 36 districts",
                "📥  Instant PDF download for District Skill Deficit Reports",
                "🔄  Auto-saves offset state for seamless multi-session usage",
              ].map((item) => (
                <div key={item} style={{ fontSize: 15, color: "#475569", display: "flex", alignItems: "center", gap: 10, fontWeight: 600 }}>
                  {item}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 32 }}>
              <EnterDashboardButton label="Open Admin Dashboard →" className="btn-dark" style={{ padding: "14px 32px" }} />
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
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Batch Analysis Progress</span>
                  <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>50 / 547</span>
                </div>
                <div style={{ height: 10, background: "#f0f0f0", borderRadius: 5, overflow: "hidden" }}>
                  <div ref={progressBarRef} style={{ width: "0%", height: "100%", background: "linear-gradient(135deg, #f97316, #ea580c)", borderRadius: 5 }} />
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>497 courses remaining in catalogue</div>
              </div>

              {[
                { course: "Electrician Trade (DVET)", score: 85.7, status: "ALIGNED", color: "#16a34a" },
                { course: "Fitter Trade (DVET)", score: 72.3, status: "MODERATE", color: "#d97706" },
                { course: "Solar Technician (MSSDS)", score: 20.3, status: "DEFICIT", color: "#dc2626" },
                { course: "EV Technician (MSSDS)", score: 34.1, status: "DEFICIT", color: "#dc2626" },
              ].map((row) => (
                <div key={row.course} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                  <span style={{ fontSize: 14, color: "#0f172a", fontWeight: 600 }}>{row.course}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{row.score}%</span>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: `${row.color}14`, color: row.color }}>{row.status}</span>
                  </div>
                </div>
              ))}

              <EnterDashboardButton label="⚡ Run Next 50-Course Batch →" className="btn-dark" style={{ marginTop: 24, width: "100%", padding: "14px", borderRadius: 12 }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── EXPANDED GOVERNMENT FOOTER ───────────────────────────────────────── */}
      <footer style={{ background: "#0f172a", padding: "56px 40px 36px", borderTop: "1px solid rgba(255,255,255,0.08)", color: "white" }}>
        <div style={{ maxWidth: 1150, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 40, marginBottom: 44 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 18, color: "white" }}>S</div>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800, color: "white" }}>SkillX</span>
              </div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", maxWidth: 320, lineHeight: 1.75 }}>
                Maharashtra&apos;s Sovereign Labour Market Intelligence Platform.<br />
                SIH 2026 — Government of Maharashtra.
              </p>
            </div>

            <div style={{ display: "flex", gap: 64 }}>
              {[
                {
                  heading: "Platform", links: [
                    { name: "Admin Login", href: "/login" },
                    { name: "Student Portal", href: "/student" },
                    { name: "District Skill Plans", href: "/district-plan/Pune" },
                  ]
                },
                {
                  heading: "Engine Pipeline", links: [
                    { name: "Ingestion Engine", href: "#engines" },
                    { name: "Demand Crawler", href: "#engines" },
                    { name: "Local NLP Taxonomy", href: "#engines" },
                    { name: "Gap Analytics", href: "#engines" },
                  ]
                },
              ].map((col) => (
                <div key={col.heading}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 16 }}>{col.heading}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {col.links.map((link) => (
                      <Link key={link.name} href={link.href} style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", textDecoration: "none", transition: "color 0.2s" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "white")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
                      >{link.name}</Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>© 2026 SkillX · Department of Skills, Employment &amp; Innovation · Government of Maharashtra</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Built for India&apos;s skilled workforce · PS 26134</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
