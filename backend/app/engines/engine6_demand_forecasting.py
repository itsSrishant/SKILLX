import os
import json
import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.db.models import JobPosting, SkillGapAnalysis, Course

logger = logging.getLogger("Engine6")

class Engine6DemandForecasting:
    def __init__(self, db: Session):
        self.db = db

    def _call_gemini_forecast(self, district: str, jobs: List[JobPosting], missing_skills: List[str]) -> Dict[str, Any]:
        """Call Gemini to predict future skill demand based on current data."""
        keys_env = os.environ.get("GEMINI_API_KEYS", "").strip()
        keys_to_try = [k.strip() for k in keys_env.split(",") if k.strip()]
        single_key = os.environ.get("GEMINI_API_KEY", "").strip()
        if single_key and single_key not in keys_to_try:
            keys_to_try.insert(0, single_key)

        fallback_result = {
            "district": district,
            "emerging_skills": [
                {"skill": "Industrial IoT & PLCs", "confidence": "High", "reasoning": "Strong manufacturing sector shift towards automation."},
                {"skill": "EV Battery Maintenance", "confidence": "Medium", "reasoning": "Emerging automotive sector trends in Maharashtra."}
            ],
            "declining_skills": [
                {"skill": "Manual Lathe Operation", "reasoning": "Replaced by CNC automation."}
            ],
            "recommended_interventions": [
                "Partner with MIDC for PLC training labs."
            ]
        }

        if not keys_to_try:
            logger.warning("No Gemini API key found. Using fallback forecasting data.")
            return fallback_result

        try:
            import google.generativeai as genai
            from google.generativeai.types import HarmCategory, HarmBlockThreshold

            llm_model = os.getenv("LLM_MODEL", "gemini-1.5-flash")
            safety_settings = {
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            }

            system_instruction = f"""You are the official SkillX AI Demand Forecaster for the Government of Maharashtra.
You analyze current job postings and skill gaps in {district} to predict macroeconomic skill trends for the next 12-24 months.

RESPOND STRICTLY WITH VALID JSON ONLY. NO MARKDOWN FORMATTING (NO ```json).
Schema:
{{
  "district": "{district}",
  "emerging_skills": [
    {{"skill": "Skill Name", "confidence": "High/Medium/Low", "reasoning": "1 sentence explanation"}}
  ],
  "declining_skills": [
    {{"skill": "Skill Name", "reasoning": "1 sentence explanation"}}
  ],
  "recommended_interventions": [
    "1 sentence policy recommendation"
  ]
}}
"""
            job_titles = [j.title for j in jobs[:20]]
            user_prompt = f"Data for {district}:\nCurrent Job Postings: {', '.join(job_titles)}\nCurrent Skill Gaps: {', '.join(missing_skills[:15])}"

            models_to_try = [llm_model]
            if llm_model != "gemini-flash-lite-latest":
                models_to_try.append("gemini-flash-lite-latest")

            for api_key in keys_to_try:
                try:
                    genai.configure(api_key=api_key)
                    for current_model in models_to_try:
                        try:
                            model = genai.GenerativeModel(
                                model_name=current_model,
                                system_instruction=system_instruction,
                                safety_settings=safety_settings,
                            )
                            response = model.generate_content(user_prompt)
                            if response and response.text:
                                text = response.text.strip()
                                if text.startswith("```json"):
                                    text = text[7:]
                                if text.startswith("```"):
                                    text = text[3:]
                                if text.endswith("```"):
                                    text = text[:-3]
                                text = text.strip()
                                return json.loads(text)
                        except Exception as inner_e:
                            logger.warning(f"Engine 6 Gemini attempt with model {current_model} failed: {inner_e}")
                            continue
                except Exception as e:
                    logger.warning(f"Gemini forecast call failed with key: {e}")
                    continue

            return fallback_result
        except Exception as e:
            logger.error(f"Gemini library error in Engine6: {e}")
            return fallback_result

    def generate_forecast(self, district: str) -> Dict[str, Any]:
        """Generates a predictive forecast for a district."""
        # 1. Get district context
        if district == "Maharashtra":
            jobs = self.db.query(JobPosting).filter(JobPosting.status == "ACTIVE").all()
            courses = self.db.query(Course).filter(Course.status == "ACTIVE").all()
        else:
            jobs = self.db.query(JobPosting).filter(
                JobPosting.status == "ACTIVE",
                JobPosting.district == district
            ).all()
            
            courses = self.db.query(Course).filter(
                Course.status == "ACTIVE",
                Course.district == district
            ).all()
        course_ids = [c.id for c in courses]
        
        gaps = self.db.query(SkillGapAnalysis).filter(
            SkillGapAnalysis.course_id.in_(course_ids)
        ).all()
        
        all_missing = []
        for g in gaps:
            all_missing.extend(g.missing_skills or [])
            
        # Deduplicate and sort by frequency (mock logic for simplicity)
        from collections import Counter
        missing_freq = Counter(all_missing)
        top_missing = [item[0] for item in missing_freq.most_common(15)]
        
        return self._call_gemini_forecast(district, jobs, top_missing)
