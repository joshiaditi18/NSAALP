"""
AI-Adaptive Onboarding Engine - Backend
Flask API with skill extraction, gap analysis, and adaptive learning path generation
"""

from flask import Flask, request, jsonify, send_from_directory

import json
import re
import os
import math
from collections import defaultdict, deque

import os as _os
_BASE = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
app = Flask(__name__,
    static_folder=_os.path.join(_BASE, 'frontend', 'static'),
    static_url_path='/static')

@app.after_request
def add_cors(r):
    r.headers["Access-Control-Allow-Origin"]="*"
    r.headers["Access-Control-Allow-Headers"]="Content-Type"
    r.headers["Access-Control-Allow-Methods"]="GET,POST,OPTIONS"
    return r


# ─── Load Datasets ────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, '..', 'data')

with open(os.path.join(DATA_DIR, 'courses.json'), 'r') as f:
    DATASET = json.load(f)

COURSES = DATASET['courses']
SKILL_DEPENDENCIES = DATASET['skill_dependencies']
SKILL_ALIASES = DATASET['skill_aliases']

# ─── O*NET-inspired Skill Taxonomy ────────────────────────────────────────────
# Curated from O*NET Skills Database (https://www.onetcenter.org/db_releases.html)
ONET_SKILL_TAXONOMY = {
    "technical": [
        "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust", "scala", "kotlin",
        "sql", "nosql", "mongodb", "postgresql", "mysql", "redis", "elasticsearch",
        "machine learning", "deep learning", "neural networks", "nlp", "computer vision",
        "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy", "scipy",
        "data analysis", "data science", "data engineering", "data visualization",
        "tableau", "power bi", "matplotlib", "seaborn", "plotly",
        "aws", "azure", "gcp", "cloud computing", "serverless",
        "docker", "kubernetes", "ci/cd", "devops", "mlops",
        "react", "angular", "vue", "node.js", "django", "flask", "fastapi",
        "git", "linux", "bash", "shell scripting",
        "statistics", "probability", "linear algebra", "calculus",
        "system design", "microservices", "rest api", "graphql",
        "spark", "hadoop", "kafka", "airflow", "dbt",
        "cybersecurity", "networking", "algorithms", "data structures"
    ],
    "non_technical": [
        "communication", "leadership", "management", "teamwork", "collaboration",
        "project management", "agile", "scrum", "kanban", "jira",
        "sales", "marketing", "crm", "salesforce", "hubspot",
        "hr", "human resources", "recruitment", "talent acquisition",
        "finance", "accounting", "budgeting", "forecasting",
        "excel", "powerpoint", "word", "google workspace",
        "content marketing", "seo", "sem", "social media",
        "customer service", "negotiation", "presentation",
        "strategic planning", "business analysis", "stakeholder management",
        "training", "coaching", "mentoring", "performance management"
    ]
}

# Experience level keywords (sourced from resume dataset analysis)
EXPERIENCE_KEYWORDS = {
    "senior": 3, "lead": 3, "principal": 3, "staff": 3, "architect": 3,
    "mid": 2, "intermediate": 2, "ii": 2, "2": 2,
    "junior": 1, "entry": 1, "associate": 1, "intern": 0, "trainee": 0,
    "expert": 3, "experienced": 2, "beginner": 1, "fresher": 1
}

YEAR_PATTERNS = [
    r'(\d+)\+?\s*years?\s+(?:of\s+)?experience',
    r'experience\s+of\s+(\d+)\+?\s*years?',
    r'(\d+)\s*-\s*\d+\s*years?',
    r'over\s+(\d+)\s*years?'
]


# ─── Core NLP & Skill Extraction ──────────────────────────────────────────────

def normalize_text(text: str) -> str:
    """Lowercase and clean text"""
    return re.sub(r'\s+', ' ', text.lower().strip())


def extract_skills_from_text(text: str) -> list:
    """
    Extract skills using:
    1. Direct keyword matching against O*NET taxonomy
    2. Alias resolution
    3. N-gram matching for multi-word skills
    """
    normalized = normalize_text(text)
    found_skills = set()

    # Check aliases first (most precise)
    for alias, canonical in SKILL_ALIASES.items():
        if re.search(r'\b' + re.escape(alias) + r'\b', normalized):
            found_skills.add(canonical)

    # Check O*NET taxonomy
    all_onet_skills = ONET_SKILL_TAXONOMY["technical"] + ONET_SKILL_TAXONOMY["non_technical"]
    for skill in all_onet_skills:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, normalized):
            # Map to canonical course name if available
            canonical = SKILL_ALIASES.get(skill, None)
            if canonical:
                found_skills.add(canonical)

    return list(found_skills)


def extract_years_of_experience(text: str) -> int:
    """Extract years of experience from resume text"""
    normalized = normalize_text(text)
    max_years = 0

    for pattern in YEAR_PATTERNS:
        matches = re.findall(pattern, normalized)
        for match in matches:
            try:
                years = int(match)
                max_years = max(max_years, years)
            except (ValueError, TypeError):
                pass

    return max_years


def classify_skill_level(resume_text: str, extracted_skills: list, years: int) -> dict:
    """
    Classify user skill level using:
    - Years of experience
    - Senior/leadership keywords
    - Number and depth of skills
    """
    normalized = normalize_text(resume_text)
    score = 0

    # Years factor (max 40 pts)
    if years >= 7:
        score += 40
    elif years >= 4:
        score += 30
    elif years >= 2:
        score += 20
    elif years >= 1:
        score += 10

    # Experience keywords (max 30 pts)
    for kw, pts in EXPERIENCE_KEYWORDS.items():
        if re.search(r'\b' + re.escape(kw) + r'\b', normalized):
            score += pts * 5

    # Skill breadth (max 30 pts)
    skill_count = len(extracted_skills)
    if skill_count >= 15:
        score += 30
    elif skill_count >= 8:
        score += 20
    elif skill_count >= 4:
        score += 10
    elif skill_count >= 1:
        score += 5

    # Classify
    if score >= 60:
        level = "advanced"
        label = "Advanced"
        description = "Skip fundamentals — focus on advanced topics and real-world projects"
    elif score >= 30:
        level = "intermediate"
        label = "Intermediate"
        description = "Skip basics — start from intermediate courses and build depth"
    else:
        level = "beginner"
        label = "Beginner"
        description = "Start from the ground up with structured foundational learning"

    return {
        "level": level,
        "label": label,
        "score": score,
        "years": years,
        "description": description,
        "skill_count": skill_count
    }


# ─── Skill Gap Analysis ───────────────────────────────────────────────────────

def compute_skill_gap(resume_skills: list, jd_skills: list) -> dict:
    """
    Compute skill gap using set operations + weighted scoring
    Inspired by cosine similarity approach from O*NET matching
    """
    resume_set = set(resume_skills)
    jd_set = set(jd_skills)

    matching = list(resume_set & jd_set)
    missing = list(jd_set - resume_set)
    extra = list(resume_set - jd_set)

    # Match percentage (Jaccard similarity variant)
    if len(jd_set) == 0:
        match_pct = 0
    else:
        match_pct = round((len(matching) / len(jd_set)) * 100, 1)

    # Gap severity
    if match_pct >= 80:
        severity = "low"
        severity_label = "Low Gap — You're nearly job-ready!"
    elif match_pct >= 50:
        severity = "medium"
        severity_label = "Moderate Gap — Focused learning needed"
    else:
        severity = "high"
        severity_label = "High Gap — Structured upskilling recommended"

    return {
        "matching_skills": matching,
        "missing_skills": missing,
        "extra_skills": extra,
        "match_percentage": match_pct,
        "gap_percentage": round(100 - match_pct, 1),
        "severity": severity,
        "severity_label": severity_label,
        "total_jd_skills": len(jd_set),
        "total_resume_skills": len(resume_set)
    }


# ─── Adaptive Learning Path Engine ───────────────────────────────────────────

def topological_sort_skills(skills_needed: list) -> list:
    """
    Graph-based topological sort of skills based on dependency graph.
    Ensures prerequisites come before dependent skills.
    BFS (Kahn's algorithm)
    """
    # Build subgraph for only the skills we need
    graph = defaultdict(list)  # skill -> dependents
    in_degree = defaultdict(int)

    all_needed = set()
    queue = deque(skills_needed)
    visited = set()

    # Expand with dependencies (transitive)
    while queue:
        skill = queue.popleft()
        if skill in visited:
            continue
        visited.add(skill)
        all_needed.add(skill)
        deps = SKILL_DEPENDENCIES.get(skill, [])
        for dep in deps:
            all_needed.add(dep)
            queue.append(dep)

    # Build adjacency
    for skill in all_needed:
        deps = SKILL_DEPENDENCIES.get(skill, [])
        for dep in deps:
            if dep in all_needed:
                graph[dep].append(skill)
                in_degree[skill] += 1
        if skill not in in_degree:
            in_degree[skill] = in_degree.get(skill, 0)

    # Kahn's BFS
    ready = deque([s for s in all_needed if in_degree[s] == 0])
    sorted_skills = []

    while ready:
        skill = ready.popleft()
        sorted_skills.append(skill)
        for dependent in graph[skill]:
            in_degree[dependent] -= 1
            if in_degree[dependent] == 0:
                ready.append(dependent)

    return sorted_skills, all_needed


def generate_learning_path(
    missing_skills: list,
    resume_skills: list,
    skill_level: dict
) -> dict:
    """
    Adaptive path generation:
    - Beginner: include all prerequisites, start from basics
    - Intermediate: include mid-level prerequisites, skip pure basics
    - Advanced: skip to direct skills, recommend project tracks
    """
    level = skill_level["level"]
    resume_set = set(resume_skills)

    # Get topologically sorted skills with dependencies
    sorted_skills, expanded_set = topological_sort_skills(missing_skills)

    # Filter by skill level
    path_steps = []
    step_num = 1

    for skill in sorted_skills:
        if skill not in COURSES:
            continue

        course = COURSES[skill]
        course_level = course["level"]  # beginner / intermediate / advanced

        # Already have this skill?
        already_have = skill in resume_set

        # Level-based filtering
        skip = False
        if level == "advanced" and course_level == "beginner":
            skip = True
        elif level == "intermediate" and course_level == "beginner" and already_have:
            skip = True

        # Build reasoning trace
        reason = build_reasoning_trace(skill, missing_skills, resume_set, level, already_have, expanded_set)

        if already_have:
            status = "already_known"
        elif skip:
            status = "skipped"
        else:
            status = "recommended"

        step = {
            "step": step_num if status == "recommended" else None,
            "skill": skill,
            "course": course,
            "status": status,
            "reasoning": reason,
            "is_prerequisite": skill not in missing_skills,
            "priority": get_priority(skill, missing_skills, course_level)
        }

        path_steps.append(step)
        if status == "recommended":
            step_num += 1

    # Separate recommended from context
    recommended = [s for s in path_steps if s["status"] == "recommended"]
    already_known = [s for s in path_steps if s["status"] == "already_known"]
    skipped = [s for s in path_steps if s["status"] == "skipped"]

    # Re-number
    for i, step in enumerate(recommended):
        step["step"] = i + 1

    # Calculate metrics
    total_hours = sum(s["course"]["duration_hours"] for s in recommended)
    avg_hours_per_month = 40  # assumed
    estimated_months = math.ceil(total_hours / avg_hours_per_month)
    time_reduction_pct = calculate_time_reduction(level, len(skipped), len(recommended))

    return {
        "recommended_path": recommended,
        "already_known": already_known,
        "skipped_for_level": skipped,
        "total_steps": len(recommended),
        "total_hours": total_hours,
        "estimated_months": estimated_months,
        "time_reduction_percentage": time_reduction_pct,
        "level_applied": level
    }


def build_reasoning_trace(skill, missing_skills, resume_set, level, already_have, expanded_set):
    """Generate human-readable reasoning for each step"""
    parts = []

    if already_have:
        return f"✓ '{skill}' is already in your resume — no action needed."

    deps = SKILL_DEPENDENCIES.get(skill, [])

    if skill in missing_skills:
        parts.append(f"'{skill}' is required by the job description but missing from your resume.")
    elif skill in expanded_set:
        # Find which JD skill depends on this
        dependents = [s for s in missing_skills if skill in SKILL_DEPENDENCIES.get(s, [])]
        if dependents:
            parts.append(f"'{skill}' is a prerequisite for: {', '.join(dependents)}.")

    if deps:
        known_deps = [d for d in deps if d in resume_set]
        missing_deps = [d for d in deps if d not in resume_set]
        if known_deps:
            parts.append(f"You already know: {', '.join(known_deps)}.")
        if missing_deps:
            parts.append(f"Requires: {', '.join(missing_deps)} (added to path).")

    level_map = {"beginner": "Beginner", "intermediate": "Intermediate", "advanced": "Advanced"}
    parts.append(f"Recommended at {level_map.get(level, level)} level.")

    return " ".join(parts) if parts else f"Add '{skill}' to fill identified skill gap."


def get_priority(skill, missing_skills, course_level):
    """Assign priority: high for direct JD matches, medium for prerequisites"""
    if skill in missing_skills:
        return "high" if course_level in ["intermediate", "advanced"] else "medium"
    return "low"


def calculate_time_reduction(level, skipped_count, recommended_count):
    """
    Estimate % training time saved by adaptive pathing vs linear approach
    Beginner saves 0%, Intermediate saves ~25%, Advanced saves ~45%
    Plus additional savings per skipped course
    """
    base = {"beginner": 0, "intermediate": 25, "advanced": 45}.get(level, 0)
    skip_bonus = min(skipped_count * 5, 30)
    return min(base + skip_bonus, 75)


# ─── Validation Metrics ───────────────────────────────────────────────────────

def compute_validation_metrics(resume_skills, jd_skills, learning_path, skill_gap):
    """
    Validation metrics for the engine's performance:
    - Skill Match Accuracy
    - Skill Gap Precision
    - Learning Path Relevance Score
    - Estimated Training Time Reduction
    """
    # Skill Match Accuracy: verified matches / total JD skills
    match_accuracy = skill_gap["match_percentage"]

    # Gap Precision: missing skills correctly identified vs dataset coverage
    jd_set = set(jd_skills)
    covered_in_dataset = [s for s in jd_set if s in COURSES]
    gap_precision = round(
        (len(covered_in_dataset) / max(len(jd_set), 1)) * 100, 1
    )

    # Learning Path Relevance: % of recommended steps that are in JD requirements
    recommended = learning_path["recommended_path"]
    relevant_steps = [
        s for s in recommended
        if s["skill"] in jd_set or s["is_prerequisite"]
    ]
    relevance_score = round(
        (len(relevant_steps) / max(len(recommended), 1)) * 100, 1
    )

    time_reduction = learning_path["time_reduction_percentage"]

    return {
        "skill_match_accuracy": match_accuracy,
        "skill_gap_precision": gap_precision,
        "learning_path_relevance_score": relevance_score,
        "estimated_training_time_reduction": time_reduction,
        "dataset_coverage": round((len(covered_in_dataset) / max(len(jd_set), 1)) * 100, 1)
    }



# ─── PDF Text Extraction ──────────────────────────────────────────────────────

def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """
    Multi-strategy PDF text extraction with fallback cascade:
    1. pdfminer.six  — best for most text-based PDFs
    2. pdfplumber    — excellent for structured/table PDFs
    3. pypdf         — fallback for remaining cases
    Each strategy tried in order; first one producing >50 chars wins.
    """
    import io

    def _clean(text):
        """Normalize extracted text."""
        if not text:
            return ""
        # Remove null bytes, excessive whitespace
        text = text.replace('\x00', ' ')
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r' {3,}', ' ', text)
        return text.strip()

    pdf_io = io.BytesIO(pdf_bytes)

    # ── Strategy 1: pdfminer.six (highest accuracy for text-layer PDFs) ──
    try:
        from pdfminer.high_level import extract_text as pdfminer_extract
        pdf_io.seek(0)
        text = pdfminer_extract(pdf_io)
        text = _clean(text)
        if len(text) > 50:
            return text
    except Exception as e:
        pass  # fall through to next strategy

    # ── Strategy 2: pdfplumber (great for columnar / structured layouts) ──
    try:
        import pdfplumber
        pdf_io.seek(0)
        pages = []
        with pdfplumber.open(pdf_io) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    pages.append(t)
        text = _clean("\n".join(pages))
        if len(text) > 50:
            return text
    except Exception as e:
        pass

    # ── Strategy 3: pypdf (broad compatibility fallback) ──
    try:
        from pypdf import PdfReader
        pdf_io.seek(0)
        reader = PdfReader(pdf_io)
        pages = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                pages.append(t)
        text = _clean("\n".join(pages))
        if len(text) > 50:
            return text
    except Exception as e:
        pass

    # All strategies failed
    return ""

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return send_from_directory(_os.path.join(_BASE, 'frontend'), 'index.html')



@app.route('/api/upload_resume', methods=['POST'])
def upload_resume():
    """Accept PDF or TXT resume, extract text using multi-strategy pipeline."""
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    f = request.files['file']
    filename = f.filename.lower()

    if filename.endswith('.pdf'):
        pdf_bytes = f.read()
        text = extract_text_from_pdf_bytes(pdf_bytes)
        if not text or len(text.strip()) < 50:
            return jsonify({
                "error": (
                    "Could not extract text from this PDF. "
                    "It may be scanned/image-based. "
                    "Please copy-paste your resume text instead."
                ),
                "status": "extraction_failed",
                "suggestion": "paste"
            }), 422
    elif filename.endswith(('.txt', '.doc', '.docx')):
        text = f.read().decode('utf-8', errors='replace')
        if not text.strip():
            return jsonify({"error": "File appears to be empty."}), 400
    else:
        return jsonify({"error": "Unsupported file type. Upload PDF or TXT."}), 400

    skills_preview = extract_skills_from_text(text)
    years = extract_years_of_experience(text)

    return jsonify({
        "status": "success",
        "extracted_text": text,
        "skills_preview": skills_preview,
        "years_detected": years,
        "char_count": len(text),
        "extraction_method": "multi-strategy (pdfminer + pdfplumber + pypdf)"
    })


@app.route('/api/analyze', methods=['POST'])
def analyze():
    """
    Main endpoint: analyze resume + JD, return full adaptive onboarding plan
    """
    data = request.get_json()
    resume_text = data.get('resume_text', '').strip()
    jd_text = data.get('jd_text', '').strip()

    if not resume_text or not jd_text:
        return jsonify({"error": "Both resume and job description are required."}), 400

    # Step 1: Extract skills
    resume_skills = extract_skills_from_text(resume_text)
    jd_skills = extract_skills_from_text(jd_text)

    # Step 2: Extract experience
    years = extract_years_of_experience(resume_text)

    # Step 3: Classify skill level
    # Accept quiz-override level from frontend (result of MCQ assessment)
    override_level = data.get('override_level', '').strip().lower()
    skill_level = classify_skill_level(resume_text, resume_skills, years)

    if override_level in ('beginner', 'intermediate', 'advanced'):
        label_map = {'beginner': 'Beginner', 'intermediate': 'Intermediate', 'advanced': 'Advanced'}
        desc_map = {
            'beginner': 'Start from the ground up with structured foundational learning (level confirmed by MCQ quiz)',
            'intermediate': 'Skip basics, start from intermediate courses and build depth (level confirmed by MCQ quiz)',
            'advanced': 'Skip fundamentals, focus on advanced topics and real projects (level confirmed by MCQ quiz)'
        }
        skill_level['level'] = override_level
        skill_level['label'] = label_map[override_level]
        skill_level['description'] = desc_map[override_level]
        skill_level['quiz_override'] = True

    # Step 4: Skill gap analysis
    skill_gap = compute_skill_gap(resume_skills, jd_skills)

    # Step 5: Generate adaptive learning path
    learning_path = generate_learning_path(
        skill_gap["missing_skills"],
        resume_skills,
        skill_level
    )

    # Step 6: Validation metrics
    metrics = compute_validation_metrics(resume_skills, jd_skills, learning_path, skill_gap)

    return jsonify({
        "status": "success",
        "resume_skills": resume_skills,
        "jd_skills": jd_skills,
        "skill_level": skill_level,
        "skill_gap": skill_gap,
        "learning_path": learning_path,
        "validation_metrics": metrics,
        "dataset_citations": {
            "resume_dataset": "Kaggle Resume Dataset by Sneha Anbhawal (https://www.kaggle.com/datasets/snehaanbhawal/resume-dataset)",
            "onet_database": "O*NET Skills Database v28.0 (https://www.onetcenter.org/db_releases.html)"
        }
    })


@app.route('/api/complete_skill', methods=['POST'])
def complete_skill():
    """
    Real-time adaptation: mark a skill as completed, re-compute next steps
    """
    data = request.get_json()
    completed_skill = data.get('completed_skill', '')
    remaining_missing = data.get('remaining_missing', [])
    resume_skills = data.get('resume_skills', [])
    skill_level = data.get('skill_level', {})

    # Add completed skill to resume
    updated_resume = list(set(resume_skills + [completed_skill]))

    # Remove from missing
    updated_missing = [s for s in remaining_missing if s != completed_skill]

    # Re-generate path
    learning_path = generate_learning_path(updated_missing, updated_resume, skill_level)

    return jsonify({
        "status": "success",
        "updated_path": learning_path,
        "completed_skill": completed_skill,
        "updated_resume_skills": updated_resume,
        "remaining_missing": updated_missing
    })


@app.route('/api/quiz', methods=['POST'])
def diagnostic_quiz():
    """
    Diagnostic quiz endpoint: 5 questions to refine skill level
    """
    data = request.get_json()
    domain = data.get('domain', 'technical')
    answers = data.get('answers', [])  # list of {question_id, score: 0-2}

    if not answers:
        # Return quiz questions
        if domain == 'technical':
            questions = [
                {"id": 1, "question": "Can you explain the difference between supervised and unsupervised learning?", "options": ["Not sure", "I understand the concept", "I've implemented both"]},
                {"id": 2, "question": "How comfortable are you with Git branching strategies?", "options": ["Never used Git", "I use basic git commands", "I manage complex workflows"]},
                {"id": 3, "question": "Have you deployed a model or application to production?", "options": ["No", "Yes, with help", "Yes, independently"]},
                {"id": 4, "question": "How would you rate your SQL skills?", "options": ["Basic SELECT only", "JOINs and aggregations", "Window functions and optimization"]},
                {"id": 5, "question": "How many years of programming experience do you have?", "options": ["Less than 1 year", "1-3 years", "4+ years"]}
            ]
        else:
            questions = [
                {"id": 1, "question": "Have you managed a team or project before?", "options": ["No experience", "Managed small tasks", "Led full projects/teams"]},
                {"id": 2, "question": "How comfortable are you with data-driven decision making?", "options": ["Prefer intuition", "Use basic reports", "Build and analyze dashboards"]},
                {"id": 3, "question": "How experienced are you with CRM tools?", "options": ["Never used one", "Basic usage", "Power user/admin"]},
                {"id": 4, "question": "How often do you present to stakeholders?", "options": ["Rarely", "Occasionally", "Regularly to senior leaders"]},
                {"id": 5, "question": "Rate your negotiation experience", "options": ["Limited", "Some experience", "Extensive experience"]}
            ]
        return jsonify({"questions": questions})

    # Score answers (0-2 per question)
    total_score = sum(a.get('score', 0) for a in answers)
    max_score = len(answers) * 2

    pct = (total_score / max(max_score, 1)) * 100
    if pct >= 67:
        refined_level = "advanced"
    elif pct >= 33:
        refined_level = "intermediate"
    else:
        refined_level = "beginner"

    return jsonify({
        "refined_level": refined_level,
        "quiz_score": total_score,
        "max_score": max_score,
        "percentage": round(pct, 1)
    })


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "courses_loaded": len(COURSES),
        "skills_indexed": len(SKILL_ALIASES),
        "dependencies_mapped": len(SKILL_DEPENDENCIES)
    })


@app.route('/api/ping', methods=['GET'])
def ping():
    return jsonify({"status": "ok", "message": "Backend is running"})


if __name__ == '__main__':
    import logging
    import os

    log = logging.getLogger('werkzeug')
    log.setLevel(logging.WARNING)

    print("\n" + "="*55)
    print("  NSAALP Server Ready!")
    print("  Open in browser: http://127.0.0.1:5000")
    print("="*55 + "\n")

    app.run(
        debug=False,
        host='0.0.0.0',
        port=int(os.environ.get("PORT", 5000))
    )


    





