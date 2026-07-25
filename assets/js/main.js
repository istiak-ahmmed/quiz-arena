/**
 * QuizArena — Shared JavaScript Utilities
 * Ring countdown, toast notifications, FAQ accordion, misc helpers
 */

/* ============================================================
   Countdown Ring — SVG stroke-dashoffset animation
   Usage: new CountdownRing(svgEl, fillEl, labelEl, seconds)
   ============================================================ */
class CountdownRing {
  constructor(svgFill, label, totalSeconds, onComplete) {
    this.fill = svgFill;
    this.label = label;
    this.total = totalSeconds;
    this.remaining = totalSeconds;
    this.onComplete = onComplete || (() => {});
    this.timer = null;

    // Compute circumference from the fill element's r attribute
    const r = parseFloat(svgFill.getAttribute('r') || 45);
    this.circumference = 2 * Math.PI * r;
    svgFill.style.strokeDasharray = this.circumference;
    svgFill.style.strokeDashoffset = 0;
  }

  start() {
    this.tick();
    this.timer = setInterval(() => this.tick(), 1000);
  }

  tick() {
    this.remaining = Math.max(0, this.remaining);
    const progress = this.remaining / this.total;
    const offset = this.circumference * (1 - progress);
    this.fill.style.strokeDashoffset = offset;

    if (this.label) {
      this.label.textContent = this.remaining > 0 ? this.remaining : '0';
    }

    // Color change: indigo → gold → coral
    if (this.remaining <= 5) {
      this.fill.classList.remove('gold');
      this.fill.classList.add('coral');
    } else if (this.remaining <= Math.floor(this.total * 0.4)) {
      this.fill.classList.remove('coral');
      this.fill.classList.add('gold');
    }

    if (this.remaining === 0) {
      clearInterval(this.timer);
      this.onComplete();
      return;
    }

    this.remaining--;
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  reset(seconds) {
    this.stop();
    this.remaining = seconds || this.total;
    this.fill.classList.remove('gold', 'coral');
    if (this.label) this.label.textContent = this.remaining;
    this.fill.style.strokeDashoffset = 0;
  }
}

/* ============================================================
   Static countdown ring (decorative, hero page)
   Animates continuously to demonstrate the concept
   ============================================================ */
function initHeroRing(svgId) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const fill = svg.querySelector('.ring-fill');
  const label = document.getElementById(svgId + '-label');
  if (!fill) return;

  const r = parseFloat(fill.getAttribute('r') || 120);
  const circ = 2 * Math.PI * r;
  fill.style.strokeDasharray = circ;

  let t = 20;
  let total = 20;

  function animate() {
    const progress = t / total;
    fill.style.strokeDashoffset = circ * (1 - progress);
    if (label) label.textContent = t;

    if (t <= 5) {
      fill.classList.remove('gold');
      fill.classList.add('coral');
    } else if (t <= 8) {
      fill.classList.remove('coral');
      fill.classList.add('gold');
    } else {
      fill.classList.remove('gold', 'coral');
    }

    t--;
    if (t < 0) { t = total; fill.classList.remove('gold', 'coral'); }
    setTimeout(animate, 800);
  }

  animate();
}

/* ============================================================
   Toast Notification System
   Usage: Toast.success('Title', 'message')
   ============================================================ */
const Toast = (() => {
  let container;

  function getContainer() {
    if (!container) {
      container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
      }
    }
    return container;
  }

  function icons() {
    return {
      success: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      error:   `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      info:    `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      warning: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
    };
  }

  function show(type, title, message, duration = 4000) {
    const c = getContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const colorMap = { success: '#17B26A', error: '#F0483E', info: '#3E4BF0', warning: '#F5A623' };
    toast.style.setProperty('color', colorMap[type] || '#fff', 'important');

    toast.innerHTML = `
      <span style="color:${colorMap[type]};flex-shrink:0;margin-top:1px">${icons()[type]}</span>
      <div style="flex:1">
        <div style="font-weight:700;font-size:13px;color:#fff;margin-bottom:2px">${title}</div>
        ${message ? `<div style="font-size:12px;color:rgba(255,255,255,0.7)">${message}</div>` : ''}
      </div>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:rgba(255,255,255,0.5);cursor:pointer;padding:2px;flex-shrink:0">✕</button>
    `;
    c.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s, transform 0.3s';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  return {
    success: (t, m, d) => show('success', t, m, d),
    error:   (t, m, d) => show('error', t, m, d),
    info:    (t, m, d) => show('info', t, m, d),
    warning: (t, m, d) => show('warning', t, m, d),
  };
})();

/* ============================================================
   FAQ Accordion (vanilla, no Alpine required)
   ============================================================ */
function initFaqAccordions() {
  document.querySelectorAll('.faq-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const content = trigger.nextElementSibling;
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';

      // close all
      document.querySelectorAll('.faq-trigger').forEach(t => {
        t.setAttribute('aria-expanded', 'false');
        const c = t.nextElementSibling;
        if (c) { c.style.display = 'none'; }
      });

      // open clicked (if wasn't open)
      if (!isOpen) {
        trigger.setAttribute('aria-expanded', 'true');
        if (content) content.style.display = 'block';
      }
    });
    // Initialize closed
    trigger.setAttribute('aria-expanded', 'false');
    const c = trigger.nextElementSibling;
    if (c) c.style.display = 'none';
  });
}

/* ============================================================
   Sticky Nav scroll class
   ============================================================ */
function initStickyNav() {
  const nav = document.querySelector('.public-nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

/* ============================================================
   Mobile admin sidebar toggle
   ============================================================ */
function initAdminSidebar() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.admin-sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('hidden');
  });

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.add('hidden');
    });
  }
}

/* ============================================================
   Countdown timers (deadline countdowns on event cards)
   Usage: data-countdown="2026-08-01T18:00:00"
   ============================================================ */
function initCountdownTimers() {
  document.querySelectorAll('[data-countdown]').forEach(el => {
    const target = new Date(el.dataset.countdown).getTime();

    function update() {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        el.textContent = 'Started';
        return;
      }

      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      if (d > 0) el.textContent = `${d}d ${h}h ${m}m`;
      else if (h > 0) el.textContent = `${h}h ${m}m ${s}s`;
      else el.textContent = `${m}m ${s}s`;

      setTimeout(update, 1000);
    }
    update();
  });
}

/* ============================================================
   Tabs (vanilla)
   ============================================================ */
function initTabs() {
  document.querySelectorAll('.tabs').forEach(tabGroup => {
    const btns = tabGroup.querySelectorAll('.tab-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        // update buttons
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // update panels
        const target = btn.dataset.tab;
        if (target) {
          document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.style.display = panel.id === target ? 'block' : 'none';
          });
        }
      });
    });
  });
}

/* ============================================================
   Modal helpers
   ============================================================ */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'flex';
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none';
}

// Close on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.style.display = 'none';
  }
});

// Close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay[style*="flex"]').forEach(m => {
      m.style.display = 'none';
    });
  }
});

/* ============================================================
   Admin keyboard shortcuts (A = approve, R = reject)
   ============================================================ */
function initAdminShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'a' || e.key === 'A') {
      const approveBtn = document.querySelector('[data-action="approve"]:not(:disabled)');
      if (approveBtn) approveBtn.click();
    }
    if (e.key === 'r' || e.key === 'R') {
      const rejectBtn = document.querySelector('[data-action="reject"]:not(:disabled)');
      if (rejectBtn) rejectBtn.click();
    }
  });
}

/* ============================================================
   Quiz Runner (static demo)
   ============================================================ */
class QuizDemo {
  constructor() {
    this.questions = [
      {
        text: 'What is the capital city of Bangladesh?',
        options: ['Chittagong', 'Dhaka', 'Khulna', 'Rajshahi'],
        correct: 1
      },
      {
        text: 'Which programming language is known as the "language of the web"?',
        options: ['Python', 'Java', 'JavaScript', 'C++'],
        correct: 2
      },
      {
        text: 'What is 15% of 200?',
        options: ['25', '30', '35', '40'],
        correct: 1
      },
      {
        text: 'Which planet is closest to the Sun?',
        options: ['Venus', 'Earth', 'Mars', 'Mercury'],
        correct: 3
      },
      {
        text: 'In which year did Bangladesh gain independence?',
        options: ['1969', '1970', '1971', '1972'],
        correct: 2
      },
    ];
    this.current = 0;
    this.score = 0;
    this.answered = false;
    this.timerSeconds = 20;
    this.ring = null;
  }

  start() {
    this.renderQuestion();
    this.startTimer();
  }

  renderQuestion() {
    const q = this.questions[this.current];
    const textEl = document.getElementById('quiz-question-text');
    const numEl = document.getElementById('quiz-question-num');
    const totalEl = document.getElementById('quiz-total');
    const progressEl = document.getElementById('quiz-progress-fill');

    if (textEl) textEl.textContent = q.text;
    if (numEl) numEl.textContent = this.current + 1;
    if (totalEl) totalEl.textContent = this.questions.length;
    if (progressEl) progressEl.style.width = `${((this.current + 1) / this.questions.length) * 100}%`;

    // Options
    ['a', 'b', 'c', 'd'].forEach((key, i) => {
      const optEl = document.getElementById(`option-${key}`);
      const labelEl = document.getElementById(`option-${key}-text`);
      if (optEl) { optEl.className = 'quiz-option'; optEl.setAttribute('data-index', i); }
      if (labelEl) labelEl.textContent = q.options[i];
    });

    this.answered = false;
  }

  selectOption(index) {
    if (this.answered) return;
    this.answered = true;

    ['a', 'b', 'c', 'd'].forEach((key, i) => {
      const optEl = document.getElementById(`option-${key}`);
      if (optEl) optEl.classList.remove('selected');
    });

    const keys = ['a', 'b', 'c', 'd'];
    const selected = document.getElementById(`option-${keys[index]}`);
    if (selected) selected.classList.add('answered');

    if (index === this.questions[this.current].correct) this.score++;

    setTimeout(() => this.nextQuestion(), 1200);
  }

  nextQuestion() {
    if (this.ring) this.ring.stop();
    this.current++;
    if (this.current >= this.questions.length) {
      this.showResults();
      return;
    }
    this.renderQuestion();
    this.startTimer();
  }

  startTimer() {
    const fillEl = document.getElementById('ring-fill-quiz');
    const labelEl = document.getElementById('ring-label-quiz');
    if (!fillEl) return;

    if (this.ring) this.ring.stop();
    this.ring = new CountdownRing(fillEl, labelEl, this.timerSeconds, () => {
      if (!this.answered) this.nextQuestion();
    });
    this.ring.start();
  }

  showResults() {
    const runner = document.getElementById('quiz-runner');
    const results = document.getElementById('quiz-results');
    if (runner) runner.style.display = 'none';
    if (results) results.style.display = 'flex';

    const scoreEl = document.getElementById('result-score');
    const totalEl2 = document.getElementById('result-total');
    if (scoreEl) scoreEl.textContent = this.score;
    if (totalEl2) totalEl2.textContent = this.questions.length;
  }
}

/* ============================================================
   Mobile Menu Toggle (for public pages)
   ============================================================ */
function initMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const menu = document.getElementById('mobile-menu');
    if (menu) {
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
  });
}

/* ============================================================
   DOMContentLoaded — initialize all
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initStickyNav();
  initFaqAccordions();
  initCountdownTimers();
  initTabs();
  initAdminSidebar();
  initAdminShortcuts();
  initMobileMenu();

  // Hero ring
  initHeroRing('hero-ring');
});

