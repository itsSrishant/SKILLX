from app.db.database import SessionLocal
from app.engines.engine1_course_ingestion import Engine1CourseIngestion
from app.engines.engine2_job_ingestion import Engine2JobIngestion
from app.engines.engine3_skill_extraction import Engine3SkillExtraction
from app.engines.engine4_skill_gap import Engine4SkillGapAnalysis

db = SessionLocal()
try:
    print("Running E1")
    Engine1CourseIngestion(db).run_ingestion(limit=50)
    print("Running E2")
    Engine2JobIngestion(db).run_ingestion()
    print("Running E3")
    Engine3SkillExtraction(db).run_extraction()
    print("Running E4")
    Engine4SkillGapAnalysis(db).run_analysis()
except Exception as e:
    import traceback
    traceback.print_exc()
