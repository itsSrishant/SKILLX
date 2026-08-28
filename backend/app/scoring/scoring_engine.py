"""
SkillX Scoring Engine — Prompt 3
Multi-factor, ontology-aware, versioned alignment scorer.

Replaces the single-formula in engine4_skill_gap.py with a fully traceable
pipeline. All inputs/outputs are typed. Weights come from ScoringConfig only.

Zero-API. Deterministic. Reproducible: same inputs + same config → same score.

Scoring formula:
  For each skill demanded by jobs:
    demand_weight   = log2(1 + Σweighted_postings) × (1 + log2(n_unique_employers))
    category_mult   = CategoryWeights[skill.category]
    nsqf_bonus      = 1.0 + (nsqf_level - 4) × 0.05
    step_weight     = demand_weight × category_mult × nsqf_bonus

    coverage_credit = SkillMatcher.match_skill_sets(course_skills, [demanded_skill])
                      → best relationship coverage credit × confidence

    single_job_penalty if only 1 posting from 1 employer

  raw_score = Σ(step_weight × coverage_credit) / Σ(step_weight) × 100

  critical_penalty = count(critical skills with coverage_credit == 0) × penalty

  final_score = clamp(raw_score - critical_penalty, 0, 100)

All intermediate calculations are recorded in ScoreBreakdown.

Version: 1.0.0
"""

import math
import logging
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from app.scoring.scoring_config import ScoringConfig, DEFAULT_SCORING_CONFIG
from app.scoring.skill_matcher import SkillMatcher, MatchEvidence
from app.ontology.skill_ontology import SkillOntology
from app.ontology.skill_normalizer import get_normalizer

logger = logging.getLogger("ScoringEngine")

SCORING_ENGINE_VERSION = "1.0.0"


# ─── Input types ──────────────────────────────────────────────────────────────

@dataclass
class DemandedSkill:
    """
    A skill demanded by the job market, with aggregated statistics.
    Created by the Gap Engine from job posting data.
    """
    skill_name: str                    # Surface form from job postings
    n_postings: int = 1                # How many postings mention this skill
    n_unique_employers: int = 1        # How many unique employers
    recency_weighted_count: float = 1.0  # Sum of recency weights
    category: str = "Technical Skills"   # Skill category (from ontology or extraction)
    skill_id: Optional[str] = None     # Canonical ID if resolved


# ─── Output types ─────────────────────────────────────────────────────────────

@dataclass
class SkillScoreRecord:
    """Per-skill scoring record — full traceability."""
    demanded_skill: str             # Surface form demanded by jobs
    canonical_id: Optional[str]     # Resolved ID (None = unknown)
    category: str
    demand_weight: float            # log-weighted demand contribution
    step_weight: float              # demand_weight × category_mult × nsqf_bonus
    best_match_source: Optional[str]  # Which course skill provided best coverage
    relationship: str               # Relationship type used for coverage
    coverage_credit: float          # 0.0–1.0 coverage granted
    earned_weight: float            # step_weight × coverage_credit
    is_critical: bool
    is_missing: bool                # coverage_credit == 0
    is_partial: bool                # 0 < coverage_credit < 0.9
    is_fully_covered: bool          # coverage_credit >= 0.9
    match_reason: str               # Human-readable explanation


@dataclass
class ScoreBreakdown:
    """
    Complete scoring calculation breakdown for one course vs one job set.
    This is the definitive explainable output — every number is traceable.
    """
    # Identity
    course_id: int
    course_title: str
    district: str
    nsqf_level: int
    n_jobs_analyzed: int
    n_unique_employers: int

    # Per-skill detail
    skill_records: List[SkillScoreRecord] = field(default_factory=list)

    # Aggregates
    total_demand_weight: float = 0.0
    total_earned_weight: float = 0.0
    raw_score: float = 0.0
    critical_missing_count: int = 0
    critical_penalty_applied: float = 0.0
    final_score: float = 0.0

    # Classification
    fully_covered_skills: List[str] = field(default_factory=list)
    partially_covered_skills: List[str] = field(default_factory=list)
    missing_skills: List[str] = field(default_factory=list)
    critical_gaps: List[str] = field(default_factory=list)

    # Coverage percentages
    core_skill_coverage_pct: float = 0.0
    emerging_skill_coverage_pct: float = 0.0

    # Meta
    scoring_model_version: str = SCORING_ENGINE_VERSION
    latency_ms: float = 0.0


class ScoringEngine:
    """
    Computes alignment score between a course and a set of job demands.

    Usage:
        engine = ScoringEngine()
        demanded = [DemandedSkill("PLC Programming", 12, 4, 10.5, "Digital & Technology Skills")]
        breakdown = engine.score(
            course_id=1,
            course_title="Electrician Trade",
            district="Pune",
            nsqf_level=4,
            course_skill_surfaces=["3-Phase Motor Control", "PLC Programming & Troubleshooting"],
            demanded_skills=demanded,
        )
        print(breakdown.final_score)  # e.g., 76.3
    """

    def __init__(self, config: ScoringConfig = DEFAULT_SCORING_CONFIG):
        self._config = config
        self._matcher = SkillMatcher(config)
        self._ontology = SkillOntology.get()
        self._normalizer = get_normalizer()

    def score(
        self,
        course_id: int,
        course_title: str,
        district: str,
        nsqf_level: int,
        course_skill_surfaces: List[str],
        demanded_skills: List[DemandedSkill],
        n_jobs_analyzed: int = 0,
        n_unique_employers: int = 0,
    ) -> ScoreBreakdown:
        """
        Compute a full, traceable alignment score.

        Parameters:
            course_skill_surfaces: Raw skill names from course syllabus
            demanded_skills: Aggregated job demand data
        """
        t_start = time.time()

        if not demanded_skills:
            return ScoreBreakdown(
                course_id=course_id,
                course_title=course_title,
                district=district,
                nsqf_level=nsqf_level,
                n_jobs_analyzed=n_jobs_analyzed,
                n_unique_employers=n_unique_employers,
                final_score=0.0,
                latency_ms=0.0,
            )

        nsqf_bonus = self._config.formula.nsqf_bonus(nsqf_level)

        skill_records: List[SkillScoreRecord] = []
        total_demand_weight = 0.0
        total_earned_weight = 0.0

        for demanded in demanded_skills:
            # ── Demand weight ──────────────────────────────────────────────────
            recency = max(demanded.recency_weighted_count, demanded.n_postings)
            w_demand = math.log2(1 + recency) * (1 + math.log2(max(1, demanded.n_unique_employers)))

            # Single-job spam penalty
            if demanded.n_postings == 1 and demanded.n_unique_employers == 1:
                w_demand *= self._config.formula.single_job_single_employer_penalty

            # Category multiplier
            cat_mult = self._config.category.get(demanded.category)

            # Step weight
            step_weight = w_demand * cat_mult * nsqf_bonus

            # ── Coverage via SkillMatcher ──────────────────────────────────────
            # Match against ALL course skills, take best credit
            best_evidence: Optional[MatchEvidence] = None
            for cs in course_skill_surfaces:
                ev = self._matcher.match(cs, demanded.skill_name)
                if best_evidence is None or ev.coverage_credit > best_evidence.coverage_credit:
                    best_evidence = ev
                if best_evidence.coverage_credit >= 1.0:
                    break  # Perfect match found

            if best_evidence is None:
                best_evidence = MatchEvidence(
                    source_skill="", target_skill=demanded.skill_name,
                    source_skill_id=None, target_skill_id=None,
                    relationship="NO_MATCH", confidence=0.0, coverage_credit=0.0,
                    reason="No course skills provided.",
                )

            coverage_credit = best_evidence.coverage_credit
            earned = step_weight * coverage_credit

            total_demand_weight += step_weight
            total_earned_weight += earned

            # ── Classify this skill ────────────────────────────────────────────
            # Resolve canonical id for importance check
            canonical_id = demanded.skill_id
            if not canonical_id:
                canonical_id = self._normalizer.normalize_to_id(demanded.skill_name)

            ontology_skill = self._ontology.get_by_id(canonical_id) if canonical_id else None
            is_critical = (
                (ontology_skill.importance == "CRITICAL") if ontology_skill
                else (demanded.category == "Safety Skills")
            )

            is_missing = coverage_credit == 0.0
            is_partial = 0.0 < coverage_credit < 0.9
            is_fully_covered = coverage_credit >= 0.9

            skill_records.append(SkillScoreRecord(
                demanded_skill=demanded.skill_name,
                canonical_id=canonical_id,
                category=demanded.category,
                demand_weight=round(w_demand, 4),
                step_weight=round(step_weight, 4),
                best_match_source=best_evidence.source_skill or None,
                relationship=best_evidence.relationship,
                coverage_credit=round(coverage_credit, 4),
                earned_weight=round(earned, 4),
                is_critical=is_critical,
                is_missing=is_missing,
                is_partial=is_partial,
                is_fully_covered=is_fully_covered,
                match_reason=best_evidence.reason,
            ))

        # ── Compute raw score ──────────────────────────────────────────────────
        raw_score = (
            (total_earned_weight / total_demand_weight * 100.0)
            if total_demand_weight > 0 else 0.0
        )

        # ── Critical gap penalty ───────────────────────────────────────────────
        critical_missing = [r for r in skill_records if r.is_critical and r.is_missing]
        critical_penalty = (
            len(critical_missing) * self._config.formula.critical_gap_penalty_per_skill
        )

        final_score = max(
            self._config.formula.score_min,
            min(self._config.formula.score_max, raw_score - critical_penalty),
        )
        final_score = round(final_score, 2)

        # ── Build classification lists ─────────────────────────────────────────
        fully_covered = [r.demanded_skill for r in skill_records if r.is_fully_covered]
        partially_covered = [r.demanded_skill for r in skill_records if r.is_partial]
        missing = [r.demanded_skill for r in skill_records if r.is_missing]
        critical_gaps = [r.demanded_skill for r in critical_missing]

        # ── Coverage percentages by category ──────────────────────────────────
        core_skills = [r for r in skill_records if r.category in (
            "Technical Skills", "Tools & Equipment", "Safety Skills",
        )]
        emerging_skills = [r for r in skill_records if r.category in (
            "Emerging Skills", "Digital & Technology Skills",
        )]

        core_coverage_pct = 0.0
        if core_skills:
            core_coverage_pct = round(
                sum(r.coverage_credit for r in core_skills) / len(core_skills) * 100, 1
            )
        emerging_coverage_pct = 0.0
        if emerging_skills:
            emerging_coverage_pct = round(
                sum(r.coverage_credit for r in emerging_skills) / len(emerging_skills) * 100, 1
            )

        latency_ms = round((time.time() - t_start) * 1000, 2)

        return ScoreBreakdown(
            course_id=course_id,
            course_title=course_title,
            district=district,
            nsqf_level=nsqf_level,
            n_jobs_analyzed=n_jobs_analyzed,
            n_unique_employers=n_unique_employers,
            skill_records=skill_records,
            total_demand_weight=round(total_demand_weight, 4),
            total_earned_weight=round(total_earned_weight, 4),
            raw_score=round(raw_score, 2),
            critical_missing_count=len(critical_missing),
            critical_penalty_applied=round(critical_penalty, 2),
            final_score=final_score,
            fully_covered_skills=fully_covered,
            partially_covered_skills=partially_covered,
            missing_skills=missing,
            critical_gaps=critical_gaps,
            core_skill_coverage_pct=core_coverage_pct,
            emerging_skill_coverage_pct=emerging_coverage_pct,
            scoring_model_version=SCORING_ENGINE_VERSION,
            latency_ms=latency_ms,
        )

    def config_summary(self) -> dict:
        return self._config.describe()
