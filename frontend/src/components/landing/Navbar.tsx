"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Cpu, Workflow, ClipboardList } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

export function EnterDashboardButton({ className, style, label }: { className?: string; style?: React.CSSProperties; label: string }) {
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
        <span>{displayLabel}</span>
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
        background: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
        borderBottom: scrolled ? "1px solid rgba(0, 0, 0, 0.06)" : "1px solid transparent",
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

        <nav className="nav-links" style={{
          position: "absolute",
          left: "45%",
          transform: "translateX(-50%)",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 8px",
          borderRadius: 999,
          border: "1px solid rgba(249,115,22,0.2)",
          background: "rgba(255, 255, 255, 0.85)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.02)"
        }}>
          {[
            { name: "Platform", href: "#platform", icon: <Building2 size={16} /> },
            { name: "Engines", href: "#engines", icon: <Cpu size={16} /> },
            { name: "Workflow", href: "#workflow", icon: <Workflow size={16} /> },
            { name: "Batch Manager", href: "#batch", icon: <ClipboardList size={16} /> },
          ].map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="nav-link-item"
            >
              {item.icon}
              <span>{item.name}</span>
            </a>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 2 }}>
          <Link href="/student" className="btn-light" style={{ padding: "10px 22px", fontSize: 14 }}>
            Student Portal
          </Link>
          <EnterDashboardButton
            label="Enter Dashboard →"
            className="btn-dark"
            style={{ padding: "10px 22px", fontSize: 14 }}
          />
        </div>
      </div>
    </header>
  );
}
