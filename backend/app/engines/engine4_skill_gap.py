"""
Engine 4: Deterministic SAI-V2 Hybrid Alignment Scoring Engine
Calculates curriculum-to-industry alignment incorporating:
- Employer diversity dampener: log2(1+N_postings) * (1+log2(N_employers))
- Skill importance weights: Core (1.0), Emerging (1.25), Generic (0.30)
- Skill depth & confidence metrics
- Explainable sub-scores & evidence strength
"""

import math
import time
import logging
from typing import Dict, Any, List
from collections import defaultdict
from sqlalchemy.orm import Session
from app.db.models import Course, JobPosting, ExtractedSkill, SkillGapAnalysis

logger = logging.getLogger("Engine4_SkillGap")

class Engine4SkillGapAnalysis:
    def __init__(self, db: Session):
        self.db = db

    def run_analysis(self) -> Dict[str, Any]:
        start_time = time.time()

        # Step 1: Bulk fetch courses, job postings, and extracted skills
        courses = self.db.query(Course).all()
        job_postings = self.db.query(JobPosting).all()
        extracted_skills = self.db.query(ExtractedSkill).all()

        total_jobs_in_pool = max(1, len(job_postings))

        # Index skills by course_id and job_posting_id
        course_skills_map = defaultdict(set)
        course_skill_confidence_map = defaultdict(dict)
        job_skills_map = defaultdict(list)

        for es in extracted_skills:
            if es.source_type == "COURSE" and es.course_id:
                course_skills_map[es.course_id].add(es.skill_name)
                course_skill_confidence_map[es.course_id][es.skill_name] = es.confidence_score or 0.95
            elif es.source_type == "JOB" and es.job_posting_id:
                job_skills_map[es.job_posting_id].append({
                    "name": es.skill_name,
                    "category": es.category,
                    "confidence": es.confidence_score or 0.95
                })

        # Calculate demand frequencies and employer diversity per skill
        skill_job_counts = defaultdict(int)
        skill_employers_map = defaultdict(set)
        skill_recency_sum = defaultdict(float)
        skill_category_map = {}

        for job in job_postings:
            job_skills = job_skills_map[job.id]
            seen_in_job = set()
            for item in job_skills:
                sname = item["name"]
                skill_category_map[sname] = item["category"]
                if sname not in seen_in_job:
                    seen_in_job.add(sname)
                    skill_job_counts[sname] += 1
                    skill_employers_map[sname].add(job.company)
                    skill_recency_sum[sname] += (job.recency_weight or 1.0)

        # Clear existing analysis table
        self.db.query(SkillGapAnalysis).delete()
        self.db.commit()

        analyses_created = 0

        for course in courses:
            c_skills = course_skills_map[course.id]
            c_conf = course_skill_confidence_map[course.id]

            # Filter jobs matching sector or trade
            relevant_jobs = [
                j for j in job_postings
                if j.district == course.district or j.sector == course.sector or j.relevant_trade == course.title
            ]
            if not relevant_jobs:
                relevant_jobs = job_postings  # Fallback to state-wide market pool

            # Re-index regional demand for this course's market pool
            regional_skill_jobs = defaultdict(int)
            regional_skill_employers = defaultdict(set)

            for j in relevant_jobs:
                for item in job_skills_map[j.id]:
                    sname = item["name"]
                    regional_skill_jobs[sname] += 1
                    regional_skill_employers[sname].add(j.company)

            total_demand_weight = 0.0
            earned_coverage_weight = 0.0
            
            exact_match_score = 0.0
            semantic_match_score = 0.0
            practical_coverage_score = 0.0

            core_demanded_count = 0
            core_covered_count = 0
            emerging_demanded_count = 0
            emerging_covered_count = 0

            fully_covered = []
            partially_covered = []
            missing_skills = []
            demand_freq_map = {}
            detailed_breakdown = {}
            top_gaps = []

            for sname, n_postings in regional_skill_jobs.items():
                cat = skill_category_map.get(sname, "Technical Skills")
                n_employers = max(1, len(regional_skill_employers[sname]))

                # Logarithmic spam dampener & employer diversity multiplier
                w_demand = (math.log2(1 + n_postings)) * (1.0 + math.log2(n_employers))
                
                # Category importance weight
                if cat == "Emerging Skills":
                    w_importance = 1.25
                    emerging_demanded_count += 1
                elif cat in ["Generic Skills", "Soft Skills"]:
                    w_importance = 0.30
                else:
                    w_importance = 1.0  # Core Trade & Technical Skills
                    core_demanded_count += 1

                step_weight = w_demand * w_importance
                total_demand_weight += step_weight

                demand_pct = round((n_postings / max(1, len(relevant_jobs))) * 100, 1)
                demand_freq_map[sname] = f"{demand_pct}% ({n_postings} jobs, {n_employers} companies)"

                if sname in c_skills:
                    # Full exact match credit
                    coverage_credit = 1.0 * c_conf.get(sname, 0.95)
                    earned_coverage_weight += (step_weight * coverage_credit)
                    fully_covered.append(sname)
                    
                    if cat == "Emerging Skills":
                        emerging_covered_count += 1
                    elif cat == "Technical Skills":
                        core_covered_count += 1

                    detailed_breakdown[sname] = {
                        "status": "FULLY_COVERED",
                        "demand_weight": round(w_demand, 2),
                        "importance_weight": w_importance,
                        "coverage_credit": round(coverage_credit, 2),
                        "employers_count": n_employers
                    }
                else:
                    # Check for partial category match
                    has_partial = any(
                        skill_category_map.get(cs) == cat for cs in c_skills
                    )
                    if has_partial:
                        coverage_credit = 0.50
                        earned_coverage_weight += (step_weight * coverage_credit)
                        partially_covered.append(sname)
                        detailed_breakdown[sname] = {
                            "status": "PARTIALLY_COVERED",
                            "demand_weight": round(w_demand, 2),
                            "importance_weight": w_importance,
                            "coverage_credit": 0.50,
                            "employers_count": n_employers
                        }
                    else:
                        missing_skills.append(sname)
                        detailed_breakdown[sname] = {
                            "status": "MISSING",
                            "demand_weight": round(w_demand, 2),
                            "importance_weight": w_importance,
                            "coverage_credit": 0.0,
                            "employers_count": n_employers
                        }
                        top_gaps.append({
                            "skill": sname,
                            "category": cat,
                            "demand_pct": demand_pct,
                            "job_count": n_postings,
                            "employer_count": n_employers,
                            "severity": "HIGH" if w_importance >= 1.0 and n_postings > 2 else "MEDIUM"
                        })

            # Calculate final alignment percentage (0 to 100%)
            final_alignment_score = 0.0
            if total_demand_weight > 0:
                final_alignment_score = round((earned_coverage_weight / total_demand_weight) * 100, 1)

            core_cov_pct = round((core_covered_count / max(1, core_demanded_count)) * 100, 1)
            emerging_cov_pct = round((emerging_covered_count / max(1, emerging_demanded_count)) * 100, 1)

            # Sort top gaps by severity and job count
            top_gaps.sort(key=lambda x: x["job_count"], reverse=True)

            gap_record = SkillGapAnalysis(
                course_id=course.id,
                district=course.district,
                alignment_score=min(100.0, max(0.0, final_alignment_score)),
                total_jobs_analyzed=len(relevant_jobs),
                core_skill_coverage_pct=core_cov_pct,
                emerging_skill_coverage_pct=emerging_cov_pct,
                fully_covered_skills=fully_covered,
                partially_covered_skills=partially_covered,
                missing_skills=missing_skills,
                demand_frequency_map=demand_freq_map,
                detailed_skills_breakdown=detailed_breakdown,
                top_skill_gaps=top_gaps[:5],
                execution_latency_ms=round((time.time() - start_time) * 1000, 2)
            )
            self.db.add(gap_record)
            analyses_created += 1

        self.db.commit()
        latency = round((time.time() - start_time) * 1000, 2)

        return {
            "status": "SUCCESS",
            "courses_analyzed": len(courses),
            "jobs_analyzed": len(job_postings),
            "analyses_created": analyses_created,
            "latency_ms": latency
        }
