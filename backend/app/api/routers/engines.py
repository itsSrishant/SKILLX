import time
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Security
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, List, Any, Optional

from app.db.database import get_db
from app.db.models import Course, JobPosting, ExtractedSkill, SkillGapAnalysis, SkillDictionary, BridgePackRecommendation
from app.engines.engine1_course_ingestion import Engine1CourseIngestion
from app.engines.engine2_job_ingestion import Engine2JobIngestion
from app.engines.engine3_skill_extraction import Engine3SkillExtraction
from app.engines.engine4_skill_gap import Engine4SkillGapAnalysis
from app.engines.engine5_llm_bridge import Engine5LLMBridgePack
from app.crawler.async_crawler import run_full_async_crawl, get_crawler_status
from app.api.dependencies import verify_admin_key

router = APIRouter(tags=['engines'])


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


