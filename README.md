# NSAALP — National Skill Alignment & Adaptive Learning Portal

AI-powered skill gap analysis and personalized learning pathway generator.

## 🚀 Live Demo

https://nsaalp-2.onrender.com

---

## Setup Instructions (Local)

### Step 1 — Clone repository

```bash
git clone https://github.com/joshiaditi18/NSAALP.git
cd NSAALP
```

### Step 2 — Install dependencies

```bash
pip install -r requirements.txt
```

### Step 3 — Run server

```bash
python run.py
```

### Step 4 — Open browser

```
http://127.0.0.1:5000
```

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| Flask | >=2.3.0 | Web server and REST API |
| gunicorn | latest | Production server |
| pdfminer.six | >=20221105 | PDF extraction |
| pdfplumber | >=0.9.0 | Structured PDF extraction |
| pypdf | >=3.0.0 | PDF extraction fallback |

---

## Features

### Skill Extraction
- Matches resume text against 80+ O*NET skill terms
- Alias resolution:
  - ML → Machine Learning
  - k8s → Docker & Kubernetes
  - pandas → Data Analysis with Pandas

### Skill Gap Analysis

Uses Jaccard Similarity:

```
Match % =
|Resume Skills ∩ Job Skills|
---------------------------
       |Job Skills|
       × 100
```

Example:

```
Resume:
Python, SQL, Pandas

Job:
Python, SQL, Machine Learning, Docker, NLP

Match:
2/5 × 100 = 40%
```

---

## Adaptive Learning Path

Uses Kahn's Topological Sort algorithm.

Skill dependency example:

```
Deep Learning
      ↓
Machine Learning
      ↓
Python
      ↓
Programming Basics
```

Learning levels:

- Beginner → complete pathway
- Intermediate → removes known basics
- Advanced → removes beginner courses

---

## Dataset Sources

1. Kaggle Resume Dataset  
2. O*NET Skills Database  
3. Jobs & Job Description Dataset

---

## Project Structure

```
NSAALP/
│
├── backend/
│   └── app.py              # Flask API + AI logic
│
├── frontend/
│   ├── index.html
│   └── static/
│       ├── css/
│       └── js/
│
├── data/
│   └── courses.json
│
├── run.py
├── requirements.txt
├── Dockerfile
└── Procfile
```

---

## API Health Check

```
GET /api/ping
```

Response:

```json
{
 "status":"ok",
 "message":"Backend is running"
}
```

---

## Deployment

Deployed using:

- Render
- Gunicorn
- Flask

```
gunicorn run:app
```
