# SkillX 🎯

SkillX is a modern, intelligence-driven platform designed to bridge the gap between education and industry demand in Maharashtra. By continuously analyzing job markets, course catalogs, and skill requirements, SkillX provides actionable insights for students, institutions, and policymakers to align education with the jobs of the future.

## 🌟 Key Features

The core intelligence of SkillX is powered by five modular engines:

1. **Engine 1: Course Ingestion & Normalization** - Automatically ingests and normalizes course data from ITIs and MSSDS across all 36 districts.
2. **Engine 2: Job Market Demand Ingestion** - Continuously monitors industry requirements to build a real-time graph of employer demand.
3. **Engine 3: Skill Extraction & Standardization** - A powerful, local NLP engine that extracts required skills without relying on expensive external APIs.
4. **Engine 4: Skill-Gap Analysis** - Quantifies the gap between current curricula and industry needs using a comprehensive weighted scoring algorithm.
5. **Engine 5: AI Bridge Pack Generator** - Uses LLMs to generate structured 20-hour "Bridge Packs" to quickly fill identified skill gaps with rule-based fallbacks.

## 🚀 Setup & Development

SkillX features a Next.js frontend and a FastAPI backend powered by SQLite (ready for PostgreSQL in production).

### Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```
*Note: The database auto-seeds on startup for a fresh clone.*

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

## 🛠 Architecture & Tech Stack

- **Frontend:** Next.js 14, React, Lucide Icons, Custom Design Tokens
- **Backend:** FastAPI, SQLAlchemy, SQLite (Development), PostgreSQL (Production ready)
- **AI/NLP:** Local SpaCy extraction (Engine 3), Configurable LLM integration via `gemini-1.5-flash` (Engine 5)
- **Deployment:** Vercel (Frontend & Serverless API proxy)

## 📌 Problem Statement & USP

Traditional course catalogs fail to reflect the rapidly changing demands of modern industries. SkillX solves this by creating a real-time feedback loop. It doesn't just list courses—it tells you *why* a course is missing the mark, exactly *which* skills are missing, and *how* to bridge the gap immediately.

## 🔮 Future Scope
- Production migration to PostgreSQL.
- Expanding the Skill Dictionary with automated industry crawling.
- Interactive visualizations for district-by-district demand vs. supply comparisons.
