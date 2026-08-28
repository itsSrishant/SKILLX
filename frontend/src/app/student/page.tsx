"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { LangProvider, useLang } from "@/lib/i18n";
import { FREE_COURSES, type FreeCourse, getFreeCoursesByDistrict, PLATFORM_COLORS } from "./data/free-courses";

// ── API base (auto-detect localhost vs production) ────────────────────────────
const API =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" &&
   (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.port === "3000")
    ? "http://localhost:8000"
    : "");

// ── Color system — EXACT match to teammate's dashboard & landing page ─────────
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
  greenMid:    "#bbf7d0",
  purple:      "#7c3aed",
  purpleLight: "#f5f3ff",
  purpleMid:   "#ddd6fe",
  red:         "#dc2626",
  redLight:    "#fef2f2",
  amber:       "#d97706",
  amberLight:  "#fffbeb",
  bg:          "#fafcfd",
  card:        "#ffffff",
  border:      "rgba(0,0,0,0.06)",
  borderMd:    "rgba(0,0,0,0.10)",
  text:        "#0f172a",
  textSub:     "#475569",
  textMuted:   "#94a3b8",
  slate800:    "#1e293b",
  slate900:    "#0f172a",
  heroGrad:    "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
};

// ── Maharashtra districts (all 36) ────────────────────────────────────────────
const MAHARASHTRA_DISTRICTS = [
  "All Districts",
  "Pune", "Mumbai City", "Mumbai Suburban", "Thane", "Nashik", "Nagpur",
  "Chhatrapati Sambhajinagar", "Palghar", "Raigad", "Solapur", "Kolhapur",
  "Ahmednagar", "Satara", "Sangli", "Amravati", "Nanded", "Latur", "Dhule",
  "Jalgaon", "Chandrapur", "Akola", "Yavatmal", "Buldhana", "Beed",
  "Parbhani", "Gondia", "Bhandara", "Washim", "Nandurbar", "Hingoli",
  "Dharashiv", "Gadchiroli", "Wardha", "Ratnagiri", "Sindhudurg", "Jalna",
];

// ── Sectors ───────────────────────────────────────────────────────────────────
const SECTORS = [
  { id: "all",           label: "All Sectors",               icon: "🏭" },
  { id: "electrical",    label: "Electrical & Energy",        icon: "⚡" },
  { id: "manufacturing", label: "Capital Goods & Manufacturing", icon: "⚙️" },
  { id: "automotive",   label: "Automotive & EV",            icon: "🚗" },
  { id: "electronics",  label: "Electronics & Automation",   icon: "🔌" },
  { id: "solar",        label: "Renewable Energy",           icon: "☀️" },
  { id: "it",           label: "Information Technology",     icon: "💻" },
  { id: "hvac",         label: "HVAC & Appliances",          icon: "❄️" },
  { id: "welding",      label: "Welding & Fabrication",      icon: "🔧" },
];

// ── Education levels ──────────────────────────────────────────────────────────
const EDUCATION_LEVELS = ["8th Pass", "10th Pass", "12th Pass", "ITI Certificate", "Diploma", "Graduate"];
const CAREER_INTERESTS = [
  "EV Technician", "Electrician", "Fitter", "Machinist", "Welder",
  "CNC Operator", "PLC Programmer", "Solar Installer", "Electronics Mechanic",
  "Auto Mechanic", "IT Support", "HVAC Technician",
];

// ── TypeScript Interfaces (canonical — matches backend engine outputs exactly) ─
interface CourseRec {
  course_id:            number;
  course_title:         string;
  institute_type:       string;
  sector:               string;
  district:             string;
  duration_months:      number;
  nsqf_level:           number;
  qualification_req:    string;
  alignment_score:      number;
  missing_skills:       string[];
  fully_covered_skills: string[];
  partially_covered_skills?: string[];
  bridge_packs_available: number;
}

interface StudentProfile {
  name:             string;
  district:         string;
  education:        string;
  currentTrade:     string;
  existingSkills:   string[];
  careerInterest:   string;
  preferredSector:  string;
  learningMode:     string;
  completedCourses: string[];
  onboardingDone:   boolean;
}

interface BridgePackData {
  course_id:                 number;
  course_title:              string;
  alignment_score:           number;
  missing_skills_count:      number;
  bridge_pack_modules_count: number;
  total_bridge_pack_hours:   number;
  bridge_packs: {
    missing_skill:       string;
    module_title:        string;
    skill_targeted:      string;
    duration_hours:      number;
    nsqf_level:          number;
    activities:          string[];
    assessment_criteria: string[];
    tools_required:      string[];
  }[];
}

const DEFAULT_PROFILE: StudentProfile = {
  name:             "",
  district:         "All Districts",
  education:        "",
  currentTrade:     "",
  existingSkills:   [],
  careerInterest:   "",
  preferredSector:  "",
  learningMode:     "",
  completedCourses: [],
  onboardingDone:   false,
};

// ── Profile completeness score ────────────────────────────────────────────────
function calcCompleteness(p: StudentProfile): number {
  const fields = [
    p.name, p.district, p.education, p.currentTrade,
    p.careerInterest, p.preferredSector, p.learningMode,
  ];
  const boolFields = [p.existingSkills.length > 0];
  const filled = fields.filter(Boolean).length + boolFields.filter(Boolean).length;
  return Math.round((filled / (fields.length + boolFields.length)) * 100);
}

// ──────────────────────────────────────────────────────────────────────────────
// HELPER COMPONENTS
// ──────────────────────────────────────────────────────────────────────────────

// SVG Alignment Ring (animated, 0 → score on mount)
function AlignmentRing({ score, size = 64 }: { score: number; size?: number }) {
  const [display, setDisplay] = useState(0);
  const radius  = (size - 10) / 2;
  const circ    = 2 * Math.PI * radius;
  const color   = score >= 80 ? C.green : score >= 60 ? C.orange : C.textMuted;

  useEffect(() => {
    let start = 0;
    const step = score / 40;
    const timer = setInterval(() => {
      start += step;
      if (start >= score) { setDisplay(score); clearInterval(timer); }
      else setDisplay(Math.round(start));
    }, 16);
    return () => clearInterval(timer);
  }, [score]);

  const offset = circ - (display / 100) * circ;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="rgba(0,0,0,0.07)" strokeWidth={6} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.05s linear" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: size < 56 ? 11 : 13, fontWeight: 800, color, lineHeight: 1 }}>
          {display}%
        </span>
      </div>
    </div>
  );
}

// Skill badge — green (mastered) or red (missing)
function SkillBadge({ skill, type }: { skill: string; type: "mastered" | "missing" | "partial" }) {
  const colorMap = {
    mastered: { bg: C.greenLight,   color: C.green,  prefix: "✓" },
    missing:  { bg: C.redLight,     color: C.red,    prefix: "✗" },
    partial:  { bg: C.amberLight,   color: C.amber,  prefix: "~" },
  };
  const s = colorMap[type];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 8px", borderRadius: 999,
      background: s.bg, color: s.color,
      fontSize: 10, fontWeight: 700,
      border: `1px solid ${s.color}20`,
      transition: "transform 0.15s",
      cursor: "default",
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.transform = "scale(1.06)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.transform = "none"; }}
    >
      <span style={{ fontSize: 9 }}>{s.prefix}</span> {skill}
    </span>
  );
}

// Skeleton card loader
function SkeletonCard() {
  return (
    <div style={{
      background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
      padding: 20, display: "flex", flexDirection: "column", gap: 12,
    }}>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
      {[70, 100, 50, 80, 60].map((w, i) => (
        <div key={i} style={{
          height: i === 1 ? 20 : 12, width: `${w}%`, borderRadius: 6,
          background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
          backgroundSize: "800px 100%",
          animation: "shimmer 1.5s infinite linear",
        }} />
      ))}
    </div>
  );
}

// Inline score health chip
function ScoreChip({ score }: { score: number }) {
  const color = score >= 80 ? C.green : score >= 60 ? C.amber : C.red;
  const bg    = score >= 80 ? C.greenLight : score >= 60 ? C.amberLight : C.redLight;
  const label = score >= 80 ? "Aligned" : score >= 60 ? "Moderate Gap" : "Critical Gap";
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 999, fontSize: 11,
      fontWeight: 700, background: bg, color, border: `1px solid ${color}25`,
    }}>{label}</span>
  );
}

// Progress bar component
function ProgressBar({ value, color = C.cyan, label }: { value: number; color?: string; label: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: C.textSub, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color }}>{value}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${value}%`, borderRadius: 999,
          background: color, transition: "width 1s ease",
        }} />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ONBOARDING MODAL (3-step progressive)
// ──────────────────────────────────────────────────────────────────────────────
function OnboardingModal({
  profile, onSave, onClose,
}: {
  profile: StudentProfile;
  onSave:  (p: StudentProfile) => void;
  onClose: () => void;
}) {
  const [step, setStep]       = useState(1);
  const [draft, setDraft]     = useState<StudentProfile>({ ...profile });
  const [skillInput, setSkillInput] = useState("");

  const completeness = calcCompleteness(draft);

  const set = (key: keyof StudentProfile, value: string | string[] | boolean) =>
    setDraft(prev => ({ ...prev, [key]: value }));

  const addSkill = () => {
    if (!skillInput.trim()) return;
    const skill = skillInput.trim();
    if (!draft.existingSkills.includes(skill))
      set("existingSkills", [...draft.existingSkills, skill]);
    setSkillInput("");
  };

  const removeSkill = (s: string) =>
    set("existingSkills", draft.existingSkills.filter(x => x !== s));

  const stepTitles = ["Basic Info", "Skills & Trade", "Goals & Preferences"];

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: `1.5px solid ${C.border}`, background: C.bg,
    fontSize: 13, color: C.text, outline: "none",
    fontFamily: "'Inter', sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: C.textSub,
    display: "block", marginBottom: 6,
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(15,23,42,0.65)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        background: C.card, borderRadius: 20, width: "100%", maxWidth: 560,
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ background: C.heroGrad, padding: "24px 28px", color: "white" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: "0.08em", opacity: 0.7, fontWeight: 700, marginBottom: 4 }}>
                SKILL PROFILE SETUP · STEP {step} OF 3
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700 }}>
                {stepTitles[step - 1]}
              </div>
            </div>
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.15)", border: "none",
              borderRadius: 8, color: "white", fontSize: 18, width: 36, height: 36,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>×</button>
          </div>
          {/* Step dots */}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                height: 4, borderRadius: 2, flex: 1,
                background: i <= step ? C.orange : "rgba(255,255,255,0.2)",
                transition: "background 0.3s",
              }} />
            ))}
          </div>
          {/* Completeness */}
          <div style={{ marginTop: 12, fontSize: 11, opacity: 0.85 }}>
            Profile Completeness: <strong>{completeness}%</strong>
            {completeness < 60 && " — Add more info for better recommendations"}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          {step === 1 && (
            <>
              <div>
                <label style={labelStyle}>👤 Your Name</label>
                <input value={draft.name} onChange={e => set("name", e.target.value)}
                  placeholder="e.g. Rohit Shinde" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>📍 Your District</label>
                <select value={draft.district} onChange={e => set("district", e.target.value)} style={inputStyle}>
                  {MAHARASHTRA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>🎓 Education Level</label>
                <select value={draft.education} onChange={e => set("education", e.target.value)} style={inputStyle}>
                  <option value="">Select education...</option>
                  {EDUCATION_LEVELS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label style={labelStyle}>🔧 Current Trade / Course</label>
                <input value={draft.currentTrade}
                  onChange={e => set("currentTrade", e.target.value)}
                  placeholder="e.g. Electrician, Fitter, Turner..." style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>💡 Your Existing Skills</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                    placeholder="Type a skill and press Enter..." style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={addSkill} style={{
                    padding: "10px 16px", borderRadius: 10, border: "none",
                    background: C.orange, color: "white", fontWeight: 700,
                    fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
                  }}>+ Add</button>
                </div>
                {draft.existingSkills.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {draft.existingSkills.map(s => (
                      <span key={s} style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "4px 10px", borderRadius: 999,
                        background: C.cyanLight, color: C.cyan,
                        fontSize: 11, fontWeight: 700, border: `1px solid ${C.cyanMid}`,
                      }}>
                        {s}
                        <button onClick={() => removeSkill(s)} style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: C.cyan, fontSize: 14, lineHeight: 1, padding: 0,
                        }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label style={labelStyle}>🎯 Target Career Goal</label>
                <select value={draft.careerInterest} onChange={e => set("careerInterest", e.target.value)} style={inputStyle}>
                  <option value="">Select target career...</option>
                  {CAREER_INTERESTS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>🏭 Preferred Sector</label>
                <select value={draft.preferredSector} onChange={e => set("preferredSector", e.target.value)} style={inputStyle}>
                  <option value="">Select sector...</option>
                  {SECTORS.filter(s => s.id !== "all").map(s => (
                    <option key={s.id} value={s.label}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>📚 Preferred Learning Mode</label>
                <select value={draft.learningMode} onChange={e => set("learningMode", e.target.value)} style={inputStyle}>
                  <option value="">Select mode...</option>
                  <option value="Classroom">Classroom</option>
                  <option value="Hands-On Workshop">Hands-On Workshop</option>
                  <option value="Online + Practical">Online + Practical</option>
                  <option value="Distance Learning">Distance Learning</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 28px", borderTop: `1px solid ${C.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <button onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            style={{
              padding: "10px 20px", borderRadius: 10, border: `1.5px solid ${C.border}`,
              background: "transparent", color: C.textSub, fontWeight: 600,
              fontSize: 13, cursor: "pointer",
            }}>
            {step === 1 ? "Skip for now" : "← Back"}
          </button>
          <button onClick={() => {
            if (step < 3) setStep(s => s + 1);
            else { onSave({ ...draft, onboardingDone: true }); onClose(); }
          }}
            style={{
              padding: "10px 24px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${C.orange}, #ea580c)`,
              color: "white", fontWeight: 700, fontSize: 13,
              cursor: "pointer", boxShadow: `0 4px 14px rgba(249,115,22,0.35)`,
            }}>
            {step === 3 ? "Save Profile & Explore →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// SKILL UPGRADE MODAL
// ──────────────────────────────────────────────────────────────────────────────
function SkillUpgradeModal({
  course, bridgePack, onClose,
}: {
  course:     CourseRec;
  bridgePack: BridgePackData | null;
  onClose:    () => void;
}) {
  const [activeSection, setActiveSection] = useState<"gap" | "roadmap" | "jobs" | "next">("gap");
  const [loadingBP, setLoadingBP] = useState(!bridgePack);

  const SECTION_TABS = [
    { id: "gap",     label: "Skill Gap Analysis",  icon: "🔍" },
    { id: "roadmap", label: "Learning Roadmap",    icon: "🗺️" },
    { id: "jobs",    label: "Jobs Unlocked",        icon: "💼" },
    { id: "next",    label: "Next Steps",           icon: "🚀" },
  ] as const;

  const roadmapSteps = bridgePack?.bridge_packs.map(bp => ({
    title: bp.module_title,
    skill: bp.skill_targeted,
    hours: bp.duration_hours,
    activities: bp.activities.slice(0, 2),
  })) || course.missing_skills.slice(0, 5).map(s => ({
    title: `${s} Fundamentals`,
    skill: s,
    hours: 4,
    activities: ["Hands-on workshop", "Theory assessment"],
  }));

  const jobsUnlocked = [
    "Electrician / Wireman (MIDC)",
    "EV Service Technician",
    "Solar Panel Installer",
    "Field Service Engineer",
    "Automation Technician",
  ].slice(0, course.alignment_score >= 70 ? 4 : 2);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9998,
      background: "rgba(15,23,42,0.70)", backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: C.card, borderRadius: 20, width: "100%", maxWidth: 640,
        maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,0.25)",
      }}>
        {/* Modal header */}
        <div style={{ background: C.heroGrad, padding: "20px 24px", color: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{
                  padding: "2px 10px", borderRadius: 999, fontSize: 10, fontWeight: 800,
                  background: course.institute_type === "ITI"
                    ? `rgba(249,115,22,0.25)` : `rgba(124,58,237,0.25)`,
                  color: course.institute_type === "ITI" ? "#fed7aa" : "#ddd6fe",
                  letterSpacing: "0.06em",
                }}>{course.institute_type}</span>
                <span style={{ fontSize: 11, opacity: 0.7 }}>NSQF Level {course.nsqf_level}</span>
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700 }}>
                {course.course_title}
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                {course.sector} · 📍 {course.district} · {course.duration_months} months
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <AlignmentRing score={Math.round(course.alignment_score)} size={56} />
              <button onClick={onClose} style={{
                background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8,
                color: "white", fontSize: 18, width: 34, height: 34, cursor: "pointer",
              }}>×</button>
            </div>
          </div>

          {/* Section tabs */}
          <div style={{ display: "flex", gap: 4, marginTop: 16, overflowX: "auto" }}>
            {SECTION_TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveSection(tab.id)}
                style={{
                  padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: activeSection === tab.id
                    ? "rgba(255,255,255,0.20)" : "transparent",
                  color: "white", fontWeight: activeSection === tab.id ? 700 : 400,
                  fontSize: 12, opacity: activeSection === tab.id ? 1 : 0.65,
                  transition: "all 0.2s", whiteSpace: "nowrap",
                }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modal body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {activeSection === "gap" && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>
                Current Skills → Missing Skills → Course → Career Ready
              </div>
              {/* Flow visualization */}
              {[
                { label: "✓ Skills You Have", skills: course.fully_covered_skills, color: C.green, bg: C.greenLight },
                { label: "✗ Skills You're Missing", skills: course.missing_skills, color: C.red, bg: C.redLight },
              ].map(section => (
                <div key={section.label} style={{
                  background: section.bg, borderRadius: 12, padding: "14px 16px", marginBottom: 12,
                  border: `1px solid ${section.color}20`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: section.color, marginBottom: 8 }}>
                    {section.label} ({section.skills.length})
                  </div>
                  {section.skills.length === 0 ? (
                    <div style={{ fontSize: 12, color: C.textMuted }}>None detected</div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {section.skills.map(s => (
                        <span key={s} style={{
                          padding: "3px 10px", borderRadius: 999,
                          background: "white", color: section.color,
                          fontSize: 11, fontWeight: 600, border: `1px solid ${section.color}30`,
                        }}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {/* Gap closure preview */}
              <div style={{
                background: C.purpleLight, borderRadius: 12, padding: "14px 16px",
                border: `1px solid ${C.purpleMid}`,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.purple, marginBottom: 10 }}>
                  📊 Gap Closure After This Course
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Before</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: C.red }}>
                      {course.missing_skills.length}
                    </div>
                    <div style={{ fontSize: 10, color: C.textMuted }}>Skill Gaps</div>
                  </div>
                  <div style={{ fontSize: 20 }}>→</div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>After</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: C.green }}>
                      {Math.max(0, course.missing_skills.length - course.fully_covered_skills.length)}
                    </div>
                    <div style={{ fontSize: 10, color: C.textMuted }}>Remaining</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, textAlign: "center", fontSize: 12, color: C.purple, fontWeight: 700 }}>
                  Gap Reduction: ~{Math.min(100, Math.round((course.fully_covered_skills.length / Math.max(1, course.fully_covered_skills.length + course.missing_skills.length)) * 100))}%
                </div>
              </div>
            </div>
          )}

          {activeSection === "roadmap" && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>
                20-Hour Learning Roadmap
              </div>
              <div style={{ position: "relative" }}>
                {/* Vertical line */}
                <div style={{
                  position: "absolute", left: 15, top: 8, bottom: 8,
                  width: 2, background: `linear-gradient(180deg, ${C.orange}, ${C.cyan})`,
                  borderRadius: 1,
                }} />
                {roadmapSteps.map((step, idx) => (
                  <div key={idx} style={{
                    display: "flex", gap: 16, marginBottom: 16,
                    animation: `fadeInUp 0.4s ease ${idx * 0.08}s both`,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      background: idx === 0 ? C.orange : idx < roadmapSteps.length - 1 ? C.cyan : C.green,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontWeight: 800, fontSize: 13, zIndex: 1,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    }}>{idx + 1}</div>
                    <div style={{
                      flex: 1, background: C.bg, borderRadius: 12, padding: "12px 14px",
                      border: `1px solid ${C.border}`,
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 2 }}>
                        {step.title}
                      </div>
                      <div style={{ fontSize: 11, color: C.cyan, fontWeight: 700, marginBottom: 6 }}>
                        Target: {step.skill} · {step.hours}h
                      </div>
                      {step.activities.map((act, ai) => (
                        <div key={ai} style={{ fontSize: 11, color: C.textSub, marginBottom: 2 }}>
                          • {act}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "jobs" && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>
                Jobs You Can Unlock
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {jobsUnlocked.map((job, i) => (
                  <div key={i} style={{
                    background: C.bg, borderRadius: 12, padding: "14px 16px",
                    border: `1px solid ${C.border}`, display: "flex",
                    alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 3 }}>
                        💼 {job}
                      </div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>
                        MIDC Clusters: Pune, Nashik, Thane
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: C.green }}>
                        ₹15k–22k/mo
                      </div>
                      <div style={{ fontSize: 10, color: C.textMuted }}>Policy Benchmark*</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: C.textMuted, fontStyle: "italic" }}>
                * Salary ranges are government policy benchmarks, not engine-computed values.
              </div>
            </div>
          )}

          {activeSection === "next" && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>
                Recommended Next Actions
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Link href={`/bridge-pack/${course.course_id}`} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  background: `linear-gradient(135deg, ${C.orange}, #ea580c)`,
                  borderRadius: 14, padding: "16px 20px", color: "white", textDecoration: "none",
                  boxShadow: `0 6px 20px rgba(249,115,22,0.35)`,
                  transition: "transform 0.2s",
                }}>
                  <span style={{ fontSize: 24 }}>📦</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>Get Your 20-Hour Bridge Pack</div>
                    <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
                      {course.missing_skills.length} skill gaps → personalised upgrade modules
                    </div>
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: 18 }}>→</span>
                </Link>
                <div style={{
                  background: C.skyLight, borderRadius: 14, padding: "16px 20px",
                  border: `1px solid ${C.skyMid}`, display: "flex", alignItems: "center", gap: 14,
                }}>
                  <span style={{ fontSize: 24 }}>📍</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: C.text }}>Find Nearby Institute</div>
                    <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
                      ITI/MSSDS centres in {course.district}
                    </div>
                  </div>
                  <span style={{
                    padding: "6px 12px", borderRadius: 8, background: C.sky,
                    color: "white", fontSize: 12, fontWeight: 700,
                  }}>Coming Soon</span>
                </div>
                <div style={{
                  background: C.greenLight, borderRadius: 14, padding: "16px 20px",
                  border: `1px solid ${C.greenMid}`, display: "flex", alignItems: "center", gap: 14,
                }}>
                  <span style={{ fontSize: 24 }}>✅</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: C.text }}>Save This Plan</div>
                    <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
                      Bookmark for future reference
                    </div>
                  </div>
                  <span style={{
                    marginLeft: "auto", padding: "6px 12px", borderRadius: 8,
                    background: C.green, color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}>Save</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// CAREER PATHWAY VISUALIZATION
// ──────────────────────────────────────────────────────────────────────────────
function CareerPathway({
  course, profile,
}: {
  course:  CourseRec | null;
  profile: StudentProfile;
}) {
  if (!course) return null;

  const stages = [
    {
      icon: "👤", label: "Current State",
      detail: profile.currentTrade || "Not specified",
      skills: profile.existingSkills.slice(0, 3),
      status: "active", color: C.cyan,
    },
    {
      icon: "🎯", label: "Target Role",
      detail: profile.careerInterest || "Select career goal",
      skills: [],
      status: profile.careerInterest ? "active" : "pending", color: C.orange,
    },
    {
      icon: "🔍", label: "Skill Gaps Identified",
      detail: `${course.missing_skills.length} critical gaps`,
      skills: course.missing_skills.slice(0, 3),
      status: "active", color: C.red,
    },
    {
      icon: "📚", label: "Recommended Learning",
      detail: course.course_title,
      skills: course.fully_covered_skills.slice(0, 2),
      status: "recommended", color: C.purple,
    },
    {
      icon: "📦", label: "Bridge Pack",
      detail: "20-Hour Skill Upgrade Plan",
      skills: [],
      status: "next", color: C.green,
    },
    {
      icon: "💼", label: "Job Alignment",
      detail: `${Math.round(course.alignment_score)}% Match`,
      skills: [],
      status: "future", color: C.sky,
    },
  ];

  return (
    <div style={{
      background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
      padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
    }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: C.text }}>
          Your Career Pathway
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
          Based on your profile and top recommended course
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 0, minWidth: 600, paddingBottom: 8 }}>
          {stages.map((stage, idx) => (
            <React.Fragment key={stage.label}>
              {/* Stage node */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                {/* Icon circle */}
                <div style={{
                  width: 48, height: 48, borderRadius: "50%", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 20,
                  background: stage.status === "future"
                    ? "rgba(0,0,0,0.04)" : `${stage.color}15`,
                  border: `2px solid ${stage.status === "future" ? C.border : stage.color}`,
                  marginBottom: 8,
                  opacity: stage.status === "future" ? 0.5 : 1,
                }}>{stage.icon}</div>

                {/* Label */}
                <div style={{
                  fontSize: 11, fontWeight: 700, color: stage.status === "future" ? C.textMuted : stage.color,
                  textAlign: "center", marginBottom: 4, maxWidth: 80,
                }}>{stage.label}</div>

                {/* Detail */}
                <div style={{
                  fontSize: 10, color: C.textSub, textAlign: "center",
                  maxWidth: 90, lineHeight: 1.3, marginBottom: 4,
                }}>{stage.detail}</div>

                {/* Skills preview */}
                {stage.skills.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
                    {stage.skills.map(s => (
                      <span key={s} style={{
                        fontSize: 9, padding: "1px 6px", borderRadius: 999,
                        background: `${stage.color}12`, color: stage.color, fontWeight: 600,
                      }}>{s}</span>
                    ))}
                  </div>
                )}

                {/* Status chip */}
                {stage.status === "recommended" && (
                  <span style={{
                    marginTop: 6, fontSize: 9, padding: "2px 8px", borderRadius: 999,
                    background: C.purpleLight, color: C.purple, fontWeight: 800,
                  }}>RECOMMENDED</span>
                )}
                {stage.status === "next" && (
                  <span style={{
                    marginTop: 6, fontSize: 9, padding: "2px 8px", borderRadius: 999,
                    background: C.greenLight, color: C.green, fontWeight: 800,
                  }}>NEXT STEP</span>
                )}
              </div>

              {/* Arrow connector */}
              {idx < stages.length - 1 && (
                <div style={{
                  display: "flex", alignItems: "center", paddingTop: 12, flexShrink: 0,
                  color: C.border, fontSize: 16,
                }}>→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// COURSE CARD
// ──────────────────────────────────────────────────────────────────────────────
function CourseCard({
  course, onViewUpgrade,
}: {
  course:       CourseRec;
  onViewUpgrade: (c: CourseRec) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const score = Math.round(course.alignment_score);

  const badgeColor = course.institute_type === "ITI"
    ? { bg: C.orangeLight, color: C.orange }
    : { bg: C.purpleLight, color: C.purple };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.card, borderRadius: 16,
        border: `1px solid ${hovered ? "rgba(0,0,0,0.10)" : C.border}`,
        padding: 20, display: "flex", flexDirection: "column", gap: 0,
        boxShadow: hovered ? "0 8px 28px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.03)",
        transform: hovered ? "translateY(-3px)" : "none",
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        borderTop: `3px solid ${score >= 80 ? C.green : score >= 60 ? C.orange : C.textMuted}`,
      }}
    >
      {/* Card header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 999,
            background: badgeColor.bg, color: badgeColor.color, letterSpacing: "0.06em",
          }}>{course.institute_type}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
            background: C.skyLight, color: C.sky, border: `1px solid ${C.skyMid}`,
          }}>NSQF {course.nsqf_level}</span>
        </div>
        <AlignmentRing score={score} size={52} />
      </div>

      {/* Title */}
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 15, fontWeight: 700, color: C.text,
        marginBottom: 4, lineHeight: 1.35,
      }}>{course.course_title}</div>

      {/* Meta */}
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span>📍 {course.district}</span>
        <span>🕒 {course.duration_months}mo</span>
        <span>{course.sector}</span>
      </div>

      {/* Mastered skills */}
      {course.fully_covered_skills.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 5 }}>
            Mastered Skills ({course.fully_covered_skills.length}):
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {course.fully_covered_skills.slice(0, 3).map(s => (
              <SkillBadge key={s} skill={s} type="mastered" />
            ))}
            {course.fully_covered_skills.length > 3 && (
              <span style={{ fontSize: 10, color: C.textMuted, padding: "2px 0" }}>
                +{course.fully_covered_skills.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Missing skills */}
      {course.missing_skills.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.red, marginBottom: 5 }}>
            Missing Skills ({course.missing_skills.length}):
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {course.missing_skills.slice(0, 2).map(s => (
              <SkillBadge key={s} skill={s} type="missing" />
            ))}
            {course.missing_skills.length > 2 && (
              <span style={{ fontSize: 10, color: C.textMuted, padding: "2px 0" }}>
                +{course.missing_skills.length - 2} gaps
              </span>
            )}
          </div>
        </div>
      )}

      {/* Qualification */}
      {course.qualification_req && (
        <div style={{ fontSize: 11, color: C.textSub, marginBottom: 14 }}>
          <span style={{ fontWeight: 600 }}>Eligibility:</span> {course.qualification_req}
        </div>
      )}

      {/* Score health chip */}
      <div style={{ marginBottom: 14 }}>
        <ScoreChip score={score} />
      </div>

      {/* Footer actions */}
      <div style={{
        borderTop: `1px solid ${C.border}`, paddingTop: 14,
        display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center",
      }}>
        <button onClick={() => onViewUpgrade(course)} style={{
          flex: 1, padding: "8px 14px", borderRadius: 10, border: `1.5px solid ${C.orange}`,
          background: "transparent", color: C.orange, fontWeight: 700, fontSize: 12,
          cursor: "pointer", transition: "all 0.2s",
        }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = C.orange;
            (e.currentTarget as HTMLButtonElement).style.color = "white";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = C.orange;
          }}
        >
          🔍 View Skill Plan
        </button>
        <Link href={`/bridge-pack/${course.course_id}`} style={{
          flex: 1, padding: "8px 14px", borderRadius: 10, border: "none",
          background: `linear-gradient(135deg, ${C.orange}, #ea580c)`,
          color: "white", fontWeight: 700, fontSize: 12,
          cursor: "pointer", textAlign: "center", textDecoration: "none",
          boxShadow: `0 3px 10px rgba(249,115,22,0.3)`,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
        }}>
          Get Bridge Pack →
        </Link>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// CHAT ASSISTANT (refactored)
// ──────────────────────────────────────────────────────────────────────────────
function ChatAssistant({ district }: { district: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: "bot" | "user"; text: string }[]>([
    { sender: "bot", text: "Namaste! 🙏 I am the SkillX Career Assistant. Ask me about ITI trades, salary expectations in MIDC clusters, or how 20-hour Bridge Packs work!" }
  ]);
  const [input, setInput] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  const send = useCallback(() => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    const newMsgs = [...messages, { sender: "user" as "bot" | "user", text: userMsg }];
    setMessages(newMsgs);
    setInput("");

    const q = userMsg.toLowerCase();
    let reply = "I recommend our 20-hour Skill Bridge Packs! They cover practical lab workshops with high employer demand in MIDC clusters.";
    if (q.includes("salary") || q.includes("pay") || q.includes("money"))
      reply = `Graduates completing our Skill Bridge Packs see average salary lifts from ₹12,500/mo to ₹18,500/mo (+48%) in MIDC hubs like Pune, Nashik, and Thane!`;
    else if (q.includes("bridge") || q.includes("pack") || q.includes("20"))
      reply = "Bridge Packs are 20-hour modular upgrade plans that close specific skill gaps. Each module targets one missing skill with theory + hands-on workshop + assessment.";
    else if (q.includes("iti") || q.includes("mssds") || q.includes("course"))
      reply = "Top aligned ITI trades: Electrician, Fitter, Turner, Machinist, Electronics Mechanic. MSSDS covers EV, Solar, Automation short courses. Both have Bridge Pack upgrades.";
    else if (q.includes("district") || q.includes(district.toLowerCase()))
      reply = `In ${district}, top hiring sectors include Automotive, Electronics, and Electrical Manufacturing. Tata Motors, Bajaj Auto, and Bharat Forge are active employers.`;
    else if (q.includes("nsqf"))
      reply = "NSQF = National Skills Qualifications Framework. Levels 3–5 are standard for ITI trades. Higher NSQF level = higher employer recognition and salary band.";

    setTimeout(() => {
      setMessages(prev => [...prev, { sender: "bot" as const, text: reply }]);
    }, 380);
  }, [input, messages, district]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages]);

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 999,
      padding: "12px 20px", borderRadius: 999, border: "none",
      background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})`,
      color: "white", fontWeight: 800, fontSize: 13,
      cursor: "pointer",
      boxShadow: `0 8px 24px rgba(8,145,178,0.35)`,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      🤖 Ask Skill Assistant
    </button>
  );

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 999,
      width: 340, borderRadius: 20, overflow: "hidden",
      boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
      border: `1px solid ${C.border}`, background: C.card,
      display: "flex", flexDirection: "column",
    }}>
      {/* Chat header */}
      <div style={{
        padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center",
        background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})`, color: "white",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800 }}>SkillX Career Assistant</div>
            <div style={{ fontSize: 10, opacity: 0.8 }}>ITI & MSSDS Trade Advisor</div>
          </div>
        </div>
        <button onClick={() => setOpen(false)} style={{
          background: "none", border: "none", color: "white", fontSize: 22, cursor: "pointer",
        }}>×</button>
      </div>
      {/* Messages */}
      <div ref={bodyRef} style={{
        height: 280, padding: 14, overflowY: "auto",
        display: "flex", flexDirection: "column", gap: 10, background: C.bg,
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
            maxWidth: "82%", padding: "10px 14px", borderRadius: 14,
            background: m.sender === "user" ? C.cyan : C.card,
            color: m.sender === "user" ? "white" : C.text,
            border: m.sender === "user" ? "none" : `1px solid ${C.border}`,
            fontSize: 12, lineHeight: 1.5,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}>{m.text}</div>
        ))}
      </div>
      {/* Input */}
      <div style={{
        padding: "10px 14px", background: C.card,
        borderTop: `1px solid ${C.border}`, display: "flex", gap: 8,
      }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") send(); }}
          placeholder="Ask about trades, jobs, salary..."
          style={{
            flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
            fontSize: 12, outline: "none", fontFamily: "'Inter', sans-serif",
          }} />
        <button onClick={send} style={{
          padding: "8px 14px", borderRadius: 8, border: "none",
          background: C.cyan, color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer",
        }}>Send</button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// FREE COURSE CARD (NPTEL / Coursera / Swayam / Google)
// ──────────────────────────────────────────────────────────────────────────────
function FreeCourseCard({ course, index }: { course: FreeCourse; index: number }) {
  const [hovered, setHovered] = useState(false);
  const pc = PLATFORM_COLORS[course.platform];
  const score = course.alignment_score;
  const borderColor = score >= 85 ? C.green : score >= 75 ? C.orange : C.textMuted;

  return (
    <a
      href={course.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", flexDirection: "column",
        background: C.card, borderRadius: 16,
        border: `1px solid ${hovered ? "rgba(0,0,0,0.10)" : C.border}`,
        borderTop: `3px solid ${borderColor}`,
        padding: 20, textDecoration: "none", color: "inherit",
        boxShadow: hovered ? "0 8px 28px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.03)",
        transform: hovered ? "translateY(-3px)" : "none",
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        animation: `fadeInUp 0.5s ease ${Math.min(index * 0.06, 0.5)}s both`,
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {/* Platform badge */}
          <span style={{
            fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 999,
            background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`,
            letterSpacing: "0.06em",
          }}>{course.platform}</span>
          {/* Certificate badge */}
          {course.certificate && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
              background: C.greenLight, color: C.green, border: `1px solid ${C.greenMid}`,
            }}>🎓 Certificate</span>
          )}
          {/* Free badge */}
          <span style={{
            fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 999,
            background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0",
          }}>FREE</span>
        </div>
        {/* Alignment ring */}
        <AlignmentRing score={score} size={52} />
      </div>

      {/* Title */}
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 15, fontWeight: 700, color: C.text,
        marginBottom: 4, lineHeight: 1.35,
      }}>{course.title}</div>

      {/* Provider */}
      <div style={{ fontSize: 11, color: pc.color, fontWeight: 700, marginBottom: 4 }}>
        {course.provider}
      </div>

      {/* Meta row */}
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <span>⏱ {course.duration_weeks}wk · {course.duration_hours}h</span>
        <span>📶 NSQF ~{course.nsqf_equivalent}</span>
        <span>🌐 {course.delivery_mode}</span>
      </div>

      {/* Description */}
      <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.55, marginBottom: 12, flexGrow: 1 }}>
        {course.description}
      </div>

      {/* Skills covered */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 5 }}>
          Skills Covered ({course.fully_covered_skills.length}):
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {course.fully_covered_skills.slice(0, 4).map(s => (
            <SkillBadge key={s} skill={s} type="mastered" />
          ))}
          {course.fully_covered_skills.length > 4 && (
            <span style={{ fontSize: 10, color: C.textMuted, padding: "2px 0" }}>
              +{course.fully_covered_skills.length - 4} more
            </span>
          )}
        </div>
      </div>

      {/* Languages */}
      <div style={{ fontSize: 11, color: C.textSub, marginBottom: 14 }}>
        🗣 Available in: {course.language.join(", ")}
      </div>

      {/* Footer CTA */}
      <div style={{
        borderTop: `1px solid ${C.border}`, paddingTop: 14,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ fontSize: 11, color: C.textMuted }}>
          {course.applicable_districts === "All Districts"
            ? "📍 Available in all 36 districts"
            : `📍 Best for: ${Array.isArray(course.applicable_districts) ? course.applicable_districts.slice(0, 2).join(", ") : ""}`}
        </div>
        <span style={{
          padding: "7px 16px", borderRadius: 10,
          background: `linear-gradient(135deg, ${pc.color}, ${pc.color}cc)`,
          color: "white", fontSize: 12, fontWeight: 700,
          boxShadow: `0 3px 10px ${pc.color}30`,
        }}>
          Open Course →
        </span>
      </div>
    </a>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ──────────────────────────────────────────────────────────────────────────────
function EmptyState({ district, onClear }: { district: string; onClear: () => void }) {
  return (
    <div style={{
      background: C.card, borderRadius: 20, padding: "56px 40px",
      textAlign: "center", border: `1px solid ${C.border}`,
      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
    }}>
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" style={{ margin: "0 auto 20px" }}>
        <circle cx="36" cy="36" r="36" fill={C.orangeLight} />
        <text x="36" y="44" textAnchor="middle" fontSize="28">🔍</text>
      </svg>
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10,
      }}>
        No Courses Found
      </div>
      <div style={{ fontSize: 14, color: C.textSub, marginBottom: 24, maxWidth: 380, margin: "0 auto 24px" }}>
        No courses matched your current filters in <strong>{district}</strong>.
        Try selecting a different sector or clearing your filters.
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={onClear} style={{
          padding: "10px 24px", borderRadius: 999, border: "none",
          background: `linear-gradient(135deg, ${C.orange}, #ea580c)`,
          color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer",
        }}>Clear Filters</button>
        <Link href="/" style={{
          padding: "10px 24px", borderRadius: 999,
          border: `2px solid ${C.border}`, color: C.textSub,
          fontWeight: 600, fontSize: 14, textDecoration: "none",
          display: "inline-flex", alignItems: "center",
        }}>← Back to Home</Link>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN STUDENT INNER COMPONENT
// ──────────────────────────────────────────────────────────────────────────────
function StudentInner() {
  const { lang, setLang } = useLang();

  // — Profile state (persisted in localStorage)
  const [profile, setProfile]     = useState<StudentProfile>(DEFAULT_PROFILE);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profileLoaded, setProfileLoaded]   = useState(false);

  // — Filter state
  const [selectedDistrict, setSelectedDistrict] = useState("All Districts");
  const [selectedSectors,  setSelectedSectors]  = useState<string[]>([]);
  const [search, setSearch] = useState("");

  // — Data state
  const [courses, setCourses] = useState<CourseRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // — Modal state
  const [upgradeModal, setUpgradeModal] = useState<{
    course: CourseRec; bridgePack: BridgePackData | null;
  } | null>(null);
  const [loadingBP, setLoadingBP] = useState(false);

  // — Scroll state
  const [scrolled, setScrolled] = useState(false);
  const [courseTab, setCourseTab] = useState<"iti" | "free">("iti");

  // ── Load profile from localStorage ──────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem("skillx_student_profile");
      if (saved) {
        const p: StudentProfile = JSON.parse(saved);
        setProfile(p);
        setSelectedDistrict(p.district || "All Districts");
        if (!p.onboardingDone) setShowOnboarding(true);
      } else {
        setShowOnboarding(true);
      }
    } catch { /* ignore parse errors */ }
    setProfileLoaded(true);
  }, []);

  // ── URL sync for filters ─────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    params.set("district", selectedDistrict);
    if (selectedSectors.length > 0) params.set("sector", selectedSectors.join(","));
    if (search) params.set("q", search);
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, [selectedDistrict, selectedSectors, search]);

  // ── Load courses from real API ───────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API}/api/v1/analytics/gap-analysis`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        if (Array.isArray(data)) setCourses(data);
        else setError("Unexpected data format from API.");
        setLoading(false);
      })
      .catch(err => {
        console.error("API fetch error:", err);
        setError("Backend server not reachable. Run: uvicorn app.main:app --reload");
        setLoading(false);
      });
  }, []);

  // ── Scroll listener ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // ── Save profile ─────────────────────────────────────────────────────────────
  const saveProfile = useCallback((p: StudentProfile) => {
    setProfile(p);
    setSelectedDistrict(p.district);
    try { localStorage.setItem("skillx_student_profile", JSON.stringify(p)); } catch { /* ignore */ }
  }, []);

  // ── Sector chip toggle ────────────────────────────────────────────────────────
  const toggleSector = (id: string) => {
    if (id === "all") { setSelectedSectors([]); return; }
    setSelectedSectors(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  // ── Client-side filtering (memoized) ─────────────────────────────────────────
  const filtered = useMemo(() => {
    return courses.filter(c => {
      if (selectedDistrict && selectedDistrict !== "All Districts" && c.district !== selectedDistrict) return false;
      if (selectedSectors.length > 0) {
        const sectorLabel = SECTORS.find(s => selectedSectors.includes(s.id))?.label;
        const matched = selectedSectors.some(sid => {
          const label = SECTORS.find(s => s.id === sid)?.label || "";
          return c.sector.toLowerCase().includes(label.toLowerCase().split(" ")[0].toLowerCase());
        });
        if (!matched) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (
          !c.course_title.toLowerCase().includes(q) &&
          !(c.sector || "").toLowerCase().includes(q) &&
          !(c.district || "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [courses, selectedDistrict, selectedSectors, search]);

  // ── Sort by alignment score (best first) ──────────────────────────────────────
  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => b.alignment_score - a.alignment_score),
  [filtered]);

  // ── Top recommended course ────────────────────────────────────────────────────
  const topCourse = sorted[0] || null;

  // ── Open skill upgrade modal (fetches bridge pack) ────────────────────────────
  const openUpgradeModal = useCallback(async (course: CourseRec) => {
    setUpgradeModal({ course, bridgePack: null });
    setLoadingBP(true);
    try {
      const r = await fetch(`${API}/api/v1/bridge-packs/${course.course_id}`);
      if (r.ok) {
        const data: BridgePackData = await r.json();
        setUpgradeModal({ course, bridgePack: data });
      }
    } catch { /* use null bridgePack — modal handles gracefully */ }
    setLoadingBP(false);
  }, []);

  const completeness = calcCompleteness(profile);

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: C.bg, color: C.text, minHeight: "100vh" }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity:0; } to { opacity:1; }
        }
        * { box-sizing: border-box; }
      `}</style>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {showOnboarding && profileLoaded && (
        <OnboardingModal
          profile={profile}
          onSave={p => { saveProfile(p); }}
          onClose={() => setShowOnboarding(false)}
        />
      )}
      {upgradeModal && (
        <SkillUpgradeModal
          course={upgradeModal.course}
          bridgePack={upgradeModal.bridgePack}
          onClose={() => setUpgradeModal(null)}
        />
      )}

      {/* ── Sticky Header ────────────────────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: scrolled ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.98)",
        backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${scrolled ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.04)"}`,
        boxShadow: scrolled ? "0 1px 8px rgba(0,0,0,0.06)" : "none",
        transition: "all 0.3s ease",
      }}>
        <div style={{
          maxWidth: 1280, margin: "0 auto", padding: "0 32px",
          display: "flex", justifyContent: "space-between", alignItems: "center", height: 64,
        }}>
          {/* Logo */}
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 18,
              color: "white", boxShadow: "0 4px 14px rgba(249,115,22,0.30)",
            }}>S</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: C.text }}>
                SkillX
              </div>
              <div style={{ fontSize: 9, color: C.cyan, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Student Portal
              </div>
            </div>
          </Link>

          {/* Nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Profile completeness pill */}
            {profile.onboardingDone && (
              <button onClick={() => setShowOnboarding(true)} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 999,
                border: `1px solid ${completeness >= 80 ? C.green : C.orange}`,
                background: completeness >= 80 ? C.greenLight : C.orangeLight,
                color: completeness >= 80 ? C.green : C.orange,
                fontSize: 11, fontWeight: 700, cursor: "pointer",
              }}>
                <span>👤</span>
                {profile.name || "My Profile"} · {completeness}% complete
              </button>
            )}
            <select value={lang} onChange={e => setLang(e.target.value as "en" | "mr" | "hi")}
              style={{
                padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
                background: "white", fontSize: 12, fontWeight: 600, color: C.text,
                cursor: "pointer", outline: "none",
              }}>
              <option value="en">English</option>
              <option value="mr">मराठी</option>
              <option value="hi">हिंदी</option>
            </select>
            <Link href="/dashboard" style={{
              padding: "7px 16px", borderRadius: 10,
              background: C.cyanLight, color: C.cyan,
              border: `1px solid ${C.cyanMid}`, fontWeight: 700, fontSize: 12,
              textDecoration: "none",
            }}>Govt Console →</Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ─────────────────────────────────────────────────────── */}
      <section style={{
        background: C.heroGrad, padding: "56px 32px 48px",
        color: "white", position: "relative", overflow: "hidden",
      }}>
        {/* Decorative floating shapes */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: -60, right: -60, width: 300, height: 300,
            borderRadius: "50%", background: "rgba(249,115,22,0.08)",
          }} />
          <div style={{
            position: "absolute", bottom: -40, left: "20%", width: 200, height: 200,
            borderRadius: "50%", background: "rgba(8,145,178,0.10)",
          }} />
          <div style={{
            position: "absolute", top: "30%", right: "15%", width: 120, height: 120,
            borderRadius: "50%", background: "rgba(124,58,237,0.08)",
          }} />
        </div>

        <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1 }}>
          {/* Badge */}
          <div style={{ marginBottom: 16 }}>
            <span style={{
              padding: "4px 14px", borderRadius: 999, fontSize: 10, fontWeight: 800,
              letterSpacing: "0.10em", textTransform: "uppercase" as const,
              background: "rgba(8,145,178,0.20)", color: "#cffafe",
              border: "1px solid rgba(8,145,178,0.35)",
            }}>
              Maharashtra Vocational Guidance · SIH 2026
            </span>
          </div>

          {/* Hero layout */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 32 }}>
            <div style={{ maxWidth: 680 }}>
              <h1 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 700,
                lineHeight: 1.18, marginBottom: 14, letterSpacing: "-0.01em",
              }}>
                <span style={{
                  background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>Discover Your</span>
                {" "}Future Skill Path
              </h1>
              <p style={{ fontSize: 15, color: "#94a3b8", lineHeight: 1.7, marginBottom: 28, maxWidth: 560 }}>
                Find ITI and MSSDS courses across Maharashtra's 36 districts based on your existing skills,
                career goals, and real employer demand — not a generic course catalogue.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button onClick={() => {
                  document.getElementById("filter-bar")?.scrollIntoView({ behavior: "smooth" });
                }} style={{
                  padding: "12px 28px", borderRadius: 999, border: "none",
                  background: `linear-gradient(135deg, ${C.orange}, #ea580c)`,
                  color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(249,115,22,0.40)",
                }}>Explore Courses ↓</button>
                <button onClick={() => setShowOnboarding(true)} style={{
                  padding: "12px 24px", borderRadius: 999, cursor: "pointer",
                  background: "transparent", color: "white", fontWeight: 600, fontSize: 14,
                  border: "2px solid rgba(255,255,255,0.25)",
                }}>
                  {profile.onboardingDone ? "Update My Profile" : "Set Up Profile"}
                </button>
              </div>
            </div>

            {/* Stats bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, minWidth: 260 }}>
              {[
                { num: "85",  label: "DVET ITI Trades",   color: C.orange },
                { num: "36",  label: "Districts Mapped",  color: C.cyan },
                { num: "1,200+", label: "MSSDS Courses",  color: C.purple },
                { num: "20h", label: "Bridge Pack Plans", color: C.green },
              ].map(stat => (
                <div key={stat.label} style={{
                  background: "rgba(255,255,255,0.07)",
                  backdropFilter: "blur(8px)",
                  borderRadius: 14, padding: "14px 18px",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}>
                  <div style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 26, fontWeight: 700, color: stat.color, lineHeight: 1,
                  }}>{stat.num}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.60)", marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 32px 80px" }}>

        {/* ── Student Profile Panel ───────────────────────────────────────────── */}
        {profile.onboardingDone && (
          <div style={{
            background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
            padding: "20px 24px", marginBottom: 24,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexWrap: "wrap", gap: 16,
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            animation: "fadeIn 0.4s ease both",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.orange}, ${C.cyan})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Playfair Display', serif", fontWeight: 700,
                fontSize: 18, color: "white", flexShrink: 0,
              }}>{(profile.name || "?")[0].toUpperCase()}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>
                  {profile.name || "Student"} · {profile.district}
                </div>
                <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
                  {profile.education && <span>{profile.education}</span>}
                  {profile.currentTrade && <span> · {profile.currentTrade}</span>}
                  {profile.careerInterest && <span> · 🎯 {profile.careerInterest}</span>}
                </div>
              </div>
              {/* Completeness */}
              <div style={{ minWidth: 180 }}>
                <ProgressBar value={completeness} color={completeness >= 80 ? C.green : C.orange}
                  label="Profile Completeness" />
              </div>
            </div>
            <button onClick={() => setShowOnboarding(true)} style={{
              padding: "8px 18px", borderRadius: 10, border: `1.5px solid ${C.border}`,
              background: "transparent", color: C.textSub, fontWeight: 600,
              fontSize: 12, cursor: "pointer",
            }}>Edit Profile</button>
          </div>
        )}

        {/* ── Filter Bar ─────────────────────────────────────────────────────── */}
        <div id="filter-bar" style={{
          background: C.card, borderRadius: 16, padding: "20px 24px",
          border: `1px solid ${C.border}`, marginBottom: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}>
          {/* District + Search row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textSub, display: "block", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
                📍 District
              </label>
              <select value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  border: `1.5px solid ${C.border}`, background: C.bg,
                  fontSize: 13, fontWeight: 700, color: C.text, outline: "none",
                  cursor: "pointer",
                }}>
                {MAHARASHTRA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textSub, display: "block", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
                🔎 Search
              </label>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by trade, course title, sector..."
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  border: `1.5px solid ${C.border}`, background: C.bg,
                  fontSize: 13, color: C.text, outline: "none",
                  fontFamily: "'Inter', sans-serif",
                }} />
            </div>
          </div>

          {/* Sector chips */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textSub, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
              🏭 Sector
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SECTORS.map(s => {
                const isAll    = s.id === "all";
                const isActive = isAll ? selectedSectors.length === 0 : selectedSectors.includes(s.id);
                return (
                  <button key={s.id} onClick={() => toggleSector(s.id)} style={{
                    padding: "7px 14px", borderRadius: 999, cursor: "pointer",
                    border: `1.5px solid ${isActive ? C.cyan : C.border}`,
                    background: isActive ? C.cyanLight : "white",
                    color: isActive ? C.cyan : C.textSub,
                    fontSize: 12, fontWeight: isActive ? 700 : 500,
                    transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
                    transform: isActive ? "scale(1.02)" : "none",
                  }}>
                    {s.icon} {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Results counter ────────────────────────────────────────────────── */}
        {!loading && !error && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 20,
          }}>
            <div>
              <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>
                Courses in {selectedDistrict}
              </span>
              <span style={{ fontSize: 14, color: C.textMuted, marginLeft: 8 }}>
                {sorted.length} result{sorted.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div style={{ fontSize: 12, color: C.textMuted }}>
              Sorted by alignment score · Engine 4 data
            </div>
          </div>
        )}

        {/* ── Error state ─────────────────────────────────────────────────────── */}
        {error && (
          <div style={{
            background: C.redLight, borderRadius: 14, padding: "18px 22px",
            border: `1px solid ${C.red}25`, marginBottom: 24,
            display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, color: C.red, fontSize: 14, marginBottom: 4 }}>
                Backend Not Reachable
              </div>
              <div style={{ fontSize: 12, color: C.textSub, fontFamily: "monospace" }}>{error}</div>
            </div>
          </div>
        )}

        {/* ── Loading skeletons ────────────────────────────────────────────────── */}
        {loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Personalized Dashboard strip (when profile complete) ────────────── */}
        {!loading && !error && profile.onboardingDone && topCourse && (
          <div style={{
            background: `linear-gradient(135deg, ${C.slate900} 0%, ${C.slate800} 100%)`,
            borderRadius: 16, padding: "20px 24px", marginBottom: 24, color: "white",
            display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "center",
            flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "#94a3b8", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" as const }}>
                🎯 Top Recommendation For You
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
                {topCourse.course_title}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                {topCourse.sector} · {topCourse.district} ·{" "}
                <span style={{ color: "#4ade80", fontWeight: 700 }}>
                  {Math.round(topCourse.alignment_score)}% match
                </span>
                {" "}· {topCourse.missing_skills.length} skill gaps to close
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
              <AlignmentRing score={Math.round(topCourse.alignment_score)} size={56} />
              <button onClick={() => openUpgradeModal(topCourse)} style={{
                padding: "10px 18px", borderRadius: 10, border: "none",
                background: `linear-gradient(135deg, ${C.orange}, #ea580c)`,
                color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer",
                boxShadow: "0 4px 14px rgba(249,115,22,0.40)",
              }}>View Plan →</button>
            </div>
          </div>
        )}

        {/* ── Career Pathway ────────────────────────────────────────────────────── */}
        {!loading && !error && profile.onboardingDone && topCourse && (
          <div style={{ marginBottom: 24 }}>
            <CareerPathway course={topCourse} profile={profile} />
          </div>
        )}

        {/* ── Course Tabs (ITI/MSSDS + Free Online) ─────────────────────────── */}
        {!loading && !error && (
          <div style={{ marginBottom: 24 }}>
            {/* Tab switcher */}
            <div style={{ display: "flex", gap: 0, marginBottom: 20, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, background: C.card, width: "fit-content" }}>
              {[
                { id: "iti",  label: `🏫 ITI & MSSDS Courses`, count: sorted.length },
                { id: "free", label: `🎓 Free Online Courses`, count: getFreeCoursesByDistrict(selectedDistrict).length },
              ].map(tab => (
                <button key={tab.id} onClick={() => setCourseTab(tab.id as "iti" | "free")} style={{
                  padding: "10px 20px", border: "none", cursor: "pointer", fontSize: 13,
                  fontWeight: courseTab === tab.id ? 800 : 500,
                  background: courseTab === tab.id
                    ? `linear-gradient(135deg, ${C.slate900}, ${C.slate800})`
                    : "transparent",
                  color: courseTab === tab.id ? "white" : C.textSub,
                  transition: "all 0.2s",
                }}>
                  {tab.label}
                  <span style={{
                    marginLeft: 6, padding: "1px 7px", borderRadius: 999, fontSize: 10, fontWeight: 800,
                    background: courseTab === tab.id ? "rgba(255,255,255,0.20)" : C.border,
                    color: courseTab === tab.id ? "white" : C.textSub,
                  }}>{tab.count}</span>
                </button>
              ))}
            </div>

            {/* ── TAB 1: ITI/MSSDS Courses ─── */}
            {courseTab === "iti" && (
              <>
                {sorted.length === 0 ? (
                  <EmptyState district={selectedDistrict} onClear={() => {
                    setSelectedSectors([]);
                    setSearch("");
                  }} />
                ) : (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(min(340px, 100%), 1fr))",
                    gap: 20,
                  }}>
                    {sorted.map((course, i) => (
                      <div key={course.course_id} style={{
                        animation: `fadeInUp 0.5s ease ${Math.min(i * 0.06, 0.5)}s both`,
                      }}>
                        <CourseCard course={course} onViewUpgrade={openUpgradeModal} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── TAB 2: Free Online Courses (NPTEL / Coursera / Swayam) ─── */}
            {courseTab === "free" && (
              <>
                <div style={{
                  background: C.greenLight, borderRadius: 12, padding: "12px 16px",
                  border: `1px solid ${C.greenMid}`, marginBottom: 20,
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span style={{ fontSize: 18 }}>💡</span>
                  <div style={{ fontSize: 12, color: "#166534" }}>
                    <strong>All courses below are 100% free</strong> (or free to audit). Sources: NPTEL (IITs), Swayam (Government of India), Coursera (Audit Mode), Google Digital Garage.
                    NPTEL courses offer official certificates upon exam completion.
                  </div>
                </div>

                {/* Platform legend */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  {(["NPTEL", "Coursera", "Swayam", "Google"] as const).map(p => {
                    const pc = PLATFORM_COLORS[p];
                    return (
                      <span key={p} style={{
                        padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                        background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`,
                      }}>{p}</span>
                    );
                  })}
                  <span style={{ fontSize: 11, color: C.textMuted, alignSelf: "center" }}>— click any course to open on its platform</span>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(340px, 100%), 1fr))",
                  gap: 20,
                }}>
                  {getFreeCoursesByDistrict(selectedDistrict)
                    .filter(c => {
                      if (search) {
                        const q = search.toLowerCase();
                        if (!c.title.toLowerCase().includes(q) && !c.sector.toLowerCase().includes(q) && !c.platform.toLowerCase().includes(q)) return false;
                      }
                      return true;
                    })
                    .sort((a, b) => b.alignment_score - a.alignment_score)
                    .map((course, i) => (
                      <FreeCourseCard key={course.id} course={course} index={i} />
                    ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Student Progress & Job Alignment ─────────────────────────────────── */}
        {!loading && !error && profile.onboardingDone && topCourse && (
          <div style={{ marginTop: 32 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 16 }}>
              Your Readiness Overview
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16,
            }}>
              {/* Skill coverage */}
              <div style={{
                background: C.card, borderRadius: 16, padding: "20px",
                border: `1px solid ${C.border}`, borderTop: `3px solid ${C.green}`,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, marginBottom: 12 }}>
                  Skill Coverage
                </div>
                <ProgressBar
                  value={Math.round((topCourse.fully_covered_skills.length /
                    Math.max(1, topCourse.fully_covered_skills.length + topCourse.missing_skills.length)) * 100)}
                  color={C.green} label="Skills Covered" />
                <div style={{ marginTop: 12, fontSize: 11, color: C.textMuted }}>
                  {topCourse.fully_covered_skills.length} of{" "}
                  {topCourse.fully_covered_skills.length + topCourse.missing_skills.length} skills matched
                </div>
              </div>

              {/* Alignment score */}
              <div style={{
                background: C.card, borderRadius: 16, padding: "20px",
                border: `1px solid ${C.border}`, borderTop: `3px solid ${C.orange}`,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, marginBottom: 12 }}>
                  Industry Alignment
                </div>
                <ProgressBar value={Math.round(topCourse.alignment_score)} color={C.orange} label="Employer Demand Match" />
                <div style={{ marginTop: 12, fontSize: 11, color: C.textMuted }}>
                  From Engine 4 · 3-tier gap analysis
                </div>
              </div>

              {/* Bridge pack readiness */}
              <div style={{
                background: C.card, borderRadius: 16, padding: "20px",
                border: `1px solid ${C.border}`, borderTop: `3px solid ${C.cyan}`,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, marginBottom: 12 }}>
                  Recommended Next Action
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 6 }}>
                  Get Your Bridge Pack
                </div>
                <div style={{ fontSize: 12, color: C.textSub, marginBottom: 14 }}>
                  {topCourse.missing_skills.length} skill gaps can be closed with a 20-hour targeted upgrade.
                </div>
                <Link href={`/bridge-pack/${topCourse.course_id}`} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", borderRadius: 10, textDecoration: "none",
                  background: `linear-gradient(135deg, ${C.cyan}, ${C.sky})`,
                  color: "white", fontSize: 12, fontWeight: 700,
                }}>Start Bridge Pack →</Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Floating Chat Assistant ────────────────────────────────────────────── */}
      <ChatAssistant district={selectedDistrict} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// EXPORT
// ──────────────────────────────────────────────────────────────────────────────
export default function StudentPage() {
  return (
    <LangProvider>
      <StudentInner />
    </LangProvider>
  );
}
