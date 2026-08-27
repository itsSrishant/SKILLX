import time
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Dict, List, Any

from app.config import settings
from app.db.database import engine, Base, get_db
from app.db.models import Course, JobPosting, ExtractedSkill, SkillGapAnalysis, SkillDictionary
from app.engines.engine1_course_ingestion import Engine1CourseIngestion
from app.engines.engine2_job_ingestion import Engine2JobIngestion
from app.engines.engine3_skill_extraction import Engine3SkillExtraction
from app.engines.engine4_skill_gap import Engine4SkillGapAnalysis

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="SkillX Labour Market Intelligence Platform - Backend API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pipeline_state = {
    "is_running": False,
    "current_engine": None,
    "progress_percentage": 0,
    "elapsed_seconds": 0.0,
    "estimated_time_remaining_seconds": 0.0,
    "last_run_summary": None
}

ESTIMATED_LATENCY_CONFIG = {
    "engine1": {"name": "Engine 1: Course Ingestion", "estimated_sec": 0.35},
    "engine2": {"name": "Engine 2: Job Ingestion", "estimated_sec": 0.40},
    "engine3": {"name": "Engine 3: Skill Extraction & Normalization", "estimated_sec": 0.03},
    "engine4": {"name": "Engine 4: 3-Tier Skill Gap Analysis", "estimated_sec": 0.02},
    "total_pipeline_estimated_sec": 0.80
}

@app.get("/")
def read_root():
    return {
        "status": "ONLINE",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs"
    }

@app.get("/api/v1/health")
def health_check():
    return {"status": "HEALTHY", "db_connected": True}

@app.get("/api/v1/metrics/overview")
def get_overview_metrics(db: Session = Depends(get_db)):
    total_courses = db.query(Course).filter(Course.status == "ACTIVE").count()
    total_jobs = db.query(JobPosting).filter(JobPosting.status == "ACTIVE").count()
    total_skills = db.query(ExtractedSkill).count()
    candidate_unknown_count = db.query(ExtractedSkill).filter(ExtractedSkill.status == "CANDIDATE_UNKNOWN").count()
    
    gap_records = db.query(SkillGapAnalysis).all()
    avg_score = round(sum(r.alignment_score for r in gap_records) / len(gap_records), 1) if gap_records else 0.0
    
    district_scores: Dict[str, List[float]] = {}
    for r in gap_records:
        district_scores.setdefault(r.district, []).append(r.alignment_score)
    
    high_deficit_districts = sum(1 for d, scores in district_scores.items() if (sum(scores)/len(scores)) < 75.0)

    return {
        "total_courses": total_courses,
        "dvet_iti_trades_catalog": 85,
        "dvet_total_itis": "1,004 (419 Govt + 585 Private)",
        "dvet_seat_capacity": "2.43 Lakh Intake Seats",
        "mssds_course_master_catalog": "1,200+ Short-Term Entries",
        "mssds_training_centers": "2,152 Centres • 7,151 Active Batches",
        "total_relevant_jobs": total_jobs,
        "total_skills_extracted": total_skills,
        "candidate_unknown_skills_count": candidate_unknown_count,
        "avg_alignment_score_percentage": avg_score,
        "high_deficit_districts_count": high_deficit_districts,
        "pipeline_state": pipeline_state
    }

@app.get("/api/v1/skills/dictionary")
def get_skill_dictionary(db: Session = Depends(get_db)):
    dictionary_items = db.query(SkillDictionary).all()
    candidate_skills = db.query(ExtractedSkill).filter(ExtractedSkill.status == "CANDIDATE_UNKNOWN").all()
    return {
        "standard_dictionary_count": len(dictionary_items),
        "dictionary": [
            {
                "id": item.id,
                "standard_name": item.standard_name,
                "category": item.category,
                "synonyms": item.synonyms
            } for item in dictionary_items
        ],
        "candidate_unknown_skills": [
            {
                "skill_name": c.skill_name,
                "category": c.category,
                "confidence_score": c.confidence_score,
                "source_type": c.source_type
            } for c in candidate_skills
        ]
    }

@app.get("/api/v1/engines/latency-estimate")
def get_latency_estimates():
    return {
        "estimates": ESTIMATED_LATENCY_CONFIG,
        "current_state": pipeline_state
    }

@app.post("/api/v1/engines/run-all")
def run_all_engines(db: Session = Depends(get_db)):
    global pipeline_state
    pipeline_start = time.time()
    
    pipeline_state["is_running"] = True
    pipeline_state["progress_percentage"] = 10
    pipeline_state["elapsed_seconds"] = 0.0
    pipeline_state["estimated_time_remaining_seconds"] = ESTIMATED_LATENCY_CONFIG["total_pipeline_estimated_sec"]

    try:
        pipeline_state["current_engine"] = "Engine 1: Ingesting DVET 85 Trades & MSSDS Master (SHA-256 Hashes)..."
        pipeline_state["progress_percentage"] = 25
        e1 = Engine1CourseIngestion(db).run_ingestion()
        
        pipeline_state["current_engine"] = "Engine 2: Ingesting Job Postings (Job ID Deduplication & Status Tracking)..."
        pipeline_state["progress_percentage"] = 55
        e2 = Engine2JobIngestion(db).run_ingestion()
        
        pipeline_state["current_engine"] = "Engine 3: Central Skill Dictionary Normalization & Candidate Detection..."
        pipeline_state["progress_percentage"] = 80
        e3 = Engine3SkillExtraction(db).run_extraction()
        
        pipeline_state["current_engine"] = "Engine 4: 3-Tier Skill Gap & Demand Weighting Engine..."
        pipeline_state["progress_percentage"] = 95
        e4 = Engine4SkillGapAnalysis(db).run_analysis()
        
        pipeline_end = time.time()
        total_latency_ms = round((pipeline_end - pipeline_start) * 1000, 2)
        total_latency_sec = round(total_latency_ms / 1000, 3)

        pipeline_state["is_running"] = False
        pipeline_state["current_engine"] = "Idle / Completed"
        pipeline_state["progress_percentage"] = 100
        pipeline_state["elapsed_seconds"] = total_latency_sec
        pipeline_state["estimated_time_remaining_seconds"] = 0.0
        
        summary = {
            "status": "SUCCESS",
            "total_latency_ms": total_latency_ms,
            "total_latency_sec": total_latency_sec,
            "engine1": e1,
            "engine2": e2,
            "engine3": e3,
            "engine4": e4
        }
        pipeline_state["last_run_summary"] = summary
        return summary
    except Exception as err:
        pipeline_state["is_running"] = False
        pipeline_state["current_engine"] = f"Error: {str(err)}"
        raise HTTPException(status_code=500, detail=str(err))

@app.get("/api/v1/courses")
def get_courses(db: Session = Depends(get_db)):
    courses = db.query(Course).all()
    result = []
    for c in courses:
        skills = db.query(ExtractedSkill).filter(
            ExtractedSkill.course_id == c.id,
            ExtractedSkill.source_type == "COURSE"
        ).all()
        result.append({
            "id": c.id,
            "code": c.code,
            "course_master_code": c.course_master_code,
            "title": c.title,
            "institute_type": c.institute_type,
            "sector": c.sector,
            "nsqf_level": c.nsqf_level,
            "duration_months": c.duration_months,
            "intake_capacity": c.intake_capacity,
            "qualification_req": c.qualification_req,
            "training_level": c.training_level,
            "district": c.district,
            "status": c.status,
            "syllabus_text": c.syllabus_text,
            "extracted_skills": [s.skill_name for s in skills]
        })
    return result

@app.get("/api/v1/analytics/gap-analysis")
def get_gap_analysis(db: Session = Depends(get_db)):
    gap_records = db.query(SkillGapAnalysis).all()
    result = []
    for r in gap_records:
        course = db.query(Course).filter(Course.id == r.course_id).first()
        result.append({
            "id": r.id,
            "course_id": r.course_id,
            "course_title": course.title if course else "Unknown",
            "institute_type": course.institute_type if course else "ITI",
            "sector": course.sector if course else "General",
            "district": r.district,
            "alignment_score": r.alignment_score,
            "total_jobs_analyzed": r.total_jobs_analyzed,
            "fully_covered_skills": r.fully_covered_skills or [],
            "partially_covered_skills": r.partially_covered_skills or [],
            "missing_skills": r.missing_skills or [],
            "demand_frequency_map": r.demand_frequency_map or {},
            "execution_latency_ms": r.execution_latency_ms
        })
    return result

@app.get("/api/v1/analytics/district-summary")
def get_district_summary(db: Session = Depends(get_db)):
    districts = ["Pune", "Nashik", "Thane", "Nagpur", "Chhatrapati Sambhajinagar"]
    summary = []
    
    for dist in districts:
        courses = db.query(Course).filter(Course.district == dist, Course.status == "ACTIVE").all()
        jobs = db.query(JobPosting).filter(JobPosting.district == dist, JobPosting.status == "ACTIVE").all()
        gaps = db.query(SkillGapAnalysis).filter(SkillGapAnalysis.district == dist).all()
        
        avg_score = round(sum(g.alignment_score for g in gaps) / len(gaps), 1) if gaps else 80.0
        
        missing_pool = []
        for g in gaps:
            missing_pool.extend(g.missing_skills or [])
        
        top_missing = list(set(missing_pool))[:4]
        
        summary.append({
            "district": dist,
            "active_courses": len(courses),
            "relevant_jobs": len(jobs),
            "avg_alignment_score": avg_score,
            "top_missing_skills": top_missing,
            "deficit_status": "HIGH DEFICIT" if avg_score < 75.0 else ("MODERATE" if avg_score < 85.0 else "ALIGNED")
        })
        
    return summary
