/* ── NSAALP Frontend — Complete Clean Build ────────────────────────────────── */

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  analysisResult: null,
  completedSkills: new Set(),
  remainingMissing: [],
  resumeSkills: [],
  skillLevel: {},
  uploadedResumeText: '',
  activeResumeTab: 'paste',
  _overrideLevel: null,
  mcqDomain: 'technical',
  mcqQuestions: [],
  mcqCurrentIdx: 0,
  mcqAnswers: [],
  mcqActive: false,
  mcqRefinedLevel: null,
  diagQuestions: [],
  diagDomain: 'technical'
};

const API = ''; // Same origin — Flask serves both frontend and API

// ── Utility ───────────────────────────────────────────────────────────────────
function sid(str) { return str.replace(/[^a-zA-Z0-9]/g, '_'); }

// ── Connection health check ───────────────────────────────────────────────────
async function checkBackendConnection() {
  const dot   = document.getElementById('conn-status-dot');
  const txt   = document.getElementById('conn-status-text');
  const panel = document.getElementById('conn-error-panel');
  try {
    const controller = new AbortController();
    const tid = setTimeout(function() { controller.abort(); }, 4000);
    const r = await fetch('/api/ping', { method: 'GET', signal: controller.signal });
    clearTimeout(tid);
    if (r.ok) {
      if (dot) { dot.style.background = '#138808'; dot.style.boxShadow = '0 0 6px #138808'; }
      if (txt) { txt.textContent = 'Live'; txt.style.display = 'inline'; }
      if (panel) panel.style.display = 'none';
      return true;
    }
  } catch (e) {
    if (dot) { dot.style.background = '#C0392B'; dot.style.boxShadow = '0 0 6px #C0392B'; }
    if (txt) { txt.textContent = 'Offline'; txt.style.display = 'inline'; }
    if (panel) {
      panel.style.display = 'block';
      var det = document.getElementById('conn-error-detail');
      if (det) det.textContent = (e && e.message) ? e.message : 'Connection refused';
    }
  }
  return false;
}

function showConnectionError(err) {
  stopLoading();
  var panel = document.getElementById('conn-error-panel');
  if (panel) {
    panel.style.display = 'block';
    var det = document.getElementById('conn-error-detail');
    if (det) det.textContent = (err && err.message) ? err.message : String(err);
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    alert('Backend not reachable.\n\nRun: python run.py\nThen open: http://127.0.0.1:5000');
  }
}

// ── Navigation ────────────────────────────────────────────────────────────────
function showSection(name) {
  var sections = ['input', 'assessment', 'results', 'roadmap'];
  sections.forEach(function(s) {
    var el = document.getElementById('section-' + s);
    if (el) el.style.display = s === name ? 'block' : 'none';
    var btn = document.getElementById('nav-' + s);
    if (btn) btn.classList.toggle('active', s === name);
    var mbtn = document.getElementById('mnav-' + s);
    if (mbtn) mbtn.classList.toggle('active', s === name);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileNav() {
  var nav = document.getElementById('mobile-nav');
  if (nav) nav.classList.toggle('open');
}

// ── Resume Tab ────────────────────────────────────────────────────────────────
function switchResumeTab(tab) {
  state.activeResumeTab = tab;
  var paste  = document.getElementById('resume-paste-panel');
  var upload = document.getElementById('resume-upload-panel');
  var tbp    = document.getElementById('tab-paste');
  var tbu    = document.getElementById('tab-upload');
  if (paste)  { paste.style.display = tab === 'paste' ? 'flex' : 'none'; paste.style.flexDirection = 'column'; }
  if (upload) { upload.style.display = tab === 'upload' ? 'block' : 'none'; }
  if (tbp) tbp.classList.toggle('active', tab === 'paste');
  if (tbu) tbu.classList.toggle('active', tab === 'upload');
}

// ── File Upload ───────────────────────────────────────────────────────────────
function handleDragOver(e) {
  e.preventDefault();
  var z = document.getElementById('upload-zone');
  if (z) z.classList.add('drag-over');
}
function handleDragLeave() {
  var z = document.getElementById('upload-zone');
  if (z) z.classList.remove('drag-over');
}
function handleDrop(e) {
  e.preventDefault();
  var z = document.getElementById('upload-zone');
  if (z) z.classList.remove('drag-over');
  var file = e.dataTransfer.files[0];
  if (file) processFile(file);
}
function handleFileUpload(e) {
  var file = e.target.files[0];
  if (file) processFile(file);
}

async function processFile(file) {
  if (file.size > 5 * 1024 * 1024) { alert('File too large. Max 5MB.'); return; }
  var ext = '.' + file.name.split('.').pop().toLowerCase();
  if (ext !== '.pdf' && ext !== '.txt') { alert('Upload PDF or TXT only.'); return; }

  var zone   = document.getElementById('upload-zone');
  var status = document.getElementById('upload-status');
  if (zone)   zone.style.display   = 'none';
  if (status) { status.style.display = 'flex'; status.style.flexDirection = 'column'; }
  document.getElementById('us-name').textContent   = file.name;
  document.getElementById('us-detail').textContent = (file.size / 1024).toFixed(1) + ' KB — Processing...';
  document.getElementById('us-icon').textContent   = '⏳';

  var fd = new FormData();
  fd.append('file', file);
  try {
    var resp = await fetch(API + '/api/upload_resume', { method: 'POST', body: fd });
    var data = await resp.json();
    if (data.status === 'success') {
      state.uploadedResumeText = data.extracted_text;
      document.getElementById('us-icon').textContent   = '✅';
      document.getElementById('us-detail').textContent = data.char_count + ' chars extracted · ' + data.skills_preview.length + ' skills found';
      document.getElementById('resume-count').textContent = data.char_count + ' characters';
      if (data.skills_preview.length > 0) {
        document.getElementById('upload-skills-preview').style.display = 'block';
        document.getElementById('up-tags').innerHTML = data.skills_preview.map(function(s) {
          return '<span class="sd-tag">' + s + '</span>';
        }).join('');
      }
    } else {
      document.getElementById('us-icon').textContent   = '❌';
      document.getElementById('us-detail').textContent = data.error || 'Extraction failed. Try paste instead.';
    }
  } catch (err) {
    document.getElementById('us-icon').textContent   = '⚠️';
    document.getElementById('us-detail').textContent = 'Server error. Make sure backend is running.';
  }
}

function clearUpload() {
  state.uploadedResumeText = '';
  var zone   = document.getElementById('upload-zone');
  var status = document.getElementById('upload-status');
  var prev   = document.getElementById('upload-skills-preview');
  var file   = document.getElementById('resume-file');
  if (zone)   zone.style.display   = 'flex';
  if (status) status.style.display = 'none';
  if (prev)   prev.style.display   = 'none';
  if (file)   file.value           = '';
  document.getElementById('resume-count').textContent = '0 characters';
}

// ── Character counts ──────────────────────────────────────────────────────────
document.getElementById('resume-input').addEventListener('input', function() {
  document.getElementById('resume-count').textContent = this.value.length + ' characters';
});
document.getElementById('jd-input').addEventListener('input', function() {
  document.getElementById('jd-count').textContent = this.value.length + ' characters';
});

// ── Presets ───────────────────────────────────────────────────────────────────
var PRESETS = {
  data_science: {
    resume: 'Data Analyst with 2 years experience in business intelligence.\nSkills: Python, SQL, Excel, pandas, statistics, data visualization, Tableau.\nExperience with SQL queries, data cleaning, and basic predictive models.',
    jd: 'Senior Data Scientist.\nRequired: Machine Learning, Deep Learning, NLP, Python, TensorFlow, MLOps,\nDocker, Kubernetes, AWS, SQL Advanced, System Design, Data Visualization.'
  },
  frontend: {
    resume: 'Web developer with 1 year experience.\nSkills: HTML, CSS, JavaScript, basic React, Git.\nBuilt websites and e-commerce UI.',
    jd: 'Senior Frontend Engineer.\nRequirements: React, TypeScript, Node.js, Docker, Kubernetes, AWS, CI/CD.'
  },
  hr: {
    resume: 'HR Coordinator with 1 year experience.\nSkills: communication, Excel, basic recruitment, onboarding.',
    jd: 'HR Business Partner — Senior Level.\nRequirements: Talent Acquisition, HR strategy, performance management, leadership.'
  },
  sales: {
    resume: 'Sales associate with 6 months experience.\nSkills: communication, customer service, negotiation.',
    jd: 'Enterprise Sales Manager.\nRequirements: B2B sales, Salesforce CRM, sales strategy, team leadership, digital marketing.'
  }
};

function loadPreset(key) {
  var p = PRESETS[key];
  if (!p) return;
  switchResumeTab('paste');
  document.getElementById('resume-input').value = p.resume;
  document.getElementById('jd-input').value     = p.jd;
  document.getElementById('resume-count').textContent = p.resume.length + ' characters';
  document.getElementById('jd-count').textContent     = p.jd.length + ' characters';
}

// ── MCQ Question Bank ─────────────────────────────────────────────────────────
var MCQ_BANK = {
  technical: [
    { q: "What does 'immutable' mean in programming?", opts: ["Cannot be deleted","Cannot be changed after creation","Cannot be accessed by other functions","Cannot be inherited"], correct: 1, explain: "Immutable objects cannot be modified after creation. Strings and tuples in Python are immutable.", category: "Programming" },
    { q: "Which data structure is LIFO (Last-In-First-Out)?", opts: ["Queue","Linked List","Stack","Heap"], correct: 2, explain: "A Stack follows LIFO — last element added is first removed.", category: "Data Structures" },
    { q: "Time complexity of binary search?", opts: ["O(n)","O(n log n)","O(log n)","O(1)"], correct: 2, explain: "Binary search halves the search space each step — O(log n).", category: "Algorithms" },
    { q: "Which HTTP method UPDATES an existing resource?", opts: ["GET","POST","PUT","DELETE"], correct: 2, explain: "PUT replaces/updates. POST creates. GET retrieves. DELETE removes.", category: "Web Dev" },
    { q: "What does 'git rebase' do?", opts: ["Creates a new branch","Replays commits onto another base","Deletes old commits","Merges with a merge commit"], correct: 1, explain: "Rebase replays your commits on top of another branch creating linear history.", category: "Git" },
    { q: "What is a Docker container?", opts: ["A virtual machine","A lightweight isolated process","A cloud storage bucket","A load balancer"], correct: 1, explain: "Containers are isolated processes sharing the host OS kernel — lighter than VMs.", category: "DevOps" },
    { q: "What does INNER JOIN return in SQL?", opts: ["All rows from left table","All rows from both tables","Only rows where keys match in both","Only NULL rows"], correct: 2, explain: "INNER JOIN returns only rows where the join condition is met in both tables.", category: "SQL" },
    { q: "Which Python keyword catches exceptions?", opts: ["catch","except","error","handle"], correct: 1, explain: "Python uses try/except. Java/JS use try/catch.", category: "Programming" },
    { q: "What does CI/CD stand for?", opts: ["Code Integration/Deployment","Continuous Integration/Delivery","Container Interface/Delivery","Client Interface/Deployment"], correct: 1, explain: "CI = Continuous Integration (auto-test). CD = Continuous Delivery/Deployment.", category: "DevOps" },
    { q: "Which HTTP status code means 'Not Found'?", opts: ["200","301","404","500"], correct: 2, explain: "404 = not found. 200 = OK. 301 = redirect. 500 = server error.", category: "Web Dev" }
  ],
  data_science: [
    { q: "What is overfitting?", opts: ["Good on training, poor on new data","Poor on both","Takes too long to train","Too few parameters"], correct: 0, explain: "Overfitting: model memorizes training data including noise, fails to generalize.", category: "ML Concepts" },
    { q: "Best metric for imbalanced classification?", opts: ["Accuracy","F1 Score","MSE","R² Score"], correct: 1, explain: "F1 balances precision and recall — ideal for imbalanced classes.", category: "Evaluation" },
    { q: "What does PCA do?", opts: ["Finds correlations","Reduces dimensionality","Groups data points","Fits polynomial curves"], correct: 1, explain: "PCA reduces features while preserving maximum variance.", category: "Feature Engineering" },
    { q: "Purpose of an activation function?", opts: ["Initialize weights","Introduce non-linearity","Normalize input","Calculate loss"], correct: 1, explain: "Activation functions like ReLU introduce non-linearity for learning complex patterns.", category: "Deep Learning" },
    { q: "SQL clause to filter groups after GROUP BY?", opts: ["WHERE","FILTER","HAVING","GROUP FILTER"], correct: 2, explain: "HAVING filters grouped results. WHERE filters rows before grouping.", category: "SQL" },
    { q: "What is a Transformer in NLP?", opts: ["A type of RNN","Architecture using self-attention","A word embedding","A preprocessing pipeline"], correct: 1, explain: "Transformers use self-attention to process sequences in parallel, replacing RNNs.", category: "NLP" },
    { q: "What does a confusion matrix show?", opts: ["Feature correlations","TP, FP, TN, FN outcomes","Training loss over time","Hyperparameter results"], correct: 1, explain: "Confusion matrix shows all 4 classification outcomes: TP, FP, TN, FN.", category: "Evaluation" },
    { q: "What is the bias-variance tradeoff?", opts: ["Fairness vs speed","Underfitting vs overfitting","Linear vs non-linear","Precision vs recall"], correct: 1, explain: "High bias = underfitting. High variance = overfitting.", category: "ML Concepts" },
    { q: "Best Python library for tabular data?", opts: ["NumPy","Matplotlib","Pandas","SciPy"], correct: 2, explain: "Pandas handles tabular data with DataFrames.", category: "Python" },
    { q: "Difference between bagging and boosting?", opts: ["Bagging sequential, boosting parallel","Bagging parallel/averages, boosting sequential/corrects errors","They are the same","Bagging uses deep learning"], correct: 1, explain: "Bagging (Random Forest): parallel, averages. Boosting (XGBoost): sequential, corrects errors.", category: "ML Concepts" }
  ],
  non_technical: [
    { q: "What is a sales 'pain point'?", opts: ["A negotiation tactic","A customer problem to solve","A pricing objection","A competitor weakness"], correct: 1, explain: "Pain points are specific problems your product solves — key to sales success.", category: "Sales" },
    { q: "What does AIDA stand for?", opts: ["Awareness, Interest, Desire, Action","Analysis, Insight, Data, Application","Audience, Influence, Design, Advertising","Attract, Inform, Direct, Analyze"], correct: 0, explain: "AIDA = classic marketing funnel: Awareness → Interest → Desire → Action.", category: "Marketing" },
    { q: "Purpose of a Service Level Agreement (SLA)?", opts: ["Define salaries","Document expected service standards","Outline marketing strategies","Track bugs"], correct: 1, explain: "SLA defines expected service levels, metrics, responsibilities, and penalties.", category: "Business" },
    { q: "Most effective negative feedback style?", opts: ["Indirect and vague","Direct, specific, focused on behavior","Only in writing","Avoid negative entirely"], correct: 1, explain: "Effective: specific ('report 2 days late') not personal ('you are unreliable').", category: "Communication" },
    { q: "What is 'onboarding' in HR?", opts: ["Firing employees","Integrating new employees into the org","Annual performance review","Salary negotiation"], correct: 1, explain: "Onboarding: orientation, training, and cultural integration for new hires.", category: "HR" },
    { q: "What is a KPI?", opts: ["Knowledge Program Initiative","Key Performance Indicator","Key Productivity Interface","Knowledge Process Integration"], correct: 1, explain: "KPIs measure how effectively objectives are being achieved.", category: "Business" },
    { q: "What is BATNA in negotiation?", opts: ["Best Available Trade Agreement","Best Alternative to a Negotiated Agreement","Business Analysis Tool","Bilateral Agreement"], correct: 1, explain: "BATNA = your fallback if negotiations fail. Knowing it prevents bad deals.", category: "Sales" },
    { q: "What does SEO stand for?", opts: ["Social Engagement Optimization","Search Engine Optimization","Sales Email Outreach","Software Engineering Operations"], correct: 1, explain: "SEO optimizes web content to rank higher in search results.", category: "Marketing" },
    { q: "What is 'attrition' in HR?", opts: ["Hiring new employees","Reduction of staff through departures not replaced","Performance improvement","Engagement surveys"], correct: 1, explain: "Attrition: gradual workforce reduction through departures without replacement.", category: "HR" },
    { q: "What is B2B sales?", opts: ["Selling to walk-in customers","Selling from business to business","Selling digital products to consumers","Selling through distributors"], correct: 1, explain: "B2B: selling to other companies — typically longer cycles and higher deal values.", category: "Sales" }
  ],
  management: [
    { q: "What is Agile methodology focused on?", opts: ["Detailed upfront planning","Iterative development and collaboration","Waterfall-style phases","Individual productivity over teamwork"], correct: 1, explain: "Agile: iterative cycles (sprints), continuous feedback, and collaboration.", category: "Project Mgmt" },
    { q: "Purpose of a Scrum retrospective?", opts: ["Plan next sprint","Review deliverables","Reflect and identify process improvements","Assign tasks"], correct: 2, explain: "Retrospective: what went well, what didn't, how to improve.", category: "Scrum" },
    { q: "What is 'scope creep'?", opts: ["Gradual budget reduction","Uncontrolled scope expansion without adjusting time/budget","Slow performance decrease","Quality improvement"], correct: 1, explain: "Scope creep: new requirements added without adjusting resources — leads to project failure.", category: "Project Mgmt" },
    { q: "Which leadership style gives maximum autonomy?", opts: ["Autocratic","Transactional","Laissez-faire","Authoritative"], correct: 2, explain: "Laissez-faire: minimal direction, maximum autonomy — best for self-motivated teams.", category: "Leadership" },
    { q: "What is stakeholder management?", opts: ["Managing shareholders","Managing needs/expectations of all affected parties","Managing stock options","Managing vendor contracts"], correct: 1, explain: "Identify all interested parties and manage their expectations throughout the project.", category: "Leadership" },
    { q: "What is the 'critical path'?", opts: ["Most expensive phase","Longest sequence of dependent tasks determining minimum duration","Tasks most likely to fail","Tasks for key staff"], correct: 1, explain: "Critical path: longest chain of dependent activities. Delays here delay the whole project.", category: "Project Mgmt" },
    { q: "What is OKR framework?", opts: ["Operational Knowledge Repository","Objectives and Key Results — a goal-setting framework","Organizational Knowledge Review","Output and Key Responsibilities"], correct: 1, explain: "OKRs: ambitious Objectives + measurable Key Results. Used by Google, Intel, etc.", category: "Strategy" },
    { q: "Difference between manager and leader?", opts: ["Managers earn more","Leaders inspire/set vision, managers execute/control process","They are identical","Managers work in teams, leaders alone"], correct: 1, explain: "Managers: plan, organize, control. Leaders: inspire, influence toward goals.", category: "Leadership" },
    { q: "What is the ADKAR model?", opts: ["A financial tool","Framework: Awareness, Desire, Knowledge, Ability, Reinforcement for change","A risk tool","An employee performance model"], correct: 1, explain: "ADKAR: 5 stages for successful change — Awareness → Desire → Knowledge → Ability → Reinforcement.", category: "Change Mgmt" },
    { q: "What is 'delegation' in management?", opts: ["Removing tasks","Assigning responsibility AND authority to team members","Delaying non-urgent tasks","Distributing budget"], correct: 1, explain: "Delegation empowers staff with responsibility + authority, freeing manager for higher-level work.", category: "Leadership" }
  ]
};

// ── MCQ Assessment ────────────────────────────────────────────────────────────
function setAssessmentDomain(domain) {
  state.mcqDomain = domain;
  ['technical', 'data_science', 'non_technical', 'management'].forEach(function(d) {
    var el = document.getElementById('dp-' + d);
    if (el) el.classList.toggle('active', d === domain);
  });
  if (!state.mcqActive) {
    var start   = document.getElementById('mcq-start');
    var active  = document.getElementById('mcq-active');
    var results = document.getElementById('mcq-results');
    if (start)   start.style.display   = 'block';
    if (active)  active.style.display  = 'none';
    if (results) results.style.display = 'none';
  }
}

function goToAssessment() {
  var btn = document.getElementById('nav-assessment');
  if (btn) btn.disabled = false;
  showSection('assessment');
}

function startMCQ() {
  state.mcqQuestions  = MCQ_BANK[state.mcqDomain].slice();
  state.mcqCurrentIdx = 0;
  state.mcqAnswers    = [];
  state.mcqActive     = true;
  document.getElementById('mcq-start').style.display   = 'none';
  document.getElementById('mcq-results').style.display = 'none';
  document.getElementById('mcq-active').style.display  = 'block';
  renderMCQQuestion();
}

var _selectedOpt = null;

function renderMCQQuestion() {
  var q     = state.mcqQuestions[state.mcqCurrentIdx];
  var total = state.mcqQuestions.length;
  var idx   = state.mcqCurrentIdx;
  document.getElementById('qp-cat-badge').textContent = q.category;
  document.getElementById('qp-frac').textContent = 'Question ' + (idx + 1) + ' of ' + total;
  document.getElementById('qp-fill').style.width = ((idx + 1) / total * 100) + '%';
  document.getElementById('mcq-q-num').textContent  = 'Q' + (idx + 1);
  document.getElementById('mcq-q-text').textContent = q.q;
  var letters = ['A','B','C','D'];
  document.getElementById('mcq-options').innerHTML = q.opts.map(function(opt, i) {
    return '<div class="mcq-opt" id="mopt-' + i + '" onclick="selectOption(' + i + ')">' +
           '<span class="opt-letter">' + letters[i] + '</span>' +
           '<span class="opt-text">' + opt + '</span>' +
           '</div>';
  }).join('');
  var fb   = document.getElementById('mcq-feedback');
  var next = document.getElementById('mcq-next');
  var skip = document.getElementById('mcq-skip');
  if (fb)   { fb.style.display = 'none'; fb.className = 'mcq-feedback'; }
  if (next) { next.disabled = true; next.onclick = nextQuestion; next.textContent = 'Next →'; }
  if (skip) skip.style.display = 'inline-flex';
  _selectedOpt = null;
}

function selectOption(optIdx) {
  var fb = document.getElementById('mcq-feedback');
  if (fb && fb.style.display !== 'none') return;
  document.querySelectorAll('.mcq-opt').forEach(function(el) { el.classList.remove('selected'); });
  var opt = document.getElementById('mopt-' + optIdx);
  if (opt) opt.classList.add('selected');
  _selectedOpt = optIdx;
  var next = document.getElementById('mcq-next');
  if (next) next.disabled = false;
}

function nextQuestion() {
  if (_selectedOpt === null) return;
  var q         = state.mcqQuestions[state.mcqCurrentIdx];
  var isCorrect = _selectedOpt === q.correct;
  state.mcqAnswers.push({ qIdx: state.mcqCurrentIdx, question: q.q, selectedOpt: _selectedOpt, correctOpt: q.correct, correct: isCorrect, category: q.category, explain: q.explain, selectedText: q.opts[_selectedOpt], correctText: q.opts[q.correct] });
  document.querySelectorAll('.mcq-opt').forEach(function(el) { el.classList.add('disabled'); });
  var correctEl = document.getElementById('mopt-' + q.correct);
  if (correctEl) correctEl.classList.add('correct');
  if (!isCorrect) { var wrongEl = document.getElementById('mopt-' + _selectedOpt); if (wrongEl) wrongEl.classList.add('wrong'); }
  var fb = document.getElementById('mcq-feedback');
  if (fb) { fb.style.display = 'block'; fb.className = 'mcq-feedback ' + (isCorrect ? 'correct-fb' : 'wrong-fb'); fb.innerHTML = '<div class="fb-title">' + (isCorrect ? '✅ Correct!' : '❌ Incorrect — correct: ' + q.opts[q.correct]) + '</div>' + q.explain; }
  var skip = document.getElementById('mcq-skip');
  if (skip) skip.style.display = 'none';
  var isLast = state.mcqCurrentIdx === state.mcqQuestions.length - 1;
  var next = document.getElementById('mcq-next');
  if (next) { next.disabled = false; next.textContent = isLast ? 'See Results →' : 'Next →'; next.onclick = isLast ? showMCQResults : advanceQuestion; }
  _selectedOpt = null;
}

function advanceQuestion() {
  state.mcqCurrentIdx++;
  var next = document.getElementById('mcq-next');
  if (next) next.onclick = nextQuestion;
  renderMCQQuestion();
}

function skipQuestion() {
  var q = state.mcqQuestions[state.mcqCurrentIdx];
  state.mcqAnswers.push({ qIdx: state.mcqCurrentIdx, question: q.q, selectedOpt: -1, correctOpt: q.correct, correct: false, category: q.category, explain: q.explain, selectedText: 'Skipped', correctText: q.opts[q.correct] });
  if (state.mcqCurrentIdx === state.mcqQuestions.length - 1) { showMCQResults(); } else { state.mcqCurrentIdx++; renderMCQQuestion(); }
  _selectedOpt = null;
}

function showMCQResults() {
  state.mcqActive = false;
  document.getElementById('mcq-active').style.display  = 'none';
  document.getElementById('mcq-results').style.display = 'block';
  var answers = state.mcqAnswers;
  var correct = answers.filter(function(a) { return a.correct; }).length;
  var total   = answers.length;
  var pct     = Math.round((correct / Math.max(total, 1)) * 100);
  document.getElementById('mr-pct').textContent = pct + '%';
  var level, desc;
  if (pct >= 70) { level = 'Advanced';     desc = 'Strong knowledge. Advanced track recommended.'; }
  else if (pct >= 40) { level = 'Intermediate'; desc = 'Solid foundation with targeted gaps to fill.'; }
  else                { level = 'Beginner';     desc = 'Structured foundational learning recommended.'; }
  state.mcqRefinedLevel = level.toLowerCase();
  document.getElementById('mr-level-display').textContent = level;
  document.getElementById('mr-desc').textContent          = desc;
  var cl = document.getElementById('mr-correct-label');
  if (cl) cl.textContent = correct + ' / ' + total + ' Correct';
  var catMap = {};
  answers.forEach(function(a) { if (!catMap[a.category]) catMap[a.category] = { correct: 0, total: 0 }; catMap[a.category].total++; if (a.correct) catMap[a.category].correct++; });
  var catGrid = document.getElementById('mr-cats-grid');
  if (catGrid) catGrid.innerHTML = Object.entries(catMap).map(function(entry) {
    var cat = entry[0], d = entry[1];
    var p   = Math.round((d.correct / d.total) * 100);
    var col = p >= 70 ? '#138808' : p >= 40 ? '#D4AF37' : '#C0392B';
    return '<div class="rp-cat"><div class="rp-cat-name">' + cat + '</div><div class="rp-cat-score"><span class="rp-cat-num" style="color:' + col + '">' + d.correct + '/' + d.total + '</span><div class="rp-cat-bar"><div class="rp-cat-fill" style="width:' + p + '%;background:' + col + '"></div></div></div></div>';
  }).join('');
  var rl = document.getElementById('mr-review-list');
  if (rl) rl.innerHTML = answers.map(function(a, i) {
    return '<div class="rp-review-item"><span class="rp-ri-icon">' + (a.correct ? '✓' : '✗') + '</span><span class="rp-ri-q">Q' + (i+1) + ': ' + a.question.substring(0, 58) + (a.question.length > 58 ? '…' : '') + '</span><span class="rp-ri-status ' + (a.correct ? 'correct' : 'wrong') + '">' + (a.correct ? 'Correct' : (a.selectedText || 'Skipped').substring(0, 20)) + '</span></div>';
  }).join('');
}

function retakeMCQ() {
  state.mcqRefinedLevel = null; state.mcqActive = false;
  document.getElementById('mcq-results').style.display = 'none';
  document.getElementById('mcq-start').style.display   = 'block';
}

function analyzeWithQuizLevel() {
  if (state.mcqRefinedLevel) state._overrideLevel = state.mcqRefinedLevel;
  var hasResume = (state.uploadedResumeText && state.uploadedResumeText.trim().length > 30) || document.getElementById('resume-input').value.trim().length > 10;
  var hasJD     = document.getElementById('jd-input').value.trim().length > 10;
  showSection('input');
  if (hasResume && hasJD) { setTimeout(analyzeProfile, 300); }
  else { setTimeout(function() { var btn = document.getElementById('analyze-btn'); if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300); }
}

// ── Loading ───────────────────────────────────────────────────────────────────
function startLoading() {
  var el = document.getElementById('loading');
  if (el) el.style.display = 'flex';
  var steps = ['ls1','ls2','ls3','ls4','ls5'];
  var i = 0;
  var iv = setInterval(function() {
    if (i > 0) { var prev = document.getElementById(steps[i-1]); if (prev) { prev.classList.remove('active'); prev.classList.add('done'); } }
    if (i < steps.length) { var cur = document.getElementById(steps[i]); if (cur) cur.classList.add('active'); i++; }
    else clearInterval(iv);
  }, 700);
  return iv;
}
function stopLoading() {
  var el = document.getElementById('loading');
  if (el) el.style.display = 'none';
}

// ── Main Analysis ─────────────────────────────────────────────────────────────
async function analyzeProfile() {
  var resume = '';
  if (state.uploadedResumeText && state.uploadedResumeText.trim().length > 30) {
    resume = state.uploadedResumeText.trim();
  } else if (state.activeResumeTab === 'upload') {
    alert('Upload not complete. Switch to Paste Text tab.');
    return;
  } else {
    resume = document.getElementById('resume-input').value.trim();
    if (!resume) { alert('Please paste your resume text or upload a file.'); return; }
  }
  var jd = document.getElementById('jd-input').value.trim();
  if (!jd) { alert('Please enter a job description.'); return; }

  var iv = startLoading();
  try {
    var resp = await fetch(API + '/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_text: resume, jd_text: jd, override_level: state._overrideLevel || '' })
    });
    var data = await resp.json();
    clearInterval(iv); stopLoading();
    if (data.status !== 'success') { alert(data.error || 'Analysis failed.'); return; }
    state.analysisResult   = data;
    state.completedSkills  = new Set();
    state.remainingMissing = data.skill_gap.missing_skills.slice();
    state.resumeSkills     = data.resume_skills.slice();
    state.skillLevel       = data.skill_level;
    state.diagDomain       = detectDomain(data.jd_skills);
    ['nav-results','nav-roadmap','mnav-results','mnav-roadmap'].forEach(function(id) { var el = document.getElementById(id); if (el) el.disabled = false; });
    renderResults(data);
    renderRoadmap(data);
    showSection('results');
  } catch (err) {
    clearInterval(iv); stopLoading();
    console.error('[NSAALP]', err);
    showConnectionError(err);
  }
}

function detectDomain(jdSkills) {
  var tech = ['python','sql','machine learning','docker','react','javascript','aws'];
  var n = (jdSkills || []).filter(function(s) { return tech.some(function(k) { return s.toLowerCase().indexOf(k) !== -1; }); }).length;
  return n > (jdSkills || []).length / 3 ? 'technical' : 'non_technical';
}

// ── Render Results ────────────────────────────────────────────────────────────
function renderResults(data) {
  var sg = data.skill_gap, sl = data.skill_level, lp = data.learning_path, vm = data.validation_metrics;
  document.getElementById('met-match').textContent = sg.match_percentage + '%';
  document.getElementById('met-gap').textContent   = sg.gap_percentage + '%';
  document.getElementById('met-time').textContent  = lp.time_reduction_percentage + '%';
  document.getElementById('met-level').textContent = sl.label;
  document.getElementById('met-years').textContent = sl.years > 0 ? sl.years + ' yrs exp.' : 'Entry level';
  var ms = document.getElementById('match-status');
  if (ms) ms.textContent = sg.match_percentage >= 80 ? '✓ Satisfactory' : sg.match_percentage >= 50 ? '~ Moderate' : '✕ Needs work';
  var gs = document.getElementById('gap-severity');
  if (gs) gs.textContent = sg.severity_label || '—';
  var C = 201.1;
  setTimeout(function() {
    var rm = document.getElementById('ring-match');   if (rm) rm.style.strokeDashoffset = C - (sg.match_percentage / 100) * C;
    var rg = document.getElementById('ring-gap');     if (rg) rg.style.strokeDashoffset = C - (sg.gap_percentage / 100) * C;
    var rt = document.getElementById('ring-time');    if (rt) rt.style.strokeDashoffset = C - (lp.time_reduction_percentage / 100) * C;
    var sr = document.getElementById('sidebar-ring'); if (sr) sr.style.strokeDashoffset = 150.8 - (sg.match_percentage / 100) * 150.8;
    var bm = document.getElementById('bar-match');    if (bm) bm.style.width = sg.match_percentage + '%';
    var bg = document.getElementById('bar-gap');      if (bg) bg.style.width = sg.gap_percentage + '%';
    animateBar('vbar-accuracy',  vm.skill_match_accuracy);
    animateBar('vbar-precision', vm.skill_gap_precision);
    animateBar('vbar-relevance', vm.learning_path_relevance_score);
    animateBar('vbar-coverage',  vm.dataset_coverage);
  }, 200);
  document.getElementById('vm-accuracy').textContent  = vm.skill_match_accuracy + '%';
  document.getElementById('vm-precision').textContent = vm.skill_gap_precision + '%';
  document.getElementById('vm-relevance').textContent = vm.learning_path_relevance_score + '%';
  document.getElementById('vm-coverage').textContent  = vm.dataset_coverage + '%';
  var sbp = document.getElementById('sidebar-match-pct'); if (sbp) sbp.textContent = sg.match_percentage + '%';
  var sbl = document.getElementById('sidebar-level');      if (sbl) sbl.textContent = sl.label;
  renderSkillList('matching-skills', 'match-count', sg.matching_skills);
  renderSkillList('missing-skills',  'missing-count', sg.missing_skills);
  renderSkillList('extra-skills',    'extra-count',   sg.extra_skills);
  var icons = { beginner: '📘', intermediate: '⚡', advanced: '🚀' };
  var icon  = icons[sl.level] || '⚡';
  ['lb-badge','lb-badge2'].forEach(function(id) { var el = document.getElementById(id); if (el) el.textContent = icon; });
  var lbt = document.getElementById('lb-title'); if (lbt) lbt.textContent = sl.label;
  var lbd = document.getElementById('lb-desc');  if (lbd) lbd.textContent = sl.description + (data.skill_level.quiz_override ? ' · ✓ Confirmed by MCQ quiz' : '');
  var meta = document.getElementById('results-meta'); if (meta) meta.textContent = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function animateBar(id, pct) {
  var el = document.getElementById(id);
  if (el) setTimeout(function() { el.style.width = pct + '%'; }, 100);
}

function renderSkillList(containerId, countId, skills) {
  var cnt = document.getElementById(countId);
  var box = document.getElementById(containerId);
  if (cnt) cnt.textContent = skills.length;
  if (!box) return;
  box.innerHTML = skills.length
    ? skills.map(function(s) { return '<span class="skill-chip">' + s + '</span>'; }).join('')
    : '<span class="empty-state">None identified</span>';
}

// ── Render Roadmap ────────────────────────────────────────────────────────────
function renderRoadmap(data) {
  var lp = data.learning_path, sl = data.skill_level;
  var rp = lp.recommended_path, ak = lp.already_known;
  document.getElementById('rs-steps').textContent  = lp.total_steps;
  document.getElementById('rs-hours').textContent  = lp.total_hours;
  document.getElementById('rs-months').textContent = lp.estimated_months;
  document.getElementById('rs-saved').textContent  = lp.time_reduction_percentage + '%';
  var sub = document.getElementById('roadmap-subtext');
  if (sub) sub.textContent = sl.label + ' track · ' + lp.time_reduction_percentage + '% training time saved';
  updateProgress();
  var timeline = document.getElementById('roadmap-timeline');
  if (!timeline) return;
  timeline.innerHTML = '';
  if (!rp.length) {
    timeline.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-muted)">🎉 No significant skill gaps! You match this role well.</div>';
  } else {
    rp.forEach(function(step, idx) { timeline.appendChild(createStepCard(step, idx === rp.length - 1)); });
  }
  var ksec = document.getElementById('known-section');
  if (ak.length > 0 && ksec) {
    ksec.style.display = 'block';
    document.getElementById('known-list').innerHTML = ak.map(function(s) { return '<span class="kb-chip">✓ ' + s.skill + '</span>'; }).join('');
  }
}

function createStepCard(step, isLast) {
  var el = document.createElement('li');
  el.className = 'roadmap-step timeline-step';
  el.id = 'step-' + sid(step.skill);
  el.style.animationDelay = ((step.step - 1) * 0.05) + 's';
  var done = state.completedSkills.has(step.skill);
  var lvlCap = step.course.level.charAt(0).toUpperCase() + step.course.level.slice(1);
  el.innerHTML =
    '<div class="ts-num-col">' +
      '<div class="ts-num ' + (step.priority==='high' ? 'priority' : '') + ' ' + (done ? 'done' : '') + '" id="num-' + sid(step.skill) + '">' + (done ? '✓' : step.step) + '</div>' +
      (!isLast ? '<div class="ts-connector"></div>' : '') +
    '</div>' +
    '<div class="ts-card ' + (step.priority==='high' ? 'priority' : '') + ' ' + (done ? 'done' : '') + '" id="card-' + sid(step.skill) + '">' +
      '<div class="ts-card-head">' +
        '<div class="ts-course-name">' + step.skill + '</div>' +
        '<div class="ts-tags">' +
          '<span class="ts-tag tag-' + step.course.level + '">' + lvlCap + '</span>' +
          (step.priority === 'high' ? '<span class="ts-tag tag-priority">⭐ Priority</span>' : '') +
          (step.is_prerequisite      ? '<span class="ts-tag tag-prereq">Prereq</span>'        : '') +
        '</div>' +
      '</div>' +
      '<div class="ts-card-meta">' +
        '<span class="ts-meta-item">⏱ ' + step.course.duration_hours + ' hours</span>' +
        '<span class="ts-meta-item">📚 ' + step.course.provider + '</span>' +
        '<span class="ts-meta-item"><a href="' + step.course.url + '" target="_blank" rel="noopener">Open Course ↗</a></span>' +
      '</div>' +
      '<div class="ts-reasoning">' + step.reasoning + '</div>' +
      '<div class="ts-card-foot">' +
        '<button class="complete-btn ' + (done ? 'done' : '') + '" onclick="markComplete(\'' + step.skill.replace(/\\/g,'\\\\').replace(/'/g,"\\'") + '\')" id="btn-' + sid(step.skill) + '" ' + (done ? 'disabled' : '') + '>' +
          (done ? '✓ Completed' : '✓ Mark as Complete') +
        '</button>' +
      '</div>' +
    '</div>';
  return el;
}

// ── Mark Complete ─────────────────────────────────────────────────────────────
async function markComplete(skillName) {
  state.completedSkills.add(skillName);
  state.remainingMissing = state.remainingMissing.filter(function(s) { return s !== skillName; });
  state.resumeSkills = state.resumeSkills.concat([skillName]).filter(function(v,i,a) { return a.indexOf(v) === i; });
  var btn  = document.getElementById('btn-'  + sid(skillName));
  var num  = document.getElementById('num-'  + sid(skillName));
  var card = document.getElementById('card-' + sid(skillName));
  if (btn)  { btn.textContent = '✓ Completed'; btn.disabled = true; btn.classList.add('done'); }
  if (num)  { num.innerHTML   = '✓'; num.classList.add('done'); }
  if (card) card.classList.add('done');
  updateProgress();
  try {
    var resp = await fetch(API + '/api/complete_skill', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed_skill: skillName, remaining_missing: state.remainingMissing, resume_skills: state.resumeSkills, skill_level: state.skillLevel })
    });
    var d = await resp.json();
    if (d.status === 'success') state.analysisResult.learning_path = d.updated_path;
  } catch (e) { console.warn('Sync:', e); }
}

function updateProgress() {
  if (!state.analysisResult) return;
  var total = (state.analysisResult.learning_path.recommended_path || []).length;
  var done  = state.completedSkills.size;
  var pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  var pf = document.getElementById('progress-fill');   if (pf) pf.style.width = pct + '%';
  var pt = document.getElementById('progress-text');   if (pt) pt.textContent = done + ' / ' + total + ' completed';
  var rr = document.getElementById('roadmap-progress-ring'); if (rr) rr.style.strokeDashoffset = 201.1 - (pct / 100) * 201.1;
  var pd = document.getElementById('roadmap-pct-display');   if (pd) pd.textContent = pct + '%';
}

// ── Skill Tab ─────────────────────────────────────────────────────────────────
function switchSkillTab(btn, tabId) {
  document.querySelectorAll('.db-tab').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  document.querySelectorAll('.db-skill-tab-panel').forEach(function(p) { p.classList.remove('active'); });
  var panel = document.getElementById('stab-' + tabId);
  if (panel) panel.classList.add('active');
}

// ── Diagnostic Modal Quiz ─────────────────────────────────────────────────────
async function openQuiz() {
  try {
    var resp = await fetch(API + '/api/quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: state.diagDomain, answers: [] }) });
    var data = await resp.json();
    state.diagQuestions = data.questions;
    document.getElementById('quiz-body').innerHTML = data.questions.map(function(q, qi) {
      return '<div class="quiz-q-wrap"><div class="quiz-q-text">' + (qi+1) + '. ' + q.question + '</div><div class="quiz-options">' +
        q.options.map(function(opt, oi) { return '<label class="quiz-option"><input type="radio" name="q' + q.id + '" value="' + oi + '"><span>' + opt + '</span></label>'; }).join('') +
        '</div></div>';
    }).join('');
    document.getElementById('quiz-modal').style.display = 'flex';
  } catch (e) { alert('Could not load quiz.'); }
}

async function submitQuiz() {
  var answers = state.diagQuestions.map(function(q) {
    var sel = document.querySelector('input[name="q' + q.id + '"]:checked');
    return { question_id: q.id, score: sel ? parseInt(sel.value) : 0 };
  });
  try {
    var resp = await fetch(API + '/api/quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: state.diagDomain, answers: answers }) });
    var data = await resp.json();
    closeModal();
    state.skillLevel.level = data.refined_level;
    state.skillLevel.label = data.refined_level.charAt(0).toUpperCase() + data.refined_level.slice(1);
    alert('Quiz complete!\nLevel: ' + data.refined_level.toUpperCase() + ' (' + data.percentage + '%)\nRe-run analysis to apply.');
  } catch (e) { alert('Could not submit quiz.'); }
}

function closeModal() { var m = document.getElementById('quiz-modal'); if (m) m.style.display = 'none'; }
var qm = document.getElementById('quiz-modal');
if (qm) qm.addEventListener('click', function(e) { if (e.target.id === 'quiz-modal') closeModal(); });

// ── Init ──────────────────────────────────────────────────────────────────────
showSection('input');
setTimeout(checkBackendConnection, 800);
