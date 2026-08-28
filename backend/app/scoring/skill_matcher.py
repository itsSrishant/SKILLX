"""
SkillX Skill Matcher — Prompt 4
Deterministic skill relationship matcher using the Skill Ontology.

Rules:
1. Canonical IDs → exact match first
2. Hierarchy traversal → parent/child relationships
3. Prerequisite relationships
4. Related skill relationships
5. Fuzzy string similarity ONLY as candidate generator,
   NEVER as the final arbiter of equivalence
6. NOT_EQUIVALENT guard: explicitly defined mismatches always return NO_MATCH

Returns MatchEvidence for every comparison — full audit trail.

Version: 1.0.0
"""

import logging
from dataclasses import dataclass
from typing import Dict, List, Optional, Set, Tuple
from difflib import SequenceMatcher

from app.ontology.skill_ontology import SkillOntology, SkillRelationship, ONTOLOGY_VERSION
from app.ontology.skill_normalizer import SkillNormalizer, get_normalizer
from app.scoring.scoring_config import ScoringConfig, DEFAULT_SCORING_CONFIG

logger = logging.getLogger("SkillMatcher")


@dataclass
class MatchEvidence:
    """
    Full audit record for a single skill-vs-skill comparison.

    This is the explainability record that allows a developer, government
    officer, or hackathon judge to understand exactly why two skills were
    (or were not) matched.
    """
    source_skill: str           # Surface form as seen in course/student
    target_skill: str           # Surface form as demanded by job/requirement
    source_skill_id: Optional[str]   # Resolved canonical ID (None = unknown)
    target_skill_id: Optional[str]   # Resolved canonical ID (None = unknown)
    relationship: str           # SkillRelationship value
    confidence: float           # 0.0–1.0 — how certain is the relationship
    coverage_credit: float      # 0.0–1.0 — how much this counts toward coverage
    reason: str                 # Human-readable explanation
    ontology_version: str = ONTOLOGY_VERSION

    def is_match(self) -> bool:
        return self.coverage_credit > 0.0


class SkillMatcher:
    """
    Deterministic, ontology-aware skill relationship matcher.

    Usage:
        matcher = SkillMatcher()
        evidence = matcher.match("CNC G-Code Programming", "CNC Programming")
        # evidence.relationship == "CHILD_OF"
        # evidence.coverage_credit == 0.45
        # evidence.reason == "Source skill 'cnc_gcode' is a specialisation of target 'cnc_fundamentals'"

    Debugging:
        matcher.explain("Welding", "Robotic Welding Operations")
        # → "Source 'weld_fundamentals' is PARENT_OF target 'weld_robotic'"
        # → coverage_credit = 0.45 (not full credit)
    """

    def __init__(self, config: ScoringConfig = DEFAULT_SCORING_CONFIG):
        self._config = config
        self._ontology = SkillOntology.get()
        self._normalizer = get_normalizer()

    def match(
        self,
        source_skill: str,
        target_skill: str,
    ) -> MatchEvidence:
        """
        Compare source_skill (what the course/student has) against
        target_skill (what the job/requirement demands).

        Resolution order:
          1. NOT_EQUIVALENT guard
          2. Exact canonical ID match
          3. Child-to-parent match (specialisation covers broader)
          4. Parent-to-child match (broader partially covers specialisation)
          5. Prerequisite relationship
          6. Related skill
          7. No match
        """
        # Normalize both
        src_res = self._normalizer.normalize(source_skill)
        tgt_res = self._normalizer.normalize(target_skill)

        src_id = src_res.skill_id
        tgt_id = tgt_res.skill_id

        # ── Guard: NOT_EQUIVALENT ──────────────────────────────────────────────
        if src_id and tgt_id and self._ontology.is_not_equivalent(src_id, tgt_id):
            return MatchEvidence(
                source_skill=source_skill,
                target_skill=target_skill,
                source_skill_id=src_id,
                target_skill_id=tgt_id,
                relationship=SkillRelationship.NOT_EQUIVALENT,
                confidence=1.0,
                coverage_credit=0.0,
                reason=(
                    f"'{source_skill}' and '{target_skill}' are explicitly "
                    f"marked NOT_EQUIVALENT in the ontology."
                ),
            )

        # ── 1. Exact canonical ID match ────────────────────────────────────────
        if src_id and tgt_id and src_id == tgt_id:
            conf = min(src_res.confidence, tgt_res.confidence)
            return MatchEvidence(
                source_skill=source_skill,
                target_skill=target_skill,
                source_skill_id=src_id,
                target_skill_id=tgt_id,
                relationship=SkillRelationship.EXACT_EQUIVALENT,
                confidence=conf,
                coverage_credit=self._config.coverage.EXACT_EQUIVALENT * conf,
                reason=(
                    f"Both forms resolve to the same canonical skill "
                    f"'{self._ontology.get_by_id(src_id).canonical_name}'."
                ),
            )

        # ── 2. Both known: hierarchy + relationship check ──────────────────────
        if src_id and tgt_id:
            evidence = self._check_known_relationship(
                source_skill, target_skill, src_id, tgt_id,
                src_res.confidence, tgt_res.confidence,
            )
            if evidence:
                return evidence

        # ── 3. One or both unknown: controlled fallback ───────────────────────
        return self._unknown_fallback(
            source_skill, target_skill, src_id, tgt_id,
            src_res, tgt_res,
        )

    def _check_known_relationship(
        self,
        source_skill: str,
        target_skill: str,
        src_id: str,
        tgt_id: str,
        src_conf: float,
        tgt_conf: float,
    ) -> Optional[MatchEvidence]:
        """Check all curated relationships between two known skills."""
        conf = min(src_conf, tgt_conf)

        src_skill = self._ontology.get_by_id(src_id)
        tgt_skill = self._ontology.get_by_id(tgt_id)

        src_name = src_skill.canonical_name if src_skill else src_id
        tgt_name = tgt_skill.canonical_name if tgt_skill else tgt_id

        # Child-to-parent: source is a child of target
        # e.g., "CNC G-Code Programming" covers "CNC Machine Fundamentals" partially
        if tgt_id in (src_skill.parent_skill_id or "") or \
           src_id in (tgt_skill.child_skill_ids if tgt_skill else []):
            credit = self._config.coverage.PARENT_OF * conf
            return MatchEvidence(
                source_skill=source_skill, target_skill=target_skill,
                source_skill_id=src_id, target_skill_id=tgt_id,
                relationship=SkillRelationship.CHILD_OF,
                confidence=conf,
                coverage_credit=credit,
                reason=(
                    f"'{src_name}' is a specialisation (child) of '{tgt_name}'. "
                    f"Having the specialised skill provides partial coverage of the broader requirement."
                ),
            )

        # Parent-to-child: source is a parent of target
        # e.g., "Welding Fundamentals" student asks to cover "MIG Welding" job req
        if src_id in (tgt_skill.parent_skill_id or "") or \
           tgt_id in (src_skill.child_skill_ids if src_skill else []):
            credit = self._config.coverage.CHILD_OF * conf
            return MatchEvidence(
                source_skill=source_skill, target_skill=target_skill,
                source_skill_id=src_id, target_skill_id=tgt_id,
                relationship=SkillRelationship.PARENT_OF,
                confidence=conf,
                coverage_credit=credit,
                reason=(
                    f"'{src_name}' is a broader (parent) skill of '{tgt_name}'. "
                    f"The foundation provides significant but not complete coverage."
                ),
            )

        # Prerequisite: source is a prerequisite of target
        if src_id in (tgt_skill.prerequisite_skill_ids if tgt_skill else []):
            credit = self._config.coverage.PREREQUISITE_OF * conf
            return MatchEvidence(
                source_skill=source_skill, target_skill=target_skill,
                source_skill_id=src_id, target_skill_id=tgt_id,
                relationship=SkillRelationship.PREREQUISITE_OF,
                confidence=conf,
                coverage_credit=credit,
                reason=(
                    f"'{src_name}' is a prerequisite of '{tgt_name}'. "
                    f"Having the prerequisite indicates readiness but does not satisfy the target."
                ),
            )

        # Related skill
        if tgt_id in (src_skill.related_skill_ids if src_skill else []) or \
           src_id in (tgt_skill.related_skill_ids if tgt_skill else []):
            credit = self._config.coverage.RELATED_TO * conf
            return MatchEvidence(
                source_skill=source_skill, target_skill=target_skill,
                source_skill_id=src_id, target_skill_id=tgt_id,
                relationship=SkillRelationship.RELATED_TO,
                confidence=conf,
                coverage_credit=credit,
                reason=(
                    f"'{src_name}' and '{tgt_name}' are related but not equivalent. "
                    f"Minimal overlap credit only."
                ),
            )

        # No curated relationship found
        return None

    def _unknown_fallback(
        self,
        source_skill: str,
        target_skill: str,
        src_id: Optional[str],
        tgt_id: Optional[str],
        src_res,
        tgt_res,
    ) -> MatchEvidence:
        """
        Fallback for unknown or unresolvable skills.
        Uses string similarity as a DIAGNOSTIC hint only — never grants coverage.
        """
        sim = SequenceMatcher(
            None,
            src_res.normalized_form,
            tgt_res.normalized_form,
        ).ratio()
        relationship = SkillRelationship.NOT_EQUIVALENT
        credit = 0.0
        confidence = 0.0
        reason = (
            f"Neither '{source_skill}' nor '{target_skill}' could be fully resolved "
            f"in the ontology. String similarity={sim:.2f}. "
            f"No coverage credit assigned — add to ontology to enable matching."
        )

        if sim >= 0.90:
            # High similarity but NOT equivalent without curation
            relationship = SkillRelationship.PARTIAL_OVERLAP
            credit = 0.0   # Still no credit — must be curated
            confidence = sim * 0.40
            reason = (
                f"High string similarity ({sim:.2f}) between '{source_skill}' and "
                f"'{target_skill}', but no ontology curation exists. "
                f"DIAGNOSTIC ONLY — zero coverage credit. Candidate for ontology review."
            )

        return MatchEvidence(
            source_skill=source_skill, target_skill=target_skill,
            source_skill_id=src_id, target_skill_id=tgt_id,
            relationship=relationship,
            confidence=confidence,
            coverage_credit=credit,
            reason=reason,
        )

    # ── Batch matching ─────────────────────────────────────────────────────────

    def match_skill_sets(
        self,
        source_skills: List[str],
        target_skills: List[str],
    ) -> Dict[str, MatchEvidence]:
        """
        Match each target skill against the source skill set.
        Returns {target_skill: best_MatchEvidence}.
        """
        results: Dict[str, MatchEvidence] = {}
        # Index source skill IDs for fast O(1) membership test
        source_ids: Set[str] = set()
        for ss in source_skills:
            res = self._normalizer.normalize(ss)
            if res.skill_id:
                source_ids.add(res.skill_id)

        for target in target_skills:
            best: Optional[MatchEvidence] = None
            for source in source_skills:
                ev = self.match(source, target)
                if best is None or ev.coverage_credit > best.coverage_credit:
                    best = ev
                if best.coverage_credit >= 1.0:
                    break  # Exact match — no need to check further

            results[target] = best or MatchEvidence(
                source_skill="", target_skill=target,
                source_skill_id=None, target_skill_id=None,                relationship=SkillRelationship.NOT_EQUIVALENT,
                confidence=0.0, coverage_credit=0.0,
                reason="No source skill set provided.",
            )
        return results

    # ── Explainability ─────────────────────────────────────────────────────────

    def explain(self, source_skill: str, target_skill: str) -> str:
        """
        Human-readable explanation of why two skills do or do not match.
        Useful for hackathon demos and government audits.
        """
        ev = self.match(source_skill, target_skill)
        lines = [
            f"SKILL MATCH DEBUGGER",
            f"====================",
            f"Source skill  : {ev.source_skill}",
            f"Target skill  : {ev.target_skill}",
            f"Source ID     : {ev.source_skill_id or 'UNKNOWN (not in ontology)'}",
            f"Target ID     : {ev.target_skill_id or 'UNKNOWN (not in ontology)'}",
            f"Relationship  : {ev.relationship}",
            f"Confidence    : {ev.confidence:.2f}",
            f"Coverage credit: {ev.coverage_credit:.2f} / 1.00",
            f"Reason        : {ev.reason}",
            f"Ontology v    : {ev.ontology_version}",
        ]
        return "\n".join(lines)
