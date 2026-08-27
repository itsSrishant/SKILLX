"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Building2, 
  Cpu, 
  Briefcase, 
  BookOpen, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Play, 
  RefreshCw, 
  Zap,
  MapPin,
  TrendingUp,
  Layers,
  Award,
  Search,
  ChevronRight,
  X,
  HelpCircle,
  BarChart3,
  Check,
  XCircle,
  SlidersHorizontal,
  GraduationCap,
  Sparkles,
  BookCheck,
  ShieldAlert,
  Database
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell
} from "recharts";

const API_BASE = "http://localhost:8000/api/v1";

interface OverviewMetrics {
  total_courses: number;
  dvet_iti_trades_catalog: number;
  dvet_total_itis: string;
  dvet_seat_capacity: string;
  mssds_course_master_catalog: string;
  mssds_training_centers: string;
  total_relevant_jobs: number;
  total_skills_extracted: number;
  candidate_unknown_skills_count: number;
  avg_alignment_score_percentage: number;
  high_deficit_districts_count: number;
}

interface CourseGapItem {
  id: number;
  course_title: string;
  institute_type: string;
  sector: string;
  district: string;
  alignment_score: number;
  fully_covered_skills: string[];
  partially_covered_skills: string[];
  missing_skills: string[];
  execution_latency_ms: number;
}

interface DistrictSummary {
  district: string;
  active_courses: number;
  relevant_jobs: number;
  avg_alignment_score: number;
  top_missing_skills: string[];
  deficit_status: string;
}

interface EngineResult {
  engine: string;
  status: string;
  latency_ms: number;
  latency_sec: number;
  collectors_used?: string[];
  courses_added?: number;
  courses_updated?: number;
  courses_unchanged?: number;
  jobs_added?: number;
  jobs_updated?: number;
  expired_marked?: number;
  skill_dictionary_terms?: number;
  candidate_unknown_skills_flagged?: number;
  total_skills_db?: number;
  avg_alignment_score?: number;
}

interface PipelineRunSummary {
  status: string;
  total_latency_ms: number;
  total_latency_sec: number;
  engine1: EngineResult;
  engine2: EngineResult;
  engine3: EngineResult;
  engine4: EngineResult;
}

interface SkillDictItem {
  id: number;
  standard_name: string;
  category: string;
  synonyms: string[];
}

interface CandidateSkillItem {
  skill_name: string;
  category: string;
  confidence_score: number;
  source_type: string;
}

export default function GovtAdminDashboard() {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [courses, setCourses] = useState<CourseGapItem[]>([]);
  const [districts, setDistricts] = useState<DistrictSummary[]>([]);
  const [dictionary, setDictionary] = useState<SkillDictItem[]>([]);
  const [candidateSkills, setCandidateSkills] = useState<CandidateSkillItem[]>([]);
  
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeEngine, setActiveEngine] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [lastSummary, setLastSummary] = useState<PipelineRunSummary | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSector, setSelectedSector] = useState<string>("ALL");
  
  const [inspectCourse, setInspectCourse] = useState<CourseGapItem | null>(null);
  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false);
  const [showDictModal, setShowDictModal] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      const [mRes, gRes, dRes, dictRes] = await Promise.all([
        axios.get(`${API_BASE}/metrics/overview`),
        axios.get(`${API_BASE}/analytics/gap-analysis`),
        axios.get(`${API_BASE}/analytics/district-summary`),
        axios.get(`${API_BASE}/skills/dictionary`)
      ]);
      setMetrics(mRes.data);
      setCourses(gRes.data);
      setDistricts(dRes.data);
      setDictionary(dictRes.data.dictionary || []);
      setCandidateSkills(dictRes.data.candidate_unknown_skills || []);
    } catch (err) {
      console.error("Error fetching data from FastAPI backend:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, parseFloat((prev - 0.1).toFixed(1))));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const handleRunAllEngines = async () => {
    setIsRunning(true);
    setProgress(10);
    setActiveEngine("Engine 1: Ingesting DVET 85 Trades & MSSDS Master (SHA-256 Hashes)...");
    setTimeLeft(0.8);

    const timer1 = setTimeout(() => {
      setProgress(40);
      setActiveEngine("Engine 2: Ingesting Job Postings (Job ID Deduplication & Status Tracking)...");
    }, 200);

    const timer2 = setTimeout(() => {
      setProgress(70);
      setActiveEngine("Engine 3: Central Skill Dictionary Normalization & Candidate Detection...");
    }, 400);

    const timer3 = setTimeout(() => {
      setProgress(90);
      setActiveEngine("Engine 4: 3-Tier Skill Gap & Demand Weighting Engine...");
    }, 600);

    try {
      const res = await axios.post(`${API_BASE}/engines/run-all`);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      setProgress(100);
      setActiveEngine("Pipeline Completed Successfully!");
      setLastSummary(res.data);
      setTimeLeft(0);
      await fetchData();
    } catch (err) {
      console.error("Engine execution error:", err);
      setActiveEngine("Engine Execution Failed");
    } finally {
      setTimeout(() => {
        setIsRunning(false);
      }, 600);
    }
  };

  const sectors = ["ALL", ...Array.from(new Set(courses.map(c => c.sector)))];

  const filteredCourses = courses.filter(c => {
    const matchesDistrict = selectedDistrict === "ALL" || c.district === selectedDistrict;
    const matchesType = filterType === "ALL" || c.institute_type === filterType;
    const matchesSector = selectedSector === "ALL" || c.sector === selectedSector;
    const matchesSearch = searchQuery === "" || 
      c.course_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.fully_covered_skills || []).some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.missing_skills || []).some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesDistrict && matchesType && matchesSector && matchesSearch;
  });

  const chartData = districts.map(d => ({
    name: d.district,
    score: d.avg_alignment_score,
    fill: d.avg_alignment_score >= 85 ? "#10b981" : (d.avg_alignment_score >= 75 ? "#f59e0b" : "#f43f5e")
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8 selection:bg-blue-500 selection:text-white">
      {/* Background Ambient Glow */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800/80 pb-6 mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-semibold rounded-full border border-amber-500/20 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" /> Govt. of Maharashtra • Skill Development & Entrepreneurship Dept
            </span>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20">
              SIH 2026 (SIH26134)
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-2 text-white flex items-center gap-3">
            SkillX <span className="text-blue-400 font-light text-2xl md:text-3xl">| Labour Market Intelligence Portal</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-3xl">
            Advanced 4-Engine Architecture featuring Source Collectors, SHA-256 Change Hashing, Central Skill Dictionary Normalization, and 3-Tier Skill Coverage Analysis.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowDictModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-xl text-xs font-semibold transition"
          >
            <Database className="w-4 h-4" /> Skill Dictionary ({dictionary.length})
          </button>

          <button
            onClick={() => setShowFormulaModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold transition"
          >
            <HelpCircle className="w-4 h-4" /> How Alignment Works?
          </button>

          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 text-xs font-medium transition shadow-sm"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" /> Refresh Data
          </button>
        </div>
      </header>

      {/* Advanced Research Architecture Pitch Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950/60 to-slate-900 border border-blue-800/40 rounded-2xl p-6 mb-8 backdrop-blur shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400 hidden sm:block shadow-inner">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                Upgraded Engine Pipeline Architecture (Research-Aligned Specs)
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Dedicated Collectors • SHA-256 Hashing • Skill Dictionary Normalization • 3-Tier Skill Coverage
              </h3>
              <p className="text-slate-300 text-xs mt-1.5 leading-relaxed max-w-4xl">
                Engines 1 & 2 operate dedicated source collectors (<code>ITICollector</code>, <code>MSSDSCollector</code>), store raw HTML sources for auditability, and track <strong>Active vs Inactive/Expired status</strong> without deleting historical data. Engine 3 normalizes terms into a central 6-category <strong>Skill Dictionary</strong> and flags <strong>Candidate Unknown Skills</strong> with confidence scoring. Engine 4 computes <strong>3-Tier Coverage (Fully Covered, Partially Covered, Missing Deficit)</strong> weighted by industry job recency!
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 w-full lg:w-auto">
            <button 
              onClick={() => setShowDictModal(true)}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-600/20 text-center"
            >
              Inspect Skill Dictionary & Candidate Terms
            </button>
          </div>
        </div>
      </div>

      {/* Top Metric Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>DVET ITI TRADES</span>
            <BookOpen className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-extrabold mt-2 text-white">85 <span className="text-xs font-normal text-slate-400">Trades</span></p>
          <span className="text-[11px] text-blue-400 font-medium mt-1 block">1,004 ITIs • 2.43L Intake Seats</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>MSSDS COURSE MASTER</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-3xl font-extrabold mt-2 text-white">1,200+</p>
          <span className="text-[11px] text-purple-400 font-medium mt-1 block">2,152 Centres • 7,151 Batches</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>SKILL DICTIONARY TERMS</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold mt-2 text-white">{dictionary.length}</p>
          <span className="text-[11px] text-emerald-400 font-medium mt-1 block">{candidateSkills.length} Candidate Terms Flagged</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>AVG ALIGNMENT SCORE</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-extrabold mt-2 text-amber-400">
            {metrics?.avg_alignment_score_percentage || 0}%
          </p>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">Curriculum vs Job Demand</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>EXTRACTED SKILLS (ZERO-API)</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-3xl font-extrabold mt-2 text-white">{metrics?.total_skills_extracted || 0}</p>
          <span className="text-[11px] text-indigo-400 font-medium mt-1 block">Zero-API Local NLP</span>
        </div>
      </div>

      {/* Engine Execution Hub & Assumed Timer */}
      <section className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 mb-8 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" /> 4-Engine Execution Pipeline & Latency Tracker
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Triggers real-time Course Ingestion (E1), Job Ingestion (E2), Skill Dictionary Extractor (E3), and 3-Tier Gap Engine (E4).
            </p>
          </div>

          <button
            onClick={handleRunAllEngines}
            disabled={isRunning}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition ${
              isRunning 
                ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700" 
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/25"
            }`}
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Running Upgraded Engines...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" /> Execute All 4 Engines Live
              </>
            )}
          </button>
        </div>

        {isRunning && (
          <div className="bg-slate-950 border border-blue-900/60 rounded-xl p-5 mb-6 shadow-inner">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                <Clock className="w-4 h-4 animate-pulse" /> {activeEngine}
              </span>
              <span className="text-sm font-mono font-bold text-amber-400">
                Assumed Time Remaining: {timeLeft.toFixed(1)}s
              </span>
            </div>
            <div className="w-full bg-slate-800/80 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {lastSummary && (
          <div className="bg-slate-950/90 border border-emerald-500/30 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <span className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Advanced Pipeline Execution Completed IRL
              </span>
              <span className="text-xs font-mono bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 text-slate-300">
                Total Pipeline Latency: <strong className="text-amber-400">{lastSummary.total_latency_ms} ms</strong> ({lastSummary.total_latency_sec} sec)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 font-semibold">{lastSummary.engine1.engine}</div>
                <div className="text-amber-400 font-mono text-sm font-bold mt-1">{lastSummary.engine1.latency_ms} ms</div>
                <div className="text-slate-500 mt-1">Collectors: ITI & MSSDS (SHA-256)</div>
              </div>

              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 font-semibold">{lastSummary.engine2.engine}</div>
                <div className="text-amber-400 font-mono text-sm font-bold mt-1">{lastSummary.engine2.latency_ms} ms</div>
                <div className="text-slate-500 mt-1">Job ID Deduplication & Status Tracking</div>
              </div>

              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 font-semibold">{lastSummary.engine3.engine}</div>
                <div className="text-amber-400 font-mono text-sm font-bold mt-1">{lastSummary.engine3.latency_ms} ms</div>
                <div className="text-slate-500 mt-1">Terms: {lastSummary.engine3.skill_dictionary_terms} Dictionary • {lastSummary.engine3.candidate_unknown_skills_flagged} Candidates</div>
              </div>

              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 font-semibold">{lastSummary.engine4.engine}</div>
                <div className="text-amber-400 font-mono text-sm font-bold mt-1">{lastSummary.engine4.latency_ms} ms</div>
                <div className="text-slate-500 mt-1">Avg Score: {lastSummary.engine4.avg_alignment_score}% (3-Tier Coverage)</div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* District Intelligence & Recharts Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-rose-400" /> Maharashtra District Industrial Clusters (MIDC Hubs)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {districts.map((d) => (
              <div 
                key={d.district}
                onClick={() => setSelectedDistrict(d.district === selectedDistrict ? "ALL" : d.district)}
                className={`cursor-pointer border rounded-2xl p-4 transition backdrop-blur ${
                  selectedDistrict === d.district 
                    ? "bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/20 shadow-lg" 
                    : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white text-base">{d.district}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    d.deficit_status === "HIGH DEFICIT" 
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" 
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  }`}>
                    {d.deficit_status}
                  </span>
                </div>

                <div className="mt-3 flex justify-between items-end">
                  <div>
                    <div className="text-xs text-slate-400">Match Score</div>
                    <div className="text-2xl font-extrabold text-amber-400">{d.avg_alignment_score}%</div>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <div>{d.active_courses} Courses</div>
                    <div>{d.relevant_jobs} Jobs</div>
                  </div>
                </div>

                {d.top_missing_skills.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-400 block mb-1">Top Missing Skills:</span>
                    <div className="flex flex-wrap gap-1">
                      {d.top_missing_skills.map((sk, idx) => (
                        <span key={idx} className="text-[10px] bg-slate-800 text-rose-300 px-2 py-0.5 rounded-md border border-rose-500/20">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-xl backdrop-blur">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-400" /> District Skill Match Score Comparison
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Real-time percentage alignment between ITI/MSSDS syllabi and local industrial job postings.
            </p>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "0.75rem", color: "#fff", fontSize: "12px" }}
                    formatter={(val: any) => [`${val}% Match`, "Alignment Score"]}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800/80 mt-4 flex items-center justify-between">
            <span>Higher score = stronger course alignment with local jobs</span>
            <span className="text-amber-400 font-bold">Target &gt; 85%</span>
          </div>
        </div>
      </div>

      {/* ITI / MSSDS Course Alignment Inspector Table & Filter Bar */}
      <section className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 shadow-xl backdrop-blur">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" /> ITI & MSSDS Course Alignment Inspector (3-Tier Coverage)
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Categorizing skills into Fully Covered (Green), Partially Covered (Amber), and Missing Deficit (Rose).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search course or skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button 
                onClick={() => setFilterType("ALL")}
                className={`text-xs px-3 py-1.5 rounded-lg transition font-medium ${
                  filterType === "ALL" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                All Systems
              </button>
              <button 
                onClick={() => setFilterType("ITI")}
                className={`text-xs px-3 py-1.5 rounded-lg transition font-medium ${
                  filterType === "ITI" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                DVET ITI
              </button>
              <button 
                onClick={() => setFilterType("MSSDS")}
                className={`text-xs px-3 py-1.5 rounded-lg transition font-medium ${
                  filterType === "MSSDS" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                MSSDS Master
              </button>
            </div>
          </div>
        </div>

        {/* Course Alignment Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Course Title & System</th>
                <th className="py-3.5 px-4">Sector & District</th>
                <th className="py-3.5 px-4">Weighted Score</th>
                <th className="py-3.5 px-4">Fully Covered</th>
                <th className="py-3.5 px-4">Partially Covered</th>
                <th className="py-3.5 px-4">Missing Deficit</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
              {filteredCourses.length > 0 ? (
                filteredCourses.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-4 px-4">
                      <div className="font-bold text-white text-sm">{c.course_title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          c.institute_type === "ITI" 
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20" 
                            : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        }`}>
                          {c.institute_type === "ITI" ? "DVET ITI Trade" : "MSSDS Master"}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">ID: {c.id}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="text-slate-200 font-medium">{c.sector}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" /> {c.district}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className={`font-extrabold text-lg ${
                        c.alignment_score >= 85 ? "text-emerald-400" : (c.alignment_score >= 75 ? "text-amber-400" : "text-rose-400")
                      }`}>
                        {c.alignment_score}%
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(c.fully_covered_skills || []).map((sk, idx) => (
                          <span key={idx} className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                            {sk}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(c.partially_covered_skills || []).length > 0 ? (
                          (c.partially_covered_skills || []).map((sk, idx) => (
                            <span key={idx} className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-md">
                              {sk}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">-</span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(c.missing_skills || []).length > 0 ? (
                          (c.missing_skills || []).map((sk, idx) => (
                            <span key={idx} className="text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2 py-0.5 rounded-md">
                              {sk}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                            <Check className="w-3.5 h-3.5" /> Fully Aligned
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => setInspectCourse(c)}
                        className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold transition"
                      >
                        Inspect Gap
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No courses found matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Central Skill Dictionary & Candidate Unknown Terms Modal */}
      {showDictModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl h-5/6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-purple-400" /> Central Skill Dictionary & Candidate Terms (Engine 3)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Standardized 6-category skill taxonomy and candidate unknown terms flagged with confidence scores.
                  </p>
                </div>
                <button onClick={() => setShowDictModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Candidate Unknown Terms Alert */}
              {candidateSkills.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6">
                  <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Candidate Unknown Skills Flagged ({candidateSkills.length} Terms for Review)
                  </h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {candidateSkills.map((cand, idx) => (
                      <span key={idx} className="text-xs bg-slate-900 border border-amber-500/30 text-amber-300 px-3 py-1 rounded-xl flex items-center gap-2">
                        {cand.skill_name} <span className="text-[10px] text-slate-500">Conf: {(cand.confidence_score*100).toFixed(0)}%</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Skill Dictionary Table */}
              <div className="overflow-y-auto max-h-80 rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="py-3 px-4">Standardized Skill Name</th>
                      <th className="py-3 px-4">Taxonomy Category</th>
                      <th className="py-3 px-4">Synonyms & Variations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                    {dictionary.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-bold text-white">{item.standard_name}</td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {(item.synonyms || []).join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowDictModal(false)}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition"
              >
                Close Skill Dictionary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Skill Alignment Side Drawer */}
      {inspectCourse && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex justify-end transition-opacity">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full p-6 md:p-8 overflow-y-auto flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                <div>
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                    3-Tier Skill Alignment Analysis
                  </span>
                  <h2 className="text-2xl font-extrabold text-white mt-1">
                    {inspectCourse.course_title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {inspectCourse.institute_type} • Sector: {inspectCourse.sector} • District: {inspectCourse.district}
                  </p>
                </div>
                <button
                  onClick={() => setInspectCourse(null)}
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Match Score Banner */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 mb-6 flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-400 block">Demand-Weighted Skill Match Score</span>
                  <span className="text-xs text-slate-500 mt-0.5 block">Weighted by Industry Job Posting Recency & Demand Frequency</span>
                </div>
                <div className={`text-4xl font-extrabold ${
                  inspectCourse.alignment_score >= 85 ? "text-emerald-400" : (inspectCourse.alignment_score >= 75 ? "text-amber-400" : "text-rose-400")
                }`}>
                  {inspectCourse.alignment_score}%
                </div>
              </div>

              {/* Fully Covered Skills */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Fully Covered Skills (Taught in Course & Demanded by Industry)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(inspectCourse.fully_covered_skills || []).map((sk, idx) => (
                    <span key={idx} className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-3 py-1 rounded-xl">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              {/* Partially Covered Skills */}
              {(inspectCourse.partially_covered_skills || []).length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Partially Covered Skills (Fundamentals Taught but Lacks Advanced Depth)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(inspectCourse.partially_covered_skills || []).map((sk, idx) => (
                      <span key={idx} className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 px-3 py-1 rounded-xl">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Skills */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-rose-400 mb-2 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" /> Missing Industry Skills (Critical Deficit)
                </h4>
                {(inspectCourse.missing_skills || []).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(inspectCourse.missing_skills || []).map((sk, idx) => (
                      <span key={idx} className="text-xs bg-rose-500/10 text-rose-300 border border-rose-500/20 px-3 py-1 rounded-xl">
                        {sk}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No missing skills detected. Course syllabus is 100% aligned with market job postings.</p>
                )}
              </div>

              {/* Actionable Solution Proposal */}
              {(inspectCourse.missing_skills || []).length > 0 && (
                <div className="bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-800/40 rounded-2xl p-5">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                    Recommended SkillX Action Proposal
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Automatically generate a <strong>20-Hour Modular Skill Bridge Pack</strong> targeting: <strong className="text-rose-300">{(inspectCourse.missing_skills || []).join(", ")}</strong> to bridge this district talent deficit without revising the entire 2-year ITI syllabus.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-800 mt-6 flex justify-end">
              <button
                onClick={() => setInspectCourse(null)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Algorithm Explanation Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-400" /> Advanced 4-Engine Alignment Specifications
              </h3>
              <button onClick={() => setShowFormulaModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <h4 className="font-bold text-blue-400 mb-1">Engine 1 & 2: Dedicated Collectors & SHA-256 Hashing</h4>
                <p>
                  Operates dedicated source collectors (<code>ITICollector</code>, <code>MSSDSCollector</code>), SHA-256 change detection, Job ID deduplication, and marks old records as <code>INACTIVE</code> / <code>EXPIRED</code> to preserve historical auditability.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <h4 className="font-bold text-purple-400 mb-1">Engine 3: Skill Dictionary & Candidate Detection</h4>
                <p>
                  Normalizes extracted skills into a 6-category central <strong>Skill Dictionary</strong> and flags <strong>Candidate Unknown Terms</strong> with confidence scores for review.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <h4 className="font-bold text-emerald-400 mb-1">Engine 4: 3-Tier Coverage & Demand Weighting</h4>
                <p>
                  Classifies skills into Fully Covered, Partially Covered, and Missing Deficit, weighted by industry job recency and demand frequency.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
