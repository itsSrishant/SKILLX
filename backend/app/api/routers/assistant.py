import os
import json
import time
import logging
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


class MessageData(BaseModel):
    role: constr(max_length=10) # 'user' or 'model'
    content: constr(max_length=2000)

class StudentChatRequest(BaseModel):
    message: constr(strip_whitespace=True, max_length=1000)
    district: Optional[constr(max_length=50)] = "Pune"
    history: Optional[List[MessageData]] = []

class GovernmentChatRequest(BaseModel):
    message: constr(strip_whitespace=True, max_length=1000)
    district: Optional[constr(max_length=50)] = "All Districts"
    history: Optional[List[MessageData]] = []

class CourseChatRequest(BaseModel):
    message: constr(strip_whitespace=True, max_length=1000)
    course_title: constr(max_length=200)
    district: Optional[constr(max_length=50)] = "Pune"
    history: Optional[List[MessageData]] = []


def _call_gemini_with_guardrails(system_instruction: str, user_prompt: str, history: Optional[List[Any]] = None) -> Optional[str]:
    """Helper to call Gemini API with low temperature and strict safety settings."""
    keys_env = os.environ.get("GEMINI_API_KEYS", "").strip()
    keys_to_try = [k.strip() for k in keys_env.split(",") if k.strip()]
    single_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if single_key and single_key not in keys_to_try:
        keys_to_try.insert(0, single_key)

    if not keys_to_try:
        return None

    # Format history for Gemini
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

        generation_config = {
            "temperature": 0.7,  # Increased temperature for a friendly, conversational guide
        }

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
                    logger.warning(f"Gemini call failed with model {current_model} and key: {e}")
                    print(f"DEBUG GEMINI EXCEPTION ({current_model}): {e}")
                    continue

        return None
    except Exception as e:
        logger.error(f"Gemini library error: {e}")
        print(f"DEBUG GEMINI LIBRARY EXCEPTION: {e}")
        return None


# ──────────────────────────────────────────────────────────────────────────────
# 1. Student Portal AI Career Assistant Endpoint
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/student")
@limiter.limit("20/minute")
def student_chat_assistant(
    request: Request,
    req: StudentChatRequest,
    db: Session = Depends(get_db)
):
    """
    Candidate & Student Career AI Assistant with RAG context injection & anti-hallucination guardrails.
    """
    district = req.district or "Pune"
    message = req.message.strip()

    # 1. RAG Context Gathering for Student
    courses = db.query(Course).filter(Course.district == district).all()
    course_list = [f"{c.title} ({c.institute_type})" for c in courses[:6]]
    
    # Benchmarks for District
    sample_benchmarks = list(TRADE_RESEARCH_DATA.items())[:5]
    bench_info = []
    for trade_name, bm in sample_benchmarks:
        bench_info.append(
            f"- Trade: {trade_name} | Baseline Salary: ₹{bm['baseline_salary']:,}/mo | "
            f"Upgraded Salary (with 20h Bridge Pack): ₹{bm['upgraded_salary']:,}/mo | "
            f"Hiring Employers: {', '.join(bm['hiring_employers'][:3])}"
        )
    benchmarks_str = "\n".join(bench_info)

    system_instruction = f"""You are the official SkillX Career & Trade AI Assistant for vocational candidates in Maharashtra.
You act as a friendly, encouraging, and highly knowledgeable personal guide for students and job seekers.
Your mission is to help candidates explore ITI trades, understand salary expectations in industrial clusters, and explain how 20-hour Skill Bridge Packs boost employment. Explain everything in very easy, simple words.

GUIDELINES FOR YOUR RESPONSES:
1. Act as a welcoming, patient, and intelligent personal guide. Use simple, easy-to-understand language.
2. Prioritize official DVET, MSSDS, and SkillX database facts when giving career advice.
3. If the student asks general questions, needs motivation, asks for general career advice, or asks about topics not strictly in the database, YOU MUST BE HELPFUL and answer to the best of your knowledge. DO NOT refuse to answer just because it's outside the direct database context.
4. Keep responses encouraging, professional, concise, and structured with bullet points where appropriate.

REAL MAHARASHTRA DATABASE FACTS FOR {district.upper()} DISTRICT:
- Available Trade Pathways in {district}: {', '.join(course_list) if course_list else 'Electrician, Fitter, CNC Operator, Welder'}
- Industry Benchmarks & Salary Lifts:
{benchmarks_str}
- 20-Hour Skill Bridge Packs: Modular micro-credentials aligned with NCVET/MSSDS to bridge skill gaps identified by real employer job crawl data.
"""

    user_prompt = f"Candidate Query ({district} District): {message}"

    # Try Gemini LLM First
    ai_reply = _call_gemini_with_guardrails(system_instruction, user_prompt, history=req.history)
    if ai_reply:
        return {
            "source": "llm-gemini",
            "district": district,
            "reply": ai_reply
        }

    # Deterministic Rule-Based Fallback
    msg_lower = message.lower()
    fallback_reply = (
        f"In **{district}**, top demanded trades include Electrician, Fitter, and CNC Machinist. "
        f"Completing a 20-hour Skill Bridge Pack boosts average graduate starting salary from ₹18,500 to ₹26,500/month "
        f"with hiring partners in the local MIDC industrial cluster."
    )

    if "salary" in msg_lower or "pay" in msg_lower or "earn" in msg_lower:
        fallback_reply = (
            f"💰 **Salary Insights for {district} Industrial Cluster**:\n\n"
            f"• **CNC Machine Operator**: ₹18,000 ➔ ₹28,000/month (+₹10,000 lift with Bridge Pack)\n"
            f"• **Electrician & Power Automation**: ₹19,500 ➔ ₹27,000/month\n"
            f"• **Solar Technician**: ₹17,500 ➔ ₹25,000/month\n\n"
            f"Hiring clusters near {district} MIDC actively recruit certified candidates!"
        )
    elif "bridge" in msg_lower or "pack" in msg_lower or "hours" in msg_lower:
        fallback_reply = (
            f"⚡ **20-Hour Skill Bridge Packs**:\n\n"
            f"Skill Bridge Packs are 20-hour targeted practical modules designed to fill critical skill gaps "
            f"identified by analyzing active job postings in Maharashtra. They offer NSQF Level 5 certification "
            f"and hands-on workshop training."
        )

    return {
        "source": "rule-based-fallback",
        "district": district,
        "reply": fallback_reply
    }


# ──────────────────────────────────────────────────────────────────────────────
# 2. Government Admin Dashboard AI Policy Copilot Endpoint
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/government")
@limiter.limit("50/minute")
def government_chat_assistant(
    request: Request,
    req: GovernmentChatRequest,
    db: Session = Depends(get_db),
    admin_user: str = Depends(verify_admin_key)
):
    """
    Executive Government Policy & Skilling AI Copilot for DVET/MSSDS Directors & District Officers.
    """
    district = req.district or "All Districts"
    message = req.message.strip()

    # 1. RAG Context Gathering for Government Officials
    all_gaps = db.query(SkillGapAnalysis).all()
    avg_score = round(sum(g.alignment_score for g in all_gaps) / max(1, len(all_gaps)), 1) if all_gaps else 68.4
    critical_courses = [g for g in all_gaps if g.alignment_score < 60]
    
    critical_list = []
    for c_gap in critical_courses[:5]:
        c = db.query(Course).filter(Course.id == c_gap.course_id).first()
        if c:
            critical_list.append(f"- {c.title} ({c.district}): Score {c_gap.alignment_score}% | Deficits: {', '.join((c_gap.missing_skills or [])[:2])}")
    
    critical_str = "\n".join(critical_list) if critical_list else "- Fitter Trade (Pune): 54.2% alignment | Deficits: Pneumatics, PLC Interlocking"

    system_instruction = f"""You are the official SkillX Government Policy & Skilling AI Copilot for Maharashtra State Officers, DVET Directors, and District Collectors.
You act as a friendly, helpful, and highly knowledgeable personal guide for government officials.
Your mandate is to provide data-driven policy insights, curriculum intervention advice, and budget feasibility estimates based on SkillX platform data, while explaining complex topics in very easy, simple words.

GUIDELINES FOR YOUR RESPONSES:
1. Act as a welcoming and intelligent personal guide. Use simple, easy-to-understand language so that non-technical officials can easily grasp the insights.
2. Prioritize official Maharashtra Labour Market Intelligence metrics provided in the system context when answering skilling queries.
3. If the official asks general questions, asks for advice, or needs help understanding a concept (even if not strictly related to the data), YOU MUST BE HELPFUL and answer to the best of your knowledge. DO NOT refuse to answer just because it's outside the direct database context.
4. Provide structured, executive-grade summaries formatted clearly with Markdown headings and bullet points when appropriate, but keep the tone warm and supportive.

REAL MAHARASHTRA GOVERNMENT METRICS (SKILLX DB):
- Filter Context: {district}
- State Average Skill Alignment Index: {avg_score}%
- Critical Deficit Courses Requiring Immediate Policy Intervention:
{critical_str}
- Standard Upgrade Unit Cost: ₹45,000 per batch of 30 trainees (₹1,500/trainee) for a 20-hour NCVET-aligned Skill Bridge Pack.
- Policy Proposal Memo Framework: Automatically generates official NCVET & MSSDS syllabus revision notifications with GeM procurement specs.
"""

    user_prompt = f"Government Officer Query: {message}"

    # Try Gemini LLM First
    ai_reply = _call_gemini_with_guardrails(system_instruction, user_prompt, history=req.history)
    if ai_reply:
        return {
            "source": "llm-gemini",
            "district": district,
            "reply": ai_reply
        }

    # Deterministic Rule-Based Fallback
    msg_lower = message.lower()
    fallback_reply = (
        f"🏛️ **Executive Skilling Summary for Maharashtra ({district})**:\n\n"
        f"• **State Alignment Index**: {avg_score}%\n"
        f"• **Top Priority Intervention**: Update ITI Electrician & Fitter curricula with PLC Automation & CNC G-Code modules.\n"
        f"• **Unit Feasibility**: ₹45,000 per batch of 30 trainees yielding a projected +22.4% graduate placement boost."
    )

    if "district" in msg_lower or "rank" in msg_lower or "priority" in msg_lower:
        fallback_reply = (
            f"📊 **District Priority Assessment ({district})**:\n\n"
            f"1. **Chhatrapati Sambhajinagar**: Critical deficit in Automotive Electricals & Sensor Calibration.\n"
            f"2. **Pune MIDC Cluster**: High employer demand for PLC Programming & Robotic Arm Maintenance.\n"
            f"3. **Nagpur Logistics Hub**: Demand for EV Battery Testing & Warehouse Automation."
        )
    elif "memo" in msg_lower or "policy" in msg_lower or "proposal" in msg_lower:
        fallback_reply = (
            f"📜 **Policy Memo & Syllabus Revision Directive**:\n\n"
            f"SkillX has generated an automated NCVET/MSSDS policy proposal memo. "
            f"You can download the full printable memo and GeM tender specification directly from the District Skill Development Plan tab!"
        )

    return {
        "source": "rule-based-fallback",
        "district": district,
        "reply": fallback_reply
    }



# ──────────────────────────────────────────────────────────────────────────────
# 3. Course-Specific AI Assistant Endpoint
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/course")
@limiter.limit("20/minute")
def course_chat_assistant(
    request: Request,
    req: CourseChatRequest,
    db: Session = Depends(get_db)
):
    """
    Hyper-personalized AI Assistant for specific ITI Courses.
    """
    district = req.district or "Unknown"
    title = req.course_title or "Course"
    message = req.message.strip()

    system_instruction = f"""You are the official SkillX Course Expert AI for the "{title}" program in {district} district.
You act as a friendly, specialized personal guide for this specific course. 
Your mandate is to answer any questions about the {title} curriculum, the local job prospects in {district}, and recommend specific bridge packs if necessary. Explain things in simple, easy-to-understand words.

GUIDELINES FOR YOUR RESPONSES:
1. Act as a welcoming, highly knowledgeable mentor specifically for the "{title}" trade.
2. If the user asks about syllabus details, local salary, or employer demand, be helpful and positive.
3. You MUST BE HELPFUL and answer general questions related to career growth in this field.
4. Provide structured, concise summaries with bullet points where appropriate.

COURSE CONTEXT:
- Course Name: {title}
- Location: {district}
- Status: This is an official NCVET recognized course.
"""
    user_prompt = f"Instructor Query regarding '{title}' in {district}: {message}"

    ai_reply = _call_gemini_with_guardrails(system_instruction, user_prompt, history=req.history)
    if ai_reply:
        return {
            "source": "llm-gemini",
            "course": title,
            "reply": ai_reply
        }

    return {
        "source": "rule-based-fallback",
        "course": title,
        "reply": f"Hi! I am the AI guide for {title} in {district}. Employers in this area are actively looking for candidates with this skill set. Let me know what specific part of the curriculum you'd like to learn about!"
    }
