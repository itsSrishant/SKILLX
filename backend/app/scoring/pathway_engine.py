"""
SkillX Career Pathway Engine — Prompt 9
Deterministic career pathway planner.

Given a target role or target skills, builds a structured learning pathway:
  Stage 1: Foundation skills (difficulty 1–2)
  Stage 2: Core trade skills (difficulty 3)
  Stage 3: Advanced/Emerging skills (difficulty 4–5)

For each stage, recommends:
- Which courses to take (from DB)
- Which bridge packs to acquire
- Expected salary milestone
- Time to completion estimate

Zero-API, deterministic.
Version: 1.0.0
"""

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.db.models import Course, SkillGapAnalysis
from app.ontology.skill_graph import get_skill_graph
from app.ontology.skill_normalizer import get_normalizer
from app.ontology.skill_ontology import SkillOntology

logger = logging.getLogger("PathwayEngine")

PATHWAY_ENGINE_VERSION = "1.0.0"


@dataclass
class PathwayStage:
    """One stage in a learning pathway."""
    stage_number: int
    stage_name: str                  # "FOUNDATION", "INTERMEDIATE", "ADVANCED"
    skills_to_acquire: List[str]     # Canonical skill names
    skill_ids: List[str]             # Canonical skill IDs
    recommended_courses: List[dict]  # Course stubs from DB
    bridge_packs_needed: List[str]   # Missing skills that need bridge packs
    estimated_months: int
    expected_salary_milestone: str
    salary_data_type: str


@dataclass
class CareerPathway:
    """Complete career pathway from current state to target role."""
    target_role: str
    current_skills: List[str]        # Skills the student already has
    target_skills: List[str]         # Skills needed for the role
    gap_skills: List[str]            # Skills that need to be acquired
    stages: List[PathwayStage]
    total_estimated_months: int
    total_bridge_hours_needed: int
    pathway_summary: str
    engine_version: str = PATHWAY_ENGINE_VERSION


# ── Target role → required skills mapping ─────────────────────────────────────
# Deterministic, curated. Not AI-generated.
ROLE_SKILL_MAP: Dict[str, List[str]] = {
    "EV Technician": [
        "ev_hv_safety", "ev_bms", "ev_bldc_motor", "ev_can_diagnostics",
        "safety_electrical", "tools_vernier_micro",
    ],
    "Industrial Automation Engineer": [
        "auto_plc", "auto_scada", "auto_industrial_robotics", "auto_iot_modbus",
        "auto_hmi", "elec_3phase_motor",
    ],
    "CNC Machinist": [
        "cnc_fundamentals", "cnc_lathe_turning", "cnc_milling_gear", "cnc_gcode",
        "tools_vernier_micro", "tools_engineering_drawing",
    ],
    "Solar PV Installer": [
        "solar_pv_install", "elec_house_wiring", "safety_electrical",
        "tools_vernier_micro",
    ],
    "Welder (MIG/TIG)": [
        "weld_fundamentals", "weld_mig", "weld_tig", "safety_weld_ndt",
        "safety_ppe_workshop",
    ],
    "Electrician (Industrial)": [
        "elec_3phase_motor", "auto_plc", "elec_substation",
        "safety_electrical", "elec_power_factor",
    ],
    "Drone Technician": [
        "emerging_drone", "ev_bldc_motor", "safety_ppe_workshop",
    ],
    "Process Instrumentation Technician": [
        "instr_transmitter_calibration", "instr_pid_control",
        "auto_iot_modbus", "safety_ppe_workshop",
    ],
    "Software Developer (Entry)": [
        "it_python", "it_sql", "it_web_dev", "it_linux",
    ],
}


class PathwayEngine:
    """
    Career pathway planner.

    Usage:
        engine = PathwayEngine(db)
        pathway = engine.plan(
            target_role="EV Technician",
            district="Pune",
            current_skill_surfaces=["Electrical Safety", "Motor Winding"],
        )
    """

    def __init__(self, db: Session):
        self._db = db
        self._graph = get_skill_graph()
        self._ontology = SkillOntology.get()
        self._normalizer = get_normalizer()

    def available_roles(self) -> List[str]:
        return list(ROLE_SKILL_MAP.keys())

    def plan(
        self,
        target_role: str,
        district: str,
        current_skill_surfaces: Optional[List[str]] = None,
    ) -> CareerPathway:
        """Plan a career pathway to the target role."""
        target_ids = ROLE_SKILL_MAP.get(target_role, [])
        if not target_ids:
            logger.warning(f"PathwayEngine: unknown role '{target_role}'")
            target_ids = []

        # Normalize current skills
        current_ids = set()
        if current_skill_surfaces:
            for sf in current_skill_surfaces:
                sid = self._normalizer.normalize_to_id(sf)
                if sid:
                    current_ids.add(sid)

        # Gap = target skills not already known
        gap_ids = [sid for sid in target_ids if sid not in current_ids]

        # Include prerequisites of gap skills
        all_needed = set(gap_ids)
        for gid in gap_ids:
            for prereq in self._graph.get_all_prerequisites(gid):
                if prereq not in current_ids:
                    all_needed.add(prereq)

        # Topological sort
        topo = self._graph.topological_sort(list(all_needed))

        # Group into stages
        stage_groups = self._graph.group_into_stages(topo.order)

        # Build stages
        stages = []
        total_months = 0
        total_bridge_hours = 0

        stage_configs = [
            (1, "FOUNDATION", "FOUNDATION", 2, "₹12,000–₹16,000/month"),
            (2, "INTERMEDIATE", "INTERMEDIATE", 4, "₹16,000–₹22,000/month"),
            (3, "ADVANCED", "ADVANCED", 6, "₹22,000–₹30,000/month"),
        ]

        for stage_num, stage_name, group_key, months, salary_milestone in stage_configs:
            skill_ids_in_stage = stage_groups.get(group_key, [])
            if not skill_ids_in_stage:
                continue

            skill_names = [
                self._ontology.get_by_id(sid).canonical_name
                if self._ontology.get_by_id(sid) else sid
                for sid in skill_ids_in_stage
            ]

            # Find courses in district that cover these skills
            recommended_courses = self._find_courses_for_skills(
                skill_ids_in_stage, district, limit=3
            )

            # Missing skills (not covered by found courses)
            covered_by_courses = set()
            for c_dict in recommended_courses:
                covered_by_courses.update(c_dict.get("covered_skill_ids", []))
            bridge_needed = [
                self._ontology.get_by_id(sid).canonical_name if self._ontology.get_by_id(sid) else sid
                for sid in skill_ids_in_stage if sid not in covered_by_courses
            ]
            total_bridge_hours += len(bridge_needed) * 20

            stages.append(PathwayStage(
                stage_number=stage_num,
                stage_name=stage_name,
                skills_to_acquire=skill_names,
                skill_ids=skill_ids_in_stage,
                recommended_courses=recommended_courses,
                bridge_packs_needed=bridge_needed,
                estimated_months=months,
                expected_salary_milestone=salary_milestone,
                salary_data_type="BENCHMARK",
            ))
            total_months += months

        # Build summary
        target_names = [
            self._ontology.get_by_id(sid).canonical_name if self._ontology.get_by_id(sid) else sid
            for sid in target_ids
        ]
        gap_names = [
            self._ontology.get_by_id(sid).canonical_name if self._ontology.get_by_id(sid) else sid
            for sid in gap_ids
        ]

        summary = (
            f"To become a {target_role} in {district}, you need to acquire "
            f"{len(gap_ids)} skill(s) across {len(stages)} learning stage(s). "
            f"Estimated total: {total_months} months of training"
            + (f" + {total_bridge_hours} hours of bridge modules." if total_bridge_hours > 0 else ".")
        )

        return CareerPathway(
            target_role=target_role,
            current_skills=[
                self._ontology.get_by_id(sid).canonical_name if self._ontology.get_by_id(sid) else sid
                for sid in current_ids
            ],
            target_skills=target_names,
            gap_skills=gap_names,
            stages=stages,
            total_estimated_months=total_months,
            total_bridge_hours_needed=total_bridge_hours,
            pathway_summary=summary,
        )

    def _find_courses_for_skills(
        self, skill_ids: List[str], district: str, limit: int = 3
    ) -> List[dict]:
        """Find courses in a district that cover at least some of the given skills."""
        # Fetch courses in district with their gap analysis
        courses = self._db.query(Course).filter(
            Course.status == "ACTIVE",
            Course.district == district,
        ).all()

        scored = []
        for course in courses:
            gap = self._db.query(SkillGapAnalysis).filter(
                SkillGapAnalysis.course_id == course.id
            ).first()
            if not gap:
                continue

            # Count how many target skills are fully covered
            covered = set(gap.fully_covered_skills or [])
            covered_ids = set()
            for sf in covered:
                sid = self._normalizer.normalize_to_id(sf)
                if sid:
                    covered_ids.add(sid)

            hit_count = len([sid for sid in skill_ids if sid in covered_ids])
            if hit_count > 0:
                scored.append((hit_count, course, covered_ids))

        scored.sort(key=lambda x: x[0], reverse=True)

        result = []
        for hit_count, course, covered_ids in scored[:limit]:
            result.append({
                "course_id": course.id,
                "course_title": course.title,
                "institute_type": course.institute_type,
                "district": course.district,
                "nsqf_level": course.nsqf_level,
                "duration_months": course.duration_months,
                "alignment_score": None,
                "skills_covered": hit_count,
                "covered_skill_ids": list(covered_ids),
            })

        return result
