import time
import hashlib
from sqlalchemy.orm import Session
from app.db.models import JobPosting, Course
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Engine2_JobIngestion")

MAHARASHTRA_36_DISTRICTS = [
    "Pune", "Nashik", "Thane", "Nagpur", "Chhatrapati Sambhajinagar",
    "Kolhapur", "Solapur", "Amravati", "Latur", "Nanded",
    "Satara", "Ahmednagar", "Dhule", "Jalgaon", "Ratnagiri",
    "Sangli", "Chandrapur", "Yavatmal", "Buldhana", "Akola",
    "Wardha", "Bhandara", "Gondia", "Gadchiroli", "Washim",
    "Hingoli", "Parbhani", "Beed", "Osmanabad", "Jalna",
    "Sindhudurg", "Raigad", "Palghar", "Mumbai City", "Mumbai Suburban", "Nandurbar"
]

JOB_TEMPLATES = [
    ("Industrial Maintenance Electrician", "Electrical & Energy", "Tata Motors / Siemens Plant", "Electrician Trade", "1-3 Years", "Required experienced Electrician for shop floor electrical maintenance. Must know 3-Phase Motors, Substation Equipment, Industrial Panel Wiring, PLC Troubleshooting, Armature Winding, Solar PV System Installation, Electrical Safety Standards, and Circuit Breaker testing."),
    ("Solar PV Installation Field Engineer", "Renewable Energy & Solar", "Mahindra Susten / Tata Power Solar", "Solar Panel Technician", "0-2 Years", "Seeking Solar Field Technicians for solar rooftop installation. Required skills: Solar PV Array Mounting, Solar Inverter Setup, Rooftop Solar Mounting, Battery Storage System Maintenance, DC Cabling, SCADA Solar Monitoring, Net Metering compliance."),
    ("EV Battery Pack & BMS Technician", "Automotive & EV", "Bajaj Auto EV / Ather Energy", "EV Service Technician", "1-2 Years", "Looking for EV Assembly Specialists. Key requirements: Li-ion Battery Management Systems (BMS), Thermal Management of EV Batteries, Electric Motor Control, BLDC Motors, Regenerative Braking, High Voltage Safety, CAN Bus Diagnostics, EV Fast Charger Servicing."),
    ("CNC Machining & Precision Fitter", "Capital Goods & Manufacturing", "Bharat Forge / Kirloskar Oil Engines", "Fitter Trade", "2-4 Years", "Immediate opening for Fitters & CNC Operators. Must have expertise in Bench Work, Precision Measurement with Vernier Caliper and Micrometer, Lathe Machine Operation, CNC G-Code Programming, Turning, Facing, Mechanical Assembly, Hydraulic and Pneumatic Repair."),
    ("Senior TIG & MIG Welder", "Manufacturing & Fabrication", "Godrej & Boyce / Larsen & Toubro", "Welder Gas & Electric Trade", "1-3 Years", "Urgent requirement for certified Welders. Must perform Gas Metal Arc Welding (GMAW / MIG), Gas Tungsten Arc Welding (GTAW / TIG), Shielded Metal Arc Welding (SMAW), Robotic Welding Operations, Weld Defect Inspection, NDT Testing, Pipe Joint Welding."),
    ("Junior Python & IT Support Assistant", "Information Technology", "Quick Heal / Tech Mahindra", "Computer Operator & Programming Assistant (COPA)", "0-1 Year", "Opening for IT Support & Junior Python Assistant. Skills required: Python Programming Basics, SQL Database Management, Web Design with HTML5, CSS3, JavaScript, Linux Command Line, Active Directory, REST API Integration, Tally Prime Accounting."),
    ("Automotive Quality Inspection Technician", "Capital Goods & Manufacturing", "Endurance Technologies / Varroc", "Fitter Trade", "1-2 Years", "Seeking Quality Inspector for automotive components. Requirements: Vernier Caliper, Micrometer, Height Gauge, Mechanical Assembly inspection, Lathe Machine Operation, Pneumatic Gauge testing, ISO Quality Audit documentation."),
    ("Refrigeration & HVAC Service Engineer", "HVAC & Appliances", "Voltas Ltd / Blue Star", "Refrigeration & Air Conditioning Mechanic", "1-3 Years", "HVAC service engineer needed. Must know Vapour Compression Cycle, Refrigerant Charging R134a/R410a, Split AC Servicing, Inverter AC Electrical Controls, Brazing, Ducting Setup."),
    ("Industrial Automation & PLC Technician", "Automation & Industry 4.0", "Foxconn / Schneider Electric", "Industrial Automation & Robotics Technician", "1-3 Years", "Robotics & PLC operator required. Skills: PLC Programming (Siemens & Allen Bradley), SCADA Supervision, Pneumatic Actuators, Industrial Sensor Interfacing, Industry 4.0 IoT."),
    ("Additive Manufacturing & 3D Printing Operator", "Digital Manufacturing", "Wipro 3D / Stratasys Partner", "Additive Manufacturing Operator", "0-2 Years", "Operator for 3D printing equipment. Requirements: FDM & SLA 3D Printer Setup, Slicing Software (Cura), Filament Selection (PLA, ABS), Post-Processing & Resin Curing, CAD Models."),
]

def generate_500_job_master() -> list:
    """Generate 500 realistic Maharashtra industrial job posting entries."""
    catalogue = []
    idx = 1
    
    for district in MAHARASHTRA_36_DISTRICTS:
        for template in JOB_TEMPLATES:
            if idx > 500:
                break
            title_base, sector, company_base, trade_ref, exp, desc = template
            job_id = f"NCS-JOB-MH-{idx:03d}"
            
            catalogue.append({
                "job_id_external": job_id,
                "title": f"{title_base} (MIDC {district})",
                "company": f"{company_base} - {district} Works",
                "sector": sector,
                "district": district,
                "relevant_trade": trade_ref,
                "experience_req": exp,
                "employment_type": "Full Time",
                "recency_weight": 1.0 if idx % 2 == 0 else 0.9,
                "job_description": f"{desc} Located at MIDC Industrial Estate, {district}, Maharashtra.",
                "source_url": f"https://ncs.gov.in/jobs/{district.lower().replace(' ', '-')}/{idx:03d}"
            })
            idx += 1
            
    # Fill remaining to hit exact 500
    while len(catalogue) < 500:
        district = MAHARASHTRA_36_DISTRICTS[len(catalogue) % 36]
        template = JOB_TEMPLATES[len(catalogue) % len(JOB_TEMPLATES)]
        title_base, sector, company_base, trade_ref, exp, desc = template
        job_id = f"NCS-JOB-MH-{idx:03d}"
        
        catalogue.append({
            "job_id_external": job_id,
            "title": f"Advanced {title_base} ({district})",
            "company": f"{company_base} - Regional Hub",
            "sector": sector,
            "district": district,
            "relevant_trade": trade_ref,
            "experience_req": exp,
            "employment_type": "Full Time",
            "recency_weight": 0.95,
            "job_description": f"{desc} Industrial requirement in {district}, Maharashtra.",
            "source_url": f"https://mahajob.maharashtra.gov.in/jobs/{idx:03d}"
        })
        idx += 1
        
    return catalogue

MASTER_500_JOBS = generate_500_job_master()

class Engine2JobIngestion:
    def __init__(self, db: Session):
        self.db = db

    def compute_hash(self, text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def run_ingestion(self, limit: int = None) -> dict:
        start_time = time.time()
        logger.info("Starting Engine 2: Advanced Job Ingestion Pipeline...")

        dataset = MASTER_500_JOBS
        if limit and limit > 0:
            existing_ids = set(j.job_id_external for j in self.db.query(JobPosting.job_id_external).all())
            unadded = [item for item in dataset if item["job_id_external"] not in existing_ids]
            dataset = unadded[:limit] if unadded else dataset[:limit]

        jobs_added = 0
        jobs_updated = 0
        jobs_unchanged = 0

        for job in dataset:
            content_hash = self.compute_hash(f"{job['title']}_{job['company']}_{job['job_description']}")

            existing = self.db.query(JobPosting).filter(
                JobPosting.job_id_external == job["job_id_external"]
            ).first()

            if existing:
                if existing.change_hash != content_hash:
                    existing.title = job["title"]
                    existing.company = job["company"]
                    existing.job_description = job["job_description"]
                    existing.experience_req = job["experience_req"]
                    existing.employment_type = job["employment_type"]
                    existing.recency_weight = job["recency_weight"]
                    existing.change_hash = content_hash
                    existing.status = "ACTIVE"
                    existing.last_scraped_at = time.strftime("%Y-%m-%d %H:%M:%S")
                    jobs_updated += 1
                else:
                    existing.status = "ACTIVE"
                    jobs_unchanged += 1
            else:
                new_job = JobPosting(
                    job_id_external=job["job_id_external"],
                    title=job["title"],
                    company=job["company"],
                    sector=job["sector"],
                    district=job["district"],
                    relevant_trade=job["relevant_trade"],
                    experience_req=job["experience_req"],
                    employment_type=job["employment_type"],
                    job_description=job["job_description"],
                    source_url=job["source_url"],
                    recency_weight=job["recency_weight"],
                    change_hash=content_hash,
                    status="ACTIVE"
                )
                self.db.add(new_job)
                jobs_added += 1

        self.db.commit()
        end_time = time.time()
        latency_ms = round((end_time - start_time) * 1000, 2)

        total_jobs_db = self.db.query(JobPosting).filter(JobPosting.status == "ACTIVE").count()
        logger.info(f"Engine 2 Ingestion Complete in {latency_ms}ms. Total Active Jobs in DB: {total_jobs_db}")

        return {
            "engine": "Engine 2: Job Requirements Ingestion",
            "status": "COMPLETED",
            "latency_ms": latency_ms,
            "jobs_added": jobs_added,
            "jobs_updated": jobs_updated,
            "jobs_unchanged": jobs_unchanged,
            "total_jobs_db": total_jobs_db,
            "total_in_catalogue": 500,
            "remaining_in_catalogue": max(0, 500 - total_jobs_db)
        }
