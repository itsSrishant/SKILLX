"""
SkillX Skill Ontology — Prompt 2
Canonical, versioned skill knowledge layer. Zero-API, deterministic.

Design principles:
- Every skill has a unique skill_id
- Multiple surface forms map to ONE canonical skill_id
- Relationships are explicitly typed: ALIAS, PARENT_OF, CHILD_OF,
  PREREQUISITE_OF, RELATED_TO, PARTIAL_OVERLAP, NOT_EQUIVALENT
- Fuzzy similarity alone NEVER creates an equivalence
- The ontology is the single source of truth for ALL engines
- Backward compatible: original INITIAL_SKILL_DICTIONARY entries are migrated here

Ontology version: 1.0.0
"""

from dataclasses import dataclass, field
from typing import Dict, List, Set, Optional, Tuple
from enum import Enum
import logging

logger = logging.getLogger("SkillOntology")

ONTOLOGY_VERSION = "1.0.0"


# ─── Relationship Types ────────────────────────────────────────────────────────

class SkillRelationship(str, Enum):
    """Explicit, typed relationship between two skills.

    EXACT_EQUIVALENT: The two names denote the same skill with 100% overlap.
    ALIAS: One term is a shorter/alternate name but fully equivalent.
    PARENT_OF: Source skill is broader; target is a specialisation.
    CHILD_OF: Source skill is a specialisation of the target.
    PREREQUISITE_OF: Source skill should be learned before target.
    RELATED_TO: Semantically close but neither subsumes nor requires the other.
    PARTIAL_OVERLAP: Some content overlap but NOT equivalent.
    NOT_EQUIVALENT: Superficially similar names but different skills.
    """
    EXACT_EQUIVALENT = "EXACT_EQUIVALENT"
    ALIAS = "ALIAS"
    PARENT_OF = "PARENT_OF"
    CHILD_OF = "CHILD_OF"
    PREREQUISITE_OF = "PREREQUISITE_OF"
    RELATED_TO = "RELATED_TO"
    PARTIAL_OVERLAP = "PARTIAL_OVERLAP"
    NOT_EQUIVALENT = "NOT_EQUIVALENT"


# Score contribution by relationship type (configurable)
# These determine how much a relationship contributes to coverage credit
# in the scoring engine. Values are 0.0–1.0.
RELATIONSHIP_COVERAGE_CREDIT: Dict[SkillRelationship, float] = {
    SkillRelationship.EXACT_EQUIVALENT: 1.00,
    SkillRelationship.ALIAS:            1.00,
    SkillRelationship.CHILD_OF:         0.70,   # child provides most of parent's value
    SkillRelationship.PARENT_OF:        0.45,   # parent provides partial credit for child
    SkillRelationship.PREREQUISITE_OF:  0.30,   # having a prereq shows readiness
    SkillRelationship.RELATED_TO:       0.20,
    SkillRelationship.PARTIAL_OVERLAP:  0.15,
    SkillRelationship.NOT_EQUIVALENT:   0.00,
}


# ─── Canonical Skill Record ────────────────────────────────────────────────────

@dataclass
class CanonicalSkill:
    """
    One canonical record per unique skill.

    Fields:
        skill_id: Unique string identifier (snake_case, stable across versions)
        canonical_name: Display name used in UI and reports
        aliases: Fully equivalent names (map to this skill at 100% credit)
        abbreviations: Official abbreviations (e.g., SMAW, PLC, BMS)
        category: Broad classification (Technical Skills, Emerging Skills, etc.)
        subcategory: Narrower classification within category
        sector: Industry sector(s) where this skill is used
        parent_skill_id: ID of broader skill (None for top-level)
        child_skill_ids: IDs of more specialised skills
        related_skill_ids: IDs of semantically related but not equivalent skills
        prerequisite_skill_ids: IDs of skills that should be learned first
        difficulty: 1 (entry) to 5 (expert)
        importance: CRITICAL | HIGH | MEDIUM | LOW
        skill_type: TECHNICAL | DIGITAL | SAFETY | SOFT | EMERGING | TOOLS
        transferable: True if skill transfers across sectors
        source: Where this skill definition came from
        source_confidence: 0.0–1.0 reliability of source data
        ontology_version: Version tag for reproducibility
    """
    skill_id: str
    canonical_name: str
    aliases: List[str] = field(default_factory=list)
    abbreviations: List[str] = field(default_factory=list)
    category: str = "Technical Skills"
    subcategory: str = ""
    sector: List[str] = field(default_factory=list)
    parent_skill_id: Optional[str] = None
    child_skill_ids: List[str] = field(default_factory=list)
    related_skill_ids: List[str] = field(default_factory=list)
    prerequisite_skill_ids: List[str] = field(default_factory=list)
    difficulty: int = 3          # 1–5
    importance: str = "MEDIUM"   # CRITICAL | HIGH | MEDIUM | LOW
    skill_type: str = "TECHNICAL"
    transferable: bool = True
    source: str = "SkillX Ontology v1"
    source_confidence: float = 0.90
    ontology_version: str = ONTOLOGY_VERSION

    def importance_weight(self) -> float:
        """Convert importance label to numeric weight for scoring."""
        return {
            "CRITICAL": 1.00,
            "HIGH":     0.80,
            "MEDIUM":   0.50,
            "LOW":      0.25,
        }.get(self.importance, 0.50)


# ─── Curated Relationship Record ──────────────────────────────────────────────

@dataclass
class SkillRelationshipRecord:
    """A manually curated relationship between two canonical skills."""
    source_skill_id: str
    target_skill_id: str
    relationship: SkillRelationship
    confidence: float = 1.00          # How certain is this relationship
    notes: str = ""
    ontology_version: str = ONTOLOGY_VERSION


# ─── Master Ontology Data ─────────────────────────────────────────────────────
# All 54 skills from INITIAL_SKILL_DICTIONARY migrated here with full metadata.
# Plus new skills identified from the corpus. Backward compatible — original
# canonical_names are preserved.

MASTER_SKILL_ONTOLOGY: List[CanonicalSkill] = [

    # ── Electrical ──────────────────────────────────────────────────────────────
    CanonicalSkill(
        skill_id="elec_3phase_motor",
        canonical_name="3-Phase Motor Control",
        aliases=["3 phase motor", "three phase motor", "induction motor wiring",
                 "motor control panel", "star delta starter", "dol starter",
                 "motor control center", "3-phase motors", "3-phase motor control"],
        abbreviations=["DOL", "MCC"],
        category="Technical Skills",
        subcategory="Electrical Motors",
        sector=["Electrical & Energy", "Manufacturing"],
        parent_skill_id="elec_motors",
        difficulty=3, importance="HIGH", skill_type="TECHNICAL",
        source_confidence=0.95,
    ),
    CanonicalSkill(
        skill_id="elec_motors",
        canonical_name="Electric Motor Fundamentals",
        aliases=["electric motors", "motor technology", "induction motors"],
        category="Technical Skills",
        subcategory="Electrical Motors",
        sector=["Electrical & Energy", "Manufacturing"],
        child_skill_ids=["elec_3phase_motor", "elec_armature_winding", "ev_bldc_motor"],
        difficulty=2, importance="HIGH", skill_type="TECHNICAL",
    ),
    CanonicalSkill(
        skill_id="elec_armature_winding",
        canonical_name="Armature Motor Winding",
        aliases=["armature winding", "motor rewinding", "coil winding",
                 "stator winding", "insulation testing", "winding resistance test"],
        category="Technical Skills",
        subcategory="Electrical Motors",
        sector=["Electrical & Energy"],
        parent_skill_id="elec_motors",
        difficulty=4, importance="MEDIUM", skill_type="TECHNICAL",
    ),
    CanonicalSkill(
        skill_id="elec_substation",
        canonical_name="Substation Transformer Maintenance",
        aliases=["transformer maintenance", "substation equipment", "switchgear",
                 "oil testing", "circuit breaker maintenance", "circuit breaker testing",
                 "power transformer", "substation maintenance"],
        category="Technical Skills",
        subcategory="Power Systems",
        sector=["Electrical & Energy"],
        difficulty=4, importance="HIGH", skill_type="TECHNICAL",
    ),
    CanonicalSkill(
        skill_id="safety_electrical",
        canonical_name="Electrical & High Voltage Safety",
        aliases=["electrical safety", "high voltage safety", "lockout tagout",
                 "loto", "arc flash safety", "earthing protection",
                 "loto safety protocol", "loto protocol", "loto procedure"],
        abbreviations=["LOTO", "HV"],
        category="Safety Skills",
        subcategory="Electrical Safety",
        sector=["Electrical & Energy", "Manufacturing", "Automotive"],
        difficulty=2, importance="CRITICAL", skill_type="SAFETY",
        source_confidence=0.99,
    ),
    CanonicalSkill(
        skill_id="elec_power_factor",
        canonical_name="Power Factor Improvement",
        aliases=["power factor", "power factor correction", "capacitor bank",
                 "reactive power", "unity power factor"],
        category="Technical Skills",
        subcategory="Power Systems",
        sector=["Electrical & Energy"],
        difficulty=3, importance="MEDIUM", skill_type="TECHNICAL",
    ),
    CanonicalSkill(
        skill_id="elec_house_wiring",
        canonical_name="House Wiring & LT Network",
        aliases=["house wiring", "domestic wiring", "lt network",
                 "internal wiring", "conduit wiring", "rural electrification wiring"],
        category="Technical Skills",
        subcategory="Wiring & Installation",
        sector=["Electrical & Energy"],
        difficulty=2, importance="MEDIUM", skill_type="TECHNICAL",
    ),

    # ── Precision Measurement ───────────────────────────────────────────────────
    CanonicalSkill(
        skill_id="tools_vernier_micro",
        canonical_name="Precision Vernier Caliper & Micrometer",
        aliases=["vernier caliper", "micrometer gauge", "precision measurement",
                 "dial indicator", "height gauge", "bore gauge",
                 "precision measuring instrument calibration"],
        category="Tools & Equipment",
        subcategory="Precision Measurement",
        sector=["Capital Goods & Manufacturing"],
        difficulty=2, importance="HIGH", skill_type="TOOLS",
        source_confidence=0.97,
    ),
    CanonicalSkill(
        skill_id="tools_hydraulic_pneumatic",
        canonical_name="Hydraulic & Pneumatic Valves",
        aliases=["hydraulic valves", "pneumatic circuits", "solenoid valves",
                 "fluid power", "hydraulic actuators", "pneumatic cylinder",
                 "hydraulic circuit", "pneumatic actuators", "hydraulic cylinder reconditioning"],
        category="Tools & Equipment",
        subcategory="Fluid Power",
        sector=["Capital Goods & Manufacturing", "Automation"],
        difficulty=3, importance="HIGH", skill_type="TECHNICAL",
    ),
    CanonicalSkill(
        skill_id="tools_engineering_drawing",
        canonical_name="Engineering Drawing & Blueprint Reading",
        aliases=["engineering drawing", "blueprint reading", "orthographic projection",
                 "isometric drawing", "gd&t", "gd t", "drawing reading",
                 "gd&t basics", "engineering drawing reading"],
        abbreviations=["GD&T"],
        category="Technical Skills",
        subcategory="Technical Drawing",
        sector=["Capital Goods & Manufacturing"],
        difficulty=2, importance="MEDIUM", skill_type="TECHNICAL",
    ),

    # ── Welding & Fabrication ───────────────────────────────────────────────────
    CanonicalSkill(
        skill_id="weld_mig",
        canonical_name="MIG Welding (GMAW)",
        aliases=["mig welding", "gmaw", "gas metal arc welding", "mig welder",
                 "co2 welding", "gas metal arc welding gmaw mig"],
        abbreviations=["MIG", "GMAW"],
        category="Technical Skills",
        subcategory="Welding",
        sector=["Manufacturing & Fabrication"],
        parent_skill_id="weld_fundamentals",
        difficulty=3, importance="HIGH", skill_type="TECHNICAL",
    ),
    CanonicalSkill(
        skill_id="weld_tig",
        canonical_name="TIG Welding (GTAW)",
        aliases=["tig welding", "gtaw", "gas tungsten arc welding", "argon welding",
                 "tig welder", "gas tungsten arc welding gtaw tig"],
        abbreviations=["TIG", "GTAW"],
        category="Technical Skills",
        subcategory="Welding",
        sector=["Manufacturing & Fabrication"],
        parent_skill_id="weld_fundamentals",
        difficulty=4, importance="HIGH", skill_type="TECHNICAL",
    ),
    CanonicalSkill(
        skill_id="weld_smaw",
        canonical_name="Shielded Metal Arc Welding (SMAW)",
        aliases=["smaw", "arc welding", "stick welding", "manual metal arc welding",
                 "mmaw", "shielded metal arc welding smaw"],
        abbreviations=["SMAW", "MMAW"],
        category="Technical Skills",
        subcategory="Welding",
        sector=["Manufacturing & Fabrication"],
        parent_skill_id="weld_fundamentals",
        difficulty=2, importance="HIGH", skill_type="TECHNICAL",
    ),
    CanonicalSkill(
        skill_id="weld_fundamentals",
        canonical_name="Welding Fundamentals",
        aliases=["welding basics", "basic welding", "welding principles"],
        category="Technical Skills",
        subcategory="Welding",
        sector=["Manufacturing & Fabrication"],
        child_skill_ids=["weld_mig", "weld_tig", "weld_smaw", "weld_robotic"],
        difficulty=1, importance="HIGH", skill_type="TECHNICAL",
    ),
    CanonicalSkill(
        skill_id="weld_robotic",
        canonical_name="Robotic Welding Operations",
        aliases=["robotic welding", "robot welder", "automated welding",
                 "welding robot", "robotic arc welding"],
        category="Emerging Skills",
        subcategory="Welding",
        sector=["Manufacturing & Fabrication", "Automation"],
        parent_skill_id="weld_fundamentals",
        prerequisite_skill_ids=["weld_mig", "auto_industrial_robotics"],
        difficulty=4, importance="HIGH", skill_type="EMERGING",
    ),
    CanonicalSkill(
        skill_id="safety_weld_ndt",
        canonical_name="Weld Defect Inspection & NDT",
        aliases=["weld defect inspection", "ndt testing", "ndt",
                 "non destructive testing", "radiography testing",
                 "ultrasonic testing", "dye penetrant testing"],
        abbreviations=["NDT"],
        category="Safety Skills",
        subcategory="Quality Inspection",
        sector=["Manufacturing & Fabrication"],
        difficulty=3, importance="HIGH", skill_type="SAFETY",
    ),
    CanonicalSkill(
        skill_id="weld_distortion_control",
        canonical_name="Distortion Control in Welding",
        aliases=["distortion control", "weld distortion", "welding distortion",
                 "thermal distortion management"],
        category="Technical Skills",
        subcategory="Welding",
        sector=["Manufacturing & Fabrication"],
        parent_skill_id="weld_fundamentals",
        difficulty=3, importance="MEDIUM", skill_type="TECHNICAL",
    ),

    # ── CNC & Machining ─────────────────────────────────────────────────────────
    CanonicalSkill(
        skill_id="cnc_lathe_turning",
        canonical_name="CNC Lathe & Turning Operation",
        aliases=["cnc lathe", "cnc turning", "lathe machine", "turning center",
                 "facing and grooving", "taper turning", "eccentric turning",
                 "thread cutting", "centre lathe operation", "center lathe",
                 "boring operation"],
        category="Technical Skills",
        subcategory="CNC Machining",
        sector=["Capital Goods & Manufacturing"],
        parent_skill_id="cnc_fundamentals",
        prerequisite_skill_ids=["cnc_fundamentals"],
        related_skill_ids=["cnc_gcode"],
        difficulty=3, importance="HIGH", skill_type="TECHNICAL",
    ),
    CanonicalSkill(
        skill_id="cnc_milling_gear",
        canonical_name="Milling & Gear Cutting Operation",
        aliases=["milling machine", "gear cutting", "spur gears",
                 "surface grinding", "milling operation"],
        category="Technical Skills",
        subcategory="CNC Machining",
        sector=["Capital Goods & Manufacturing"],
        parent_skill_id="cnc_fundamentals",
        prerequisite_skill_ids=["cnc_fundamentals"],
        difficulty=4, importance="HIGH", skill_type="TECHNICAL",
    ),
    CanonicalSkill(
        skill_id="cnc_fundamentals",
        canonical_name="CNC Machine Fundamentals",
        aliases=["cnc basics", "cnc operation", "cnc machine operation",
                 "fanuc operation", "fanuc cnc operation"],
        category="Technical Skills",
        subcategory="CNC Machining",
        sector=["Capital Goods & Manufacturing"],
        child_skill_ids=["cnc_lathe_turning", "cnc_milling_gear", "cnc_gcode"],
        difficulty=2, importance="HIGH", skill_type="TECHNICAL",
    ),
    CanonicalSkill(
        skill_id="cnc_gcode",
        canonical_name="CNC G-Code Programming",
        aliases=["cnc g-code", "g-code programming", "cnc milling",
                 "m-code programming", "fanuc cnc", "fanuc 0i",
                 "mastercam", "cam software", "g code programming",
                 "fusion 360 toolpath"],
        abbreviations=["G-Code", "CAM"],
        category="Digital & Technology Skills",
        subcategory="CNC Programming",
        sector=["Capital Goods & Manufacturing"],
        parent_skill_id="cnc_fundamentals",
        prerequisite_skill_ids=["cnc_fundamentals"],
        related_skill_ids=["cnc_lathe_turning"],
        difficulty=4, importance="HIGH", skill_type="DIGITAL",
    ),
    CanonicalSkill(
        skill_id="fabrication_sheet_metal",
        canonical_name="Sheet Metal Fabrication & Layout",
        aliases=["sheet metal", "metal fabrication", "bending and shearing",
                 "sheet metal development", "press brake"],
        category="Technical Skills",
        subcategory="Fabrication",
        sector=["Manufacturing & Fabrication"],
        difficulty=2, importance="MEDIUM", skill_type="TECHNICAL",
    ),

    # ── Industrial Automation & Digital ────────────────────────────────────────
    CanonicalSkill(
        skill_id="auto_plc",
        canonical_name="PLC Programming & Troubleshooting",
        aliases=["plc", "plc programming", "programmable logic controller",
                 "ladder logic", "plc troubleshooting", "plc scada interlock",
                 "allen bradley plc", "siemens s7", "siemens s7 1200",
                 "allen bradley micrologix", "rslogix", "tia portal",
                 "plc programming basics", "plc programming siemens s7 allen bradley"],
        abbreviations=["PLC"],
        category="Digital & Technology Skills",
        subcategory="Industrial Automation",
        sector=["Automation & Industry 4.0"],
        prerequisite_skill_ids=["elec_3phase_motor"],
        related_skill_ids=["auto_scada"],
        difficulty=4, importance="CRITICAL", skill_type="DIGITAL",
        source_confidence=0.98,
    ),
    CanonicalSkill(
        skill_id="auto_scada",
        canonical_name="SCADA Monitoring Systems",
        aliases=["scada", "scada supervision", "hmi scada", "wincc",
                 "wonderware", "industrial hmi", "scada wincc",
                 "intouch scada", "hmi panel commissioning", "scada systems"],
        abbreviations=["SCADA", "WinCC"],
        category="Digital & Technology Skills",
        subcategory="Industrial Automation",
        sector=["Automation & Industry 4.0", "Instrumentation"],
        prerequisite_skill_ids=["auto_plc"],
        related_skill_ids=["auto_plc", "auto_hmi"],
        difficulty=4, importance="HIGH", skill_type="DIGITAL",
    ),
    CanonicalSkill(
        skill_id="auto_hmi",
        canonical_name="HMI Panel & Display Configuration",
        aliases=["hmi panel", "hmi display", "operator panel",
                 "touch screen hmi", "proface hmi", "siemens hmi"],
        abbreviations=["HMI"],
        category="Digital & Technology Skills",
        subcategory="Industrial Automation",
        sector=["Automation & Industry 4.0"],
        related_skill_ids=["auto_scada", "auto_plc"],
        difficulty=3, importance="MEDIUM", skill_type="DIGITAL",
    ),
    CanonicalSkill(
        skill_id="auto_iot_modbus",
        canonical_name="Industrial IoT & Modbus Protocol",
        aliases=["industrial iot", "iiot", "modbus", "profibus", "ethercat",
                 "mqtt protocol", "telemetry", "mqtt", "industrial ethernet",
                 "profinet", "fieldbus", "hart protocol", "foundation fieldbus",
                 "industry 4.0 iot", "industry 4.0 iot sensors",
                 "industrial ethernet profinet"],
        abbreviations=["IIoT", "MQTT", "HART"],
        category="Digital & Technology Skills",
        subcategory="Industrial Networking",
        sector=["Automation & Industry 4.0", "Instrumentation"],
        prerequisite_skill_ids=["auto_plc"],
        difficulty=4, importance="HIGH", skill_type="DIGITAL",
    ),
    CanonicalSkill(
        skill_id="auto_industrial_robotics",
        canonical_name="Industrial Robotics Arm Operation",
        aliases=["industrial robotics", "robot arm", "fanuc robot",
                 "kuka robotics", "cobot programming", "robotic pick and place",
                 "teach pendant", "tcp calibration", "tool center point",
                 "robotics arm operation", "industrial robotics arm operation"],
        category="Emerging Skills",
        subcategory="Robotics",
        sector=["Automation & Industry 4.0"],
        prerequisite_skill_ids=["auto_plc"],
        related_skill_ids=["weld_robotic"],
        difficulty=5, importance="HIGH", skill_type="EMERGING",
    ),

    # ── Solar & Renewable ───────────────────────────────────────────────────────
    CanonicalSkill(
        skill_id="solar_pv_install",
        canonical_name="Solar PV Rooftop System Installation",
        aliases=["solar pv", "solar panel installation", "rooftop solar",
                 "photovoltaic", "solar inverter wiring", "net metering",
                 "solar inverter setup", "solar mounting structure",
                 "mppt charge controller", "mppt", "anti-islanding protection",
                 "solar i-v curve", "pm surya ghar", "solar pv rooftop",
                 "solar pv array", "rooftop solar mounting structures",
                 "solar rooftop", "solar pv system installation",
                 "solar pv cell physics"],
        abbreviations=["PV", "MPPT"],
        category="Emerging Skills",
        subcategory="Renewable Energy",
        sector=["Renewable Energy & Solar"],
        prerequisite_skill_ids=["elec_house_wiring"],
        difficulty=3, importance="HIGH", skill_type="EMERGING",
        source_confidence=0.96,
    ),

    # ── EV & Battery ────────────────────────────────────────────────────────────
    CanonicalSkill(
        skill_id="ev_bms",
        canonical_name="Li-ion Battery Management Systems (BMS)",
        aliases=["bms", "battery management system", "ev battery",
                 "lithium ion pack", "battery cell balancing",
                 "ev charging station", "thermal management ev",
                 "ccs charging", "bharat dc-001", "state of charge soc",
                 "state of health soh", "bms hardware", "thermal management of ev batteries",
                 "li-ion battery management systems"],
        abbreviations=["BMS", "SOC", "SOH"],
        category="Emerging Skills",
        subcategory="EV Technology",
        sector=["Automotive & EV"],
        prerequisite_skill_ids=["ev_hv_safety"],
        difficulty=4, importance="CRITICAL", skill_type="EMERGING",
        source_confidence=0.95,
    ),
    CanonicalSkill(
        skill_id="ev_hv_safety",
        canonical_name="EV High Voltage Safety",
        aliases=["ev high voltage safety", "hv ppe", "high voltage ppe",
                 "electric vehicle safety", "hv interlock", "hv gloves",
                 "ev safety protocol", "high voltage safety ev"],
        abbreviations=["HV PPE"],
        category="Safety Skills",
        subcategory="EV Safety",
        sector=["Automotive & EV"],
        difficulty=2, importance="CRITICAL", skill_type="SAFETY",
    ),
    CanonicalSkill(
        skill_id="ev_can_diagnostics",
        canonical_name="CAN Bus & EV Diagnostics",
        aliases=["can bus", "can bus diagnostics", "obd2 ev", "obd diagnostics",
                 "vehicle diagnostics", "ecu diagnostics", "cananalyzer",
                 "obd2 ev diagnostics"],
        abbreviations=["CAN", "OBD2"],
        category="Digital & Technology Skills",
        subcategory="EV Technology",
        sector=["Automotive & EV"],
        prerequisite_skill_ids=["ev_hv_safety"],
        difficulty=4, importance="HIGH", skill_type="DIGITAL",
    ),
    CanonicalSkill(
        skill_id="ev_bldc_motor",
        canonical_name="BLDC Motor & Traction Motor",
        aliases=["bldc motor", "traction motor", "brushless dc",
                 "bldc motor testing", "traction motor repair",
                 "regenerative braking", "regenerative braking system",
                 "bldc motor esc"],
        abbreviations=["BLDC"],
        category="Technical Skills",
        subcategory="EV Technology",
        sector=["Automotive & EV"],
        prerequisite_skill_ids=["elec_motors"],
        parent_skill_id="elec_motors",
        difficulty=4, importance="HIGH", skill_type="TECHNICAL",
    ),

    # ── Additive Manufacturing & Drone ─────────────────────────────────────────
    CanonicalSkill(
        skill_id="emerging_3d_printing",
        canonical_name="Additive Manufacturing (3D Printing)",
        aliases=["3d printing", "additive manufacturing", "fdm printer",
                 "stl file preparation", "slicing software", "cura slicer",
                 "prusa slicer", "filament selection", "pla abs petg",
                 "sla printer", "resin curing", "support structure",
                 "fdm sla 3d printer", "3d printer setup"],
        abbreviations=["FDM", "SLA"],
        category="Emerging Skills",
        subcategory="Digital Manufacturing",
        sector=["Digital Manufacturing"],
        difficulty=3, importance="MEDIUM", skill_type="EMERGING",
    ),
    CanonicalSkill(
        skill_id="emerging_drone",
        canonical_name="Drone Assembly & Flight Systems",
        aliases=["drone assembly", "quadcopter assembly", "flight controller",
                 "ardupilot", "bldc motor esc", "lipo battery safety",
                 "dgca drone", "drone technician", "drone maintenance",
                 "payload gimbal", "gps module", "flight log analysis",
                 "quadcopter frame assembly", "flight controller calibration"],
        abbreviations=["DGCA", "FPV"],
        category="Emerging Skills",
        subcategory="Drone Technology",
        sector=["Aerospace & Technology"],
        difficulty=4, importance="MEDIUM", skill_type="EMERGING",
    ),

    # ── IT & Software ────────────────────────────────────────────────────────────
    CanonicalSkill(
        skill_id="it_python",
        canonical_name="Python Programming Basics",
        aliases=["python", "python programming", "python coding",
                 "python 3", "python script", "python basics",
                 "python programming basics"],
        category="Digital & Technology Skills",
        subcategory="Programming",
        sector=["Information Technology"],
        difficulty=2, importance="MEDIUM", skill_type="DIGITAL",
    ),
    CanonicalSkill(
        skill_id="it_sql",
        canonical_name="SQL Database Management",
        aliases=["sql", "sql database", "mysql", "postgresql",
                 "sql queries", "database management", "sqlite",
                 "sql database management"],
        abbreviations=["SQL"],
        category="Digital & Technology Skills",
        subcategory="Databases",
        sector=["Information Technology"],
        difficulty=2, importance="MEDIUM", skill_type="DIGITAL",
    ),
    CanonicalSkill(
        skill_id="it_active_directory",
        canonical_name="Active Directory & Windows Admin",
        aliases=["active directory", "windows ad", "domain controller",
                 "windows server administration", "active directory windows admin"],
        abbreviations=["AD"],
        category="Digital & Technology Skills",
        subcategory="System Administration",
        sector=["Information Technology"],
        difficulty=3, importance="MEDIUM", skill_type="DIGITAL",
    ),
    CanonicalSkill(
        skill_id="it_linux",
        canonical_name="Linux System Administration",
        aliases=["linux", "linux admin", "ubuntu linux", "centos",
                 "bash shell", "shell scripting", "linux system administration",
                 "linux command line"],
        category="Digital & Technology Skills",
        subcategory="System Administration",
        sector=["Information Technology"],
        difficulty=3, importance="MEDIUM", skill_type="DIGITAL",
    ),
    CanonicalSkill(
        skill_id="it_tally",
        canonical_name="Tally Prime Accounting Software",
        aliases=["tally", "tally prime", "tally erp", "gst accounting",
                 "tally erp 9", "tally voucher"],
        category="Digital & Technology Skills",
        subcategory="Business Software",
        sector=["Information Technology"],
        difficulty=1, importance="LOW", skill_type="DIGITAL",
    ),
    CanonicalSkill(
        skill_id="it_cybersecurity",
        canonical_name="Cybersecurity Awareness",
        aliases=["cybersecurity", "cyber security", "network security",
                 "information security", "cybersecurity awareness",
                 "ot cybersecurity"],
        category="Digital & Technology Skills",
        subcategory="Security",
        sector=["Information Technology"],
        difficulty=2, importance="MEDIUM", skill_type="DIGITAL",
    ),
    CanonicalSkill(
        skill_id="it_web_dev",
        canonical_name="Web Development (HTML/CSS/JS)",
        aliases=["html5", "css3", "javascript", "web design",
                 "web development", "rest api", "rest api integration"],
        abbreviations=["HTML", "CSS", "JS"],
        category="Digital & Technology Skills",
        subcategory="Web Development",
        sector=["Information Technology"],
        difficulty=2, importance="MEDIUM", skill_type="DIGITAL",
    ),

    # ── Automotive ───────────────────────────────────────────────────────────────
    CanonicalSkill(
        skill_id="auto_engine_overhaul",
        canonical_name="Engine Overhauling & Servicing",
        aliases=["engine overhauling", "engine servicing",
                 "cylinder head inspection", "piston ring replacement",
                 "four stroke engine", "ic engine", "ic engines",
                 "diesel engine", "petrol engine", "engine overhauling ic engine"],
        abbreviations=["IC"],
        category="Technical Skills",
        subcategory="Automotive",
        sector=["Automotive & Transportation"],
        difficulty=4, importance="HIGH", skill_type="TECHNICAL",
    ),
    CanonicalSkill(
        skill_id="auto_wheel_alignment",
        canonical_name="Wheel Alignment & Balancing",
        aliases=["wheel alignment", "wheel balancing", "tyre changing",
                 "suspension inspection", "camber caster adjustment",
                 "wheel alignment balancing"],
        category="Technical Skills",
        subcategory="Automotive",
        sector=["Automotive & Transportation"],
        difficulty=2, importance="MEDIUM", skill_type="TECHNICAL",
    ),
    CanonicalSkill(
        skill_id="auto_electrical_wiring",
        canonical_name="Automotive Electrical Wiring",
        aliases=["auto electrical", "vehicle wiring harness",
                 "alternator testing", "starter motor repair",
                 "car battery testing", "auto electricals"],
        category="Technical Skills",
        subcategory="Automotive",
        sector=["Automotive & Transportation"],
        difficulty=3, importance="HIGH", skill_type="TECHNICAL",
    ),
    CanonicalSkill(
        skill_id="auto_fuel_injection",
        canonical_name="Fuel Injection & OBD2 Diagnostics",
        aliases=["fuel injection", "fuel injection system", "obd2",
                 "obd diagnostics", "fuel system", "common rail diesel",
                 "fuel injection systems", "obd2 diagnostics"],
        abbreviations=["OBD2", "CRDI"],
        category="Technical Skills",
        subcategory="Automotive",
        sector=["Automotive & Transportation"],
        difficulty=3, importance="HIGH", skill_type="TECHNICAL",
    ),
    CanonicalSkill(
        skill_id="auto_transmission",
        canonical_name="Transmission & Differential Repair",
        aliases=["transmission gearbox", "gearbox repair",
                 "differential assembly", "clutch servicing", "manual gearbox",
                 "transmission gearbox repair"],
        category="Technical Skills",
        subcategory="Automotive",
        sector=["Automotive & Transportation"],
        difficulty=4, importance="HIGH", skill_type="TECHNICAL",
    ),
    CanonicalSkill(
        skill_id="auto_abs",
        canonical_name="ABS & Advanced Braking Systems",
        aliases=["abs system", "anti lock braking", "abs systems",
                 "electronic braking", "ebs system"],
        abbreviations=["ABS"],
        category="Technical Skills",
        subcategory="Automotive",
        sector=["Automotive & Transportation"],
        difficulty=3, importance="HIGH", skill_type="TECHNICAL",
    ),

    # ── HVAC & Refrigeration ────────────────────────────────────────────────────
    CanonicalSkill(
        skill_id="hvac_vapour_compression",
        canonical_name="Vapour Compression Refrigeration",
        aliases=["vapour compression", "refrigeration cycle",
                 "refrigerant charging", "r134a", "r410a",
                 "refrigerant leak detection", "split ac servicing", "inverter ac",
                 "vapour compression cycle", "split ac"],
        abbreviations=["VCR", "HVAC"],
        category="Technical Skills",
        subcategory="HVAC",
        sector=["HVAC & Appliances"],
        difficulty=3, importance="HIGH", skill_type="TECHNICAL",
    ),
    CanonicalSkill(
        skill_id="hvac_brazing",
        canonical_name="Brazing & HVAC Pipework",
        aliases=["brazing", "silver brazing", "copper brazing",
                 "hvac pipework", "duct layout", "ducting setup",
                 "brazing techniques"],
        category="Technical Skills",
        subcategory="HVAC",
        sector=["HVAC & Appliances"],
        difficulty=3, importance="MEDIUM", skill_type="TECHNICAL",
    ),

    # ── Instrumentation ─────────────────────────────────────────────────────────
    CanonicalSkill(
        skill_id="instr_transmitter_calibration",
        canonical_name="Process Transmitter Calibration",
        aliases=["process transmitter", "pressure transmitter",
                 "temperature transmitter", "flow transmitter",
                 "rtd thermocouple", "thermocouple calibration",
                 "rtd calibration", "loop calibrator",
                 "rtd thermocouple calibration"],
        abbreviations=["RTD", "P&ID"],
        category="Technical Skills",
        subcategory="Instrumentation",
        sector=["Instrumentation & Process Control"],
        difficulty=4, importance="HIGH", skill_type="TECHNICAL",
    ),
    CanonicalSkill(
        skill_id="instr_pid_control",
        canonical_name="Control Valve & PID Controller",
        aliases=["control valve", "control valve positioner",
                 "pid controller", "pid tuning", "pid control",
                 "process control valve", "pid loop commissioning",
                 "pid controller tuning"],
        abbreviations=["PID"],
        category="Technical Skills",
        subcategory="Instrumentation",
        sector=["Instrumentation & Process Control"],
        prerequisite_skill_ids=["instr_transmitter_calibration"],
        difficulty=4, importance="HIGH", skill_type="TECHNICAL",
    ),

    # ── Plumbing & Piping ────────────────────────────────────────────────────────
    CanonicalSkill(
        skill_id="plumb_piping",
        canonical_name="Piping Layout & Joint Fitting",
        aliases=["piping layout", "pipe fitting", "pvc pipe joint",
                 "gi pipe threading", "plumbing layout", "bore well pump",
                 "water supply pump"],
        category="Technical Skills",
        subcategory="Plumbing",
        sector=["Construction & Infrastructure"],
        difficulty=2, importance="LOW", skill_type="TECHNICAL",
    ),

    # ── Safety & Quality ────────────────────────────────────────────────────────
    CanonicalSkill(
        skill_id="safety_ppe_workshop",
        canonical_name="PPE & Industrial Workshop Safety",
        aliases=["ppe safety", "personal protective equipment", "workshop safety",
                 "industrial safety standards", "5s workshop",
                 "workshop safety standards"],
        abbreviations=["PPE", "5S"],
        category="Safety Skills",
        subcategory="General Safety",
        sector=["Capital Goods & Manufacturing"],
        difficulty=1, importance="HIGH", skill_type="SAFETY",
    ),
    CanonicalSkill(
        skill_id="safety_quality_control",
        canonical_name="Quality Control & Inspection (ISO)",
        aliases=["quality control", "quality inspection", "iso 9001",
                 "first article inspection", "kaizen quality", "kaizen",
                 "cmm inspection", "iso quality audit",
                 "quality control inspection iso"],
        abbreviations=["ISO", "CMM"],
        category="Safety Skills",
        subcategory="Quality Management",
        sector=["Capital Goods & Manufacturing"],
        difficulty=3, importance="HIGH", skill_type="SAFETY",
    ),
    CanonicalSkill(
        skill_id="safety_arc_flash",
        canonical_name="Arc Flash & Electrical Safety",
        aliases=["arc flash", "arc flash safety", "electrical arc flash",
                 "arc flash protection"],
        category="Safety Skills",
        subcategory="Electrical Safety",
        sector=["Electrical & Energy"],
        related_skill_ids=["safety_electrical"],
        difficulty=2, importance="CRITICAL", skill_type="SAFETY",
    ),

    # ── Soft Skills ──────────────────────────────────────────────────────────────
    CanonicalSkill(
        skill_id="soft_technical_writing",
        canonical_name="Technical Report Writing",
        aliases=["report writing", "technical documentation",
                 "shift report", "maintenance log"],
        category="Soft Skills",
        subcategory="Communication",
        sector=[],
        difficulty=2, importance="LOW", skill_type="SOFT",
        transferable=True,
    ),
]

# NOT_EQUIVALENT relationships — explicitly defined to prevent false matches
EXPLICIT_NOT_EQUIVALENT: List[Tuple[str, str, str]] = [
    # (source_id, target_id, notes)
    ("weld_fundamentals", "weld_robotic",
     "Basic welding does not satisfy robotic welding requirements"),
    ("cnc_fundamentals", "cnc_gcode",
     "Knowing CNC basics does not mean knowing G-Code programming"),
    ("elec_motors", "ev_bldc_motor",
     "General motor knowledge does not equal BLDC/traction motor expertise"),
    ("it_python", "auto_plc",
     "Python and PLC programming are different paradigms"),
    ("safety_electrical", "ev_hv_safety",
     "General electrical safety does not cover EV high-voltage protocols"),
]


# ─── Ontology Index (singleton) ───────────────────────────────────────────────

class SkillOntology:
    """
    In-memory index of the skill ontology.

    Provides:
    - O(1) lookup by skill_id
    - O(1) lookup of canonical_id from any surface form
    - Ancestor/descendant traversal
    - Prerequisite chain resolution
    - NOT_EQUIVALENT guard
    """

    _instance: Optional["SkillOntology"] = None

    def __init__(self):
        self._by_id: Dict[str, CanonicalSkill] = {}
        self._surface_to_id: Dict[str, str] = {}  # lowercase surface → skill_id
        self._not_equivalent_pairs: Set[Tuple[str, str]] = set()
        self._relationships: Dict[str, List[SkillRelationshipRecord]] = {}
        self._load()

    @classmethod
    def get(cls) -> "SkillOntology":
        """Singleton accessor."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _load(self):
        logger.info(f"Loading SkillX Ontology v{ONTOLOGY_VERSION} "
                    f"({len(MASTER_SKILL_ONTOLOGY)} canonical skills)...")

        for skill in MASTER_SKILL_ONTOLOGY:
            self._by_id[skill.skill_id] = skill

            # Index canonical name
            self._surface_to_id[skill.canonical_name.lower()] = skill.skill_id

            # Index all aliases
            for alias in skill.aliases:
                self._surface_to_id[alias.lower()] = skill.skill_id

            # Index all abbreviations
            for abbr in skill.abbreviations:
                self._surface_to_id[abbr.lower()] = skill.skill_id

        # Register NOT_EQUIVALENT pairs (bidirectional)
        for src, tgt, _ in EXPLICIT_NOT_EQUIVALENT:
            self._not_equivalent_pairs.add((src, tgt))
            self._not_equivalent_pairs.add((tgt, src))

        logger.info(
            f"Ontology loaded: {len(self._by_id)} skills, "
            f"{len(self._surface_to_id)} surface forms indexed."
        )

    # ── Lookup ─────────────────────────────────────────────────────────────────

    def get_by_id(self, skill_id: str) -> Optional[CanonicalSkill]:
        return self._by_id.get(skill_id)

    def get_canonical_id(self, surface_form: str) -> Optional[str]:
        """Return skill_id for any surface form, or None if unknown."""
        return self._surface_to_id.get(surface_form.lower().strip())

    def get_canonical_skill(self, surface_form: str) -> Optional[CanonicalSkill]:
        """Return CanonicalSkill for any surface form, or None."""
        sid = self.get_canonical_id(surface_form)
        return self._by_id.get(sid) if sid else None

    def is_known(self, surface_form: str) -> bool:
        return surface_form.lower().strip() in self._surface_to_id

    def all_skills(self) -> List[CanonicalSkill]:
        return list(self._by_id.values())

    # ── Hierarchy ──────────────────────────────────────────────────────────────

    def get_ancestors(self, skill_id: str) -> List[str]:
        """Return all ancestor skill_ids (parent, grandparent, ...)."""
        result = []
        current = self._by_id.get(skill_id)
        visited = set()
        while current and current.parent_skill_id:
            pid = current.parent_skill_id
            if pid in visited:
                break
            visited.add(pid)
            result.append(pid)
            current = self._by_id.get(pid)
        return result

    def get_descendants(self, skill_id: str) -> List[str]:
        """Return all descendant skill_ids (children, grandchildren, ...)."""
        result = []
        queue = list(self._by_id.get(skill_id, CanonicalSkill("", "")).child_skill_ids)
        visited = set()
        while queue:
            cid = queue.pop(0)
            if cid in visited:
                continue
            visited.add(cid)
            result.append(cid)
            child = self._by_id.get(cid)
            if child:
                queue.extend(child.child_skill_ids)
        return result

    def get_prerequisites(self, skill_id: str, deep: bool = False) -> List[str]:
        """Return prerequisite skill_ids (optionally transitive)."""
        skill = self._by_id.get(skill_id)
        if not skill:
            return []
        if not deep:
            return list(skill.prerequisite_skill_ids)
        # Transitive prerequisites (BFS, cycle-safe)
        result = []
        queue = list(skill.prerequisite_skill_ids)
        visited = {skill_id}
        while queue:
            pid = queue.pop(0)
            if pid in visited:
                continue
            visited.add(pid)
            result.append(pid)
            parent = self._by_id.get(pid)
            if parent:
                queue.extend(parent.prerequisite_skill_ids)
        return result

    def is_not_equivalent(self, id_a: str, id_b: str) -> bool:
        """True if the two skills are explicitly marked NOT_EQUIVALENT."""
        return (id_a, id_b) in self._not_equivalent_pairs

    def get_related(self, skill_id: str) -> List[str]:
        """Return related skill IDs."""
        skill = self._by_id.get(skill_id)
        return list(skill.related_skill_ids) if skill else []

    # ── Synonym export (for Engine 3 backward compat) ─────────────────────────

    def export_for_engine3(self) -> List[Dict]:
        """
        Export the ontology in the format expected by Engine 3's
        INITIAL_SKILL_DICTIONARY — provides backward compatibility.
        """
        result = []
        for skill in MASTER_SKILL_ONTOLOGY:
            result.append({
                "name": skill.canonical_name,
                "category": skill.category,
                "synonyms": skill.aliases + skill.abbreviations,
                "skill_id": skill.skill_id,
                "importance": skill.importance,
                "difficulty": skill.difficulty,
            })
        return result

    def stats(self) -> Dict:
        return {
            "ontology_version": ONTOLOGY_VERSION,
            "total_skills": len(self._by_id),
            "total_surface_forms": len(self._surface_to_id),
            "not_equivalent_pairs": len(self._not_equivalent_pairs) // 2,
        }
