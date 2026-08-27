from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base

class SkillDictionary(Base):
    __tablename__ = "skill_dictionary"

    id = Column(Integer, primary_key=True, index=True)
    standard_name = Column(String, unique=True, index=True, nullable=False)
    category = Column(String, index=True, default="Technical Skills") # Technical, Tools & Equipment, Digital & Tech, Safety, Soft, Emerging
    synonyms = Column(JSON, default=list)        # Alternative names e.g. ["PLC", "Programmable Logic Controller"]
    related_skills = Column(JSON, default=list)  # Related skills in taxonomy
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    code = Column(String, unique=True, index=True)
    course_master_code = Column(String, index=True, nullable=True)
    institute_type = Column(String, default="ITI")  # ITI or MSSDS
    sector = Column(String, index=True)
    nsqf_level = Column(Integer, default=4)
    duration_months = Column(Integer, default=6)
    intake_capacity = Column(Integer, default=100)
    qualification_req = Column(String, default="10th Pass")
    training_level = Column(String, default="National Trade Certificate")
    
    syllabus_text = Column(Text, nullable=False)
    raw_source_data = Column(Text, nullable=True)  # Raw scraped HTML/text for auditability
    district = Column(String, index=True, default="Pune")
    source_url = Column(String, nullable=True)
    
    status = Column(String, default="ACTIVE")        # ACTIVE or INACTIVE / No longer offered
    change_hash = Column(String, nullable=True)     # MD5/SHA256 for change detection
    last_scraped_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    skills = relationship("ExtractedSkill", back_populates="course", cascade="all, delete-orphan")
    gap_analyses = relationship("SkillGapAnalysis", back_populates="course", cascade="all, delete-orphan")


class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(Integer, primary_key=True, index=True)
    job_id_external = Column(String, unique=True, index=True, nullable=True)
    title = Column(String, index=True, nullable=False)
    company = Column(String, nullable=False)
    sector = Column(String, index=True)
    district = Column(String, index=True)
    job_description = Column(Text, nullable=False)
    raw_source_data = Column(Text, nullable=True)
    relevant_trade = Column(String, index=True)
    
    experience_req = Column(String, default="0-2 Years")
    employment_type = Column(String, default="Full Time")
    source_url = Column(String, nullable=True)
    
    status = Column(String, default="ACTIVE")        # ACTIVE or EXPIRED
    change_hash = Column(String, nullable=True)
    recency_weight = Column(Float, default=1.0)      # Higher weight for recent jobs
    posted_date = Column(DateTime, default=datetime.utcnow)
    last_scraped_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    skills = relationship("ExtractedSkill", back_populates="job_posting", cascade="all, delete-orphan")


class ExtractedSkill(Base):
    __tablename__ = "extracted_skills"

    id = Column(Integer, primary_key=True, index=True)
    skill_name = Column(String, index=True, nullable=False)
    category = Column(String, default="Technical Skills") # Technical, Tools & Equipment, Digital & Technology Skills, Safety Skills, Soft Skills, Emerging Skills
    
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    job_posting_id = Column(Integer, ForeignKey("job_postings.id"), nullable=True)
    
    source_type = Column(String, nullable=False)     # "COURSE" or "JOB"
    status = Column(String, default="CONFIRMED")      # CONFIRMED or CANDIDATE_UNKNOWN
    confidence_score = Column(Float, default=0.95)   # 0.0 to 1.0 confidence
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="skills")
    job_posting = relationship("JobPosting", back_populates="skills")


class SkillGapAnalysis(Base):
    __tablename__ = "skill_gap_analysis"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    district = Column(String, index=True)
    
    alignment_score = Column(Float, nullable=False)  # 0 to 100 percentage
    total_jobs_analyzed = Column(Integer, default=0)
    
    fully_covered_skills = Column(JSON, default=list)     # Taught & Demanded
    partially_covered_skills = Column(JSON, default=list) # Fundamentals taught but lacks advanced depth
    missing_skills = Column(JSON, default=list)           # Demanded by industry but missing in syllabus
    demand_frequency_map = Column(JSON, default=dict)     # Industry demand percentage per skill
    
    execution_latency_ms = Column(Float, default=0.0)
    analyzed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="gap_analyses")


class BridgePackRecommendation(Base):
    __tablename__ = "bridge_pack_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    missing_skill = Column(String, nullable=False)
    module_title = Column(String, nullable=False)
    skill_targeted = Column(String, nullable=False)
    duration_hours = Column(Integer, default=4)
    activities = Column(JSON, default=list)       # List of activity strings
    assessment_criteria = Column(JSON, default=list)
    tools_required = Column(JSON, default=list)
    nsqf_level = Column(Integer, default=4)
    generated_by = Column(String, default="rule-based")  # "llm" or "rule-based"
    generated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    course = relationship("Course")


class CrawlerStatus(Base):
    __tablename__ = "crawler_status"

    id = Column(Integer, primary_key=True, index=True)
    status = Column(String, default="IDLE")      # IDLE, RUNNING, COMPLETED, FAILED
    total_targets = Column(Integer, default=0)
    completed = Column(Integer, default=0)
    failed = Column(Integer, default=0)
    current_batch = Column(String, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_log = Column(Text, nullable=True)
