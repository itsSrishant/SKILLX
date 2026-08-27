"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const API = "http://localhost:8000";

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
  district: string;
  sector?: string;
  institute_type: string;
  missing_skills_count?: number;
  total_bridge_pack_hours?: number;
  generated_by?: string;
  bridge_packs?: BridgePackItem[];
  bridge_pack?: {
    title: string;
    total_hours: number;
    target_role: string;
    modules: Array<{
      unit: number;
      title: string;
      hours: number;
      skills_covered: string[];
      labs: string[];
    }>;
    required_tools: string[];
    assessment_criteria: string[];
  };
}

export default function BridgePackPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id;

  const [data, setData] = useState<BridgePackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    fetch(`${API}/api/v1/recommendations/bridge-pack/${courseId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load Skill Upgrade Plan");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [courseId]);

  const handlePrint = () => {
    window.print();
  };

  const packItems = data?.bridge_packs || [];
  const primaryPack = packItems[0] || {};

  const totalHours = data?.total_bridge_pack_hours || data?.bridge_pack?.total_hours || primaryPack?.duration_hours || 20;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif", padding: "32px 40px" }}>
      {/* Top Header Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => router.back()}
            style={{
              padding: "8px 16px", borderRadius: 10, border: `1px solid ${C.border}`,
              background: "white", color: C.text, fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            ← Back to Admin Console
          </button>
          <span style={{ fontSize: 13, color: C.textMuted }}>/ Skill Upgrade Plan Workspace</span>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handlePrint}
            style={{
              padding: "10px 22px", borderRadius: 10, border: `1px solid ${C.orange}`,
              background: "white", color: C.orange, fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            🖨 Print / Export PDF
          </button>
          <Link
            href="/dashboard"
            style={{
              padding: "10px 22px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${C.orange} 0%, #ea580c 100%)`,
              color: "white", fontSize: 13, fontWeight: 700, textDecoration: "none",
              boxShadow: "0 4px 14px rgba(249,115,22,0.3)",
            }}
          >
            ⚡ Admin Console
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ background: "white", borderRadius: 20, padding: 60, textAlign: "center", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>⚙ Loading Skill Upgrade Plan Workspace...</div>
          <div style={{ fontSize: 14, color: C.textMuted }}>Fetching curriculum modules and NCVT assessment standards...</div>
        </div>
      ) : error || !data ? (
        <div style={{ background: "white", borderRadius: 20, padding: 60, textAlign: "center", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 20, color: C.red, fontWeight: 700, marginBottom: 8 }}>Unable to load Skill Upgrade Plan</div>
          <div style={{ fontSize: 14, color: C.textMuted }}>{error || "Course record not found."}</div>
        </div>
      ) : (
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {/* Main Title Banner */}
          <div
            style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              borderRadius: 20, padding: "32px 40px", color: "white", marginBottom: 28,
              boxShadow: "0 10px 30px rgba(15,23,42,0.15)", position: "relative", overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                  <span style={{
                    padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 800,
                    background: C.orange, color: "white", textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>
                    {data.institute_type} Course #{data.course_id}
                  </span>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>📍 {data.district} District, Maharashtra</span>
                </div>
                <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Playfair Display', serif", marginBottom: 8, color: "white" }}>
                  {data.course_title}
                </h1>
                <div style={{ fontSize: 14, color: "#cbd5e1" }}>
                  Target Sector: <strong style={{ color: "white" }}>{data.sector || "Industrial Manufacturing & Technology"}</strong>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Micro-Curriculum</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: C.orange, fontFamily: "'Playfair Display', serif" }}>
                  {totalHours} Hours
                </div>
                <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 2 }}>Target: Industrial Technician</div>
              </div>
            </div>
          </div>

          {/* Identified Industrial Skill Deficits Card */}
          <div style={{ background: "white", borderRadius: 16, padding: "24px 28px", border: `1px solid ${C.border}`, marginBottom: 28 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 6 }}>
              🔍 Identified Industrial Skill Deficits ({packItems.length || data.missing_skills_count || 1} Skills Targeted)
            </div>
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
              Skills demanded by local MIDC factories in {data.district} but missing from current curriculum:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {packItems.map((item, idx) => (
                <span key={idx} style={{
                  padding: "6px 14px", borderRadius: 999, background: C.redLight, color: C.red,
                  fontSize: 12, fontWeight: 700, border: `1px solid rgba(220,38,38,0.2)`,
                }}>
                  ⚠️ {item.missing_skill || item.skill_targeted || "Industrial Deficit"}
                </span>
              ))}
            </div>
          </div>

          {/* 20-Hour Modular Curriculum Schedule */}
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 16, fontFamily: "'Playfair Display', serif" }}>
            📚 20-Hour Modular Curriculum Schedule
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20, marginBottom: 32 }}>
            {packItems.map((mod, idx) => (
              <div
                key={idx}
                style={{
                  background: "white", borderRadius: 16, padding: "24px 28px", border: `1px solid ${C.border}`,
                  borderLeft: `5px solid ${idx % 3 === 0 ? C.orange : idx % 3 === 1 ? C.sky : C.green}`,
                  boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      MODULE {idx + 1}
                    </span>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, marginTop: 2 }}>{mod.module_title || mod.skill_targeted}</h3>
                  </div>
                  <span style={{
                    padding: "6px 14px", borderRadius: 999, background: C.bg, color: C.text,
                    fontSize: 13, fontWeight: 800, border: `1px solid ${C.border}`,
                  }}>
                    ⏱ {mod.duration_hours || 20} Hours
                  </span>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6, textTransform: "uppercase" }}>Practical Labs & Hands-on Exercises:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(mod.activities || [
                      "Session 1: Practical Workshop Rig Setup and Electrical Safety Verification",
                      "Session 2: Equipment Interlocking, Relay Wiring & Circuit Testing",
                      "Session 3: Industrial Sensor Interfacing and Diagnostic Calibration",
                      "Session 4: System Commissioning and Fault Rectification Assessment"
                    ]).map((act, aIdx) => (
                      <div key={aIdx} style={{ padding: "8px 12px", background: C.bg, borderRadius: 8, fontSize: 13, color: C.textSub }}>
                        🔧 {act}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Assessment & Tooling Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 40 }}>
            {/* Tools Required */}
            <div style={{ background: "white", borderRadius: 16, padding: "24px 28px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 12 }}>🛠 Required Industry Tools & Equipment</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(primaryPack.tools_required || [
                  "Siemens S7-300 / Allen Bradley MicroLogix Training Rigs",
                  "Digital Multimeter & Oscilloscope (CRO)",
                  "24V DC Regulated Power Supply Unit",
                  "TIA Portal / RSLogix 500 Software Suite"
                ]).map((tool, tIdx) => (
                  <div key={tIdx} style={{ fontSize: 13, color: C.textSub, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: C.orange }}>•</span> {tool}
                  </div>
                ))}
              </div>
            </div>

            {/* NCVT Assessment Standards */}
            <div style={{ background: "white", borderRadius: 16, padding: "24px 28px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 12 }}>📋 NCVT & MIDC Assessment Criteria</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(primaryPack.assessment_criteria || [
                  "Successfully wire and test a 3-motor sequential start control circuit",
                  "Commission a PLC/automation interlock with emergency stop response within 10ms",
                  "Diagnose and rectify 3 simulated hardware faults within 30 minutes"
                ]).map((crit, cIdx) => (
                  <div key={cIdx} style={{ fontSize: 13, color: C.textSub, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: C.green }}>✓</span> {crit}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
