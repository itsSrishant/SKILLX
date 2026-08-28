import time
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Security
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, List, Any, Optional

from app.api.routers.engines import pipeline_state
from app.db.database import get_db
from app.db.models import Course, JobPosting, ExtractedSkill, SkillGapAnalysis, SkillDictionary, BridgePackRecommendation
from app.engines.engine1_course_ingestion import Engine1CourseIngestion
from app.engines.engine2_job_ingestion import Engine2JobIngestion
from app.engines.engine3_skill_extraction import Engine3SkillExtraction
from app.engines.engine4_skill_gap import Engine4SkillGapAnalysis
from app.engines.engine5_llm_bridge import Engine5LLMBridgePack
from app.crawler.async_crawler import run_full_async_crawl, get_crawler_status
from app.api.dependencies import verify_admin_key

router = APIRouter(tags=['analytics'])

