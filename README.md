# NSAALP — National Skill Alignment & Adaptive Learning Portal

AI-powered skill gap analysis and personalized learning pathway generator.

---
## Setup Instructions

### Step 1 — Install dependencies
pip install Flask pdfminer.six pdfplumber pypdf

### Step 2 — Run the server
cd ai-onboarding-engine
python run.py

### Step 3 — Open browser
http://127.0.0.1:5000

---

## Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| Flask | >=2.3.0 | Web server and REST API |
| pdfminer.six | >=20221105 | PDF extraction (primary) |
| pdfplumber | >=0.9.0 | PDF extraction (structured) |
| pypdf | >=3.0.0 | PDF extraction (fallback) |

---

## Skill Gap Analysis Logic

### Skill Extraction
- Text matched against 80+ O*NET skill terms
- Alias resolution: "ML" → Machine Learning,
  "k8s" → Docker & Kubernetes, "pandas" → Data Analysis with Pandas

### Gap Calculation — Jaccard Similarity
Match % = |Resume Skills ∩ JD Skills| / |JD Skills| × 100

Example:
  Resume = {Python, SQL, Pandas}
  JD     = {Python, SQL, Machine Learning, Docker, NLP}
  Match  = 2/5 × 100 = 40%

### Adaptive Pathing — Kahn's Topological Sort
1. Build Directed Acyclic Graph of skill dependencies
   Deep Learning → ML → Python → Programming Basics
2. Run Kahn's BFS algorithm to sort prerequisites first
3. Filter by user level:
   Beginner  → all steps included
   Intermediate → skip known basics  
   Advanced  → skip all beginner courses

---

## Datasets Used
1. Kaggle Resume Dataset — Sneha Anbhawal (2023)
   https://kaggle.com/datasets/snehaanbhawal/resume-dataset
2. O*NET Skills Database v28.0 — U.S. Dept. of Labor
   https://onetcenter.org/db_releases.html
3. Jobs & Job Description Dataset — Kshitiz Regmi
   https://kaggle.com/datasets/kshitizregmi/jobs-and-job-description

---

## Project Structure
ai-onboarding-engine/
├── backend/app.py          # Flask API + all AI logic
├── frontend/index.html     # Single-page UI
├── frontend/static/css/    # Stylesheet
├── frontend/static/js/     # Frontend logic
├── data/courses.json       # Course catalogue
├── Dockerfile
├── requirements.txt
└── run.py
```

---

### 2. requirements.txt — Should Look Like This
```
Flask>=2.3.0
pdfminer.six>=20221105
pdfplumber>=0.9.0
pypdf>=3.0.0
