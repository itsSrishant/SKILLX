import sys
import os
import json

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.database import Base, engine, SessionLocal
from app.engines.engine1_course_ingestion import Engine1CourseIngestion
from app.engines.engine2_job_ingestion import Engine2JobIngestion
from app.engines.engine3_skill_extraction import Engine3SkillExtraction
from app.engines.engine4_skill_gap import Engine4SkillGapAnalysis

def test_pipeline():
    print("=== TESTING SKILLX BACKEND ENGINE PIPELINE IN REAL LIFE ===")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        print("\n--> Running Engine 1: Course Ingestion...")
        e1_res = Engine1CourseIngestion(db).run_ingestion()
        print(f"Result Engine 1: {json.dumps(e1_res, indent=2)}")

        print("\n--> Running Engine 2: Job Ingestion...")
        e2_res = Engine2JobIngestion(db).run_ingestion()
        print(f"Result Engine 2: {json.dumps(e2_res, indent=2)}")

        print("\n--> Running Engine 3: Skill Extraction (Zero-API NLP)...")
        e3_res = Engine3SkillExtraction(db).run_extraction()
        print(f"Result Engine 3: {json.dumps(e3_res, indent=2)}")

        print("\n--> Running Engine 4: Skill Gap Analysis...")
        e4_res = Engine4SkillGapAnalysis(db).run_analysis()
        print(f"Result Engine 4: {json.dumps(e4_res, indent=2)}")

        print("\n✅ PIPELINE TEST SUCCESSFUL! ALL ENGINES OPERATING IRL.")
    finally:
        db.close()

if __name__ == "__main__":
    test_pipeline()
