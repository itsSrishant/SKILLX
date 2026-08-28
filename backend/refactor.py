import re
import os

with open('backend/app/main.py', 'r') as f:
    content = f.read()

# Define the sections and their route prefixes
sections = {
    'health': ['/api/v1/health', '/'],
    'analytics': ['/api/v1/metrics/overview', '/api/v1/analytics', '/api/v1/districts', '/api/v1/skills'],
    'engines': ['/api/v1/engines'],
    'courses': ['/api/v1/courses'],
    'recommendations': ['/api/v1/recommendations'],
    'admin': ['/api/v1/admin', '/api/v1/crawler'],
    'student': ['/api/v1/student']
}

# we need to find all @app.route functions.
import ast

class RouteExtractor(ast.NodeVisitor):
    def __init__(self, source):
        self.source = source
        self.routes = []
        self.lines = source.split('\n')

    def visit_FunctionDef(self, node):
        for decorator in node.decorator_list:
            if isinstance(decorator, ast.Call) and isinstance(decorator.func, ast.Attribute) and decorator.func.value.id == 'app':
                # It's an @app.get/post etc.
                if decorator.args:
                    path = decorator.args[0].value
                    start = node.lineno - len(node.decorator_list)
                    end = node.end_lineno
                    self.routes.append((path, start, end))
        self.generic_visit(node)

tree = ast.parse(content)
extractor = RouteExtractor(content)
extractor.visit(tree)

imports = """import time
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

"""

router_files = {k: imports + f"router = APIRouter(tags=['{k}'])\n\n" for k in sections.keys()}
lines = content.split('\n')

# Move pipeline_state and ESTIMATED_LATENCY_CONFIG to engines
for r in extractor.routes:
    path = r[0]
    func_lines = lines[r[1]-1:r[2]]
    
    # replace @app.get(...) with @router.get(...)
    for i, line in enumerate(func_lines):
        if line.startswith('@app.'):
            if 'admin' in path or 'engines' in path or 'recommendations/generate' in path or 'crawler/trigger' in path:
                if 'run-batch' in path or 'run-all' in path or 'generate' in path or 'admin' in path or 'trigger' in path:
                    # Add dependency to decorator
                    line = line.replace(')', ', dependencies=[Depends(verify_admin_key)])')
            func_lines[i] = line.replace('@app.', '@router.')
            
    func_code = '\n'.join(func_lines) + '\n\n'
    
    # Assign to proper section
    assigned = False
    for sec, prefixes in sections.items():
        if any(path.startswith(p) for p in prefixes):
            router_files[sec] += func_code
            assigned = True
            break
    if not assigned:
        print("Unassigned:", path)

# Add shared variables to engines.py
shared_vars = """
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
"""

router_files['engines'] = router_files['engines'].replace("router = APIRouter(tags=['engines'])\n\n", "router = APIRouter(tags=['engines'])\n\n" + shared_vars + "\n\n")

# Make analytics import pipeline_state
router_files['analytics'] = router_files['analytics'].replace("from app.db.database", "from app.api.routers.engines import pipeline_state\nfrom app.db.database")

os.makedirs('backend/app/api/routers', exist_ok=True)
for k, v in router_files.items():
    with open(f'backend/app/api/routers/{k}.py', 'w') as f:
        f.write(v)

# Now rewrite main.py
main_py = """import time
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.database import engine, Base, get_db
from app.db.models import Course
from app.engines.engine1_course_ingestion import Engine1CourseIngestion
from app.engines.engine2_job_ingestion import Engine2JobIngestion
from app.engines.engine3_skill_extraction import Engine3SkillExtraction
from app.engines.engine4_skill_gap import Engine4SkillGapAnalysis

from app.api.routers import health, analytics, engines, courses, recommendations, admin, student

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="SkillX Labour Market Intelligence Platform - Backend API"
)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]
# Optionally add production origin
prod_domain = os.getenv("PROD_DOMAIN")
if prod_domain:
    ALLOWED_ORIGINS.append(prod_domain)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def auto_seed_on_startup():
    db = next(get_db())
    try:
        total_c = db.query(Course).count()
        if total_c == 0:
            print("[SkillX Startup] Initializing empty DB with Engine 1-4 pipeline data...")
            Engine1CourseIngestion(db).run_ingestion(limit=50)
            Engine2JobIngestion(db).run_ingestion()
            Engine3SkillExtraction(db).run_extraction()
            Engine4SkillGapAnalysis(db).run_analysis()
            print("[SkillX Startup] Database auto-seeding completed successfully!")
    except Exception as e:
        print(f"[SkillX Startup] Auto-seed warning: {e}")
    finally:
        db.close()

app.include_router(health.router)
app.include_router(analytics.router)
app.include_router(engines.router)
app.include_router(courses.router)
app.include_router(recommendations.router)
app.include_router(admin.router)
app.include_router(student.router)
"""

with open('backend/app/main.py', 'w') as f:
    f.write(main_py)

print("Refactoring completed successfully.")
