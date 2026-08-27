"""
Engine 3: Robust Local NLP Skill Extraction, Deduplication & Normalization Engine
Zero-API / Zero-LLM Architecture

Fixes applied:
- D3: N-gram candidate cap raised from 3 → 15, sorted by technical density
- I1: NEGATION_TRIGGERS converted from list to set (O(1) lookup)
- I5: Added rebuild_index() method for hot-reload after dictionary changes
"""

import re
import math
import time
import logging
from typing import Dict, Any, List, Set, Tuple
from collections import defaultdict
from sqlalchemy.orm import Session
from app.db.models import Course, JobPosting, ExtractedSkill, SkillDictionary

logger = logging.getLogger("Engine3_SkillExtraction")

# ──────────────────────────────────────────────────────────────────────────────
# Master Zero-API Skill Taxonomy (50+ Core Industrial Trade Skills)
# ──────────────────────────────────────────────────────────────────────────────
INITIAL_SKILL_DICTIONARY = [
    # Electrical Trades
    {"name": "3-Phase Motor Control", "category": "Technical Skills",
     "synonyms": ["3 phase motor", "three phase motor", "induction motor wiring", "motor control panel", "star delta starter", "dol starter", "motor control center"]},
    {"name": "Armature Motor Winding", "category": "Technical Skills",
     "synonyms": ["armature winding", "motor rewinding", "coil winding", "stator winding", "insulation testing", "winding resistance test"]},
    {"name": "Substation Transformer Maintenance", "category": "Technical Skills",
     "synonyms": ["transformer maintenance", "substation equipment", "switchgear", "oil testing", "circuit breaker maintenance", "circuit breaker testing", "power transformer"]},
    {"name": "Electrical & High Voltage Safety", "category": "Safety Skills",
     "synonyms": ["electrical safety", "high voltage safety", "lockout tagout", "loto", "arc flash safety", "earthing protection", "loto safety protocol", "loto protocol"]},
    {"name": "Power Factor Improvement", "category": "Technical Skills",
     "synonyms": ["power factor", "power factor correction", "capacitor bank", "reactive power", "unity power factor"]},
    {"name": "House Wiring & LT Network", "category": "Technical Skills",
     "synonyms": ["house wiring", "domestic wiring", "lt network", "internal wiring", "conduit wiring", "rural electrification wiring"]},

    # Precision Measurement & Tools
    {"name": "Precision Vernier Caliper & Micrometer", "category": "Tools & Equipment",
     "synonyms": ["vernier caliper", "micrometer gauge", "precision measurement", "dial indicator", "height gauge", "bore gauge", "precision measuring instrument calibration"]},
    {"name": "Hydraulic & Pneumatic Valves", "category": "Tools & Equipment",
     "synonyms": ["hydraulic valves", "pneumatic circuits", "solenoid valves", "fluid power", "hydraulic actuators", "pneumatic cylinder", "hydraulic circuit", "pneumatic actuators", "hydraulic cylinder reconditioning"]},
    {"name": "Engineering Drawing & Blueprint Reading", "category": "Technical Skills",
     "synonyms": ["engineering drawing", "blueprint reading", "orthographic projection", "isometric drawing", "gd&t", "gd t", "drawing reading"]},

    # Metalworking, Fabrication & Welding
    {"name": "MIG Welding (GMAW)", "category": "Technical Skills",
     "synonyms": ["mig welding", "gmaw", "gas metal arc welding", "mig welder", "co2 welding", "gas metal arc welding gmaw mig"]},
    {"name": "TIG Welding (GTAW)", "category": "Technical Skills",
     "synonyms": ["tig welding", "gtaw", "gas tungsten arc welding", "argon welding", "tig welder", "gas tungsten arc welding gtaw tig"]},
    {"name": "Shielded Metal Arc Welding (SMAW)", "category": "Technical Skills",
     "synonyms": ["smaw", "arc welding", "stick welding", "manual metal arc welding", "mmaw", "shielded metal arc welding smaw"]},
    {"name": "Robotic Welding Operations", "category": "Emerging Skills",
     "synonyms": ["robotic welding", "robot welder", "automated welding", "welding robot", "robotic arc welding"]},
    {"name": "Weld Defect Inspection & NDT", "category": "Safety Skills",
     "synonyms": ["weld defect inspection", "ndt testing", "ndt", "non destructive testing", "radiography testing", "ultrasonic testing", "dye penetrant testing"]},
    {"name": "CNC Lathe & Turning Operation", "category": "Technical Skills",
     "synonyms": ["cnc lathe", "cnc turning", "lathe machine", "turning center", "facing and grooving", "taper turning", "eccentric turning", "thread cutting"]},
    {"name": "Milling & Gear Cutting Operation", "category": "Technical Skills",
     "synonyms": ["milling machine", "gear cutting", "spur gears", "surface grinding", "milling operation"]},
    {"name": "Sheet Metal Fabrication & Layout", "category": "Technical Skills",
     "synonyms": ["sheet metal", "metal fabrication", "bending and shearing", "sheet metal development", "press brake"]},
    {"name": "Distortion Control in Welding", "category": "Technical Skills",
     "synonyms": ["distortion control", "weld distortion", "welding distortion", "thermal distortion management"]},

    # Industrial Automation & Digital Technologies
    {"name": "PLC Programming & Troubleshooting", "category": "Digital & Technology Skills",
     "synonyms": ["plc", "plc programming", "programmable logic controller", "ladder logic", "plc troubleshooting", "plc scada interlock", "allen bradley plc", "siemens s7", "siemens s7 1200", "allen bradley micrologix", "rslogix", "tia portal"]},
    {"name": "SCADA Monitoring Systems", "category": "Digital & Technology Skills",
     "synonyms": ["scada", "scada supervision", "hmi scada", "wincc", "wonderware", "industrial hmi", "scada wincc", "intouch scada", "hmi panel commissioning"]},
    {"name": "CNC G-Code Programming", "category": "Digital & Technology Skills",
     "synonyms": ["cnc g-code", "g-code programming", "cnc milling", "m-code programming", "fanuc cnc", "fanuc 0i", "fanuc cnc operation", "mastercam", "cam software"]},
    {"name": "Industrial IoT & Modbus Protocol", "category": "Digital & Technology Skills",
     "synonyms": ["industrial iot", "iiot", "modbus", "profibus", "ethercat", "mqtt protocol", "telemetry", "mqtt", "industrial ethernet", "profinet", "fieldbus", "hart protocol", "foundation fieldbus"]},
    {"name": "HMI Panel & Display Configuration", "category": "Digital & Technology Skills",
     "synonyms": ["hmi panel", "hmi display", "operator panel", "touch screen hmi", "proface hmi", "siemens hmi"]},

    # Emerging Industry 4.0 / Green Skills
    {"name": "Solar PV Rooftop System Installation", "category": "Emerging Skills",
     "synonyms": ["solar pv", "solar panel installation", "rooftop solar", "photovoltaic", "solar inverter wiring", "net metering", "solar inverter setup", "solar mounting structure", "mppt charge controller", "mppt", "anti-islanding protection", "solar i-v curve", "pm surya ghar"]},
    {"name": "Li-ion Battery Management Systems (BMS)", "category": "Emerging Skills",
     "synonyms": ["bms", "battery management system", "ev battery", "lithium ion pack", "battery cell balancing", "ev charging station", "thermal management ev", "ccs charging", "bharat dc-001", "state of charge soc", "state of health soh"]},
    {"name": "Industrial Robotics Arm Operation", "category": "Emerging Skills",
     "synonyms": ["industrial robotics", "robot arm", "fanuc robot", "kuka robotics", "cobot programming", "robotic pick and place", "teach pendant", "tcp calibration", "tool center point"]},
    {"name": "Additive Manufacturing (3D Printing)", "category": "Emerging Skills",
     "synonyms": ["3d printing", "additive manufacturing", "fdm printer", "stl file preparation", "slicing software", "cura slicer", "prusa slicer", "filament selection", "pla abs petg", "sla printer", "resin curing", "support structure"]},
    {"name": "Drone Assembly & Flight Systems", "category": "Emerging Skills",
     "synonyms": ["drone assembly", "quadcopter assembly", "flight controller", "ardupilot", "bldc motor esc", "lipo battery safety", "dgca drone", "drone technician", "drone maintenance", "payload gimbal", "gps module", "flight log analysis"]},
    {"name": "EV High Voltage Safety", "category": "Safety Skills",
     "synonyms": ["ev high voltage safety", "hv ppe", "high voltage ppe", "electric vehicle safety", "hv interlock", "hv gloves", "ev safety protocol"]},
    {"name": "CAN Bus & EV Diagnostics", "category": "Digital & Technology Skills",
     "synonyms": ["can bus", "can bus diagnostics", "obd2 ev", "obd diagnostics", "vehicle diagnostics", "ecu diagnostics", "cananalyzer"]},
    {"name": "BLDC Motor & Traction Motor", "category": "Technical Skills",
     "synonyms": ["bldc motor", "traction motor", "brushless dc", "bldc motor testing", "traction motor repair", "regenerative braking", "regenerative braking system"]},

    # IT, Networking & Accounting
    {"name": "Python Programming Basics", "category": "Digital & Technology Skills",
     "synonyms": ["python", "python programming", "python coding", "python 3", "python script", "python basics"]},
    {"name": "SQL Database Management", "category": "Digital & Technology Skills",
     "synonyms": ["sql", "sql database", "mysql", "postgresql", "sql queries", "database management", "sqlite"]},
    {"name": "Active Directory & Windows Admin", "category": "Digital & Technology Skills",
     "synonyms": ["active directory", "windows ad", "domain controller", "windows server administration", "active directory windows admin"]},
    {"name": "Linux System Administration", "category": "Digital & Technology Skills",
     "synonyms": ["linux", "linux admin", "ubuntu linux", "centos", "bash shell", "shell scripting", "linux system administration", "linux command line"]},
    {"name": "Tally Prime Accounting Software", "category": "Digital & Technology Skills",
     "synonyms": ["tally", "tally prime", "tally erp", "gst accounting", "tally erp 9", "tally voucher"]},
    {"name": "Cybersecurity Awareness", "category": "Digital & Technology Skills",
     "synonyms": ["cybersecurity", "cyber security", "network security", "information security", "cybersecurity awareness"]},
    {"name": "Web Development (HTML/CSS/JS)", "category": "Digital & Technology Skills",
     "synonyms": ["html5", "css3", "javascript", "web design", "web development", "rest api", "rest api integration"]},

    # Automotive & Mechanics
    {"name": "Engine Overhauling & Servicing", "category": "Technical Skills",
     "synonyms": ["engine overhauling", "engine servicing", "cylinder head inspection", "piston ring replacement", "four stroke engine", "ic engine", "ic engines", "diesel engine", "petrol engine"]},
    {"name": "Wheel Alignment & Balancing", "category": "Technical Skills",
     "synonyms": ["wheel alignment", "wheel balancing", "tyre changing", "suspension inspection", "camber caster adjustment"]},
    {"name": "Automotive Electrical Wiring", "category": "Technical Skills",
     "synonyms": ["auto electrical", "vehicle wiring harness", "alternator testing", "starter motor repair", "car battery testing", "auto electricals"]},
    {"name": "Fuel Injection & OBD2 Diagnostics", "category": "Technical Skills",
     "synonyms": ["fuel injection", "fuel injection system", "obd2", "obd diagnostics", "fuel system", "common rail diesel"]},
    {"name": "Transmission & Differential Repair", "category": "Technical Skills",
     "synonyms": ["transmission gearbox", "gearbox repair", "differential assembly", "clutch servicing", "manual gearbox"]},
    {"name": "ABS & Advanced Braking Systems", "category": "Technical Skills",
     "synonyms": ["abs system", "anti lock braking", "abs systems", "electronic braking", "ebs system"]},

    # Refrigeration / HVAC
    {"name": "Vapour Compression Refrigeration", "category": "Technical Skills",
     "synonyms": ["vapour compression", "refrigeration cycle", "refrigerant charging", "r134a", "r410a", "refrigerant leak detection", "split ac servicing", "inverter ac"]},
    {"name": "Brazing & HVAC Pipework", "category": "Technical Skills",
     "synonyms": ["brazing", "silver brazing", "copper brazing", "hvac pipework", "duct layout", "ducting setup"]},

    # Instrumentation & Process Control
    {"name": "Process Transmitter Calibration", "category": "Technical Skills",
     "synonyms": ["process transmitter", "pressure transmitter", "temperature transmitter", "flow transmitter", "rtd thermocouple", "thermocouple calibration", "rtd calibration", "loop calibrator"]},
    {"name": "Control Valve & PID Controller", "category": "Technical Skills",
     "synonyms": ["control valve", "control valve positioner", "pid controller", "pid tuning", "pid control", "process control valve"]},

    # Plumbing & Piping
    {"name": "Piping Layout & Joint Fitting", "category": "Technical Skills",
     "synonyms": ["piping layout", "pipe fitting", "pvc pipe joint", "gi pipe threading", "plumbing layout", "bore well pump", "water supply pump"]},

    # Safety & Quality
    {"name": "PPE & Industrial Workshop Safety", "category": "Safety Skills",
     "synonyms": ["ppe safety", "personal protective equipment", "workshop safety", "industrial safety standards", "5s workshop", "workshop safety standards"]},
    {"name": "Quality Control & Inspection (ISO)", "category": "Safety Skills",
     "synonyms": ["quality control", "quality inspection", "iso 9001", "first article inspection", "kaizen quality", "kaizen", "cmm inspection", "iso quality audit"]},
    {"name": "Arc Flash & Electrical Safety", "category": "Safety Skills",
     "synonyms": ["arc flash", "arc flash safety", "electrical arc flash", "arc flash protection"]},

    # Soft Skills
    {"name": "Technical Report Writing", "category": "Soft Skills",
     "synonyms": ["report writing", "technical documentation", "shift report", "maintenance log"]},
]

# Convert to set for O(1) lookup (fixes I1)
NEGATION_TRIGGERS: Set[str] = {
    "no", "not", "without", "lacks", "neither", "nor",
    "doesn't require", "don't require", "no experience in",
    "not required", "optional", "no need", "excluded", "except"
}

COMMON_ENGLISH_STOPWORDS: Set[str] = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "up", "about", "into", "over", "after",
    "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would",
    "shall", "should", "may", "might", "must", "can", "could",
    "this", "that", "these", "those", "course", "syllabus", "student",
    "training", "practical", "theory", "hours", "total", "year",
    "semester", "module", "unit", "work", "job", "candidate",
    "company", "location", "salary", "experience", "skills", "required",
    "district", "industrial", "estate", "maharashtra", "nsqf", "level",
    "certified", "dvet", "midc", "preference", "candidates", "trained",
    "local", "institute", "role", "supervision", "responsibilities"
}

# Technical keyword hints for N-gram candidate scoring
TECHNICAL_KEYWORDS = {
    "control", "system", "automation", "python", "data", "cyber", "iot",
    "network", "machine", "processing", "digital", "smart", "sensor",
    "motor", "valve", "pump", "circuit", "power", "solar", "battery",
    "welding", "machining", "inspection", "calibration", "maintenance",
    "testing", "programming", "monitoring", "fabrication", "assembly"
}


class Engine3SkillExtraction:
    def __init__(self, db: Session):
        self.db = db
        self._ensure_skill_dictionary()
        self._load_and_compile_dictionary()

    def _ensure_skill_dictionary(self):
        """Initializes default master dictionary if DB table is empty."""
        existing_count = self.db.query(SkillDictionary).count()
        if existing_count == 0:
            logger.info("Initializing zero-API Master Skill Dictionary (50+ Trades)...")
            for item in INITIAL_SKILL_DICTIONARY:
                sd = SkillDictionary(
                    standard_name=item["name"],
                    category=item["category"],
                    synonyms=item["synonyms"]
                )
                self.db.add(sd)
            self.db.commit()

    def _load_and_compile_dictionary(self):
        """
        Loads all dictionary entries into RAM and pre-compiles regexes.
        Synonyms sorted by length DESCENDING → Longest-First Overlap Suppression.
        """
        dict_items = self.db.query(SkillDictionary).all()
        self.compiled_synonyms: List[Tuple[str, str, str, Any]] = []
        self.synonym_to_canonical: Dict[str, str] = {}
        self.canonical_categories: Dict[str, str] = {}

        synonym_tuples = []
        for sd in dict_items:
            self.canonical_categories[sd.standard_name] = sd.category
            self.synonym_to_canonical[sd.standard_name.lower()] = sd.standard_name
            synonym_tuples.append((sd.standard_name, sd.standard_name, sd.category))

            for syn in (sd.synonyms or []):
                self.synonym_to_canonical[syn.lower()] = sd.standard_name
                synonym_tuples.append((syn, sd.standard_name, sd.category))

        # Sort longest-first for overlap suppression
        synonym_tuples.sort(key=lambda x: len(x[0]), reverse=True)

        for syn, standard_name, category in synonym_tuples:
            escaped = re.escape(syn.lower())
            pattern = r'(?<!\w)' + escaped + r'(?!\w)'
            regex = re.compile(pattern, re.IGNORECASE)
            self.compiled_synonyms.append((syn, standard_name, category, regex))

        logger.info(
            f"Engine 3 dictionary loaded: {len(dict_items)} entries, "
            f"{len(synonym_tuples)} synonym patterns compiled."
        )

    def rebuild_index(self):
        """Hot-reload the in-memory regex index after dictionary changes (fixes I5)."""
        logger.info("Rebuilding Engine 3 in-memory synonym regex index...")
        self._load_and_compile_dictionary()

    def _clean_raw_text(self, text: str) -> str:
        """Cleans HTML tags, soft hyphens, multi-spaces, and PDF line breaks."""
        if not text:
            return ""
        text = re.sub(r'<[^>]+>', ' ', text)
        text = text.replace('\xa0', ' ').replace('&nbsp;', ' ').replace('&amp;', '&')
        text = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def _is_negated(self, text_lower: str, match_start: int) -> bool:
        """Guardrail: Checks if preceding 60 chars contain a negation trigger."""
        window_start = max(0, match_start - 60)
        preceding_text = text_lower[window_start:match_start]
        words = re.findall(r'\b\w+\b', preceding_text.lower())
        # O(1) lookup since NEGATION_TRIGGERS is now a set
        return any(w in NEGATION_TRIGGERS for w in words)

    def _score_ngram_technical_density(self, phrase: str) -> int:
        """Scores an N-gram by how many technical keywords it contains."""
        words = phrase.lower().split()
        return sum(1 for w in words if w in TECHNICAL_KEYWORDS)

    def extract_skills_from_text(self, text: str) -> List[Dict[str, Any]]:
        """
        Multi-tiered Deduplicated Extraction:
        - Tier 1: Canonical Synonym Matching (Longest-First, Zero-API)
        - Tier 2: Dynamic N-Gram Candidate Discovery (cap 15, sorted by technical density)
        """
        cleaned_text = self._clean_raw_text(text)
        if not cleaned_text:
            return []

        text_lower = cleaned_text.lower()
        extracted_results: List[Dict[str, Any]] = []
        seen_canonical_names: Set[str] = set()
        matched_character_spans: List[Tuple[int, int]] = []

        # ── Tier 1: Dictionary Synonym Matching (Longest First) ───────────────
        for syn, standard_name, category, regex in self.compiled_synonyms:
            if standard_name.lower() in seen_canonical_names:
                continue

            for match in regex.finditer(text_lower):
                start, end = match.span()

                if any(s <= start and end <= e for s, e in matched_character_spans):
                    continue

                if self._is_negated(text_lower, start):
                    logger.debug(f"Suppressed negated skill '{syn}' at offset {start}")
                    continue

                seen_canonical_names.add(standard_name.lower())
                matched_character_spans.append((start, end))

                confidence = 0.99 if syn.lower() == standard_name.lower() else 0.94
                extracted_results.append({
                    "canonical_name": standard_name,
                    "surface_form": syn,
                    "category": category,
                    "status": "CONFIRMED",
                    "confidence": confidence,
                    "method": "canonical_regex"
                })
                break

        # ── Tier 2: Dynamic N-Gram Candidate Discovery (cap 15, D3 fix) ──────
        words = re.findall(r'\b[a-zA-Z0-9\+#\-]+\b', cleaned_text)
        candidate_phrases: List[Tuple[int, str]] = []  # (score, phrase)

        for n in (2, 3, 4):
            for i in range(len(words) - n + 1):
                ngram = words[i:i+n]
                first_word = ngram[0].lower()
                last_word = ngram[-1].lower()

                if first_word in COMMON_ENGLISH_STOPWORDS or last_word in COMMON_ENGLISH_STOPWORDS:
                    continue

                phrase = " ".join(ngram)
                phrase_lower = phrase.lower()

                if len(phrase) < 6 or phrase_lower.isdigit():
                    continue
                if phrase_lower in self.synonym_to_canonical:
                    continue
                if any(phrase_lower in c for c in seen_canonical_names):
                    continue

                score = self._score_ngram_technical_density(phrase)
                if score > 0 or any(w[0].isupper() for w in ngram):
                    candidate_phrases.append((score, phrase))

        # Sort by technical density descending, deduplicate, cap at 15 (D3 fix)
        seen_candidates: Set[str] = set()
        sorted_candidates = sorted(candidate_phrases, key=lambda x: x[0], reverse=True)

        for score, phrase in sorted_candidates:
            phrase_clean = phrase.strip().title()
            phrase_lower = phrase_clean.lower()

            if phrase_lower in seen_candidates or phrase_lower in seen_canonical_names:
                continue

            seen_candidates.add(phrase_lower)
            seen_canonical_names.add(phrase_lower)
            extracted_results.append({
                "canonical_name": phrase_clean,
                "surface_form": phrase,
                "category": "Candidate / Emerging Skills",
                "status": "CANDIDATE_UNKNOWN",
                "confidence": round(0.55 + (score * 0.10), 2),  # Higher density = higher confidence
                "method": "dynamic_ngram_candidate"
            })

            if len(seen_candidates) >= 15:  # Cap at 15 (was 3, fixes D3)
                break

        return extracted_results

    def run_extraction(self) -> Dict[str, Any]:
        """
        Runs deduplicated skill extraction across all courses & jobs.
        Uses bulk DB operations for maximum execution speed.
        """
        start_time = time.time()
        logger.info("Starting Engine 3 Skill Extraction & Deduplication Pipeline...")

        # Clear previous extracted skills and rebuild
        self.db.query(ExtractedSkill).delete()
        self.db.commit()

        courses = self.db.query(Course).all()
        jobs = self.db.query(JobPosting).all()

        extracted_objects = []
        course_skills_count = 0
        job_skills_count = 0

        for course in courses:
            extracted = self.extract_skills_from_text(course.syllabus_text or "")
            for item in extracted:
                es = ExtractedSkill(
                    skill_name=item["canonical_name"],
                    category=item["category"],
                    course_id=course.id,
                    source_type="COURSE",
                    status=item["status"],
                    confidence_score=item["confidence"]
                )
                extracted_objects.append(es)
                course_skills_count += 1

        for job in jobs:
            extracted = self.extract_skills_from_text(job.job_description or "")
            for item in extracted:
                es = ExtractedSkill(
                    skill_name=item["canonical_name"],
                    category=item["category"],
                    job_posting_id=job.id,
                    source_type="JOB",
                    status=item["status"],
                    confidence_score=item["confidence"]
                )
                extracted_objects.append(es)
                job_skills_count += 1

        if extracted_objects:
            self.db.bulk_save_objects(extracted_objects)
            self.db.commit()

        latency_ms = round((time.time() - start_time) * 1000, 2)
        logger.info(
            f"Engine 3 completed: {course_skills_count} course skills & "
            f"{job_skills_count} job skills extracted & deduplicated in {latency_ms}ms."
        )

        return {
            "status": "SUCCESS",
            "latency_ms": latency_ms,
            "extracted_course_skills": course_skills_count,
            "extracted_job_skills": job_skills_count,
            "total_extracted": course_skills_count + job_skills_count,
            "dictionary_entries": self.db.query(SkillDictionary).count(),
        }
