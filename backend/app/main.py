import time
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.database import engine, Base, get_db
from app.db.models import Course
from app.engines.engine1_course_ingestion import Engine1CourseIngestion
from app.engines.engine2_job_ingestion import Engine2JobIngestion
from app.engines.engine3_skill_extraction import Engine3SkillExtraction
from app.engines.engine4_skill_gap import Engine4SkillGapAnalysis

from app.api.routers import health, analytics, engines, courses, recommendations, admin, student, assistant
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limiter import limiter

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="SkillX Labour Market Intelligence Platform - Backend API"
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001"
]
prod_domain = os.getenv("PROD_DOMAIN")
if prod_domain:
    ALLOWED_ORIGINS.append(prod_domain)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response

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
app.include_router(assistant.router)
