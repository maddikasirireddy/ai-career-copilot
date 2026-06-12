document.addEventListener('DOMContentLoaded', () => {
  // ── Theme Toggle ────────────────────────────────────────────────────────
  const html          = document.documentElement;
  const themeToggle   = document.getElementById('theme-toggle');
  const themeLabel    = document.getElementById('theme-label');
  const iconMoon      = document.getElementById('theme-icon-moon');
  const iconSun       = document.getElementById('theme-icon-sun');

  const savedTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(savedTheme);

  themeToggle.addEventListener('click', () => {
    const current = html.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (theme === 'light') {
      iconMoon.classList.add('hidden');
      iconSun.classList.remove('hidden');
      themeLabel.textContent = 'Dark';
    } else {
      iconSun.classList.add('hidden');
      iconMoon.classList.remove('hidden');
      themeLabel.textContent = 'Light';
    }
  }
  // ── End Theme Toggle ────────────────────────────────────────────────────

  const form                   = document.getElementById('analyze-form');
  const resumeInput            = document.getElementById('resume-input');
  const fileUploadText         = document.getElementById('file-upload-text');
  const fileUploadWrapper      = document.getElementById('file-upload-wrapper');
  const jdInput                = document.getElementById('jd-input');
  const analyzeBtn             = document.getElementById('analyze-btn');
  const btnSpinner             = analyzeBtn.querySelector('.btn-spinner');
  const btnText                = analyzeBtn.querySelector('.btn-text');
  const btnIcon                = analyzeBtn.querySelector('.btn-icon');
  const resultsSection         = document.getElementById('results-section');
  const loadingOverlay         = document.getElementById('loading-overlay');

  // Score elements
  const scoreValue             = document.getElementById('score-value');
  const scoreRingFill          = document.getElementById('score-ring-fill');
  const scoreBadge             = document.getElementById('score-badge');

  // Breakdown elements
  const skillsMatchValue       = document.getElementById('skills-match-value');
  const projectsMatchValue     = document.getElementById('projects-match-value');
  const educationMatchValue    = document.getElementById('education-match-value');
  const keywordMatchValue      = document.getElementById('keyword-match-value');
  const skillsMatchBar         = document.getElementById('skills-match-bar');
  const projectsMatchBar       = document.getElementById('projects-match-bar');
  const educationMatchBar      = document.getElementById('education-match-bar');
  const keywordMatchBar        = document.getElementById('keyword-match-bar');

  // Skills / suggestions / roadmap
  const matchingSkillsTags     = document.getElementById('matching-skills-tags');
  const noMatchingSkills       = document.getElementById('no-matching-skills');
  const missingSkillsTags      = document.getElementById('missing-skills-tags');
  const noMissingSkills        = document.getElementById('no-missing-skills');
  const suggestionsList        = document.getElementById('suggestions-list');
  const interviewQuestionsList = document.getElementById('interview-questions-list');
  const roadmapContainer       = document.getElementById('roadmap-container');
  const downloadPdfBtn         = document.getElementById('download-pdf-btn');

  // ── Loading step cycle ──────────────────────────────────────────────────
  const loadingSteps = [
    document.getElementById('step-1'),
    document.getElementById('step-2'),
    document.getElementById('step-3'),
    document.getElementById('step-4'),
  ];

  let stepInterval = null;

  function startLoadingSteps() {
    let current = 0;
    loadingSteps.forEach(s => s.classList.remove('active', 'done'));
    loadingSteps[0].classList.add('active');
    stepInterval = setInterval(() => {
      if (current < loadingSteps.length - 1) {
        loadingSteps[current].classList.remove('active');
        loadingSteps[current].classList.add('done');
        loadingSteps[current].querySelector('.step-dot').textContent = '';
        current++;
        loadingSteps[current].classList.add('active');
      }
    }, 1800);
  }

  function stopLoadingSteps() {
    clearInterval(stepInterval);
    loadingSteps.forEach(s => {
      s.classList.remove('active');
      s.classList.add('done');
    });
  }

  // ── File upload UX ─────────────────────────────────────────────────────
  resumeInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      fileUploadText.textContent = `📄 ${file.name}`;
      fileUploadWrapper.classList.add('has-file');
    } else {
      fileUploadText.textContent = 'Drop your PDF here or click to browse';
      fileUploadWrapper.classList.remove('has-file');
    }
  });

  // Drag-and-drop visual feedback
  fileUploadWrapper.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUploadWrapper.classList.add('dragover');
  });
  fileUploadWrapper.addEventListener('dragleave', () => {
    fileUploadWrapper.classList.remove('dragover');
  });
  fileUploadWrapper.addEventListener('drop', () => {
    fileUploadWrapper.classList.remove('dragover');
  });

  // ── Form Submission ─────────────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const file = resumeInput.files[0];
    const jd   = jdInput.value.trim();

    if (!file || !jd) {
      alert('Please provide both a PDF resume and a job description.');
      return;
    }

    // Set loading state
    analyzeBtn.disabled = true;
    btnSpinner.classList.remove('hidden');
    btnText.textContent = 'Analyzing…';
    if (btnIcon) btnIcon.classList.add('hidden');
    resultsSection.classList.add('hidden');
    loadingOverlay.classList.remove('hidden');
    startLoadingSteps();

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('job_description', jd);

    try {
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'An error occurred while analyzing the resume.');
      }

      const data = await response.json();
      stopLoadingSteps();
      // Small delay for the "done" state to register visually
      setTimeout(() => displayResults(data), 400);
    } catch (error) {
      console.error(error);
      stopLoadingSteps();
      alert(`Error: ${error.message}`);
    } finally {
      analyzeBtn.disabled = false;
      btnSpinner.classList.add('hidden');
      btnText.textContent = 'Analyze Resume';
      if (btnIcon) btnIcon.classList.remove('hidden');
      loadingOverlay.classList.add('hidden');
    }
  });

  // ── Display Results ─────────────────────────────────────────────────────
  function displayResults(data) {
    const {
      match_score,
      ats_breakdown,
      matching_skills,
      missing_skills,
      suggestions,
      interview_questions,
      learning_roadmap
    } = data;

    // 1. Overall Score Ring
    animateScore(match_score);

    // 2. ATS Breakdown bars
    if (ats_breakdown) {
      animateBar(skillsMatchBar,    skillsMatchValue,    ats_breakdown.skills_match);
      animateBar(projectsMatchBar,  projectsMatchValue,  ats_breakdown.projects_match);
      animateBar(educationMatchBar, educationMatchValue, ats_breakdown.education_match);
      animateBar(keywordMatchBar,   keywordMatchValue,   ats_breakdown.keyword_match);
    } else {
      // Fallback: use overall score for all bars
      [skillsMatchBar, projectsMatchBar, educationMatchBar, keywordMatchBar].forEach(bar => {
        setTimeout(() => { bar.style.width = `${match_score}%`; }, 300);
      });
      [skillsMatchValue, projectsMatchValue, educationMatchValue, keywordMatchValue].forEach(el => {
        el.textContent = `${match_score}%`;
      });
    }

    // 3. Matching Skills Tags
    matchingSkillsTags.innerHTML = '';
    if (matching_skills && matching_skills.length > 0) {
      noMatchingSkills.classList.add('hidden');
      matching_skills.forEach((skill, i) => {
        const tag = document.createElement('span');
        tag.className = 'tag matching-tag';
        tag.textContent = skill;
        tag.style.animationDelay = `${i * 0.05}s`;
        matchingSkillsTags.appendChild(tag);
      });
    } else {
      noMatchingSkills.classList.remove('hidden');
    }

    // 4. Missing Skills Tags
    missingSkillsTags.innerHTML = '';
    if (missing_skills && missing_skills.length > 0) {
      noMissingSkills.classList.add('hidden');
      missing_skills.forEach((skill, i) => {
        const tag = document.createElement('span');
        tag.className = 'tag missing-tag';
        tag.textContent = skill;
        tag.style.animationDelay = `${i * 0.05}s`;
        missingSkillsTags.appendChild(tag);
      });
    } else {
      noMissingSkills.classList.remove('hidden');
    }

    // 5. Suggestions
    suggestionsList.innerHTML = '';
    if (suggestions && suggestions.length > 0) {
      suggestions.forEach(suggestion => {
        const li = document.createElement('li');
        li.textContent = suggestion;
        suggestionsList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'Your resume looks great for this role — no major changes needed!';
      suggestionsList.appendChild(li);
    }

    // 6. Interview Questions
    interviewQuestionsList.innerHTML = '';
    if (interview_questions && interview_questions.length > 0) {
      interview_questions.forEach(question => {
        const li = document.createElement('li');
        li.textContent = question;
        interviewQuestionsList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'No interview preparation questions generated.';
      interviewQuestionsList.appendChild(li);
    }

    // 7. Learning Roadmap (timeline-style)
    roadmapContainer.innerHTML = '';
    if (learning_roadmap && learning_roadmap.length > 0) {
      learning_roadmap.forEach((phase, idx) => {
        const phaseDiv = document.createElement('div');
        phaseDiv.className = 'roadmap-phase';

        // Timeline dot
        const dot = document.createElement('div');
        dot.className = 'roadmap-phase-dot';
        phaseDiv.appendChild(dot);

        const inner = document.createElement('div');
        inner.className = 'roadmap-phase-inner';

        const headerDiv = document.createElement('div');
        headerDiv.className = 'roadmap-phase-header';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'roadmap-phase-title';
        titleSpan.textContent = `Phase ${idx + 1}: ${phase.title}`;

        const timelineSpan = document.createElement('span');
        timelineSpan.className = 'roadmap-phase-timeline';
        timelineSpan.textContent = `⏱ ${phase.timeline}`;

        headerDiv.appendChild(titleSpan);
        headerDiv.appendChild(timelineSpan);
        inner.appendChild(headerDiv);

        // Topics
        if (phase.topics && phase.topics.length > 0) {
          const topicsTitle = document.createElement('div');
          topicsTitle.className = 'roadmap-section-title';
          topicsTitle.textContent = 'Key Topics';
          inner.appendChild(topicsTitle);

          const topicsList = document.createElement('div');
          topicsList.className = 'roadmap-topics-list';
          phase.topics.forEach(topic => {
            const topicItem = document.createElement('span');
            topicItem.className = 'roadmap-topic-item';
            topicItem.textContent = topic;
            topicsList.appendChild(topicItem);
          });
          inner.appendChild(topicsList);
        }

        // Projects
        if (phase.projects && phase.projects.length > 0) {
          const projectsTitle = document.createElement('div');
          projectsTitle.className = 'roadmap-section-title';
          projectsTitle.textContent = 'Practical Projects';
          inner.appendChild(projectsTitle);

          const projectsList = document.createElement('ul');
          projectsList.className = 'roadmap-projects-list';
          phase.projects.forEach(project => {
            const projectItem = document.createElement('li');
            projectItem.textContent = project;
            projectsList.appendChild(projectItem);
          });
          inner.appendChild(projectsList);
        }

        phaseDiv.appendChild(inner);
        roadmapContainer.appendChild(phaseDiv);
      });
    } else {
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'empty-state';
      emptyMsg.textContent = 'No missing skills detected! A custom roadmap is not required.';
      roadmapContainer.appendChild(emptyMsg);
    }

    // 8. Show results
    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ── Animate SVG Score Ring ──────────────────────────────────────────────
  function animateScore(score) {
    const circumference = 314; // 2 * π * 50

    // Update number with count-up
    let start = 0;
    const duration = 1200;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      scoreValue.textContent = Math.round(ease * score);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);

    // Ring animation
    const offset = circumference - (score / 100) * circumference;
    setTimeout(() => {
      scoreRingFill.style.strokeDashoffset = offset;
    }, 100);

    // Ring and badge colour
    if (score >= 80) {
      scoreRingFill.style.stroke = '#10b981';
      scoreBadge.textContent = '🏆 Excellent Match';
      scoreBadge.className = 'score-badge excellent';
    } else if (score >= 60) {
      scoreRingFill.style.stroke = '#6366f1';
      scoreBadge.textContent = '👍 Good Match';
      scoreBadge.className = 'score-badge good';
    } else if (score >= 40) {
      scoreRingFill.style.stroke = '#f59e0b';
      scoreBadge.textContent = '⚠️ Fair Match';
      scoreBadge.className = 'score-badge fair';
    } else {
      scoreRingFill.style.stroke = '#ef4444';
      scoreBadge.textContent = '❌ Low Match';
      scoreBadge.className = 'score-badge poor';
    }
  }

  // ── Animate progress bar + count value ─────────────────────────────────
  function animateBar(barEl, valueEl, score) {
    setTimeout(() => {
      barEl.style.width = `${score}%`;
    }, 300);
    valueEl.textContent = `${score}%`;
  }

  // ── Download PDF ────────────────────────────────────────────────────────
  downloadPdfBtn.addEventListener('click', () => {
    const element = document.getElementById('printable-report');
    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     'ATS-Analysis-Report.pdf',
      image:        { type: 'jpeg', quality: 0.95 },
      html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#131625' },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };
    downloadPdfBtn.textContent = '⏳ Generating…';
    downloadPdfBtn.disabled = true;
    html2pdf().set(opt).from(element).save().then(() => {
      downloadPdfBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Download PDF`;
      downloadPdfBtn.disabled = false;
    });
  });
});
