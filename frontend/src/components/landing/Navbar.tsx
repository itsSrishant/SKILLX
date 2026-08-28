"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Cpu, Workflow, ClipboardList } from "lucide-react";

export function EnterDashboardButton({ className, style, label }: { className?: string; style?: React.CSSProperties; label: string }) {
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
          <span>Entering...</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}

export function Navbar({ scrolled }: { scrolled: boolean }) {
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        background: scrolled ? "rgba(255,255,255,0.95)" : "rgba(255,253,250,0.88)",
        backdropFilter: "blur(16px)",
        boxShadow: scrolled ? "0 2px 10px rgba(0,0,0,0.06)" : "none",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 72, position: "relative" }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12, zIndex: 2 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 20, color: "white",
            boxShadow: "0 4px 14px rgba(249,115,22,0.35)"
          }}>
            S
          </div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
            SkillX
          </span>
        </Link>

        <nav className="nav-links" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", zIndex: 1 }}>
          {[
            { name: "Platform", href: "#platform", icon: <Building2 size={16} /> },
            { name: "Engines", href: "#engines", icon: <Cpu size={16} /> },
            { name: "Workflow", href: "#workflow", icon: <Workflow size={16} /> },
            { name: "Batch Manager", href: "#batch", icon: <ClipboardList size={16} /> },
          ].map((item) => (
            <a
              key={item.name}
              href={item.href}
              style={{
                padding: "6px 16px",
                fontSize: 13,
                color: "#475569",
                textDecoration: "none",
                fontWeight: 600,
                borderRadius: 999,
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.color = "#ea580c";
                (e.currentTarget as HTMLAnchorElement).style.background = "#fff7ed";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.color = "#475569";
                (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
              }}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </a>
          ))}
        </nav>

        <div style={{ display: "flex", gap: 12, alignItems: "center", zIndex: 2 }}>
          <Link href="/student" className="btn-light" style={{ padding: "8px 20px", fontSize: 13 }}>
            Student Portal
          </Link>
          <EnterDashboardButton
            label="Enter Dashboard →"
            className="btn-dark"
            style={{ padding: "9px 22px", fontSize: 13 }}
          />
        </div>
      </div>
    </header>
  );
}
