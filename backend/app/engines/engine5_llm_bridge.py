"""
Engine 5: LLM Skill Bridge Pack Generator
- Reads missing_skills from Engine 4 SkillGapAnalysis
- Calls Google Gemini API if GEMINI_API_KEY is configured
- Falls back to rule-based bridge pack if no API key (zero-API constraint preserved)
- Returns structured 20-hour modular Skill Bridge Pack JSON
"""

import os
import json
import time
import logging
from sqlalchemy.orm import Session
from app.db.models import BridgePackRecommendation, SkillGapAnalysis, Course

logger = logging.getLogger("Engine5_LLMBridge")

# ─── Rule-Based Skill Bridge Pack Templates (No LLM Fallback) ──────────────────
RULE_BASED_TEMPLATES = {
    "PLC Programming": {
        "module_title": "Industrial PLC Programming Fundamentals",
        "skill_targeted": "PLC Programming",
        "duration_hours": 20,
        "nsqf_level": 5,
        "activities": [
            "Session 1 (4h): Introduction to Programmable Logic Controllers — Siemens S7-300, Ladder Logic Diagram basics, Input/Output Module wiring on training rig",
            "Session 2 (4h): Ladder Diagram programming — Timer instructions (TON, TOF, RTO), Counter blocks (CTU, CTD), hands-on exercise: Conveyor belt auto-start/stop control",
            "Session 3 (4h): Advanced instructions — Data Move blocks, Comparators, Subroutine calls, practical: Packaging machine cycle simulation",
            "Session 4 (4h): PLC to SCADA integration — Connecting PLC to WinCC/InTouch HMI, tag configuration, alarm management",
            "Session 5 (4h): Industry Assessment — 3 real-world fault scenarios to diagnose and repair using PLC ladder logic on Allen Bradley MicroLogix 1100"
        ],
        "assessment_criteria": [
            "Write a working Ladder Diagram program for a 3-motor sequential start circuit",
            "Commission a PLC-controlled conveyor with emergency stop interlock",
            "Diagnose and correct 3 PLC program faults within 30 minutes"
        ],
        "tools_required": ["Siemens S7-300 PLC Training Kit", "Allen Bradley MicroLogix 1100", "TIA Portal Software", "RSLogix 500 Software", "24V DC Power Supply"]
    },
    "SCADA Systems": {
        "module_title": "SCADA Supervision & Industrial Monitoring",
        "skill_targeted": "SCADA Systems",
        "duration_hours": 16,
        "nsqf_level": 5,
        "activities": [
            "Session 1 (4h): SCADA architecture — Field devices → PLC → Communication → SCADA Server → HMI. Configure Modbus TCP/IP communication",
            "Session 2 (4h): WinCC SCADA screen design — Process mimics, trend graphs, alarm dashboards for water treatment plant simulation",
            "Session 3 (4h): Data historian & reporting — Configure OPC-UA server, generate hourly production shift reports in Excel via SCADA",
            "Session 4 (4h): Cybersecurity in SCADA — Industrial network segmentation, OT/IT firewall setup, incident response drill"
        ],
        "assessment_criteria": [
            "Build a 10-tag SCADA mimic screen for a simulated process plant",
            "Configure SCADA alarms for high pressure and temperature setpoints",
            "Generate and export a production shift report from the historian"
        ],
        "tools_required": ["WinCC SCADA Software (Trial)", "OPC-UA Server Simulator", "Modbus Poll Software", "Laptop with Windows 10"]
    },
    "Battery Management Systems": {
        "module_title": "EV Battery Management System (BMS) Diagnostics",
        "skill_targeted": "Battery Management Systems (BMS)",
        "duration_hours": 20,
        "nsqf_level": 5,
        "activities": [
            "Session 1 (4h): Li-ion battery chemistry — Cell chemistry (NMC, LFP, NCA), State of Charge (SOC), State of Health (SOH), Cell balancing principles",
            "Session 2 (4h): BMS architecture — Cell monitoring ICs, protection circuits (overcharge, over-discharge, thermal), CAN bus communication protocol",
            "Session 3 (4h): Hands-on — Connect BMS evaluation board to a 4S LiPo pack, read SOC/SOH via CAN bus using CANalyzer software",
            "Session 4 (4h): Thermal management — Battery cooling system inspection, thermal runaway prevention, EV charging standards (CHAdeMO, CCS Combo 2, Bharat DC-001)",
            "Session 5 (4h): Fault diagnosis — 5 real EV battery fault codes to diagnose using OBD-II diagnostic scanner on EV training board"
        ],
        "assessment_criteria": [
            "Read and interpret 3 BMS fault codes from a real EV diagnostic session",
            "Perform State-of-Health assessment on a used 18650 cell pack",
            "Correctly replace a defective cell module following high-voltage safety protocol"
        ],
        "tools_required": ["BMS Evaluation Board (TI BQ76940)", "4S LiPo Training Pack", "CANalyzer Software", "OBD-II EV Scanner", "HV Safety PPE Kit"]
    },
    "Solar PV Commissioning": {
        "module_title": "Rooftop Solar PV System Installation & Commissioning",
        "skill_targeted": "Solar PV Commissioning",
        "duration_hours": 20,
        "nsqf_level": 4,
        "activities": [
            "Session 1 (4h): Solar PV physics — IV Curves, Fill Factor, MPP tracking, effect of shading, temperature coefficient calculations",
            "Session 2 (4h): System sizing — Load estimation, PV array sizing, inverter sizing, battery bank sizing using PVGIS & SolarEdge Designer tools",
            "Session 3 (4h): Installation — Mounting structure assembly, module wiring (series/parallel), DC cable sizing and labelling, string combiner box wiring",
            "Session 4 (4h): Inverter commissioning — Grid-tied inverter startup sequence, anti-islanding protection settings, net metering paperwork for MSEDCL",
            "Session 5 (4h): Maintenance & troubleshooting — I-V curve tracer testing, hotspot detection using thermal imaging, shading analysis, cleaning protocol"
        ],
        "assessment_criteria": [
            "Design a 5kW rooftop solar system for a given load profile",
            "Commission a grid-tied inverter and configure anti-islanding relay",
            "Perform I-V curve analysis and identify underperforming modules"
        ],
        "tools_required": ["Solar I-V Curve Tracer", "Digital Clamp Meter", "Thermal Camera (FLIR E4)", "SolarEdge Designer (Free)", "PVGIS Online Tool"]
    },
    "CNC Programming": {
        "module_title": "CNC Lathe & Milling G-Code Programming",
        "skill_targeted": "CNC G-Code Programming",
        "duration_hours": 20,
        "nsqf_level": 5,
        "activities": [
            "Session 1 (4h): CNC coordinate systems — Absolute vs Incremental modes, G54-G59 Work Offsets, Tool Length Offsets, Fanuc 0i controller orientation",
            "Session 2 (4h): Turning G-codes — G71 Stock Removal, G72 Facing, G76 Thread Cutting, G70 Finishing Cycle, write a complete turning program from drawing",
            "Session 3 (4h): Milling G-codes — G41/G42 Cutter Compensation, G81 Drilling Cycle, G83 Peck Drill, G74 Left-hand Tapping cycle",
            "Session 4 (4h): CAM with Mastercam/Fusion 360 — Import 3D model, set up tool paths, generate G-code, simulate on machine before cutting",
            "Session 5 (4h): Live cutting exercise — Machine a test piece to ±0.05mm tolerance using Fanuc CNC machining centre"
        ],
        "assessment_criteria": [
            "Write a G-code program from an engineering drawing without CAM software",
            "Machine a stepped shaft to ±0.05mm dimensional tolerance",
            "Identify and correct 3 program errors in a given G-code file"
        ],
        "tools_required": ["Fanuc 0i CNC Lathe Training Machine", "Mastercam/Fusion 360 (Student)", "Vernier Caliper 0.02mm", "Carbide Insert Turning Tools", "Engineering Drawing Set"]
    },
    "IoT Sensor Interfacing": {
        "module_title": "Industrial IoT & Sensor Integration Workshop",
        "skill_targeted": "IoT Sensor Interfacing",
        "duration_hours": 16,
        "nsqf_level": 5,
        "activities": [
            "Session 1 (4h): IoT fundamentals — Sensor types (temperature, pressure, flow, vibration), 4-20mA & 0-10V signal standards, signal conditioning",
            "Session 2 (4h): Raspberry Pi 4 / ESP32 gateway — Connect industrial sensors to IoT gateway via Modbus RTU, read live sensor data via MQTT broker",
            "Session 3 (4h): Cloud dashboard — Publish sensor data to ThingsBoard (free, open-source), create real-time gauges and alert thresholds",
            "Session 4 (4h): Predictive maintenance use case — Vibration analysis with accelerometer (ADXL345), FFT spectrum analysis, bearing fault detection"
        ],
        "assessment_criteria": [
            "Wire a 4-20mA pressure sensor to an IoT gateway and publish readings to MQTT",
            "Build a 5-widget dashboard showing live sensor values with alerts",
            "Diagnose a simulated bearing fault from FFT vibration data"
        ],
        "tools_required": ["ESP32 Dev Kit", "4-20mA Pressure Sensor", "ADXL345 Accelerometer", "ThingsBoard Community (Free)", "MQTT Explorer Software"]
    },
    "default": {
        "module_title": "Industry Skill Bridge Module",
        "skill_targeted": "Industry-Demanded Skill",
        "duration_hours": 20,
        "nsqf_level": 4,
        "activities": [
            "Session 1 (4h): Theoretical foundation — Core concepts, industry applications, Maharashtra MIDC employer requirements",
            "Session 2 (4h): Demonstration & observation — Expert demonstration using industrial-grade equipment at ITI workshop",
            "Session 3 (4h): Supervised practice — Student practice under instructor guidance with real materials",
            "Session 4 (4h): Independent practice — Student works independently on progressively complex tasks",
            "Session 5 (4h): Industry assessment — Practical test with checklist evaluated by DVET assessor"
        ],
        "assessment_criteria": [
            "Written theory test (30%) — MCQ + short answer on core concepts",
            "Practical demonstration (50%) — Observed skill demonstration on training equipment",
            "Industry readiness report (20%) — Student's self-assessment of workplace application"
        ],
        "tools_required": ["Standard ITI Workshop Equipment", "DVET Assessment Checklist", "PPE Kit"]
    }
}


def _find_best_template(skill_name: str) -> dict:
    """Find the most relevant rule-based template for a given skill."""
    skill_lower = skill_name.lower()
    for template_key in RULE_BASED_TEMPLATES:
        if template_key == "default":
            continue
        if any(word in skill_lower for word in template_key.lower().split()):
            return RULE_BASED_TEMPLATES[template_key]
    return RULE_BASED_TEMPLATES["default"]


def _generate_llm_bridge_pack(missing_skills: list, course_title: str, gemini_api_key: str) -> list:
    """Call Gemini API to generate bridge packs. Returns list of module dicts."""
    try:
        import google.generativeai as genai
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = f"""You are an expert Maharashtra vocational education curriculum designer for DVET ITI and MSSDS courses.

Course: {course_title}
Missing Industry Skills (identified by SkillX Gap Analysis Engine):
{json.dumps(missing_skills, indent=2)}

Design a structured 20-hour modular Skill Bridge Pack for a Maharashtra ITI student to bridge these gaps.

Return ONLY valid JSON array (no markdown, no explanation) in this exact format:
[
  {{
    "missing_skill": "<skill name>",
    "module_title": "<concise bridge module title>",
    "skill_targeted": "<skill name>",
    "duration_hours": <integer 4-8>,
    "nsqf_level": <integer 3-5>,
    "activities": [
      "Session 1 (Xh): <specific hands-on activity with equipment>",
      "Session 2 (Xh): <activity>"
    ],
    "assessment_criteria": [
      "<measurable competency statement>",
      "<measurable competency statement>"
    ],
    "tools_required": [
      "<specific tool or equipment>"
    ]
  }}
]"""

        response = model.generate_content(prompt)
        raw = response.text.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        modules = json.loads(raw)
        return modules
    except Exception as e:
        logger.warning(f"Gemini API call failed: {e}. Falling back to rule-based bridge packs.")
        return []


class Engine5LLMBridgePack:
    def __init__(self, db: Session):
        self.db = db
        self.gemini_api_key = os.environ.get("GEMINI_API_KEY", "")

    def generate_for_course(self, course_id: int) -> dict:
        start_time = time.time()

        course = self.db.query(Course).filter(Course.id == course_id).first()
        if not course:
            return {"error": f"Course ID {course_id} not found"}

        gap = self.db.query(SkillGapAnalysis).filter(
            SkillGapAnalysis.course_id == course_id
        ).first()

        if not gap:
            return {"error": f"No gap analysis found for course ID {course_id}. Run Engine 4 first."}

        missing_skills = gap.missing_skills or []
        if not missing_skills:
            return {
                "course_id": course_id,
                "course_title": course.title,
                "message": "No missing skills — this course is fully aligned with industry demand!",
                "bridge_packs": []
            }

        # Clear previous recommendations
        self.db.query(BridgePackRecommendation).filter(
            BridgePackRecommendation.course_id == course_id
        ).delete()

        generated_by = "rule-based"
        modules = []

        # Try LLM first if API key is configured
        if self.gemini_api_key:
            logger.info(f"Calling Gemini API for {len(missing_skills)} missing skills in course: {course.title}")
            modules = _generate_llm_bridge_pack(missing_skills, course.title, self.gemini_api_key)
            if modules:
                generated_by = "llm-gemini"

        # Fallback to rule-based for any skills not covered by LLM
        covered_skills = {m.get("missing_skill", "").lower() for m in modules}
        for skill in missing_skills:
            if skill.lower() not in covered_skills:
                template = _find_best_template(skill)
                modules.append({
                    "missing_skill": skill,
                    "module_title": template["module_title"],
                    "skill_targeted": skill,
                    "duration_hours": template["duration_hours"],
                    "nsqf_level": template["nsqf_level"],
                    "activities": template["activities"],
                    "assessment_criteria": template["assessment_criteria"],
                    "tools_required": template["tools_required"]
                })

        # Save to DB
        for mod in modules:
            rec = BridgePackRecommendation(
                course_id=course_id,
                missing_skill=mod.get("missing_skill", ""),
                module_title=mod.get("module_title", "Bridge Module"),
                skill_targeted=mod.get("skill_targeted", ""),
                duration_hours=mod.get("duration_hours", 20),
                activities=mod.get("activities", []),
                assessment_criteria=mod.get("assessment_criteria", []),
                tools_required=mod.get("tools_required", []),
                nsqf_level=mod.get("nsqf_level", 4),
                generated_by=generated_by
            )
            self.db.add(rec)

        self.db.commit()

        latency_ms = round((time.time() - start_time) * 1000, 2)
        total_hours = sum(m.get("duration_hours", 0) for m in modules)

        logger.info(f"Engine 5 generated {len(modules)} bridge pack modules for course {course_id} in {latency_ms}ms")

        return {
            "course_id": course_id,
            "course_title": course.title,
            "institute_type": course.institute_type,
            "district": course.district,
            "alignment_score": gap.alignment_score,
            "missing_skills_count": len(missing_skills),
            "bridge_pack_modules_count": len(modules),
            "total_bridge_pack_hours": total_hours,
            "generated_by": generated_by,
            "latency_ms": latency_ms,
            "bridge_packs": modules
        }

    def generate_for_all_courses(self) -> dict:
        """Generate bridge packs for all courses with missing skills."""
        start_time = time.time()
        gaps = self.db.query(SkillGapAnalysis).all()
        results = []
        for gap in gaps:
            if gap.missing_skills:
                result = self.generate_for_course(gap.course_id)
                results.append({
                    "course_id": gap.course_id,
                    "modules_generated": result.get("bridge_pack_modules_count", 0)
                })
        latency_ms = round((time.time() - start_time) * 1000, 2)
        return {
            "engine": "Engine 5: LLM Skill Bridge Pack Generator",
            "status": "COMPLETED",
            "courses_processed": len(results),
            "latency_ms": latency_ms,
            "results": results
        }
