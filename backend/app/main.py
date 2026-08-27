import time
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from collections import defaultdict
from typing import Dict, List, Any, Optional

from app.config import settings
from app.db.database import engine, Base, get_db
from app.db.models import Course, JobPosting, ExtractedSkill, SkillGapAnalysis, SkillDictionary, BridgePackRecommendation
from app.engines.engine1_course_ingestion import Engine1CourseIngestion
from app.engines.engine2_job_ingestion import Engine2JobIngestion
from app.engines.engine3_skill_extraction import Engine3SkillExtraction
from app.engines.engine4_skill_gap import Engine4SkillGapAnalysis
from app.engines.engine5_llm_bridge import Engine5LLMBridgePack
from app.crawler.async_crawler import run_full_async_crawl, get_crawler_status

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
    "engine3": {"name": "Engine 3: Skill Extraction & Normalization", "estimated_sec": 0.50},
    "engine4": {"name": "Engine 4: 3-Tier Skill Gap Analysis", "estimated_sec": 0.30},
    "total_pipeline_estimated_sec": 1.55
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
    iti_courses = db.query(Course).filter(Course.status == "ACTIVE", Course.institute_type == "ITI").count()
    mssds_courses = db.query(Course).filter(Course.status == "ACTIVE", Course.institute_type == "MSSDS").count()

    total_jobs = db.query(JobPosting).filter(JobPosting.status == "ACTIVE").count()
    total_skills = db.query(ExtractedSkill).count()
    candidate_unknown_count = db.query(ExtractedSkill).filter(ExtractedSkill.status == "CANDIDATE_UNKNOWN").count()

    gap_records = db.query(SkillGapAnalysis).all()
    avg_score = round(sum(r.alignment_score for r in gap_records) / len(gap_records)) if gap_records else 0

    district_scores: Dict[str, List[float]] = {}
    for r in gap_records:
        district_scores.setdefault(r.district, []).append(r.alignment_score)

    high_deficit_districts = sum(
        1 for d, scores in district_scores.items()
        if (sum(scores) / len(scores)) < 75.0
    )

    return {
        "total_courses": total_courses,
        "total_catalogue_courses": total_courses,
        "remaining_in_catalogue": max(0, 547 - total_courses),
        "iti_courses_count": iti_courses,
        "mssds_courses_count": mssds_courses,
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

@app.post("/api/v1/engines/run-batch")
def run_batch_engine(batch_size: int = 50, db: Session = Depends(get_db)):
    """
    Ingest and analyze a batch of N new courses and jobs into the SQLite DB.
    """
    global pipeline_state
    pipeline_start = time.time()

    try:
        e1 = Engine1CourseIngestion(db).run_ingestion(limit=batch_size)
        e2 = Engine2JobIngestion(db).run_ingestion(limit=batch_size)
        e3 = Engine3SkillExtraction(db).run_extraction()
        e4 = Engine4SkillGapAnalysis(db).run_analysis()

        pipeline_end = time.time()
        total_latency_ms = round((pipeline_end - pipeline_start) * 1000, 2)

        total_courses_db = db.query(Course).filter(Course.status == "ACTIVE").count()
        total_jobs_db = db.query(JobPosting).filter(JobPosting.status == "ACTIVE").count()
        remaining_courses = max(0, 547 - total_courses_db)
        remaining_jobs = max(0, 500 - total_jobs_db)

        return {
            "status": "SUCCESS",
            "batch_size": batch_size,
            "courses_added_in_batch": e1.get("courses_added", 0),
            "jobs_added_in_batch": e2.get("jobs_added", 0),
            "total_courses_in_db": total_courses_db,
            "total_jobs_in_db": total_jobs_db,
            "remaining_in_catalogue": remaining_courses,
            "remaining_jobs_in_catalogue": remaining_jobs,
            "total_latency_ms": total_latency_ms,
            "engine1": e1,
            "engine2": e2,
            "engine3": e3,
            "engine4": e4
        }
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))

@app.post("/api/v1/engines/run-all")
def run_all_engines(db: Session = Depends(get_db)):
    global pipeline_state
    pipeline_start = time.time()

    pipeline_state["is_running"] = True
    pipeline_state["progress_percentage"] = 10
    pipeline_state["elapsed_seconds"] = 0.0
    pipeline_state["estimated_time_remaining_seconds"] = ESTIMATED_LATENCY_CONFIG["total_pipeline_estimated_sec"]

    try:
        pipeline_state["current_engine"] = "Engine 1: Ingesting DVET 85 Trades & MSSDS Master (District-Specialised)..."
        pipeline_state["progress_percentage"] = 25
        e1 = Engine1CourseIngestion(db).run_ingestion(limit=50)

        pipeline_state["current_engine"] = "Engine 2: Ingesting Job Postings (Trade-Realistic Recency Weights)..."
        pipeline_state["progress_percentage"] = 50
        e2 = Engine2JobIngestion(db).run_ingestion()

        pipeline_state["current_engine"] = "Engine 3: Skill Extraction, Synonym Normalization & N-Gram Discovery..."
        pipeline_state["progress_percentage"] = 75
        e3 = Engine3SkillExtraction(db).run_extraction()

        pipeline_state["current_engine"] = "Engine 4: SAI-V2 Skill Gap Analysis (Sub-Domain Partial Credit)..."
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
    """
    Return all courses with their extracted skills.
    Fix I4: Uses a single bulk query instead of N+1 individual queries.
    """
    courses = db.query(Course).all()

    # Bulk fetch all course skills in ONE query (fixes I4 — no more N+1)
    all_course_skills = db.query(ExtractedSkill).filter(
        ExtractedSkill.source_type == "COURSE"
    ).all()

    # Index by course_id in RAM
    skills_by_course: Dict[int, List[str]] = defaultdict(list)
    for s in all_course_skills:
        if s.course_id:
            skills_by_course[s.course_id].append(s.skill_name)

    result = []
    for c in courses:
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
            "extracted_skills": skills_by_course[c.id]
        })
    return result

@app.get("/api/v1/analytics/gap-analysis")
def get_gap_analysis(db: Session = Depends(get_db)):
    gap_records = db.query(SkillGapAnalysis).all()

    # Bulk fetch all courses in ONE query
    course_map: Dict[int, Course] = {c.id: c for c in db.query(Course).all()}

    result = []
    for r in gap_records:
        course = course_map.get(r.course_id)
        result.append({
            "id": r.id,
            "course_id": r.course_id,
            "course_title": course.title if course else "Unknown",
            "institute_type": course.institute_type if course else "ITI",
            "sector": course.sector if course else "General",
            "district": r.district,
            "alignment_score": r.alignment_score,
            "total_jobs_analyzed": r.total_jobs_analyzed,
            "core_skill_coverage_pct": r.core_skill_coverage_pct or 0.0,
            "emerging_skill_coverage_pct": r.emerging_skill_coverage_pct or 0.0,
            "fully_covered_skills": r.fully_covered_skills or [],
            "partially_covered_skills": r.partially_covered_skills or [],
            "missing_skills": r.missing_skills or [],
            "demand_frequency_map": r.demand_frequency_map or {},
            "detailed_skills_breakdown": r.detailed_skills_breakdown or {},
            "top_skill_gaps": r.top_skill_gaps or [],
            "execution_latency_ms": r.execution_latency_ms
        })
    return result

@app.get("/api/v1/analytics/gap-analysis/top-deficits")
def get_top_skill_deficits(limit: int = 10, db: Session = Depends(get_db)):
    """
    Aggregate the top missing skills state-wide from live DB data.
    Used by the dashboard to replace hardcoded deficit cards (fixes D8).
    """
    gap_records = db.query(SkillGapAnalysis).all()

    skill_job_counts: Dict[str, int] = defaultdict(int)
    skill_employer_counts: Dict[str, set] = defaultdict(set)
    skill_categories: Dict[str, str] = defaultdict(lambda: "Technical Skills")
    total_courses = max(1, len(gap_records))

    for gap in gap_records:
        for gap_item in (gap.top_skill_gaps or []):
            skill = gap_item.get("skill", "")
            if not skill:
                continue
            skill_job_counts[skill] += gap_item.get("job_count", 1)
            skill_categories[skill] = gap_item.get("category", "Technical Skills")
            # Estimate unique employers from employer_count field
            for i in range(gap_item.get("employer_count", 1)):
                skill_employer_counts[skill].add(f"employer_{i}")

    # Sort by frequency across all gap analyses
    sorted_deficits = sorted(
        skill_job_counts.items(), key=lambda x: x[1], reverse=True
    )[:limit]

    return [
        {
            "skill": skill,
            "category": skill_categories[skill],
            "total_job_occurrences": count,
            "unique_employer_count": len(skill_employer_counts[skill]),
            "demand_pct": round((count / total_courses) * 100, 1),
        }
        for skill, count in sorted_deficits
    ]

@app.get("/api/v1/analytics/district-summary")
def get_district_summary(db: Session = Depends(get_db)):
    """
    Returns summary for ALL districts with active courses in DB.
    Fix D6: no longer hardcoded to only 5 districts.
    """
    # Get all distinct districts from DB dynamically
    distinct_districts = [
        row[0] for row in
        db.query(Course.district).filter(Course.status == "ACTIVE").distinct().all()
        if row[0]
    ]

    # Bulk fetch all courses, jobs, and gap records in 3 queries total
    all_courses = db.query(Course).filter(Course.status == "ACTIVE").all()
    all_jobs = db.query(JobPosting).filter(JobPosting.status == "ACTIVE").all()
    all_gaps = db.query(SkillGapAnalysis).all()

    # Index into dicts
    courses_by_district: Dict[str, List] = defaultdict(list)
    for c in all_courses:
        if c.district:
            courses_by_district[c.district].append(c)

    jobs_by_district: Dict[str, List] = defaultdict(list)
    for j in all_jobs:
        if j.district:
            jobs_by_district[j.district].append(j)

    gaps_by_district: Dict[str, List] = defaultdict(list)
    for g in all_gaps:
        if g.district:
            gaps_by_district[g.district].append(g)

    summary = []
    for dist in sorted(distinct_districts):
        gaps = gaps_by_district[dist]
        avg_score = (
            round(sum(g.alignment_score for g in gaps) / len(gaps), 1)
            if gaps else 0.0
        )

        # Aggregate top missing skills for this district
        missing_pool: List[str] = []
        for g in gaps:
            missing_pool.extend(g.missing_skills or [])

        # Count frequency to get most-common missing skills
        freq: Dict[str, int] = defaultdict(int)
        for s in missing_pool:
            freq[s] += 1
        top_missing = [
            s for s, _ in sorted(freq.items(), key=lambda x: x[1], reverse=True)
        ][:4]

        summary.append({
            "district": dist,
            "active_courses": len(courses_by_district[dist]),
            "relevant_jobs": len(jobs_by_district[dist]),
            "avg_alignment_score": avg_score,
            "top_missing_skills": top_missing,
            "deficit_status": (
                "HIGH DEFICIT" if avg_score < 65.0
                else ("MODERATE" if avg_score < 80.0 else "ALIGNED")
            )
        })

    return summary

# ─── Phase 3: LLM Bridge Pack Routes ──────────────────────────────────────────

@app.get("/api/v1/recommendations/bridge-pack/{course_id}")
def get_bridge_pack(course_id: int, db: Session = Depends(get_db)):
    """Get (or generate) a 20-hour Skill Bridge Pack for a course's missing skills."""
    engine5 = Engine5LLMBridgePack(db)
    return engine5.generate_for_course(course_id)

@app.post("/api/v1/recommendations/bridge-pack/{course_id}/generate")
def generate_bridge_pack(course_id: int, db: Session = Depends(get_db)):
    """Force regenerate the bridge pack for a course (re-calls LLM if API key set)."""
    engine5 = Engine5LLMBridgePack(db)
    return engine5.generate_for_course(course_id)

@app.post("/api/v1/recommendations/generate-all")
def generate_all_bridge_packs(db: Session = Depends(get_db)):
    """Generate bridge packs for all courses with missing skills."""
    engine5 = Engine5LLMBridgePack(db)
    return engine5.generate_for_all_courses()

@app.get("/api/v1/recommendations/all")
def get_all_bridge_packs(db: Session = Depends(get_db)):
    """List all saved bridge pack recommendations."""
    packs = db.query(BridgePackRecommendation).all()
    return [
        {
            "id": p.id,
            "course_id": p.course_id,
            "missing_skill": p.missing_skill,
            "module_title": p.module_title,
            "skill_targeted": p.skill_targeted,
            "duration_hours": p.duration_hours,
            "activities": p.activities,
            "assessment_criteria": p.assessment_criteria,
            "tools_required": p.tools_required,
            "nsqf_level": p.nsqf_level,
            "generated_by": p.generated_by,
            "generated_at": p.generated_at.isoformat() if p.generated_at else None
        }
        for p in packs
    ]

# ─── Engine 3 Admin: Rebuild Index ────────────────────────────────────────────

@app.post("/api/v1/admin/rebuild-skill-index")
def rebuild_skill_index(db: Session = Depends(get_db)):
    """Hot-reload Engine 3's in-memory regex index after dictionary changes (fixes I5)."""
    e3 = Engine3SkillExtraction(db)
    e3.rebuild_index()
    return {"status": "SUCCESS", "message": "Engine 3 skill index rebuilt successfully."}

# ─── Async Crawler Routes ──────────────────────────────────────────────────────

@app.post("/api/v1/crawler/trigger")
async def trigger_full_crawl():
    """Trigger a full async crawl of all DVET ITI Trades + MSSDS catalogue."""
    result = await run_full_async_crawl(batch_size=10, delay_between_batches_sec=0.1)
    return result

@app.get("/api/v1/crawler/status")
def get_crawl_status():
    """Get current async crawler progress."""
    return get_crawler_status()

# ─── Student Portal API Routes ─────────────────────────────────────────────────

@app.get("/api/v1/student/recommendations")
def get_student_recommendations(
    district: str = "Pune",
    sector: str = None,
    db: Session = Depends(get_db)
):
    """
    Student Portal: Return recommended courses + gap analysis + bridge packs
    filtered by district and optional sector.
    """
    query = db.query(Course).filter(Course.status == "ACTIVE", Course.district == district)
    if sector:
        query = query.filter(Course.sector.ilike(f"%{sector}%"))
    courses = query.limit(10).all()

    recommendations = []
    for course in courses:
        gap = db.query(SkillGapAnalysis).filter(
            SkillGapAnalysis.course_id == course.id
        ).first()
        packs = db.query(BridgePackRecommendation).filter(
            BridgePackRecommendation.course_id == course.id
        ).all()

        recommendations.append({
            "course_id": course.id,
            "course_title": course.title,
            "institute_type": course.institute_type,
            "sector": course.sector,
            "district": course.district,
            "duration_months": course.duration_months,
            "nsqf_level": course.nsqf_level,
            "qualification_req": course.qualification_req,
            "alignment_score": gap.alignment_score if gap else 0,
            "missing_skills": gap.missing_skills if gap else [],
            "fully_covered_skills": gap.fully_covered_skills if gap else [],
            "bridge_packs_available": len(packs),
            "bridge_packs": [
                {
                    "module_title": p.module_title,
                    "skill_targeted": p.skill_targeted,
                    "duration_hours": p.duration_hours,
                    "activities": p.activities[:2],
                }
                for p in packs
            ]
        })

    return {
        "district": district,
        "sector_filter": sector,
        "total_courses": len(recommendations),
        "recommendations": recommendations
    }

@app.get("/api/v1/student/districts")
def get_available_districts(db: Session = Depends(get_db)):
    """Return list of all districts with active courses."""
    districts = (
        db.query(Course.district)
        .filter(Course.status == "ACTIVE")
        .distinct()
        .all()
    )
    return {"districts": sorted([d[0] for d in districts if d[0]])}

@app.get("/api/v1/student/sectors")
def get_available_sectors(db: Session = Depends(get_db)):
    """Return list of all sectors with active courses."""
    sectors = (
        db.query(Course.sector)
        .filter(Course.status == "ACTIVE")
        .distinct()
        .all()
    )
    return {"sectors": sorted([s[0] for s in sectors if s[0]])}
