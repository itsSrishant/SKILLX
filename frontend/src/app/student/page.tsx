"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { LangProvider, useLang } from "@/lib/i18n";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.port === "3000") ? "http://localhost:8000" : "");

const C = {
  orange:      "#f97316",
  orangeLight: "#fff7ed",
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
  border:      "rgba(0,0,0,0.07)",
  text:        "#0f172a",
  textSub:     "#475569",
  textMuted:   "#94a3b8",
};

const MAHARASHTRA_DISTRICTS = [
  "Pune", "Mumbai City", "Mumbai Suburban", "Thane", "Nashik", "Nagpur",
  "Chhatrapati Sambhajinagar", "Palghar", "Raigad", "Solapur", "Kolhapur",
  "Ahmednagar", "Satara", "Sangli", "Amravati", "Nanded", "Latur", "Dhule",
  "Jalgaon", "Chandrapur", "Akola", "Yavatmal", "Buldhana", "Bheed",
  "Parbhani", "Gondia", "Bhandara", "Washim", "Nandurbar", "Hingoli",
  "Osmanabad", "Gadchiroli", "Wardha", "Ratnagiri", "Sindhudurg", "Jalna"
];

const SECTORS = [
  "All Sectors", "Electrical & Energy", "Capital Goods & Manufacturing",
  "Automotive & EV", "Electronics & Automation", "Renewable Energy",
  "Information Technology", "HVAC & Appliances"
];

interface CourseRec {
  course_id: number; course_title: string; institute_type: string;
  sector: string; district: string; duration_months: number; nsqf_level: number;
  qualification_req: string; alignment_score: number; missing_skills: string[];
  fully_covered_skills: string[]; bridge_packs_available: number;
}

function StudentInner() {
  const { lang, setLang, t } = useLang();
  const [selectedDistrict, setSelectedDistrict] = useState("Pune");
  const [selectedSector, setSelectedSector] = useState("All Sectors");
  const [search, setSearch] = useState("");
  const [courses, setCourses] = useState<CourseRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<CourseRec | null>(null);

  // Bot Assistant Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ sender: "bot" | "user"; text: string }[]>([
    { sender: "bot", text: "Namaste! I am the SkillX Assistant. Ask me about in-demand ITI trades, salary lifts in Pune/Nashik, or how 20-hour bridge packs work!" }
  ]);
  const [inputMsg, setInputMsg] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/v1/analytics/gap-analysis`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCourses(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filtered = courses.filter(c => {
    if (selectedDistrict && c.district !== selectedDistrict) return false;
    if (selectedSector !== "All Sectors" && c.sector !== selectedSector) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.course_title.toLowerCase().includes(q) && !(c.sector || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const sendBotMsg = (userText: string) => {
    if (!userText.trim()) return;
    const newMsgs = [...chatMessages, { sender: "user" as const, text: userText }];
    setChatMessages(newMsgs);
    setInputMsg("");

    let reply = "I recommend checking our 20-hour Skill Bridge Packs! They focus on practical lab workshops with high employer demand.";
    const q = userText.toLowerCase();
    if (q.includes("salary") || q.includes("pay") || q.includes("money")) {
      reply = "Graduates taking our 20-hour Skill Bridge Pack see average salary lifts from ₹12,500/mo to ₹18,500/mo (+48% lift) in MIDC clusters like Pune, Nashik, and Thane!";
    } else if (q.includes("pune") || q.includes("nashik") || q.includes("job")) {
      reply = `In ${selectedDistrict}, top hiring employers include Tata Motors, Bajaj Auto, and Bharat Forge for Automation, PLC, and CNC roles.`;
    } else if (q.includes("iti") || q.includes("course") || q.includes("trade")) {
      reply = "Our top aligned ITI trades are Electrician, Fitter, Turner, Machinist, and Electronics Mechanic. All have 20-hour modular upgrade plans available.";
    }

    setTimeout(() => {
      setChatMessages([...newMsgs, { sender: "bot" as const, text: reply }]);
    }, 400);
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: C.text }}>
      {/* Top Header */}
      <header style={{ background: "white", borderBottom: `1px solid ${C.border}`, padding: "14px 40px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: `linear-gradient(135deg, ${C.orange}, #ea580c)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, color: "white", boxShadow: "0 4px 14px rgba(249,115,22,0.3)" }}>S</div>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, color: C.text }}>SkillX</div>
                <div style={{ fontSize: 10, color: C.cyan, fontWeight: 700, letterSpacing: "0.08em" }}>STUDENT PORTAL</div>
              </div>
            </Link>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <select value={lang} onChange={e => setLang(e.target.value as "en" | "mr" | "hi")}
                style={{ appearance: "none", WebkitAppearance: "none", padding: "8px 30px 8px 14px", borderRadius: 12, border: `1px solid ${C.border}`, background: "white", fontSize: 13, fontWeight: 700, color: C.text, cursor: "pointer", outline: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <option value="en">🌐 English</option><option value="mr">🌐 मराठी</option><option value="hi">🌐 हिंदी</option>
              </select>
              <span style={{ position: "absolute", right: 12, pointerEvents: "none", fontSize: 10, color: C.textMuted }}>▼</span>
            </div>
            <Link href="/dashboard" className="btn-dark" style={{ padding: "9px 22px", fontSize: 13, borderRadius: 999 }}>
              Enter Dashboard →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section style={{ background: `linear-gradient(135deg, #0f172a 0%, #1e293b 100%)`, padding: "48px 40px", color: "white" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
          <div>
            <span style={{ padding: "4px 12px", borderRadius: 999, background: "rgba(8,145,178,0.2)", color: C.cyanMid, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", border: `1px solid ${C.cyan}` }}>MAHARASHTRA VOCATIONAL GUIDANCE</span>
            <h1 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 900, fontFamily: "'Playfair Display', serif", marginTop: 12, marginBottom: 8 }}>
              Find Your High-Salary Career Pathway
            </h1>
            <p style={{ fontSize: 15, color: "#94a3b8", maxWidth: 620, lineHeight: 1.6 }}>
              Explore ITI Trades and MSSDS Skill Courses across Maharashtra&apos;s 36 districts. See real employer demand, expected salary lift, and get your 20-hour Skill Bridge Upgrade Plan.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <div style={{ background: "rgba(255,255,255,0.08)", padding: "14px 20px", borderRadius: 12, backdropFilter: "blur(6px)" }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.orange }}>₹18,500/mo</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Avg Post-Upgrade Salary</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.08)", padding: "14px 20px", borderRadius: 12, backdropFilter: "blur(6px)" }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.cyan }}>36 Districts</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>MIDC Cluster Coverage</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "32px 40px" }}>

        {/* Filter Controls */}
        <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: `1px solid ${C.border}`, marginBottom: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.5fr", gap: 16, alignItems: "center" }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.textSub, display: "block", marginBottom: 6 }}>📍 Select Your District ({MAHARASHTRA_DISTRICTS.length} Districts)</label>
              <select value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, fontSize: 13, fontWeight: 700, color: C.text, outline: "none" }}>
                {MAHARASHTRA_DISTRICTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.textSub, display: "block", marginBottom: 6 }}>Sector Filter</label>
              <select value={selectedSector} onChange={e => setSelectedSector(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, fontSize: 13, fontWeight: 700, color: C.text, outline: "none" }}>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.textSub, display: "block", marginBottom: 6 }}>Search Trade / Course Title</label>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Electrician, Fitter, Welder..."
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, fontSize: 13, color: C.text, outline: "none" }} />
            </div>
          </div>
        </div>

        {/* Course Cards Grid */}
        <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Available Courses in {selectedDistrict} ({filtered.length})</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>Showing real-time alignment data &amp; 20-hr bridge packs</div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: C.textMuted }}>Loading courses for {selectedDistrict}...</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: "white", borderRadius: 16, padding: "48px", textAlign: "center", border: `1px solid ${C.border}`, color: C.textMuted }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>No courses found for {selectedDistrict} in this sector</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Try selecting another sector or district like Pune, Nashik, or Thane</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {filtered.map(c => (
              <div key={c.course_id} style={{ background: "white", borderRadius: 16, border: `1px solid ${C.border}`, padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", transition: "all 0.25s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.03)"; }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: c.institute_type === "ITI" ? C.orangeLight : C.purpleLight, color: c.institute_type === "ITI" ? C.orange : C.purple }}>{c.institute_type}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: c.alignment_score >= 80 ? C.green : c.alignment_score >= 50 ? C.amber : C.red }}>{Math.round(c.alignment_score)}/100 Match</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 6, lineHeight: 1.3 }}>{c.course_title}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>{c.sector} · 📍 {c.district}</div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 4 }}>✓ Skills Taught ({c.fully_covered_skills?.length || 0}):</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {(c.fully_covered_skills || []).slice(0, 3).map(s => (
                        <span key={s} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 999, background: C.greenLight, color: C.green }}>{s}</span>
                      ))}
                    </div>
                  </div>

                  {c.missing_skills?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.red, marginBottom: 4 }}>⚡ Missing Industry Skills:</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {c.missing_skills.slice(0, 2).map(s => (
                          <span key={s} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 999, background: C.redLight, color: C.red }}>{s}</span>
                        ))}
                        {c.missing_skills.length > 2 && <span style={{ fontSize: 10, color: C.textMuted }}>+{c.missing_skills.length - 2} more</span>}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 11, color: C.cyan, fontWeight: 700 }}>💰 Est Salary: ₹18.5k/mo</div>
                  <Link href={`/bridge-pack/${c.course_id}`} style={{ padding: "7px 14px", borderRadius: 8, background: `linear-gradient(135deg, ${C.orange}, #ea580c)`, color: "white", fontSize: 12, fontWeight: 700, textDecoration: "none", boxShadow: "0 2px 6px rgba(249,115,22,0.2)" }}>
                    Get Bridge Pack →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Candidate Skill Assistant Bot */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999 }}>
        {chatOpen ? (
          <div style={{ background: "white", borderRadius: 20, width: 340, height: 420, boxShadow: "0 16px 48px rgba(0,0,0,0.18)", border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})`, color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>🤖</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>SkillX Assistant</div>
                  <div style={{ fontSize: 10, opacity: 0.8 }}>Career &amp; Trade Advisor</div>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: "none", border: "none", color: "white", fontSize: 20, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ flex: 1, padding: "14px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, background: C.bg }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ alignSelf: msg.sender === "user" ? "flex-end" : "flex-start", maxWidth: "82%", padding: "10px 14px", borderRadius: 14, fontSize: 12, lineHeight: 1.5, background: msg.sender === "user" ? C.cyan : "white", color: msg.sender === "user" ? "white" : C.text, border: msg.sender === "user" ? "none" : `1px solid ${C.border}`, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                  {msg.text}
                </div>
              ))}
            </div>

            <div style={{ padding: "10px 14px", background: "white", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
              <input value={inputMsg} onChange={e => setInputMsg(e.target.value)} onKeyDown={e => { if (e.key === "Enter") sendBotMsg(inputMsg); }} placeholder="Ask about trades, jobs, salaries..." style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, outline: "none" }} />
              <button onClick={() => sendBotMsg(inputMsg)} style={{ padding: "8px 12px", borderRadius: 8, background: C.cyan, color: "white", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Send</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setChatOpen(true)} style={{ padding: "12px 20px", borderRadius: 999, background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})`, color: "white", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer", boxShadow: "0 8px 24px rgba(8,145,178,0.3)", display: "flex", alignItems: "center", gap: 8 }}>
            <span>🤖</span> Ask Skill Assistant
          </button>
        )}
      </div>
    </div>
  );
}

export default function StudentPage() {
  return <LangProvider><StudentInner /></LangProvider>;
}
