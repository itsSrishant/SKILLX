"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LangProvider, useLang } from "@/lib/i18n";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { GovAssistantModal } from "@/components/dashboard/GovAssistantModal";
import { CourseAssistantModal } from "@/components/dashboard/CourseAssistantModal";
import { NotificationCenter, type NotificationItem } from "@/components/shared/NotificationCenter";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" &&
   (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.port === "3000")
    ? "http://localhost:8000"
    : "");

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
  bg:          "#fafcfd",
  card:        "#ffffff",
  border:      "rgba(0,0,0,0.06)",
  text:        "#0f172a",
  textSub:     "#475569",
  textMuted:   "#94a3b8",
};

const PAGE_SIZE = 50;

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
interface IndustryDemandData {
  total_jobs_analyzed: number;
  total_unique_skills_demanded: number;
  top_demanded_skills: {
    rank: number; skill: string; job_count: number; demand_pct: number;
    unique_employers: number; category: string; top_sector: string;
  }[];
  sector_breakdown: {
    sector: string; total_job_demand: number;
    top_skills: { skill: string; count: number }[];
  }[];
}
interface SkillGapSummaryData {
  total_courses_analyzed: number;
  critical_deficit_courses: number; critical_deficit_pct: number;
  moderate_gap_courses: number; moderate_gap_pct: number;
  aligned_courses: number; aligned_pct: number;
  trainees_at_critical_risk: number; trainees_at_moderate_risk: number;
  total_trainees_at_risk: number;
  avg_skill_mismatch_pct: number;
  projected_salary_lift_inr: number;
  state_wide_top_deficits: { skill: string; courses_affected: number }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dashMemoryCache: { m: any; g: any; d: any; s: any; ind: any; sg: any; ts: number } | null = null;

function GoalCircleLoader({ text }: { text?: string }) {
  const [progress, setProgress] = useState(12);
  useEffect(() => {
    const timer = setInterval(() => setProgress(p => p >= 94 ? 94 : p + Math.floor(Math.random() * 14 + 10)), 110);
    return () => clearInterval(timer);
  }, []);
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"64px 20px", minHeight:320 }}>
      <div style={{ position:"relative", width:84, height:84, marginBottom:20 }}>
        <div style={{ position:"absolute", inset:-4, borderRadius:"50%", background:`conic-gradient(from 0deg,${C.cyan},${C.orange},${C.purple},${C.cyan})`, animation:"spinGrad 1.6s linear infinite", filter:"blur(3px)", opacity:0.85 }} />
        <div style={{ position:"absolute", inset:2, borderRadius:"50%", background:"white", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:18, fontWeight:900, color:C.cyan }}>{progress}%</span>
        </div>
      </div>
      <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:4 }}>{text || "Syncing SkillX Admin Console..."}</div>
      <div style={{ fontSize:12, color:C.textMuted }}>Calibrating 36 MIDC Districts &amp; 547 Syllabi Records</div>
    </div>
  );
}

function Sidebar({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  const { t } = useLang();
  const navItems = [
    { id:"overview",     label:t.navOverview,     icon:"📊" },
    { id:"courses",      label:t.navCourses,      icon:"📋" },
    { id:"industry",     label:t.navIndustry,     icon:"🏭" },
    { id:"districtplan", label:t.navDistrictPlan, icon:"🗺️" },
    { id:"districts",    label:t.navDistricts,    icon:"📍" },
  ];
  return (
    <aside style={{ width:240, minHeight:"100vh", background:"#fff", borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", position:"fixed", top:0, left:0, zIndex:100 }}>
      <div style={{ padding:"24px 20px 20px", borderBottom:`1px solid ${C.border}` }}>
        <Link href="/" style={{ textDecoration:"none", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:`linear-gradient(135deg,${C.orange},#ea580c)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:19, color:"white", boxShadow:`0 4px 14px rgba(249,115,22,0.25)` }}>S</div>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:C.text }}>SkillX</div>
            <div style={{ fontSize:10, color:C.cyan, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>Admin Console</div>
          </div>
        </Link>
      </div>
      <nav style={{ flex:1, padding:"20px 12px" }}>
        {navItems.map(item => {
          const isActive = active === item.id;
          return (
            <button key={item.id} id={`nav-${item.id}`}
              onClick={() => { onSelect(item.id); document.getElementById(item.id)?.scrollIntoView({ behavior:"smooth", block:"start" }); }}
              style={{ position:"relative", display:"flex", alignItems:"center", gap:12, width:"100%", padding:"11px 14px", borderRadius:10, border:"none", background:isActive?C.cyanLight:"transparent", color:isActive?C.cyan:"#475569", fontWeight:isActive?700:500, fontSize:14, cursor:"pointer", marginBottom:4, transition:"all 0.25s cubic-bezier(0.4,0,0.2,1)", textAlign:"left" }}
              onMouseEnter={e => { if(!isActive){(e.currentTarget as HTMLButtonElement).style.background="#f8fafc";(e.currentTarget as HTMLButtonElement).style.color="#0f172a";} }}
              onMouseLeave={e => { if(!isActive){(e.currentTarget as HTMLButtonElement).style.background="transparent";(e.currentTarget as HTMLButtonElement).style.color="#475569";} }}
            >
              <span style={{ fontSize:15, opacity:isActive?1:0.75 }}>{item.icon}</span>
              <span>{item.label}</span>
              {isActive && <div style={{ position:"absolute", right:0, top:"50%", transform:"translateY(-50%)", width:3, height:20, borderRadius:"2px 0 0 2px", background:C.cyan }} />}
            </button>
          );
        })}
      </nav>
      <div style={{ padding:"16px 20px", borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:11, color:C.textMuted }}>SkillX v2.1 · SIH 2026</div>
        <Link href="/" style={{ fontSize:12, color:C.cyan, fontWeight:600, textDecoration:"none" }}>← Home</Link>
      </div>
    </aside>
  );
}

function KPICard({ label, value, sub, icon, color, colorLight, trend }: { label:string; value:string|number; sub?:string; icon:string; color:string; colorLight:string; trend?:string }) {
  return (
    <div style={{ background:C.card, borderRadius:16, padding:"20px 22px", border:`1px solid ${C.border}`, borderTop:`3px solid ${color}`, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", transition:"all 0.25s cubic-bezier(0.4,0,0.2,1)" }}
      onMouseEnter={e => { const d=e.currentTarget as HTMLDivElement; d.style.boxShadow="0 8px 24px rgba(0,0,0,0.06)"; d.style.transform="translateY(-2px)"; }}
      onMouseLeave={e => { const d=e.currentTarget as HTMLDivElement; d.style.boxShadow="0 1px 3px rgba(0,0,0,0.03)"; d.style.transform="none"; }}
    >
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:colorLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{icon}</div>
        {trend && <span style={{ fontSize:11, fontWeight:700, color, background:colorLight, padding:"3px 8px", borderRadius:999 }}>{trend}</span>}
      </div>
      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:28, fontWeight:800, color:C.text, lineHeight:1, marginBottom:4 }}>{value}</div>
      <div style={{ fontSize:13, fontWeight:600, color:C.textSub }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{sub}</div>}
    </div>
  );
}

function ScoreChip({ score }: { score: number }) {
  const color = score>=80 ? C.green : score>=50 ? C.amber : C.red;
  const bg    = score>=80 ? C.greenLight : score>=50 ? C.amberLight : C.redLight;
  return <span style={{ padding:"3px 10px", borderRadius:999, fontSize:12, fontWeight:700, background:bg, color, border:`1px solid ${color}20`, whiteSpace:"nowrap", display:"inline-block" }}>{Math.round(score)} / 100</span>;
}

function HealthChip({ score }: { score: number }) {
  if (score>=80) return <span style={{ fontSize:11, fontWeight:800, padding:"3px 9px", borderRadius:999, background:C.greenLight, color:C.green, border:`1px solid ${C.green}30`, whiteSpace:"nowrap", display:"inline-flex", alignItems:"center", gap:4 }}>🟢 Aligned</span>;
  if (score>=50) return <span style={{ fontSize:11, fontWeight:800, padding:"3px 9px", borderRadius:999, background:C.amberLight, color:C.amber, border:`1px solid ${C.amber}30`, whiteSpace:"nowrap", display:"inline-flex", alignItems:"center", gap:4 }}>🟡 Gap</span>;
  return <span style={{ fontSize:11, fontWeight:800, padding:"3px 9px", borderRadius:999, background:C.redLight, color:C.red, border:`1px solid ${C.red}30`, whiteSpace:"nowrap", display:"inline-flex", alignItems:"center", gap:4 }}>🔴 Critical</span>;
}

function CategoryBadge({ cat }: { cat: string }) {
  const MAP: Record<string,[string,string]> = {
    "Digital & Technology Skills":[C.sky,C.skyLight],
    "Technical Skills":[C.orange,C.orangeLight],
    "Emerging Skills":[C.purple,C.purpleLight],
    "Safety Skills":[C.green,C.greenLight],
    "Tools & Equipment":[C.amber,C.amberLight],
    "Soft Skills":[C.textSub,"#f1f5f9"],
  };
  const [color,bg] = MAP[cat]||[C.textSub,"#f1f5f9"];
  return <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:999, background:bg, color, border:`1px solid ${color}25`, whiteSpace:"nowrap" }}>{cat.replace(" Skills","").replace(" & Technology","")}</span>;
}

function BridgePackModal({ data, onClose }: { data: BridgePackResponse; onClose: () => void }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const mod = data.bridge_packs[activeIdx];
  const exec = data.executive_summary;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.45)", backdropFilter:"blur(4px)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"white", borderRadius:24, maxWidth:720, width:"100%", maxHeight:"92vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 24px 80px rgba(0,0,0,0.18)" }}>
        <div style={{ padding:"22px 28px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", color:C.cyan, textTransform:"uppercase", marginBottom:6 }}>20-Hour Skill Bridge Pack</div>
            <div style={{ fontSize:17, fontWeight:800, color:C.text }}>{data.course_title}</div>
            <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
              <span style={{ padding:"3px 10px", borderRadius:999, background:C.cyanLight, color:C.cyan, fontSize:12, fontWeight:600 }}>📍 {data.district}</span>
              <span style={{ padding:"3px 10px", borderRadius:999, background:C.redLight, color:C.red, fontSize:12, fontWeight:600 }}>⚠ {data.missing_skills_count} Missing Skills</span>
              <span style={{ padding:"3px 10px", borderRadius:999, background:C.skyLight, color:C.sky, fontSize:12, fontWeight:600 }}>⏱ {data.total_bridge_pack_hours}h Total</span>
            </div>
          </div>
          <button onClick={onClose} style={{ fontSize:24, border:"none", background:"none", cursor:"pointer", color:C.textMuted }}>×</button>
        </div>
        {exec && (
          <div style={{ padding:"12px 28px", background:C.bg, borderBottom:`1px solid ${C.border}`, display:"flex", gap:24, flexWrap:"wrap" }}>
            {exec.graduate_salary_lift && <div style={{ fontSize:12, color:C.text }}>💰 <strong>Salary Lift:</strong> {exec.graduate_salary_lift}</div>}
            {exec.placement_lift && <div style={{ fontSize:12, color:C.text }}>📈 <strong>Employability:</strong> {exec.placement_lift}</div>}
            {exec.cost_per_batch && <div style={{ fontSize:12, color:C.text }}>🏗 <strong>Batch Cost:</strong> {exec.cost_per_batch}</div>}
          </div>
        )}
        {data.bridge_packs.length>1 && (
          <div style={{ padding:"12px 28px", borderBottom:`1px solid ${C.border}`, display:"flex", gap:8, overflowX:"auto" }}>
            {data.bridge_packs.map((m,i) => (
              <button key={i} onClick={() => setActiveIdx(i)} style={{ padding:"6px 14px", borderRadius:8, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, whiteSpace:"nowrap", background:activeIdx===i?C.cyan:C.bg, color:activeIdx===i?"white":C.textSub, transition:"all 0.2s" }}>{m.skill_targeted.slice(0,26)}</button>
            ))}
          </div>
        )}
        {mod && (
          <div style={{ flex:1, overflowY:"auto", padding:"22px 28px" }}>
            <div style={{ fontSize:17, fontWeight:800, color:C.text, marginBottom:6 }}>{mod.module_title}</div>
            <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
              <span style={{ padding:"3px 10px", borderRadius:999, background:C.cyanLight, color:C.cyan, fontSize:11, fontWeight:700 }}>🎯 {mod.skill_targeted}</span>
              <span style={{ padding:"3px 10px", borderRadius:999, background:C.skyLight, color:C.sky, fontSize:11, fontWeight:700 }}>⏱ {mod.duration_hours}h</span>
              <span style={{ padding:"3px 10px", borderRadius:999, background:C.bg, color:C.textSub, fontSize:11, fontWeight:700 }}>NSQF {mod.nsqf_level}</span>
            </div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", color:C.cyan, textTransform:"uppercase", marginBottom:10 }}>Sessions &amp; Activities</div>
              {mod.activities.map((act,i) => (
                <div key={i} style={{ display:"flex", gap:12, padding:"12px", marginBottom:8, background:C.bg, borderRadius:10 }}>
                  <div style={{ width:24, height:24, borderRadius:"50%", background:C.cyanLight, border:`2px solid ${C.cyanMid}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:C.cyan, flexShrink:0 }}>{i+1}</div>
                  <p style={{ fontSize:13, color:C.textSub, lineHeight:1.65, margin:0 }}>{act}</p>
                </div>
              ))}
            </div>
            {mod.assessment_criteria?.length>0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", color:C.green, textTransform:"uppercase", marginBottom:10 }}>Assessment Criteria</div>
                {mod.assessment_criteria.map((c,i) => (
                  <div key={i} style={{ display:"flex", gap:8, padding:"10px 12px", marginBottom:6, background:C.greenLight, borderRadius:10, fontSize:13, color:C.textSub }}><span style={{ color:C.green, flexShrink:0 }}>✓</span> {c}</div>
                ))}
              </div>
            )}
            {mod.tools_required?.length>0 && (
              <div>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", color:C.sky, textTransform:"uppercase", marginBottom:10 }}>Tools Required</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {mod.tools_required.map(t => (
                    <span key={t} style={{ padding:"5px 12px", borderRadius:999, background:C.skyLight, color:C.sky, fontSize:12, fontWeight:600, border:`1px solid ${C.skyMid}` }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <div style={{ padding:"16px 28px", borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:11, color:C.textMuted }}>{data.generated_by==="llm-gemini"?"🤖 AI Generated":"📋 Rule-based"} · {data.latency_ms}ms</span>
          <button onClick={onClose} style={{ padding:"10px 24px", borderRadius:10, background:C.cyan, color:"white", fontWeight:700, fontSize:14, border:"none", cursor:"pointer" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

function IndustryDemandSection({ data }: { data: IndustryDemandData | null }) {
  if (!data) return <GoalCircleLoader text="Loading Industry Demand Intelligence..." />;
  const top15 = data.top_demanded_skills.slice(0,15);
  const sectorColors = [C.purple,C.cyan,C.orange,C.green,C.sky,C.amber];
  return (
    <div id="industry" style={{ marginBottom:28 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <div style={{ width:44, height:44, borderRadius:12, background:`linear-gradient(135deg,${C.purple},${C.sky})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🏭</div>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:C.text, fontFamily:"'Playfair Display',serif" }}>Industry Demand Intelligence</div>
          <div style={{ fontSize:13, color:C.textMuted }}>What Maharashtra&apos;s industry is actually hiring for · {data.total_jobs_analyzed} active jobs analyzed</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:20 }}>
        {[
          { value:data.total_jobs_analyzed, label:"Active Job Postings Scanned", sub:"NCS + MIDC Industrial Clusters", c:C.purple },
          { value:data.total_unique_skills_demanded, label:"Unique Skills in Demand", sub:"Extracted & normalized from JDs", c:C.cyan },
          { value:data.sector_breakdown.length, label:"Sectors Covered", sub:"Manufacturing, Auto, Energy & more", c:C.orange },
        ].map((item,i) => (
          <div key={i} style={{ background:"white", borderRadius:14, padding:"18px 20px", border:`1px solid ${C.border}`, borderLeft:`4px solid ${item.c}` }}>
            <div style={{ fontSize:26, fontWeight:800, color:C.text }}>{item.value}</div>
            <div style={{ fontSize:13, color:C.textSub, fontWeight:600 }}>{item.label}</div>
            <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{item.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:16 }}>
        <div style={{ background:"white", borderRadius:16, border:`1px solid ${C.border}`, overflow:"hidden" }}>
          <div style={{ padding:"18px 22px", borderBottom:`1px solid ${C.border}`, background:`linear-gradient(135deg,${C.purpleLight},${C.cyanLight})` }}>
            <div style={{ fontSize:15, fontWeight:800, color:C.text }}>Top Demanded Skills (Industry-Wide)</div>
            <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>Ranked by frequency across all active job postings</div>
          </div>
          <div style={{ maxHeight:480, overflowY:"auto" }}>
            {top15.map((s,i) => (
              <div key={s.skill} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 20px", borderBottom:`1px solid ${C.border}`, transition:"background 0.15s" }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background=C.bg}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background="white"}
              >
                <div style={{ width:26, height:26, borderRadius:8, background:i<3?`linear-gradient(135deg,${C.purple},${C.cyan})`:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:i<3?"white":C.textMuted, flexShrink:0 }}>{i+1}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.skill}</div>
                  <div style={{ display:"flex", gap:6, marginTop:3, flexWrap:"wrap" }}>
                    <CategoryBadge cat={s.category} />
                    <span style={{ fontSize:10, color:C.textMuted }}>{s.top_sector}</span>
                  </div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:C.purple }}>{s.demand_pct}%</div>
                  <div style={{ fontSize:10, color:C.textMuted }}>{s.unique_employers} employers</div>
                </div>
                <div style={{ width:70 }}>
                  <div style={{ height:5, background:C.bg, borderRadius:999 }}>
                    <div style={{ height:5, width:`${Math.min(100,s.demand_pct*2)}%`, background:i<3?`linear-gradient(90deg,${C.purple},${C.cyan})`:C.cyanMid, borderRadius:999 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background:"white", borderRadius:16, border:`1px solid ${C.border}`, overflow:"hidden" }}>
          <div style={{ padding:"18px 22px", borderBottom:`1px solid ${C.border}`, background:`linear-gradient(135deg,${C.orangeLight},${C.cyanLight})` }}>
            <div style={{ fontSize:15, fontWeight:800, color:C.text }}>Demand by Sector</div>
            <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>Which sectors are driving skill demand</div>
          </div>
          <div style={{ padding:"16px 20px" }}>
            {data.sector_breakdown.slice(0,6).map((sec,i) => (
              <div key={sec.sector} style={{ marginBottom:18 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{sec.sector}</div>
                  <div style={{ fontSize:12, fontWeight:600, color:C.textMuted }}>{sec.total_job_demand} demands</div>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:6 }}>
                  {sec.top_skills.slice(0,3).map(s => (
                    <span key={s.skill} style={{ fontSize:10, padding:"2px 7px", borderRadius:999, background:C.bg, color:C.textSub, border:`1px solid ${C.border}` }}>{s.skill} ({s.count})</span>
                  ))}
                </div>
                <div style={{ height:5, background:C.bg, borderRadius:999 }}>
                  <div style={{ height:5, width:`${Math.min(100,(sec.total_job_demand/(data.sector_breakdown[0]?.total_job_demand||1))*100)}%`, background:sectorColors[i%6], borderRadius:999 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DistrictPlanSection({ districts }: { districts: DistrictSummary[] }) {
  const router = useRouter();
  const [sel, setSel] = useState("");
  const selected = districts.find(d => d.district === sel);
  return (
    <div id="districtplan" style={{ marginBottom:28 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <div style={{ width:44, height:44, borderRadius:12, background:`linear-gradient(135deg,${C.green},${C.cyan})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🗺️</div>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:C.text, fontFamily:"'Playfair Display',serif" }}>District Skill Development Plan</div>
          <div style={{ fontSize:13, color:C.textMuted }}>Select a district to generate a government-ready intervention plan</div>
        </div>
      </div>
      <div style={{ background:"white", borderRadius:16, border:`1px solid ${C.border}`, overflow:"hidden" }}>
        <div style={{ padding:"20px 24px", borderBottom:`1px solid ${C.border}`, display:"flex", gap:16, alignItems:"center", flexWrap:"wrap", background:`linear-gradient(135deg,${C.greenLight},${C.cyanLight})` }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:700, color:C.text }}>Generate District Plan</div>
            <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>Priority interventions, affected courses, trainees at risk &amp; ROI estimates</div>
          </div>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <select id="district-plan-select" value={sel} onChange={e => setSel(e.target.value)}
              style={{ padding:"10px 16px", borderRadius:10, border:`1px solid ${C.border}`, background:"white", fontSize:14, fontWeight:600, color:C.text, cursor:"pointer", outline:"none", minWidth:220 }}
            >
              <option value="">— Select a District —</option>
              {districts.map(d => <option key={d.district} value={d.district}>{d.district} · Score: {Math.round(d.avg_alignment_score)}/100</option>)}
            </select>
            {sel && (
              <button id="view-district-plan-btn" onClick={() => router.push(`/district-plan/${encodeURIComponent(sel)}`)}
                style={{ padding:"10px 20px", borderRadius:10, border:"none", background:`linear-gradient(135deg,${C.green},${C.cyan})`, color:"white", fontWeight:700, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", gap:8, boxShadow:`0 4px 14px rgba(22,163,74,0.25)`, whiteSpace:"nowrap" }}
              >📋 View Full Plan →</button>
            )}
          </div>
        </div>
        {selected ? (
          <div style={{ padding:"24px" }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
              {[
                { v:selected.active_courses, l:"Active Courses" },
                { v:selected.relevant_jobs, l:"Active Jobs" },
              ].map((item,i) => (
                <div key={i} style={{ background:C.bg, borderRadius:12, padding:"14px 16px", border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:22, fontWeight:800, color:C.text }}>{item.v}</div>
                  <div style={{ fontSize:12, color:C.textSub, fontWeight:600 }}>{item.l}</div>
                </div>
              ))}
              <div style={{ background:C.bg, borderRadius:12, padding:"14px 16px", border:`1px solid ${C.border}` }}>
                <ScoreChip score={selected.avg_alignment_score} />
                <div style={{ fontSize:12, color:C.textSub, fontWeight:600, marginTop:4 }}>Avg Alignment</div>
              </div>
              <div style={{ background:C.bg, borderRadius:12, padding:"14px 16px", border:`1px solid ${C.border}` }}>
                <span style={{ fontSize:12, fontWeight:800, padding:"4px 10px", borderRadius:999, background:selected.deficit_status==="ALIGNED"?C.greenLight:selected.deficit_status==="MODERATE"?C.amberLight:C.redLight, color:selected.deficit_status==="ALIGNED"?C.green:selected.deficit_status==="MODERATE"?C.amber:C.red }}>{selected.deficit_status}</span>
                <div style={{ fontSize:12, color:C.textSub, fontWeight:600, marginTop:4 }}>Status</div>
              </div>
            </div>
            {selected.top_missing_skills?.length>0 && (
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Top Skill Gaps in {selected.district}</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {selected.top_missing_skills.map(s => <span key={s} style={{ padding:"5px 12px", borderRadius:999, background:C.redLight, color:C.red, fontSize:12, fontWeight:600, border:`1px solid ${C.red}20` }}>⚡ {s}</span>)}
                </div>
              </div>
            )}
            <div style={{ marginTop:16, padding:"12px 16px", borderRadius:10, background:C.cyanLight, border:`1px solid ${C.cyanMid}`, fontSize:13, color:C.cyan, fontWeight:600 }}>
              💡 Click &quot;View Full Plan →&quot; for priority scores, course-level impact, employer context &amp; PDF export.
            </div>
          </div>
        ) : (
          <div style={{ padding:"32px 24px", textAlign:"center", color:C.textMuted }}>
            <div style={{ fontSize:36, marginBottom:12 }}>🗺️</div>
            <div style={{ fontSize:14, fontWeight:600 }}>Select a district above to preview the intervention plan</div>
            <div style={{ fontSize:12, marginTop:4 }}>{districts.length} districts available with gap analysis data</div>
          </div>
        )}
      </div>
    </div>
  );
}

function SkillGapSummaryBanner({ data }: { data: SkillGapSummaryData | null }) {
  if (!data || data.total_courses_analyzed===0) return null;
  const liftInCr = (data.projected_salary_lift_inr/10000000).toFixed(1);
  return (
    <div style={{ background:"white", borderRadius:16, border:`1px solid ${C.border}`, marginBottom:28, overflow:"hidden" }}>
      <div style={{ padding:"16px 24px", background:"linear-gradient(135deg,#1e1b4b 0%,#312e81 100%)", display:"flex", alignItems:"center", gap:14 }}>
        <span style={{ fontSize:24 }}>🔍</span>
        <div>
          <div style={{ fontSize:15, fontWeight:800, color:"white" }}>State-Wide Skill Gap Intelligence · PS 26134</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)", marginTop:2 }}>Deterministic analysis of {data.total_courses_analyzed} courses · For DVET &amp; Government Planning</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:0 }}>
        {[
          { label:"Critical Deficit", value:`${data.critical_deficit_courses}`, sub:`${data.critical_deficit_pct}% of courses`, color:C.red, icon:"🔴" },
          { label:"Trainees At Risk", value:data.total_trainees_at_risk.toLocaleString(), sub:"Need urgent skilling", color:C.orange, icon:"⚠️" },
          { label:"Skill Mismatch Index", value:`${data.avg_skill_mismatch_pct}%`, sub:"Skills absent from syllabi", color:C.purple, icon:"📉" },
          { label:"Est. Income Growth/Yr", value:`+₹${liftInCr} Cr`, sub:"Projected lift after bridge packs", color:C.green, icon:"📈" },
        ].map((item,i) => (
          <div key={i} style={{ padding:"20px 22px", borderRight:i<3?`1px solid ${C.border}`:"none", background:i%2===0?"white":C.bg }}>
            <div style={{ fontSize:11, fontWeight:700, color:item.color, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>{item.icon} {item.label}</div>
            <div style={{ fontSize:26, fontWeight:800, color:C.text }}>{item.value}</div>
            <div style={{ fontSize:11, color:C.textMuted, marginTop:3 }}>{item.sub}</div>
          </div>
        ))}
      </div>
      {data.state_wide_top_deficits.length>0 && (
        <div style={{ padding:"14px 24px", borderTop:`1px solid ${C.border}`, background:C.bg, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.textSub, flexShrink:0 }}>State-Wide Top Deficits:</div>
          {data.state_wide_top_deficits.slice(0,6).map(d => (
            <span key={d.skill} style={{ fontSize:11, padding:"3px 10px", borderRadius:999, background:C.redLight, color:C.red, fontWeight:600, border:`1px solid ${C.red}20` }}>{d.skill} ({d.courses_affected} courses)</span>
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardInner() {
  const { lang, setLang, t } = useLang();
  const [activeNav, setActiveNav] = useState("overview");
  const [metrics, setMetrics] = useState<Record<string,unknown>|null>(null);
  const [gaps, setGaps] = useState<GapRecord[]>([]);
  const [districts, setDistricts] = useState<DistrictSummary[]>([]);
  const [skillDict, setSkillDict] = useState<SkillDictData|null>(null);
  const [industryDemand, setIndustryDemand] = useState<IndustryDemandData|null>(null);
  const [skillGapSummary, setSkillGapSummary] = useState<SkillGapSummaryData|null>(null);
  const [engineRunning, setEngineRunning] = useState(false);
  const [engineResult, setEngineResult] = useState<Record<string,unknown>|null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string|null>(null);
  const [activeCourseAssistant, setActiveCourseAssistant] = useState<{title: string, district: string}|null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const dist = selectedDistrict || "Maharashtra";
    setNotifications([
      {
        id: "1",
        type: "alert",
        title: "Critical Skill Gap",
        message: `The alignment score for Fitter in ${dist} dropped below 55%. Immediate curriculum intervention recommended.`,
        time: "5m ago",
        isRead: false,
        actionLabel: "View District Plan",
        onAction: () => document.getElementById("districtplan")?.scrollIntoView({behavior: "smooth"})
      },
      {
        id: "2",
        type: "recommendation",
        title: "Policy Memo Ready",
        message: `Based on recent data, we recommend deploying a PLC Automation Bridge Pack in ${dist}.`,
        time: "1h ago",
        isRead: false,
        actionLabel: "Generate Memo",
        onAction: () => document.getElementById("districtplan")?.scrollIntoView({behavior: "smooth"})
      }
    ]);
  }, [selectedDistrict]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL"|"ITI"|"MSSDS">("ALL");
  const [showSkillDict, setShowSkillDict] = useState(false);
  const [bridgePackData, setBridgePackData] = useState<BridgePackResponse|null>(null);
  const [batchToast, setBatchToast] = useState<string|null>(null);
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [navigatingId, setNavigatingId] = useState<number|null>(null);
  const [isNavigatingHome, setIsNavigatingHome] = useState(false);

  const fetchAll = useCallback(async () => {
    let hasCache = false;
    if (dashMemoryCache?.m && dashMemoryCache?.g) {
      setMetrics(dashMemoryCache.m); setGaps(dashMemoryCache.g);
      setDistricts(dashMemoryCache.d||[]); setSkillDict(dashMemoryCache.s||null);
      setIndustryDemand(dashMemoryCache.ind||null); setSkillGapSummary(dashMemoryCache.sg||null);
      setMetricsLoading(false); hasCache = true;
    }
    if (!hasCache) setMetricsLoading(true);

    const safeFetch = async (endpoint: string) => {
      try {
        const url = API ? `${API}${endpoint}` : endpoint;
        const res = await fetch(url);
        if (res.ok) return await res.json();
        const fallbackRes = await fetch(endpoint);
        if (fallbackRes.ok) return await fallbackRes.json();
        return null;
      } catch {
        try {
          const fallbackRes = await fetch(endpoint);
          if (fallbackRes.ok) return await fallbackRes.json();
        } catch {}
        return null;
      }
    };

    try {
      const [m, g, d, s, ind, sg] = await Promise.all([
        safeFetch("/api/v1/metrics/overview"),
        safeFetch("/api/v1/analytics/gap-analysis"),
        safeFetch("/api/v1/analytics/district-summary"),
        safeFetch("/api/v1/skills/dictionary"),
        safeFetch("/api/v1/analytics/industry-demand"),
        safeFetch("/api/v1/analytics/skill-gap-summary"),
      ]);

      if (m) setMetrics(m);
      if (Array.isArray(g)) setGaps(g);
      if (Array.isArray(d)) setDistricts(d);
      if (s) setSkillDict(s);
      if (ind) setIndustryDemand(ind);
      if (sg) setSkillGapSummary(sg);

      if (m && Array.isArray(g)) {
        dashMemoryCache = { m, g, d, s, ind, sg, ts: Date.now() };
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const sectionIds = ["overview","courses","industry","districtplan","districts"];
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY + 120;
          let current = "overview";
          for (const id of sectionIds) { const el = document.getElementById(id); if(el&&el.offsetTop<=scrollY) current=id; }
          setActiveNav(prev => prev !== current ? current : prev);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive:true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const runEngines = async () => {
    setEngineRunning(true);
    const t0 = performance.now();
    try {
      const adminKey = process.env.NEXT_PUBLIC_ADMIN_API_KEY || "skillx-dev-secret-key-123";
      const headers = { "X-Admin-API-Key": adminKey };
      let r = await fetch(`${API}/api/v1/engines/run-all`, { method:"POST", headers }).catch(() => null);
      if (!r || !r.ok) {
        r = await fetch(`/api/v1/engines/run-all`, { method:"POST", headers }).catch(() => null);
      }
      if (r && r.ok) {
        const data = await r.json();
        setEngineResult(data); await fetchAll();
        const e1 = (data.engine1||{}) as Record<string,number>;
        const changes = (e1.courses_added||0)+(e1.courses_updated||0);
        setBatchToast(changes>0 ? `⚡ Pipeline Complete! ${changes} courses in ${data.total_latency_ms||Math.round(performance.now()-t0)}ms!` : `✓ System Up To Date — All Courses Synchronized!`);
        setTimeout(()=>setBatchToast(null),6000);
      } else {
        setBatchToast("⚠️ Backend response timeout. Retrying DB fetch...");
        await fetchAll();
        setTimeout(()=>setBatchToast(null),4000);
      }
    } catch(e){ console.error(e); }
    finally { setEngineRunning(false); }
  };

  const filteredGaps = useMemo(()=>gaps.filter(g=>{
    if(search){const q=search.toLowerCase();if(!g.course_title.toLowerCase().includes(q)&&!(g.sector||"").toLowerCase().includes(q)&&!(g.district||"").toLowerCase().includes(q)&&!(g.missing_skills||[]).some(s=>s.toLowerCase().includes(q)))return false;}
    if(filterType!=="ALL"&&g.institute_type!==filterType)return false;
    if(selectedDistrict&&g.district!==selectedDistrict)return false;
    return true;
  }),[gaps,search,filterType,selectedDistrict]);

  const totalPages = useMemo(()=>Math.ceil(filteredGaps.length/PAGE_SIZE),[filteredGaps.length]);
  const pagedGaps = useMemo(()=>filteredGaps.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE),[filteredGaps,currentPage]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{setCurrentPage(1);},[search,filterType,selectedDistrict]);

  const totalCourses=(metrics as Record<string,number>)?.total_courses??0;
  const totalJobs=(metrics as Record<string,number>)?.total_relevant_jobs??0;
  const avgScore=(metrics as Record<string,number>)?.avg_alignment_score_percentage??0;
  const deficitDistricts=(metrics as Record<string,number>)?.high_deficit_districts_count??0;
  const criticalCount=skillGapSummary?.critical_deficit_courses??0;
  const criticalPct=skillGapSummary?.critical_deficit_pct??0;
  const traineeRisk=skillGapSummary?.total_trainees_at_risk??0;
  const mismatchPct=skillGapSummary?.avg_skill_mismatch_pct??0;

  return (
    <div style={{ display:"flex", background:C.bg, minHeight:"100vh", fontFamily:"'Inter',sans-serif" }}>
      <style jsx global>{`
        @keyframes spinGrad{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <Sidebar active={activeNav} onSelect={setActiveNav} />

      <main style={{ marginLeft:240, flex:1, padding:"28px 32px", overflowX:"hidden" }}>

        {/* Overview Header & Controls */}
        <div id="overview">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:16 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                <button onClick={()=>{setIsNavigatingHome(true);router.push("/");}} disabled={isNavigatingHome}
                  style={{ padding:"5px 12px", borderRadius:999, border:`1px solid ${C.border}`, background:"white", color:C.textSub, fontSize:12, fontWeight:700, cursor:isNavigatingHome?"wait":"pointer", display:"inline-flex", alignItems:"center", gap:6, boxShadow:"0 1px 3px rgba(0,0,0,0.04)", transition:"all 0.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
                  onMouseEnter={e=>{ (e.currentTarget as HTMLButtonElement).style.borderColor = C.cyanMid; (e.currentTarget as HTMLButtonElement).style.color = C.cyan; }}
                  onMouseLeave={e=>{ (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.color = C.textSub; }}
                >
                  {isNavigatingHome?<><span style={{fontSize:11,animation:"spin 1s linear infinite"}}>⏳</span><span>Returning...</span></>:<><span>←</span> Landing Page</>}
                </button>
              </div>
              <div style={{ fontSize:24, fontWeight:900, color:C.text, fontFamily:"'Playfair Display',serif" }}>{t.adminPortal}</div>
              <div style={{ fontSize:13, color:C.textMuted, marginTop:2 }}>{t.appSubtitle} · Real-Time · {districts.length} Districts · PS 26134</div>
            </div>

            <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
              <Link href="/student" className="btn-light" style={{ padding:"8px 18px", fontSize:13, borderRadius:999 }}>
                🎓 Student Portal
              </Link>

              <NotificationCenter 
                items={notifications} 
                onMarkAllRead={() => setNotifications(n => n.map(x => ({ ...x, isRead: true })))}
                align="left"
              />

              <button id="top-skill-dict-btn" onClick={()=>setShowSkillDict(true)}
                style={{ padding:"8px 16px", borderRadius:999, border:`1px solid ${C.cyanMid}`, background:C.cyanLight, color:C.cyan, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6, transition:"all 0.2s cubic-bezier(0.4, 0, 0.2, 1)", boxShadow:"0 1px 3px rgba(8,145,178,0.08)" }}
                onMouseEnter={e=>{ (e.currentTarget as HTMLButtonElement).style.background=C.cyanMid; }}
                onMouseLeave={e=>{ (e.currentTarget as HTMLButtonElement).style.background=C.cyanLight; }}
              ><span>📖</span><span>{t.skillDictionary}</span></button>

              <div style={{ position:"relative", display:"inline-flex", alignItems:"center" }}>
                <select id="language-selector" value={lang} onChange={e=>setLang(e.target.value as "en"|"mr"|"hi")}
                  style={{ appearance:"none", WebkitAppearance:"none", padding:"8px 32px 8px 14px", borderRadius:999, border:`1px solid ${C.border}`, background:"white", fontSize:13, fontWeight:700, color:C.text, cursor:"pointer", outline:"none", transition:"all 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}
                >
                  <option value="en">🌐 English</option><option value="mr">🌐 मराठी</option><option value="hi">🌐 हिंदी</option>
                </select>
                <span style={{ position:"absolute", right:12, pointerEvents:"none", fontSize:10, color:C.textMuted }}>▼</span>
              </div>

              <button id="run-all-btn" onClick={runEngines} disabled={engineRunning} className="btn-dark"
                style={{ padding:"9px 20px", fontSize:13, borderRadius:999, opacity:engineRunning?0.7:1 }}>
                {engineRunning?<>⚡ Running Pipeline...</>:<>⚡ {t.runEngines}</>}
              </button>
            </div>
          </div>

          {batchToast && (
            <div style={{ background:"linear-gradient(135deg,#16a34a,#15803d)", color:"white", borderRadius:12, padding:"14px 20px", marginBottom:20, fontSize:14, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"space-between", animation:"fadeInUp 0.3s ease" }}>
              <span>{batchToast}</span>
              <button onClick={()=>setBatchToast(null)} style={{ background:"none", border:"none", color:"white", fontSize:18, cursor:"pointer" }}>×</button>
            </div>
          )}
          {engineResult && (
            <div style={{ background:C.greenLight, borderRadius:12, padding:"14px 20px", marginBottom:20, border:`1px solid rgba(34,197,94,0.2)`, display:"flex", gap:24, alignItems:"center", flexWrap:"wrap" }}>
              <span style={{ fontSize:13, fontWeight:700, color:C.green }}>✓ Pipeline completed in {(engineResult as Record<string,number>).total_latency_ms}ms</span>
              {[["engine1","E1"],["engine2","E2"],["engine3","E3"],["engine4","E4"]].map(([key,label])=>{
                const e=(engineResult as Record<string,Record<string,unknown>>)[key];
                const val=e?.latency_ms;
                return val!=null?<span key={key} style={{fontSize:12,color:C.green}}>{label}: {String(val)}ms</span>:null;
              })}
            </div>
          )}

          {/* KPI Cards */}
          {metricsLoading ? (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:28 }}>
              {[0,1,2,3].map(i=><div key={i} style={{background:C.card,borderRadius:16,padding:"20px 22px",border:`1px solid ${C.border}`,height:110,opacity:0.5,animation:"pulse 1.5s infinite"}}/>)}
            </div>
          ) : (
            <>
              <div style={{ marginBottom:10 }}><div style={{ fontSize:11, fontWeight:800, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Government Decision Dashboard · Key Performance Indicators</div></div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:28 }}>
                <KPICard label="Critical Deficit Courses" value={criticalCount} sub={`${criticalPct}% of all courses`} icon="🔴" color={C.red} colorLight={C.redLight} trend="Needs Action" />
                <KPICard label="Trainees At Risk" value={traineeRisk>0?traineeRisk.toLocaleString():totalJobs.toLocaleString()} sub={traineeRisk>0?"Need urgent skilling":`${districts.length} Districts`} icon="⚠️" color={C.orange} colorLight={C.orangeLight} />
                <KPICard label="Skill Mismatch Index" value={mismatchPct>0?`${mismatchPct}%`:`${Math.round(100-avgScore)}%`} sub="Skills absent from syllabi" icon="📉" color={C.purple} colorLight={C.purpleLight} />
                <KPICard label="Districts Need Intervention" value={deficitDistricts} sub="Avg score < 75" icon="🗺️" color={C.cyan} colorLight={C.cyanLight} />
              </div>
            </>
          )}

          <SkillGapSummaryBanner data={skillGapSummary} />
        </div>

        {/* Course Table */}
        <div id="courses" style={{ background:"white", borderRadius:16, border:`1px solid ${C.border}`, overflow:"hidden", marginBottom:28, boxShadow:"0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ padding:"20px 24px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:C.text }}>{t.courseAlignment}</div>
              <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>{filteredGaps.length} of {gaps.length} courses{selectedDistrict?` · ${selectedDistrict}`:" · All Districts"} — Page {currentPage} of {totalPages||1}</div>
            </div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
              {activeCourseAssistant && (
                <CourseAssistantModal 
                  courseTitle={activeCourseAssistant.title} 
                  district={activeCourseAssistant.district} 
                  onClose={() => setActiveCourseAssistant(null)} 
                />
              )}
              {selectedDistrict && <button onClick={()=>setSelectedDistrict(null)} style={{ padding:"7px 12px", borderRadius:8, border:`1px solid ${C.cyanMid}`, background:C.cyanLight, color:C.cyan, fontSize:12, fontWeight:600, cursor:"pointer" }}>📍 {selectedDistrict} ×</button>}
              <select id="course-type-select" value={filterType} onChange={e=>setFilterType(e.target.value as "ALL"|"ITI"|"MSSDS")}
                style={{ padding:"8px 14px", borderRadius:10, border:`1px solid ${C.border}`, background:"white", fontSize:13, fontWeight:600, color:C.text, cursor:"pointer", outline:"none" }}>
                <option value="ALL">All Course Types</option><option value="ITI">ITI Trades Only</option><option value="MSSDS">MSSDS Courses Only</option>
              </select>
              <input id="course-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search title, sector, district, skill…"
                style={{ padding:"8px 14px", borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, color:C.text, background:C.bg, outline:"none", width:260 }} />
            </div>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:C.cyanLight }}>
                  {["#",t.courseTitle,"Type & Sector","Location","Health","Score","Skill Status","Action"].map(h=>(
                    <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:800, color:C.cyan, textTransform:"uppercase", letterSpacing:"0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedGaps.length===0 ? (
                  <tr><td colSpan={8} style={{ padding:"48px", textAlign:"center", color:C.textMuted, fontSize:14 }}>No courses match your filters. Run engines to populate data.</td></tr>
                ) : pagedGaps.map((gap,i) => {
                  const rowNum=(currentPage-1)*PAGE_SIZE+i+1;
                  const fullyCount=gap.fully_covered_count??(gap.fully_covered_skills||[]).length;
                  const partialCount=gap.partially_covered_count??(gap.partially_covered_skills||[]).length;
                  const missingCount=gap.missing_count??(gap.missing_skills||[]).length;
                  const topMissing=(gap.missing_skills||[]).slice(0,2);
                  return (
                    <tr key={gap.id} style={{ borderBottom:`1px solid ${C.border}`, background:i%2===0?"white":"#fcfdfe", transition:"background 0.2s" }}
                      onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=C.cyanLight}
                      onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background=i%2===0?"white":"#fcfdfe"}
                    >
                      <td style={{ padding:"12px 16px", fontSize:11, color:C.textMuted, fontWeight:700 }}>{rowNum}</td>
                      <td style={{ padding:"12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:C.text, lineHeight:1.3 }}>{gap.course_title}</div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveCourseAssistant({title: gap.course_title, district: gap.district}); }}
                            style={{ background: "#cffafe", border: "none", borderRadius: 999, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: "#0891b2", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                          >
                            <span>✨</span> Ask AI
                          </button>
                        </div>
                        <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>ID #{gap.course_id}</div>
                      </td>
                      <td style={{ padding:"12px 16px" }}>
                        <span style={{ fontSize:11, fontWeight:800, padding:"3px 8px", borderRadius:999, background:gap.institute_type==="ITI"?C.skyLight:C.purpleLight, color:gap.institute_type==="ITI"?C.sky:C.purple, border:`1px solid ${gap.institute_type==="ITI"?C.skyMid:"#e9d5ff"}` }}>{gap.institute_type}</span>
                        <div style={{ fontSize:12, color:C.textSub, marginTop:4 }}>{gap.sector}</div>
                      </td>
                      <td style={{ padding:"12px 16px" }}>
                        <button onClick={()=>setSelectedDistrict(gap.district===selectedDistrict?null:gap.district)} style={{ background:"none", border:"none", cursor:"pointer", color:C.text, padding:0, fontSize:13, fontWeight:600 }}>📍 {gap.district}</button>
                      </td>
                      <td style={{ padding:"12px 16px" }}><HealthChip score={gap.alignment_score} /></td>
                      <td style={{ padding:"12px 16px" }}><ScoreChip score={gap.alignment_score} /></td>
                      <td style={{ padding:"12px 16px" }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                          {fullyCount>0 && <div style={{ fontSize:11, color:C.green, fontWeight:700 }}>✓ {fullyCount} Mastered</div>}
                          {partialCount>0 && <div style={{ fontSize:11, color:C.amber, fontWeight:700 }}>◐ {partialCount} Partial</div>}
                          {missingCount>0 ? <div style={{ fontSize:11, color:C.red, fontWeight:700 }}>✕ {topMissing.join(", ")}{missingCount>2?` (+${missingCount-2})`:""}</div> : <div style={{ fontSize:11, color:C.green, fontWeight:700 }}>🌟 100% Aligned</div>}
                        </div>
                      </td>
                      <td style={{ padding:"12px 16px" }}>
                        {missingCount>0 ? (
                          <button onClick={()=>{setNavigatingId(gap.course_id);router.push(`/bridge-pack/${gap.course_id}`);}} disabled={navigatingId===gap.course_id}
                            style={{ padding:"8px 16px", borderRadius:8, border:"none", background:navigatingId===gap.course_id?"#475569":`linear-gradient(135deg,${C.orange},#ea580c)`, color:"white", fontSize:12, fontWeight:700, cursor:navigatingId===gap.course_id?"wait":"pointer", whiteSpace:"nowrap", boxShadow:`0 2px 8px rgba(249,115,22,0.2)`, transition:"all 0.25s", display:"inline-flex", alignItems:"center", gap:6 }}>
                            {navigatingId===gap.course_id?<><span style={{fontSize:11,animation:"spin 1s linear infinite"}}>⏳</span><span>Opening...</span></>:<span>⚡ Upgrade Plan ↗</span>}
                          </button>
                        ) : <span style={{ fontSize:11, color:C.green, fontWeight:700 }}>✓ No Action</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages>1 && (
            <div style={{ padding:"20px 24px", borderTop:`1px solid ${C.border}`, display:"flex", flexDirection:"column", alignItems:"center", gap:12, background:C.bg }}>
              <span style={{ fontSize:12, color:C.textMuted }}>Showing {(currentPage-1)*PAGE_SIZE+1}–{Math.min(currentPage*PAGE_SIZE,filteredGaps.length)} of {filteredGaps.length} courses</span>
              <div style={{ display:"flex", gap:6, alignItems:"center", justifyContent:"center", flexWrap:"wrap" }}>
                <button id="prev-page" onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1} style={{ padding:"7px 16px", borderRadius:8, border:`1px solid ${C.border}`, background:"white", cursor:"pointer", fontSize:13, fontWeight:600, opacity:currentPage===1?0.4:1 }}>← Prev</button>
                {Array.from({length:Math.min(totalPages,8)},(_,i)=>i+1).map(p=>(
                  <button key={p} id={`page-${p}`} onClick={()=>setCurrentPage(p)} style={{ padding:"7px 13px", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:700, background:currentPage===p?C.cyan:"white", color:currentPage===p?"white":C.textSub, border:currentPage===p?"none":`1px solid ${C.border}` }}>{p}</button>
                ))}
                {totalPages>8 && <span style={{ color:C.textMuted, fontSize:13 }}>… {totalPages}</span>}
                <button id="next-page" onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages} style={{ padding:"7px 16px", borderRadius:8, border:`1px solid ${C.border}`, background:"white", cursor:"pointer", fontSize:13, fontWeight:600, opacity:currentPage===totalPages?0.4:1 }}>Next →</button>
              </div>
            </div>
          )}
        </div>

        {/* Industry Demand */}
        <IndustryDemandSection data={industryDemand} />

        {/* District Plan */}
        <DistrictPlanSection districts={districts} />

        {/* Districts */}
        <div id="districts" style={{ marginBottom:24 }}>
          <div style={{ background:"white", borderRadius:16, padding:"24px", border:`1px solid ${C.border}`, marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:800, color:C.text }}>District Labour Market Alignment</div>
                <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>All {districts.length} Maharashtra districts with live data</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <label htmlFor="district-dropdown-select" style={{ fontSize:13, fontWeight:700, color:C.cyan }}>Filter District:</label>
                <select id="district-dropdown-select" value={selectedDistrict||""} onChange={e=>setSelectedDistrict(e.target.value||null)}
                  style={{ padding:"9px 16px", borderRadius:10, border:`1px solid ${C.cyanMid}`, background:C.cyanLight, fontSize:13, fontWeight:700, color:C.cyan, cursor:"pointer", outline:"none" }}>
                  <option value="">All {districts.length} Districts</option>
                  {districts.map(d=><option key={d.district} value={d.district}>📍 {d.district} ({d.active_courses} · {Math.round(d.avg_alignment_score)}/100)</option>)}
                </select>
              </div>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:16 }}>
            <div style={{ background:"white", borderRadius:16, padding:"24px", border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:4 }}>Course Type Split</div>
              <div style={{ fontSize:12, color:C.textMuted, marginBottom:16 }}>ITI vs MSSDS catalogue</div>
              <div style={{ height:210 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[
                      { name:`ITI (${(metrics as Record<string,number>)?.iti_courses_count??0})`, value:(metrics as Record<string,number>)?.iti_courses_count??0 },
                      { name:`MSSDS (${(metrics as Record<string,number>)?.mssds_courses_count??0})`, value:(metrics as Record<string,number>)?.mssds_courses_count??0 }
                    ]} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                      <Cell fill={C.orange} /><Cell fill={C.cyan} />
                    </Pie>
                    <Legend formatter={v=><span style={{fontSize:12,color:C.textSub}}>{v}</span>} />
                    <Tooltip contentStyle={{borderRadius:10,fontSize:13}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{ background:"white", borderRadius:16, padding:"24px", border:`1px solid ${C.border}`, overflowY:"auto", maxHeight:340 }}>
              <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:16 }}>District Overview ({districts.length})</div>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr>{["District","Courses","Jobs","Score","Status","Plan"].map(h=><th key={h} style={{ textAlign:"left", padding:"8px 10px", fontSize:11, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.06em", borderBottom:`1px solid ${C.border}` }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {districts.map(d=>(
                    <tr key={d.district} style={{ borderBottom:`1px solid ${C.border}`, cursor:"pointer" }} onClick={()=>setSelectedDistrict(d.district===selectedDistrict?null:d.district)}>
                      <td style={{ padding:"10px", fontSize:13, fontWeight:600, color:selectedDistrict===d.district?C.cyan:C.text }}>{selectedDistrict===d.district?"▶ ":""}{d.district}</td>
                      <td style={{ padding:"10px", fontSize:13, color:C.textSub }}>{d.active_courses}</td>
                      <td style={{ padding:"10px", fontSize:13, color:C.textSub }}>{d.relevant_jobs}</td>
                      <td style={{ padding:"10px" }}><ScoreChip score={d.avg_alignment_score} /></td>
                      <td style={{ padding:"10px" }}><span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:999, background:d.deficit_status==="ALIGNED"?C.greenLight:d.deficit_status==="MODERATE"?C.amberLight:C.redLight, color:d.deficit_status==="ALIGNED"?C.green:d.deficit_status==="MODERATE"?C.amber:C.red }}>{d.deficit_status}</span></td>
                      <td style={{ padding:"10px" }}><Link href={`/district-plan/${encodeURIComponent(d.district)}`} style={{ fontSize:11, color:C.cyan, fontWeight:700, textDecoration:"none", padding:"3px 8px", borderRadius:6, background:C.cyanLight, border:`1px solid ${C.cyanMid}` }} onClick={e=>e.stopPropagation()}>📋 Plan</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Status banner */}
        <div style={{ background:C.cyanLight, borderRadius:16, padding:"20px 24px", border:`1px solid ${C.cyanMid}`, display:"flex", alignItems:"center", gap:16, marginBottom:24 }}>
          <span style={{ fontSize:24 }}>⚡</span>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:C.cyan }}>Real-Time DVET &amp; MSSDS Ingestion Engine Active</div>
            <div style={{ fontSize:12, color:C.textSub }}>SHA-256 hashing · Zero API cost · {totalCourses} courses &amp; {totalJobs} jobs across {districts.length} districts{(engineResult as Record<string,number>)?.total_latency_ms?` · Last run: ${(engineResult as Record<string,number>).total_latency_ms}ms`:""}</div>
          </div>
        </div>
      </main>

      {bridgePackData && <BridgePackModal data={bridgePackData} onClose={()=>setBridgePackData(null)} />}
      {showSkillDict && skillDict && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.45)", backdropFilter:"blur(4px)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"white", borderRadius:24, maxWidth:660, width:"100%", maxHeight:"85vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 24px 80px rgba(0,0,0,0.18)" }}>
            <div style={{ padding:"20px 24px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:17, fontWeight:800, color:C.text }}>Skill Dictionary</div>
                <div style={{ fontSize:12, color:C.cyan, marginTop:2 }}>{skillDict.standard_dictionary_count} canonical skills · {skillDict.candidate_unknown_skills.length} unknown candidates</div>
              </div>
              <button id="close-skill-dict" onClick={()=>setShowSkillDict(false)} style={{ fontSize:24, border:"none", background:"none", cursor:"pointer", color:C.textMuted }}>×</button>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"16px 24px" }}>
              {skillDict.dictionary.map(item=>(
                <div key={item.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"12px 0", borderBottom:`1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{item.standard_name}</div>
                    {item.synonyms?.length>0 && <div style={{ fontSize:11, color:C.textMuted, marginTop:3, maxWidth:420 }}>{item.synonyms.slice(0,5).join(", ")}{item.synonyms.length>5?` +${item.synonyms.length-5} more`:""}</div>}
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:999, background:C.cyanLight, color:C.cyan, border:`1px solid ${C.cyanMid}`, whiteSpace:"nowrap", marginLeft:12 }}>{item.category}</span>
                </div>
              ))}
            </div>
            <div style={{ padding:"16px 24px", borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"flex-end" }}>
              <button id="close-skill-dict-footer" onClick={()=>setShowSkillDict(false)} style={{ padding:"9px 20px", borderRadius:10, background:C.cyan, color:"white", fontWeight:700, border:"none", cursor:"pointer" }}>Close</button>
            </div>
          </div>
        </div>
      )}
      {/* ── Executive Policy AI Copilot Floating Assistant ── */}
      <GovAssistantModal selectedDistrict={selectedDistrict || undefined} />
    </div>
  );
}

export default function DashboardPage() {
  return <LangProvider><DashboardInner /></LangProvider>;
}
