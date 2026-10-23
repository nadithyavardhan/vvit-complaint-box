(function () {
  const { db, $, esc, CATEGORIES, mountChrome, normToken, validToken, fmtDate } = VVIT;
  mountChrome('home');
  $('#cats').innerHTML = Object.values(CATEGORIES).map((c) => `<span>${esc(c)}</span>`).join('');

  $('#heroTrack').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = normToken($('#tk').value), err = $('#tkErr');
    if (!validToken(t)) { err.textContent = 'That does not look like a valid token. It looks like VVIT-AB12-CD34-EF56.'; err.hidden = false; return; }
    location.href = 'track.html?token=' + encodeURIComponent(t);
  });

  db.collection('announcements').where('status', '==', 'approved').get().then((snap) => {
    const rows = snap.docs.map((d) => d.data()).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 5);
    $('#notices').innerHTML = rows.length
      ? rows.map((r) => `<li><time>${esc(fmtDate(r.createdAt))}</time><span>${esc(r.text)}</span></li>`).join('')
      : '<li class="muted">No notices at the moment.</li>';
  }).catch(() => { $('#notices').innerHTML = '<li class="muted">Notices are unavailable right now.</li>'; });
})();
