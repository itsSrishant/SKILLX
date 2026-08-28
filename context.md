# Context & Project Blueprint: SkillX (SIH 2026 - SIH26134)

## 1. Problem Statement Summary
- **Title**: Challenges in aligning skill development programs with industry requirements and emerging job market demands (SIH 2026 - Problem Statement ID: `SIH26134`).
- **Organization**: Government of Maharashtra (Department of Skills, Employment, Entrepreneurship & Innovation / MSSDS).
- **Core Challenge**: Static, multi-year government vocational curricula (ITIs, VTPs, MSSDS) fail to keep up with dynamic industrial shifts (AI, EV Assembly, Solar Energy, Smart Manufacturing across regional MIDC hubs like Pune, Nashik, Chhatrapati Sambhajinagar, Nagpur).
- **Goal**: Build an automated, data-driven Labour Market Intelligence & Curriculum Alignment Platform that dynamically extracts job demand signals, compares them against current course syllabi, identifies hyper-local district skill gaps, and recommends actionable curriculum updates (e.g., 20-hour modular "Skill Bridge Packs").

---

## 2. User Architectural Vision (From Handwritten Notes & Strategy Docs)
The proposed solution follows a pipeline architecture of **4 Independent Backend Engines + 1 LLM Advisory Layer**:

```
[ Web Data Sources ] 
        │
        ├───────────────────────────────┐
        ▼                               ▼
[ Engine 1: Course Ingestion ]   [ Engine 2: Job Ingestion ]
  (HTML/JS Scraper for ITI/MSSDS)  (Job Board Scraper + Relevant Filter)
        │                               │
        └───────────────┬───────────────┘
                        ▼
         [ Engine 3: Skill Extraction Engine ]
           (Parses & Normalizes Skill Entities)
                        │
                        ▼
         [ Engine 4: Skill Gap Analysis Engine ]
           (Computes Alignment Score & Skill Gaps)
                        │
                        ▼
            [ LLM Recommendation Layer ]
      (Generates 20-hr Micro-Curriculum Packs & Reports)
                        │
                        ▼
             [ Frontend: Sarvam-AI / Web UI ]
       (District GIS Heatmap, Admin Dash, Marathi Toggle)
```

### Key Technical Principles Specified by User:
1. **API Key Constraint**: **Zero API keys** for all scraping, parsing, NLP, scoring, and data extraction engines. *Only the LLM layer is allowed to use an API key* (e.g. Gemini / Llama / OpenAI).
2. **Relevant Job Filtering**: Engine 2 filters job postings to only store and analyze jobs relevant to the targeted course profiles, minimizing storage, compute, and memory complexity.
3. **Caching & Incremental Sync**:
   - Unique hash IDs for deduplication.
   - Timestamp-based incremental scraping (never re-scrape unchanged data).
   - Pre-loaded offline seed datasets (5,000+ scraped Maharashtra job postings & ITI syllabi PDFs parsed to JSON) to ensure instant, fail-proof demo performance.

---

## 3. Comprehensive Strategy & Architectural Review

### A. Strengths of the Proposed Architecture
- **Clean Decoupling**: Separation into 4 dedicated pipeline engines ensures modularity, testability, and resilience.
- **Zero API Cost & Rate Limit Immunity**: Running ingestion, parsing, TF-IDF / local embeddings, and gap scoring without third-party API dependencies makes the solution cost-free to scale, offline-capable, and reliable during evaluation.
- **Performance Optimization**: Scrape-filtering and timestamp hashing eliminate redundant computations and reduce runtime latency.

### B. Identified Gaps & Refinements Needed

| Architectural Layer | Potential Pitfall / Gap | Recommended Solution |
| :--- | :--- | :--- |
| **Engine 1 (Course Ingestion)** | ITI / MSSDS course syllabi are mostly non-standardized multi-page PDF documents rather than clean HTML web pages. | Implement a PDF-to-JSON preprocessing pipeline (`pdfplumber` / PyPDF2) with standard JSON schema exports for course modules. |
| **Engine 2 (Job Ingestion)** | Scraping live job boards (Naukri, Indeed) during a live demo risk anti-bot blocks, IP rate limits, and network latency. | Combine standard BeautifulSoup / Selenium scrapers with a rich local SQLite/Postgres pre-seeded dataset of Maharashtra MIDC job roles. |
| **Engine 3 (Skill Extraction)** | Standard keyword matching fails on natural language variations (e.g., "PLC programming" vs. "Programmable Logic Controllers"). | Use an open-source local NLP engine (`spaCy` entity recognition + local `sentence-transformers` embeddings) requiring **zero API keys**. |
| **Engine 4 (Skill Gap)** | Simple string comparison yields inaccurate match percentages. | Implement a hybrid scoring metric: **Jaccard Skill Set Overlap + Cosine Similarity of Local Vector Embeddings**. |
| **LLM Recommendation** | Raw LLM output can hallucinate or output non-deterministic formats. | Enforce JSON schema output / structured prompt templates for bridge course modules (e.g., 20-hr syllabus breakdown). |
| **Frontend & Visualization** | Static tables fail to impress SIH evaluators. | Build a dynamic dashboard featuring interactive Leaflet.js GIS map of Maharashtra districts (Pune, MIDC hubs) and real-time gap charts (Recharts/Chart.js). |

---

## 4. Technology Stack Specification (Zero-API Constraint Compliant)

- **Frontend**: HTML5 / JavaScript (React or Next.js / Vite), Leaflet.js (GIS Mapping), TailwindCSS / Vanilla CSS with modern glassmorphism.
- **Backend API**: Python FastAPI / Flask.
- **Data Ingestion (Engines 1 & 2)**: Python (`BeautifulSoup4`, `pdfplumber`, `requests`, `playwright` optional).
- **Skill Extraction & Vector Engine (Engine 3)**: Python `spaCy` (NER) + `sentence-transformers` (`all-MiniLM-L6-v2` locally downloaded - no API key) or TF-IDF vectorizer.
- **Database & Storage**: SQLite / PostgreSQL + ChromaDB / FAISS (Local Vector Database).
- **LLM Advisory Layer**: Gemini API / OpenAI API / Ollama (Only API key allowed).

---

## 5. Execution Roadmap & Next Steps

1. **Step 1: Data Preprocessing & Seeding**:
   - Seed ITI/MSSDS curriculum taxonomies into JSON format (Electrician, Fitter, Welder, Computer Operator, Solar Technician, EV Maintenance).
   - Seed 5,000+ local job postings categorized by Maharashtra districts (Pune, Nashik, Thane, Nagpur, Chhatrapati Sambhajinagar).

2. **Step 2: Engine Implementation**:
   - `Engine 1`: Course loader/parser (PDF/HTML to JSON).
   - `Engine 2`: Job loader & domain relevance filter.
   - `Engine 3`: Local zero-API NLP skill extractor & canonical taxonomy mapper.
   - `Engine 4`: Mathematical skill gap matrix & percentage score generator.

3. **Step 3: LLM Integration**:
   - Bridge-course generator producing structured 20-hour micro-credentials for identified skill deficits.

4. **Step 4: Frontend Development**:
   - District-level GIS heatmap (Maharashtra MIDC clusters).
   - Curriculum vs. Market Skill Gap Radar & Bar charts.
   - Student & Policy Maker Dual-View Interfaces (English + Marathi translation support).
