"""
Engine 4: Deterministic SAI-V2 Hybrid Alignment & Skill Gap Analysis Engine
Zero-API / Zero-LLM Architecture

Version 2.0.0: Integrated with SkillX Ontology + ScoringEngine for ontology-aware matching.
Version 1.x: Original sub-domain keyword partial credit engine (retained as fallback).

Upgrade path:
  Engine4SkillGapAnalysis.run_analysis()   → original v1 (backward compatible)
  Engine4SkillGapAnalysis.run_analysis_v2() → new ontology-aware GapEngine wrapper

Fixes applied (v1):
- I2: Partial credit now requires matching sub-category keyword (not just broad category)
- D4: top_skill_gaps cap raised from 5 → 15
- I7: Tier 4 capped to top-50 most-demanded jobs (not all 500)
- NSQF level bonus weight added per course

New in v2:
- Ontology-aware relationship matching (CHILD_OF, PARENT_OF, RELATED_TO)
- NOT_EQUIVALENT guard prevents false positive matches
- Critical gap penalty applied to final score
- Full ScoreBreakdown audit trail
- Scoring weights from ScoringConfig (versioned, configurable)
"""

import math
import time
import logging
from typing import Dict, Any, List, Set, Optional
from collections import defaultdict
from sqlalchemy.orm import Session
from app.db.models import Course, JobPosting, ExtractedSkill, SkillGapAnalysis

logger = logging.getLogger("Engine4_SkillGap")

# ── Lazy import of new engines to avoid circular imports ──────────────────────
# These are imported inside run_analysis_v2() to ensure the ontology singleton
# is fully initialized before use.


# Sub-category keyword mapping for precise partial credit (fixes I2)
# A partial match only earns credit if both skills share an industrial sub-domain keyword
SUB_CATEGORY_KEYWORDS: Dict[str, Set[str]] = {
    "Digital & Technology Skills": {
        "automation", "plc", "scada", "cnc", "python", "sql", "iot", "modbus",
        "network", "hmi", "robotics", "programming", "software", "linux", "database",
        "fieldbus", "profinet", "mqtt", "cybersecurity"
    },
    "Technical Skills": {
        "welding", "machining", "turning", "milling", "lathe", "hydraulic",
        "pneumatic", "wiring", "motor", "transformer", "engine", "refrigeration",
        "electrical", "piping", "fabrication", "instrumentation", "calibration",
        "grinding", "hvac", "brazing", "fitting", "drawing", "inspection"
    },
    "Emerging Skills": {
        "solar", "ev", "battery", "bms", "drone", "3d printing", "additive",
        "robotics", "iot", "renewable", "electric vehicle", "photovoltaic", "lidar"
    },
    "Safety Skills": {
        "safety", "loto", "ppe", "arc flash", "ndt", "quality", "iso", "weld defect"
    },
    "Tools & Equipment": {
        "caliper", "micrometer", "gauge", "hydraulic", "pneumatic", "oscilloscope",
        "multimeter", "calibrator", "torque wrench", "precision"
    },
    "Soft Skills": set(),  # Soft skills never get partial credit across hard skills
}


def _get_sub_domain_keywords(skill_name: str, category: str) -> Set[str]:
    """Extract sub-domain keywords present in a skill name for cross-match validation."""
    name_lower = skill_name.lower()
    domain_set = SUB_CATEGORY_KEYWORDS.get(category, set())
    return {kw for kw in domain_set if kw in name_lower}


class Engine4SkillGapAnalysis:
    def __init__(self, db: Session):
        self.db = db

    def run_analysis(self, target_course_id: Optional[int] = None) -> Dict[str, Any]:
        start_time = time.time()
        logger.info(
            f"Starting Engine 4 Skill Gap Analysis (Target: {target_course_id or 'ALL'})..."
        )

        # Step 1: Bulk fetch courses and job postings
        query_courses = self.db.query(Course)
        if target_course_id:
            query_courses = query_courses.filter(Course.id == target_course_id)
        courses = query_courses.all()

        job_postings = self.db.query(JobPosting).filter(JobPosting.status == "ACTIVE").all()
        if not job_postings:
            job_postings = self.db.query(JobPosting).all()

        extracted_skills = self.db.query(ExtractedSkill).all()

        if not courses:
            return {"status": "SUCCESS", "message": "No courses found for analysis."}

        # Step 2: Index skills by course_id and job_posting_id
        course_skills_map: Dict[int, Set[str]] = defaultdict(set)
        course_skill_confidence_map: Dict[int, Dict[str, float]] = defaultdict(dict)
        course_skill_category_map: Dict[int, Dict[str, str]] = defaultdict(dict)
        job_skills_map: Dict[int, List[Dict]] = defaultdict(list)

        for es in extracted_skills:
            if es.source_type == "COURSE" and es.course_id:
                course_skills_map[es.course_id].add(es.skill_name)
                course_skill_confidence_map[es.course_id][es.skill_name] = (
                    es.confidence_score or 0.95
                )
                course_skill_category_map[es.course_id][es.skill_name] = (
                    es.category or "Technical Skills"
                )
            elif es.source_type == "JOB" and es.job_posting_id:
                job_skills_map[es.job_posting_id].append({
                    "name": es.skill_name,
                    "category": es.category,
                    "confidence": es.confidence_score or 0.95,
                })

        # Step 3: Pre-index jobs by district and sector in RAM
        district_jobs_map: Dict[str, List] = defaultdict(list)
        sector_jobs_map: Dict[str, List] = defaultdict(list)
        for job in job_postings:
            if job.district:
                district_jobs_map[job.district].append(job)
            if job.sector:
                sector_jobs_map[job.sector].append(job)

        # Pre-compute state-wide top-50 most demanded jobs for Tier 4 (fixes I7)
        # Ranked by recency_weight (highest first) to avoid score dilution from 500 jobs
        state_top50_jobs = sorted(
            job_postings,
            key=lambda j: getattr(j, "recency_weight", 1.0) or 1.0,
            reverse=True
        )[:50]

        # Clear existing analysis records
        if target_course_id:
            self.db.query(SkillGapAnalysis).filter(
                SkillGapAnalysis.course_id == target_course_id
            ).delete()
        else:
            self.db.query(SkillGapAnalysis).delete()
        self.db.commit()

        gap_analysis_records = []
        analyses_created = 0

        # Step 4: Analyze each course
        for course in courses:
            c_skills = course_skills_map[course.id]
            c_conf = course_skill_confidence_map[course.id]
            c_skill_cats = course_skill_category_map[course.id]

            # Tiered Job Matching Cascade
            relevant_jobs = [
                j for j in district_jobs_map[course.district] if j.sector == course.sector
            ]
            match_tier = "Tier 1: District & Sector Match"
            if not relevant_jobs:
                relevant_jobs = district_jobs_map[course.district]
                match_tier = "Tier 2: District Match"
            if not relevant_jobs:
                relevant_jobs = sector_jobs_map[course.sector]
                match_tier = "Tier 3: Sector State-Wide Match"
            if not relevant_jobs:
                relevant_jobs = state_top50_jobs  # Top-50 only (fixes I7, was all 500)
                match_tier = "Tier 4: State-Wide Top-50 Market Pool"

            # NSQF level bonus multiplier (higher certification = more rigorous score weighting)
            nsqf_bonus = 1.0 + ((course.nsqf_level or 4) - 4) * 0.05  # 4→1.0, 5→1.05, 3→0.95

            # Regional Demand Aggregation with Recency Weighting
            regional_skill_jobs: Dict[str, float] = defaultdict(float)
            regional_skill_count: Dict[str, int] = defaultdict(int)
            regional_skill_employers: Dict[str, Set[str]] = defaultdict(set)
            skill_category_map: Dict[str, str] = {}

            for j in relevant_jobs:
                seen_in_job: Set[str] = set()
                rec_weight = getattr(j, "recency_weight", 1.0) or 1.0
                for item in job_skills_map[j.id]:
                    sname = item["name"]
                    skill_category_map[sname] = item["category"] or "Technical Skills"
                    if sname not in seen_in_job:
                        seen_in_job.add(sname)
                        regional_skill_jobs[sname] += rec_weight
                        regional_skill_count[sname] += 1
                        regional_skill_employers[sname].add(
                            j.company or "MIDC Employer"
                        )

            total_demand_weight = 0.0
            earned_coverage_weight = 0.0
            exact_earned_weight = 0.0
            semantic_earned_weight = 0.0

            core_demanded_count = 0
            core_covered_count = 0
            emerging_demanded_count = 0
            emerging_covered_count = 0

            fully_covered: List[str] = []
            partially_covered: List[str] = []
            missing_skills: List[str] = []
            demand_freq_map: Dict[str, str] = {}
            detailed_breakdown: Dict[str, Any] = {}
            top_gaps: List[Dict] = []

            for sname, weighted_postings in regional_skill_jobs.items():
                n_postings = regional_skill_count[sname]
                cat = skill_category_map.get(sname, "Technical Skills")
                n_employers = max(1, len(regional_skill_employers[sname]))

                # HHI employer concentration index (lower = more diverse demand)
                hhi_index = round(1.0 / n_employers, 3)

                # Logarithmic spam dampener + employer diversity multiplier
                w_demand = (
                    math.log2(1 + weighted_postings) * (1.0 + math.log2(n_employers))
                )

                # Single-job spam penalty
                if n_postings == 1 and n_employers == 1:
                    w_demand *= 0.70

                # Category importance weighting
                if cat == "Safety Skills":
                    w_importance = 1.50
                    core_demanded_count += 1
                elif cat == "Emerging Skills":
                    w_importance = 1.25
                    emerging_demanded_count += 1
                elif cat in ["Generic Skills", "Soft Skills"]:
                    w_importance = 0.30
                elif cat == "Digital & Technology Skills":
                    w_importance = 1.10
                    core_demanded_count += 1
                else:
                    w_importance = 1.0  # Core Technical & Tools
                    core_demanded_count += 1

                # Apply NSQF bonus multiplier
                step_weight = w_demand * w_importance * nsqf_bonus
                total_demand_weight += step_weight

                demand_pct = round(
                    (n_postings / max(1, len(relevant_jobs))) * 100, 1
                )
                demand_freq_map[sname] = (
                    f"{demand_pct}% ({n_postings} jobs, {n_employers} companies)"
                )

                if sname in c_skills:
                    # Full exact match credit weighted by confidence
                    coverage_credit = 1.0 * c_conf.get(sname, 0.95)
                    step_earned = step_weight * coverage_credit
                    earned_coverage_weight += step_earned
                    exact_earned_weight += step_earned
                    fully_covered.append(sname)

                    if cat == "Emerging Skills":
                        emerging_covered_count += 1
                    elif cat not in ["Generic Skills", "Soft Skills"]:
                        core_covered_count += 1

                    detailed_breakdown[sname] = {
                        "status": "FULLY_COVERED",
                        "demand_weight": round(w_demand, 3),
                        "importance_weight": w_importance,
                        "nsqf_bonus": round(nsqf_bonus, 3),
                        "coverage_credit": round(coverage_credit, 3),
                        "employers_count": n_employers,
                        "hhi_index": hhi_index,
                        "match_tier": match_tier,
                    }
                else:
                    # Precise partial credit — must share a specific sub-domain keyword (fixes I2)
                    # Find sub-domain keywords in the demanded skill
                    demanded_keywords = _get_sub_domain_keywords(sname, cat)

                    has_precise_partial = False
                    if demanded_keywords:
                        for cs in c_skills:
                            cs_cat = c_skill_cats.get(cs, "")
                            if cs_cat != cat:
                                continue  # Must be same broad category first
                            cs_keywords = _get_sub_domain_keywords(cs, cat)
                            # Must share at least one sub-domain keyword
                            if demanded_keywords & cs_keywords:
                                has_precise_partial = True
                                break

                    if has_precise_partial:
                        coverage_credit = 0.40
                        step_earned = step_weight * coverage_credit
                        earned_coverage_weight += step_earned
                        semantic_earned_weight += step_earned
                        partially_covered.append(sname)
                        detailed_breakdown[sname] = {
                            "status": "PARTIALLY_COVERED",
                            "demand_weight": round(w_demand, 3),
                            "importance_weight": w_importance,
                            "nsqf_bonus": round(nsqf_bonus, 3),
                            "coverage_credit": 0.40,
                            "employers_count": n_employers,
                            "hhi_index": hhi_index,
                            "match_tier": match_tier,
                        }
                    else:
                        missing_skills.append(sname)
                        detailed_breakdown[sname] = {
                            "status": "MISSING",
                            "demand_weight": round(w_demand, 3),
                            "importance_weight": w_importance,
                            "nsqf_bonus": round(nsqf_bonus, 3),
                            "coverage_credit": 0.0,
                            "employers_count": n_employers,
                            "hhi_index": hhi_index,
                            "match_tier": match_tier,
                        }
                        severity = (
                            "CRITICAL" if w_importance >= 1.25 and n_postings >= 2
                            else ("HIGH" if n_postings >= 2 else "MEDIUM")
                        )
                        top_gaps.append({
                            "skill": sname,
                            "category": cat,
                            "demand_pct": demand_pct,
                            "job_count": n_postings,
                            "employer_count": n_employers,
                            "severity": severity,
                        })

            # Final alignment score (0–100)
            final_alignment_score = 0.0
            if total_demand_weight > 0:
                final_alignment_score = round(
                    (earned_coverage_weight / total_demand_weight) * 100, 1
                )

            # Core & Emerging coverage percentages
            core_cov_pct = (
                100.0 if core_demanded_count == 0
                else round((core_covered_count / core_demanded_count) * 100, 1)
            )
            emerging_cov_pct = (
                100.0 if emerging_demanded_count == 0
                else round((emerging_covered_count / emerging_demanded_count) * 100, 1)
            )

            # Sort gaps by severity + employer volume
            top_gaps.sort(key=lambda x: (x["job_count"], x["employer_count"]), reverse=True)

            gap_record = SkillGapAnalysis(
                course_id=course.id,
                district=course.district,
                alignment_score=min(100.0, max(0.0, final_alignment_score)),
                total_jobs_analyzed=len(relevant_jobs),
                core_skill_coverage_pct=core_cov_pct,
                emerging_skill_coverage_pct=emerging_cov_pct,
                fully_covered_skills=fully_covered,
                partially_covered_skills=partially_covered,
                missing_skills=missing_skills,
                demand_frequency_map=demand_freq_map,
                detailed_skills_breakdown=detailed_breakdown,
                top_skill_gaps=top_gaps[:15],  # Raised from 5 → 15 (fixes D4)
                execution_latency_ms=round((time.time() - start_time) * 1000, 2),
            )
            gap_analysis_records.append(gap_record)
            analyses_created += 1

        # High-Performance Bulk DB Save
        if gap_analysis_records:
            self.db.bulk_save_objects(gap_analysis_records)
            self.db.commit()

        latency = round((time.time() - start_time) * 1000, 2)
        logger.info(
            f"Engine 4 analysis completed: {analyses_created} courses analyzed in {latency}ms."
        )

        return {
            "status": "SUCCESS",
            "courses_analyzed": len(courses),
            "jobs_analyzed": len(job_postings),
            "analyses_created": analyses_created,
            "latency_ms": latency,
        }

    def run_analysis_v2(
        self, target_course_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Ontology-aware gap analysis (v2) — delegates to the new GapEngine.

        This is the preferred method for all new code. The original run_analysis()
        is retained for backward compatibility during the transition period.

        Returns a result dict compatible with the existing API response format.
        """
        from app.scoring.gap_engine import GapEngine
        from app.scoring.scoring_config import DEFAULT_SCORING_CONFIG

        gap_engine = GapEngine(self.db, DEFAULT_SCORING_CONFIG)

        if target_course_id:
            report = gap_engine.analyze_course(target_course_id)
            if report:
                gap_engine._save_to_db(report)
                self.db.commit()
            return {
                "status": "SUCCESS",
                "courses_analyzed": 1,
                "analyses_created": 1 if report else 0,
                "alignment_score": report.alignment_score if report else 0.0,
                "gap_engine_version": "2.0.0",
                "latency_ms": report.execution_latency_ms if report else 0.0,
            }
        else:
            result = gap_engine.run_all()
            return {
                "status": "SUCCESS",
                "courses_analyzed": result["courses_processed"],
                "analyses_created": result["courses_processed"],
                "errors": result["errors"],
                "gap_engine_version": "2.0.0",
                "latency_ms": result["latency_ms"],
            }
