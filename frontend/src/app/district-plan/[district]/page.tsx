"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.port === "3000") ? "http://localhost:8000" : "");

const C = {
  orange:"#f97316",orangeLight:"#fff7ed",orangeMid:"#fdba74",
  cyan:"#0891b2",cyanLight:"#ecfeff",cyanMid:"#cffafe",
  green:"#16a34a",greenLight:"#f0fdf4",
  purple:"#7c3aed",purpleLight:"#f5f3ff",
  red:"#dc2626",redLight:"#fef2f2",
  amber:"#d97706",amberLight:"#fffbeb",
  sky:"#0284c7",skyLight:"#f0f9ff",
  bg:"#fafcfd",card:"#ffffff",
  border:"rgba(0,0,0,0.07)",
  text:"#0f172a",textSub:"#475569",textMuted:"#94a3b8",
};

interface DistrictPlanData {
  district:string; plan_generated_at:string;
  total_courses:number; total_jobs:number; avg_alignment_score:number; deficit_status:string;
  critical_deficit_courses:number; moderate_gap_courses:number;
  trainees_at_critical_risk:number; trainees_at_moderate_risk:number; total_trainees_at_risk:number;
  sector_summary:{sector:string;course_count:number;avg_score:number;status:string}[];
  top_skill_gaps:{rank:number;skill:string;courses_affected:number;affected_course_names:string[]}[];
  priority_interventions:{skill:string;courses_affected:number;affected_course_names:string[];priority_score:number;recommended_hours:number;estimated_trainees_benefited:number;estimated_salary_lift_pct:number}[];
  top_employers:{company:string;job_count:number}[];
}

interface ProposalData {
  memo_id: string;
  date: string;
  recipient: string;
  sender: string;
  subject: string;
  full_text: string;
}

interface SimResult {
  district: string; skill: string; proposed_hours: number;
  courses_affected: number; trainees_benefited: number;
  avg_alignment_score_gain: number; estimated_employability_lift_pct: number;
  estimated_salary_lift_inr: number; recommendation: string;
}

function ScoreBar({ score }: { score: number }) {
  const color = score>=80?C.green:score>=50?C.amber:C.red;
  return (
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <div style={{flex:1,height:8,background:"#f1f5f9",borderRadius:999}}>
        <div style={{height:8,width:`${Math.round(score)}%`,background:color,borderRadius:999,transition:"width 0.8s ease"}} />
      </div>
      <span style={{fontSize:12,fontWeight:700,color,minWidth:42}}>{Math.round(score)}/100</span>
    </div>
  );
}

function PriorityBadge({ score }: { score: number }) {
  if(score>=80) return <span style={{fontSize:11,fontWeight:800,padding:"3px 9px",borderRadius:999,background:C.redLight,color:C.red,border:`1px solid ${C.red}30`}}>HIGH</span>;
  if(score>=50) return <span style={{fontSize:11,fontWeight:800,padding:"3px 9px",borderRadius:999,background:C.amberLight,color:C.amber,border:`1px solid ${C.amber}30`}}>MEDIUM</span>;
  return <span style={{fontSize:11,fontWeight:800,padding:"3px 9px",borderRadius:999,background:C.greenLight,color:C.green,border:`1px solid ${C.green}30`}}>LOW</span>;
}

function Loader() {
  const [p,setP] = useState(15);
  useEffect(()=>{const t=setInterval(()=>setP(prev=>prev>=95?95:prev+Math.floor(Math.random()*14+8)),120);return()=>clearInterval(t);},[]);
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",fontFamily:"'Inter',sans-serif"}}>
      <style jsx>{`@keyframes spinGrad{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
      <div style={{position:"relative",width:88,height:88,marginBottom:24}}>
        <div style={{position:"absolute",inset:-4,borderRadius:"50%",background:`conic-gradient(from 0deg,${C.green},${C.cyan},${C.purple},${C.green})`,animation:"spinGrad 1.6s linear infinite",filter:"blur(3px)",opacity:0.9}} />
        <div style={{position:"absolute",inset:2,borderRadius:"50%",background:"white",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:19,fontWeight:900,color:C.green}}>{p}%</span>
        </div>
      </div>
      <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:6}}>Generating District Plan...</div>
      <div style={{fontSize:13,color:C.textMuted}}>Aggregating gap data, employer citations & priority scores</div>
    </div>
  );
}

export default function DistrictPlanPage() {
  const params = useParams();
  const router = useRouter();
  const districtName = params?.district ? decodeURIComponent(String(params.district)) : "";
  const [data, setData] = useState<DistrictPlanData|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [proposal, setProposal] = useState<ProposalData|null>(null);
  const [showProposalModal, setShowProposalModal] = useState(false);

  // Simulator state
  const [simSkill, setSimSkill] = useState("CNC Lathe & Turning Operation");
  const [simHours, setSimHours] = useState(20);
  const [simResult, setSimResult] = useState<SimResult|null>(null);
  const [simLoading, setSimLoading] = useState(false);

  useEffect(()=>{
    if(!districtName) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const fetchPlan = async () => {
      try {
        const endpoint = `/api/v1/districts/${encodeURIComponent(districtName)}/plan`;
        let r = await fetch(API ? `${API}${endpoint}` : endpoint).catch(() => null);
        if (!r || !r.ok) {
          r = await fetch(endpoint).catch(() => null);
        }
        if (r && r.ok) {
          const d = await r.json();
          setData(d);
          setLoading(false);
          if (d.top_skill_gaps && d.top_skill_gaps.length > 0) {
            setSimSkill(d.top_skill_gaps[0].skill);
          }
          return;
        }
        throw new Error(`District Plan data for ${districtName} is initializing...`);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    };
    fetchPlan();
  },[districtName]);

  const fetchProposal = () => {
    fetch(`${API}/api/v1/districts/${encodeURIComponent(districtName)}/proposal`)
      .then(r => r.json())
      .then(p => { setProposal(p); setShowProposalModal(true); })
      .catch(console.error);
  };

  const runSimulation = () => {
    setSimLoading(true);
    fetch(`${API}/api/v1/analytics/intervention-simulator?district=${encodeURIComponent(districtName)}&skill=${encodeURIComponent(simSkill)}&proposed_hours=${simHours}`)
      .then(r => r.json())
      .then(res => { setSimResult(res); setSimLoading(false); })
      .catch(err => { console.error(err); setSimLoading(false); });
  };

  if(loading) return <div style={{background:C.bg,minHeight:"100vh",padding:"40px",fontFamily:"'Inter',sans-serif"}}><Loader /></div>;

  if(error||!data) return (
    <div style={{background:C.bg,minHeight:"100vh",padding:"40px",fontFamily:"'Inter',sans-serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontSize:40,marginBottom:16}}>🗺️</div>
      <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:8}}>District Plan Not Available</div>
      <div style={{fontSize:14,color:C.textMuted,marginBottom:24}}>{error||`No data found for ${districtName}. Run pipeline to generate gap analysis.`}</div>
      <button onClick={()=>router.push("/dashboard")} style={{padding:"12px 24px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${C.cyan},${C.purple})`,color:"white",fontWeight:700,fontSize:14,cursor:"pointer"}}>Back to Dashboard</button>
    </div>
  );

  const defColor = data.deficit_status==="ALIGNED"?C.green:data.deficit_status==="MODERATE"?C.amber:C.red;
  const defBg = data.deficit_status==="ALIGNED"?C.greenLight:data.deficit_status==="MODERATE"?C.amberLight:C.redLight;
  const genDate = new Date(data.plan_generated_at).toLocaleDateString("en-IN",{year:"numeric",month:"long",day:"numeric"});

  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'Inter',sans-serif"}}>
      <style jsx global>{`
        @keyframes fadeInUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @media print{.no-print{display:none!important}body{background:white!important}.print-card{break-inside:avoid;page-break-inside:avoid}}
      `}</style>

      {/* Nav Bar */}
      <div className="no-print" style={{background:"white",borderBottom:`1px solid ${C.border}`,padding:"14px 36px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <button onClick={()=>router.push("/dashboard")} className="btn-dark" style={{ padding: "9px 20px", fontSize: 13, borderRadius: 999 }}>
            ← Dashboard
          </button>
          <div style={{fontSize:13,color:C.textMuted}}>/ District Plans / <strong style={{color:C.text}}>{data.district}</strong></div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <Link href="/student" className="btn-light" style={{ padding: "8px 18px", fontSize: 13, borderRadius: 999 }}>
            🎓 Student Portal
          </Link>
          <button onClick={fetchProposal}
            style={{padding:"9px 20px",borderRadius:999,border:`1px solid ${C.orangeMid}`,background:C.orangeLight,color:C.orange,fontSize:13,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",gap:6,boxShadow:"0 1px 3px rgba(249,115,22,0.1)",transition:"all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"}}
            onMouseEnter={e=>{ (e.currentTarget as HTMLButtonElement).style.transform="translateY(-1px)"; (e.currentTarget as HTMLButtonElement).style.background=C.orangeMid; }}
            onMouseLeave={e=>{ (e.currentTarget as HTMLButtonElement).style.transform="none"; (e.currentTarget as HTMLButtonElement).style.background=C.orangeLight; }}
          >📜 NCVET Memo Proposal</button>
          <button onClick={()=>window.print()}
            style={{padding:"9px 22px",borderRadius:999,border:"none",background:`linear-gradient(135deg,${C.purple},${C.cyan})`,color:"white",fontWeight:800,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:6,boxShadow:"0 4px 14px rgba(124,58,237,0.25)",transition:"all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"}}
            onMouseEnter={e=>{ (e.currentTarget as HTMLButtonElement).style.transform="translateY(-1px)"; }}
            onMouseLeave={e=>{ (e.currentTarget as HTMLButtonElement).style.transform="none"; }}
          >📄 Export PDF</button>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"32px 24px"}}>

        {/* Government Header */}
        <div style={{background:`linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,${C.cyan} 100%)`,borderRadius:20,padding:"36px 40px",marginBottom:28,color:"white",animation:"fadeInUp 0.5s ease"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:20}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",opacity:0.7,marginBottom:8}}>Government of Maharashtra · DVET · PS 26134</div>
              <div style={{fontSize:32,fontWeight:900,fontFamily:"'Playfair Display',serif",marginBottom:6}}>{data.district} District</div>
              <div style={{fontSize:20,fontWeight:600,opacity:0.85,marginBottom:16}}>Skill Development Plan 2025–26</div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                <span style={{padding:"5px 14px",borderRadius:999,background:"rgba(255,255,255,0.15)",fontSize:12,fontWeight:600}}>Generated: {genDate}</span>
                <span style={{padding:"5px 14px",borderRadius:999,background:defBg,color:defColor,fontSize:12,fontWeight:800}}>{data.deficit_status}</span>
                <span style={{padding:"5px 14px",borderRadius:999,background:"rgba(255,255,255,0.15)",fontSize:12,fontWeight:600}}>Avg Score: {Math.round(data.avg_alignment_score)}/100</span>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,flexShrink:0}}>
              {[{v:data.total_courses,l:"Active Courses"},{v:data.total_jobs,l:"Active Jobs"},{v:data.total_trainees_at_risk.toLocaleString(),l:"Trainees at Risk"},{v:data.priority_interventions.length,l:"Priority Actions"}].map((item,i)=>(
                <div key={i} style={{background:"rgba(255,255,255,0.12)",borderRadius:12,padding:"14px 18px",textAlign:"center",backdropFilter:"blur(8px)"}}>
                  <div style={{fontSize:24,fontWeight:900}}>{item.v}</div>
                  <div style={{fontSize:11,opacity:0.75,marginTop:2}}>{item.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── INTERACTIVE WHAT-IF INTERVENTION SIMULATOR ────────────────── */}
        <div className="no-print" style={{ background: "white", borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ padding: "18px 24px", background: `linear-gradient(135deg, ${C.cyanLight}, ${C.purpleLight})`, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>🧪 What-If Skilling Intervention Simulator</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Simulate policy outcomes before spending government budget on training</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 999, background: C.cyan, color: "white" }}>Deterministic Calculator</span>
          </div>

          <div style={{ padding: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr auto", gap: 16, alignItems: "center", marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.textSub, display: "block", marginBottom: 6 }}>Target Skill Gap to Add</label>
                <select value={simSkill} onChange={e => setSimSkill(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, fontSize: 13, fontWeight: 600, color: C.text, outline: "none" }}>
                  {data.top_skill_gaps.map(g => (
                    <option key={g.skill} value={g.skill}>{g.skill} ({g.courses_affected} courses missing)</option>
                  ))}
                  <option value="PLC Programming & Troubleshooting">PLC Programming &amp; Troubleshooting</option>
                  <option value="EV Battery Management Systems">EV Battery Management Systems</option>
                  <option value="Solar PV Installation & Net Metering">Solar PV Installation &amp; Net Metering</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.textSub, display: "block", marginBottom: 6 }}>Proposed Workshop Duration</label>
                <select value={simHours} onChange={e => setSimHours(Number(e.target.value))}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, fontSize: 13, fontWeight: 600, color: C.text, outline: "none" }}>
                  <option value={10}>10 Hours (Short Workshop)</option>
                  <option value={20}>20 Hours (Full Modular Upgrade)</option>
                  <option value={40}>40 Hours (Deep Skill Certification)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.textSub, display: "block", marginBottom: 6 }}>Target District</label>
                <input value={districtName} disabled style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: "#f1f5f9", fontSize: 13, fontWeight: 700, color: C.textSub }} />
              </div>

              <div style={{ alignSelf: "end" }}>
                <button onClick={runSimulation} disabled={simLoading}
                  style={{ padding: "11px 24px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})`, color: "white", fontWeight: 700, fontSize: 13, cursor: simLoading ? "wait" : "pointer", boxShadow: "0 4px 14px rgba(8,145,178,0.25)" }}>
                  {simLoading ? "Calculating..." : "⚡ Run Simulation"}
                </button>
              </div>
            </div>

            {simResult && (
              <div style={{ padding: "20px", borderRadius: 14, background: C.bg, border: `1px solid ${C.cyanMid}`, animation: "fadeInUp 0.3s ease" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.cyan, marginBottom: 12 }}>
                  📊 Simulation Results for &quot;{simResult.skill}&quot; in {simResult.district} ({simResult.proposed_hours}h)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 14 }}>
                  <div style={{ background: "white", padding: "12px", borderRadius: 10, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: C.purple }}>+{simResult.avg_alignment_score_gain} pts</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Avg Score Gain</div>
                  </div>
                  <div style={{ background: "white", padding: "12px", borderRadius: 10, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: C.cyan }}>{simResult.courses_affected}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Courses Upgraded</div>
                  </div>
                  <div style={{ background: "white", padding: "12px", borderRadius: 10, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: C.green }}>{simResult.trainees_benefited.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Trainees Benefited</div>
                  </div>
                  <div style={{ background: "white", padding: "12px", borderRadius: 10, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: C.orange }}>+{simResult.estimated_employability_lift_pct}%</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Employability Lift</div>
                  </div>
                  <div style={{ background: "white", padding: "12px", borderRadius: 10, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#16a34a" }}>+₹{simResult.estimated_salary_lift_inr}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Monthly Salary Lift</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, background: "white", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}` }}>
                  💡 <strong>Policy Recommendation:</strong> {simResult.recommendation}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Course Health + Trainees */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
          <div className="print-card" style={{background:"white",borderRadius:16,padding:"24px",border:`1px solid ${C.border}`}}>
            <div style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:16}}>Course Health Breakdown</div>
            {[
              {label:"Critical Deficit (Score < 50)",count:data.critical_deficit_courses,color:C.red,bg:C.redLight},
              {label:"Moderate Gap (Score 50–79)",count:data.moderate_gap_courses,color:C.amber,bg:C.amberLight},
              {label:"Aligned (Score >= 80)",count:Math.max(0,data.total_courses-data.critical_deficit_courses-data.moderate_gap_courses),color:C.green,bg:C.greenLight},
            ].map((row,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderRadius:10,background:row.bg,marginBottom:8}}>
                <div style={{fontSize:13,fontWeight:600,color:row.color}}>{row.label}</div>
                <div style={{fontSize:22,fontWeight:900,color:row.color}}>{row.count}</div>
              </div>
            ))}
          </div>
          <div className="print-card" style={{background:"white",borderRadius:16,padding:"24px",border:`1px solid ${C.border}`}}>
            <div style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:16}}>Trainee Impact Assessment</div>
            <div style={{padding:"16px",background:C.redLight,borderRadius:12,marginBottom:12,border:`1px solid ${C.red}20`}}>
              <div style={{fontSize:11,fontWeight:700,color:C.red,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Critical Risk</div>
              <div style={{fontSize:30,fontWeight:900,color:C.text}}>{data.trainees_at_critical_risk.toLocaleString()}</div>
              <div style={{fontSize:12,color:C.textSub}}>Trainees in courses with score below 50</div>
            </div>
            <div style={{padding:"16px",background:C.amberLight,borderRadius:12,border:`1px solid ${C.amber}20`}}>
              <div style={{fontSize:11,fontWeight:700,color:C.amber,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Moderate Risk</div>
              <div style={{fontSize:30,fontWeight:900,color:C.text}}>{data.trainees_at_moderate_risk.toLocaleString()}</div>
              <div style={{fontSize:12,color:C.textSub}}>Trainees in courses with score 50–79</div>
            </div>
          </div>
        </div>

        {/* Priority Interventions */}
        <div className="print-card" style={{background:"white",borderRadius:16,border:`1px solid ${C.border}`,overflow:"hidden",marginBottom:24}}>
          <div style={{padding:"20px 24px",borderBottom:`1px solid ${C.border}`,background:`linear-gradient(135deg,${C.purpleLight},${C.cyanLight})`}}>
            <div style={{fontSize:17,fontWeight:800,color:C.text}}>Priority Interventions</div>
            <div style={{fontSize:12,color:C.textMuted,marginTop:2}}>Top skill gaps ranked by impact score — recommended immediate government action</div>
          </div>
          <div style={{padding:"20px 24px"}}>
            {data.priority_interventions.length===0 ? (
              <div style={{textAlign:"center",padding:"32px",color:C.textMuted}}>No critical interventions needed — district is well aligned!</div>
            ) : data.priority_interventions.map((item,i)=>(
              <div key={i} className="print-card" style={{marginBottom:16,padding:"20px",borderRadius:14,border:`1px solid ${C.border}`,background:C.bg}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${C.purple},${C.cyan})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:900,color:"white",flexShrink:0}}>#{i+1}</div>
                    <div>
                      <div style={{fontSize:16,fontWeight:800,color:C.text}}>{item.skill}</div>
                      <div style={{fontSize:12,color:C.textMuted,marginTop:2}}>Missing in {item.courses_affected} course{item.courses_affected!==1?"s":""}</div>
                    </div>
                  </div>
                  <PriorityBadge score={item.priority_score} />
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
                  {[
                    {label:"Priority Score",value:`${item.priority_score}/100`,color:C.purple},
                    {label:"Recommended Hours",value:`${item.recommended_hours}h`,color:C.cyan},
                    {label:"Trainees Benefited",value:item.estimated_trainees_benefited.toLocaleString(),color:C.green},
                    {label:"Salary Lift (Est.)",value:`+${item.estimated_salary_lift_pct}%`,color:C.orange},
                  ].map((m,j)=>(
                    <div key={j} style={{background:"white",padding:"12px 14px",borderRadius:10,border:`1px solid ${C.border}`}}>
                      <div style={{fontSize:18,fontWeight:800,color:m.color}}>{m.value}</div>
                      <div style={{fontSize:11,color:C.textMuted,marginTop:2}}>{m.label}</div>
                    </div>
                  ))}
                </div>
                {item.affected_course_names.length>0 && (
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Affected Courses:</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {item.affected_course_names.map(cn=><span key={cn} style={{fontSize:11,padding:"3px 10px",borderRadius:999,background:"white",color:C.textSub,border:`1px solid ${C.border}`}}>{cn}</span>)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Skill Gap Matrix */}
        <div className="print-card" style={{background:"white",borderRadius:16,border:`1px solid ${C.border}`,overflow:"hidden",marginBottom:24}}>
          <div style={{padding:"20px 24px",borderBottom:`1px solid ${C.border}`}}>
            <div style={{fontSize:17,fontWeight:800,color:C.text}}>Skill Gap Matrix</div>
            <div style={{fontSize:12,color:C.textMuted,marginTop:2}}>All missing skills ranked by frequency across {data.district} courses</div>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:C.bg}}>
                  {["Rank","Missing Skill","Courses Affected","Sample Courses","Action"].map(h=>(
                    <th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:11,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.top_skill_gaps.map((gap,i)=>(
                  <tr key={i} style={{borderTop:`1px solid ${C.border}`,transition:"background 0.15s"}}
                    onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=C.bg}
                    onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background="white"}
                  >
                    <td style={{padding:"12px 16px"}}>
                      <div style={{width:28,height:28,borderRadius:8,background:i<3?`linear-gradient(135deg,${C.purple},${C.cyan})`:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:i<3?"white":C.textMuted}}>{gap.rank}</div>
                    </td>
                    <td style={{padding:"12px 16px",fontSize:14,fontWeight:700,color:C.text}}>{gap.skill}</td>
                    <td style={{padding:"12px 16px"}}>
                      <span style={{fontSize:15,fontWeight:800,color:gap.courses_affected>=4?C.red:gap.courses_affected>=2?C.amber:C.green}}>{gap.courses_affected}</span>
                      <span style={{fontSize:11,color:C.textMuted,marginLeft:4}}>course{gap.courses_affected!==1?"s":""}</span>
                    </td>
                    <td style={{padding:"12px 16px"}}>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                        {gap.affected_course_names.map(cn=>(
                          <span key={cn} style={{fontSize:10,padding:"2px 8px",borderRadius:999,background:C.bg,color:C.textSub,border:`1px solid ${C.border}`}}>{cn.length>30?cn.slice(0,30)+"…":cn}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{padding:"12px 16px"}}><span style={{fontSize:11,padding:"3px 9px",borderRadius:999,background:C.cyanLight,color:C.cyan,fontWeight:700}}>Bridge Pack</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sectors + Employers */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
          <div className="print-card" style={{background:"white",borderRadius:16,border:`1px solid ${C.border}`,overflow:"hidden"}}>
            <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.border}`,background:`linear-gradient(135deg,${C.orangeLight},${C.cyanLight})`}}>
              <div style={{fontSize:15,fontWeight:800,color:C.text}}>Sector Alignment Breakdown</div>
              <div style={{fontSize:12,color:C.textMuted,marginTop:2}}>Sectors sorted by alignment score (critical first)</div>
            </div>
            <div style={{padding:"16px 20px"}}>
              {data.sector_summary.map((sector,i)=>(
                <div key={i} style={{marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:C.text}}>{sector.sector}</div>
                      <div style={{fontSize:11,color:C.textMuted}}>{sector.course_count} course{sector.course_count!==1?"s":""}</div>
                    </div>
                    <span style={{fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:999,background:sector.status==="ALIGNED"?C.greenLight:sector.status==="MODERATE"?C.amberLight:C.redLight,color:sector.status==="ALIGNED"?C.green:sector.status==="MODERATE"?C.amber:C.red}}>{sector.status}</span>
                  </div>
                  <ScoreBar score={sector.avg_score} />
                </div>
              ))}
            </div>
          </div>
          <div className="print-card" style={{background:"white",borderRadius:16,border:`1px solid ${C.border}`,overflow:"hidden"}}>
            <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.border}`,background:`linear-gradient(135deg,${C.greenLight},${C.cyanLight})`}}>
              <div style={{fontSize:15,fontWeight:800,color:C.text}}>Top Employers in {data.district}</div>
              <div style={{fontSize:12,color:C.textMuted,marginTop:2}}>Companies actively hiring in this district</div>
            </div>
            <div style={{padding:"16px 20px"}}>
              {data.top_employers.length===0 ? (
                <div style={{textAlign:"center",padding:"24px",color:C.textMuted}}>No employer data available. Run pipeline to scan job postings.</div>
              ) : data.top_employers.map((emp,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderRadius:10,background:C.bg,marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:32,height:32,borderRadius:8,background:`linear-gradient(135deg,${C.cyan},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"white"}}>{emp.company.slice(0,1)}</div>
                    <div style={{fontSize:13,fontWeight:600,color:C.text}}>{emp.company}</div>
                  </div>
                  <div style={{fontSize:12,color:C.textSub,fontWeight:600}}>{emp.job_count} posting{emp.job_count!==1?"s":""}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Govt Action Items */}
        <div className="print-card" style={{background:`linear-gradient(135deg,#1e1b4b,#312e81)`,borderRadius:16,padding:"28px 32px",marginBottom:24,color:"white"}}>
          <div style={{fontSize:17,fontWeight:800,marginBottom:6}}>Recommended Government Actions</div>
          <div style={{fontSize:12,opacity:0.7,marginBottom:20}}>Priority action items for DVET officers and district administration</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            {[
              {icon:"⚡",title:"Immediate (0–3 months)",desc:`Launch 20-hour bridge packs for ${data.priority_interventions.slice(0,2).map(i=>i.skill).join(", ")} at district ITIs`,tag:"URGENT"},
              {icon:"📦",title:"Equipment Procurement (1–6 months)",desc:"Procure lab equipment via GeM portal — budget from PM Kaushal Vikas Yojana",tag:"PROCUREMENT"},
              {icon:"🏫",title:"Faculty Upskilling (3–6 months)",desc:`Train ${Math.ceil(data.total_courses/5)} ITI instructors through CSTARI-certified programs`,tag:"CAPACITY"},
              {icon:"📊",title:"Monitoring (Ongoing)",desc:"Re-run SkillX pipeline quarterly — target 80+ score across all courses by 2026",tag:"TRACKING"},
            ].map((action,i)=>(
              <div key={i} style={{background:"rgba(255,255,255,0.1)",borderRadius:12,padding:"16px 18px",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.1)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <span style={{fontSize:18}}>{action.icon}</span>
                  <div style={{fontSize:13,fontWeight:800}}>{action.title}</div>
                  <span style={{marginLeft:"auto",fontSize:10,fontWeight:800,padding:"2px 7px",borderRadius:999,background:"rgba(255,255,255,0.2)"}}>{action.tag}</span>
                </div>
                <div style={{fontSize:12,opacity:0.8,lineHeight:1.5}}>{action.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{textAlign:"center",padding:"20px 0",color:C.textMuted,fontSize:12}}>
          <div style={{marginBottom:4}}>SkillX Labour Market Intelligence Platform · SIH 2026 · PS 26134</div>
          <div>Generated by deterministic AI analysis · DVET Maharashtra · {genDate}</div>
        </div>
      </div>

      {/* Proposal Modal */}
      {showProposalModal && proposal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 20, maxWidth: 700, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.orangeLight }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.orange, textTransform: "uppercase", letterSpacing: "0.1em" }}>Official NCVET Policy Proposal Memo</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{proposal.memo_id}</div>
              </div>
              <button onClick={() => setShowProposalModal(false)} style={{ fontSize: 24, border: "none", background: "none", cursor: "pointer", color: C.textMuted }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "24px", background: "#fafafa" }}>
              <pre style={{ fontFamily: "monospace", fontSize: 12, color: C.text, whiteSpace: "pre-wrap", lineHeight: 1.6, margin: 0, background: "white", padding: "20px", borderRadius: 12, border: `1px solid ${C.border}` }}>
                {proposal.full_text}
              </pre>
            </div>
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "white" }}>
              <span style={{ fontSize: 12, color: C.textMuted }}>{proposal.date} · DVET Maharashtra</span>
              <button onClick={() => {
                const blob = new Blob([proposal.full_text], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `NCVET_Proposal_${districtName}_2026.txt`;
                a.click();
              }} style={{ padding: "9px 20px", borderRadius: 10, background: C.orange, color: "white", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>
                📥 Download Memo (.txt)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
