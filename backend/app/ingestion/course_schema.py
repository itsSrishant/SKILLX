"""
SkillX Canonical Course Schema — Prompt 5
Provider-agnostic course representation.

Every provider adapter produces a CanonicalCourse.
The ingestion layer writes CanonicalCourses to the DB.
"""

from dataclasses import dataclass, field
from typing import List, Optional
from enum import Enum


class ProviderType(str, Enum):
    ITI = "ITI"
    MSSDS = "MSSDS"
    NPTEL = "NPTEL"
    COURSERA = "COURSERA"
    PMKVY = "PMKVY"
    UNKNOWN = "UNKNOWN"


class InstituteType(str, Enum):
    ITI = "ITI"
    MSSDS = "MSSDS"
    ONLINE = "ONLINE"
    HYBRID = "HYBRID"


@dataclass
class CanonicalCourse:
    """
    Provider-agnostic canonical course record.

    This is the internal representation that ALL provider adapters must
    produce. The ingestion layer maps this to the Course DB model.
    """
    title: str
    provider_type: ProviderType
    provider_id: str                # Original ID from source provider
    source_url: str                 # Authoritative URL (PLACEHOLDER if unavailable)
    institute_type: InstituteType

    # Classification
    sector: str
    nsqf_level: int                 # 1–8
    duration_months: int
    intake_capacity: int

    # Requirements
    qualification_req: str          # "10th Pass", "12th Pass", etc.
    training_level: str

    # Content
    syllabus_text: str              # Full text for skill extraction
    raw_source_data: str = ""       # Raw HTML/JSON for audit trail

    # Geography
    district: str = "Unspecified"
    state: str = "Maharashtra"

    # Optional enrichment
    course_master_code: Optional[str] = None
    skills_explicitly_listed: List[str] = field(default_factory=list)

    # Data quality
    source_confidence: float = 0.90  # 0.0–1.0
    source_is_placeholder: bool = False   # True if source URL is not real
    data_notes: str = ""

    # Computed on ingestion
    change_hash: Optional[str] = None
