/* Shared helpers, Firebase init and page chrome (header/footer). Loaded on every page. */
(function () {
  'use strict';
  const cfg = window.VVIT_FIREBASE_CONFIG || {};
  const configured = cfg.apiKey && !cfg.apiKey.startsWith('YOUR_');
  if (!firebase.apps.length) firebase.initializeApp(cfg);
  const db = firebase.firestore();
  const auth = firebase.auth();

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const CATEGORIES = {
    academic: 'Academics & teaching', examination: 'Examinations & results', faculty: 'Faculty / staff conduct',
    infrastructure: 'Classrooms, labs & infrastructure', hostel: 'Hostel', transport: 'Transport', canteen: 'Canteen & food',
    library: 'Library', sports: 'Sports & campus life', fees: 'Fees & administration',
    harassment: 'Harassment, ragging or safety', other: 'Other'
  };
  const DEPARTMENTS = ['CSE', 'CS (AI & ML)', 'AI & DS', 'CSE (IoT)', 'CSE (IoT & Cyber Security incl. Blockchain)', 'ECE', 'EEE', 'IT', 'Civil', 'Mechanical', 'Science & Humanities', 'MCA / M.Tech', 'Not applicable'];
  const STATUS = { submitted: 'Received', in_review: 'Under review', resolved: 'Resolved', rejected: 'Closed' };

  const chip = (s) => `<span class="chip ${esc(s)}">${esc(STATUS[s] || s)}</span>`;
  const fmtDate = (ts, withTime) => {
    const d = ts && ts.toDate ? ts.toDate() : null;
    if (!d) return 'Just now';
    return d.toLocaleString('en-IN', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' });
  };
  // 12 chars from an unambiguous 32-letter alphabet (~60 bits) → VVIT-XXXX-XXXX-XXXX
  function genToken() {
    const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const buf = new Uint32Array(12); crypto.getRandomValues(buf);
    const c = [...buf].map((n) => A[n % A.length]).join('');
    return `VVIT-${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}`;
  }
  const normToken = (t) => t.trim().toUpperCase().replace(/\s+/g, '');
  const validToken = (t) => /^VVIT-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(t);

  function toast(text) {
    const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = text;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
  }
  function show(el, text, kind) { el.className = 'msg ' + kind; el.textContent = text; el.hidden = false; }
  function authError(e) {
    const m = {
      'auth/invalid-credential': 'Incorrect email or password.', 'auth/wrong-password': 'Incorrect email or password.',
      'auth/user-not-found': 'No account found with that email.', 'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password must be at least 6 characters.', 'auth/invalid-email': 'Please enter a valid email address.',
      'auth/too-many-requests': 'Too many attempts. Please try again later.', 'auth/network-request-failed': 'Network error. Check your connection.'
    };
    return m[e.code] || e.message || 'Something went wrong.';
  }

  const LOGO = `<img src="${document.body.dataset.root || ''}assets/img/logo.png" alt="" width="48" height="48"
    onerror="if(!this.dataset.f){this.dataset.f=1;this.src='https://www.vvitguntur.com/images/logo.png'}else{this.onerror=null;this.src='${document.body.dataset.root || ''}assets/img/logo-placeholder.svg'}">`;

  function mountChrome(active) {
    const r = document.body.dataset.root || '';
    const admin = document.body.dataset.admin === '1';
    const nav = [['home', 'index.html', 'Home'], ['submit', 'submit.html', 'Submit a complaint'], ['track', 'track.html', 'Track status']]
      .map(([k, h, l]) => `<a href="${r}${h}"${k === active ? ' aria-current="page"' : ''}>${l}</a>`).join('');
    const warn = configured ? '' : '<div class="banner-warn">Firebase is not configured yet — open <code>public/assets/js/firebase-config.js</code> and paste your project settings.</div>';
    document.body.insertAdjacentHTML('afterbegin', `
      <a class="sr" href="#main">Skip to content</a>${warn}
      <div class="utility"><div class="wrap"><span>Vasireddy Venkatadri Institute of Technology · Nambur, Guntur</span>
        <span><a href="https://www.vvitguntur.com/index.php/facilities/grievance-cell" target="_blank" rel="noopener">Grievance Cell</a> &nbsp;|&nbsp; <a href="https://www.vvitguntur.com/" target="_blank" rel="noopener">vvitguntur.com</a></span></div></div>
      <header class="site-header"><div class="wrap">
        <a class="brand" href="${r}index.html">${LOGO}<div><b>VVIT Complaint Box</b><span>Student &amp; staff grievance portal</span></div></a>
        <button class="menu-btn" aria-expanded="false" aria-controls="nav">Menu</button>
        <nav class="nav" id="nav" aria-label="Main">${nav}<a id="authLink" href="${r}login.html">Sign in</a></nav>
      </div></header>`);
    document.body.insertAdjacentHTML('beforeend', `
      <footer class="site-footer"><div class="wrap">
        <div><h3>Vasireddy Venkatadri Institute of Technology</h3><p>Nambur (V), Peda Kakani (Md),<br>Guntur (Dt), Andhra Pradesh 522508</p><p>Phone: 9951 023 336 · 9849 542 336</p></div>
        <div><h3>Complaint Box</h3><p><a href="${r}submit.html">Submit a complaint</a></p><p><a href="${r}track.html">Track status</a></p><p><a href="${r}login.html">Sign in / Register</a></p></div>
        <div><h3>College</h3><p><a href="https://www.vvitguntur.com/" target="_blank" rel="noopener">Official website</a></p><p><a href="https://www.vvitguntur.com/index.php/facilities/grievance-cell" target="_blank" rel="noopener">Grievance Cell</a></p><p><a href="${r}admin/index.html">Administrator login</a></p></div>
        </div><div class="wrap legal"><span>© ${new Date().getFullYear()} Vasireddy Venkatadri Institute of Technology</span><span>Complaints are reviewed by the college administration.</span></div></footer>`);
    const btn = $('.menu-btn'), navEl = $('#nav');
    btn.onclick = () => { const o = navEl.classList.toggle('open'); btn.setAttribute('aria-expanded', o); };
    auth.onAuthStateChanged((u) => {
      const a = $('#authLink'); if (!a || admin) return;
      if (u) { a.textContent = 'My dashboard'; a.href = r + 'dashboard.html'; if (active === 'dashboard') a.setAttribute('aria-current', 'page'); }
    });
  }

  window.VVIT = { db, auth, configured, $, $$, esc, CATEGORIES, DEPARTMENTS, STATUS, chip, fmtDate, genToken, normToken, validToken, toast, show, authError, mountChrome, ts: () => firebase.firestore.FieldValue.serverTimestamp() };
})();
