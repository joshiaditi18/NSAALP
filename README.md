# NSAALP — National Skill Alignment & Adaptive Learning Portal

AI-powered skill gap analysis and personalized learning pathway generator.

---

## QUICK START (3 ways to run)

### Option 1 — Easiest (Python script, all platforms)
```
python run.py
```

### Option 2 — Mac / Linux
```
bash start.sh
```

### Option 3 — Windows
Double-click `start.bat`  
OR in Command Prompt:
```
start.bat
```

### Option 4 — Manual
```bash
pip install -r requirements.txt
cd backend
python app.py
```

Then open: **http://localhost:5000**

---

## REQUIREMENTS
- Python 3.8 or newer
- pip (comes with Python)
- Internet connection (for Google Fonts in the browser)

## DEPENDENCIES (auto-installed)
- flask
- pdfminer.six
- pdfplumber
- pypdf

---

## PROJECT STRUCTURE
```
ai-onboarding-engine/
├── run.py              ← Run this to start (easiest)
├── start.sh            ← Mac/Linux startup
├── start.bat           ← Windows startup
├── requirements.txt
├── backend/
│   └── app.py          ← Flask server (all AI logic)
├── frontend/
│   ├── index.html      ← NSAALP portal UI
│   └── static/
│       ├── css/style.css
│       └── js/app.js
└── data/
    └── courses.json    ← 35 courses, 80+ skills
```

## TROUBLESHOOTING

**"Module not found" error:**
```bash
pip install flask pdfminer.six pdfplumber pypdf
```

**Port 5000 already in use:**
Edit `backend/app.py` last line — change `port=5000` to `port=5001`  
Then open http://localhost:5001

**Mac: port 5000 blocked by AirPlay:**
```bash
cd backend && python app.py --port 5001
```
Or edit app.py: change `port=5000` to `port=5001`

**PDF not extracting:**
Switch to "Paste Text" tab and paste resume content directly.

---

## DATASETS USED
- **Kaggle Resume Dataset** — Sneha Anbhawal (skill extraction validation)
- **O*NET Skills Database v28.0** — U.S. Department of Labor (skill taxonomy)
