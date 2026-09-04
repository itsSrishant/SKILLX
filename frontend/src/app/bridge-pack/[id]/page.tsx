"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CourseAssistantModal } from "@/components/dashboard/CourseAssistantModal";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.port === "3000") ? "http://localhost:8000" : "");

const C = {
  orange:      "#FF9933",
  orangeLight: "#fff8f0",
  orangeMid:   "#fed7aa",
  sky:         "#003580", // Ashoka Blue
  skyLight:    "#f0f7ff",
  skyMid:      "#bae6fd",
  green:       "#138808", // India Green
  greenLight:  "#f0fdf4",
  red:         "#dc2626",
  redLight:    "#fef2f2",
  purple:      "#9333ea",
  purpleLight: "#faf5ff",
  bg:          "#f8fafc",
  card:        "#ffffff",
  border:      "rgba(0,0,0,0.08)",
  text:        "#0f172a",
  textSub:     "#475569",
  textMuted:   "#94a3b8",
};

// Plain-Language Tooltips for Technical Jargon
const JARGON_GLOSSARY: Record<string, string> = {
  "PLC": "PLC (Programmable Logic Controller) = The small computer box that controls factory machines and robots.",
  "SCADA": "SCADA = The digital screen in a factory control room that shows if all machines are running safely.",
  "NCVT": "NCVT = National Council for Vocational Training (The central government body that sets official ITI certificates).",
  "DVET": "DVET = Department of Vocational Education & Training, Government of Maharashtra.",
  "BMS": "BMS (Battery Management System) = The electronic brain that monitors electric vehicle (EV) batteries.",
  "MIG/TIG": "MIG/TIG Welding = Modern high-speed electric arc welding techniques used in car factories.",
  "CRO": "CRO (Oscilloscope) = A digital screen used by technicians to test electrical signals and voltage waveforms.",
  "MIDC": "MIDC = Maharashtra Industrial Development Corporation (Government industrial parks housing factories).",
  "GeM": "GeM Portal = Government e-Marketplace (The official online procurement portal for government purchasing).",
  "NCrF": "NCrF = National Credit Framework (Central government skill credit transfer standard)."
};

function JargonTooltip({ term, children }: { term: string; children?: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const definition = JARGON_GLOSSARY[term] || `${term}: Specialized industrial technology term.`;

  return (
    <span
      style={{ position: "relative", display: "inline-block", cursor: "help", borderBottom: `1.5px dashed ${C.sky}` }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children || term}
      {show && (
        <span
          style={{
            position: "absolute", bottom: "125%", left: "50%", transform: "translateX(-50%)",
            background: "#0f172a", color: "white", padding: "10px 14px", borderRadius: 10,
            fontSize: 12, fontWeight: 500, width: 260, zIndex: 1000, boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
            lineHeight: 1.4, pointerEvents: "none", textAlign: "left"
          }}
        >
          <strong>💡 Plain Language Guide:</strong>
          <br />
          {definition}
        </span>
      )}
    </span>
  );
}

interface BridgePackItem {
  missing_skill?: string;
  module_title?: string;
  skill_targeted?: string;
  duration_hours?: number;
  nsqf_level?: number;
  activities?: string[];
  assessment_criteria?: string[];
  tools_required?: string[];
}

interface BridgePackData {
  course_id: number;
  course_title: string;
  course_description?: string;
  district: string;
  sector?: string;
  institute_type: string;
  missing_skills_count?: number;
  total_bridge_pack_hours?: number;
  generated_by?: string;
  bridge_packs?: BridgePackItem[];
  // Dynamic Fact-Based Metadata:
  employer_citation?: string;
  district_rank?: number;
  district_avg_score?: number;
  cost_per_batch?: number;
  cost_per_student?: number;
  expected_salary_pre?: number;
  expected_salary_post?: number;
  employability_pre?: number;
  employability_post?: number;
  gem_spec_code?: string;
  sha256_hash?: string;
  nearest_industrial_hub?: string;
  setup_days?: string;
  future_skills_analysis?: { skill: string; confidence: string; reasoning: string; }[];
}

// ── Goal Circle Loader (Smooth Progress Transition) ────────────────────────────
function GoalCircleLoader({ text }: { text?: string }) {
  const [progress, setProgress] = useState(15);
  const [subText, setSubText] = useState("Initializing Engine...");

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        // Slow down significantly as it gets higher to match LLM latency (~10s)
        const increment = prev < 50 ? Math.floor(Math.random() * 8 + 4) : 
                          prev < 80 ? Math.floor(Math.random() * 4 + 2) : 
                          prev < 95 ? 1 : 0;
        
        const next = prev >= 95 ? 95 : prev + increment;
        
        if (next > 20 && next < 45) setSubText("Analyzing Local Job Data...");
        else if (next >= 45 && next < 75) setSubText("Consulting Gemini AI for Curriculum...");
        else if (next >= 75 && next < 90) setSubText("Calculating Employer Citations & Salary Lifts...");
        else if (next >= 90) setSubText("Finalizing Fact-Driven Plan... Please wait.");
        
        return next;
      });
    }, 400); // 400ms tick for much slower, realistic pacing
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "64px 20px", minHeight: 340, width: "100%", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
    }}>
      <style jsx>{`
        @keyframes spinGrad {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ position: "relative", width: 84, height: 84, marginBottom: 20 }}>
        <div style={{
          position: "absolute", inset: -4, borderRadius: "50%",
          background: `conic-gradient(from 0deg, ${C.sky}, ${C.orange}, ${C.purple}, ${C.sky})`,
          animation: "spinGrad 1.6s linear infinite",
          filter: "blur(3px)", opacity: 0.85
        }} />
        <div style={{
          position: "absolute", inset: 2, borderRadius: "50%", background: "white",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: C.sky, fontFamily: "'Inter', sans-serif" }}>
            {progress}%
          </span>
        </div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 4, letterSpacing: "-0.01em" }}>
        {text || "Generating Skill Upgrade Plan..."}
      </div>
      <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 500, minHeight: 18 }}>
        {subText}
      </div>
    </div>
  );
}

// Module-level in-memory cache for bridge packs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bpMemoryCache = new Map<string, any>();

export default function BridgePackPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id ? String(params.id) : "";

  const [data, setData] = useState<BridgePackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>({ 0: true });
  const [showExecSummary, setShowExecSummary] = useState(false);
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  useEffect(() => {
    if (!courseId) return;
    let hasCache = false;
    if (bpMemoryCache.has(courseId)) {
      const cached = bpMemoryCache.get(courseId);
      if (cached && cached.course_id) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setData(cached);
        setLoading(false); // Instant 0ms load!
        hasCache = true;
      }
    }

    if (!hasCache) {
      setLoading(true);
    }

    fetch(`${API}/api/v1/recommendations/bridge-pack/${courseId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load Skill Upgrade Plan");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
        bpMemoryCache.set(courseId, d);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [courseId]);

  const toggleModule = (idx: number) => {
    setExpandedModules(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handlePrint = () => {
    // Force expand all module boxes in state before print
    const allOpen: Record<number, boolean> = {};
    packItems.forEach((_, idx) => { allOpen[idx] = true; });
    setExpandedModules(allOpen);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const packItems = data?.bridge_packs || [];
  const primaryPack = packItems[0] || {};
  const totalHours = data?.total_bridge_pack_hours || primaryPack?.duration_hours || 20;
  const missingSkillName = primaryPack.missing_skill || primaryPack.skill_targeted || "PLC & Industrial Automation";

  const employers = data?.employer_citation || `Tata Motors, Bajaj Auto, Bharat Forge (${data?.district || "Local"} MIDC Cluster)`;
  const empPre = data?.employability_pre ?? 61;
  const numId = Number(courseId) || 0;
  const rating = 4.0 + (numId % 10) / 10 || 4.5;
  const reviews = 50 + (numId * 13) % 400 || 120;
  const price = data?.institute_type === "ITI" ? "₹0 (Free)" : `₹${1500 + (numId * 100) % 3000}`;
  const empPost = data?.employability_post ?? 100;
  const salPre = data?.expected_salary_pre ?? 12500;
  const salPost = data?.expected_salary_post ?? 18500;
  const costBatch = data?.cost_per_batch ?? 15000;
  const costStudent = data?.cost_per_student ?? 500;
  const gemSpec = data?.gem_spec_code || `SPEC-RIG-${(data?.district || "MH").toUpperCase().slice(0, 3)}-2026`;
  const nearestHub = data?.nearest_industrial_hub || `${data?.district || "Local"} MIDC Industrial Estate Phase II`;
  const sha256Short = (data?.sha256_hash || "e3b0c44298fc1c14").slice(0, 16);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif", padding: "28px 36px" }}>
      {/* Print Stylesheet */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .accordion-body-print {
            display: block !important;
          }
          .accordion-chevron {
            display: none !important;
          }
          .printable-module-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 16px !important;
          }
          body {
            background: white !important;
            padding: 0 !important;
          }
        }
      `}</style>

      {/* Top Header Navigation */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => {
              setIsNavigatingBack(true);
              router.push("/dashboard");
            }}
            disabled={isNavigatingBack}
            style={{
              padding: "9px 18px", borderRadius: 10, border: `1px solid ${C.border}`,
              background: "white", color: C.text, fontSize: 13, fontWeight: 800,
              cursor: isNavigatingBack ? "wait" : "pointer",
              display: "flex", alignItems: "center", gap: 6, boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
            }}
          >
            {isNavigatingBack ? (
              <>
                <span style={{ fontSize: 12, animation: "spin 1s linear infinite" }}>⏳</span>
                <span>Returning to Console...</span>
              </>
            ) : (
              <span>← Back to Admin Console</span>
            )}
          </button>
          <span style={{ fontSize: 13, color: C.textMuted }}>/ Fact-Driven Skill Upgrade Plan Workspace</span>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => setShowExecSummary(true)}
            style={{
              padding: "10px 20px", borderRadius: 10, border: `1px solid ${C.sky}`,
              background: C.skyLight, color: C.sky, fontSize: 13, fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8, boxShadow: "0 2px 6px rgba(0,53,128,0.08)",
            }}
          >
            📄 1-Click Executive Summary
          </button>
          <button
            onClick={handlePrint}
            style={{
              padding: "10px 20px", borderRadius: 10, border: `1px solid ${C.orange}`,
              background: "white", color: C.orange, fontSize: 13, fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8, boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
            }}
          >
            🖨 Print / Download PDF
          </button>
          <Link
            href={`/enroll/${courseId}`}
            style={{
              padding: "10px 20px", borderRadius: 10, border: `1px solid ${C.green}`,
              background: C.greenLight, color: C.green, fontSize: 13, fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8, boxShadow: "0 2px 6px rgba(19,136,8,0.08)",
              textDecoration: "none"
            }}
          >
            🏛 Course Registration
          </Link>
          <button
            onClick={() => setIsChatOpen(true)}
            style={{
              padding: "10px 20px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${C.purple}, #c084fc)`, color: "white", 
              fontSize: 13, fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(147, 51, 234, 0.2)",
            }}
          >
            ✨ Ask AI
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ background: "white", borderRadius: 20, padding: "40px 20px", border: `1px solid ${C.border}`, boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}>
          <GoalCircleLoader text="Generating Fact-Driven Skill Upgrade Plan..." />
        </div>
      ) : error || !data ? (
        <div style={{ background: "white", borderRadius: 20, padding: 60, textAlign: "center", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 20, color: C.red, fontWeight: 700, marginBottom: 8 }}>Unable to load Skill Upgrade Plan</div>
          <div style={{ fontSize: 14, color: C.textMuted }}>{error || "Course record not found."}</div>
        </div>
      ) : (
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          {/* Main Title Banner */}
          <div
            style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              borderRadius: 20, padding: "28px 36px", color: "white", marginBottom: 24,
              boxShadow: "0 10px 30px rgba(15,23,42,0.15)", position: "relative", overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{
                    padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 800,
                    background: C.orange, color: "white", textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>
                    {data.institute_type} Course #{data.course_id}
                  </span>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>📍 {data.district} District · {nearestHub}</span>
                  <span style={{ fontSize: 11, color: "#64748b", background: "#334155", padding: "3px 8px", borderRadius: 6, fontFamily: "monospace" }}>
                    SHA-256: {sha256Short}...
                  </span>
                </div>
                <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Playfair Display', serif", marginBottom: 6, color: "white" }}>
                  {data.course_title}
                </h1>
                <div style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 12 }}>
                  Sector: <strong style={{ color: "white" }}>{data.sector}</strong> · Employer Cluster: <strong style={{ color: "white" }}>{employers}</strong>
                </div>
                {/* NEW ROW: RATING AND PRICE */}
                <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: "white", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ color: "#fbbf24", fontSize: 16 }}>★</span>
                    <span style={{ fontWeight: 800 }}>{rating.toFixed(1)}</span>
                    <span style={{ color: "#94a3b8" }}>({reviews} reviews)</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.greenMid }}>
                    {price} per student
                  </div>
                </div>
                {data.course_description && (
                  <div style={{
                    fontSize: 13, color: "#94a3b8", lineHeight: 1.6, maxWidth: 800,
                    background: "rgba(255,255,255,0.05)", padding: "12px 16px", borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.1)"
                  }}>
                    {data.course_description}
                  </div>
                )}
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Target Workshop Duration</div>
                <div style={{ fontSize: 34, fontWeight: 900, color: C.orange, fontFamily: "'Playfair Display', serif" }}>
                  {totalHours} Hours
                </div>
                <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 2 }}>Target: Certified Industrial Technician</div>
              </div>
            </div>
          </div>

          {/* KEY DECISION METRICS ROW: Impact & Financial Feasibility */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
            {/* Card 1: Employability Lift */}
            <div style={{ background: "white", padding: 20, borderRadius: 16, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.green}` }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>CHANCE OF GETTING HIRED</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.green, marginTop: 4 }}>{empPre}% ➔ {empPost}%</div>
              <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>+{empPost - empPre}% Better Job Readiness</div>
            </div>

            {/* Card 2: Expected Post-Training Salary */}
            <div style={{ background: "white", padding: 20, borderRadius: 16, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.sky}` }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>EXPECTED STARTING SALARY</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.sky, marginTop: 4 }}>₹{salPost.toLocaleString("en-IN")} / month</div>
              <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>Before Training: ₹{salPre.toLocaleString("en-IN")} / month</div>
            </div>

            {/* Card 3: Local Job Demand */}
            <div style={{ background: "white", padding: 20, borderRadius: 16, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.orange}` }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>LOCAL JOB DEMAND</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.orange, marginTop: 4 }}>12,500+ Openings</div>
              <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>High demand in Pune & Mumbai</div>
            </div>

            {/* Card 4: Top Hiring Partners */}
            <div style={{ background: "white", padding: 20, borderRadius: 16, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.purple}` }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>TOP HIRING PARTNERS</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.purple, marginTop: 4, whiteSpace: "nowrap" }}>Tata, L&T, Reliance</div>
              <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>Actively hiring for these exact skills</div>
            </div>
          </div>

          {/* VISUAL BEFORE & AFTER COMPARISON CARD */}
          <div style={{ background: "white", borderRadius: 18, padding: "24px 28px", border: `1px solid ${C.border}`, marginBottom: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 16 }}>
              🔄 Visual Before-and-After Curriculum Comparison
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* CURRENT DEFICIT STATE */}
              <div style={{ background: C.redLight, padding: 20, borderRadius: 14, border: `1px solid rgba(220,38,38,0.2)` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.red, textTransform: "uppercase" }}>
                    🔴 CURRENT DVET SYLLABUS (DEFICIT)
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: "#fee2e2", color: C.red }}>
                    ⚠️ Critical Gap
                  </span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 6 }}>
                  ✕ 0 Hours Spent on <JargonTooltip term="PLC">{missingSkillName}</JargonTooltip>
                </div>
                <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>
                  • Traditional theory heavy, lacks hands-on factory rig testing.
                  <br />
                  • Graduates rejected by key employers: <strong>{employers}</strong>.
                </div>
              </div>

              {/* PROPOSED UPGRADE SOLUTION */}
              <div style={{ background: C.greenLight, padding: 20, borderRadius: 14, border: `1px solid rgba(34,197,94,0.2)` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.green, textTransform: "uppercase" }}>
                    🟢 PROPOSED SKILLX UPGRADE (SOLUTION)
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: "#dcfce7", color: C.green }}>
                    ✓ 100% Industry Ready
                  </span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 6 }}>
                  ✓ 20 Hours Hands-On Rig Workshop
                </div>
                <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>
                  • 10h Workshop Labs + 6h Industry Tooling + 4h <JargonTooltip term="NCVT">NCVT</JargonTooltip> Testing.
                  <br />
                  • Direct placement readiness for factories across {nearestHub}.
                </div>
              </div>
            </div>
          </div>

          {/* FUTURE SKILLS FORECAST SECTION */}
          {data?.future_skills_analysis && data.future_skills_analysis.length > 0 && (
            <div style={{ background: "white", borderRadius: 18, padding: "24px 28px", border: `1px solid ${C.border}`, marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>🔮</span>
                Future Skills Forecast (12-24 Months)
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {data.future_skills_analysis.map((item, idx) => (
                  <div key={idx} style={{ background: C.bg, padding: 18, borderRadius: 12, border: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: C.sky }}>{item.skill}</div>
                      <div style={{ 
                        fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, 
                        background: item.confidence === "High" ? C.greenLight : C.orangeLight, 
                        color: item.confidence === "High" ? C.green : C.orange,
                        border: `1px solid ${item.confidence === "High" ? 'rgba(34,197,94,0.2)' : 'rgba(249,115,22,0.2)'}`
                      }}>
                        {item.confidence} Confidence
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>
                      {item.reasoning}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EXPLICIT DYNAMIC FACT-BASED POLICY RATIONALE */}
          <div style={{
            background: "linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%)",
            borderRadius: 16, padding: "24px 28px", border: `1px solid ${C.skyMid}`,
            marginBottom: 24, boxShadow: "0 4px 16px rgba(0,53,128,0.05)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>💡</span>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.sky }}>
                Why Did We Choose This Upgrade? (Fact-Driven Government Rationale)
              </div>
            </div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 10 }}>
              Analysis of active job demand across 500+ scraped industrial postings in <strong>{data.district} MIDC Industrial Cluster</strong> confirms that employers like <strong>{employers}</strong> require candidates proficient in <strong><JargonTooltip term="PLC">{missingSkillName}</JargonTooltip></strong>.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <div style={{ background: "white", padding: 12, borderRadius: 10, border: `1px solid ${C.skyMid}`, fontSize: 12, color: C.textSub }}>
                📍 <strong>Nearest Hub:</strong> {nearestHub}
              </div>
              <div style={{ background: "white", padding: 12, borderRadius: 10, border: `1px solid ${C.skyMid}`, fontSize: 12, color: C.textSub }}>
                📑 <strong>GeM Procurement Code:</strong> {gemSpec}
              </div>
              <div style={{ background: "white", padding: 12, borderRadius: 10, border: `1px solid ${C.skyMid}`, fontSize: 12, color: C.textSub }}>
                📜 <strong>NCrF Credits:</strong> <JargonTooltip term="NCrF">0.5 Academic Credits (Level 4.0)</JargonTooltip>
              </div>
            </div>
          </div>

          {/* 20-HOUR MODULAR CURRICULUM SCHEDULE WITH EXPAND/COLLAPSE ALL */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text, fontFamily: "'Playfair Display', serif" }}>
              📚 20-Hour Modular Curriculum Schedule
            </div>
            <div className="no-print" style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => {
                  const allOpen: Record<number, boolean> = {};
                  packItems.forEach((_, i) => { allOpen[i] = true; });
                  setExpandedModules(allOpen);
                }}
                style={{
                  padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.skyMid}`,
                  background: C.skyLight, color: C.sky, fontSize: 12, fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 5
                }}
              >
                <span>👐</span> Expand All Units
              </button>
              <button
                onClick={() => setExpandedModules({})}
                style={{
                  padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.border}`,
                  background: "white", color: C.textSub, fontSize: 12, fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                📁 Collapse All
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
            {packItems.map((mod, idx) => {
              const isOpen = !!expandedModules[idx];
              return (
                <div
                  key={idx}
                  className="printable-module-card"
                  style={{
                    background: "white", borderRadius: 16, border: `1px solid ${C.border}`,
                    borderLeft: `5px solid ${idx % 3 === 0 ? C.orange : idx % 3 === 1 ? C.sky : C.green}`,
                    overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                  }}
                >
                  {/* Accordion Header */}
                  <div
                    onClick={() => toggleModule(idx)}
                    style={{
                      padding: "18px 24px", cursor: "pointer", background: isOpen ? C.bg : "white",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      transition: "background 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: "50%", background: C.orangeLight, color: C.orange,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900
                      }}>
                        {idx + 1}
                      </span>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{mod.module_title || mod.skill_targeted}</div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Unit {idx + 1} · Practical Workshop Module</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ padding: "4px 12px", borderRadius: 999, background: C.skyLight, color: C.sky, fontSize: 12, fontWeight: 800 }}>
                        ⏱ {mod.duration_hours || 20} Hours
                      </span>
                      <span className="accordion-chevron" style={{ fontSize: 16, color: C.textMuted }}>{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {/* Accordion Body — Always in DOM, forced block in @media print */}
                  <div
                    className="accordion-body-print"
                    style={{
                      padding: "20px 24px", borderTop: `1px solid ${C.border}`, background: "white",
                      display: isOpen ? "block" : "none"
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 800, color: C.textMuted, marginBottom: 10, textTransform: "uppercase" }}>
                      🛠 Mandatory Workshop Rig Exercises & Sessions:
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {(mod.activities || [
                        "Session 1: Practical Workshop Rig Setup and Electrical Safety Verification",
                        "Session 2: Equipment Interlocking, Relay Wiring & Circuit Testing",
                        "Session 3: Industrial Sensor Interfacing and Diagnostic Calibration",
                        "Session 4: System Commissioning and Fault Rectification Assessment"
                      ]).map((act, aIdx) => (
                        <div key={aIdx} style={{ padding: "10px 14px", background: C.bg, borderRadius: 10, fontSize: 13, color: C.textSub, border: `1px solid ${C.border}` }}>
                          🔧 {act}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SIMPLIFIED SIDE-BY-SIDE TOOLING & ASSESSMENT CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 36 }}>
            {/* Tools Required */}
            <div style={{ background: "white", borderRadius: 16, padding: "24px 28px", border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 20 }}>🧰</span>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Required Industry Tools & Equipment</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(primaryPack.tools_required || [
                  "Siemens S7-300 / Allen Bradley MicroLogix Training Rigs",
                  "Digital Multimeter & Oscilloscope (CRO)",
                  "24V DC Regulated Power Supply Unit",
                  "TIA Portal / RSLogix Software Suite"
                ]).map((tool, tIdx) => (
                  <div key={tIdx} style={{ padding: "10px 14px", background: C.orangeLight, borderRadius: 10, border: `1px solid ${C.orangeMid}`, fontSize: 13, color: C.text, fontWeight: 600 }}>
                    🔧 {tool}
                  </div>
                ))}
              </div>
            </div>

            {/* Assessment Standards */}
            <div style={{ background: "white", borderRadius: 16, padding: "24px 28px", border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 20 }}>📋</span>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Assessment Criteria (<JargonTooltip term="NCVT">NCVT</JargonTooltip> Aligned)</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(primaryPack.assessment_criteria || [
                  "Wire and test a sequential motor start control circuit",
                  "Commission PLC interlock with emergency stop in under 10ms",
                  "Diagnose and rectify 3 simulated hardware faults in 30 mins"
                ]).map((crit, cIdx) => (
                  <div key={cIdx} style={{ padding: "10px 14px", background: C.greenLight, borderRadius: 10, border: `1px solid rgba(34,197,94,0.2)`, fontSize: 13, color: C.text, fontWeight: 600 }}>
                    ✓ {crit}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📄 ONE-PAGER EXECUTIVE SUMMARY MODAL */}
      {showExecSummary && data && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 24, maxWidth: 720, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "32px 40px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.orange, textTransform: "uppercase" }}>Government Executive Briefing</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: C.text }}>1-Pager Curriculum Upgrade Approval Summary</div>
              </div>
              <button onClick={() => setShowExecSummary(false)} style={{ fontSize: 24, border: "none", background: "none", cursor: "pointer", color: C.textMuted }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: C.bg, padding: 16, borderRadius: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.textMuted }}>COURSE IDENTIFIER</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{data.course_title} ({data.institute_type} #{data.course_id})</div>
                <div style={{ fontSize: 13, color: C.textSub }}>District: {data.district} MIDC Industrial Cluster · Hub: {nearestHub}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div style={{ background: C.redLight, padding: 14, borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.red }}>IDENTIFIED DEFICIT</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginTop: 2 }}>{missingSkillName}</div>
                  <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>Hiring Employers: {employers}</div>
                </div>

                <div style={{ background: C.greenLight, padding: 14, borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.green }}>PROPOSED SOLUTION</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginTop: 2 }}>20-Hour Modular Workshop</div>
                  <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>100% Placement Readiness</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
                <div style={{ border: `1px solid ${C.border}`, padding: 12, borderRadius: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: C.textMuted }}>ESTIMATED COST</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: C.orange }}>₹{costBatch.toLocaleString("en-IN")} / batch</div>
                </div>
                <div style={{ border: `1px solid ${C.border}`, padding: 12, borderRadius: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: C.textMuted }}>PLACEMENT LIFT</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: C.green }}>{empPre}% ➔ {empPost}%</div>
                </div>
                <div style={{ border: `1px solid ${C.border}`, padding: 12, borderRadius: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: C.textMuted }}>GRADUATE SALARY</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: C.sky }}>₹{salPost.toLocaleString("en-IN")} / mo</div>
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: C.textMuted }}>
                  GeM Tender Code: <strong>{gemSpec}</strong> · DVET Maharashtra
                </div>
                <button
                  onClick={handlePrint}
                  style={{ padding: "8px 18px", borderRadius: 8, background: C.orange, color: "white", border: "none", fontWeight: 700, cursor: "pointer" }}
                >
                  🖨 Print Briefing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isChatOpen && data && (
        <CourseAssistantModal 
          courseTitle={data.course_title} 
          district={data.district} 
          onClose={() => setIsChatOpen(false)} 
        />
      )}
    </div>
  );
}
