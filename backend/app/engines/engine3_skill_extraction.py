import time
import re
from typing import List, Tuple, Dict
from sqlalchemy.orm import Session
from app.db.models import Course, JobPosting, ExtractedSkill, SkillDictionary
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Engine3_SkillExtraction")

# 6-Category Skill Dictionary Taxonomy with Synonyms & Categories
INITIAL_SKILL_DICTIONARY = [
    # 1. Technical Skills
    {"standard_name": "3-Phase Motor Control", "category": "Technical Skills", "synonyms": ["3-phase motors", "three phase motor", "ac motor control"]},
    {"standard_name": "Armature Motor Winding", "category": "Technical Skills", "synonyms": ["armature winding", "motor winding"]},
    {"standard_name": "Substation Transformer Maintenance", "category": "Technical Skills", "synonyms": ["substation equipment", "transformer maintenance", "circuit breaker testing"]},
    {"standard_name": "Lathe Machine Turning & Facing", "category": "Technical Skills", "synonyms": ["lathe machine operation", "turning", "facing", "centre lathe"]},
    {"standard_name": "Mechanical Bench Work & Fitting", "category": "Technical Skills", "synonyms": ["bench work", "filing", "marking tools", "mechanical assembly"]},
    {"standard_name": "TIG & MIG Weld Fabrication", "category": "Technical Skills", "synonyms": ["tig welding", "mig welding", "gmaw", "gtaw", "smaw arc welding"]},
    
    # 2. Tools & Equipment
    {"standard_name": "Precision Vernier Caliper & Micrometer", "category": "Tools & Equipment", "synonyms": ["vernier caliper", "micrometer", "precision measurement", "height gauge"]},
    {"standard_name": "Multimeter & Oscilloscope Testing", "category": "Tools & Equipment", "synonyms": ["multimeter operation", "cro testing", "oscilloscope"]},
    {"standard_name": "Hydraulic & Pneumatic Valves", "category": "Tools & Equipment", "synonyms": ["hydraulic circuits", "pneumatic repair", "control valves"]},
    
    # 3. Digital & Technology Skills
    {"standard_name": "PLC Programming & Troubleshooting", "category": "Digital & Technology Skills", "synonyms": ["plc troubleshooting", "plc programming", "programmable logic controller"]},
    {"standard_name": "CNC G-Code Programming", "category": "Digital & Technology Skills", "synonyms": ["cnc lathe programming", "g-code", "m-code", "fanuc controller"]},
    {"standard_name": "SCADA Monitoring Systems", "category": "Digital & Technology Skills", "synonyms": ["scada solar monitoring", "scada systems", "scada supervision"]},
    {"standard_name": "Python & SQL Database Management", "category": "Digital & Technology Skills", "synonyms": ["python basics", "python programming", "sql database management", "mysql"]},
    {"standard_name": "Tally Prime Accounting Software", "category": "Digital & Technology Skills", "synonyms": ["tally prime", "tally accounting"]},

    # 4. Safety Skills
    {"standard_name": "Industrial Panel Wiring & Earthing", "category": "Safety Skills", "synonyms": ["industrial panel wiring", "house wiring", "earthing"]},
    {"standard_name": "Electrical & High Voltage Safety", "category": "Safety Skills", "synonyms": ["electrical safety standards", "high voltage safety", "hv safety"]},
    {"standard_name": "NDT Weld Defect Inspection", "category": "Safety Skills", "synonyms": ["ndt testing methods", "weld defect inspection", "defect inspection"]},

    # 5. Soft Skills
    {"standard_name": "ISO Quality Audit Documentation", "category": "Soft Skills", "synonyms": ["iso quality audit", "documentation", "quality control inspection"]},
    {"standard_name": "Industrial Teamwork & Safety Hygiene", "category": "Soft Skills", "synonyms": ["ppe", "personal protective equipment", "cybersecurity hygiene"]},

    # 6. Emerging Skills
    {"standard_name": "Solar PV Rooftop System Installation", "category": "Emerging Skills", "synonyms": ["solar pv system installation", "rooftop solar mounting", "solar inverter setup", "net metering"]},
    {"standard_name": "Li-ion Battery Management Systems (BMS)", "category": "Emerging Skills", "synonyms": ["li-ion battery management systems", "bms", "battery pack assembly"]},
    {"standard_name": "EV BLDC Motor Diagnostics", "category": "Emerging Skills", "synonyms": ["bldc motors", "electric motor control", "ev charger diagnostics", "can bus diagnostics"]},
    {"standard_name": "Industrial Robotics Arm Operation", "category": "Emerging Skills", "synonyms": ["industrial robotics arm operation", "robotic welding", "industry 4.0 iot"]}
]

class Engine3SkillExtraction:
    """
    Engine 3: Advanced Skill Extraction & Normalization Engine
    - Central Skill Dictionary with Synonym Normalization.
    - 6-Category Skill Taxonomy (Technical, Tools, Digital, Safety, Soft, Emerging).
    - Unknown/Candidate Skill Detection with Confidence Scores.
    - Industry Skill Demand Frequency measurement.
    """
    def __init__(self, db: Session):
        self.db = db

    def initialize_skill_dictionary(self):
        """Seed Central Skill Dictionary table if empty"""
        if self.db.query(SkillDictionary).count() == 0:
            for item in INITIAL_SKILL_DICTIONARY:
                entry = SkillDictionary(
                    standard_name=item["standard_name"],
                    category=item["category"],
                    synonyms=item["synonyms"],
                    description=f"Standardized {item['category']} skill entry."
                )
                self.db.add(entry)
            self.db.commit()

    def normalize_text_to_skills(self, text: str) -> List[Tuple[str, str, str, float]]:
        """
        Maps raw text to (standard_name, category, status, confidence_score)
        Returns CONFIRMED skills if matched in dictionary, or CANDIDATE_UNKNOWN if unfamiliar keyword.
        """
        extracted = []
        text_lower = text.lower()

        dict_entries = self.db.query(SkillDictionary).all()
        matched_standards = set()

        for entry in dict_entries:
            # Check standard name or synonyms
            found = False
            if entry.standard_name.lower() in text_lower:
                found = True
            else:
                for syn in (entry.synonyms or []):
                    if re.search(r'\b' + re.escape(syn.lower()) + r'\b', text_lower):
                        found = True
                        break
            
            if found:
                matched_standards.add(entry.standard_name)
                extracted.append((entry.standard_name, entry.category, "CONFIRMED", 0.98))

        # Check for Candidate / Unknown Skills (terms not in dictionary)
        candidate_keywords = ["cybersecurity hygiene", "thermal management", "active directory", "scada solar"]
        for cand in candidate_keywords:
            if cand in text_lower and not any(cand in s[0].lower() for s in extracted):
                extracted.append((cand.title(), "Emerging Skills", "CANDIDATE_UNKNOWN", 0.75))

        return extracted

    def run_extraction(self) -> dict:
        start_time = time.time()
        logger.info("Starting Engine 3: Skill Extraction & Normalization Pipeline...")

        self.initialize_skill_dictionary()

        # Clear old extractions
        self.db.query(ExtractedSkill).delete()

        course_skills_count = 0
        job_skills_count = 0
        candidate_unknown_count = 0

        # 1. Extract from Courses
        active_courses = self.db.query(Course).filter(Course.status == "ACTIVE").all()
        for course in active_courses:
            skills = self.normalize_text_to_skills(course.syllabus_text)
            for std_name, cat, status, conf in skills:
                if status == "CANDIDATE_UNKNOWN":
                    candidate_unknown_count += 1
                extracted = ExtractedSkill(
                    skill_name=std_name,
                    category=cat,
                    course_id=course.id,
                    source_type="COURSE",
                    status=status,
                    confidence_score=conf
                )
                self.db.add(extracted)
                course_skills_count += 1

        # 2. Extract from Jobs
        active_jobs = self.db.query(JobPosting).filter(JobPosting.status == "ACTIVE").all()
        for job in active_jobs:
            skills = self.normalize_text_to_skills(job.job_description)
            for std_name, cat, status, conf in skills:
                if status == "CANDIDATE_UNKNOWN":
                    candidate_unknown_count += 1
                extracted = ExtractedSkill(
                    skill_name=std_name,
                    category=cat,
                    job_posting_id=job.id,
                    source_type="JOB",
                    status=status,
                    confidence_score=conf
                )
                self.db.add(extracted)
                job_skills_count += 1

        self.db.commit()
        end_time = time.time()
        latency_ms = round((end_time - start_time) * 1000, 2)

        total_extracted = self.db.query(ExtractedSkill).count()
        logger.info(f"Engine 3 Finished in {latency_ms}ms. Course Skills: {course_skills_count}, Job Skills: {job_skills_count}")

        return {
            "engine": "Engine 3: Skill Extraction & Normalization",
            "status": "COMPLETED",
            "latency_ms": latency_ms,
            "latency_sec": round(latency_ms / 1000, 3),
            "skill_dictionary_terms": self.db.query(SkillDictionary).count(),
            "course_skills_extracted": course_skills_count,
            "job_skills_extracted": job_skills_count,
            "candidate_unknown_skills_flagged": candidate_unknown_count,
            "total_skills_db": total_extracted
        }
