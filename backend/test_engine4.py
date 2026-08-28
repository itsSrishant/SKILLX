from app.db.database import SessionLocal
from app.engines.engine4_skill_gap import Engine4SkillGapAnalysis
db = SessionLocal()
e4 = Engine4SkillGapAnalysis(db)
e4.run_analysis()
