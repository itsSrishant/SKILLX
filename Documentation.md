# SkillX Project Documentation & Changelog

This document maintains a chronological record of all architectural decisions, setup actions, and implementation milestones completed for **SkillX**, marked with exact timestamps.

---

## Chronological Progress Log

### 📅 Date: August 27, 2026

#### 🕒 16:26:13 IST — Initial Alignment & Context Capture
- **Action**: Analyzed SIH 2026 Problem Statement `SIH26134` (Government of Maharashtra - Skills, Employment, Entrepreneurship & Innovation Dept).
- **Action**: Parsed user handwritten architectural notes outlining the 4-Engine backend pipeline + LLM recommendation layer.
- **Artifact Created**: [context.md](file:///Users/srishant/Desktop/SkillX/context.md) - Project blueprint, problem summary, API key constraints, review, and roadmap.

#### 🕒 16:40:37 IST — Documentation Core Setup & Scope Scoping
- **User Instruction**:
  - Focus first on **Phase 2 (4 Backend Engines)** and **Phase 4 (Government Admin Frontend UI)**.
  - Skip Phase 1 static seeding and postpone LLM layer integration.
  - Strictly enforce Tech Stack: **Next.js + Tailwind CSS** (Frontend), **Python** (Backend), **PostgreSQL** (Database).
  - Enforce real-time web ingestion for ITI/MSSDS courses and relevant Maharashtra job postings.
  - Enforce zero-API key constraint for Engines 1 to 4.
  - Add latency measurement per engine and display assumed time remaining timer for user.
- **Artifacts Created**:
  - [Future Suggestion.md](file:///Users/srishant/Desktop/SkillX/Future%20Suggestion.md): Roadmap for future features (LLM bridge generator, student portal, Marathi WhatsApp bot).
  - [Workleft.md](file:///Users/srishant/Desktop/SkillX/Workleft.md): Active task checklist for tracking development progress.
  - [Architecture.md](file:///Users/srishant/Desktop/SkillX/Architecture.md): Plain-language system architecture, database schema, and tech stack guide.
  - [Documentation.md](file:///Users/srishant/Desktop/SkillX/Documentation.md): Historical log of all work done with exact timestamps.

#### 🕒 16:55:00 IST — Phase 2 (4 Python Engines) & Phase 4 (Next.js Govt UI) Completion
- **Backend Setup**:
  - Built Python FastAPI backend in `backend/app/` with PostgreSQL/SQLAlchemy ORM (`courses`, `job_postings`, `extracted_skills`, `skill_gap_analysis`).
  - **Engine 1** (`engine1_course_ingestion.py`): Web course ingestion for ITI Maharashtra & MSSDS courses.
  - **Engine 2** (`engine2_job_ingestion.py`): Course-relevant job requirement ingestion across MIDC hubs (Pune, Nashik, Thane, Nagpur, Chhatrapati Sambhajinagar).
  - **Engine 3** (`engine3_skill_extraction.py`): Zero-API key local NLP skill extractor parsing technical & operational skill entities.
  - **Engine 4** (`engine4_skill_gap.py`): Skill alignment scoring engine generating `% Skill Match Score`, covered skills, and missing industry skills.
- **Frontend Setup**:
  - Initialized Next.js + Tailwind CSS app in `frontend/`.
  - Built Government Admin Dashboard (`src/app/page.tsx`) with live Overview Cards, District Skill Deficit Selector, ITI/MSSDS Course Alignment Table, 4-Engine Execution Panel, and an **Assumed Time Remaining Countdown Timer**.

#### 🕒 16:57:05 IST — True Live Web Surfing & Scraping Upgrade
- **User Question**: Clarified whether data was statically seeded or actively surfed from live web portals.
- **Upgrade Execution**:
  - Upgraded **Engine 1** (`engine1_course_ingestion.py`) to perform **live HTTP web surfing and HTML DOM scraping** using `httpx` and `BeautifulSoup4` directly against government vocational portals (`admission.dvet.gov.in`, `dgt.gov.in`).
  - Upgraded **Engine 2** (`engine2_job_ingestion.py`) to perform **live HTTP web scraping** of National Career Service job search portals (`ncs.gov.in`).
  - Verified live network requests: Engine 1 HTTP GET `admission.dvet.gov.in` (200 OK), Engine 2 HTTP GET `ncs.gov.in` (200 OK).

#### 🕒 17:02:09 IST — Official Ecosystem Research Integration (DVET 85 Trades + MSSDS 1,200+ Catalogue)
- **User Research Integration**:
  - Incorporated official Maharashtra government statistics: **85 DVET ITI Trades** across **1,004 ITIs** (419 Govt + 585 Private with 2.43 Lakh seat capacity) & **MSSDS 1,200+ Course Master Catalogue** across **2,152 Training Centres & 7,151 active batches**.
- **Backend Schema & Ingestion Upgrade**:
  - Added `course_master_code`, `nsqf_level`, and `intake_capacity` to `Course` model in `models.py`.
  - Expanded `Engine 1` to index all 85 ITI trade categories + MSSDS short-term modular course taxonomies.

#### 🕒 17:11:48 IST — Comprehensive Research Specifications Analysis & Engine Overhaul (PDF Specs Integration)
- **Research Analysis & Gap Pinpointing**:
  - Analyzed the 4 Engine Specification PDFs & 25 Time-Optimization Rules provided by the user. Identified basic gaps (lack of dedicated source collectors, missing SHA-256 change hashes, deleting historical data instead of marking `INACTIVE`/`EXPIRED`, missing Central Skill Dictionary, lack of candidate unknown skill detection, and basic 1-tier scoring).
- **Engine Pipeline Upgrades**:
  1. **Engine 1**: Implemented `ITICollector` and `MSSDSCollector` source connectors, SHA-256 content change detection, raw HTML source preservation, data cleaning pipeline (zero-LLM formatting), and `INACTIVE` status marking for removed courses (preserves audit trail).
  2. **Engine 2**: Implemented `job_id_external` deduplication, course relevance filtering, recency weighting, and `EXPIRED` status marking for outdated job postings.
  3. **Engine 3**: Created `SkillDictionary` table with 6-category taxonomy (*Technical, Tools & Equipment, Digital & Tech, Safety, Soft, Emerging*), synonym normalization, and **`CANDIDATE_UNKNOWN` skill flagging with confidence scores (0.0 to 1.0)**.
  4. **Engine 4**: Upgraded to **3-Tier Skill Coverage Classification** (*Fully Covered, Partially Covered, Missing Deficit*) with job recency weighting & demand frequency mapping.
- **Frontend Upgrade (`frontend/src/app/page.tsx`)**:
  - Added 3-Tier Skill Coverage badges, Candidate Unknown Skills alert box, Central Skill Dictionary inspector modal, and updated engine latency breakdown.
