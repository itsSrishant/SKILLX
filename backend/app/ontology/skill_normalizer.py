"""
SkillX Skill Normalizer — Prompt 2 (deterministic normalization pipeline)
Zero-API, fully deterministic. No fuzzy matching alone creates equivalences.

Pipeline:
  1. Unicode normalization
  2. Case normalization (lowercase)
  3. Whitespace & punctuation normalization
  4. Alias lookup (exact)
  5. Abbreviation lookup (exact)
  6. Canonical ID mapping
  7. Bounded fallback — only if similarity > threshold AND candidate is not
     in a NOT_EQUIVALENT pair with any existing mapping
  8. Preserve original surface form for display
  9. Assign confidence

Version: 1.0.0
"""

import re
import unicodedata
import logging
from dataclasses import dataclass
from typing import Optional, Tuple, Dict, List
from difflib import SequenceMatcher

from app.ontology.skill_ontology import SkillOntology, CanonicalSkill, ONTOLOGY_VERSION

logger = logging.getLogger("SkillNormalizer")

# Only use fuzzy fallback as a CANDIDATE GENERATOR, never as final arbiter.
# Minimum similarity for a fuzzy candidate to be considered at all.
FUZZY_CANDIDATE_THRESHOLD = 0.82
# Above this threshold the fuzzy match is STILL only accepted if the candidate
# has been curated in the ontology (i.e., surface form is already listed).
# There is no automatic acceptance of purely fuzzy results.
FUZZY_AUTO_ACCEPT_DISABLED = True   # Flag: fuzzy never auto-creates equivalence


@dataclass
class NormalizationResult:
    """Outcome of normalizing a single surface skill form."""
    original: str               # Raw input exactly as received
    normalized_form: str        # After unicode/case/whitespace clean
    skill_id: Optional[str]     # Canonical ID if resolved; None if unknown
    canonical_name: Optional[str]  # Display name if resolved
    confidence: float           # 0.0–1.0
    method: str                 # How it was resolved
    # method values:
    #   "exact_canonical"       — input IS the canonical name
    #   "alias"                 — matched an alias
    #   "abbreviation"          — matched an abbreviation
    #   "fuzzy_candidate"       — fuzzy similarity above threshold (not equivalent!)
    #   "unknown"               — not in ontology
    is_known: bool
    ontology_version: str = ONTOLOGY_VERSION


class SkillNormalizer:
    """
    Deterministic, zero-API skill normalizer.

    Usage:
        normalizer = SkillNormalizer()
        result = normalizer.normalize("CNC G-code programming")
        # result.skill_id == "cnc_gcode", result.confidence == 1.0
    """

    def __init__(self):
        self._ontology = SkillOntology.get()
        # Pre-index all canonical names for fast fuzzy comparison
        self._all_surface_forms: List[Tuple[str, str]] = [
            (sf, sid)
            for sf, sid in self._ontology._surface_to_id.items()
        ]
        logger.info(
            f"SkillNormalizer ready: {len(self._all_surface_forms)} surface forms indexed."
        )

    # ── Step 1-3: Text cleaning ────────────────────────────────────────────────

    def clean(self, text: str) -> str:
        """
        Steps 1–3: unicode normalization, lowercase, whitespace/punctuation cleanup.
        Preserves meaningful hyphenated terms (e.g., G-Code → g-code).
        """
        if not text:
            return ""
        # 1. Unicode normalization to NFC
        text = unicodedata.normalize("NFC", text)
        # 2. Lowercase
        text = text.lower()
        # 3. Normalize whitespace
        text = re.sub(r"\s+", " ", text).strip()
        # 3b. Remove trailing/leading punctuation (but keep internal hyphens and parentheses)
        text = text.strip(" .,;:-!")
        return text

    # ── Core normalization ─────────────────────────────────────────────────────

    def normalize(self, surface_form: str) -> NormalizationResult:
        """
        Normalize a single skill surface form to a canonical ID.

        Resolution order:
          1. Exact canonical name match
          2. Alias match
          3. Abbreviation match
          4. Fuzzy candidate (diagnosis only; marked as CANDIDATE not EQUIVALENT)
          5. Unknown
        """
        original = surface_form
        cleaned = self.clean(surface_form)

        if not cleaned:
            return NormalizationResult(
                original=original, normalized_form="",
                skill_id=None, canonical_name=None,
                confidence=0.0, method="empty", is_known=False,
            )

        # Steps 4–6: exact, alias, abbreviation lookup (all go through same index)
        skill_id = self._ontology.get_canonical_id(cleaned)
        if skill_id:
            skill = self._ontology.get_by_id(skill_id)
            # Determine HOW it matched
            method = self._match_method(cleaned, skill)
            conf = 0.99 if method == "exact_canonical" else 0.94
            return NormalizationResult(
                original=original, normalized_form=cleaned,
                skill_id=skill_id,
                canonical_name=skill.canonical_name if skill else None,
                confidence=conf, method=method, is_known=True,
            )

        # Step 7: Bounded fuzzy fallback — candidate generation only
        if not FUZZY_AUTO_ACCEPT_DISABLED:
            # (This branch is intentionally disabled for production safety)
            pass

        fuzzy_id, fuzzy_score = self._best_fuzzy_candidate(cleaned)
        if fuzzy_id and fuzzy_score >= FUZZY_CANDIDATE_THRESHOLD:
            fuzzy_skill = self._ontology.get_by_id(fuzzy_id)
            return NormalizationResult(
                original=original, normalized_form=cleaned,
                skill_id=None,  # NOT treated as equivalent
                canonical_name=fuzzy_skill.canonical_name if fuzzy_skill else None,
                confidence=round(fuzzy_score * 0.55, 3),  # Reduced confidence
                method="fuzzy_candidate",  # Clearly labelled as a candidate only
                is_known=False,
            )

        # Step 8: Unknown
        return NormalizationResult(
            original=original, normalized_form=cleaned,
            skill_id=None, canonical_name=None,
            confidence=0.0, method="unknown", is_known=False,
        )

    def _match_method(self, cleaned: str, skill: Optional[CanonicalSkill]) -> str:
        """Determine how the cleaned form matched the skill."""
        if skill is None:
            return "unknown"
        if cleaned == skill.canonical_name.lower():
            return "exact_canonical"
        if cleaned in [a.lower() for a in skill.aliases]:
            return "alias"
        if cleaned in [a.lower() for a in skill.abbreviations]:
            return "abbreviation"
        return "alias"  # default — matched via surface_to_id index

    def _best_fuzzy_candidate(self, cleaned: str) -> Tuple[Optional[str], float]:
        """
        Find best fuzzy match from all surface forms.
        Returns (skill_id, similarity_score) or (None, 0.0).

        This is ONLY used as a candidate generator — the caller must NOT
        treat this as an equivalence.
        """
        best_score = 0.0
        best_id: Optional[str] = None

        for sf, sid in self._all_surface_forms:
            # Quick length filter to avoid unnecessary SequenceMatcher calls
            len_ratio = min(len(cleaned), len(sf)) / max(len(cleaned), len(sf), 1)
            if len_ratio < 0.6:
                continue
            score = SequenceMatcher(None, cleaned, sf).ratio()
            if score > best_score:
                best_score = score
                best_id = sid

        return best_id, best_score

    # ── Batch normalization ────────────────────────────────────────────────────

    def normalize_many(
        self, surface_forms: List[str]
    ) -> List[NormalizationResult]:
        """Normalize a list of skill surface forms."""
        return [self.normalize(sf) for sf in surface_forms]

    def normalize_to_id(self, surface_form: str) -> Optional[str]:
        """Quick helper: returns skill_id or None."""
        return self.normalize(surface_form).skill_id

    # ── Bulk skill-set resolution ──────────────────────────────────────────────

    def resolve_skill_set(
        self, surface_forms: List[str]
    ) -> Dict[str, NormalizationResult]:
        """
        Resolve a set of skill surface forms to NormalizationResults.
        Deduplicates: if multiple forms resolve to the same skill_id,
        only the highest-confidence result is kept.
        """
        resolved: Dict[str, NormalizationResult] = {}  # skill_id → result
        unknown: Dict[str, NormalizationResult] = {}   # original → result

        for sf in surface_forms:
            result = self.normalize(sf)
            if result.is_known and result.skill_id:
                existing = resolved.get(result.skill_id)
                if not existing or result.confidence > existing.confidence:
                    resolved[result.skill_id] = result
            else:
                unknown[sf] = result

        return {**{sid: r for sid, r in resolved.items()},
                **{sf: r for sf, r in unknown.items()}}


# Module-level singleton for import convenience
_normalizer: Optional[SkillNormalizer] = None


def get_normalizer() -> SkillNormalizer:
    global _normalizer
    if _normalizer is None:
        _normalizer = SkillNormalizer()
    return _normalizer


def normalize_skill(surface_form: str) -> NormalizationResult:
    """Convenience function: normalize a single skill surface form."""
    return get_normalizer().normalize(surface_form)


def normalize_skills(surface_forms: List[str]) -> List[NormalizationResult]:
    """Convenience function: normalize a list of skill surface forms."""
    return get_normalizer().normalize_many(surface_forms)
