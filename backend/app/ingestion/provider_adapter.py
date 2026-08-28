"""
SkillX Provider Adapter Base — Prompt 6
Abstract adapter interface that all providers must implement.

Design:
  - Each provider implements ProviderAdapter
  - Adapters produce List[CanonicalCourse]
  - The ingestion layer calls adapter.load() and handles DB persistence
  - Adapters are stateless and testable in isolation

Version: 1.0.0
"""

import hashlib
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from app.ingestion.course_schema import CanonicalCourse, ProviderType


@dataclass
class IngestionReport:
    """Summary of one adapter's ingestion run."""
    provider: ProviderType
    courses_loaded: int = 0
    courses_new: int = 0
    courses_updated: int = 0
    courses_unchanged: int = 0
    courses_failed: int = 0
    errors: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)
    latency_ms: float = 0.0


class ProviderAdapter(ABC):
    """
    Abstract base class for all course data providers.

    Subclasses implement:
    - provider_type: ProviderType
    - load(): Returns List[CanonicalCourse]
    """

    @property
    @abstractmethod
    def provider_type(self) -> ProviderType:
        ...

    @abstractmethod
    def load(self) -> List[CanonicalCourse]:
        """
        Load courses from this provider.
        Must return a list of CanonicalCourse objects.
        Raises ProviderLoadError on unrecoverable failure.
        """
        ...

    def compute_hash(self, course: CanonicalCourse) -> str:
        """
        Compute SHA-256 hash of the raw source data for change detection.
        Uses raw_source_data if present; falls back to key fields.
        """
        content = course.raw_source_data or (
            f"{course.provider_id}|{course.title}|{course.syllabus_text}|"
            f"{course.nsqf_level}|{course.duration_months}"
        )
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    def validate(self, course: CanonicalCourse) -> List[str]:
        """
        Validate a CanonicalCourse record.
        Returns list of validation error messages (empty = valid).
        """
        errors = []
        if not course.title or not course.title.strip():
            errors.append("title is required")
        if not course.syllabus_text or len(course.syllabus_text) < 20:
            errors.append(f"syllabus_text too short for '{course.title}'")
        if course.nsqf_level not in range(1, 9):
            errors.append(f"nsqf_level must be 1–8, got {course.nsqf_level}")
        if course.duration_months <= 0:
            errors.append("duration_months must be positive")
        if course.source_is_placeholder:
            pass  # Allowed — just noted in data_notes
        return errors


class ProviderLoadError(Exception):
    """Raised when a provider cannot load its data."""
    pass
