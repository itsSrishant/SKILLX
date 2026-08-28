"""
Coursera Provider Adapter — Prompt 6
Reads Coursera courses from a hand-curated JSON file.

Source data format (coursera_courses.json):
[
  {
    "course_id": "python-for-everybody",
    "title": "Python for Everybody",
    "partner": "University of Michigan",
    "sector": "Information Technology",
    "nsqf_level": 3,
    "duration_weeks": 8,
    "level": "Beginner",
    "skills": ["Python", "JSON", "Web scraping"],
    "url": "https://www.coursera.org/specializations/python",
    "certificate_type": "Professional Certificate"
  }
]

When no JSON file is found, returns empty list with a note.

Version: 1.0.0
"""

import json
import logging
import os
from typing import List

from app.ingestion.course_schema import CanonicalCourse, InstituteType, ProviderType
from app.ingestion.provider_adapter import ProviderAdapter

logger = logging.getLogger("CourseraAdapter")

DEFAULT_DATA_PATH = os.path.join(
    os.path.dirname(__file__), "data", "coursera_courses.json"
)

LEVEL_TO_NSQF = {
    "Beginner": 3,
    "Intermediate": 4,
    "Advanced": 5,
    "Mixed": 4,
}


class CourseraAdapter(ProviderAdapter):
    """
    Coursera course data provider.
    Loads from curated JSON file — graceful empty return if file missing.
    """

    def __init__(self, data_path: str = DEFAULT_DATA_PATH):
        self._data_path = data_path

    @property
    def provider_type(self) -> ProviderType:
        return ProviderType.COURSERA

    def load(self) -> List[CanonicalCourse]:
        if not os.path.exists(self._data_path):
            logger.info(
                f"Coursera data file not found at {self._data_path}. "
                f"Returning empty list. Create the file to enable Coursera import."
            )
            return []

        try:
            with open(self._data_path, "r", encoding="utf-8") as f:
                raw = json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            logger.error(f"CourseraAdapter: failed to load {self._data_path}: {e}")
            return []

        courses = []
        for item in raw:
            try:
                course = self._transform(item)
                errors = self.validate(course)
                if errors:
                    logger.warning(
                        f"CourseraAdapter: validation errors for '{item.get('title', '?')}': {errors}"
                    )
                    continue
                course.change_hash = self.compute_hash(course)
                courses.append(course)
            except Exception as e:
                logger.error(f"CourseraAdapter: transform error for {item}: {e}")
                continue

        logger.info(f"CourseraAdapter: loaded {len(courses)} courses.")
        return courses

    def _transform(self, item: dict) -> CanonicalCourse:
        duration_weeks = item.get("duration_weeks", 8)
        duration_months = max(1, duration_weeks // 4)
        level = item.get("level", "Beginner")
        nsqf = LEVEL_TO_NSQF.get(level, item.get("nsqf_level", 4))
        skills = item.get("skills", [])

        syllabus_text = (
            f"Course: {item.get('title', '')}. "
            f"Partner Institution: {item.get('partner', 'Coursera Partner')}. "
            f"Level: {level}. "
            f"Certificate Type: {item.get('certificate_type', 'Online Certificate')}. "
            f"Skills covered: {', '.join(skills)}."
        )

        return CanonicalCourse(
            title=item["title"],
            provider_type=ProviderType.COURSERA,
            provider_id=item.get("course_id", f"COU-{hash(item['title'])}"),
            source_url=item.get("url", "PLACEHOLDER_URL"),
            institute_type=InstituteType.ONLINE,
            sector=item.get("sector", "General"),
            nsqf_level=nsqf,
            duration_months=duration_months,
            intake_capacity=0,
            qualification_req=item.get("qualification_req", "12th Pass or Working Professional"),
            training_level=f"Coursera {item.get('certificate_type', 'Online Certificate')}",
            syllabus_text=syllabus_text,
            raw_source_data=json.dumps(item),
            district="Statewide Online",
            state="Maharashtra",
            skills_explicitly_listed=skills,
            source_confidence=0.80,
            source_is_placeholder=("url" not in item),
            data_notes=(
                f"Coursera partner: {item.get('partner', 'N/A')}. "
                f"Level: {level}. Certificate: {item.get('certificate_type', 'N/A')}."
            ),
        )
