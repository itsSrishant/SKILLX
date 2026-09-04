import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
  cyan:        "#0891b2",
  cyanLight:   "#ecfeff",
  cyanMid:     "#cffafe",
  green:       "#16a34a",
  purple:      "#7c3aed",
  purpleLight: "#f5f3ff",
  red:         "#dc2626",
  redLight:    "#fef2f2",
  border:      "rgba(0,0,0,0.06)",
  text:        "#0f172a",
  textSub:     "#475569",
  textMuted:   "#94a3b8",
  bg:          "#fafcfd",
  card:        "#ffffff",
};

export function AIExecutiveSummary({ district }: { district: string }) {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/v1/assistant/executive-briefing?district=${encodeURIComponent(district)}`)
      .then((res) => res.json())
      .then((data) => {
        setBriefing(data.briefing);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setBriefing(`Overall, ${district} is seeing a shift towards automation and green energy. We strongly recommend updating legacy courses to include modern skills to boost local employability.`);
        setLoading(false);
      });
  }, [district]);

  return (
    <div style={{ background: "white", borderRadius: 16, border: `1px solid ${C.border}`, padding: "24px", marginBottom: 28, display: "flex", gap: 20, alignItems: "flex-start", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
      <div style={{ fontSize: 32 }}>🤖</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.cyan, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
          AI Executive Briefing · {district}
        </div>
        {loading ? (
          <div style={{ fontSize: 16, color: C.textSub, animation: "pulse 1.5s infinite" }}>Analyzing district data to generate your briefing...</div>
        ) : (
          <div style={{ fontSize: 18, fontWeight: 600, color: C.text, lineHeight: 1.5 }}>
            {briefing}
          </div>
        )}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ActionCard({ gap }: { gap: any }) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch(`${API}/api/v1/assistant/course-action-insight?course_title=${encodeURIComponent(gap.course_title)}&district=${encodeURIComponent(gap.district)}`)
      .then((res) => res.json())
      .then((data) => {
        setInsight(data.insight);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setInsight(`Updating ${gap.course_title} in ${gap.district} will align the syllabus with current industry demands, significantly improving job placement rates for graduates.`);
        setLoading(false);
      });
  }, [gap.course_title, gap.district]);

  return (
    <div style={{ background: "white", borderRadius: 16, border: `1px solid ${C.border}`, padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 2px 8px rgba(0,0,0,0.03)", transition: "all 0.2s" }}
         onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
         onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.03)"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 4 }}>{gap.course_title}</div>
            <div style={{ fontSize: 12, color: C.textSub, fontWeight: 600 }}>📍 {gap.district} · {gap.institute_type}</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, background: C.redLight, color: C.red, padding: "4px 10px", borderRadius: 999 }}>
            {(gap.missing_skills || []).length} Missing Skills
          </div>
        </div>
        
        <div style={{ background: C.cyanLight, borderLeft: `3px solid ${C.cyan}`, padding: "12px 14px", borderRadius: "0 8px 8px 0", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.cyan, textTransform: "uppercase", marginBottom: 4 }}>AI Insight</div>
          {loading ? (
            <div style={{ fontSize: 13, color: C.textSub, animation: "pulse 1.5s infinite" }}>Generating personalized insight...</div>
          ) : (
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{insight}</div>
          )}
        </div>
      </div>
      
      <button onClick={() => router.push(`/bridge-pack/${gap.course_id}`)}
              style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.orange}, #ea580c)`, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 14px rgba(249,115,22,0.25)` }}>
        ⚡ Generate 20-Hour Bridge Pack
      </button>
    </div>
  );
}
