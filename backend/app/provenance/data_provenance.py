"""
SkillX Data Provenance — Prompt 13
SHA-256 change detection, lineage tracking, and dataset version registry.

Responsibilities:
1. Compute SHA-256 hash of raw source data (not transformed data)
2. Track data lineage: source → transform → DB
3. Version datasets with a registry entry per ingestion run
4. Flag data quality issues (PLACEHOLDER_URL, low confidence, etc.)

Version: 1.0.0
"""

import hashlib
import time
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional
from enum import Enum

logger = logging.getLogger("DataProvenance")

PROVENANCE_VERSION = "1.0.0"


class DataSource(str, Enum):
    DVET_WEBSITE    = "DVET_WEBSITE"
    MSSDS_CATALOGUE = "MSSDS_CATALOGUE"
    NCS_PORTAL      = "NCS_PORTAL"
    NPTEL_JSON      = "NPTEL_JSON"
    COURSERA_JSON   = "COURSERA_JSON"
    SYNTHETIC       = "SYNTHETIC"      # Engine-generated data (current state)
    MANUAL_CURATED  = "MANUAL_CURATED"
    UNKNOWN         = "UNKNOWN"


class DataQualityFlag(str, Enum):
    CLEAN           = "CLEAN"
    PLACEHOLDER_URL = "PLACEHOLDER_URL"   # source_url is not a real URL
    LOW_CONFIDENCE  = "LOW_CONFIDENCE"    # confidence < 0.70
    SYNTHETIC_DATA  = "SYNTHETIC_DATA"    # Generated, not scraped
    MISSING_SOURCE  = "MISSING_SOURCE"    # No source URL at all
    STALE           = "STALE"             # Older than 90 days


@dataclass
class ProvenanceRecord:
    """
    Immutable provenance record for a single data item.
    """
    item_id: str                    # e.g., "course_42" or "job_117"
    item_type: str                  # "COURSE" | "JOB" | "SKILL"
    sha256_raw: str                 # Hash of raw_source_data
    sha256_transformed: str         # Hash of transformed content
    source: DataSource
    source_url: str
    ingestion_timestamp: str        # ISO 8601
    schema_version: str             # DB schema version
    data_quality_flags: List[DataQualityFlag] = field(default_factory=list)
    source_confidence: float = 0.90
    notes: str = ""
    provenance_version: str = PROVENANCE_VERSION

    def is_clean(self) -> bool:
        return (
            DataQualityFlag.CLEAN in self.data_quality_flags
            or not self.data_quality_flags
        )

    def quality_label(self) -> str:
        if not self.data_quality_flags:
            return "CLEAN"
        if DataQualityFlag.SYNTHETIC_DATA in self.data_quality_flags:
            return "SYNTHETIC"
        if DataQualityFlag.PLACEHOLDER_URL in self.data_quality_flags:
            return "PLACEHOLDER"
        if DataQualityFlag.LOW_CONFIDENCE in self.data_quality_flags:
            return "LOW_CONFIDENCE"
        return "FLAGGED"


@dataclass
class DatasetVersion:
    """
    Registry entry for one ingestion run.
    Enables reproducibility: same version_id → same dataset state.
    """
    version_id: str                 # e.g., "2026-08-28-001"
    dataset_name: str               # e.g., "DVET_ITI_COURSES_v1"
    description: str
    source: DataSource
    n_records: int
    n_clean: int
    n_flagged: int
    created_at: str
    scoring_model_version: str
    notes: str = ""


class SHA256Hasher:
    """
    Deterministic SHA-256 hasher for change detection.

    Contract:
    - Always hash the RAW source data, not the transformed version.
    - If raw_source_data is empty/unavailable, hash the canonical fields.
    - The hash is ALWAYS of bytes, never of already-transformed JSON.
    """

    @staticmethod
    def hash_raw(raw_source_data: str) -> str:
        """Hash raw source data (preferred — highest fidelity)."""
        if not raw_source_data:
            return SHA256Hasher.hash_string("__EMPTY__")
        return hashlib.sha256(raw_source_data.encode("utf-8")).hexdigest()

    @staticmethod
    def hash_string(content: str) -> str:
        """Hash any string."""
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    @staticmethod
    def hash_canonical_course(
        title: str, syllabus_text: str, nsqf_level: int, duration_months: int,
        provider_id: str,
    ) -> str:
        """
        Fallback hash when raw source data is unavailable.
        Uses all stable fields that would change if the course changes.
        """
        content = (
            f"COURSE|{provider_id}|{title}|{syllabus_text[:500]}|"
            f"{nsqf_level}|{duration_months}"
        )
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    @staticmethod
    def hash_canonical_job(
        job_id_external: str, title: str, job_description: str, company: str
    ) -> str:
        """Fallback hash for job postings."""
        content = (
            f"JOB|{job_id_external}|{title}|{company}|{job_description[:500]}"
        )
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    @staticmethod
    def has_changed(old_hash: str, new_hash: str) -> bool:
        """True if the content has changed since last ingestion."""
        return old_hash != new_hash


class QualityAuditor:
    """
    Assigns data quality flags to provenance records.
    """

    PLACEHOLDER_INDICATORS = [
        "PLACEHOLDER_URL",
        "admission.dvet.gov.in/courses/mh-cat-",  # Known synthetic URLs
        "ncs.gov.in/joblist?jid=9",               # Known synthetic URLs
    ]

    @staticmethod
    def audit_course(
        source_url: str,
        raw_source_data: str,
        source_confidence: float,
    ) -> List[DataQualityFlag]:
        flags = []

        # Check for placeholder URL
        if not source_url or source_url == "PLACEHOLDER_URL":
            flags.append(DataQualityFlag.PLACEHOLDER_URL)
        elif any(ind in source_url for ind in QualityAuditor.PLACEHOLDER_INDICATORS):
            flags.append(DataQualityFlag.PLACEHOLDER_URL)
            flags.append(DataQualityFlag.SYNTHETIC_DATA)

        # Check for missing raw source data (engine-generated content)
        if not raw_source_data:
            flags.append(DataQualityFlag.SYNTHETIC_DATA)

        # Check for low confidence
        if source_confidence < 0.70:
            flags.append(DataQualityFlag.LOW_CONFIDENCE)

        if not flags:
            flags.append(DataQualityFlag.CLEAN)

        return flags

    @staticmethod
    def audit_job(
        source_url: str,
        raw_source_data: str,
        source_confidence: float = 0.90,
    ) -> List[DataQualityFlag]:
        return QualityAuditor.audit_course(source_url, raw_source_data, source_confidence)


class DatasetRegistry:
    """
    In-memory dataset version registry.
    Records each ingestion run for reproducibility.
    """

    def __init__(self):
        self._registry: List[DatasetVersion] = []

    def register(
        self,
        dataset_name: str,
        description: str,
        source: DataSource,
        n_records: int,
        n_clean: int,
        n_flagged: int,
        scoring_model_version: str = "1.0.0",
        notes: str = "",
    ) -> DatasetVersion:
        version_id = datetime.utcnow().strftime("%Y-%m-%d-%H%M%S")
        record = DatasetVersion(
            version_id=version_id,
            dataset_name=dataset_name,
            description=description,
            source=source,
            n_records=n_records,
            n_clean=n_clean,
            n_flagged=n_flagged,
            created_at=datetime.utcnow().isoformat(),
            scoring_model_version=scoring_model_version,
            notes=notes,
        )
        self._registry.append(record)
        logger.info(
            f"DatasetRegistry: registered '{dataset_name}' v{version_id} "
            f"({n_records} records, {n_clean} clean, {n_flagged} flagged)."
        )
        return record

    def history(self, dataset_name: Optional[str] = None) -> List[DatasetVersion]:
        if dataset_name:
            return [r for r in self._registry if r.dataset_name == dataset_name]
        return list(self._registry)

    def latest(self, dataset_name: str) -> Optional[DatasetVersion]:
        matches = [r for r in self._registry if r.dataset_name == dataset_name]
        return matches[-1] if matches else None


# Module-level singletons
_registry: Optional[DatasetRegistry] = None


def get_registry() -> DatasetRegistry:
    global _registry
    if _registry is None:
        _registry = DatasetRegistry()
    return _registry
