"""
SkillX Scoring Configuration — Prompt 3
Versioned, configurable scoring weights.

All weights are documented with rationale. No weight is hardcoded
inside business logic — always reference this config.

Version: 1.0.0
"""

from dataclasses import dataclass, field
from typing import Dict

SCORING_MODEL_VERSION = "1.0.0"


@dataclass(frozen=True)
class ImportanceWeights:
    """
    Importance-to-numeric-weight mapping.
    Rationale: critical skills are "must-haves" for employment;
    low-importance skills are optional enhancements.
    """
    CRITICAL: float = 1.00
    HIGH:     float = 0.80
    MEDIUM:   float = 0.50
    LOW:      float = 0.25

    def get(self, importance: str) -> float:
        return getattr(self, importance.upper(), self.MEDIUM)


@dataclass(frozen=True)
class CategoryWeights:
    """
    Per-category importance multiplier used in demand weighting.
    Safety Skills always carry the highest multiplier because
    missing safety skills can disqualify a candidate entirely.
    """
    SAFETY:    float = 1.50
    EMERGING:  float = 1.25
    DIGITAL:   float = 1.10
    TECHNICAL: float = 1.00
    TOOLS:     float = 0.90
    SOFT:      float = 0.30
    GENERIC:   float = 0.20

    def get(self, category: str) -> float:
        mapping = {
            "Safety Skills":              self.SAFETY,
            "Emerging Skills":            self.EMERGING,
            "Digital & Technology Skills": self.DIGITAL,
            "Technical Skills":           self.TECHNICAL,
            "Tools & Equipment":          self.TOOLS,
            "Soft Skills":                self.SOFT,
            "Generic Skills":             self.GENERIC,
            "Candidate / Emerging Skills": 0.40,  # Unconfirmed skills
        }
        return mapping.get(category, self.TECHNICAL)


@dataclass(frozen=True)
class CoverageCredits:
    """
    How much coverage credit each relationship type contributes.
    These values intentionally do NOT allow parent_of or related_to to
    fully substitute for the required skill.
    """
    EXACT_EQUIVALENT: float = 1.00
    ALIAS:            float = 1.00
    CHILD_OF:         float = 0.70  # having a broader skill partially covers a specific one
    PARENT_OF:        float = 0.45  # having a more specific skill partially covers the broader
    PREREQUISITE_OF:  float = 0.30  # having a prerequisite shows readiness
    RELATED_TO:       float = 0.20
    PARTIAL_OVERLAP:  float = 0.15
    NO_MATCH:         float = 0.00

    def get(self, relationship: str) -> float:
        return getattr(self, relationship.upper(), self.NO_MATCH)


@dataclass(frozen=True)
class ScoringFormula:
    """
    Multi-factor scoring formula weights.

    Final score = Σ(skill_contribution) normalized to 0-100

    Per-skill contribution:
      base_contribution = demand_weight × importance_weight × nsqf_bonus
      coverage_credit   = relationship_coverage_credit × skill_confidence
      skill_contribution = base_contribution × coverage_credit

    Penalty: critical missing skill reduces final score by critical_gap_penalty per skill.

    Formula rationale:
    - Weighted demand ensures high-frequency industry skills matter more
    - Importance weight ensures safety/critical skills matter most
    - NSQF bonus rewards higher-level courses for the same skill coverage
    - Coverage credit uses ontology relationships (not just exact string match)
    - Critical gap penalty prevents a "good overall" score from hiding
      dangerous safety or hard-skill gaps
    """
    # NSQF bonus per level above baseline (4)
    nsqf_baseline: int = 4
    nsqf_bonus_per_level: float = 0.05    # NSQF 5 → 1.05x, NSQF 3 → 0.95x

    # Demand dampening
    single_job_single_employer_penalty: float = 0.70

    # Critical gap penalty: subtracted from raw score for each critical skill missing
    critical_gap_penalty_per_skill: float = 3.0

    # Minimum and maximum scores
    score_min: float = 0.0
    score_max: float = 100.0

    # Confidence blending weight
    # Final score = raw_score × confidence_weight + (1 - confidence_weight) × raw_score
    # i.e., low-confidence data slightly dampens extreme scores
    low_confidence_dampening: float = 0.08

    def nsqf_bonus(self, nsqf_level: int) -> float:
        return 1.0 + (nsqf_level - self.nsqf_baseline) * self.nsqf_bonus_per_level


@dataclass(frozen=True)
class ScoringConfig:
    """
    Complete versioned scoring configuration.
    Pass this to the ScoringEngine constructor.
    """
    version: str = SCORING_MODEL_VERSION
    importance: ImportanceWeights = field(default_factory=ImportanceWeights)
    category: CategoryWeights = field(default_factory=CategoryWeights)
    coverage: CoverageCredits = field(default_factory=CoverageCredits)
    formula: ScoringFormula = field(default_factory=ScoringFormula)

    def describe(self) -> dict:
        return {
            "scoring_model_version": self.version,
            "importance_weights": {
                "CRITICAL": self.importance.CRITICAL,
                "HIGH":     self.importance.HIGH,
                "MEDIUM":   self.importance.MEDIUM,
                "LOW":      self.importance.LOW,
            },
            "coverage_credits": {
                "EXACT_EQUIVALENT": self.coverage.EXACT_EQUIVALENT,
                "ALIAS":            self.coverage.ALIAS,
                "CHILD_OF":         self.coverage.CHILD_OF,
                "PARENT_OF":        self.coverage.PARENT_OF,
                "PREREQUISITE_OF":  self.coverage.PREREQUISITE_OF,
                "RELATED_TO":       self.coverage.RELATED_TO,
                "PARTIAL_OVERLAP":  self.coverage.PARTIAL_OVERLAP,
            },
            "critical_gap_penalty_per_skill": self.formula.critical_gap_penalty_per_skill,
            "nsqf_bonus_per_level": self.formula.nsqf_bonus_per_level,
        }


# Default production config (importable)
DEFAULT_SCORING_CONFIG = ScoringConfig()
