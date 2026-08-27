"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.port === "3000") ? "http://localhost:8000" : "");

const DISTRICTS = ["Pune", "Nashik", "Thane", "Nagpur", "Chhatrapati Sambhajinagar"];
const SECTORS = [
  "All Sectors",
  "Electrical & Energy",
  "Capital Goods & Manufacturing",
  "Automotive & EV",
  "Electronics & Automation",
  "Renewable Energy",
  "Information Technology",
  "HVAC & Appliances",
];

interface BridgePackModule {
  module_title: string;
  skill_targeted: string;
  duration_hours: number;
  activities: string[];
  assessment_criteria?: string[];
  tools_required?: string[];
}

interface CourseRec {
  course_id: number;
  course_title: string;
  institute_type: string;
  sector: string;
  district: string;
  duration_months: number;
  nsqf_level: number;
  qualification_req: string;
  alignment_score: number;
  missing_skills: string[];
  fully_covered_skills: string[];
  bridge_packs_available: number;
  bridge_packs: BridgePackModule[];
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75 ? "from-emerald-500 to-green-400" :
    score >= 50 ? "from-amber-500 to-yellow-400" :
    "from-rose-500 to-red-400";
  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r ${color} text-white font-bold text-sm`}>
      {score.toFixed(1)}% Match
    </div>
  );
}

function BridgePackModal({ pack, onClose, lang }: { pack: BridgePackModule; onClose: () => void; lang: ReturnType<typeof useLang>["t"] }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-1">20-Hour Bridge Pack</div>
              <h2 className="text-2xl font-black text-white">{pack.module_title}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs rounded-full font-medium border border-amber-500/30">
                  🎯 {pack.skill_targeted}
                </span>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full font-medium border border-blue-500/30">
                  ⏱ {pack.duration_hours} Hours
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Activities */}
          <div>
            <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider mb-3">📋 Sessions & Activities</h3>
            <div className="space-y-2">
              {pack.activities?.map((act, i) => (
                <div key={i} className="flex gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/40">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-300 text-xs font-bold">
                    {i + 1}
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{act}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Assessment */}
          {pack.assessment_criteria && pack.assessment_criteria.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wider mb-3">✅ Assessment Criteria</h3>
              <div className="space-y-2">
                {pack.assessment_criteria.map((c, i) => (
                  <div key={i} className="flex gap-2 items-start p-2 bg-emerald-900/20 rounded-lg border border-emerald-700/30">
                    <span className="text-emerald-400 text-xs mt-0.5">✓</span>
                    <p className="text-sm text-slate-300">{c}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tools */}
          {pack.tools_required && pack.tools_required.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider mb-3">🔧 Tools Required</h3>
              <div className="flex flex-wrap gap-2">
                {pack.tools_required.map((tool) => (
                  <span key={tool} className="px-3 py-1 bg-blue-900/30 border border-blue-700/40 text-blue-300 text-xs rounded-full">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:opacity-90 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function CourseCard({ rec, onGetBridgePack, selectedPack }: {
  rec: CourseRec;
  onGetBridgePack: (id: number) => void;
  selectedPack: BridgePackModule | null;
}) {
  const { t } = useLang();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10">
      {/* Card Header */}
      <div className="p-5 border-b border-slate-700/40">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                rec.institute_type === "ITI" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
              }`}>
                {rec.institute_type}
              </span>
              <span className="text-xs text-slate-400">NSQF {rec.nsqf_level}</span>
            </div>
            <h3 className="text-base font-bold text-white leading-tight">{rec.course_title}</h3>
            <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-400">
              <span>📍 {rec.district}</span>
              <span>⏳ {rec.duration_months} {t.months}</span>
              <span>🎓 {rec.qualification_req}</span>
              <span>🏭 {rec.sector}</span>
            </div>
          </div>
          <ScoreBadge score={rec.alignment_score} />
        </div>
      </div>

      {/* Skills section */}
      <div className="p-5 space-y-3">
        {rec.fully_covered_skills.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-emerald-400 mb-1.5 uppercase tracking-wider">✓ {t.fullyMastered}</div>
            <div className="flex flex-wrap gap-1.5">
              {rec.fully_covered_skills.slice(0, 4).map((s) => (
                <span key={s} className="px-2 py-0.5 bg-emerald-900/30 border border-emerald-700/30 text-emerald-300 text-xs rounded-full">{s}</span>
              ))}
              {rec.fully_covered_skills.length > 4 && (
                <span className="px-2 py-0.5 text-slate-400 text-xs">+{rec.fully_covered_skills.length - 4} more</span>
              )}
            </div>
          </div>
        )}

        {rec.missing_skills.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-rose-400 mb-1.5 uppercase tracking-wider">✕ {t.skillsToLearn}</div>
            <div className="flex flex-wrap gap-1.5">
              {rec.missing_skills.map((s) => (
                <span key={s} className="px-2 py-0.5 bg-rose-900/30 border border-rose-700/30 text-rose-300 text-xs rounded-full">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Bridge Pack CTA */}
        {rec.missing_skills.length > 0 ? (
          <button
            onClick={() => onGetBridgePack(rec.course_id)}
            className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
          >
            🎯 {t.getYourBridgePack}
            {rec.bridge_packs_available > 0 && (
              <span className="px-1.5 py-0.5 bg-white/20 text-xs rounded-full">{rec.bridge_packs_available}</span>
            )}
          </button>
        ) : (
          <div className="w-full mt-2 py-2.5 px-4 bg-emerald-900/30 border border-emerald-700/40 text-emerald-300 font-bold rounded-xl text-sm text-center">
            ✓ {t.fullyAligned}
          </div>
        )}

        {/* Show fetched bridge pack preview */}
        {rec.bridge_packs.length > 0 && expanded && (
          <div className="mt-3 pt-3 border-t border-slate-700/40">
            <div className="text-xs font-semibold text-amber-400 mb-2">Available Bridge Modules:</div>
            {rec.bridge_packs.map((pack, i) => (
              <div key={i} className="p-3 bg-slate-900/50 rounded-xl border border-amber-500/20 mb-2">
                <div className="font-semibold text-white text-sm">{pack.module_title}</div>
                <div className="text-xs text-amber-300 mt-0.5">{pack.duration_hours}h • {pack.skill_targeted}</div>
                <div className="text-xs text-slate-400 mt-1">{pack.activities[0]?.slice(0, 80)}...</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentPortal() {
  const { lang, toggleLang, t } = useLang();
  const [district, setDistrict] = useState("Pune");
  const [sector, setSector] = useState("All Sectors");
  const [courses, setCourses] = useState<CourseRec[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBridgePack, setSelectedBridgePack] = useState<BridgePackModule | null>(null);
  const [bridgePackLoading, setBridgePackLoading] = useState<number | null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const sectorParam = sector !== "All Sectors" ? `&sector=${encodeURIComponent(sector)}` : "";
      const res = await fetch(`${API}/api/v1/student/recommendations?district=${encodeURIComponent(district)}${sectorParam}`);
      const data = await res.json();
      setCourses(data.recommendations || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGetBridgePack = async (courseId: number) => {
    setBridgePackLoading(courseId);
    try {
      const res = await fetch(`${API}/api/v1/recommendations/bridge-pack/${courseId}`);
      const data = await res.json();
      if (data.bridge_packs && data.bridge_packs.length > 0) {
        setSelectedBridgePack(data.bridge_packs[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBridgePackLoading(null);
    }
  };

  useEffect(() => { fetchCourses(); }, [district]);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1a1a2e 40%, #16213e 70%, #0f3460 100%)" }}>
      {/* Header */}
      <nav className="sticky top-0 z-40 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <span className="text-lg font-black text-white">S</span>
            </div>
            <div>
              <h1 className="text-lg font-black text-white">{t.appName}</h1>
              <p className="text-xs text-amber-400 font-medium">{t.studentPortal}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-slate-800">
              {t.adminPortal}
            </Link>
            <button
              onClick={toggleLang}
              className="px-4 py-1.5 text-sm font-bold border border-amber-500/40 text-amber-300 rounded-full hover:bg-amber-500/10 transition"
            >
              {t.langToggle}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-300 text-sm font-medium mb-6">
          🎓 Maharashtra ITI & MSSDS Career Guidance
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">
          {t.studentTitle}
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">{t.studentSubtitle}</p>

        {/* Search Controls */}
        <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="flex-1 bg-slate-800/80 border border-slate-600/50 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500/50 text-sm"
          >
            {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
          </select>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="flex-1 bg-slate-800/80 border border-slate-600/50 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500/50 text-sm"
          >
            {SECTORS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button
            onClick={fetchCourses}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:opacity-90 transition shadow-lg shadow-amber-500/25 whitespace-nowrap"
          >
            {t.searchCourses}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {t.courseRecommendations}
            <span className="ml-2 px-2 py-0.5 bg-slate-700 text-slate-300 text-sm rounded-full">{courses.length}</span>
          </h2>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse" />
            Live from DVET & MSSDS
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-slate-800/40 rounded-2xl h-64 animate-pulse border border-slate-700/30" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-slate-400">{t.noCoursesFound}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((rec) => (
              <CourseCard
                key={rec.course_id}
                rec={rec}
                onGetBridgePack={handleGetBridgePack}
                selectedPack={bridgePackLoading === rec.course_id ? null : null}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bridge Pack Modal */}
      {selectedBridgePack && (
        <BridgePackModal
          pack={selectedBridgePack}
          onClose={() => setSelectedBridgePack(null)}
          lang={t}
        />
      )}
    </div>
  );
}
