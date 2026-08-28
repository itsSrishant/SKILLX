import time
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Security
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, List, Any, Optional
from collections import defaultdict
from fastapi.responses import StreamingResponse
import io
import fitz
from datetime import datetime

from app.api.routers.engines import pipeline_state
from app.db.database import get_db
from app.db.models import Course, JobPosting, ExtractedSkill, SkillGapAnalysis, SkillDictionary, BridgePackRecommendation
from app.engines.engine1_course_ingestion import Engine1CourseIngestion
from app.engines.engine2_job_ingestion import Engine2JobIngestion
from app.engines.engine3_skill_extraction import Engine3SkillExtraction
from app.engines.engine4_skill_gap import Engine4SkillGapAnalysis
from app.engines.engine5_llm_bridge import Engine5LLMBridgePack
from app.crawler.async_crawler import run_full_async_crawl, get_crawler_status
from app.api.dependencies import verify_admin_key

router = APIRouter(tags=['analytics'])

# ─── Executive PDF Report Endpoint ─────────────────────────────────────────────
@router.get("/api/v1/reports/executive-pdf")
def get_executive_pdf_report(db: Session = Depends(get_db)):
    try:
        # Generate the PDF document in memory
        doc = generate_executive_pdf_report_doc(db)
        pdf_bytes = doc.write()
        doc.close()
        
        # Stream the PDF bytes as response
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=SkillX_Executive_Report_Maharashtra_2026.pdf"}
        )
    except Exception as err:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"PDF Generation Error: {str(err)}")

def generate_executive_pdf_report_doc(db: Session):
    # Query overview metrics
    total_courses = db.query(Course).filter(Course.status == "ACTIVE").count()
    total_jobs = db.query(JobPosting).filter(JobPosting.status == "ACTIVE").count()
    gap_records = db.query(SkillGapAnalysis).all()
    avg_score = round(sum(r.alignment_score for r in gap_records) / len(gap_records)) if gap_records else 0
    
    district_scores = {}
    for r in gap_records:
        district_scores.setdefault(r.district, []).append(r.alignment_score)
    districts_count = len(district_scores)
    
    flagged_courses = [
        r for r in gap_records if r.alignment_score < 75
    ]
    # Sort flagged courses by alignment score ascending (worst first)
    flagged_courses = sorted(flagged_courses, key=lambda x: x.alignment_score)
    
    # We will get course details
    course_map = {c.id: c for c in db.query(Course).all()}
    
    # Query district summaries dynamically
    distinct_districts = [
        row[0] for row in
        db.query(Course.district).filter(Course.status == "ACTIVE").distinct().all()
        if row[0]
    ]
    all_courses = db.query(Course).filter(Course.status == "ACTIVE").all()
    all_jobs = db.query(JobPosting).filter(JobPosting.status == "ACTIVE").all()
    
    courses_by_district = defaultdict(list)
    for c in all_courses:
        if c.district:
            courses_by_district[c.district].append(c)
            
    jobs_by_district = defaultdict(list)
    for j in all_jobs:
        if j.district:
            jobs_by_district[j.district].append(j)
            
    gaps_by_district = defaultdict(list)
    for g in gap_records:
        if g.district:
            gaps_by_district[g.district].append(g)
            
    district_summaries = []
    for dist in sorted(distinct_districts):
        gaps = gaps_by_district[dist]
        dist_avg = (
            round(sum(g.alignment_score for g in gaps) / len(gaps), 1)
            if gaps else 0.0
        )
        deficit_status = (
            "HIGH DEFICIT" if dist_avg < 65.0
            else ("MODERATE" if dist_avg < 80.0 else "ALIGNED")
        )
        district_summaries.append({
            "district": dist,
            "active_courses": len(courses_by_district[dist]),
            "relevant_jobs": len(jobs_by_district[dist]),
            "avg_alignment_score": dist_avg,
            "deficit_status": deficit_status
        })

    # Now create the PDF using PyMuPDF (fitz)
    doc = fitz.open()
    
    # Colors
    c_saffron = (1.0, 0.6, 0.2)
    c_slate = (0.059, 0.09, 0.165)
    c_white = (1.0, 1.0, 1.0)
    c_gray = (0.9, 0.9, 0.9)
    c_light_gray = (0.97, 0.98, 0.99)
    c_text = (0.1, 0.1, 0.15)
    c_text_muted = (0.4, 0.4, 0.45)
    
    # Font properties
    font_bold = "Helvetica-Bold"
    font_regular = "Helvetica"
    
    def draw_footer(page, page_num, total_pages):
        footer_text = f"Generated on {datetime.now().strftime('%d %B %Y')} — SkillX Prototype, Government of Maharashtra (SIH 2026 submission)  |  Page {page_num} of {total_pages}"
        page.draw_line(fitz.Point(40, 800), fitz.Point(555, 800), color=c_gray, width=0.5)
        page.insert_text(fitz.Point(40, 815), footer_text, fontsize=8, fontname=font_regular, color=c_text_muted)
        
    def draw_header(page):
        # Top banner line (Saffron)
        page.draw_rect(fitz.Rect(0, 0, 595, 12), color=c_saffron, fill=c_saffron)
        
        # Letterhead Title
        page.insert_text(fitz.Point(40, 35), "GOVERNMENT OF MAHARASHTRA", fontsize=10, fontname=font_bold, color=c_slate)
        page.insert_text(fitz.Point(40, 50), "Department of Skills, Employment, Entrepreneurship and Innovation", fontsize=9, fontname=font_regular, color=c_text_muted)
        page.insert_text(fitz.Point(40, 68), "SkillX Executive Briefing Report", fontsize=18, fontname=font_bold, color=c_slate)
        page.draw_line(fitz.Point(40, 80), fitz.Point(555, 80), color=c_saffron, width=1.5)

    # PAGE 1: Executive Summary & Overview
    page = doc.new_page(width=595, height=842)
    draw_header(page)
    
    # Summary Box Title
    page.insert_text(fitz.Point(40, 105), "1. Executive Summary", fontsize=13, fontname=font_bold, color=c_slate)
    
    summary_para = (
        "This intelligence briefing provides a state-wide diagnostic audit of the alignment between vocational training curricula (DVET ITI Trades and MSSDS Skill Courses) and active industrial employer demand. Under the Maharashtra Skill Development Initiative (SIH 2026), this prototype tracks training infrastructure against real-time MIDC cluster vacancies to flag training deficits and prioritize 20-hour modular bridge training interventions."
    )
    page.insert_textbox(fitz.Rect(40, 115, 555, 180), summary_para, fontsize=10, fontname=font_regular, color=c_text, align=0)
    
    # Key Performance Indicators Grid
    page.insert_text(fitz.Point(40, 195), "2. State Key Performance Indicators (KPIs)", fontsize=13, fontname=font_bold, color=c_slate)
    
    kpis = [
        ("Total Vocational Courses", f"{total_courses}"),
        ("State-Wide Avg Match Score", f"{avg_score}%"),
        ("Flagged Deficit Courses", f"{len(flagged_courses)}"),
        ("Districts Covered", f"{districts_count}")
    ]
    
    kpi_box_w = 120
    kpi_box_h = 60
    for idx, (label, val) in enumerate(kpis):
        col = idx % 4
        x0 = 40 + col * (kpi_box_w + 10)
        y0 = 205
        rect = fitz.Rect(x0, y0, x0 + kpi_box_w, y0 + kpi_box_h)
        page.draw_rect(rect, color=c_gray, fill=c_light_gray, width=0.5)
        top_bar = fitz.Rect(x0, y0, x0 + kpi_box_w, y0 + 3)
        box_color = c_saffron if idx == 1 or idx == 2 else c_slate
        page.draw_rect(top_bar, color=box_color, fill=box_color)
        
        page.insert_textbox(fitz.Rect(x0, y0 + 10, x0 + kpi_box_w, y0 + 35), val, fontsize=16, fontname=font_bold, color=box_color, align=1)
        page.insert_textbox(fitz.Rect(x0 + 5, y0 + 35, x0 + kpi_box_w - 5, y0 + 58), label, fontsize=8, fontname=font_regular, color=c_text_muted, align=1)

    # District Summary Table (top part on page 1)
    page.insert_text(fitz.Point(40, 290), "3. District-Level Skill Alignment Summary", fontsize=13, fontname=font_bold, color=c_slate)
    
    headers = ["District", "Active Courses", "Relevant Jobs", "Avg Match", "Deficit Status"]
    col_w = [120, 100, 100, 80, 115]
    
    y = 305
    page.draw_rect(fitz.Rect(40, y, 555, y + 20), color=c_slate, fill=c_slate)
    x = 45
    for h_idx, h in enumerate(headers):
        page.insert_text(fitz.Point(x, y + 14), h, fontsize=9, fontname=font_bold, color=c_white)
        x += col_w[h_idx]
        
    y += 20
    idx = 0
    for idx, d_sum in enumerate(district_summaries):
        if y > 770:
            break
            
        bg_row = c_light_gray if idx % 2 == 0 else c_white
        page.draw_rect(fitz.Rect(40, y, 555, y + 18), color=c_gray, fill=bg_row, width=0.3)
        
        x = 45
        page.insert_text(fitz.Point(x, y + 12), d_sum["district"], fontsize=8, fontname=font_regular, color=c_text)
        x += col_w[0]
        page.insert_text(fitz.Point(x + 10, y + 12), str(d_sum["active_courses"]), fontsize=8, fontname=font_regular, color=c_text)
        x += col_w[1]
        page.insert_text(fitz.Point(x + 10, y + 12), str(d_sum["relevant_jobs"]), fontsize=8, fontname=font_regular, color=c_text)
        x += col_w[2]
        page.insert_text(fitz.Point(x + 10, y + 12), f"{d_sum['avg_alignment_score']}%", fontsize=8, fontname=font_regular, color=c_text)
        x += col_w[3]
        status_color = c_saffron if d_sum["deficit_status"] == "HIGH DEFICIT" else (c_text if d_sum["deficit_status"] == "ALIGNED" else c_text_muted)
        page.insert_text(fitz.Point(x, y + 12), d_sum["deficit_status"], fontsize=8, fontname=font_bold, color=status_color)
        
        y += 18

    # Page 2 for continuation of District Summary and Flagged Courses
    page2 = doc.new_page(width=595, height=842)
    draw_header(page2)
    
    y = 100
    remaining_districts = district_summaries[idx:] if idx < len(district_summaries) else []
    if remaining_districts:
        page2.insert_text(fitz.Point(40, y), "3. District-Level Skill Alignment Summary (Contd.)", fontsize=13, fontname=font_bold, color=c_slate)
        y += 15
        page2.draw_rect(fitz.Rect(40, y, 555, y + 20), color=c_slate, fill=c_slate)
        x = 45
        for h_idx, h in enumerate(headers):
            page2.insert_text(fitz.Point(x, y + 14), h, fontsize=9, fontname=font_bold, color=c_white)
            x += col_w[h_idx]
        y += 20
        for r_idx, d_sum in enumerate(remaining_districts):
            if y > 400: 
                break
            bg_row = c_light_gray if r_idx % 2 == 0 else c_white
            page2.draw_rect(fitz.Rect(40, y, 555, y + 18), color=c_gray, fill=bg_row, width=0.3)
            x = 45
            page2.insert_text(fitz.Point(x, y + 12), d_sum["district"], fontsize=8, fontname=font_regular, color=c_text)
            x += col_w[0]
            page2.insert_text(fitz.Point(x + 10, y + 12), str(d_sum["active_courses"]), fontsize=8, fontname=font_regular, color=c_text)
            x += col_w[1]
            page2.insert_text(fitz.Point(x + 10, y + 12), str(d_sum["relevant_jobs"]), fontsize=8, fontname=font_regular, color=c_text)
            x += col_w[2]
            page2.insert_text(fitz.Point(x + 10, y + 12), f"{d_sum['avg_alignment_score']}%", fontsize=8, fontname=font_regular, color=c_text)
            x += col_w[3]
            status_color = c_saffron if d_sum["deficit_status"] == "HIGH DEFICIT" else (c_text if d_sum["deficit_status"] == "ALIGNED" else c_text_muted)
            page2.insert_text(fitz.Point(x, y + 12), d_sum["deficit_status"], fontsize=8, fontname=font_bold, color=status_color)
            y += 18
            
    # Flagged Courses Table
    y += 20
    page2.insert_text(fitz.Point(40, y), "4. Flagged Deficit Courses (Match Score < 75%)", fontsize=13, fontname=font_bold, color=c_slate)
    y += 15
    
    fc_headers = ["S.No", "Course Title", "Type", "District", "Score", "Critical Missing Skills"]
    fc_col_w = [30, 150, 45, 75, 45, 170]
    
    page2.draw_rect(fitz.Rect(40, y, 555, y + 20), color=c_slate, fill=c_slate)
    x = 45
    for h_idx, h in enumerate(fc_headers):
        page2.insert_text(fitz.Point(x, y + 14), h, fontsize=9, fontname=font_bold, color=c_white)
        x += fc_col_w[h_idx]
        
    y += 20
    active_doc_page = page2
    page_num = 2
    
    for f_idx, r in enumerate(flagged_courses):
        course = course_map.get(r.course_id)
        course_title = course.title if course else r.course_title
        inst_type = course.institute_type if course else r.institute_type
        
        if y > 770:
            draw_footer(active_doc_page, page_num, page_num + 1) 
            page_num += 1
            active_doc_page = doc.new_page(width=595, height=842)
            draw_header(active_doc_page)
            y = 100
            active_doc_page.insert_text(fitz.Point(40, y), "4. Flagged Deficit Courses (Match Score < 75%) - Contd.", fontsize=13, fontname=font_bold, color=c_slate)
            y += 15
            active_doc_page.draw_rect(fitz.Rect(40, y, 555, y + 20), color=c_slate, fill=c_slate)
            x = 45
            for h_idx, h in enumerate(fc_headers):
                active_doc_page.insert_text(fitz.Point(x, y + 14), h, fontsize=9, fontname=font_bold, color=c_white)
                x += fc_col_w[h_idx]
            y += 20

        bg_row = c_light_gray if f_idx % 2 == 0 else c_white
        active_doc_page.draw_rect(fitz.Rect(40, y, 555, y + 20), color=c_gray, fill=bg_row, width=0.3)
        
        x = 45
        active_doc_page.insert_text(fitz.Point(x, y + 13), str(f_idx + 1), fontsize=8, fontname=font_regular, color=c_text)
        x += fc_col_w[0]
        title_disp = course_title[:32] + "..." if len(course_title) > 34 else course_title
        active_doc_page.insert_text(fitz.Point(x, y + 13), title_disp, fontsize=8, fontname=font_regular, color=c_text)
        x += fc_col_w[1]
        active_doc_page.insert_text(fitz.Point(x, y + 13), inst_type, fontsize=8, fontname=font_regular, color=c_text)
        x += fc_col_w[2]
        active_doc_page.insert_text(fitz.Point(x, y + 13), r.district, fontsize=8, fontname=font_regular, color=c_text)
        x += fc_col_w[3]
        active_doc_page.insert_text(fitz.Point(x + 5, y + 13), f"{round(r.alignment_score)}%", fontsize=8, fontname=font_bold, color=c_saffron)
        x += fc_col_w[4]
        missing_skills_str = ", ".join(r.missing_skills[:3])
        missing_disp = missing_skills_str[:38] + "..." if len(missing_skills_str) > 40 else missing_skills_str
        active_doc_page.insert_text(fitz.Point(x, y + 13), missing_disp or "None", fontsize=8, fontname=font_regular, color=c_text)
        
        y += 20

    total_pages = len(doc)
    for p_idx, p in enumerate(doc):
        draw_footer(p, p_idx + 1, total_pages)
        
    return doc
