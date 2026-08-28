"use client";
import React, { forwardRef } from "react";
import Link from "next/link";
import { EnterDashboardButton } from "./Navbar";
import { Landmark, Cpu, Target, Briefcase } from "lucide-react";

export const Hero = forwardRef<HTMLDivElement, {}>((props, ref) => {
  return (
    <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: 130, paddingBottom: 60 }}>
      {/* Subtle Background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background: "linear-gradient(180deg, #fffdfa 0%, #fff8f0 35%, #f0fdfa 75%, #ffffff 100%)",
        }}
      >
        <div style={{
          position: "absolute", top: "10%", left: "5%", width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(249,115,22,0.12) 0%, rgba(249,115,22,0) 70%)", filter: "blur(40px)",
        }} />
      </div>

      <div ref={ref} className="hero-grid" style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        {/* Left Side: Text Content */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 18px", borderRadius: 999,
            background: "#fff7ed", border: "1px solid rgba(249,115,22,0.3)",
            fontSize: 13, fontWeight: 800, color: "#ea580c",
            marginBottom: 28, boxShadow: "0 2px 10px rgba(249,115,22,0.1)"
          }}>
            <span>⭐</span> Building Maharashtra&apos;s Future-Ready Workforce
          </div>

          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(38px, 5vw, 64px)",
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            marginBottom: 20,
          }}>
            <span style={{ color: "#f97316", display: "block" }}>
              Where Maharashtra’s Skills
            </span>
            <span style={{ color: "#0f172a" }}>
              Meet Industry Demand
            </span>
          </h1>

          <p style={{ fontSize: "clamp(16px, 1.8vw, 19px)", color: "#475569", lineHeight: 1.7, marginBottom: 36, maxWidth: 540 }}>
            Real government data. Four intelligent engines. One mission — building a future-ready workforce for the jobs of tomorrow.
          </p>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 40 }}>
            <EnterDashboardButton
              label="Enter Admin Dashboard →"
              className="btn-dark"
              style={{ padding: "16px 36px", fontSize: 16 }}
            />
            <Link href="/student" className="btn-light" style={{ padding: "15px 32px", fontSize: 16 }}>
              Student Portal
            </Link>
          </div>
          
          {/* Trusted Government Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: "#475569" }}>
            <span style={{ color: "#16a34a" }}>🛡️</span> Trusted by Government. Built for Maharashtra.
          </div>
        </div>

        {/* Right Side: Visual/Map Component */}
        <div style={{ position: "relative", height: "100%", minHeight: 500, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "url('/images/maharashtra_hero_bg.png')",
              backgroundSize: "contain",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              opacity: 0.9,
              filter: "drop-shadow(0 12px 32px rgba(0,0,0,0.15))",
            }}
          />
        </div>
      </div>

      {/* Feature Cards below the fold */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "60px auto 0", padding: "0 40px" }}>
        <div className="features-grid">
          {[
            { icon: <Landmark />, title: "Real Government Data", desc: "Policy-aligned insights", color: "#f97316", bg: "#fff7ed", border: "#ffedd5" },
            { icon: <Cpu />, title: "4 Intelligent Engines", desc: "Data-driven skilling", color: "#0891b2", bg: "#ecfeff", border: "#cffafe" },
            { icon: <Target />, title: "One Mission", desc: "Future-ready workforce", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
            { icon: <Briefcase />, title: "Jobs of Tomorrow", desc: "Industry-aligned skills", color: "#16a34a", bg: "#f0fdf4", border: "#dcfce7" },
          ].map((card, i) => (
            <div key={i} style={{
              background: "white", borderRadius: 16, padding: "18px 16px",
              border: `1px solid ${card.border}`,
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              display: "flex", alignItems: "center", gap: 12, textAlign: "left"
            }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: card.bg, color: card.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {card.icon}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", lineHeight: 1.3 }}>{card.title}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{card.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

Hero.displayName = "Hero";
