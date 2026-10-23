(function () {
  const { db, $, esc, CATEGORIES, STATUS, chip, fmtDate, mountChrome, normToken, validToken, show } = VVIT;
  mountChrome('track');
  const err = $('#err'), res = $('#result');

  async function lookup(token) {
    err.hidden = true; res.hidden = true;
    if (!validToken(token)) return show(err, 'That token is not in the right format. Example: VVIT-AB12-CD34-EF56.', 'err');
    try {
      const snap = await db.collection('complaints').doc(token).get();
      if (!snap.exists) return show(err, 'No complaint found for this token. Check for typing mistakes (letters O and I are never used).', 'err');
      render(snap.data());
    } catch (e) { console.error(e); show(err, 'Could not look up the token right now. Please try again.', 'err'); }
  }
  function render(c) {
    $('#rSubject').textContent = c.subject; $('#rToken').textContent = c.token; $('#rChip').innerHTML = chip(c.status);
    const idx = { submitted: 0, in_review: 1, resolved: 2, rejected: 2 }[c.status] ?? 0;
    const labels = ['Received', 'Under review', c.status === 'rejected' ? 'Closed' : 'Resolved'];
    $('#progress').innerHTML = labels.map((l, i) => `<li class="${i < idx || (i === 2 && idx === 2) ? 'done' : i === idx ? 'now' : ''}">${l}</li>`).join('');
    const rows = [['Category', CATEGORIES[c.category] || c.category], ['Department', c.department || '—'], ['Filed on', fmtDate(c.createdAt, true)],
      ['Last update', fmtDate(c.updatedAt, true)], ['Submitted', c.isAnonymous ? 'Anonymously' : 'With details'], ['Description', c.description], ['Expected outcome', c.expectedResolution || '—']];
    $('#rDetails').innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
    $('#rRes').hidden = !c.resolution; $('#rResText').textContent = c.resolution || '';
    res.hidden = false;
  }
  $('#form').addEventListener('submit', (e) => { e.preventDefault(); const t = normToken($('#tk').value); history.replaceState(null, '', '?token=' + t); lookup(t); });
  const q = new URLSearchParams(location.search).get('token');
  if (q) { $('#tk').value = normToken(q); lookup(normToken(q)); }
})();
