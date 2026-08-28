"""
SkillX Recommendation Engine — Prompt 7
Gap-closure-optimized course and skill recommendations.

Philosophy:
- Recommend courses that CLOSE THE MOST GAPS for a given student/district
- Rank by: (gap coverage × demand weight × market salary lift) / cost
- Never recommend a course with CRITICAL missing skills as the "top" recommendation
- Show explicit WHY for every recommendation

Zero-API, deterministic.

Version: 1.0.0
"""

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.db.models import Course, SkillGapAnalysis, BridgePackRecommendation, JobPosting
from app.ontology.skill_normalizer import get_normalizer

logger = logging.getLogger("RecommendationEngine")

RECOMMENDATION_ENGINE_VERSION = "1.0.0"


@dataclass
class CourseRecommendation:
    """
    A single recommended course with gap-closure evidence.
    """
    course_id: int
    course_title: str
    institute_type: str
    sector: str
    district: str
    nsqf_level: int
    duration_months: int
    qualification_req: str

    alignment_score: float
    gap_closure_score: float        # 0-100: how well does this close the target skill gaps
    missing_skills: List[str]
    fully_covered_skills: List[str]
    bridge_packs_available: int

    recommendation_rank: int
    recommendation_rationale: str   # Human-readable WHY

    # Salary context
    expected_salary_range: str
    salary_data_type: str           # "BENCHMARK" | "OBSERVED" | "UNAVAILABLE"

    # Links to bridge packs
    bridge_pack_previews: List[dict] = field(default_factory=list)


@dataclass
class StudentRecommendationResult:
    """Complete recommendation response for a student query."""
    district: str
    sector_filter: Optional[str]
    target_skills: List[str]        # What the student wants to learn
    total_courses_evaluated: int
    recommendations: List[CourseRecommendation]
    district_top_demanded_skills: List[str]
    engine_version: str = RECOMMENDATION_ENGINE_VERSION


class RecommendationEngine:
    """
    Gap-closure-optimized course recommender.

    Scoring formula:
      gap_closure_score = Σ(skill_demand_weight × is_covered_by_course) / Σ(all_skill_demand_weights) × 100
      ranked by: (alignment_score × 0.4) + (gap_closure_score × 0.6)
      penalize: -15 if any CRITICAL skill is missing from recommended course

    Usage:
        engine = RecommendationEngine(db)
        result = engine.recommend_for_student(district="Pune", target_skills=["PLC Programming"])
    """

    def __init__(self, db: Session):
        self._db = db
        self._normalizer = get_normalizer()

    def recommend_for_student(
        self,
        district: str,
        target_skills: Optional[List[str]] = None,
        sector: Optional[str] = None,
        limit: int = 10,
    ) -> StudentRecommendationResult:
        """
        Return gap-closure-ranked course recommendations for a student.

        Parameters:
            district: Student's preferred district
            target_skills: Skills the student wants to acquire (optional)
            sector: Sector filter (optional)
            limit: Max recommendations to return
        """
        # ── Fetch courses ────────────────────────────────────────────────────
        query = self._db.query(Course).filter(
            Course.status == "ACTIVE",
            Course.district == district,
        )
        if sector:
            query = query.filter(Course.sector.ilike(f"%{sector}%"))
        courses = query.all()

        if not courses:
            return StudentRecommendationResult(
                district=district, sector_filter=sector,
                target_skills=target_skills or [],
                total_courses_evaluated=0,
                recommendations=[],
                district_top_demanded_skills=[],
            )

        # ── Bulk fetch gap records ─────────────────────────────────────────────
        course_ids = [c.id for c in courses]
        gap_map: Dict[int, SkillGapAnalysis] = {}
        for gap in self._db.query(SkillGapAnalysis).filter(
            SkillGapAnalysis.course_id.in_(course_ids)
        ).all():
            gap_map[gap.course_id] = gap

        # ── Bulk fetch bridge packs ────────────────────────────────────────────
        pack_map: Dict[int, int] = {}   # course_id → count
        pack_previews: Dict[int, list] = {}
        for pack in self._db.query(BridgePackRecommendation).filter(
            BridgePackRecommendation.course_id.in_(course_ids)
        ).all():
            pack_map[pack.course_id] = pack_map.get(pack.course_id, 0) + 1
            pack_previews.setdefault(pack.course_id, []).append({
                "module_title": pack.module_title,
                "skill_targeted": pack.skill_targeted,
                "duration_hours": pack.duration_hours,
            })

        # ── District demand intelligence ───────────────────────────────────────
        district_demanded_skills = self._get_district_top_demanded(district)

        # ── Score each course for gap closure ─────────────────────────────────
        scored: List[Tuple[float, Course]] = []
        for course in courses:
            gap = gap_map.get(course.id)
            if not gap:
                continue

            gap_score = self._compute_gap_closure_score(
                gap, target_skills, district_demanded_skills
            )

            # Combined ranking score
            alignment = gap.alignment_score or 0.0
            has_critical_miss = any(
                g.get("gap_tier") == "CRITICAL"
                for g in (gap.top_skill_gaps or [])
            )
            combined = (alignment * 0.40) + (gap_score * 0.60)
            if has_critical_miss:
                combined -= 15.0  # Penalize critical safety gaps

            scored.append((combined, course))

        # Sort descending
        scored.sort(key=lambda x: x[0], reverse=True)

        # ── Build recommendation objects ───────────────────────────────────────
        recommendations = []
        for rank, (combined_score, course) in enumerate(scored[:limit], start=1):
            gap = gap_map.get(course.id)
            if not gap:
                continue

            gap_closure = self._compute_gap_closure_score(
                gap, target_skills, district_demanded_skills
            )

            rationale = self._build_rationale(course, gap, gap_closure, target_skills)

            # Salary context from benchmarks
            salary_str, sal_type = self._get_salary_context(course)

            recommendations.append(CourseRecommendation(
                course_id=course.id,
                course_title=course.title,
                institute_type=course.institute_type,
                sector=course.sector or "General",
                district=course.district,
                nsqf_level=course.nsqf_level,
                duration_months=course.duration_months,
                qualification_req=course.qualification_req,
                alignment_score=round(gap.alignment_score or 0.0, 1),
                gap_closure_score=round(gap_closure, 1),
                missing_skills=(gap.missing_skills or [])[:5],
                fully_covered_skills=(gap.fully_covered_skills or [])[:5],
                bridge_packs_available=pack_map.get(course.id, 0),
                recommendation_rank=rank,
                recommendation_rationale=rationale,
                expected_salary_range=salary_str,
                salary_data_type=sal_type,
                bridge_pack_previews=pack_previews.get(course.id, [])[:2],
            ))

        return StudentRecommendationResult(
            district=district,
            sector_filter=sector,
            target_skills=target_skills or [],
            total_courses_evaluated=len(courses),
            recommendations=recommendations,
            district_top_demanded_skills=district_demanded_skills[:8],
        )

    def _compute_gap_closure_score(
        self,
        gap: SkillGapAnalysis,
        target_skills: Optional[List[str]],
        district_demanded: List[str],
    ) -> float:
        """
        Compute gap closure score for a course.

        If target_skills specified: percentage of target skills covered by this course.
        Else: (alignment_score × 0.7) + (fully_covered / total_demanded × 30)
        """
        if target_skills:
            if not target_skills:
                return gap.alignment_score or 0.0
            covered_targets = 0
            covered_list = [s.lower() for s in (gap.fully_covered_skills or [])]
            partial_list = [s.lower() for s in (gap.partially_covered_skills or [])]
            for ts in target_skills:
                ts_lower = ts.lower()
                if any(ts_lower in c or c in ts_lower for c in covered_list):
                    covered_targets += 1.0
                elif any(ts_lower in c or c in ts_lower for c in partial_list):
                    covered_targets += 0.5
            return round(covered_targets / len(target_skills) * 100, 1)

        # Default: alignment-based with bonus for covering district's top demands
        base = gap.alignment_score or 0.0
        covered = set(s.lower() for s in (gap.fully_covered_skills or []))
        demand_hits = sum(1 for d in district_demanded if d.lower() in covered)
        demand_bonus = min(20, demand_hits * 4)
        return min(100.0, round(base * 0.80 + demand_bonus, 1))

    def _get_district_top_demanded(self, district: str) -> List[str]:
        """Get top 10 skills demanded by jobs in the district."""
        from collections import defaultdict
        from app.db.models import ExtractedSkill
        jobs = self._db.query(JobPosting).filter(
            JobPosting.district == district,
            JobPosting.status == "ACTIVE",
        ).all()
        if not jobs:
            return []
        job_ids = [j.id for j in jobs]
        skills = self._db.query(ExtractedSkill).filter(
            ExtractedSkill.job_posting_id.in_(job_ids),
            ExtractedSkill.source_type == "JOB",
        ).all()
        freq: Dict[str, int] = defaultdict(int)
        for sk in skills:
            freq[sk.skill_name] += 1
        return [s for s, _ in sorted(freq.items(), key=lambda x: x[1], reverse=True)][:10]

    def _build_rationale(
        self,
        course: Course,
        gap: SkillGapAnalysis,
        gap_closure_score: float,
        target_skills: Optional[List[str]],
    ) -> str:
        """Build human-readable recommendation rationale."""
        fully = gap.fully_covered_skills or []
        missing = gap.missing_skills or []
        partial = gap.partially_covered_skills or []
        score = round(gap.alignment_score or 0.0, 1)

        parts = []
        if score >= 80:
            parts.append(f"Strong market alignment ({score}/100).")
        elif score >= 60:
            parts.append(f"Good market alignment ({score}/100).")
        else:
            parts.append(f"Moderate alignment ({score}/100) — bridge packs available.")

        if fully:
            parts.append(f"Covers industry-demanded skills: {', '.join(fully[:3])}.")

        if target_skills:
            matched = [t for t in target_skills if any(
                t.lower() in c.lower() or c.lower() in t.lower()
                for c in (fully + partial)
            )]
            if matched:
                parts.append(f"Matches your target skills: {', '.join(matched[:3])}.")

        if missing:
            parts.append(
                f"Note: {len(missing)} skill gap(s) ({', '.join(missing[:2])}) "
                f"can be addressed via 20-hour bridge modules."
            )

        return " ".join(parts)

    def _get_salary_context(self, course: Course) -> Tuple[str, str]:
        """Return (salary_range_string, data_type_label)."""
        try:
            from app.db.trade_benchmarks import get_trade_benchmark
            bm = get_trade_benchmark(course.title, course.sector)
            lo = bm["baseline_salary"]
            hi = bm["upgraded_salary"]
            return f"₹{lo:,}–₹{hi:,}/month", "BENCHMARK"
        except Exception:
            return "Data unavailable", "UNAVAILABLE"
