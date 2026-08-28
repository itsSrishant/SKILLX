"""
Engine 3: Robust Local NLP Skill Extraction, Deduplication & Normalization Engine
Zero-API / Zero-LLM Architecture

Fixes applied:
- D3: N-gram candidate cap raised from 3 → 15, sorted by technical density
- I1: NEGATION_TRIGGERS converted from list to set (O(1) lookup)
- I5: Added rebuild_index() method for hot-reload after dictionary changes
"""

import re
import math
import time
import logging
from typing import Dict, Any, List, Set, Tuple
from collections import defaultdict
from sqlalchemy.orm import Session
from app.db.models import Course, JobPosting, ExtractedSkill, SkillDictionary

logger = logging.getLogger("Engine3_SkillExtraction")

# ──────────────────────────────────────────────────────────────────────────────
# Master Zero-API Skill Taxonomy (50+ Core Industrial Trade Skills)
# ──────────────────────────────────────────────────────────────────────────────
# Engine 3 now dynamically loads the dictionary from SkillOntology.
# See _ensure_skill_dictionary() method.

# Convert to set for O(1) lookup (fixes I1)
NEGATION_TRIGGERS: Set[str] = {
    "no", "not", "without", "lacks", "neither", "nor",
    "doesn't require", "don't require", "no experience in",
    "not required", "optional", "no need", "excluded", "except"
}

COMMON_ENGLISH_STOPWORDS: Set[str] = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "up", "about", "into", "over", "after",
    "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would",
    "shall", "should", "may", "might", "must", "can", "could",
    "this", "that", "these", "those", "course", "syllabus", "student",
    "training", "practical", "theory", "hours", "total", "year",
    "semester", "module", "unit", "work", "job", "candidate",
    "company", "location", "salary", "experience", "skills", "required",
    "district", "industrial", "estate", "maharashtra", "nsqf", "level",
    "certified", "dvet", "midc", "preference", "candidates", "trained",
    "local", "institute", "role", "supervision", "responsibilities"
}

# Technical keyword hints for N-gram candidate scoring
TECHNICAL_KEYWORDS = {
    "control", "system", "automation", "python", "data", "cyber", "iot",
    "network", "machine", "processing", "digital", "smart", "sensor",
    "motor", "valve", "pump", "circuit", "power", "solar", "battery",
    "welding", "machining", "inspection", "calibration", "maintenance",
    "testing", "programming", "monitoring", "fabrication", "assembly"
}


class Engine3SkillExtraction:
    def __init__(self, db: Session):
        self.db = db
        self._ensure_skill_dictionary()
        self._load_and_compile_dictionary()

    def _ensure_skill_dictionary(self):
        """Initializes default master dictionary if DB table is empty."""
        existing_count = self.db.query(SkillDictionary).count()
        if existing_count == 0:
            logger.info("Initializing zero-API Master Skill Dictionary from SkillOntology...")
            from app.ontology.skill_ontology import SkillOntology
            ontology = SkillOntology.get()
            exported_dict = ontology.export_for_engine3()
            for item in exported_dict:
                sd = SkillDictionary(
                    standard_name=item["name"],
                    category=item["category"],
                    synonyms=item["synonyms"]
                )
                self.db.add(sd)
            self.db.commit()

    def _load_and_compile_dictionary(self):
        """
        Loads all dictionary entries into RAM and pre-compiles regexes.
        Synonyms sorted by length DESCENDING → Longest-First Overlap Suppression.
        """
        dict_items = self.db.query(SkillDictionary).all()
        self.compiled_synonyms: List[Tuple[str, str, str, Any]] = []
        self.synonym_to_canonical: Dict[str, str] = {}
        self.canonical_categories: Dict[str, str] = {}

        synonym_tuples = []
        for sd in dict_items:
            self.canonical_categories[sd.standard_name] = sd.category
            self.synonym_to_canonical[sd.standard_name.lower()] = sd.standard_name
            synonym_tuples.append((sd.standard_name, sd.standard_name, sd.category))

            for syn in (sd.synonyms or []):
                self.synonym_to_canonical[syn.lower()] = sd.standard_name
                synonym_tuples.append((syn, sd.standard_name, sd.category))

        # Sort longest-first for overlap suppression
        synonym_tuples.sort(key=lambda x: len(x[0]), reverse=True)

        for syn, standard_name, category in synonym_tuples:
            escaped = re.escape(syn.lower())
            pattern = r'(?<!\w)' + escaped + r'(?!\w)'
            regex = re.compile(pattern, re.IGNORECASE)
            self.compiled_synonyms.append((syn, standard_name, category, regex))

        logger.info(
            f"Engine 3 dictionary loaded: {len(dict_items)} entries, "
            f"{len(synonym_tuples)} synonym patterns compiled."
        )

    def rebuild_index(self):
        """Hot-reload the in-memory regex index after dictionary changes (fixes I5)."""
        logger.info("Rebuilding Engine 3 in-memory synonym regex index...")
        self._load_and_compile_dictionary()

    def _clean_raw_text(self, text: str) -> str:
        """Cleans HTML tags, soft hyphens, multi-spaces, and PDF line breaks."""
        if not text:
            return ""
        text = re.sub(r'<[^>]+>', ' ', text)
        text = text.replace('\xa0', ' ').replace('&nbsp;', ' ').replace('&amp;', '&')
        text = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def _is_negated(self, text_lower: str, match_start: int) -> bool:
        """Guardrail: Checks if preceding 60 chars contain a negation trigger."""
        window_start = max(0, match_start - 60)
        preceding_text = text_lower[window_start:match_start]
        words = re.findall(r'\b\w+\b', preceding_text.lower())
        # O(1) lookup since NEGATION_TRIGGERS is now a set
        return any(w in NEGATION_TRIGGERS for w in words)

    def _score_ngram_technical_density(self, phrase: str) -> int:
        """Scores an N-gram by how many technical keywords it contains."""
        words = phrase.lower().split()
        return sum(1 for w in words if w in TECHNICAL_KEYWORDS)

    def extract_skills_from_text(self, text: str) -> List[Dict[str, Any]]:
        """
        Multi-tiered Deduplicated Extraction:
        - Tier 1: Canonical Synonym Matching (Longest-First, Zero-API)
        - Tier 2: Dynamic N-Gram Candidate Discovery (cap 15, sorted by technical density)
        """
        cleaned_text = self._clean_raw_text(text)
        if not cleaned_text:
            return []

        text_lower = cleaned_text.lower()
        extracted_results: List[Dict[str, Any]] = []
        seen_canonical_names: Set[str] = set()
        matched_character_spans: List[Tuple[int, int]] = []

        # ── Tier 1: Dictionary Synonym Matching (Longest First) ───────────────
        for syn, standard_name, category, regex in self.compiled_synonyms:
            if standard_name.lower() in seen_canonical_names:
                continue

            for match in regex.finditer(text_lower):
                start, end = match.span()

                if any(s <= start and end <= e for s, e in matched_character_spans):
                    continue

                if self._is_negated(text_lower, start):
                    logger.debug(f"Suppressed negated skill '{syn}' at offset {start}")
                    continue

                seen_canonical_names.add(standard_name.lower())
                matched_character_spans.append((start, end))

                confidence = 0.99 if syn.lower() == standard_name.lower() else 0.94
                extracted_results.append({
                    "canonical_name": standard_name,
                    "surface_form": syn,
                    "category": category,
                    "status": "CONFIRMED",
                    "confidence": confidence,
                    "method": "canonical_regex"
                })
                break

        # ── Tier 2: Dynamic N-Gram Candidate Discovery (cap 15, D3 fix) ──────
        words = re.findall(r'\b[a-zA-Z0-9\+#\-]+\b', cleaned_text)
        candidate_phrases: List[Tuple[int, str]] = []  # (score, phrase)

        for n in (2, 3, 4):
            for i in range(len(words) - n + 1):
                ngram = words[i:i+n]
                first_word = ngram[0].lower()
                last_word = ngram[-1].lower()

                if first_word in COMMON_ENGLISH_STOPWORDS or last_word in COMMON_ENGLISH_STOPWORDS:
                    continue

                phrase = " ".join(ngram)
                phrase_lower = phrase.lower()

                if len(phrase) < 6 or phrase_lower.isdigit():
                    continue
                if phrase_lower in self.synonym_to_canonical:
                    continue
                if any(phrase_lower in c for c in seen_canonical_names):
                    continue

                score = self._score_ngram_technical_density(phrase)
                if score > 0 or any(w[0].isupper() for w in ngram):
                    candidate_phrases.append((score, phrase))

        # Sort by technical density descending, deduplicate, cap at 15 (D3 fix)
        seen_candidates: Set[str] = set()
        sorted_candidates = sorted(candidate_phrases, key=lambda x: x[0], reverse=True)

        for score, phrase in sorted_candidates:
            phrase_clean = phrase.strip().title()
            phrase_lower = phrase_clean.lower()

            if phrase_lower in seen_candidates or phrase_lower in seen_canonical_names:
                continue

            seen_candidates.add(phrase_lower)
            seen_canonical_names.add(phrase_lower)
            extracted_results.append({
                "canonical_name": phrase_clean,
                "surface_form": phrase,
                "category": "Candidate / Emerging Skills",
                "status": "CANDIDATE_UNKNOWN",
                "confidence": round(0.55 + (score * 0.10), 2),  # Higher density = higher confidence
                "method": "dynamic_ngram_candidate"
            })

            if len(seen_candidates) >= 15:  # Cap at 15 (was 3, fixes D3)
                break

        return extracted_results

    def run_extraction(self) -> Dict[str, Any]:
        """
        Runs deduplicated skill extraction across all courses & jobs.
        Uses bulk DB operations for maximum execution speed.
        """
        start_time = time.time()
        logger.info("Starting Engine 3 Skill Extraction & Deduplication Pipeline...")

        # Clear previous extracted skills and rebuild
        self.db.query(ExtractedSkill).delete()
        self.db.commit()

        courses = self.db.query(Course).all()
        jobs = self.db.query(JobPosting).all()

        extracted_objects = []
        course_skills_count = 0
        job_skills_count = 0

        for course in courses:
            extracted = self.extract_skills_from_text(course.syllabus_text or "")
            for item in extracted:
                es = ExtractedSkill(
                    skill_name=item["canonical_name"],
                    category=item["category"],
                    course_id=course.id,
                    source_type="COURSE",
                    status=item["status"],
                    confidence_score=item["confidence"]
                )
                extracted_objects.append(es)
                course_skills_count += 1

        for job in jobs:
            extracted = self.extract_skills_from_text(job.job_description or "")
            for item in extracted:
                es = ExtractedSkill(
                    skill_name=item["canonical_name"],
                    category=item["category"],
                    job_posting_id=job.id,
                    source_type="JOB",
                    status=item["status"],
                    confidence_score=item["confidence"]
                )
                extracted_objects.append(es)
                job_skills_count += 1

        if extracted_objects:
            self.db.bulk_save_objects(extracted_objects)
            self.db.commit()

        latency_ms = round((time.time() - start_time) * 1000, 2)
        logger.info(
            f"Engine 3 completed: {course_skills_count} course skills & "
            f"{job_skills_count} job skills extracted & deduplicated in {latency_ms}ms."
        )

        return {
            "status": "SUCCESS",
            "latency_ms": latency_ms,
            "extracted_course_skills": course_skills_count,
            "extracted_job_skills": job_skills_count,
            "total_extracted": course_skills_count + job_skills_count,
            "dictionary_entries": self.db.query(SkillDictionary).count(),
        }
