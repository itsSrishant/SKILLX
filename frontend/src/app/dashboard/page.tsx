"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LangProvider, useLang } from "@/lib/i18n";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" &&
   (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.port === "3000")
    ? "http://localhost:8000"
    : "");

// ── Soothing UI Palette (Soft Warm Amber + Low-Intensity Cyan Touches) ─────────
const C = {
  orange:      "#f97316", // Softer warm amber-orange
  orangeLight: "#fff7ed",
  orangeMid:   "#ffedd5",
  sky:         "#0284c7",
  skyLight:    "#f0f9ff",
  skyMid:      "#bae6fd",
  cyan:        "#0891b2", // Low-intensity soothing cyan
  cyanLight:   "#ecfeff", // Soothing ice-cyan tint
  cyanMid:     "#cffafe",
  green:       "#16a34a",
  greenLight:  "#f0fdf4",
  purple:      "#7c3aed",
  purpleLight: "#f5f3ff",
  red:         "#dc2626",
  redLight:    "#fef2f2",
  bg:          "#fafcfd", // Soft ice-tinted background
  sidebar:     "#ffffff",
  card:        "#ffffff",
  border:      "rgba(0,0,0,0.06)",
  text:        "#0f172a",
  textSub:     "#475569",
  textMuted:   "#94a3b8",
};

const PAGE_SIZE = 50;

// ── Types ──────────────────────────────────────────────────────────────────────
interface GapRecord {
  id: number; course_id: number; course_title: string; institute_type: string;
  sector: string; district: string; alignment_score: number;
  core_skill_coverage_pct: number; emerging_skill_coverage_pct: number;
  fully_covered_count?: number; partially_covered_count?: number; missing_count?: number;
  fully_covered_skills: string[]; partially_covered_skills: string[];
  missing_skills: string[]; demand_frequency_map?: Record<string, string>;
  top_skill_gaps: { skill: string; category: string; demand_pct: number; job_count: number; employer_count: number; severity: string }[];
}
interface DistrictSummary {
  district: string; active_courses: number; relevant_jobs: number;
  avg_alignment_score: number; top_missing_skills: string[]; deficit_status: string;
}
interface SkillDictData {
  standard_dictionary_count: number;
  dictionary: { id: number; standard_name: string; category: string; synonyms: string[] }[];
  candidate_unknown_skills: { skill_name: string; category: string; confidence_score: number; source_type: string }[];
}
interface BridgePack {
  missing_skill: string; module_title: string; skill_targeted: string;
  duration_hours: number; nsqf_level: number; activities: string[];
  assessment_criteria: string[]; tools_required: string[];
}
interface BridgePackResponse {
  course_id: number; course_title: string; district: string;
  alignment_score: number; missing_skills_count: number;
  bridge_pack_modules_count: number; total_bridge_pack_hours: number;
  generated_by: string; latency_ms: number; bridge_packs: BridgePack[];
  executive_summary?: Record<string, string>;
}
interface TopDeficit {
  skill: string; category: string; total_job_occurrences: number;
  unique_employer_count: number; demand_pct: number;
}

// ── Goal Circle Loader (Smooth Progress Transition) ────────────────────────────
function GoalCircleLoader({ text }: { text?: string }) {
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => (prev >= 94 ? 94 : prev + Math.floor(Math.random() * 14 + 10)));
    }, 110);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "64px 20px", minHeight: 320, width: "100%", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
    }}>
      <style jsx>{`
        @keyframes spinGrad {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      {/* Glowing Goal Circle Ring */}
      <div style={{ position: "relative", width: 84, height: 84, marginBottom: 20 }}>
        <div style={{
          position: "absolute", inset: -4, borderRadius: "50%",
          background: `conic-gradient(from 0deg, ${C.cyan}, ${C.orange}, ${C.purple}, ${C.cyan})`,
          animation: "spinGrad 1.6s linear infinite",
          filter: "blur(3px)", opacity: 0.85
        }} />
        <div style={{
          position: "absolute", inset: 2, borderRadius: "50%", background: "white",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: C.cyan, fontFamily: "'Inter', sans-serif" }}>
            {progress}%
          </span>
        </div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 4, letterSpacing: "-0.01em" }}>
        {text || "Syncing SkillX Admin Console..."}
      </div>
      <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>
        Calibrating 36 MIDC Districts & 547 Syllabi Records
      </div>
    </div>
  );
}

// ── Streamlined Sidebar ────────────────────────────────────────────────────────
function Sidebar({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  const { t } = useLang();
  const navItems = [
    { id: "overview",   label: t.navOverview,  icon: "📊" },
    { id: "courses",    label: t.navCourses,   icon: "📋" },
    { id: "districts",  label: t.navDistricts, icon: "🏢" },
  ];

  return (
    <aside style={{
      width: 240, minHeight: "100vh", background: "#ffffff",
      borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column",
      position: "fixed", top: 0, left: 0, zIndex: 100,
    }}>
      <div style={{ padding: "24px 20px 20px", borderBottom: `1px solid ${C.border}` }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: `linear-gradient(135deg, ${C.orange} 0%, #ea580c 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 19, color: "white",
            boxShadow: `0 4px 14px rgba(249,115,22,0.25)`,
          }}>S</div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: C.text }}>
              {t.appName}
            </div>
            <div style={{ fontSize: 10, color: C.cyan, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Admin Console
            </div>
          </div>
        </Link>
      </div>

      <nav style={{ flex: 1, padding: "20px 12px" }}>
        {navItems.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => {
                onSelect(item.id);
                const el = document.getElementById(item.id);
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              style={{
                position: "relative",
                display: "flex", alignItems: "center", gap: 12,
                width: "100%", padding: "11px 14px", borderRadius: 10, border: "none",
                background: isActive ? C.cyanLight : "transparent",
                color: isActive ? C.cyan : "#475569",
                fontWeight: isActive ? 700 : 500, fontSize: 14, cursor: "pointer",
                marginBottom: 6, transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)", textAlign: "left",
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc";
                  (e.currentTarget as HTMLButtonElement).style.color = "#0f172a";
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "#475569";
                }
              }}
            >
              <span style={{ fontSize: 15, opacity: isActive ? 1 : 0.75 }}>{item.icon}</span>
              <span>{item.label}</span>
              {isActive && (
                <div style={{
                  position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
                  width: 3, height: 20, borderRadius: "2px 0 0 2px", background: C.cyan,
                }} />
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 11, color: C.textMuted }}>SkillX v2.0</div>
        <Link href="/" style={{ fontSize: 12, color: C.cyan, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, transition: "color 0.2s" }}>
          <span>←</span> Landing Page
        </Link>
      </div>
    </aside>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, icon, color, colorLight }: {
  label: string; value: string | number; sub?: string; icon: string;
  color: string; colorLight: string;
}) {
  return (
    <div style={{
      background: C.card, borderRadius: 16, padding: "20px 22px",
      border: `1px solid ${C.border}`, borderTop: `3px solid ${color}`,
      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
      transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
    }}
      onMouseEnter={e => {
        const d = e.currentTarget as HTMLDivElement;
        d.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)";
        d.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        const d = e.currentTarget as HTMLDivElement;
        d.style.boxShadow = "0 1px 3px rgba(0,0,0,0.03)";
        d.style.transform = "none";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: colorLight, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20,
        }}>{icon}</div>
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.textSub }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Score Chip ────────────────────────────────────────────────────────────────
function ScoreChip({ score }: { score: number }) {
  const color = score >= 75 ? C.green : score >= 50 ? "#d97706" : C.red;
  const bg    = score >= 75 ? C.greenLight : score >= 50 ? "#fffbeb" : C.redLight;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700,
      background: bg, color, border: `1px solid ${color}20`,
    }}>{Math.round(score)} / 100</span>
  );
}

// ── Bridge Pack Modal ─────────────────────────────────────────────────────────
function BridgePackModal({ data, onClose }: { data: BridgePackResponse; onClose: () => void }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const mod = data.bridge_packs[activeIdx];
  const exec = data.executive_summary;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)" }}>
      <div style={{ background: "white", borderRadius: 24, maxWidth: 720, width: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}>
        {/* Header */}
        <div style={{ padding: "22px 28px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: C.cyan, textTransform: "uppercase", marginBottom: 6 }}>
              20-Hour Skill Bridge Pack · {data.generated_by === "llm-gemini" ? "🤖 AI Generated" : "📋 Rule-Based"}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{data.course_title}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ padding: "3px 10px", borderRadius: 999, background: C.cyanLight, color: C.cyan, fontSize: 12, fontWeight: 600 }}>📍 {data.district}</span>
              <span style={{ padding: "3px 10px", borderRadius: 999, background: C.redLight, color: C.red, fontSize: 12, fontWeight: 600 }}>⚠ {data.missing_skills_count} Missing Skills</span>
              <span style={{ padding: "3px 10px", borderRadius: 999, background: C.skyLight, color: C.sky, fontSize: 12, fontWeight: 600 }}>⏱ {data.total_bridge_pack_hours}h Total</span>
            </div>
          </div>
          <button onClick={onClose} style={{ fontSize: 24, border: "none", background: "none", cursor: "pointer", color: C.textMuted, padding: "4px 8px" }}>×</button>
        </div>

        {/* Executive Summary strip */}
        {exec && (
          <div style={{ padding: "12px 28px", background: C.bg, borderBottom: `1px solid ${C.border}`, display: "flex", gap: 24, flexWrap: "wrap" }}>
            {exec.graduate_salary_lift && (
              <div style={{ fontSize: 12, color: C.text }}>
                💰 <strong>Salary Lift:</strong> {exec.graduate_salary_lift}
              </div>
            )}
            {exec.placement_lift && (
              <div style={{ fontSize: 12, color: C.text }}>
                📈 <strong>Employability:</strong> {exec.placement_lift}
              </div>
            )}
            {exec.cost_per_batch && (
              <div style={{ fontSize: 12, color: C.text }}>
                🏗 <strong>Batch Cost:</strong> {exec.cost_per_batch}
              </div>
            )}
            {exec.district_rank && (
              <div style={{ fontSize: 12, color: C.text }}>
                🏆 <strong>District Rank:</strong> {exec.district_rank}
              </div>
            )}
          </div>
        )}

        {/* Module tabs */}
        {data.bridge_packs.length > 1 && (
          <div style={{ padding: "12px 28px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 8, overflowX: "auto" }}>
            {data.bridge_packs.map((m, i) => (
              <button key={i} onClick={() => setActiveIdx(i)} style={{
                padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                background: activeIdx === i ? C.cyan : C.bg, color: activeIdx === i ? "white" : C.textSub,
                transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)"
              }}>{m.skill_targeted.slice(0, 26)}</button>
            ))}
          </div>
        )}

        {/* Body */}
        {mod && (
          <div style={{ flex: 1, overflowY: "auto", padding: "22px 28px" }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 6 }}>{mod.module_title}</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              <span style={{ padding: "3px 10px", borderRadius: 999, background: C.cyanLight, color: C.cyan, fontSize: 11, fontWeight: 700 }}>🎯 {mod.skill_targeted}</span>
              <span style={{ padding: "3px 10px", borderRadius: 999, background: C.skyLight, color: C.sky, fontSize: 11, fontWeight: 700 }}>⏱ {mod.duration_hours}h</span>
              <span style={{ padding: "3px 10px", borderRadius: 999, background: C.bg, color: C.textSub, fontSize: 11, fontWeight: 700 }}>NSQF {mod.nsqf_level}</span>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: C.cyan, textTransform: "uppercase", marginBottom: 10 }}>Sessions & Activities</div>
              {mod.activities.map((act, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "12px", marginBottom: 8, background: C.bg, borderRadius: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.cyanLight, border: `2px solid ${C.cyanMid}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: C.cyan, flexShrink: 0 }}>{i + 1}</div>
                  <p style={{ fontSize: 13, color: C.textSub, lineHeight: 1.65, margin: 0 }}>{act}</p>
                </div>
              ))}
            </div>

            {mod.assessment_criteria?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: C.green, textTransform: "uppercase", marginBottom: 10 }}>Assessment Criteria</div>
                {mod.assessment_criteria.map((c, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "10px 12px", marginBottom: 6, background: C.greenLight, borderRadius: 10, fontSize: 13, color: C.textSub }}>
                    <span style={{ color: C.green, flexShrink: 0 }}>✓</span> {c}
                  </div>
                ))}
              </div>
            )}

            {mod.tools_required?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: C.sky, textTransform: "uppercase", marginBottom: 10 }}>Tools Required</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {mod.tools_required.map((t) => (
                    <span key={t} style={{ padding: "5px 12px", borderRadius: 999, background: C.skyLight, color: C.sky, fontSize: 12, fontWeight: 600, border: `1px solid ${C.skyMid}` }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ padding: "16px 28px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: C.textMuted }}>
            {data.generated_by === "llm-gemini" ? "🤖 Generated by Gemini AI" : "📋 Rule-based fallback"} · {data.latency_ms}ms
          </span>
          <button onClick={onClose} style={{ padding: "10px 24px", borderRadius: 10, background: C.cyan, color: "white", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer", transition: "all 0.2s" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
function DashboardInner() {
  const { lang, setLang, t } = useLang();
  const [activeNav, setActiveNav] = useState("overview");
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [gaps, setGaps] = useState<GapRecord[]>([]);
  const [districts, setDistricts] = useState<DistrictSummary[]>([]);
  const [skillDict, setSkillDict] = useState<SkillDictData | null>(null);
  const [engineRunning, setEngineRunning] = useState(false);
  const [engineResult, setEngineResult] = useState<Record<string, unknown> | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "ITI" | "MSSDS">("ALL");
  const [showSkillDict, setShowSkillDict] = useState(false);
  const [bridgePackData, setBridgePackData] = useState<BridgePackResponse | null>(null);
  const [batchToast, setBatchToast] = useState<string | null>(null);
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [navigatingId, setNavigatingId] = useState<number | null>(null);
  const [isNavigatingHome, setIsNavigatingHome] = useState(false);

// Module-level in-memory cache for instant client-side navigation (No QuotaExceededError)
let dashMemoryCache: { m: any; g: any; d: any; s: any; ts: number } | null = null;

  const fetchAll = useCallback(async () => {
    // 1. Check in-memory cache for instant 0ms rendering
    let hasCache = false;
    if (dashMemoryCache && dashMemoryCache.m && dashMemoryCache.g) {
      setMetrics(dashMemoryCache.m);
      setGaps(dashMemoryCache.g);
      setDistricts(dashMemoryCache.d || []);
      setSkillDict(dashMemoryCache.s || null);
      setMetricsLoading(false); // Instant 0ms load!
      hasCache = true;
    }

    if (!hasCache) {
      setMetricsLoading(true);
    }

    // 2. Revalidate from backend in background
    try {
      const [m, g, d, s] = await Promise.all([
        fetch(`${API}/api/v1/metrics/overview`).then(r => r.json()),
        fetch(`${API}/api/v1/analytics/gap-analysis`).then(r => r.json()),
        fetch(`${API}/api/v1/analytics/district-summary`).then(r => r.json()),
        fetch(`${API}/api/v1/skills/dictionary`).then(r => r.json()),
      ]);
      setMetrics(m);
      setGaps(Array.isArray(g) ? g : []);
      setDistricts(Array.isArray(d) ? d : []);
      setSkillDict(s);
      
      dashMemoryCache = { m, g, d, s, ts: Date.now() };
    } catch (e) { console.error(e); }
    finally { setMetricsLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Scroll-spy with proper offset calculation
  useEffect(() => {
    const sectionIds = ["overview", "courses", "districts"];
    const handleScroll = () => {
      const scrollY = window.scrollY + 120;
      let current = "overview";
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollY) current = id;
      }
      setActiveNav(current);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const runEngines = async () => {
    setEngineRunning(true);
    const startTime = performance.now();
    try {
      const r = await fetch(`${API}/api/v1/engines/run-all`, { method: "POST" });
      const data = await r.json();
      setEngineResult(data);
      await fetchAll();
      const e1 = (data.engine1 || {}) as Record<string, number>;
      const changes = (e1.courses_added || 0) + (e1.courses_updated || 0);
      if (changes > 0) {
        setBatchToast(`⚡ Pipeline Sync Complete! Ingested & Analyzed ${changes} new/updated courses in ${data.total_latency_ms || Math.round(performance.now() - startTime)}ms!`);
      } else {
        setBatchToast(`✓ System Is Up To Date — All ${(data.engine4 as Record<string,number>)?.analyses_created || "547"} Courses Fully Synchronized!`);
      }
      setTimeout(() => setBatchToast(null), 6000);
    } catch (e) { console.error(e); }
    finally { setEngineRunning(false); }
  };

  // Extended search with memoization for 60fps instant UI
  const filteredGaps = useMemo(() => {
    return gaps.filter(g => {
      if (search) {
        const q = search.toLowerCase();
        const matchTitle   = g.course_title.toLowerCase().includes(q);
        const matchSector  = (g.sector || "").toLowerCase().includes(q);
        const matchDistrict = (g.district || "").toLowerCase().includes(q);
        const matchSkills  = (g.missing_skills || []).some(s => s.toLowerCase().includes(q));
        if (!matchTitle && !matchSector && !matchDistrict && !matchSkills) return false;
      }
      if (filterType !== "ALL" && g.institute_type !== filterType) return false;
      if (selectedDistrict && g.district !== selectedDistrict) return false;
      return true;
    });
  }, [gaps, search, filterType, selectedDistrict]);

  // Pagination memoized
  const totalPages = useMemo(() => Math.ceil(filteredGaps.length / PAGE_SIZE), [filteredGaps.length]);
  const pagedGaps = useMemo(() => {
    return filteredGaps.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filteredGaps, currentPage]);

  // Reset to page 1 when filter changes
  useEffect(() => { setCurrentPage(1); }, [search, filterType, selectedDistrict]);

  const totalCourses = (metrics as Record<string, number>)?.total_courses ?? 0;
  const totalJobs = (metrics as Record<string, number>)?.total_relevant_jobs ?? 0;
  const avgScore = (metrics as Record<string, number>)?.avg_alignment_score_percentage ?? 0;
  const deficitDistricts = (metrics as Record<string, number>)?.high_deficit_districts_count ?? 0;

  return (
    <div style={{ display: "flex", background: C.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <Sidebar active={activeNav} onSelect={setActiveNav} />

      <main style={{ marginLeft: 240, flex: 1, padding: "28px 32px", overflowX: "hidden" }}>

        {/* ── Overview Section ───────────────────────────────────────────── */}
        <div id="overview">
          {/* Top bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <button
                  onClick={() => {
                    setIsNavigatingHome(true);
                    router.push("/");
                  }}
                  disabled={isNavigatingHome}
                  style={{
                    padding: "4px 10px", borderRadius: 8, border: `1px solid ${C.border}`,
                    background: "white", color: C.textSub, fontSize: 12, fontWeight: 600,
                    cursor: isNavigatingHome ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 4,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.03)", transition: "all 0.2s"
                  }}
                >
                  {isNavigatingHome ? (
                    <>
                      <span style={{ fontSize: 11, animation: "spin 1s linear infinite" }}>⏳</span>
                      <span>Returning Home...</span>
                    </>
                  ) : (
                    <>
                      <span>←</span> Landing Page
                    </>
                  )}
                </button>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.text, fontFamily: "'Playfair Display', serif" }}>
                {t.adminPortal}
              </div>
              <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>
                {t.appSubtitle} · Real-Time · {districts.length} Districts
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {/* Skill Dictionary redirect button in top header */}
              <button
                id="top-skill-dict-btn"
                onClick={() => setShowSkillDict(true)}
                style={{
                  padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.cyanMid}`,
                  background: C.cyanLight, color: C.cyan, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                  transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = C.cyanMid}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = C.cyanLight}
              >
                <span>📖</span>
                <span>{t.skillDictionary}</span>
              </button>

              {/* Language selector */}
              <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                <select
                  id="language-selector"
                  value={lang}
                  onChange={e => setLang(e.target.value as "en" | "mr" | "hi")}
                  style={{
                    appearance: "none", WebkitAppearance: "none",
                    padding: "8px 32px 8px 14px", borderRadius: 10,
                    border: `1px solid ${C.border}`, background: "white",
                    fontSize: 13, fontWeight: 600, color: C.text, cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)", outline: "none",
                    transition: "all 0.2s"
                  }}
                >
                  <option value="en">English</option>
                  <option value="mr">मराठी</option>
                  <option value="hi">हिंदी</option>
                </select>
                <span style={{ position: "absolute", right: 12, pointerEvents: "none", fontSize: 10, color: C.textMuted }}>▼</span>
              </div>

              {/* Run all engines button */}
              <button id="run-all-btn" onClick={runEngines} disabled={engineRunning} style={{
                padding: "9px 20px", borderRadius: 10, border: "none",
                background: `linear-gradient(135deg, ${C.orange} 0%, #ea580c 100%)`,
                color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer",
                boxShadow: `0 4px 16px rgba(249,115,22,0.25)`,
                opacity: engineRunning ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8,
                transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)"
              }}>
                {engineRunning ? <>⚡ Running Engines 1–4...</> : <>⚡ {t.runEngines}</>}
              </button>
            </div>
          </div>

          {/* Toast */}
          {batchToast && (
            <div style={{
              background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
              color: "white", borderRadius: 12, padding: "14px 20px", marginBottom: 20,
              fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between",
              boxShadow: "0 4px 18px rgba(22,163,74,0.2)",
              transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)"
            }}>
              <span>{batchToast}</span>
              <button onClick={() => setBatchToast(null)} style={{ background: "none", border: "none", color: "white", fontSize: 18, cursor: "pointer", opacity: 0.8 }}>×</button>
            </div>
          )}

          {/* Engine result strip */}
          {engineResult && (
            <div style={{ background: C.greenLight, borderRadius: 12, padding: "14px 20px", marginBottom: 20, border: `1px solid rgba(34,197,94,0.2)`, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>
                ✓ Pipeline completed in {(engineResult as Record<string, number>).total_latency_ms}ms
              </span>
              {[
                { key: "engine1", field: "latency_ms", label: "E1" },
                { key: "engine2", field: "latency_ms", label: "E2" },
                { key: "engine3", field: "latency_ms", label: "E3" },
                { key: "engine4", field: "latency_ms", label: "E4" },
              ].map(({ key, field, label }) => {
                const e = (engineResult as Record<string, Record<string, unknown>>)[key];
                const val = e?.[field];
                return val != null
                  ? <span key={key} style={{ fontSize: 12, color: C.green }}>{label}: {String(val)}ms</span>
                  : null;
              })}
            </div>
          )}

          {/* KPI Cards — Soft cyan & amber accents */}
          {metricsLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ background: C.card, borderRadius: 16, padding: "20px 22px", border: `1px solid ${C.border}`, height: 110, opacity: 0.5, animation: "pulse 1.5s infinite" }} />
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
              <KPICard label="Total Courses Indexed" value={totalCourses} sub="ITI & MSSDS Syllabi" icon="📚" color={C.orange} colorLight={C.orangeLight} />
              <KPICard label="Active Job Postings" value={totalJobs} sub={`${districts.length} MIDC Districts`} icon="💼" color={C.cyan} colorLight={C.cyanLight} />
              <KPICard label="Avg Alignment Score" value={`${Math.round(avgScore)} / 100`} sub="SAI-V2 Match Index" icon="📊" color={C.purple} colorLight={C.purpleLight} />
              <KPICard label="High Deficit Districts" value={deficitDistricts} sub="Requires Upgrade" icon="⚠️" color={C.red} colorLight={C.redLight} />
            </div>
          )}
        </div>

        {/* ── Course Alignment Table ──────────────────────────────────────── */}
        <div id="courses" style={{ background: "white", borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{t.courseAlignment}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                {filteredGaps.length} of {gaps.length} courses
                {selectedDistrict ? ` · ${selectedDistrict}` : " · All Districts"}
                {" — "}Page {currentPage} of {totalPages || 1}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {/* Active District filter chip */}
              {selectedDistrict && (
                <button onClick={() => setSelectedDistrict(null)} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.cyanMid}`, background: C.cyanLight, color: C.cyan, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                  📍 {selectedDistrict} ×
                </button>
              )}

              {/* Course Type Selector Dropdown */}
              <select
                id="course-type-select"
                value={filterType}
                onChange={e => setFilterType(e.target.value as "ALL" | "ITI" | "MSSDS")}
                style={{
                  padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.border}`,
                  background: "white", fontSize: 13, fontWeight: 600, color: C.text,
                  cursor: "pointer", outline: "none", boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                  transition: "all 0.2s"
                }}
              >
                <option value="ALL">All Course Types (ITI & MSSDS)</option>
                <option value="ITI">ITI Trades Only</option>
                <option value="MSSDS">MSSDS Courses Only</option>
              </select>

              {/* Search bar */}
              <input
                id="course-search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search title, sector, district, skill…"
                style={{
                  padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.border}`,
                  fontSize: 13, color: C.text, background: C.bg, outline: "none", width: 250,
                  transition: "all 0.2s"
                }}
              />
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.cyanLight }}>
                  {["#", t.courseTitle, "Type & Sector", "Location", "Readiness Score", "Skill Status", "Action"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, color: C.cyan, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedGaps.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: "48px", textAlign: "center", color: C.textMuted, fontSize: 14 }}>
                    No courses match your filters. Run engines to populate data.
                  </td></tr>
                ) : pagedGaps.map((gap, i) => {
                  const rowNum = (currentPage - 1) * PAGE_SIZE + i + 1;
                  const fullyCount  = gap.fully_covered_count ?? (gap.fully_covered_skills || []).length;
                  const partialCount = gap.partially_covered_count ?? (gap.partially_covered_skills || []).length;
                  const missingCount = gap.missing_count ?? (gap.missing_skills || []).length;
                  const topMissing  = (gap.missing_skills || []).slice(0, 2);

                  return (
                    <tr key={gap.id}
                      style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "white" : "#fcfdfe", transition: "background 0.2s cubic-bezier(0.4,0,0.2,1)" }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = C.cyanLight}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? "white" : "#fcfdfe"}
                    >
                      {/* Row number */}
                      <td style={{ padding: "12px 16px", fontSize: 11, color: C.textMuted, fontWeight: 700 }}>
                        {rowNum}
                      </td>

                      {/* Title & Code */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{gap.course_title}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>ID #{gap.course_id}</div>
                      </td>

                      {/* Type & Sector */}
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 999,
                          background: gap.institute_type === "ITI" ? C.skyLight : C.purpleLight,
                          color: gap.institute_type === "ITI" ? C.sky : C.purple,
                          border: `1px solid ${gap.institute_type === "ITI" ? C.skyMid : "#e9d5ff"}`,
                        }}>{gap.institute_type}</span>
                        <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}>{gap.sector}</div>
                      </td>

                      {/* District */}
                      <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: C.text }}>
                        <button
                          onClick={() => setSelectedDistrict(gap.district === selectedDistrict ? null : gap.district)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: C.text, padding: 0, fontSize: 13, fontWeight: 600, transition: "color 0.2s" }}
                          title="Filter by this district"
                        >
                          📍 {gap.district}
                        </button>
                      </td>

                      {/* Score */}
                      <td style={{ padding: "12px 16px" }}><ScoreChip score={gap.alignment_score} /></td>

                      {/* Skill Status */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          {fullyCount > 0 && (
                            <div style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>
                              ✓ {fullyCount} Mastered
                            </div>
                          )}
                          {partialCount > 0 && (
                            <div style={{ fontSize: 11, color: "#d97706", fontWeight: 700 }}>
                              ◐ {partialCount} Partial
                            </div>
                          )}
                          {missingCount > 0 ? (
                            <div style={{ fontSize: 11, color: C.red, fontWeight: 700 }}>
                              ✕ {topMissing.join(", ")}{missingCount > 2 ? ` (+${missingCount - 2})` : ""}
                            </div>
                          ) : (
                            <div style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>🌟 100% Aligned</div>
                          )}
                        </div>
                      </td>

                      {/* Clean Single Action Link (Removed Preview button) */}
                      <td style={{ padding: "12px 16px" }}>
                        {missingCount > 0 ? (
                          <button
                            onClick={() => {
                              setNavigatingId(gap.course_id);
                              router.push(`/bridge-pack/${gap.course_id}`);
                            }}
                            disabled={navigatingId === gap.course_id}
                            style={{
                              padding: "8px 16px", borderRadius: 8, border: "none",
                              background: navigatingId === gap.course_id ? "#475569" : `linear-gradient(135deg, ${C.orange}, #ea580c)`,
                              color: "white", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6,
                              fontSize: 12, fontWeight: 700, cursor: navigatingId === gap.course_id ? "wait" : "pointer", whiteSpace: "nowrap",
                              boxShadow: `0 2px 8px rgba(249,115,22,0.2)`,
                              transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                              opacity: navigatingId === gap.course_id ? 0.85 : 1
                            }}
                          >
                            {navigatingId === gap.course_id ? (
                              <>
                                <span style={{ fontSize: 11, animation: "spin 1s linear infinite" }}>⏳</span>
                                <span>Opening Plan...</span>
                              </>
                            ) : (
                              <span>⚡ Upgrade Plan ↗</span>
                            )}
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>✓ No Action</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Centrally Aligned Page Selector */}
          {totalPages > 1 && (
            <div style={{
              padding: "20px 24px", borderTop: `1px solid ${C.border}`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 12, width: "100%", background: C.bg
            }}>
              <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredGaps.length)} of {filteredGaps.length} courses
              </span>
              <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  id="prev-page"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: "7px 16px", borderRadius: 8, border: `1px solid ${C.border}`,
                    background: "white", cursor: "pointer", fontSize: 13, fontWeight: 600,
                    opacity: currentPage === 1 ? 0.4 : 1, transition: "all 0.2s"
                  }}
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    id={`page-${p}`}
                    onClick={() => setCurrentPage(p)}
                    style={{
                      padding: "7px 13px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700,
                      background: currentPage === p ? C.cyan : "white",
                      color: currentPage === p ? "white" : C.textSub,
                      border: currentPage === p ? "none" : `1px solid ${C.border}`,
                      transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)"
                    }}
                  >
                    {p}
                  </button>
                ))}
                {totalPages > 8 && <span style={{ padding: "6px 6px", color: C.textMuted, fontSize: 13 }}>… {totalPages}</span>}
                <button
                  id="next-page"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: "7px 16px", borderRadius: 8, border: `1px solid ${C.border}`,
                    background: "white", cursor: "pointer", fontSize: 13, fontWeight: 600,
                    opacity: currentPage === totalPages ? 0.4 : 1, transition: "all 0.2s"
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── District Analytics & Dropdown Selector ─────────────────────── */}
        <div id="districts" style={{ marginBottom: 24 }}>
          {/* Header Card with District Selector Dropdown (Replaced Bar Graph) */}
          <div style={{ background: "white", borderRadius: 16, padding: "24px", border: `1px solid ${C.border}`, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>District Labour Market Alignment</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                  Select a Maharashtra District to view detailed ITI & MSSDS alignment indicators across all 36 districts
                </div>
              </div>

              {/* Dedicated District Selector Dropdown */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label htmlFor="district-dropdown-select" style={{ fontSize: 13, fontWeight: 700, color: C.cyan }}>
                  Filter District:
                </label>
                <select
                  id="district-dropdown-select"
                  value={selectedDistrict || ""}
                  onChange={e => setSelectedDistrict(e.target.value || null)}
                  style={{
                    padding: "9px 16px", borderRadius: 10, border: `1px solid ${C.cyanMid}`,
                    background: C.cyanLight, fontSize: 13, fontWeight: 700, color: C.cyan,
                    cursor: "pointer", outline: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                    transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)"
                  }}
                >
                  <option value="">All 36 Districts (State-Wide View)</option>
                  {districts.map(d => (
                    <option key={d.district} value={d.district}>
                      📍 {d.district} ({d.active_courses} Courses · Score: {Math.round(d.avg_alignment_score)}/100)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* District table + Donut chart */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
            {/* Donut — course type split */}
            <div style={{ background: "white", borderRadius: 16, padding: "24px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>Course Type Split</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>ITI vs MSSDS catalogue</div>
              <div style={{ height: 210 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[
                      { name: `ITI (${(metrics as Record<string,number>)?.iti_courses_count ?? 0})`, value: (metrics as Record<string, number>)?.iti_courses_count ?? 0 },
                      { name: `MSSDS (${(metrics as Record<string,number>)?.mssds_courses_count ?? 0})`, value: (metrics as Record<string, number>)?.mssds_courses_count ?? 0 }
                    ]} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                      <Cell fill={C.orange} />
                      <Cell fill={C.cyan} />
                    </Pie>
                    <Legend formatter={v => <span style={{ fontSize: 12, color: C.textSub }}>{v}</span>} />
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 13 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* District summary table */}
            <div style={{ background: "white", borderRadius: 16, padding: "24px", border: `1px solid ${C.border}`, overflowY: "auto", maxHeight: 340 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>
                District Overview ({districts.length} districts)
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["District", "Courses", "Jobs", "Score", "Status"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {districts.map(d => (
                    <tr key={d.district}
                      style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer", transition: "background 0.2s" }}
                      onClick={() => setSelectedDistrict(d.district === selectedDistrict ? null : d.district)}
                    >
                      <td style={{ padding: "10px", fontSize: 13, fontWeight: 600, color: selectedDistrict === d.district ? C.cyan : C.text }}>
                        {selectedDistrict === d.district ? "▶ " : ""}{d.district}
                      </td>
                      <td style={{ padding: "10px", fontSize: 13, color: C.textSub }}>{d.active_courses}</td>
                      <td style={{ padding: "10px", fontSize: 13, color: C.textSub }}>{d.relevant_jobs}</td>
                      <td style={{ padding: "10px" }}><ScoreChip score={d.avg_alignment_score} /></td>
                      <td style={{ padding: "10px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                          background: d.deficit_status === "ALIGNED" ? C.greenLight : d.deficit_status === "MODERATE" ? "#fffbeb" : C.redLight,
                          color: d.deficit_status === "ALIGNED" ? C.green : d.deficit_status === "MODERATE" ? "#f59e0b" : C.red,
                        }}>{d.deficit_status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Live Data Status Banner ─────────────────────────────────────── */}
        <div style={{ background: C.cyanLight, borderRadius: 16, padding: "20px 24px", border: `1px solid ${C.cyanMid}`, display: "flex", alignItems: "center", gap: 16, marginBottom: 24, transition: "all 0.3s" }}>
          <span style={{ fontSize: 24 }}>⚡</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.cyan }}>
              Real-Time DVET & MSSDS Ingestion Engine Active
            </div>
            <div style={{ fontSize: 12, color: C.textSub }}>
              SHA-256 content hashing enabled · Zero API cost · {totalCourses} courses & {totalJobs} active jobs across {districts.length} districts
              {(engineResult as Record<string,number>)?.total_latency_ms
                ? ` · Last run: ${(engineResult as Record<string,number>).total_latency_ms}ms`
                : ""}
            </div>
          </div>
        </div>

      </main>

      {/* Modals */}
      {bridgePackData && <BridgePackModal data={bridgePackData} onClose={() => setBridgePackData(null)} />}
      {showSkillDict && skillDict && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)" }}>
          <div style={{ background: "white", borderRadius: 24, maxWidth: 660, width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>Skill Dictionary</div>
                <div style={{ fontSize: 12, color: C.cyan, marginTop: 2 }}>{skillDict.standard_dictionary_count} canonical skills · {skillDict.candidate_unknown_skills.length} unknown candidates</div>
              </div>
              <button id="close-skill-dict" onClick={() => setShowSkillDict(false)} style={{ fontSize: 24, border: "none", background: "none", cursor: "pointer", color: C.textMuted }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
              {skillDict.dictionary.map(item => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{item.standard_name}</div>
                    {item.synonyms?.length > 0 && (
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3, maxWidth: 420 }}>
                        {item.synonyms.slice(0, 5).join(", ")}{item.synonyms.length > 5 ? ` +${item.synonyms.length - 5} more` : ""}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: C.cyanLight, color: C.cyan, border: `1px solid ${C.cyanMid}`, whiteSpace: "nowrap", marginLeft: 12 }}>
                    {item.category}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end" }}>
              <button id="close-skill-dict-footer" onClick={() => setShowSkillDict(false)} style={{ padding: "9px 20px", borderRadius: 10, background: C.cyan, color: "white", fontWeight: 700, border: "none", cursor: "pointer" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return <LangProvider><DashboardInner /></LangProvider>;
}
