"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LangProvider, useLang } from "@/lib/i18n";
import { GovAssistantModal } from "@/components/dashboard/GovAssistantModal";
import { CourseAssistantModal } from "@/components/dashboard/CourseAssistantModal";
import { NotificationCenter, type NotificationItem } from "@/components/shared/NotificationCenter";

const API = process.env.NEXT_PUBLIC_API_URL || "";

const C = {
  orange:      "#f97316",
  orangeLight: "#fff7ed",
  orangeMid:   "#ffedd5",
  sky:         "#0284c7",
  skyLight:    "#f0f9ff",
  skyMid:      "#bae6fd",
  cyan:        "#0891b2",
  cyanLight:   "#ecfeff",
  cyanMid:     "#cffafe",
  green:       "#16a34a",
  greenLight:  "#f0fdf4",
  purple:      "#7c3aed",
  purpleLight: "#f5f3ff",
  red:         "#dc2626",
  redLight:    "#fef2f2",
  amber:       "#d97706",
  amberLight:  "#fffbeb",
  bg:          "#f8fafc",
  card:        "#ffffff",
  border:      "rgba(0,0,0,0.06)",
  text:        "#0f172a",
  textSub:     "#475569",
  textMuted:   "#94a3b8",
};

const PAGE_SIZE = 20;

interface PriorityCourse {
  course_id: number;
  course_title: string;
  district: string;
  sector: string;
  institute_type: string;
  alignment_score: number;
  missing_count: number;
  missing_skills: string[];
  fully_covered_skills: string[];
  top_skill_gap: string;
  top_skill_demand_pct: number;
  top_skill_job_count: number;
  total_jobs_analyzed: number;
  priority_score: number;
  priority: "urgent" | "attention" | "emerging" | "aligned";
  top_skill_gaps: { skill: string; demand_pct: number; job_count: number; severity: string }[];
}

interface GapRecord {
  id: number; course_id: number; course_title: string; institute_type: string;
  sector: string; district: string; alignment_score: number;
  core_skill_coverage_pct: number; emerging_skill_coverage_pct: number;
  fully_covered_count?: number; partially_covered_count?: number; missing_count?: number;
  fully_covered_skills: string[]; partially_covered_skills: string[];
  missing_skills: string[];
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dashMemoryCache: { m: any; g: any; d: any; s: any; pc: any; ts: number } | null = null;

// ─── Priority badge ────────────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
    urgent:    { label: "Urgent",        color: C.red,    bg: C.redLight,    emoji: "🔴" },
    attention: { label: "Needs Attention", color: C.amber,  bg: C.amberLight,  emoji: "🟠" },
    emerging:  { label: "Emerging",      color: C.sky,    bg: C.skyLight,    emoji: "🔵" },
    aligned:   { label: "Aligned",       color: C.green,  bg: C.greenLight,  emoji: "🟢" },
  };
  const p = map[priority] || map.aligned;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
      background: p.bg, color: p.color, border: `1px solid ${p.color}25`,
      whiteSpace: "nowrap",
    }}>
      {p.emoji} {p.label}
    </span>
  );
}

// ─── Top-line stat card ────────────────────────────────────────────────────────
function StatCard({ value, label, sub, color, icon }: {
  value: string | number; label: string; sub?: string; color: string; icon: string;
}) {
  return (
    <div style={{
      background: C.card, borderRadius: 16, padding: "22px 24px",
      border: `1px solid ${C.border}`, borderLeft: `4px solid ${color}`,
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 13, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 900, color: C.text, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.textSub, marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ─── Attention Card (priority course) ─────────────────────────────────────────
function AttentionCard({ course, onViewPlan }: { course: PriorityCourse; onViewPlan: () => void }) {
  const [showEvidence, setShowEvidence] = useState(false);
  const [approvalState, setApprovalState] = useState<"none" | "approved" | "deferred">("none");

  const priorityMap = {
    urgent:    { border: C.red,    headerBg: "#fef2f2", iconBg: C.red    },
    attention: { border: C.amber,  headerBg: "#fffbeb", iconBg: C.amber  },
    emerging:  { border: C.sky,    headerBg: "#f0f9ff", iconBg: C.sky    },
    aligned:   { border: C.green,  headerBg: "#f0fdf4", iconBg: C.green  },
  };
  const style = priorityMap[course.priority] || priorityMap.aligned;

  return (
    <div style={{
      background: C.card, borderRadius: 16,
      border: `1px solid ${style.border}30`,
      borderLeft: `4px solid ${style.border}`,
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", background: style.headerBg, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <PriorityBadge priority={course.priority} />
            <span style={{ fontSize: 11, color: C.textMuted }}>{course.institute_type} · {course.sector}</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 2 }}>
            {course.course_title}
          </div>
          <div style={{ fontSize: 12, color: C.textSub }}>📍 {course.district}</div>
        </div>
        {/* Alignment ring */}
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: `conic-gradient(${style.border} ${course.alignment_score}%, #f1f5f9 0)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: "50%", background: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800, color: style.border,
            }}>
              {Math.round(course.alignment_score)}%
            </div>
          </div>
          <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>Aligned</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 20px" }}>
        {/* Top skill gap */}
        {course.top_skill_gap && (
          <div style={{
            background: C.bg, borderRadius: 10, padding: "10px 14px", marginBottom: 12,
            border: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 3 }}>Top missing skill employers want:</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{course.top_skill_gap}</span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                background: C.redLight, color: C.red
              }}>
                {course.top_skill_demand_pct}% of {course.total_jobs_analyzed} jobs
              </span>
            </div>
          </div>
        )}

        {/* Missing skills pills */}
        {course.missing_skills.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, fontWeight: 600 }}>
              All gaps ({course.missing_count}):
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {course.missing_skills.slice(0, 4).map(s => (
                <span key={s} style={{
                  padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: C.redLight, color: C.red, border: `1px solid ${C.red}20`,
                }}>{s}</span>
              ))}
              {course.missing_count > 4 && (
                <span style={{ fontSize: 11, color: C.textMuted, padding: "3px 4px" }}>
                  +{course.missing_count - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Evidence toggle */}
        <button
          onClick={() => setShowEvidence(v => !v)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 12, color: C.cyan, fontWeight: 600, padding: 0, marginBottom: 8,
            display: "flex", alignItems: "center", gap: 4,
          }}
        >
          {showEvidence ? "▲ Hide" : "▼ Why is this flagged?"} evidence
        </button>

        {showEvidence && (
          <div style={{
            background: C.skyLight, borderRadius: 10, padding: "12px 14px",
            border: `1px solid ${C.skyMid}`, marginBottom: 12, fontSize: 12, color: C.textSub,
          }}>
            <div style={{ fontWeight: 700, color: C.sky, marginBottom: 6, fontSize: 11 }}>EVIDENCE</div>
            <div>• {course.total_jobs_analyzed} job postings analyzed for {course.district}</div>
            {course.top_skill_demand_pct > 0 && (
              <div>• {course.top_skill_demand_pct}% mention <strong>{course.top_skill_gap}</strong></div>
            )}
            <div>• Current curriculum covers only {Math.round(course.alignment_score)}% of employer requirements</div>
            {course.fully_covered_skills.length > 0 && (
              <div>• Already covers: {course.fully_covered_skills.slice(0, 3).join(", ")}</div>
            )}
          </div>
        )}
      </div>

      {/* Footer actions */}
      {approvalState === "none" ? (
        <div style={{
          padding: "12px 20px", borderTop: `1px solid ${C.border}`,
          display: "flex", gap: 8, flexWrap: "wrap",
        }}>
          <button
            onClick={onViewPlan}
            style={{
              flex: 1, padding: "9px 14px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${C.orange}, #ea580c)`,
              color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer",
              boxShadow: `0 3px 10px rgba(249,115,22,0.25)`, minWidth: 100,
            }}
          >
            📋 Review Plan
          </button>
          <button
            onClick={() => setApprovalState("approved")}
            style={{
              padding: "9px 14px", borderRadius: 10, border: `1.5px solid ${C.green}`,
              background: "transparent", color: C.green, fontWeight: 700, fontSize: 12, cursor: "pointer",
            }}
          >
            ✓ Approve
          </button>
          <button
            onClick={() => setApprovalState("deferred")}
            style={{
              padding: "9px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`,
              background: "transparent", color: C.textSub, fontWeight: 700, fontSize: 12, cursor: "pointer",
            }}
          >
            Defer
          </button>
        </div>
      ) : (
        <div style={{
          padding: "12px 20px", borderTop: `1px solid ${C.border}`,
          background: approvalState === "approved" ? C.greenLight : C.bg,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: approvalState === "approved" ? C.green : C.textSub }}>
            {approvalState === "approved" ? "✓ Recommendation Approved" : "⏸ Deferred for Review"}
          </span>
          <button
            onClick={() => setApprovalState("none")}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: C.textMuted }}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

// ─── AI Executive Briefing (cached, with real data) ───────────────────────────
function ExecutiveBriefing({ district }: { district: string }) {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);

  const steps = ["Analyzing skill gaps...", "Comparing job demand...", "Generating briefing..."];

  useEffect(() => {
    setLoading(true);
    setLoadingStep(0);
    const interval = setInterval(() => setLoadingStep(s => Math.min(s + 1, steps.length - 1)), 1200);

    fetch(`${API}/api/v1/assistant/executive-briefing?district=${encodeURIComponent(district)}`)
      .then(r => r.json())
      .then(d => { setBriefing(d.briefing || null); clearInterval(interval); setLoading(false); })
      .catch(() => { clearInterval(interval); setLoading(false); });
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [district]);

  return (
    <div style={{
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      borderRadius: 16, padding: "24px 28px", color: "white", marginBottom: 28,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 18 }}>🤖</div>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", color: "#94a3b8", textTransform: "uppercase" }}>
          SkillX AI Assessment · {district}
        </div>
      </div>
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid #0891b2", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: 14, color: "#94a3b8" }}>{steps[loadingStep]}</span>
        </div>
      ) : briefing ? (
        <p style={{ fontSize: 16, lineHeight: 1.7, color: "rgba(255,255,255,0.9)", margin: 0, fontWeight: 400 }}>
          {briefing}
        </p>
      ) : (
        <p style={{ fontSize: 15, color: "#94a3b8", margin: 0 }}>
          Run the data pipeline to generate insights for {district}.
        </p>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  const navItems = [
    { id: "overview",   label: "Overview",          icon: "🏠" },
    { id: "attention",  label: "What Needs Action?", icon: "⚠️" },
    { id: "courses",    label: "All Courses",        icon: "📋" },
    { id: "districts",  label: "Districts",          icon: "📍" },
    { id: "districtplan", label: "District Reports", icon: "📊" },
    { id: "skills",     label: "Skill Intelligence", icon: "🧠" },
  ];
  return (
    <aside style={{
      width: 240, minHeight: "100vh", background: "#fff",
      borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column",
      position: "fixed", top: 0, left: 0, zIndex: 100,
    }}>
      <div style={{ padding: "24px 20px 20px", borderBottom: `1px solid ${C.border}` }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: `linear-gradient(135deg,${C.orange},#ea580c)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 19, color: "white",
            boxShadow: `0 4px 14px rgba(249,115,22,0.25)`,
          }}>S</div>
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: C.text }}>SkillX</div>
            <div style={{ fontSize: 10, color: C.cyan, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Govt. Console
            </div>
          </div>
        </Link>
      </div>
      <nav style={{ flex: 1, padding: "20px 12px" }}>
        {navItems.map(item => {
          const isActive = active === item.id;
          return (
            <button key={item.id} id={`nav-${item.id}`}
              onClick={() => { onSelect(item.id); document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
              style={{
                position: "relative", display: "flex", alignItems: "center", gap: 12,
                width: "100%", padding: "11px 14px", borderRadius: 10, border: "none",
                background: isActive ? C.cyanLight : "transparent",
                color: isActive ? C.cyan : "#475569",
                fontWeight: isActive ? 700 : 500, fontSize: 14, cursor: "pointer",
                marginBottom: 4, transition: "all 0.25s", textAlign: "left",
              }}
              onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc"; } }}
              onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; } }}
            >
              <span style={{ fontSize: 15, opacity: isActive ? 1 : 0.75 }}>{item.icon}</span>
              <span>{item.label}</span>
              {isActive && <div style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 20, borderRadius: "2px 0 0 2px", background: C.cyan }} />}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 11, color: C.textMuted }}>SkillX v2.1 · SIH 2026</div>
        <Link href="/" style={{ fontSize: 12, color: C.cyan, fontWeight: 600, textDecoration: "none" }}>← Home</Link>
      </div>
    </aside>
  );
}

// ─── Skill health chip ────────────────────────────────────────────────────────
function HealthChip({ score }: { score: number }) {
  if (score >= 80) return <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: C.greenLight, color: C.green, border: `1px solid ${C.green}30`, whiteSpace: "nowrap" }}>🟢 Aligned</span>;
  if (score >= 60) return <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: C.amberLight, color: C.amber, border: `1px solid ${C.amber}30`, whiteSpace: "nowrap" }}>🟡 Gap</span>;
  return <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: C.redLight, color: C.red, border: `1px solid ${C.red}30`, whiteSpace: "nowrap" }}>🔴 Critical</span>;
}

// ─── Bridge Pack Modal (reused) ────────────────────────────────────────────────
function BridgePackModal({ data, onClose }: { data: BridgePackResponse; onClose: () => void }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const mod = data.bridge_packs[activeIdx];
  const exec = data.executive_summary;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "white", borderRadius: 24, maxWidth: 720, width: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}>
        <div style={{ padding: "22px 28px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: C.cyan, textTransform: "uppercase", marginBottom: 6 }}>20-Hour Skill Bridge Pack</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{data.course_title}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ padding: "3px 10px", borderRadius: 999, background: C.cyanLight, color: C.cyan, fontSize: 12, fontWeight: 600 }}>📍 {data.district}</span>
              <span style={{ padding: "3px 10px", borderRadius: 999, background: C.redLight, color: C.red, fontSize: 12, fontWeight: 600 }}>⚠ {data.missing_skills_count} Gaps</span>
              <span style={{ padding: "3px 10px", borderRadius: 999, background: C.skyLight, color: C.sky, fontSize: 12, fontWeight: 600 }}>⏱ {data.total_bridge_pack_hours}h Total</span>
            </div>
          </div>
          <button onClick={onClose} style={{ fontSize: 24, border: "none", background: "none", cursor: "pointer", color: C.textMuted }}>×</button>
        </div>
        {exec && (
          <div style={{ padding: "12px 28px", background: C.bg, borderBottom: `1px solid ${C.border}`, display: "flex", gap: 24, flexWrap: "wrap" }}>
            {exec.graduate_salary_lift && <div style={{ fontSize: 12, color: C.text }}>💰 <strong>Salary Lift:</strong> {exec.graduate_salary_lift}</div>}
            {exec.placement_lift && <div style={{ fontSize: 12, color: C.text }}>📈 <strong>Employability:</strong> {exec.placement_lift}</div>}
            {exec.cost_per_batch && <div style={{ fontSize: 12, color: C.text }}>🏗 <strong>Batch Cost:</strong> {exec.cost_per_batch}</div>}
          </div>
        )}
        {data.bridge_packs.length > 1 && (
          <div style={{ padding: "12px 28px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 8, overflowX: "auto" }}>
            {data.bridge_packs.map((m, i) => (
              <button key={i} onClick={() => setActiveIdx(i)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", background: activeIdx === i ? C.cyan : C.bg, color: activeIdx === i ? "white" : C.textSub, transition: "all 0.2s" }}>{m.skill_targeted.slice(0, 26)}</button>
            ))}
          </div>
        )}
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
          </div>
        )}
        <div style={{ padding: "16px 28px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: C.textMuted }}>{data.generated_by === "llm-gemini" ? "🤖 AI Generated" : "📋 Rule-based"} · {data.latency_ms}ms</span>
          <button onClick={onClose} style={{ padding: "10px 24px", borderRadius: 10, background: C.cyan, color: "white", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── District Plan Section (existing, kept) ────────────────────────────────────
function DistrictPlanSection({ districts }: { districts: DistrictSummary[] }) {
  const router = useRouter();
  const [sel, setSel] = useState("");
  const selected = districts.find(d => d.district === sel);
  return (
    <div id="districtplan" style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg,${C.green},${C.cyan})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📊</div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text, fontFamily: "'Playfair Display',serif" }}>District Reports</div>
          <div style={{ fontSize: 13, color: C.textMuted }}>Generate a government-ready intervention plan for any district</div>
        </div>
      </div>
      <div style={{ background: "white", borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", background: C.bg }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Select a District</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>View priority interventions, affected courses, and ROI estimates</div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <select id="district-plan-select" value={sel} onChange={e => setSel(e.target.value)}
              style={{ padding: "10px 16px", borderRadius: 10, border: `1px solid ${C.border}`, background: "white", fontSize: 14, fontWeight: 600, color: C.text, cursor: "pointer", outline: "none", minWidth: 220 }}
            >
              <option value="">— Select a District —</option>
              {districts.map(d => <option key={d.district} value={d.district}>{d.district} · {Math.round(d.avg_alignment_score)}% aligned</option>)}
            </select>
            {sel && (
              <button id="view-district-plan-btn" onClick={() => router.push(`/district-plan/${encodeURIComponent(sel)}`)}
                style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${C.green},${C.cyan})`, color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: `0 4px 14px rgba(22,163,74,0.25)`, whiteSpace: "nowrap" }}
              >📋 View Full Plan →</button>
            )}
          </div>
        </div>
        {selected ? (
          <div style={{ padding: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
              {[
                { v: selected.active_courses, l: "Active Courses" },
                { v: selected.relevant_jobs, l: "Active Jobs" },
                { v: `${Math.round(selected.avg_alignment_score)}%`, l: "Avg Alignment" },
              ].map((item, i) => (
                <div key={i} style={{ background: C.bg, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{item.v}</div>
                  <div style={{ fontSize: 12, color: C.textSub, fontWeight: 600 }}>{item.l}</div>
                </div>
              ))}
            </div>
            {selected.top_missing_skills?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Top Skill Gaps in {selected.district}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {selected.top_missing_skills.map(s => <span key={s} style={{ padding: "5px 12px", borderRadius: 999, background: C.redLight, color: C.red, fontSize: 12, fontWeight: 600, border: `1px solid ${C.red}20` }}>⚡ {s}</span>)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: "32px 24px", textAlign: "center", color: C.textMuted }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Select a district above to preview the intervention plan</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard Inner ──────────────────────────────────────────────────────
function DashboardInner() {
  const { lang, setLang } = useLang();
  const [activeNav, setActiveNav] = useState("overview");
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [gaps, setGaps] = useState<GapRecord[]>([]);
  const [priorityCourses, setPriorityCourses] = useState<PriorityCourse[]>([]);
  const [districts, setDistricts] = useState<DistrictSummary[]>([]);
  const [skillDict, setSkillDict] = useState<SkillDictData | null>(null);
  const [engineRunning, setEngineRunning] = useState(false);
  const [engineResult, setEngineResult] = useState<Record<string, unknown> | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [activeCourseAssistant, setActiveCourseAssistant] = useState<{ title: string; district: string } | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<"ALL" | "urgent" | "attention" | "emerging" | "aligned">("ALL");
  const [showSkillDict, setShowSkillDict] = useState(false);
  const [bridgePackData, setBridgePackData] = useState<BridgePackResponse | null>(null);
  const [batchToast, setBatchToast] = useState<string | null>(null);
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [navigatingId, setNavigatingId] = useState<number | null>(null);
  const [isNavigatingHome, setIsNavigatingHome] = useState(false);
  const [activeAttentionFilter, setActiveAttentionFilter] = useState<"all" | "urgent" | "attention" | "emerging">("all");

  useEffect(() => {
    setNotifications([
      {
        id: "1", type: "alert", title: "Priority Courses Updated",
        message: `SkillX has identified ${priorityCourses.filter(c => c.priority === "urgent").length} courses needing urgent curriculum intervention.`,
        time: "Just now", isRead: false,
        actionLabel: "View Priority List",
        onAction: () => document.getElementById("attention")?.scrollIntoView({ behavior: "smooth" }),
      },
      {
        id: "2", type: "recommendation", title: "AI Briefing Ready",
        message: `Executive briefing for ${selectedDistrict || "Maharashtra"} is available.`,
        time: "1h ago", isRead: false,
      }
    ]);
  }, [priorityCourses, selectedDistrict]);

  const fetchAll = useCallback(async () => {
    let hasCache = false;
    if (dashMemoryCache?.m && dashMemoryCache?.g) {
      setMetrics(dashMemoryCache.m); setGaps(dashMemoryCache.g);
      setDistricts(dashMemoryCache.d || []); setSkillDict(dashMemoryCache.s || null);
      if (dashMemoryCache.pc) setPriorityCourses(dashMemoryCache.pc);
      setMetricsLoading(false); hasCache = true;
    }
    if (!hasCache) setMetricsLoading(true);

    const safeFetch = async (endpoint: string) => {
      try {
        const url = API ? `${API}${endpoint}` : endpoint;
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) return await res.json();
        const fallbackRes = await fetch(endpoint, { cache: "no-store" });
        if (fallbackRes.ok) return await fallbackRes.json();
        return null;
      } catch {
        try {
          const fallbackRes = await fetch(endpoint, { cache: "no-store" });
          if (fallbackRes.ok) return await fallbackRes.json();
        } catch { }
        return null;
      }
    };

    try {
      const [m, g, d, s, pc] = await Promise.all([
        safeFetch("/api/v1/metrics/overview"),
        safeFetch("/api/v1/analytics/gap-analysis"),
        safeFetch("/api/v1/analytics/district-summary"),
        safeFetch("/api/v1/skills/dictionary"),
        safeFetch("/api/v1/assistant/priority-courses?limit=30"),
      ]);

      if (m) setMetrics(m);
      if (Array.isArray(g)) setGaps(g);
      if (Array.isArray(d)) setDistricts(d);
      if (s) setSkillDict(s);
      if (pc?.courses) setPriorityCourses(pc.courses);

      if (m && Array.isArray(g)) {
        dashMemoryCache = { m, g, d, s, pc: pc?.courses, ts: Date.now() };
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const sectionIds = ["overview", "attention", "courses", "districts", "districtplan", "skills"];
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY + 120;
          let current = "overview";
          for (const id of sectionIds) { const el = document.getElementById(id); if (el && el.offsetTop <= scrollY) current = id; }
          setActiveNav(prev => prev !== current ? current : prev);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const runEngines = async () => {
    setEngineRunning(true);
    const t0 = performance.now();
    try {
      const adminKey = process.env.NEXT_PUBLIC_ADMIN_API_KEY || "skillx-dev-secret-key-123";
      const headers = { "X-Admin-API-Key": adminKey };
      let r = await fetch(`${API}/api/v1/engines/run-all`, { method: "POST", headers }).catch(() => null);
      if (!r || !r.ok) r = await fetch(`/api/v1/engines/run-all`, { method: "POST", headers }).catch(() => null);
      if (r && r.ok) {
        const data = await r.json();
        setEngineResult(data); await fetchAll();
        setBatchToast(`✓ Data Pipeline Complete — ${(data.total_latency_ms || Math.round(performance.now() - t0))}ms`);
        setTimeout(() => setBatchToast(null), 5000);
      } else {
        setBatchToast("✓ Refreshing latest data...");
        await fetchAll();
        setTimeout(() => setBatchToast(null), 3000);
      }
    } catch (e) { console.error(e); }
    finally { setEngineRunning(false); }
  };

  // Filter gaps for the course list
  const filteredGaps = useMemo(() => gaps.filter(g => {
    if (search) {
      const q = search.toLowerCase();
      if (!g.course_title.toLowerCase().includes(q) &&
          !(g.sector || "").toLowerCase().includes(q) &&
          !(g.district || "").toLowerCase().includes(q) &&
          !(g.missing_skills || []).some(s => s.toLowerCase().includes(q))) return false;
    }
    if (selectedDistrict && g.district !== selectedDistrict) return false;
    if (filterPriority !== "ALL") {
      const score = (100 - g.alignment_score) * Math.log10(Math.max(1, (g.top_skill_gaps?.[0]?.job_count || 1)) + 1);
      let pLabel = score >= 120 ? "urgent" : score >= 60 ? "attention" : score >= 20 ? "emerging" : "aligned";
      if (pLabel !== filterPriority) return false;
    }
    return true;
  }), [gaps, search, selectedDistrict, filterPriority]);

  const sortedGaps = useMemo(() =>
    [...filteredGaps].sort((a, b) => a.alignment_score - b.alignment_score),
  [filteredGaps]);

  const totalPages = useMemo(() => Math.ceil(sortedGaps.length / PAGE_SIZE), [sortedGaps.length]);
  const pagedGaps = useMemo(() => sortedGaps.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [sortedGaps, currentPage]);
  useEffect(() => { setCurrentPage(1); }, [search, filterPriority, selectedDistrict]);

  const totalCourses = (metrics as Record<string, number>)?.total_courses ?? 0;
  const totalJobs = (metrics as Record<string, number>)?.total_relevant_jobs ?? 0;

  // Priority course filter for attention section
  const attentionCourses = useMemo(() => {
    if (activeAttentionFilter === "all") return priorityCourses.filter(c => c.priority !== "aligned");
    return priorityCourses.filter(c => c.priority === activeAttentionFilter);
  }, [priorityCourses, activeAttentionFilter]);

  const urgentCount = priorityCourses.filter(c => c.priority === "urgent").length;
  const attentionCount = priorityCourses.filter(c => c.priority === "attention").length;
  const emergingCount = priorityCourses.filter(c => c.priority === "emerging").length;

  return (
    <div style={{ display: "flex", background: C.bg, minHeight: "100vh", fontFamily: "'Inter',sans-serif" }}>
      <style>{`
        @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        * { box-sizing: border-box; }
      `}</style>
      <Sidebar active={activeNav} onSelect={setActiveNav} />

      <main style={{ marginLeft: 240, flex: 1, padding: "28px 32px", overflowX: "hidden", maxWidth: "calc(100vw - 240px)" }}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div id="overview" style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <button onClick={() => { setIsNavigatingHome(true); router.push("/"); }} disabled={isNavigatingHome}
                  style={{ padding: "5px 12px", borderRadius: 999, border: `1px solid ${C.border}`, background: "white", color: C.textSub, fontSize: 12, fontWeight: 700, cursor: isNavigatingHome ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {isNavigatingHome ? "↩ Returning..." : "← Home"}
                </button>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: C.text, fontFamily: "'Playfair Display',serif" }}>
                Maharashtra Skill Intelligence
              </div>
              <div style={{ fontSize: 13, color: C.textMuted, marginTop: 3 }}>
                SkillX has analyzed training programs against Maharashtra&apos;s job-market demand to identify where curriculum updates can have the greatest impact.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Link href="/student" style={{ padding: "8px 18px", fontSize: 13, borderRadius: 999, background: C.orangeLight, color: C.orange, fontWeight: 700, textDecoration: "none", border: `1px solid ${C.orangeMid}` }}>
                🎓 Student Portal
              </Link>
              <NotificationCenter
                items={notifications}
                onMarkAllRead={() => setNotifications(n => n.map(x => ({ ...x, isRead: true })))}
                align="left"
              />
              <button onClick={() => setShowSkillDict(true)}
                style={{ padding: "8px 16px", borderRadius: 999, border: `1px solid ${C.border}`, background: "white", color: C.textSub, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                📖 Skill Dictionary
              </button>
              <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                <select id="language-selector" value={lang} onChange={e => setLang(e.target.value as "en" | "mr" | "hi")}
                  style={{ appearance: "none", WebkitAppearance: "none", padding: "8px 32px 8px 14px", borderRadius: 999, border: `1px solid ${C.border}`, background: "white", fontSize: 12, fontWeight: 600, color: C.text, cursor: "pointer", outline: "none" }}>
                  <option value="en">🌐 English</option><option value="mr">🌐 मराठी</option><option value="hi">🌐 हिंदी</option>
                </select>
                <span style={{ position: "absolute", right: 12, pointerEvents: "none", fontSize: 10, color: C.textMuted }}>▼</span>
              </div>
            </div>
          </div>

          {batchToast && (
            <div style={{ background: "linear-gradient(135deg,#16a34a,#15803d)", color: "white", borderRadius: 12, padding: "12px 20px", marginBottom: 20, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between", animation: "fadeInUp 0.3s ease" }}>
              <span>{batchToast}</span>
              <button onClick={() => setBatchToast(null)} style={{ background: "none", border: "none", color: "white", fontSize: 18, cursor: "pointer" }}>×</button>
            </div>
          )}

          {/* ── AI Executive Briefing (hero) ─────────────────────────────────── */}
          <ExecutiveBriefing district={selectedDistrict || "Maharashtra"} />

          {/* ── Top-line metrics (3 only) ─────────────────────────────────────── */}
          {metricsLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
              {[0, 1, 2].map(i => <div key={i} style={{ background: C.card, borderRadius: 16, padding: "22px 24px", border: `1px solid ${C.border}`, height: 110, opacity: 0.5, animation: "pulse 1.5s infinite" }} />)}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
              <StatCard
                value={totalCourses || gaps.length}
                label="Courses Analyzed"
                sub={`Across ${districts.length} Maharashtra districts`}
                color={C.cyan}
                icon="📋"
              />
              <StatCard
                value={urgentCount + attentionCount}
                label="Need Attention"
                sub={`${urgentCount} urgent · ${attentionCount} moderate`}
                color={C.red}
                icon="⚠️"
              />
              <StatCard
                value={totalJobs.toLocaleString() || "—"}
                label="Job Postings Analyzed"
                sub={`${emergingCount} emerging skill trends detected`}
                color={C.green}
                icon="💼"
              />
            </div>
          )}
        </div>

        {/* ── What Needs Your Attention? ────────────────────────────────────── */}
        <div id="attention" style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.text, fontFamily: "'Playfair Display',serif" }}>
                What Needs Your Attention?
              </div>
              <div style={{ fontSize: 13, color: C.textMuted, marginTop: 3 }}>
                Courses ranked by urgency — gap severity × employer demand. Most critical first.
              </div>
            </div>
            {/* Filter tabs */}
            <div style={{ display: "flex", gap: 6 }}>
              {([
                { id: "all",       label: "All",       count: attentionCourses.length + (priorityCourses.filter(c => c.priority === "aligned").length === 0 ? 0 : 0) },
                { id: "urgent",    label: "🔴 Urgent",    count: urgentCount },
                { id: "attention", label: "🟠 Moderate",  count: attentionCount },
                { id: "emerging",  label: "🔵 Emerging",  count: emergingCount },
              ] as const).map(tab => (
                <button key={tab.id} onClick={() => setActiveAttentionFilter(tab.id)}
                  style={{
                    padding: "6px 14px", borderRadius: 999, border: `1px solid ${activeAttentionFilter === tab.id ? C.cyan : C.border}`,
                    background: activeAttentionFilter === tab.id ? C.cyanLight : "white",
                    color: activeAttentionFilter === tab.id ? C.cyan : C.textSub,
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}>
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>

          {metricsLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ background: C.card, borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, height: 220, opacity: 0.5, animation: "pulse 1.5s infinite" }} />
              ))}
            </div>
          ) : attentionCourses.length === 0 ? (
            <div style={{ background: C.card, borderRadius: 16, padding: "48px 40px", textAlign: "center", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🟢</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>All courses are well aligned</div>
              <div style={{ fontSize: 13, color: C.textMuted }}>No urgent interventions needed. Run the data pipeline to refresh.</div>
              <button onClick={runEngines} disabled={engineRunning}
                style={{ marginTop: 16, padding: "10px 24px", borderRadius: 999, border: "none", background: `linear-gradient(135deg,${C.orange},#ea580c)`, color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {engineRunning ? "Running..." : "⚡ Refresh Data"}
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
              {attentionCourses.slice(0, 6).map(course => (
                <AttentionCard
                  key={course.course_id}
                  course={course}
                  onViewPlan={() => { setNavigatingId(course.course_id); router.push(`/bridge-pack/${course.course_id}`); }}
                />
              ))}
            </div>
          )}
          {attentionCourses.length > 6 && (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button
                onClick={() => document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" })}
                style={{ padding: "10px 24px", borderRadius: 999, border: `1px solid ${C.border}`, background: "white", color: C.textSub, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
              >
                View all {attentionCourses.length} courses ↓
              </button>
            </div>
          )}
        </div>

        {/* ── All Courses Table ─────────────────────────────────────────────── */}
        <div id="courses" style={{ background: "white", borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 28 }}>
          <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, background: C.bg }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>All Courses</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                {filteredGaps.length} of {gaps.length} courses · Sorted by most critical first
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {selectedDistrict && (
                <button onClick={() => setSelectedDistrict(null)}
                  style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.cyanMid}`, background: C.cyanLight, color: C.cyan, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  📍 {selectedDistrict} ×
                </button>
              )}
              <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as typeof filterPriority)}
                style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: "white", fontSize: 13, fontWeight: 600, color: C.text, cursor: "pointer", outline: "none" }}>
                <option value="ALL">All Priorities</option>
                <option value="urgent">🔴 Urgent</option>
                <option value="attention">🟠 Needs Attention</option>
                <option value="emerging">🔵 Emerging</option>
                <option value="aligned">🟢 Aligned</option>
              </select>
              <input id="course-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search course, skill, district…"
                style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, color: C.text, background: C.bg, outline: "none", width: 240 }} />
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {["Course", "District", "Alignment", "Priority", "Top Gap", "Action"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedGaps.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: "48px", textAlign: "center", color: C.textMuted, fontSize: 14 }}>
                    No courses match your filters. Try clearing the priority filter.
                  </td></tr>
                ) : pagedGaps.map((gap, i) => {
                  const topMissing = (gap.missing_skills || [])[0] || "—";
                  const rowScore = (100 - gap.alignment_score) * Math.log10(Math.max(1, (gap.top_skill_gaps?.[0]?.job_count || 1)) + 1);
                  const rowPriority = rowScore >= 120 ? "urgent" : rowScore >= 60 ? "attention" : rowScore >= 20 ? "emerging" : "aligned";
                  return (
                    <tr key={gap.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "white" : "#fcfdfe", transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = C.cyanLight}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? "white" : "#fcfdfe"}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{gap.course_title}</div>
                          <button
                            onClick={e => { e.stopPropagation(); setActiveCourseAssistant({ title: gap.course_title, district: gap.district }); }}
                            style={{ background: C.cyanLight, border: "none", borderRadius: 999, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: C.cyan, cursor: "pointer" }}
                          >✨ AI</button>
                        </div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{gap.institute_type} · {gap.sector}</div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <button onClick={() => setSelectedDistrict(gap.district === selectedDistrict ? null : gap.district)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: C.text, padding: 0, fontSize: 13, fontWeight: 600 }}>
                          📍 {gap.district}
                        </button>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <HealthChip score={gap.alignment_score} />
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{Math.round(gap.alignment_score)}%</div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <PriorityBadge priority={rowPriority} />
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {topMissing !== "—" ? (
                          <span style={{ fontSize: 12, fontWeight: 600, color: C.red, background: C.redLight, padding: "3px 9px", borderRadius: 999, border: `1px solid ${C.red}15` }}>
                            {topMissing}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: C.green }}>No major gaps</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <button
                          onClick={() => { setNavigatingId(gap.course_id); router.push(`/bridge-pack/${gap.course_id}`); }}
                          disabled={navigatingId === gap.course_id}
                          style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: navigatingId === gap.course_id ? "#475569" : `linear-gradient(135deg,${C.orange},#ea580c)`, color: "white", fontSize: 12, fontWeight: 700, cursor: navigatingId === gap.course_id ? "wait" : "pointer", whiteSpace: "nowrap" }}>
                          {navigatingId === gap.course_id ? "Opening…" : "Review →"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: C.bg }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "white", cursor: "pointer", fontSize: 13, opacity: currentPage === 1 ? 0.4 : 1 }}>← Prev</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setCurrentPage(p)}
                  style={{ padding: "7px 13px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, background: currentPage === p ? C.cyan : "white", color: currentPage === p ? "white" : C.textSub, border: currentPage === p ? "none" : `1px solid ${C.border}` }}>{p}</button>
              ))}
              {totalPages > 7 && <span style={{ color: C.textMuted, fontSize: 13 }}>… {totalPages}</span>}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "white", cursor: "pointer", fontSize: 13, opacity: currentPage === totalPages ? 0.4 : 1 }}>Next →</button>
            </div>
          )}
        </div>

        {/* ── Districts ─────────────────────────────────────────────────────── */}
        <div id="districts" style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.text, fontFamily: "'Playfair Display',serif" }}>Districts</div>
              <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>Click a district to filter courses above</div>
            </div>
            {selectedDistrict && (
              <button onClick={() => setSelectedDistrict(null)}
                style={{ padding: "7px 14px", borderRadius: 999, border: `1px solid ${C.cyanMid}`, background: C.cyanLight, color: C.cyan, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Clear filter ×
              </button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {districts.slice(0, 12).map(d => {
              const isSelected = selectedDistrict === d.district;
              const color = d.avg_alignment_score >= 75 ? C.green : d.avg_alignment_score >= 55 ? C.amber : C.red;
              return (
                <div key={d.district} onClick={() => setSelectedDistrict(isSelected ? null : d.district)}
                  style={{
                    background: isSelected ? C.cyanLight : C.card, borderRadius: 12, padding: "14px 16px",
                    border: `1.5px solid ${isSelected ? C.cyan : C.border}`, cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = C.cyanMid; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = C.border; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? C.cyan : C.text }}>
                      {isSelected ? "▶ " : ""}{d.district}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color, background: color + "15", padding: "2px 7px", borderRadius: 999 }}>
                      {Math.round(d.avg_alignment_score)}%
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>
                    {d.active_courses} courses · {d.relevant_jobs} jobs
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: d.deficit_status === "ALIGNED" ? C.greenLight : d.deficit_status === "MODERATE" ? C.amberLight : C.redLight, color: d.deficit_status === "ALIGNED" ? C.green : d.deficit_status === "MODERATE" ? C.amber : C.red }}>
                      {d.deficit_status}
                    </span>
                  </div>
                </div>
              );
            })}
            {districts.length > 12 && (
              <div style={{ background: C.card, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>+{districts.length - 12} more districts</span>
              </div>
            )}
          </div>
        </div>

        {/* ── District Plan ─────────────────────────────────────────────────── */}
        <DistrictPlanSection districts={districts} />

        {/* ── Skill Intelligence ─────────────────────────────────────────────── */}
        <div id="skills" style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text, fontFamily: "'Playfair Display',serif", marginBottom: 12 }}>Skill Intelligence</div>
          <div style={{ background: C.cyanLight, borderRadius: 16, padding: "20px 24px", border: `1px solid ${C.cyanMid}`, display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 24 }}>⚡</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.cyan }}>Data Pipeline Status</div>
              <div style={{ fontSize: 12, color: C.textSub }}>
                {totalCourses} courses & {totalJobs} job postings across {districts.length} districts.
                {engineResult ? ` Last run: ${(engineResult as Record<string, number>).total_latency_ms}ms` : " Run engines to refresh."}
              </div>
            </div>
            <button onClick={runEngines} disabled={engineRunning}
              style={{ marginLeft: "auto", padding: "9px 20px", borderRadius: 999, border: "none", background: engineRunning ? C.textMuted : `linear-gradient(135deg,${C.cyan},${C.sky})`, color: "white", fontWeight: 700, fontSize: 13, cursor: engineRunning ? "wait" : "pointer", flexShrink: 0 }}>
              {engineRunning ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span> Running...</> : "⚡ Refresh Data"}
            </button>
          </div>
        </div>

      </main>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {bridgePackData && <BridgePackModal data={bridgePackData} onClose={() => setBridgePackData(null)} />}
      {activeCourseAssistant && (
        <CourseAssistantModal
          courseTitle={activeCourseAssistant.title}
          district={activeCourseAssistant.district}
          onClose={() => setActiveCourseAssistant(null)}
        />
      )}
      {showSkillDict && skillDict && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 24, maxWidth: 660, width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>Skill Dictionary</div>
                <div style={{ fontSize: 12, color: C.cyan, marginTop: 2 }}>{skillDict.standard_dictionary_count} standardized skills</div>
              </div>
              <button onClick={() => setShowSkillDict(false)} style={{ fontSize: 24, border: "none", background: "none", cursor: "pointer", color: C.textMuted }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
              {skillDict.dictionary.map(item => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{item.standard_name}</div>
                    {item.synonyms?.length > 0 && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3, maxWidth: 420 }}>{item.synonyms.slice(0, 5).join(", ")}</div>}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: C.cyanLight, color: C.cyan, border: `1px solid ${C.cyanMid}`, whiteSpace: "nowrap", marginLeft: 12 }}>{item.category}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setShowSkillDict(false)} style={{ padding: "9px 20px", borderRadius: 10, background: C.cyan, color: "white", fontWeight: 700, border: "none", cursor: "pointer" }}>Close</button>
            </div>
          </div>
        </div>
      )}
      <GovAssistantModal selectedDistrict={selectedDistrict || undefined} />
    </div>
  );
}

export default function DashboardPage() {
  return <LangProvider><DashboardInner /></LangProvider>;
}
