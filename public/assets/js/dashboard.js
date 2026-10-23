(function () {
  const { db, auth, $, esc, CATEGORIES, chip, fmtDate, mountChrome, show, toast, ts } = VVIT;
  mountChrome('dashboard');
  let all = [];
  auth.onAuthStateChanged(async (u) => {
    if (!u) return (location.href = 'login.html?next=dashboard.html');
    let p = {}; try { p = (await db.collection('users').doc(u.uid).get()).data() || {}; } catch (e) {}
    $('#hello').textContent = 'Welcome, ' + (p.name || u.displayName || 'there'); $('#sub').textContent = u.email;
    $('#profile').innerHTML = [['Name', p.name || '—'], ['Role', p.role || '—'], ['Roll no.', p.rollNo || '—'], ['Department', p.department || '—']]
      .map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
    $('#resetPw').onclick = () => auth.sendPasswordResetEmail(u.email).then(() => toast('Reset link sent to ' + u.email));
    $('#annForm').onsubmit = async (e) => {
      e.preventDefault(); const t = $('#annText').value.trim(), m = $('#annMsg'); if (!t) return;
      try { await db.collection('announcements').add({ text: t, status: 'pending', createdBy: u.uid, createdAt: ts() }); $('#annText').value = ''; show(m, 'Request sent for review.', 'ok'); }
      catch (ex) { show(m, 'Could not send the request.', 'err'); }
    };
    try {
      const s = await db.collection('complaints').where('uid', '==', u.uid).get();
      all = s.docs.map((d) => d.data()).sort((a, b) => (b.createdAt?.seconds || 9e12) - (a.createdAt?.seconds || 9e12));
    } catch (ex) { console.error(ex); $('#list').innerHTML = '<div class="empty">Could not load your complaints.</div>'; return; }
    const n = (s) => all.filter((c) => c.status === s).length;
    $('#stats').innerHTML = [['Total', all.length], ['Received', n('submitted')], ['Under review', n('in_review')], ['Resolved', n('resolved')]]
      .map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('');
    draw();
  });
  function draw() {
    const f = $('#filter').value, rows = all.filter((c) => !f || c.status === f);
    $('#list').innerHTML = rows.length ? rows.map((c) => `<a class="item" href="track.html?token=${encodeURIComponent(c.token)}" style="text-decoration:none">
      <h3>${esc(c.subject)}</h3>${chip(c.status)}<div class="meta"><span>${esc(CATEGORIES[c.category] || c.category)}</span><span>${esc(fmtDate(c.createdAt))}</span><span>${esc(c.token)}</span></div></a>`).join('')
      : `<div class="empty">${all.length ? 'No complaints with this status.' : 'You have not submitted any complaints with your account yet.'}</div>`;
  }
  $('#filter').onchange = draw;
  $('#signOut').onclick = () => auth.signOut().then(() => (location.href = 'index.html'));
})();
