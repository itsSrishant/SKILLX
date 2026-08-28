"""
NPTEL Provider Adapter — Prompt 6
Reads NPTEL courses from a hand-curated JSON file.

Source data format (nptel_courses.json):
[
  {
    "nptel_id": "NPTEL-CS-01",
    "title": "Python for Engineers",
    "sector": "Information Technology",
    "nsqf_level": 4,
    "duration_weeks": 12,
    "discipline": "Computer Science",
    "syllabus_topics": ["Python basics", "NumPy", "Pandas", "SQLite"],
    "nptel_url": "https://nptel.ac.in/courses/106/104/106104182/",
    "instructor": "Prof. X, IIT Madras"
  }
]

When no JSON file is found, returns empty list with a note.
Designed to be populated when NPTEL data is available.

Version: 1.0.0
"""

import json
import logging
import os
from typing import List

from app.ingestion.course_schema import CanonicalCourse, InstituteType, ProviderType
from app.ingestion.provider_adapter import ProviderAdapter, ProviderLoadError

logger = logging.getLogger("NPTELAdapter")

DEFAULT_DATA_PATH = os.path.join(
    os.path.dirname(__file__), "data", "nptel_courses.json"
)


class NPTELAdapter(ProviderAdapter):
    """
    NPTEL course data provider.

    Loads from a curated JSON file. If the file does not exist, returns
    an empty list with a diagnostic note — never raises an exception
    that would break the ingestion pipeline.
    """

    def __init__(self, data_path: str = DEFAULT_DATA_PATH):
        self._data_path = data_path

    @property
    def provider_type(self) -> ProviderType:
        return ProviderType.NPTEL

    def load(self) -> List[CanonicalCourse]:
        if not os.path.exists(self._data_path):
            logger.info(
                f"NPTEL data file not found at {self._data_path}. "
                f"Returning empty list. Create the file to enable NPTEL import."
            )
            return []

        try:
            with open(self._data_path, "r", encoding="utf-8") as f:
                raw = json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            logger.error(f"NPTELAdapter: failed to load {self._data_path}: {e}")
            return []

        courses = []
        for item in raw:
            try:
                course = self._transform(item)
                errors = self.validate(course)
                if errors:
                    logger.warning(
                        f"NPTELAdapter: validation errors for '{item.get('title', '?')}': {errors}"
                    )
                    continue
                course.change_hash = self.compute_hash(course)
                courses.append(course)
            except Exception as e:
                logger.error(f"NPTELAdapter: transform error for {item}: {e}")
                continue

        logger.info(f"NPTELAdapter: loaded {len(courses)} courses.")
        return courses

    def _transform(self, item: dict) -> CanonicalCourse:
        duration_weeks = item.get("duration_weeks", 12)
        duration_months = max(1, duration_weeks // 4)

        topics = item.get("syllabus_topics", [])
        syllabus_text = (
            f"Course: {item.get('title', '')}. "
            f"Discipline: {item.get('discipline', '')}. "
            f"Topics covered: {', '.join(topics)}. "
            f"Instructor: {item.get('instructor', 'NPTEL Faculty')}."
        )

        return CanonicalCourse(
            title=item["title"],
            provider_type=ProviderType.NPTEL,
            provider_id=item.get("nptel_id", f"NPTEL-{hash(item['title'])}"),
            source_url=item.get("nptel_url", "PLACEHOLDER_URL"),
            institute_type=InstituteType.ONLINE,
            sector=item.get("sector", "General"),
            nsqf_level=item.get("nsqf_level", 4),
            duration_months=duration_months,
            intake_capacity=0,                    # NPTEL is open enrolment
            qualification_req="12th Pass or Working Professional",
            training_level="NPTEL Online Certification",
            syllabus_text=syllabus_text,
            raw_source_data=json.dumps(item),
            district="Statewide Online",
            state="Maharashtra",
            skills_explicitly_listed=topics,
            source_confidence=0.85,
            source_is_placeholder=("nptel_url" not in item),
            data_notes=f"Imported from NPTEL curated dataset. Instructor: {item.get('instructor', 'N/A')}",
        )
