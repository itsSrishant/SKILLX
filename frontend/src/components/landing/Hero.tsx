"use client";
import React, { forwardRef } from "react";
import Link from "next/link";
import { EnterDashboardButton } from "./Navbar";
import { Landmark, Cpu, Target, Briefcase } from "lucide-react";

export const Hero = forwardRef<HTMLDivElement, {}>((props, ref) => {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* 1. Hero Section */}
      <section style={{ position: "relative", width: "100%", overflow: "hidden", paddingTop: 80, backgroundColor: "#ffffff" }}>
        
        {/* Full Background Image (Controls Section Height perfectly) */}
        <img
          src="/images/new_hero_bg_clean_cropped.png"
          alt="Maharashtra Skilling Background"
          style={{ width: "100%", height: "auto", display: "block", minHeight: 600, objectFit: "cover", objectPosition: "bottom right" }}
        />

        {/* Selectable HTML Text over the clean image background */}
        <div style={{ position: "absolute", top: 80, bottom: 0, left: 0, right: 0, zIndex: 2, display: "flex", alignItems: "center" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%", padding: "0 40px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", transform: "translate(-50px, -60px)" }}>
            
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
              color: "#0f172a",
              textShadow: "0 0 16px #ffffff, 0 0 8px #ffffff, 0 0 24px #ffffff, 0 0 32px #ffffff"
            }}>
              <span style={{ color: "#f97316", display: "block", textShadow: "0 0 16px #ffffff, 0 0 8px #ffffff, 0 0 24px #ffffff, 0 0 32px #ffffff" }}>
                Where Maharashtra’s Skills
              </span>
              Meet Industry Demand
            </h1>

            <p style={{ 
              fontSize: "clamp(16px, 1.8vw, 19px)", 
              color: "#0f172a", 
              fontWeight: 600,
              lineHeight: 1.7, 
              marginBottom: 36, 
              maxWidth: 540,
              textShadow: "0 0 16px #ffffff, 0 0 8px #ffffff, 0 0 24px #ffffff, 0 0 32px #ffffff"
            }}>
              Real government data. Four intelligent engines. One mission — building a future-ready workforce for the jobs of tomorrow.
            </p>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "flex-start", marginBottom: 40, alignItems: "center" }}>
              <EnterDashboardButton
                label="Enter Admin Dashboard →"
                className="btn-dark"
                style={{ padding: "16px 36px", fontSize: 16, boxShadow: "0 8px 32px rgba(255, 122, 0, 0.45), 0 0 20px rgba(255, 255, 255, 0.8)" }}
              />
              <Link href="/student" className="btn-light" style={{ padding: "16px 36px", fontSize: 16, boxShadow: "0 8px 32px rgba(37, 99, 235, 0.25), 0 0 20px rgba(255, 255, 255, 0.8)" }}>
                Student Portal
              </Link>
            </div>
            
          </div>
        </div>
      </section>

      {/* 2. Features Section (Below the fold) */}
      <section style={{ background: "#ffffff", padding: "32px 40px 32px", width: "100%" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          
          {/* Trusted Government Badge */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <div style={{ 
              display: "inline-flex", 
              alignItems: "center", 
              gap: 10, 
              padding: "10px 24px", 
              borderRadius: 999, 
              background: "#f8fafc", 
              border: "1px solid #e2e8f0",
              fontSize: 14, 
              fontWeight: 700, 
              color: "#334155",
              boxShadow: "0 2px 10px rgba(0,0,0,0.02)"
            }}>
              <span style={{ fontSize: 16 }}>🛡️</span> Trusted by Government. Built for Maharashtra.
            </div>
          </div>

          {/* Feature Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
            marginBottom: 0
          }}>
            {[
              { icon: <Landmark size={22} />, title: "Real Government Data", desc: "Policy-aligned insights", color: "#f97316", bg: "#fff7ed", border: "#ffedd5" },
              { icon: <Cpu size={22} />, title: "4 Intelligent Engines", desc: "Data-driven skilling", color: "#0891b2", bg: "#ecfeff", border: "#cffafe" },
              { icon: <Target size={22} />, title: "One Mission", desc: "Future-ready workforce", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
              { icon: <Briefcase size={22} />, title: "Jobs of Tomorrow", desc: "Industry-aligned skills", color: "#16a34a", bg: "#f0fdf4", border: "#dcfce7" },
            ].map((card, i) => (
              <div key={i} style={{
                background: "white", borderRadius: 16, padding: "20px 24px",
                border: `1px solid ${card.border}`,
                boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                display: "flex", alignItems: "center", gap: 16, textAlign: "left"
              }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: card.bg, color: card.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {card.icon}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", lineHeight: 1.3 }}>{card.title}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{card.desc}</div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>
    </div>
  );
});

Hero.displayName = "Hero";
