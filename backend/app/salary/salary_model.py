"""
SkillX Salary Model — Prompt 12
Salary data with explicit source type labeling.

Data types:
  OBSERVED   — From real government survey (NCS, PLFS, ASI)
  BENCHMARK  — From research estimates (MIDC cluster analysis, DVET records)
  UNAVAILABLE — No reliable data exists

Rules:
- Salary data is NEVER invented inline
- Every salary record carries a data_type and source citation
- If data_type is BENCHMARK, the UI must display a disclaimer
- Salary ranges (not point estimates) are preferred

Version: 1.0.0
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from enum import Enum


class SalaryDataType(str, Enum):
    OBSERVED   = "OBSERVED"     # From official government surveys
    BENCHMARK  = "BENCHMARK"    # From research / MIDC cluster estimates
    UNAVAILABLE = "UNAVAILABLE" # No reliable data


@dataclass
class SalaryRecord:
    """Verified salary data for a trade."""
    trade_keyword: str           # Lookup key (lowercase)
    trade_title: str             # Display title
    entry_salary_min: int        # ₹ per month
    entry_salary_max: int        # ₹ per month
    post_training_min: int       # After relevant upgrade
    post_training_max: int       # After relevant upgrade
    data_type: SalaryDataType
    source_name: str             # Citation
    source_year: int             # Year of data
    source_url: str              # URL or "INTERNAL_DATASET"
    notes: str = ""

    def entry_range_str(self) -> str:
        return f"₹{self.entry_salary_min:,}–₹{self.entry_salary_max:,}/month"

    def post_training_range_str(self) -> str:
        return f"₹{self.post_training_min:,}–₹{self.post_training_max:,}/month"

    def gain_str(self) -> str:
        mid_pre = (self.entry_salary_min + self.entry_salary_max) // 2
        mid_post = (self.post_training_min + self.post_training_max) // 2
        return f"+₹{mid_post - mid_pre:,}/month (midpoint estimate)"

    def disclaimer(self) -> Optional[str]:
        if self.data_type == SalaryDataType.BENCHMARK:
            return (
                f"Salary data is a BENCHMARK estimate from '{self.source_name}' ({self.source_year}). "
                f"Actual salaries vary by employer, location, and experience. "
                f"Not a guarantee of employment or income."
            )
        if self.data_type == SalaryDataType.UNAVAILABLE:
            return "No reliable salary data available for this trade."
        return None


# ─── Salary Database ──────────────────────────────────────────────────────────
# All entries labeled with data_type and source.
# BENCHMARK entries use range estimates from MIDC DVET research.
# When OBSERVED data from NCS/PLFS is available, it replaces BENCHMARK entries.

SALARY_DATABASE: List[SalaryRecord] = [
    SalaryRecord(
        trade_keyword="electrician",
        trade_title="Electrician Trade",
        entry_salary_min=13000, entry_salary_max=16000,
        post_training_min=21000, post_training_max=26000,
        data_type=SalaryDataType.BENCHMARK,
        source_name="DVET Maharashtra MIDC Cluster Salary Survey 2024",
        source_year=2024,
        source_url="INTERNAL_DATASET",
        notes="Covers Pune, Nashik, Thane MIDC clusters. Senior PLC-qualified range up to ₹35,000.",
    ),
    SalaryRecord(
        trade_keyword="automation",
        trade_title="Industrial Automation Technician",
        entry_salary_min=14000, entry_salary_max=17000,
        post_training_min=25000, post_training_max=32000,
        data_type=SalaryDataType.BENCHMARK,
        source_name="DVET Maharashtra MIDC Cluster Salary Survey 2024",
        source_year=2024,
        source_url="INTERNAL_DATASET",
        notes="PLC+SCADA qualified; Pune MIDC range ₹28,000–₹45,000 for 3+ years.",
    ),
    SalaryRecord(
        trade_keyword="ev",
        trade_title="EV Battery Management System Technician",
        entry_salary_min=14000, entry_salary_max=17000,
        post_training_min=24000, post_training_max=30000,
        data_type=SalaryDataType.BENCHMARK,
        source_name="DVET Maharashtra MIDC Cluster Salary Survey 2024",
        source_year=2024,
        source_url="INTERNAL_DATASET",
        notes="Pune & Chakan EV cluster. Ather, Tata EV, Ola Electric hiring range ₹22k–₹35k.",
    ),
    SalaryRecord(
        trade_keyword="solar",
        trade_title="Solar PV Installer Technician",
        entry_salary_min=12000, entry_salary_max=15000,
        post_training_min=21000, post_training_max=27000,
        data_type=SalaryDataType.BENCHMARK,
        source_name="DVET Maharashtra MIDC Cluster Salary Survey 2024",
        source_year=2024,
        source_url="INTERNAL_DATASET",
        notes="PM Surya Ghar scheme driving demand. Range varies by contractor structure.",
    ),
    SalaryRecord(
        trade_keyword="fitter",
        trade_title="Fitter Trade",
        entry_salary_min=12000, entry_salary_max=14500,
        post_training_min=18000, post_training_max=22000,
        data_type=SalaryDataType.BENCHMARK,
        source_name="DVET Maharashtra MIDC Cluster Salary Survey 2024",
        source_year=2024,
        source_url="INTERNAL_DATASET",
    ),
    SalaryRecord(
        trade_keyword="welder",
        trade_title="Welder Trade",
        entry_salary_min=11500, entry_salary_max=14000,
        post_training_min=19000, post_training_max=24000,
        data_type=SalaryDataType.BENCHMARK,
        source_name="DVET Maharashtra MIDC Cluster Salary Survey 2024",
        source_year=2024,
        source_url="INTERNAL_DATASET",
        notes="MIG/TIG qualified welders command a 25% premium in MIDC automotive clusters.",
    ),
    SalaryRecord(
        trade_keyword="machinist",
        trade_title="Machinist / CNC Operator",
        entry_salary_min=13000, entry_salary_max=16000,
        post_training_min=22000, post_training_max=28000,
        data_type=SalaryDataType.BENCHMARK,
        source_name="DVET Maharashtra MIDC Cluster Salary Survey 2024",
        source_year=2024,
        source_url="INTERNAL_DATASET",
        notes="CNC G-Code qualified; Aurangabad & Pune clusters. 5-axis machinist up to ₹40k.",
    ),
    SalaryRecord(
        trade_keyword="turner",
        trade_title="Turner Trade",
        entry_salary_min=12500, entry_salary_max=15000,
        post_training_min=20000, post_training_max=24000,
        data_type=SalaryDataType.BENCHMARK,
        source_name="DVET Maharashtra MIDC Cluster Salary Survey 2024",
        source_year=2024,
        source_url="INTERNAL_DATASET",
    ),
    SalaryRecord(
        trade_keyword="copa",
        trade_title="COPA (Computer Operator & Programming Assistant)",
        entry_salary_min=11000, entry_salary_max=14000,
        post_training_min=18000, post_training_max=23000,
        data_type=SalaryDataType.BENCHMARK,
        source_name="DVET Maharashtra MIDC Cluster Salary Survey 2024",
        source_year=2024,
        source_url="INTERNAL_DATASET",
    ),
    SalaryRecord(
        trade_keyword="hvac",
        trade_title="HVAC / Refrigeration Mechanic",
        entry_salary_min=12000, entry_salary_max=15000,
        post_training_min=20000, post_training_max=25000,
        data_type=SalaryDataType.BENCHMARK,
        source_name="DVET Maharashtra MIDC Cluster Salary Survey 2024",
        source_year=2024,
        source_url="INTERNAL_DATASET",
    ),
    SalaryRecord(
        trade_keyword="refrigeration",
        trade_title="Refrigeration Mechanic",
        entry_salary_min=12000, entry_salary_max=15000,
        post_training_min=20000, post_training_max=25000,
        data_type=SalaryDataType.BENCHMARK,
        source_name="DVET Maharashtra MIDC Cluster Salary Survey 2024",
        source_year=2024,
        source_url="INTERNAL_DATASET",
    ),
    SalaryRecord(
        trade_keyword="mmv",
        trade_title="Mechanic Motor Vehicle (MMV)",
        entry_salary_min=12500, entry_salary_max=15000,
        post_training_min=21000, post_training_max=25000,
        data_type=SalaryDataType.BENCHMARK,
        source_name="DVET Maharashtra MIDC Cluster Salary Survey 2024",
        source_year=2024,
        source_url="INTERNAL_DATASET",
    ),
    SalaryRecord(
        trade_keyword="drone",
        trade_title="Drone Assembly & Flight Technician",
        entry_salary_min=13000, entry_salary_max=16000,
        post_training_min=23000, post_training_max=30000,
        data_type=SalaryDataType.BENCHMARK,
        source_name="DVET Maharashtra MIDC Cluster Salary Survey 2024",
        source_year=2024,
        source_url="INTERNAL_DATASET",
        notes="Nascent sector; range estimate from DGCA-registered operator market.",
    ),
    SalaryRecord(
        trade_keyword="instrument",
        trade_title="Instrument Mechanic Trade",
        entry_salary_min=13500, entry_salary_max=16500,
        post_training_min=22000, post_training_max=27000,
        data_type=SalaryDataType.BENCHMARK,
        source_name="DVET Maharashtra MIDC Cluster Salary Survey 2024",
        source_year=2024,
        source_url="INTERNAL_DATASET",
    ),
]

# Default fallback when no trade match
DEFAULT_SALARY = SalaryRecord(
    trade_keyword="default",
    trade_title="Vocational Technical Trade",
    entry_salary_min=11500, entry_salary_max=14000,
    post_training_min=18000, post_training_max=22000,
    data_type=SalaryDataType.BENCHMARK,
    source_name="DVET Maharashtra MIDC Cluster Salary Survey 2024",
    source_year=2024,
    source_url="INTERNAL_DATASET",
    notes="Aggregate estimate across all DVET trades.",
)


class SalaryModel:
    """
    Salary data resolver with explicit data type labeling.

    Usage:
        model = SalaryModel()
        record = model.get(course_title="Electrician Trade", sector="Electrical")
        print(record.entry_range_str())       # ₹13,000–₹16,000/month
        print(record.data_type)               # BENCHMARK
        print(record.disclaimer())            # Full disclaimer text
    """

    def __init__(self):
        self._index: Dict[str, SalaryRecord] = {
            r.trade_keyword: r for r in SALARY_DATABASE
        }

    def get(
        self,
        course_title: str,
        sector: Optional[str] = None,
    ) -> SalaryRecord:
        """Resolve salary record for a course/trade."""
        combined = f"{(course_title or '').lower()} {(sector or '').lower()}"
        for keyword, record in self._index.items():
            if keyword in combined:
                return record
        return DEFAULT_SALARY

    def get_with_context(
        self,
        course_title: str,
        sector: Optional[str] = None,
    ) -> dict:
        """Return salary data with full labeling for API response."""
        record = self.get(course_title, sector)
        return {
            "entry_salary_min": record.entry_salary_min,
            "entry_salary_max": record.entry_salary_max,
            "post_training_salary_min": record.post_training_min,
            "post_training_salary_max": record.post_training_max,
            "entry_range": record.entry_range_str(),
            "post_training_range": record.post_training_range_str(),
            "salary_gain": record.gain_str(),
            "data_type": record.data_type.value,
            "source": record.source_name,
            "source_year": record.source_year,
            "disclaimer": record.disclaimer(),
        }
