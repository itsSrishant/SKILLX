# System Architecture & Tech Stack: SkillX

This document presents a plain-language, comprehensive breakdown of the **SkillX** system architecture, data pipelines, database models, and technology stack.

---

## 1. System Overview & Problem Statement Context (SIH26134)
SkillX is an automated Labour Market Intelligence & Curriculum Alignment Platform for the Government of Maharashtra (Department of Skills, Employment, Entrepreneurship & Innovation).

### The Skilling Ecosystem Landscape:
- **DVET ITI Ecosystem**: **85 Official Trades** across **1,004 ITIs** (419 Government + 585 Private ITIs) with an annual intake capacity of **2.43 Lakh seats**.
- **MSSDS Ecosystem**: **1,200+ Course Master Catalogue** entries across **2,152 Training Centres** & **7,151 active batches**.
- **Core Value Proposition**: The challenge is not a lack of courses, but dynamically aligning this vast, fragmented, and fast-changing ecosystem (85 ITI trades + 1,200+ MSSDS short-term courses) with real-time MIDC industrial job demand across Maharashtra districts.

```
                         ┌──────────────────────────────────────────────┐
                         │              DATA SOURCES                    │
                         │  (85 ITI Trades + 1,200+ MSSDS Master + Jobs)│
                         └──────────────────────┬───────────────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
┌─────────────────────────────────┐                         ┌─────────────────────────────────┐
│ ENGINE 1: Course Ingestion      │                         │ ENGINE 2: Job Ingestion         │
│ Surfs DVET & MSSDS web portals, │                         │ Scrapes relevant Maharashtra    │
│ parses syllabi HTML/PDF data.   │                         │ jobs matched to course fields.  │
└────────────────┬────────────────┘                         └────────────────┬────────────────┘
                 │                                                             │
                 └──────────────────────────────┬──────────────────────────────┘
                                                ▼
                               ┌─────────────────────────────────┐
                               │ ENGINE 3: Skill Extraction      │
                               │ Extracts technical skills       │
                               │ using Zero-API Local NLP.       │
                               └────────────────┬────────────────┘
                                                ▼
                               ┌─────────────────────────────────┐
                               │ ENGINE 4: Skill Gap Engine      │
                               │ Computes % Skill Match Score    │
                               │ & district demand-supply gap.   │
                               └────────────────┬────────────────┘
                                                ▼
                               ┌─────────────────────────────────┐
                               │ DATABASE (PostgreSQL)           │
                               │ Stores courses, jobs, extracted │
                               │ skills, and analytics metrics.  │
                               └────────────────┬────────────────┘
                                                ▼
                               ┌─────────────────────────────────┐
                               │ FRONTEND (Next.js + Tailwind)   │
                               │ Government Admin Dashboard      │
                               │ with district insights & charts.│
                               └─────────────────────────────────┘
```

---

## 2. Tech Stack Breakdown

### Frontend
- **Framework**: Next.js (React)
- **Styling**: Tailwind CSS (Vanilla CSS utilities, modern dark/light glassmorphic UI)
- **State & Data Fetching**: React Hooks, Axios
- **Charts & Maps**: Leaflet.js (GIS District Heatmaps), Recharts / Chart.js

### Backend
- **Framework**: Python FastAPI
- **Web Scraping & Surfing**: `BeautifulSoup4`, `httpx`, `requests`
- **Zero-API Key NLP Engine**: `spaCy`, `scikit-learn` (TF-IDF vectorizer / cosine similarity), custom regex entity extractors
- **ORM & Database Connection**: `SQLAlchemy` / `asyncpg`

### Database
- **Database Engine**: PostgreSQL
- **Key Tables**:
  - `courses`: ID, title, code, course_master_code, institute_type (ITI/MSSDS), sector, nsqf_level, duration_months, intake_capacity, syllabus_text, district, created_at
  - `job_postings`: ID, title, company, district, job_description, relevant_trade, created_at
  - `extracted_skills`: ID, entity_id, entity_type, skill_name, category
  - `skill_gap_analysis`: ID, course_id, match_score, covered_skills, missing_skills, analyzed_at

---

## 3. Core Engine Mechanics (Simple Terms)

1. **Engine 1 (Course Ingestion)**: Surfs live DVET Maharashtra and MSSDS course web pages, extracts course titles, NSQF levels (1-8), seat intake capacities, and syllabus content.
2. **Engine 2 (Job Requirements Ingestion)**: Scrapes Maharashtra job postings, filtering postings relevant to ITI/MSSDS course fields (e.g. Electrician, Solar Technician, Fitter, CNC Operator) to keep the system fast and lightweight.
3. **Engine 3 (Skill Extraction Engine)**: Operates without any paid API keys. Uses open-source NLP and pattern matching to extract skill keywords (e.g., "PLC Programming", "AutoCAD", "Welding Safety") from both courses and jobs.
4. **Engine 4 (Skill Gap Engine)**: Compares the skills taught in a course against the skills demanded in corresponding job postings. Calculates a `% Skill Match Score` and identifies missing skills.

---

## 4. Zero-API Key Guarantee
All scraping, extraction, scoring, and storage pipelines run 100% independently of third-party API keys. No external API quota limits or service dependencies affect Engines 1–4.
