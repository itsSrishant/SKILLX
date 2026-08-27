import time
from typing import List, Dict
from sqlalchemy.orm import Session
from app.db.models import Course, JobPosting, ExtractedSkill, SkillGapAnalysis
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Engine4_SkillGapAnalysis")

class Engine4SkillGapAnalysis:
    """
    Engine 4: Advanced Skill Gap Analysis Engine
    - 3-Tier Coverage Classification (Fully Covered, Partially Covered, Missing).
    - Demand Weighting & Recency Weighting (Active jobs vs Expired historical jobs).
    - Skill Demand Frequency Percentage Map per District/Sector.
    """
    def __init__(self, db: Session):
        self.db = db

    def run_analysis(self) -> dict:
        start_time = time.time()
        logger.info("Starting Engine 4: Advanced Skill Gap Analysis Pipeline...")

        self.db.query(SkillGapAnalysis).delete()

        active_courses = self.db.query(Course).filter(Course.status == "ACTIVE").all()
        analyses_generated = 0
        total_score_sum = 0.0

        for course in active_courses:
            c_start = time.time()

            # 1. Fetch skills extracted for this course
            course_skill_entities = self.db.query(ExtractedSkill).filter(
                ExtractedSkill.course_id == course.id,
                ExtractedSkill.source_type == "COURSE"
            ).all()
            course_skill_names = set(s.skill_name for s in course_skill_entities)

            # 2. Fetch active & relevant job postings for this trade/sector
            relevant_jobs = self.db.query(JobPosting).filter(
                (JobPosting.relevant_trade == course.title) | (JobPosting.sector == course.sector),
                JobPosting.status == "ACTIVE"
            ).all()

            if not relevant_jobs:
                relevant_jobs = self.db.query(JobPosting).filter(JobPosting.status == "ACTIVE").all()

            # 3. Calculate Industry Demand Frequency % & Recency Weighting
            job_skill_weights: Dict[str, float] = {}
            job_skill_counts: Dict[str, int] = {}
            total_weighted_jobs = sum(j.recency_weight for j in relevant_jobs) or 1.0

            for job in relevant_jobs:
                j_skills = self.db.query(ExtractedSkill).filter(
                    ExtractedSkill.job_posting_id == job.id,
                    ExtractedSkill.source_type == "JOB"
                ).all()
                for s in j_skills:
                    job_skill_counts[s.skill_name] = job_skill_counts.get(s.skill_name, 0) + 1
                    job_skill_weights[s.skill_name] = job_skill_weights.get(s.skill_name, 0.0) + job.recency_weight

            demand_frequency_map: Dict[str, float] = {}
            for sk, w in job_skill_weights.items():
                demand_frequency_map[sk] = round((w / total_weighted_jobs) * 100, 1)

            all_demanded_skills = set(job_skill_weights.keys())

            # 4. 3-Tier Classification: Fully Covered, Partially Covered, Missing
            fully_covered = []
            partially_covered = []
            missing = []

            for skill in all_demanded_skills:
                if skill in course_skill_names:
                    fully_covered.append(skill)
                elif any(word in skill.lower() for c_sk in course_skill_names for word in c_sk.lower().split() if len(word) > 4):
                    partially_covered.append(skill)
                else:
                    missing.append(skill)

            # 5. Calculate Demand-Weighted Alignment Score
            if all_demanded_skills:
                total_demanded_weight = sum(job_skill_weights.values())
                covered_weight = sum(job_skill_weights[s] for s in fully_covered) + (0.5 * sum(job_skill_weights[s] for s in partially_covered))
                alignment_score = round((covered_weight / total_demanded_weight) * 100, 1)
            else:
                alignment_score = 100.0

            c_end = time.time()
            c_latency = round((c_end - c_start) * 1000, 2)

            gap_record = SkillGapAnalysis(
                course_id=course.id,
                district=course.district,
                alignment_score=alignment_score,
                total_jobs_analyzed=len(relevant_jobs),
                fully_covered_skills=fully_covered,
                partially_covered_skills=partially_covered,
                missing_skills=missing,
                demand_frequency_map=demand_frequency_map,
                execution_latency_ms=c_latency
            )
            self.db.add(gap_record)
            analyses_generated += 1
            total_score_sum += alignment_score

        self.db.commit()
        end_time = time.time()
        latency_ms = round((end_time - start_time) * 1000, 2)

        avg_score = round(total_score_sum / analyses_generated, 1) if analyses_generated > 0 else 0.0
        logger.info(f"Engine 4 Finished in {latency_ms}ms. Analyses: {analyses_generated}, Avg Match Score: {avg_score}%")

        return {
            "engine": "Engine 4: Skill Gap Analysis Engine",
            "status": "COMPLETED",
            "latency_ms": latency_ms,
            "latency_sec": round(latency_ms / 1000, 3),
            "analyses_generated": analyses_generated,
            "avg_alignment_score": avg_score
        }
