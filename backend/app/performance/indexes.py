"""
SkillX Performance Index — Prompt 14
In-memory inverted skill index for O(1) skill-to-course/job lookups.

Problem:
  Engine 4 iterates all courses × all jobs × all skills → O(n×m×k)
  With 100K courses and 50K jobs, this is extremely slow.

Solution:
  Build inverted indexes at startup:
  - skill_id → List[course_id] (courses teaching this skill)
  - skill_id → List[job_id]    (jobs demanding this skill)
  - district → List[course_id] (courses in district)
  - district → List[job_id]    (jobs in district)

  These allow O(1) set intersection instead of O(n×m) loops.

Version: 1.0.0
"""

import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set

from sqlalchemy.orm import Session

from app.db.models import Course, ExtractedSkill, JobPosting
from app.ontology.skill_normalizer import get_normalizer

logger = logging.getLogger("PerformanceIndex")

INDEX_VERSION = "1.0.0"


@dataclass
class SkillIndex:
    """
    Bidirectional inverted index for skills.

    Populated by IndexBuilder.build_all().
    All lookups are O(1) average.
    """
    # skill_id → set of course_ids that have that skill
    skill_to_courses: Dict[str, Set[int]] = field(default_factory=lambda: defaultdict(set))

    # skill_id → set of job_ids that demand that skill
    skill_to_jobs: Dict[str, Set[int]] = field(default_factory=lambda: defaultdict(set))

    # course_id → set of skill_ids
    course_to_skills: Dict[int, Set[str]] = field(default_factory=lambda: defaultdict(set))

    # job_id → set of skill_ids
    job_to_skills: Dict[int, Set[str]] = field(default_factory=lambda: defaultdict(set))

    # district → set of course_ids
    district_to_courses: Dict[str, Set[int]] = field(default_factory=lambda: defaultdict(set))

    # district → set of job_ids
    district_to_jobs: Dict[str, Set[int]] = field(default_factory=lambda: defaultdict(set))

    # sector → set of course_ids
    sector_to_courses: Dict[str, Set[int]] = field(default_factory=lambda: defaultdict(set))

    # sector → set of job_ids
    sector_to_jobs: Dict[str, Set[int]] = field(default_factory=lambda: defaultdict(set))

    # Metadata
    built_at: Optional[str] = None
    n_courses: int = 0
    n_jobs: int = 0
    n_skills: int = 0
    build_latency_ms: float = 0.0

    def courses_with_skill(self, skill_id: str) -> Set[int]:
        """O(1): All courses that teach the given canonical skill."""
        return self.skill_to_courses.get(skill_id, set())

    def jobs_demanding_skill(self, skill_id: str) -> Set[int]:
        """O(1): All jobs that demand the given canonical skill."""
        return self.skill_to_jobs.get(skill_id, set())

    def skills_for_course(self, course_id: int) -> Set[str]:
        """O(1): All skill_ids extracted from a course."""
        return self.course_to_skills.get(course_id, set())

    def skills_for_job(self, job_id: int) -> Set[str]:
        """O(1): All skill_ids demanded by a job."""
        return self.job_to_skills.get(job_id, set())

    def courses_in_district(self, district: str) -> Set[int]:
        return self.district_to_courses.get(district, set())

    def jobs_in_district(self, district: str) -> Set[int]:
        return self.district_to_jobs.get(district, set())

    def courses_in_sector(self, sector: str) -> Set[int]:
        return self.sector_to_courses.get(sector, set())

    def jobs_in_sector(self, sector: str) -> Set[int]:
        return self.sector_to_jobs.get(sector, set())

    def skill_overlap(
        self, course_skill_ids: Set[str], job_skill_ids: Set[str]
    ) -> Set[str]:
        """O(min(|A|,|B|)): Matching skills between course and job."""
        return course_skill_ids & job_skill_ids

    def stats(self) -> dict:
        return {
            "index_version": INDEX_VERSION,
            "built_at": self.built_at,
            "n_courses": self.n_courses,
            "n_jobs": self.n_jobs,
            "n_skills": self.n_skills,
            "n_skill_to_course_entries": sum(len(v) for v in self.skill_to_courses.values()),
            "n_skill_to_job_entries": sum(len(v) for v in self.skill_to_jobs.values()),
            "n_districts": len(self.district_to_courses),
            "build_latency_ms": self.build_latency_ms,
        }


class IndexBuilder:
    """
    Builds the SkillIndex from DB in a single pass.

    Usage:
        builder = IndexBuilder(db)
        index = builder.build_all()

    Re-build whenever:
    - A new ingestion batch completes
    - Engine 3 re-extracts skills
    """

    def __init__(self, db: Session):
        self._db = db
        self._normalizer = get_normalizer()

    def build_all(self) -> SkillIndex:
        """
        Build the complete inverted index from DB.
        Runs in a single DB round-trip per table.
        """
        t_start = time.time()
        index = SkillIndex()

        # ── Fetch all skill records ─────────────────────────────────────────────
        all_skills = self._db.query(ExtractedSkill).all()

        for sk in all_skills:
            # Resolve to canonical ID
            canonical_id = self._normalizer.normalize_to_id(sk.skill_name)
            if not canonical_id:
                canonical_id = f"unknown:{sk.skill_name.lower()}"

            if sk.source_type == "COURSE" and sk.course_id:
                index.skill_to_courses[canonical_id].add(sk.course_id)
                index.course_to_skills[sk.course_id].add(canonical_id)

            elif sk.source_type == "JOB" and sk.job_posting_id:
                index.skill_to_jobs[canonical_id].add(sk.job_posting_id)
                index.job_to_skills[sk.job_posting_id].add(canonical_id)

        # ── Fetch all courses for district/sector index ─────────────────────────
        all_courses = self._db.query(
            Course.id, Course.district, Course.sector
        ).filter(Course.status == "ACTIVE").all()

        for cid, district, sector in all_courses:
            if district:
                index.district_to_courses[district].add(cid)
            if sector:
                index.sector_to_courses[sector].add(cid)

        # ── Fetch all jobs for district/sector index ────────────────────────────
        all_jobs = self._db.query(
            JobPosting.id, JobPosting.district, JobPosting.sector
        ).filter(JobPosting.status == "ACTIVE").all()

        for jid, district, sector in all_jobs:
            if district:
                index.district_to_jobs[district].add(jid)
            if sector:
                index.sector_to_jobs[sector].add(jid)

        # ── Populate metadata ───────────────────────────────────────────────────
        from datetime import datetime
        index.built_at = datetime.utcnow().isoformat()
        index.n_courses = len(all_courses)
        index.n_jobs = len(all_jobs)
        index.n_skills = len(set(index.skill_to_courses.keys()) | set(index.skill_to_jobs.keys()))
        index.build_latency_ms = round((time.time() - t_start) * 1000, 2)

        logger.info(
            f"IndexBuilder.build_all: {index.n_courses} courses, "
            f"{index.n_jobs} jobs, {index.n_skills} skill IDs indexed in "
            f"{index.build_latency_ms}ms."
        )
        return index


# Module-level singleton index (rebuilt on demand)
_global_index: Optional[SkillIndex] = None


def get_index(db: Optional[Session] = None) -> Optional[SkillIndex]:
    """Return global index, building it if needed."""
    global _global_index
    if _global_index is None and db is not None:
        _global_index = IndexBuilder(db).build_all()
    return _global_index


def rebuild_index(db: Session) -> SkillIndex:
    """Force rebuild of the global index."""
    global _global_index
    _global_index = IndexBuilder(db).build_all()
    return _global_index
