import os
import json
import time
import logging
import math
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel, Field, constr
from sqlalchemy.orm import Session
from fastapi import Request

from app.db.database import get_db
from app.db.models import Course, SkillGapAnalysis, JobPosting
from app.db.trade_benchmarks import TRADE_RESEARCH_DATA, get_trade_benchmark
from app.core.rate_limiter import limiter
from app.api.dependencies import require_admin, verify_admin_key

logger = logging.getLogger("API_Assistant")

router = APIRouter(prefix="/api/v1/assistant", tags=["assistant"])

# ──────────────────────────────────────────────────────────────────────────────
# IN-MEMORY LLM CACHE (30-minute TTL for demo stability)
# ──────────────────────────────────────────────────────────────────────────────
_llm_cache: Dict[str, Dict[str, Any]] = {}
_LLM_CACHE_TTL = 1800  # 30 minutes

def _cache_get(key: str) -> Optional[str]:
    entry = _llm_cache.get(key)
    if entry and (time.time() - entry["ts"]) < _LLM_CACHE_TTL:
        return entry["val"]
    return None

def _cache_set(key: str, val: str) -> None:
    _llm_cache[key] = {"val": val, "ts": time.time()}


class MessageData(BaseModel):
    role: constr(max_length=10)  # 'user' or 'model'
    content: constr(max_length=2000)

class StudentChatRequest(BaseModel):
    message: constr(strip_whitespace=True, max_length=1000)
    district: Optional[constr(max_length=50)] = "Pune"
    history: Optional[List[MessageData]] = []
    # Enhanced profile context fields
    student_name: Optional[str] = ""
    career_goal: Optional[str] = ""
    current_trade: Optional[str] = ""
    existing_skills: Optional[List[str]] = []
    missing_skills: Optional[List[str]] = []
    roadmap_completed: Optional[List[str]] = []

class GovernmentChatRequest(BaseModel):
    message: constr(strip_whitespace=True, max_length=1000)
    district: Optional[constr(max_length=50)] = "All Districts"
    history: Optional[List[MessageData]] = []

class CourseChatRequest(BaseModel):
    message: constr(strip_whitespace=True, max_length=1000)
    course_title: constr(max_length=200)
    district: Optional[constr(max_length=50)] = "Pune"
    history: Optional[List[MessageData]] = []

class StudentRoadmapRequest(BaseModel):
    career_goal: str
    district: str = "Pune"
    current_trade: Optional[str] = ""
    missing_skills: Optional[List[str]] = []
    existing_skills: Optional[List[str]] = []
    course_title: Optional[str] = ""


def _call_gemini_with_guardrails(
    system_instruction: str,
    user_prompt: str,
    history: Optional[List[Any]] = None,
    temperature: float = 0.7,
) -> Optional[str]:
    """Helper to call Gemini API with configurable temperature and safety settings."""
    keys_env = os.environ.get("GEMINI_API_KEYS", "").strip()
    keys_to_try = [k.strip() for k in keys_env.split(",") if k.strip()]
    single_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if single_key and single_key not in keys_to_try:
        keys_to_try.insert(0, single_key)

    if not keys_to_try:
        return None

    formatted_history = []
    if history:
        for msg in history:
            role = "user" if msg.role == "user" else "model"
            formatted_history.append({"role": role, "parts": [msg.content]})

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

        generation_config = {"temperature": temperature}

        models_to_try = [llm_model]
        if llm_model != "gemini-flash-lite-latest":
            models_to_try.append("gemini-flash-lite-latest")

        for api_key in keys_to_try:
            genai.configure(api_key=api_key)
            for current_model in models_to_try:
                try:
                    model = genai.GenerativeModel(
                        model_name=current_model,
                        system_instruction=system_instruction,
                        generation_config=generation_config,
                        safety_settings=safety_settings,
                    )

                    if formatted_history:
                        chat = model.start_chat(history=formatted_history)
                        response = chat.send_message(user_prompt)
                    else:
                        response = model.generate_content(user_prompt)

                    if response and response.text:
                        return response.text.strip()
                except Exception as e:
                    logger.warning(f"Gemini call failed with model {current_model}: {e}")
                    continue

        return None
    except Exception as e:
        logger.error(f"Gemini library error: {e}")
        return None


# ──────────────────────────────────────────────────────────────────────────────
# PRIORITY SCORE CALCULATION (deterministic, no LLM)
# ──────────────────────────────────────────────────────────────────────────────
def _compute_priority(alignment_score: float, job_count: int, missing_count: int) -> float:
    """Higher score = more urgent. Formula: gap severity × demand volume × missing severity."""
    gap = max(0, 100 - alignment_score)
    demand_factor = math.log10(max(1, job_count) + 1)
    return round(gap * demand_factor * (1 + missing_count * 0.1), 2)

def _priority_label(score: float) -> str:
    if score >= 120:  return "urgent"
    if score >= 60:   return "attention"
    if score >= 20:   return "emerging"
    return "aligned"


# ──────────────────────────────────────────────────────────────────────────────
# 1. Student Portal AI Career Assistant
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/student")
@limiter.limit("20/minute")
def student_chat_assistant(
    request: Request,
    req: StudentChatRequest,
    db: Session = Depends(get_db)
):
    """Personalized student career AI with full profile context injection."""
    district = req.district or "Pune"
    message = req.message.strip()
    name = req.student_name or "there"
    career_goal = req.career_goal or "a skilled trade professional"
    trade = req.current_trade or "vocational trade"
    existing = ", ".join(req.existing_skills[:6]) if req.existing_skills else "not specified"
    missing = ", ".join(req.missing_skills[:6]) if req.missing_skills else "not specified"
    completed = ", ".join(req.roadmap_completed[:4]) if req.roadmap_completed else "none yet"

    # RAG: real courses and benchmark data for district
    courses = db.query(Course).filter(Course.district == district).limit(6).all()
    course_list = [f"{c.title} ({c.institute_type})" for c in courses]

    sample_benchmarks = list(TRADE_RESEARCH_DATA.items())[:4]
    bench_info = [
        f"- {t}: ₹{b['baseline_salary']:,}/mo → ₹{b['upgraded_salary']:,}/mo with bridge pack"
        for t, b in sample_benchmarks
    ]

    # Get top gap for career goal relevance
    gap_data = db.query(SkillGapAnalysis).join(Course).filter(
        Course.district == district
    ).order_by(SkillGapAnalysis.alignment_score.asc()).first()

    system_instruction = f"""You are the SkillX AI Career Coach — a friendly, knowledgeable personal guide for vocational students in Maharashtra.

STUDENT PROFILE (USE THIS TO PERSONALIZE EVERY RESPONSE):
- Name: {name}
- District: {district}
- Current Trade/Course: {trade}
- Career Goal: {career_goal}
- Skills I Already Have: {existing}
- Skills I Still Need: {missing}
- Roadmap Steps Completed: {completed}

REAL DATA FOR {district.upper()} DISTRICT:
- Available Courses: {', '.join(course_list) if course_list else 'Electrician, Fitter, CNC Operator'}
- Salary Benchmarks: {chr(10).join(bench_info)}

RULES:
1. Address the student by name ({name}) when it feels natural.
2. Always relate your advice to their specific career goal ({career_goal}).
3. When suggesting what to learn next, refer to their missing skills: {missing}.
4. Celebrate any completed roadmap steps: {completed}.
5. Use simple, encouraging language. Avoid technical jargon.
6. Keep responses concise — 3-5 sentences for most answers.
7. Always end with one concrete next action.
"""

    user_prompt = f"{name} asks ({district} · targeting {career_goal}): {message}"

    ai_reply = _call_gemini_with_guardrails(system_instruction, user_prompt, history=req.history, temperature=0.65)
    if ai_reply:
        return {"source": "llm-gemini", "district": district, "reply": ai_reply}

    # Fallback
    return {
        "source": "rule-based-fallback",
        "district": district,
        "reply": (
            f"Hi {name}! Based on your goal to become a {career_goal} in {district}, "
            f"I recommend focusing on: {missing}. "
            f"Complete these skills to unlock more job opportunities in {district}'s MIDC clusters."
        )
    }


# ──────────────────────────────────────────────────────────────────────────────
# 2. AI-Generated Student Roadmap
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/student-roadmap")
@limiter.limit("10/minute")
def generate_student_roadmap(
    request: Request,
    req: StudentRoadmapRequest,
    db: Session = Depends(get_db)
):
    """Generates a structured week-by-week personalized learning roadmap."""
    cache_key = f"roadmap:{req.career_goal}:{req.district}:{':'.join(sorted(req.missing_skills or []))}"
    cached = _cache_get(cache_key)
    if cached:
        return {"source": "cached", "roadmap": json.loads(cached)}

    missing_str = ", ".join(req.missing_skills[:6]) if req.missing_skills else "core trade skills"
    existing_str = ", ".join(req.existing_skills[:4]) if req.existing_skills else "basic fundamentals"

    system_instruction = """You are the SkillX AI that generates structured learning roadmaps for vocational students in Maharashtra. 
Always return a valid JSON array and nothing else. No markdown, no explanation text, just the JSON."""

    user_prompt = f"""Generate a 6-week personalized learning roadmap for a student in {req.district}, Maharashtra.

Student profile:
- Career Goal: {req.career_goal}
- Current Trade: {req.current_trade or 'vocational student'}
- Skills they already have: {existing_str}
- Skills they still need: {missing_str}
- Recommended Course: {req.course_title or 'best-fit vocational course'}

Return ONLY a JSON array of exactly 6 objects. Each object must have:
- "week": number (1-6)
- "title": string (short topic title, e.g. "PLC Fundamentals")
- "skill": string (the specific skill being built)
- "hours": number (estimated hours, between 3-8)
- "why": string (ONE sentence explaining why this skill matters for their career goal)
- "activities": array of 2-3 short strings (practical activities)
- "milestone": string (what they can do/prove after this week)
- "status": "completed" | "in_progress" | "upcoming" (all should be "upcoming" except week 1 = "in_progress")

Example format:
[{{"week": 1, "title": "Electrical Fundamentals", "skill": "Basic Wiring", "hours": 5, "why": "Essential foundation for all electrical work in industrial automation.", "activities": ["Wire a simple circuit", "Measure voltage and current", "Safety protocol practice"], "milestone": "Can safely wire a basic control panel", "status": "in_progress"}}]
"""

    ai_reply = _call_gemini_with_guardrails(system_instruction, user_prompt, temperature=0.4)

    roadmap = []
    if ai_reply:
        try:
            # Clean any markdown code blocks if present
            clean = ai_reply.strip()
            if clean.startswith("```"):
                clean = clean.split("```")[1]
                if clean.startswith("json"):
                    clean = clean[4:]
            roadmap = json.loads(clean.strip())
            _cache_set(cache_key, json.dumps(roadmap))
        except Exception as e:
            logger.warning(f"Roadmap JSON parse failed: {e}")

    if not roadmap:
        # Rule-based fallback roadmap from missing skills
        skills = req.missing_skills[:6] if req.missing_skills else ["Core Theory", "Practical Skills", "Safety", "Tools", "Advanced Techniques", "Industry Application"]
        roadmap = [
            {
                "week": i + 1,
                "title": f"{s} Fundamentals" if i < 3 else f"Advanced {s}",
                "skill": s,
                "hours": [5, 4, 4, 6, 5, 4][i],
                "why": f"Essential for becoming a {req.career_goal} — employers in {req.district} actively seek this skill.",
                "activities": ["Theory session", "Hands-on practice", "Assessment quiz"],
                "milestone": f"Can demonstrate {s} competency",
                "status": "in_progress" if i == 0 else "upcoming",
            }
            for i, s in enumerate(skills[:6])
        ]

    return {"source": "llm-gemini" if ai_reply else "rule-based-fallback", "roadmap": roadmap}


# ──────────────────────────────────────────────────────────────────────────────
# 3. Government Admin Dashboard AI Policy Copilot
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/government")
@limiter.limit("50/minute")
def government_chat_assistant(
    request: Request,
    req: GovernmentChatRequest,
    db: Session = Depends(get_db),
    admin_user: str = Depends(verify_admin_key)
):
    """Executive Government Policy AI Copilot with real gap data injection."""
    district = req.district or "All Districts"
    message = req.message.strip()

    # RAG: pull real gap data
    query = db.query(SkillGapAnalysis)
    all_gaps = query.all()
    avg_score = round(sum(g.alignment_score for g in all_gaps) / max(1, len(all_gaps)), 1) if all_gaps else 68.4
    critical_courses = sorted([g for g in all_gaps if g.alignment_score < 60], key=lambda g: g.alignment_score)

    critical_list = []
    for c_gap in critical_courses[:5]:
        c = db.query(Course).filter(Course.id == c_gap.course_id).first()
        if c:
            missing = (c_gap.missing_skills or [])[:3]
            critical_list.append(
                f"- {c.title} ({c.district}): {round(c_gap.alignment_score)}% alignment | "
                f"Missing: {', '.join(missing)} | Jobs analyzed: {c_gap.total_jobs_analyzed}"
            )

    critical_str = "\n".join(critical_list) if critical_list else "- Data being loaded..."

    system_instruction = f"""You are the SkillX Government Policy AI Copilot for Maharashtra DVET & District Officers.
Your role: provide clear, data-backed, plain-English policy recommendations.

REAL MAHARASHTRA SKILL DATA (as of today):
- District Filter: {district}
- State Average Alignment: {avg_score}%
- Courses Needing Urgent Intervention (lowest alignment first):
{critical_str}
- Intervention Cost: ₹45,000 per batch of 30 trainees for a 20-hour NCVET Bridge Pack
- Expected Outcome: +22% average placement rate improvement

RULES:
1. Use plain English. Avoid technical jargon.
2. Base ALL recommendations on the real data provided above.
3. When recommending actions, cite specific courses and districts from the data.
4. Be concise: 3-5 bullet points for most answers.
5. Format with clear markdown headings.
"""

    user_prompt = f"Government Officer Query ({district}): {message}"

    ai_reply = _call_gemini_with_guardrails(system_instruction, user_prompt, history=req.history, temperature=0.3)
    if ai_reply:
        return {"source": "llm-gemini", "district": district, "reply": ai_reply}

    return {
        "source": "rule-based-fallback",
        "district": district,
        "reply": (
            f"**Maharashtra Skill Gap Summary ({district})**\n\n"
            f"- State Average Alignment: **{avg_score}%**\n"
            f"- {len(critical_courses)} courses are critically misaligned with employer needs\n"
            f"- Priority action: Update curricula for the trades listed above with targeted 20-hour modules\n"
            f"- Estimated cost per batch: ₹45,000 for 30 trainees"
        )
    }


# ──────────────────────────────────────────────────────────────────────────────
# 4. Course-Specific AI Assistant
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/course")
@limiter.limit("20/minute")
def course_chat_assistant(
    request: Request,
    req: CourseChatRequest,
    db: Session = Depends(get_db)
):
    """Hyper-personalized AI for a specific ITI course with real gap data."""
    district = req.district or "Pune"
    title = req.course_title or "Course"
    message = req.message.strip()

    # Inject real gap data for this specific course
    course = db.query(Course).filter(
        Course.title.ilike(f"%{title}%"),
        Course.district == district
    ).first()

    gap_context = ""
    if course:
        gap = db.query(SkillGapAnalysis).filter(SkillGapAnalysis.course_id == course.id).first()
        if gap:
            gap_context = (
                f"- Current Alignment Score: {round(gap.alignment_score)}%\n"
                f"- Missing Skills (industry demands but not taught): {', '.join((gap.missing_skills or [])[:5])}\n"
                f"- Skills Well Covered: {', '.join((gap.fully_covered_skills or [])[:4])}\n"
                f"- Jobs Analyzed: {gap.total_jobs_analyzed}\n"
                f"- Top Skill Gap: {(gap.top_skill_gaps or [{}])[0].get('skill', 'N/A') if gap.top_skill_gaps else 'N/A'}"
            )

    system_instruction = f"""You are the SkillX Course Expert AI for "{title}" in {district}, Maharashtra.
You are a knowledgeable mentor who explains this course's strengths and improvement areas in simple terms.

REAL DATA FOR THIS COURSE:
{gap_context if gap_context else '- Course data is being loaded. Provide general guidance.'}

RULES:
1. Be warm, encouraging, and specific to this course.
2. When discussing gaps, explain them in plain English (e.g. "PLC is a type of computer used to control machines — many factories need this skill").
3. Reference actual missing/covered skills from the data above when relevant.
4. Keep answers concise — 3-5 sentences.
"""

    user_prompt = f"Question about {title} in {district}: {message}"

    ai_reply = _call_gemini_with_guardrails(system_instruction, user_prompt, history=req.history, temperature=0.6)
    if ai_reply:
        return {"source": "llm-gemini", "course": title, "reply": ai_reply}

    return {
        "source": "rule-based-fallback",
        "course": title,
        "reply": f"The {title} course in {district} is a strong foundation. Focus on the missing skills identified above to maximize your employability in local MIDC clusters."
    }


# ──────────────────────────────────────────────────────────────────────────────
# 5. Executive Briefing — REAL DATA INJECTED, CACHED
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/executive-briefing")
@limiter.limit("20/minute")
def get_executive_briefing(
    request: Request,
    district: str = "Maharashtra",
    db: Session = Depends(get_db)
):
    """
    Generates a plain-English AI summary of the district's skill gaps.
    Uses REAL alignment data. Results cached for 30 minutes.
    """
    cache_key = f"briefing:{district}"
    cached = _cache_get(cache_key)
    if cached:
        return {"briefing": cached, "source": "cached"}

    # Pull REAL data to inject into prompt
    query = db.query(SkillGapAnalysis).join(Course)
    if district != "Maharashtra":
        query = query.filter(Course.district == district)

    all_gaps = query.all()

    if not all_gaps:
        return {
            "briefing": f"Skill gap analysis for {district} is still being computed. Run the data pipeline to generate insights.",
            "source": "no-data"
        }

    # Compute real stats
    avg_score = round(sum(g.alignment_score for g in all_gaps) / len(all_gaps), 1)
    urgent = [g for g in all_gaps if g.alignment_score < 60]
    attention = [g for g in all_gaps if 60 <= g.alignment_score < 75]
    aligned = [g for g in all_gaps if g.alignment_score >= 75]

    # Top 3 priority courses with actual data
    priority_courses = sorted(all_gaps, key=lambda g: g.alignment_score)[:3]
    priority_details = []
    for g in priority_courses:
        c = db.query(Course).filter(Course.id == g.course_id).first()
        if c:
            top_gaps = (g.missing_skills or [])[:3]
            priority_details.append(
                f"- {c.title} in {c.district}: {round(g.alignment_score)}% alignment, "
                f"missing {', '.join(top_gaps)}"
            )

    # Top missing skills across all courses
    all_missing = {}
    for g in all_gaps:
        for s in (g.missing_skills or []):
            all_missing[s] = all_missing.get(s, 0) + 1
    top_missing = sorted(all_missing.items(), key=lambda x: -x[1])[:5]
    top_missing_str = ", ".join([f"{s} ({n} courses)" for s, n in top_missing])

    real_data_context = f"""
REAL DATA FOR {district.upper()}:
- Total courses analyzed: {len(all_gaps)}
- Average alignment with industry demand: {avg_score}%
- Courses needing urgent action (below 60%): {len(urgent)}
- Courses needing attention (60-75%): {len(attention)}  
- Well-aligned courses (above 75%): {len(aligned)}
- Top 3 priority courses:
{chr(10).join(priority_details)}
- Most common missing skills state-wide: {top_missing_str}
"""

    system_instruction = """You are the SkillX AI Copilot for Maharashtra Government Officials.
Write a 3-sentence executive briefing that a non-technical officer can immediately understand.
RULES: No jargon. No percentages unless necessary. Focus on what needs to change and why it matters for students' jobs. 
Be specific about the trades and skills mentioned in the data. Sound confident and factual, not generic."""

    user_prompt = f"Write an executive briefing for {district} based on this data:\n{real_data_context}"

    ai_reply = _call_gemini_with_guardrails(system_instruction, user_prompt, temperature=0.3)

    if ai_reply:
        _cache_set(cache_key, ai_reply)
        return {"briefing": ai_reply, "source": "llm-gemini"}

    # Fallback using real numbers
    fallback = (
        f"In {district}, {len(urgent)} out of {len(all_gaps)} courses have a significant skills mismatch with what employers are looking for. "
        f"The most critical gaps are in {top_missing_str.split(',')[0] if top_missing else 'automation and digital skills'}. "
        f"Updating the top {min(3, len(urgent))} priority courses could directly improve employment outcomes for thousands of students."
    )
    _cache_set(cache_key, fallback)
    return {"briefing": fallback, "source": "rule-based-fallback"}


# ──────────────────────────────────────────────────────────────────────────────
# 6. Course Action Insight — REAL DATA INJECTED, CACHED
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/course-action-insight")
@limiter.limit("50/minute")
def get_course_action_insight(
    request: Request,
    course_title: str,
    district: str,
    course_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Generates a personalized 2-sentence explanation of why a specific course needs
    updating. Uses REAL skill gap analysis data. Results cached per course.
    """
    cache_key = f"insight:{course_id or course_title}:{district}"
    cached = _cache_get(cache_key)
    if cached:
        return {"insight": cached, "source": "cached"}

    # Pull real gap data for this course
    gap = None
    course = None

    if course_id:
        gap = db.query(SkillGapAnalysis).filter(SkillGapAnalysis.course_id == course_id).first()
        course = db.query(Course).filter(Course.id == course_id).first()
    else:
        course = db.query(Course).filter(
            Course.title.ilike(f"%{course_title}%"),
            Course.district == district
        ).first()
        if course:
            gap = db.query(SkillGapAnalysis).filter(SkillGapAnalysis.course_id == course.id).first()

    if not gap:
        fallback = f"Updating {course_title} in {district} will align the syllabus with current employer needs, improving job placement rates for graduates."
        _cache_set(cache_key, fallback)
        return {"insight": fallback, "source": "no-data"}

    # Build rich context from real data
    missing = (gap.missing_skills or [])[:4]
    covered = (gap.fully_covered_skills or [])[:3]
    top_gap = (gap.top_skill_gaps or [])
    top_gap_skill = top_gap[0].get("skill", missing[0] if missing else "key skills") if top_gap else (missing[0] if missing else "key skills")
    top_gap_demand = top_gap[0].get("demand_pct", 0) if top_gap else 0
    top_gap_jobs = top_gap[0].get("job_count", 0) if top_gap else gap.total_jobs_analyzed

    priority = _priority_label(_compute_priority(gap.alignment_score, gap.total_jobs_analyzed, len(missing)))

    real_data = f"""
Course: {course_title} in {district}
Alignment score: {round(gap.alignment_score)}% (industry benchmark: 80%+)
Jobs analyzed: {gap.total_jobs_analyzed}
Missing skills employers want but course doesn't teach: {', '.join(missing) if missing else 'minor gaps only'}
Skills well covered: {', '.join(covered) if covered else 'basic fundamentals'}
Most demanded missing skill: {top_gap_skill} (appears in {top_gap_demand}% of job ads, {top_gap_jobs} jobs)
Priority level: {priority}
"""

    system_instruction = """You are the SkillX AI. Write exactly 2 sentences explaining why this specific course needs updating.
Sentence 1: What's missing and how many employers want it (use the real numbers provided).
Sentence 2: What the benefit will be if we add these skills.
Rules: Plain English only. No jargon. Be specific about the skill name. Sound like you're talking to a government officer, not a data scientist."""

    user_prompt = f"Based on this real data, explain why this course needs updating:\n{real_data}"

    ai_reply = _call_gemini_with_guardrails(system_instruction, user_prompt, temperature=0.3)

    if ai_reply:
        _cache_set(cache_key, ai_reply)
        return {"insight": ai_reply, "source": "llm-gemini", "priority": priority}

    fallback = (
        f"This {course_title} course is missing {top_gap_skill}, a skill that appears in {top_gap_demand}% of relevant job postings in {district}. "
        f"Adding this skill to the curriculum could significantly improve employment outcomes for students completing this program."
    )
    _cache_set(cache_key, fallback)
    return {"insight": fallback, "source": "rule-based-fallback", "priority": priority}


# ──────────────────────────────────────────────────────────────────────────────
# 7. Priority Courses — Deterministic ranking by urgency
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/priority-courses")
def get_priority_courses(
    district: Optional[str] = None,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Returns courses ranked by urgency: (gap severity × job demand × missing skill count).
    This is fully deterministic — no LLM needed for ranking.
    """
    query = db.query(SkillGapAnalysis, Course).join(
        Course, SkillGapAnalysis.course_id == Course.id
    ).filter(Course.status == "ACTIVE")

    if district and district != "All":
        query = query.filter(Course.district == district)

    results = query.all()

    prioritized = []
    for gap, course in results:
        missing = gap.missing_skills or []
        top_gaps = gap.top_skill_gaps or []
        score = _compute_priority(gap.alignment_score, gap.total_jobs_analyzed, len(missing))
        label = _priority_label(score)

        # Top skill gap with demand evidence
        top_skill = ""
        top_demand_pct = 0
        top_job_count = 0
        if top_gaps:
            top = top_gaps[0]
            top_skill = top.get("skill", missing[0] if missing else "")
            top_demand_pct = top.get("demand_pct", 0)
            top_job_count = top.get("job_count", 0)
        elif missing:
            top_skill = missing[0]

        prioritized.append({
            "course_id": course.id,
            "course_title": course.title,
            "district": course.district,
            "sector": course.sector,
            "institute_type": course.institute_type,
            "alignment_score": round(gap.alignment_score, 1),
            "missing_count": len(missing),
            "missing_skills": missing[:5],
            "fully_covered_skills": (gap.fully_covered_skills or [])[:3],
            "top_skill_gap": top_skill,
            "top_skill_demand_pct": top_demand_pct,
            "top_skill_job_count": top_job_count,
            "total_jobs_analyzed": gap.total_jobs_analyzed,
            "priority_score": score,
            "priority": label,
            "top_skill_gaps": top_gaps[:3],
        })

    prioritized.sort(key=lambda x: -x["priority_score"])
    return {"courses": prioritized[:limit], "total": len(prioritized)}


# ──────────────────────────────────────────────────────────────────────────────
# 8. Cache Management (admin)
# ──────────────────────────────────────────────────────────────────────────────
@router.delete("/cache")
def clear_llm_cache(admin_user: str = Depends(verify_admin_key)):
    """Clear the LLM result cache (admin only)."""
    count = len(_llm_cache)
    _llm_cache.clear()
    return {"cleared": count, "message": f"Cleared {count} cached LLM results"}
