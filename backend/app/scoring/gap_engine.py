"""
SkillX Gap Engine — Prompt 8
Skill gap computation layer that sits between raw DB data and the ScoringEngine.

Responsibilities:
1. Pull course skills and job demands from DB
2. Aggregate job demand into DemandedSkill objects
3. Run ScoringEngine
4. Translate ScoreBreakdown into structured gap report
5. Produce top_skill_gaps with demand evidence for provenance

Tiered job matching (preserved from engine4):
  Tier 1: District + Sector
  Tier 2: District only
  Tier 3: Sector only (statewide)
  Tier 4: Top-50 statewide (last resort)

Version: 1.0.0
"""

import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.db.models import Course, ExtractedSkill, JobPosting, SkillGapAnalysis
from app.scoring.scoring_engine import ScoringEngine, DemandedSkill, ScoreBreakdown
from app.scoring.scoring_config import DEFAULT_SCORING_CONFIG, ScoringConfig
from app.ontology.skill_normalizer import get_normalizer

logger = logging.getLogger("GapEngine")

GAP_ENGINE_VERSION = "1.0.0"


@dataclass
class SkillDemandRecord:
    """Aggregated demand data for a single skill across a job set."""
    skill_name: str
    n_postings: int = 0
    n_unique_employers: int = 0
    recency_weighted_count: float = 0.0
    category: str = "Technical Skills"
    job_ids: List[int] = field(default_factory=list)
    employer_names: List[str] = field(default_factory=list)


@dataclass
class TopSkillGap:
    """
    Evidence-backed skill gap record.
    This is the primary output used by the Bridge Engine and API.
    """
    skill: str
    canonical_id: Optional[str]
    category: str
    job_count: int
    employer_count: int
    demand_pct: float          # % of analyzed jobs demanding this skill
    coverage_credit: float     # 0 = fully missing, 0–0.9 = partial
    gap_tier: str              # "CRITICAL", "HIGH", "MODERATE", "LOW"
    representative_employers: List[str] = field(default_factory=list)


@dataclass
class GapReport:
    """
    Full gap analysis output for one course.
    Extends ScoreBreakdown with demand provenance and gap tier classification.
    """
    course_id: int
    course_title: str
    district: str
    sector: Optional[str]
    nsqf_level: int

    alignment_score: float
    total_jobs_analyzed: int
    n_unique_employers: int
    job_tier_used: str          # Which tier of job matching was used

    fully_covered_skills: List[str]
    partially_covered_skills: List[str]
    missing_skills: List[str]
    critical_gaps: List[str]

    top_skill_gaps: List[TopSkillGap]
    demand_frequency_map: Dict[str, int]   # skill → n_postings
    detailed_skills_breakdown: Dict        # Full skill records for audit

    core_skill_coverage_pct: float
    emerging_skill_coverage_pct: float

    scoring_model_version: str
    gap_engine_version: str = GAP_ENGINE_VERSION
    execution_latency_ms: float = 0.0


class GapEngine:
    """
    Orchestrates the gap analysis computation for one or all courses.

    Usage:
        engine = GapEngine(db)
        report = engine.analyze_course(course_id=42)
        print(report.alignment_score)
    """

    def __init__(
        self,
        db: Session,
        config: ScoringConfig = DEFAULT_SCORING_CONFIG,
    ):
        self._db = db
        self._scorer = ScoringEngine(config)
        self._normalizer = get_normalizer()
        self._config = config

    # ── Public API ─────────────────────────────────────────────────────────────

    def analyze_course(self, course_id: int) -> Optional[GapReport]:
        """Full gap analysis for a single course."""
        course = self._db.query(Course).filter(Course.id == course_id).first()
        if not course:
            logger.warning(f"GapEngine: course {course_id} not found.")
            return None
        return self._compute_gap(course)

    def run_all(self) -> Dict[str, int]:
        """
        Run gap analysis for all active courses.
        Writes results to skill_gap_analysis table.
        Returns summary dict.
        """
        t_start = time.time()
        courses = self._db.query(Course).filter(Course.status == "ACTIVE").all()
        processed = 0
        errors = 0

        for course in courses:
            try:
                report = self._compute_gap(course)
                if report:
                    self._save_to_db(report)
                    processed += 1
            except Exception as e:
                logger.error(f"GapEngine error for course {course.id}: {e}")
                errors += 1

        latency_ms = round((time.time() - t_start) * 1000, 2)
        self._db.commit()
        logger.info(
            f"GapEngine.run_all: {processed} courses processed, "
            f"{errors} errors in {latency_ms}ms."
        )
        return {
            "courses_processed": processed,
            "errors": errors,
            "latency_ms": latency_ms,
            "gap_engine_version": GAP_ENGINE_VERSION,
        }

    # ── Internal computation ───────────────────────────────────────────────────

    def _compute_gap(self, course: Course) -> Optional[GapReport]:
        t_start = time.time()

        # ── Step 1: Get course skills ──────────────────────────────────────────
        course_skills = self._db.query(ExtractedSkill).filter(
            ExtractedSkill.course_id == course.id,
            ExtractedSkill.source_type == "COURSE",
            ExtractedSkill.status == "CONFIRMED",
        ).all()

        course_skill_names = [s.skill_name for s in course_skills]

        # ── Step 2: Tiered job matching ────────────────────────────────────────
        jobs, tier_label = self._get_relevant_jobs(course)

        if not jobs:
            logger.warning(
                f"GapEngine: No jobs found for course {course.id} "
                f"'{course.title}' in any tier."
            )
            return GapReport(
                course_id=course.id,
                course_title=course.title,
                district=course.district,
                sector=course.sector,
                nsqf_level=course.nsqf_level,
                alignment_score=0.0,
                total_jobs_analyzed=0,
                n_unique_employers=0,
                job_tier_used="NONE",
                fully_covered_skills=course_skill_names,
                partially_covered_skills=[],
                missing_skills=[],
                critical_gaps=[],
                top_skill_gaps=[],
                demand_frequency_map={},
                detailed_skills_breakdown={},
                core_skill_coverage_pct=0.0,
                emerging_skill_coverage_pct=0.0,
                scoring_model_version=self._scorer.config_summary()["scoring_model_version"],
                execution_latency_ms=round((time.time() - t_start) * 1000, 2),
            )

        # ── Step 3: Aggregate job skill demand ────────────────────────────────
        demanded_skills = self._aggregate_demand(jobs)

        # ── Step 4: Score ─────────────────────────────────────────────────────
        n_unique_employers = len({j.company for j in jobs if j.company})
        breakdown: ScoreBreakdown = self._scorer.score(
            course_id=course.id,
            course_title=course.title,
            district=course.district or "",
            nsqf_level=course.nsqf_level or 4,
            course_skill_surfaces=course_skill_names,
            demanded_skills=demanded_skills,
            n_jobs_analyzed=len(jobs),
            n_unique_employers=n_unique_employers,
        )

        # ── Step 5: Build gap evidence ─────────────────────────────────────────
        n_jobs = max(1, len(jobs))
        top_gaps = []
        for rec in sorted(
            breakdown.skill_records, key=lambda r: r.demand_weight, reverse=True
        ):
            if rec.is_missing or rec.is_partial:
                # Match demand data back to the aggregated record
                agg = next(
                    (d for d in demanded_skills if d.skill_name == rec.demanded_skill),
                    None,
                )
                employers = []
                if agg:
                    employers = list(set(agg.employer_names))[:4]

                # Determine gap tier
                if rec.is_critical and rec.is_missing:
                    gap_tier = "CRITICAL"
                elif rec.is_missing and rec.demand_weight > 1.5:
                    gap_tier = "HIGH"
                elif rec.is_missing:
                    gap_tier = "MODERATE"
                else:
                    gap_tier = "LOW"   # partial only

                top_gaps.append(TopSkillGap(
                    skill=rec.demanded_skill,
                    canonical_id=rec.canonical_id,
                    category=rec.category,
                    job_count=agg.n_postings if agg else 0,
                    employer_count=agg.n_unique_employers if agg else 0,
                    demand_pct=round(
                        (agg.n_postings / n_jobs * 100) if agg else 0, 1
                    ),
                    coverage_credit=rec.coverage_credit,
                    gap_tier=gap_tier,
                    representative_employers=employers,
                ))

        # Sort by criticality then demand weight
        tier_order = {"CRITICAL": 0, "HIGH": 1, "MODERATE": 2, "LOW": 3}
        top_gaps.sort(key=lambda g: (tier_order.get(g.gap_tier, 9), -g.job_count))

        demand_freq_map = {
            d.skill_name: d.n_postings for d in demanded_skills
        }

        # Detailed breakdown for audit trail
        detailed = {
            rec.demanded_skill: {
                "canonical_id": rec.canonical_id,
                "category": rec.category,
                "demand_weight": rec.demand_weight,
                "step_weight": rec.step_weight,
                "coverage_credit": rec.coverage_credit,
                "earned_weight": rec.earned_weight,
                "relationship": rec.relationship,
                "is_critical": rec.is_critical,
                "is_missing": rec.is_missing,
                "is_partial": rec.is_partial,
                "is_fully_covered": rec.is_fully_covered,
                "match_reason": rec.match_reason,
                "best_match_source": rec.best_match_source,
            }
            for rec in breakdown.skill_records
        }

        latency_ms = round((time.time() - t_start) * 1000, 2)

        return GapReport(
            course_id=course.id,
            course_title=course.title,
            district=course.district,
            sector=course.sector,
            nsqf_level=course.nsqf_level,
            alignment_score=breakdown.final_score,
            total_jobs_analyzed=len(jobs),
            n_unique_employers=n_unique_employers,
            job_tier_used=tier_label,
            fully_covered_skills=breakdown.fully_covered_skills,
            partially_covered_skills=breakdown.partially_covered_skills,
            missing_skills=breakdown.missing_skills,
            critical_gaps=breakdown.critical_gaps,
            top_skill_gaps=top_gaps,
            demand_frequency_map=demand_freq_map,
            detailed_skills_breakdown=detailed,
            core_skill_coverage_pct=breakdown.core_skill_coverage_pct,
            emerging_skill_coverage_pct=breakdown.emerging_skill_coverage_pct,
            scoring_model_version=breakdown.scoring_model_version,
            execution_latency_ms=latency_ms,
        )

    def _get_relevant_jobs(
        self, course: Course
    ) -> Tuple[List[JobPosting], str]:
        """
        Tiered job matching — exactly 4 tiers, preserved from engine4.
        Returns (list of jobs, tier label used).
        """
        db = self._db

        # Tier 1: District + Sector (most specific)
        if course.district and course.sector:
            jobs = db.query(JobPosting).filter(
                JobPosting.status == "ACTIVE",
                JobPosting.district == course.district,
                JobPosting.sector == course.sector,
            ).all()
            if jobs:
                return jobs, "TIER_1_DISTRICT_SECTOR"

        # Tier 2: District only
        if course.district:
            jobs = db.query(JobPosting).filter(
                JobPosting.status == "ACTIVE",
                JobPosting.district == course.district,
            ).all()
            if jobs:
                return jobs, "TIER_2_DISTRICT"

        # Tier 3: Sector statewide
        if course.sector:
            jobs = db.query(JobPosting).filter(
                JobPosting.status == "ACTIVE",
                JobPosting.sector == course.sector,
            ).all()
            if jobs:
                return jobs, "TIER_3_SECTOR"

        # Tier 4: Top-50 statewide (last resort)
        jobs = db.query(JobPosting).filter(
            JobPosting.status == "ACTIVE",
        ).order_by(JobPosting.recency_weight.desc()).limit(50).all()
        return jobs, "TIER_4_STATEWIDE_TOP50"

    def _aggregate_demand(
        self, jobs: List[JobPosting]
    ) -> List[DemandedSkill]:
        """
        Aggregate job skill demand from ExtractedSkill records.
        Returns one DemandedSkill per unique skill name.
        """
        job_ids = [j.id for j in jobs]
        recency_map = {j.id: j.recency_weight for j in jobs}
        company_map = {j.id: (j.company or "Unknown") for j in jobs}

        job_skills = self._db.query(ExtractedSkill).filter(
            ExtractedSkill.job_posting_id.in_(job_ids),
            ExtractedSkill.source_type == "JOB",
            ExtractedSkill.status == "CONFIRMED",
        ).all()

        # Aggregate per skill name
        demand_records: Dict[str, SkillDemandRecord] = {}
        for sk in job_skills:
            name = sk.skill_name
            if name not in demand_records:
                demand_records[name] = SkillDemandRecord(
                    skill_name=name,
                    category=sk.category or "Technical Skills",
                )
            rec = demand_records[name]
            rec.n_postings += 1
            jid = sk.job_posting_id
            if jid and jid not in rec.job_ids:
                rec.job_ids.append(jid)
                rec.recency_weighted_count += recency_map.get(jid, 1.0)
                company = company_map.get(jid, "Unknown")
                if company not in rec.employer_names:
                    rec.employer_names.append(company)
            rec.n_unique_employers = len(rec.employer_names)

        # Resolve canonical IDs and convert to DemandedSkill
        result = []
        for name, rec in demand_records.items():
            canonical_id = self._normalizer.normalize_to_id(name)
            result.append(DemandedSkill(
                skill_name=name,
                n_postings=rec.n_postings,
                n_unique_employers=rec.n_unique_employers,
                recency_weighted_count=rec.recency_weighted_count,
                category=rec.category,
                skill_id=canonical_id,
            ))

        return result

    def _save_to_db(self, report: GapReport):
        """Upsert GapReport into skill_gap_analysis table."""
        existing = self._db.query(SkillGapAnalysis).filter(
            SkillGapAnalysis.course_id == report.course_id
        ).first()

        top_gap_dicts = [
            {
                "skill": g.skill,
                "canonical_id": g.canonical_id,
                "category": g.category,
                "job_count": g.job_count,
                "employer_count": g.employer_count,
                "demand_pct": g.demand_pct,
                "coverage_credit": g.coverage_credit,
                "gap_tier": g.gap_tier,
                "representative_employers": g.representative_employers,
            }
            for g in report.top_skill_gaps[:10]
        ]

        if existing:
            existing.district = report.district
            existing.alignment_score = report.alignment_score
            existing.total_jobs_analyzed = report.total_jobs_analyzed
            existing.core_skill_coverage_pct = report.core_skill_coverage_pct
            existing.emerging_skill_coverage_pct = report.emerging_skill_coverage_pct
            existing.fully_covered_skills = report.fully_covered_skills
            existing.partially_covered_skills = report.partially_covered_skills
            existing.missing_skills = report.missing_skills
            existing.demand_frequency_map = report.demand_frequency_map
            existing.detailed_skills_breakdown = report.detailed_skills_breakdown
            existing.top_skill_gaps = top_gap_dicts
            existing.execution_latency_ms = report.execution_latency_ms
        else:
            record = SkillGapAnalysis(
                course_id=report.course_id,
                district=report.district,
                alignment_score=report.alignment_score,
                total_jobs_analyzed=report.total_jobs_analyzed,
                core_skill_coverage_pct=report.core_skill_coverage_pct,
                emerging_skill_coverage_pct=report.emerging_skill_coverage_pct,
                fully_covered_skills=report.fully_covered_skills,
                partially_covered_skills=report.partially_covered_skills,
                missing_skills=report.missing_skills,
                demand_frequency_map=report.demand_frequency_map,
                detailed_skills_breakdown=report.detailed_skills_breakdown,
                top_skill_gaps=top_gap_dicts,
                execution_latency_ms=report.execution_latency_ms,
            )
            self._db.add(record)
