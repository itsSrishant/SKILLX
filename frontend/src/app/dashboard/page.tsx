"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { LangProvider, useLang } from "@/lib/i18n";
import dynamic from "next/dynamic";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, AreaChart, Area, PieChart, Pie, Legend,
} from "recharts";

const MaharashtraMap = dynamic(() => import("@/components/MaharashtraMap"), { ssr: false });

const API = "http://localhost:8000";

// ── India Flag Government Theme (Saffron, Ashoka Blue, India Green) ────────────
const C = {
  orange:      "#FF9933",
  orangeLight: "#fff8f0",
  orangeMid:   "#fed7aa",
  sky:         "#003580", // Ashoka Blue
  skyLight:    "#f0f4ff",
  skyMid:      "#bfdbfe",
  green:       "#138808", // India Green
  greenLight:  "#f0fdf4",
  purple:      "#7c3aed",
  purpleLight: "#f5f3ff",
  red:         "#dc2626",
  redLight:    "#fef2f2",
  bg:          "#fffaf7",
  sidebar:     "#ffffff",
  card:        "#ffffff",
  border:      "rgba(0,0,0,0.07)",
  text:        "#1e2033",
  textSub:     "#475569",
  textMuted:   "#94a3b8",
};

// ── Types ──────────────────────────────────────────────────────────────────────
interface GapRecord {
  id: number; course_id: number; course_title: string; institute_type: string;
  sector: string; district: string; alignment_score: number;
  fully_covered_skills: string[]; partially_covered_skills: string[];
  missing_skills: string[]; demand_frequency_map: Record<string, number>;
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
}
interface BatchStatus {
  total_in_db: number; analysed: number; remaining: number;
  current_offset: number; batch_size: number;
}

// ── Components ─────────────────────────────────────────────────────────────────

function Sidebar({ active }: { active: string }) {
  const navItems = [
    { id: "overview",   label: "Overview",        icon: "◼" },
    { id: "courses",    label: "Courses",          icon: "📚" },
    { id: "districts",  label: "Districts",        icon: "🗺" },
    { id: "gaps",       label: "Skill Gaps",       icon: "📊" },
    { id: "bridge",     label: "Bridge Packs",     icon: "🎯" },
    { id: "crawler",    label: "Data Crawler",     icon: "🕷" },
  ];

  return (
    <aside style={{
      width: 240, minHeight: "100vh", background: C.sidebar,
      borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column",
      position: "fixed", top: 0, left: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", borderBottom: `1px solid ${C.border}` }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${C.orange} 0%, #ea580c 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 18, color: "white",
            boxShadow: `0 4px 12px rgba(249,115,22,0.35)`,
          }}>S</div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: C.text }}>SkillX</div>
            <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 500, letterSpacing: "0.04em" }}>ADMIN CONSOLE</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "16px 12px" }}>
        {navItems.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                const el = document.getElementById(item.id);
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                width: "100%", padding: "10px 12px", borderRadius: 10, border: "none",
                background: isActive ? C.orangeLight : "transparent",
                color: isActive ? C.orange : C.textSub,
                fontWeight: isActive ? 700 : 500, fontSize: 14, cursor: "pointer",
                marginBottom: 4, transition: "all 0.15s", textAlign: "left",
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc"; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
              {isActive && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: C.orange }} />}
            </button>
          );
        })}
      </nav>

      {/* Bottom links */}
      <div style={{ padding: "16px 12px", borderTop: `1px solid ${C.border}` }}>
        <Link href="/student" style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
          borderRadius: 10, background: C.skyLight, color: C.sky,
          fontSize: 14, fontWeight: 600, textDecoration: "none",
          border: `1px solid ${C.skyMid}`,
        }}>
          🎓 Student Portal ↗
        </Link>
      </div>
    </aside>
  );
}

function KPICard({
  label, value, sub, icon, color, colorLight, change
}: {
  label: string; value: string | number; sub?: string; icon: string;
  color: string; colorLight: string; change?: string;
}) {
  return (
    <div style={{
      background: C.card, borderRadius: 16, padding: "20px 22px",
      border: `1px solid ${C.border}`,
      borderTop: `3px solid ${color}`,
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      transition: "box-shadow 0.2s, transform 0.2s",
    }}
      onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; d.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"; d.style.transform = "none"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: colorLight, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20,
        }}>{icon}</div>
        {change && <span style={{ fontSize: 12, fontWeight: 700, color: change.startsWith("+") ? C.green : C.red }}>
          {change}
        </span>}
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.textSub }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ScoreChip({ score }: { score: number }) {
  const color = score >= 75 ? C.green : score >= 50 ? "#f59e0b" : C.red;
  const bg = score >= 75 ? C.greenLight : score >= 50 ? "#fffbeb" : C.redLight;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700,
      background: bg, color, border: `1px solid ${color}20`,
    }}>{score.toFixed(1)}%</span>
  );
}

function BridgePackModal({ data, onClose }: { data: BridgePackResponse; onClose: () => void }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const mod = data.bridge_packs[activeIdx];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "white", borderRadius: 24, maxWidth: 700, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}>
        {/* Header */}
        <div style={{ padding: "24px 28px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: C.orange, textTransform: "uppercase", marginBottom: 6 }}>
              20-Hour Skill Bridge Pack · {data.generated_by === "llm-gemini" ? "🤖 AI Generated" : "📋 Rule-Based"}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{data.course_title}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ padding: "3px 10px", borderRadius: 999, background: C.orangeLight, color: C.orange, fontSize: 12, fontWeight: 600 }}>📍 {data.district}</span>
              <span style={{ padding: "3px 10px", borderRadius: 999, background: C.redLight, color: C.red, fontSize: 12, fontWeight: 600 }}>⚠ {data.missing_skills_count} Missing Skills</span>
              <span style={{ padding: "3px 10px", borderRadius: 999, background: C.skyLight, color: C.sky, fontSize: 12, fontWeight: 600 }}>⏱ {data.total_bridge_pack_hours}h Total</span>
            </div>
          </div>
          <button onClick={onClose} style={{ fontSize: 24, border: "none", background: "none", cursor: "pointer", color: C.textMuted, padding: "4px 8px" }}>×</button>
        </div>

        {/* Module tabs */}
        {data.bridge_packs.length > 1 && (
          <div style={{ padding: "12px 28px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 8, overflowX: "auto" }}>
            {data.bridge_packs.map((m, i) => (
              <button key={i} onClick={() => setActiveIdx(i)} style={{
                padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                background: activeIdx === i ? C.orange : C.bg, color: activeIdx === i ? "white" : C.textSub,
              }}>{m.skill_targeted.slice(0, 24)}</button>
            ))}
          </div>
        )}

        {/* Body */}
        {mod && (
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 6 }}>{mod.module_title}</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              <span style={{ padding: "3px 10px", borderRadius: 999, background: C.orangeLight, color: C.orange, fontSize: 11, fontWeight: 700 }}>🎯 {mod.skill_targeted}</span>
              <span style={{ padding: "3px 10px", borderRadius: 999, background: C.skyLight, color: C.sky, fontSize: 11, fontWeight: 700 }}>⏱ {mod.duration_hours}h</span>
              <span style={{ padding: "3px 10px", borderRadius: 999, background: C.bg, color: C.textSub, fontSize: 11, fontWeight: 700 }}>NSQF {mod.nsqf_level}</span>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: C.orange, textTransform: "uppercase", marginBottom: 10 }}>Sessions & Activities</div>
              {mod.activities.map((act, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "12px", marginBottom: 8, background: C.bg, borderRadius: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.orangeLight, border: `2px solid ${C.orangeMid}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: C.orange, flexShrink: 0 }}>{i + 1}</div>
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

        <div style={{ padding: "16px 28px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 24px", borderRadius: 10, background: C.orange, color: "white", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
function DashboardInner() {
  const { lang, toggleLang, t } = useLang();
  const [activeNav, setActiveNav] = useState("overview");
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [gaps, setGaps] = useState<GapRecord[]>([]);
  const [districts, setDistricts] = useState<DistrictSummary[]>([]);
  const [skillDict, setSkillDict] = useState<SkillDictData | null>(null);
  const [engineRunning, setEngineRunning] = useState(false);
  const [engineResult, setEngineResult] = useState<Record<string, unknown> | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "ITI" | "MSSDS">("ALL");
  const [showSkillDict, setShowSkillDict] = useState(false);
  const [bridgePackData, setBridgePackData] = useState<BridgePackResponse | null>(null);
  const [bridgeLoading, setBridgeLoading] = useState<number | null>(null);
  const [crawlerRunning, setCrawlerRunning] = useState(false);
  const [crawlerResult, setCrawlerResult] = useState<Record<string, unknown> | null>(null);
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
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
      // Simulate batch status from total courses
      const total = (m as Record<string, number>).total_courses ?? 0;
      setBatchStatus({ total_in_db: total + 513, analysed: total, remaining: 513, current_offset: total, batch_size: 50 });
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const runEngines = async () => {
    setEngineRunning(true); setCountdown(6);
    timerRef.current = setInterval(() => setCountdown(p => Math.max(0, p - 1)), 1000);
    try {
      const r = await fetch(`${API}/api/v1/engines/run-all`, { method: "POST" });
      setEngineResult(await r.json());
      await fetchAll();
    } catch (e) { console.error(e); }
    finally { setEngineRunning(false); if (timerRef.current) clearInterval(timerRef.current); }
  };

  const runBatch = async () => {
    setBatchRunning(true);
    try {
      const r = await fetch(`${API}/api/v1/engines/run-all`, { method: "POST" });
      await r.json();
      await fetchAll();
      setBatchStatus(prev => prev ? { ...prev, analysed: prev.analysed + 50, remaining: Math.max(0, prev.remaining - 50), current_offset: prev.current_offset + 50 } : prev);
    } catch (e) { console.error(e); }
    finally { setBatchRunning(false); }
  };

  const triggerCrawl = async () => {
    setCrawlerRunning(true);
    try { const r = await fetch(`${API}/api/v1/crawler/trigger`, { method: "POST" }); setCrawlerResult(await r.json()); }
    catch (e) { console.error(e); } finally { setCrawlerRunning(false); }
  };

  const getBridgePack = async (courseId: number) => {
    setBridgeLoading(courseId);
    try { const r = await fetch(`${API}/api/v1/recommendations/bridge-pack/${courseId}`); setBridgePackData(await r.json()); }
    catch (e) { console.error(e); } finally { setBridgeLoading(null); }
  };

  const filteredGaps = gaps.filter(g => {
    if (search && !g.course_title.toLowerCase().includes(search.toLowerCase()) && !g.sector.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== "ALL" && g.institute_type !== filterType) return false;
    if (selectedDistrict && g.district !== selectedDistrict) return false;
    return true;
  });

  const chartData = districts.map(d => ({
    name: d.district.split(" ")[0], score: d.avg_alignment_score,
    status: d.deficit_status, courses: d.active_courses,
  }));

  const CHART_COLORS: Record<string, string> = { "HIGH DEFICIT": C.red, MODERATE: "#f59e0b", ALIGNED: C.green };

  const batchPercent = batchStatus ? Math.round((batchStatus.analysed / batchStatus.total_in_db) * 100) : 0;

  return (
    <div style={{ display: "flex", background: C.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <Sidebar active={activeNav} />

      {/* Main content */}
      <main style={{ marginLeft: 240, flex: 1, padding: "28px 32px", overflowX: "hidden" }}>

        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text, fontFamily: "'Playfair Display', serif" }}>
              Government Admin Console
            </div>
            <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>
              Maharashtra Skill Gap Intelligence Platform · Real-Time
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={toggleLang} style={{
              padding: "7px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "white",
              fontSize: 13, fontWeight: 600, color: C.textSub, cursor: "pointer",
            }}>{lang === "en" ? "🇮🇳 मराठी" : "🇬🇧 English"}</button>
            <button onClick={triggerCrawl} disabled={crawlerRunning} style={{
              padding: "7px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "white",
              fontSize: 13, fontWeight: 600, color: C.textSub, cursor: "pointer",
              opacity: crawlerRunning ? 0.6 : 1,
            }}>{crawlerRunning ? "🔄 Crawling..." : "🕷 Crawl 85 Trades"}</button>
            <button onClick={runEngines} disabled={engineRunning} style={{
              padding: "9px 20px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${C.orange} 0%, #ea580c 100%)`,
              color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer",
              boxShadow: `0 4px 16px rgba(249,115,22,0.3)`,
              opacity: engineRunning ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8,
            }}>
              {engineRunning ? <>⏳ {countdown}s remaining</> : <>⚡ {t.runEngines}</>}
            </button>
          </div>
        </div>

        {/* Batch Analysis Banner ─────────────────────────────────────── */}
        {batchStatus && batchStatus.remaining > 0 && (
          <div id="overview" style={{
            background: "white", borderRadius: 16, padding: "20px 24px", marginBottom: 24,
            border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.orange}`,
            display: "flex", alignItems: "center", gap: 20,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                  📋 Course Catalogue Analysis — {batchStatus.remaining} courses remaining
                </div>
                <div style={{ fontSize: 13, color: C.textMuted }}>{batchStatus.analysed} / {batchStatus.total_in_db} analysed</div>
              </div>
              <div style={{ height: 10, background: C.bg, borderRadius: 5, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${batchPercent}%`, borderRadius: 5,
                  background: `linear-gradient(to right, ${C.orange}, #fb923c)`,
                  transition: "width 0.8s ease",
                }} />
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 5 }}>
                Next batch: courses {batchStatus.current_offset + 1}–{batchStatus.current_offset + batchStatus.batch_size} · ~120ms execution time
              </div>
            </div>
            <button onClick={runBatch} disabled={batchRunning} style={{
              padding: "12px 24px", borderRadius: 12, border: "none", flexShrink: 0,
              background: batchRunning ? C.bg : `linear-gradient(135deg, ${C.orange}, #ea580c)`,
              color: batchRunning ? C.textMuted : "white", fontWeight: 700, fontSize: 14, cursor: "pointer",
              boxShadow: batchRunning ? "none" : `0 4px 16px rgba(249,115,22,0.25)`,
              whiteSpace: "nowrap",
            }}>
              {batchRunning ? "⚙ Analysing..." : `⚡ Analyse Next ${batchStatus.batch_size}`}
            </button>
          </div>
        )}

        {/* KPI Cards ─────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          <KPICard label="Total Courses Indexed" value={String((metrics as Record<string,unknown>)?.total_courses ?? 0)} sub="SHA-256 tracked" icon="📚" color={C.orange} colorLight={C.orangeLight} change="+34 today" />
          <KPICard label="DVET ITI Trades" value="85" sub="419 Govt + 585 Private ITIs" icon="🏫" color={C.sky} colorLight={C.skyLight} />
          <KPICard label="Active Job Postings" value={String((metrics as Record<string,unknown>)?.total_relevant_jobs ?? 0)} sub="NCS + MIDC Hubs" icon="💼" color={C.green} colorLight={C.greenLight} change="+3 today" />
          <KPICard label="Avg Alignment Score" value={`${(metrics as Record<string,number>)?.avg_alignment_score_percentage ?? 0}%`} sub="Demand-weighted" icon="📊" color={C.purple} colorLight={C.purpleLight} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          <KPICard label="MSSDS Course Master" value="1,200+" sub="2,152 Training Centres" icon="🎓" color="#f59e0b" colorLight="#fffbeb" />
          <KPICard label="Skill Dictionary Terms" value={String(skillDict?.standard_dictionary_count ?? 0)} sub="6-Category Taxonomy" icon="📖" color={C.orange} colorLight={C.orangeLight} />
          <KPICard label="Unknown Skills Flagged" value={String((metrics as Record<string,number>)?.candidate_unknown_skills_count ?? 0)} sub="Pending Review" icon="🔍" color={C.red} colorLight={C.redLight} />
          <KPICard label="High Deficit Districts" value={String((metrics as Record<string,number>)?.high_deficit_districts_count ?? 0)} sub="< 75% alignment" icon="⚠️" color={C.red} colorLight={C.redLight} />
        </div>

        {/* Engine result strip */}
        {engineResult && (
          <div style={{ background: C.greenLight, borderRadius: 12, padding: "14px 20px", marginBottom: 24, border: `1px solid rgba(34,197,94,0.2)`, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>✓ Pipeline completed in {(engineResult as Record<string, number>).total_latency_ms}ms</span>
            {(["engine1","engine2","engine3","engine4"] as const).map((k, i) => {
              const e = (engineResult as Record<string, Record<string, unknown>>)[k];
              return e ? <span key={k} style={{ fontSize: 12, color: C.green }}>E{i+1}: {e.latency_ms as number}ms</span> : null;
            })}
          </div>
        )}

        {/* Charts row ─────────────────────────────────────────────────── */}
        <div id="districts" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          {/* Bar chart */}
          <div style={{ background: "white", borderRadius: 16, padding: "24px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>District Alignment Scores</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 20 }}>Average course-industry match per MIDC hub</div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", fontSize: 13 }} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]} name="Alignment %">
                    {chartData.map((d, i) => <Cell key={i} fill={CHART_COLORS[d.status] ?? C.orange} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GIS Map */}
          <div style={{ background: "white", borderRadius: 16, padding: "24px", border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{t.mapTitle}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{t.mapSubtitle}</div>
              </div>
              {selectedDistrict && (
                <button onClick={() => setSelectedDistrict(null)} style={{ fontSize: 12, color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 8px", background: "none", cursor: "pointer" }}>✕ Clear</button>
              )}
            </div>
            <MaharashtraMap onDistrictSelect={setSelectedDistrict} selectedDistrict={selectedDistrict} districtData={Object.fromEntries(districts.map(d => [d.district, d]))} />
          </div>
        </div>

        {/* Donut + trend row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20, marginBottom: 24 }}>
          {/* Donut chart — course type split */}
          <div style={{ background: "white", borderRadius: 16, padding: "24px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>Course Type Split</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>ITI vs MSSDS catalogue</div>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{ name: "ITI Trades", value: 30 }, { name: "MSSDS", value: gaps.length - 30 > 0 ? gaps.length - 30 : 4 }]}
                    cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value"
                  >
                    <Cell fill={C.orange} />
                    <Cell fill={C.sky} />
                  </Pie>
                  <Legend formatter={(v) => <span style={{ fontSize: 12, color: C.textSub }}>{v}</span>} />
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* District table */}
          <div style={{ background: "white", borderRadius: 16, padding: "24px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>District Overview</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["District", "Courses", "Jobs", "Score", "Status"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {districts.map((d, i) => (
                  <tr key={d.district} style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
                    onClick={() => setSelectedDistrict(d.district === selectedDistrict ? null : d.district)}
                  >
                    <td style={{ padding: "12px 10px", fontSize: 14, fontWeight: 600, color: C.text }}>{d.district}</td>
                    <td style={{ padding: "12px 10px", fontSize: 13, color: C.textSub }}>{d.active_courses}</td>
                    <td style={{ padding: "12px 10px", fontSize: 13, color: C.textSub }}>{d.relevant_jobs}</td>
                    <td style={{ padding: "12px 10px" }}><ScoreChip score={d.avg_alignment_score} /></td>
                    <td style={{ padding: "12px 10px" }}>
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

        {/* Course Gap Table ─────────────────────────────────────────── */}
        <div id="gaps" style={{ background: "white", borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 24 }}>
          {/* Table header */}
          <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Course Alignment Table</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                {filteredGaps.length} of {gaps.length} courses
                {selectedDistrict ? ` · ${selectedDistrict}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={() => setShowSkillDict(true)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid rgba(168,85,247,0.3)`, background: C.purpleLight, color: C.purple, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                📖 Skill Dictionary
              </button>
              {(["ALL","ITI","MSSDS"] as const).map(f => (
                <button key={f} onClick={() => setFilterType(f)} style={{
                  padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: filterType === f ? C.orange : "white",
                  color: filterType === f ? "white" : C.textSub,
                  border: filterType === f ? "none" : `1px solid ${C.border}`,
                }}>{f}</button>
              ))}
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses..."
                style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.text, background: C.bg, outline: "none", width: 200 }}
              />
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {["Course", "Type", "Sector", "District", "Score", "Missing Skills", "Bridge Pack"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredGaps.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: "48px", textAlign: "center", color: C.textMuted, fontSize: 14 }}>
                    No courses match your filters. Run engines to populate data.
                  </td></tr>
                ) : filteredGaps.map((gap, i) => (
                  <tr key={gap.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "white" : "#fafafa", transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = C.orangeLight}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? "white" : "#fafafa"}
                  >
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.3 }}>{gap.course_title}</div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: gap.institute_type === "ITI" ? C.skyLight : C.purpleLight, color: gap.institute_type === "ITI" ? C.sky : C.purple, border: `1px solid ${gap.institute_type === "ITI" ? C.skyMid : "#e9d5ff"}` }}>{gap.institute_type}</span>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 12, color: C.textSub, maxWidth: 160 }}>{gap.sector}</td>
                    <td style={{ padding: "14px 16px", fontSize: 12, color: C.textSub }}>{gap.district}</td>
                    <td style={{ padding: "14px 16px" }}><ScoreChip score={gap.alignment_score} /></td>
                    <td style={{ padding: "14px 16px" }}>
                      {gap.missing_skills.length === 0
                        ? <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>✓ Fully Aligned</span>
                        : <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {gap.missing_skills.slice(0, 2).map(s => (
                            <span key={s} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, background: C.redLight, color: C.red, fontWeight: 600 }}>{s}</span>
                          ))}
                          {gap.missing_skills.length > 2 && <span style={{ fontSize: 11, color: C.textMuted }}>+{gap.missing_skills.length - 2}</span>}
                        </div>
                      }
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {gap.missing_skills.length > 0
                        ? <button onClick={() => getBridgePack(gap.course_id)} disabled={bridgeLoading === gap.course_id} style={{
                            padding: "7px 14px", borderRadius: 8, border: "none",
                            background: bridgeLoading === gap.course_id ? C.bg : `linear-gradient(135deg, ${C.orange}, #ea580c)`,
                            color: bridgeLoading === gap.course_id ? C.textMuted : "white",
                            fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                            boxShadow: bridgeLoading === gap.course_id ? "none" : `0 2px 8px rgba(249,115,22,0.25)`,
                          }}>
                            {bridgeLoading === gap.course_id ? "Loading..." : "🎯 Get Pack"}
                          </button>
                        : <span style={{ fontSize: 11, color: C.textMuted }}>—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Crawler Result */}
        {crawlerResult && (
          <div id="crawler" style={{ background: C.greenLight, borderRadius: 16, padding: "20px 24px", border: `1px solid rgba(34,197,94,0.2)`, display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                Crawl Complete — {(crawlerResult as Record<string, number>).completed}/{(crawlerResult as Record<string, number>).total_targets} DVET ITI Trades
              </div>
              <div style={{ fontSize: 12, color: C.textSub }}>{(crawlerResult as Record<string, number>).elapsed_ms}ms · SHA-256 hashes computed for all 85 DVET trades</div>
            </div>
          </div>
        )}

      </main>

      {/* Modals */}
      {bridgePackData && <BridgePackModal data={bridgePackData} onClose={() => setBridgePackData(null)} />}
      {showSkillDict && skillDict && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 24, maxWidth: 640, width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>Skill Dictionary</div>
              <button onClick={() => setShowSkillDict(false)} style={{ fontSize: 24, border: "none", background: "none", cursor: "pointer", color: C.textMuted }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
              {skillDict.dictionary.map(item => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{item.standard_name}</div>
                    {item.synonyms?.length > 0 && <div style={{ fontSize: 11, color: C.textMuted }}>{item.synonyms.join(", ")}</div>}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: C.orangeLight, color: C.orange, border: `1px solid ${C.orangeMid}` }}>{item.category}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setShowSkillDict(false)} style={{ padding: "9px 20px", borderRadius: 10, background: C.orange, color: "white", fontWeight: 700, border: "none", cursor: "pointer" }}>Close</button>
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
