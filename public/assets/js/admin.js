(function () {
  const { db, auth, $, esc, CATEGORIES, chip, fmtDate, mountChrome, show, authError, toast, ts } = VVIT;
  mountChrome('admin');
  let all = [], cur = null;
  $('#fc').insertAdjacentHTML('beforeend', Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}">${v}</option>`).join(''));

  /* ---- access gate: signed in AND present in /admins/{uid} ---- */
  auth.onAuthStateChanged(async (u) => {
    if (!u) { $('#gate').hidden = false; $('#app').hidden = true; return; }
    let ok = false;
    try { ok = (await db.collection('admins').doc(u.uid).get()).exists; } catch (e) {}
    if (!ok) { await auth.signOut(); return show($('#gateMsg'), 'This account is not registered as an administrator.', 'err'); }
    $('#gate').hidden = true; $('#app').hidden = false; $('#who').textContent = u.email;
    loadComplaints(); loadNotices();
  });
  $('#gateForm').addEventListener('submit', async (e) => {
    e.preventDefault(); $('#gateMsg').hidden = true;
    try { await auth.signInWithEmailAndPassword($('#aEmail').value.trim(), $('#aPass').value); } catch (ex) { show($('#gateMsg'), authError(ex), 'err'); }
  });
  $('#out').onclick = () => auth.signOut();
  const tab = (a) => { $('#tC').setAttribute('aria-selected', !a); $('#tA').setAttribute('aria-selected', a); $('#pC').hidden = a; $('#pA').hidden = !a; };
  $('#tC').onclick = () => tab(false); $('#tA').onclick = () => tab(true);

  /* ---- complaints ---- */
  async function loadComplaints() {
    try { all = (await db.collection('complaints').orderBy('createdAt', 'desc').limit(1000).get()).docs.map((d) => d.data()); }
    catch (e) { console.error(e); return ($('#list').innerHTML = '<div class="empty">Could not load complaints (check Firestore rules).</div>'); }
    const n = (s) => all.filter((c) => c.status === s).length;
    $('#stats').innerHTML = [['Total', all.length], ['Received', n('submitted')], ['Under review', n('in_review')], ['Resolved', n('resolved')]].map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('');
    draw();
  }
  const filtered = () => {
    const q = $('#q').value.trim().toLowerCase(), s = $('#fs').value, c = $('#fc').value;
    return all.filter((x) => (!s || x.status === s) && (!c || x.category === c) && (!q || [x.token, x.subject, x.description, x.name, x.email].join(' ').toLowerCase().includes(q)));
  };
  function draw() {
    const rows = filtered();
    $('#list').innerHTML = rows.length ? rows.map((c) => `<button class="item" data-t="${esc(c.token)}"><h3>${esc(c.subject)}</h3>${chip(c.status)}
      <div class="meta"><span>${esc(CATEGORIES[c.category] || c.category)}</span><span>${esc(c.department || '—')}</span><span>${c.isAnonymous ? 'Anonymous' : esc(c.name || c.email)}</span><span>${esc(fmtDate(c.createdAt))}</span><span>${esc(c.token)}</span></div></button>`).join('')
      : '<div class="empty">No complaints match these filters.</div>';
  }
  ['q', 'fs', 'fc'].forEach((id) => $('#' + id).addEventListener('input', draw));
  $('#list').addEventListener('click', (e) => { const b = e.target.closest('.item'); if (b) open(all.find((c) => c.token === b.dataset.t)); });

  function open(c) {
    cur = c; $('#dTitle').textContent = c.subject; $('#dToken').textContent = c.token;
    const rows = [['Category', CATEGORIES[c.category] || c.category], ['Department', c.department || '—'], ['Filed', fmtDate(c.createdAt, true)],
      ['Submitted by', c.isAnonymous ? 'Anonymous' : `${c.name || '—'} (${c.email || '—'})${c.rollNo ? ' · ' + c.rollNo : ''}`], ['Description', c.description], ['Expected outcome', c.expectedResolution || '—']];
    $('#dKv').innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
    $('#dStatus').value = c.status; $('#dRes').value = c.resolution || ''; $('#dMsg').hidden = true; $('#dlg').showModal();
  }
  $('#dClose').onclick = () => $('#dlg').close();
  $('#dSave').onclick = async () => {
    const status = $('#dStatus').value, resolution = $('#dRes').value.trim();
    if ((status === 'resolved' || status === 'rejected') && !resolution) return show($('#dMsg'), 'Please add a resolution note before closing a complaint.', 'err');
    const upd = { status, resolution, updatedAt: ts() }; if (status === 'resolved') upd.resolvedAt = ts();
    try { await db.collection('complaints').doc(cur.token).update(upd); $('#dlg').close(); toast('Saved'); loadComplaints(); }
    catch (e) { console.error(e); show($('#dMsg'), 'Save failed. Check your permissions.', 'err'); }
  };
  $('#dDel').onclick = async () => {
    if (!confirm('Permanently delete this complaint? This cannot be undone.')) return;
    try { await db.collection('complaints').doc(cur.token).delete(); $('#dlg').close(); toast('Deleted'); loadComplaints(); } catch (e) { show($('#dMsg'), 'Delete failed.', 'err'); }
  };
  $('#csv').onclick = () => {
    const cell = (v) => { v = String(v ?? ''); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
    const head = ['Token', 'Filed', 'Status', 'Category', 'Department', 'Anonymous', 'Name', 'Email', 'Roll no', 'Subject', 'Description', 'Resolution'];
    const lines = filtered().map((c) => [c.token, fmtDate(c.createdAt, true), VVIT.STATUS[c.status], CATEGORIES[c.category], c.department, c.isAnonymous ? 'Yes' : 'No', c.name, c.email, c.rollNo, c.subject, c.description, c.resolution].map(cell).join(','));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + [head.map(cell).join(','), ...lines].join('\r\n')], { type: 'text/csv' }));
    a.download = `vvit-complaints-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  /* ---- notices ---- */
  async function loadNotices() {
    const snap = await db.collection('announcements').orderBy('createdAt', 'desc').get();
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const li = (r, btns) => `<div class="item" style="cursor:default"><span>${esc(r.text)}</span><span></span><div class="meta"><span>${esc(fmtDate(r.createdAt))}</span>${btns}</div></div>`;
    const p = rows.filter((r) => r.status === 'pending'), a = rows.filter((r) => r.status === 'approved');
    $('#pending').innerHTML = p.length ? p.map((r) => li(r, `<button class="btn btn-primary btn-sm" data-ap="${r.id}">Approve</button><button class="btn btn-danger btn-sm" data-del="${r.id}">Reject</button>`)).join('') : '<div class="empty">Nothing pending.</div>';
    $('#published').innerHTML = a.length ? a.map((r) => li(r, `<button class="btn btn-danger btn-sm" data-del="${r.id}">Remove</button>`)).join('') : '<div class="empty">No published notices.</div>';
  }
  $('#pA').addEventListener('click', async (e) => {
    const ap = e.target.dataset.ap, del = e.target.dataset.del;
    try {
      if (ap) await db.collection('announcements').doc(ap).update({ status: 'approved' });
      else if (del && confirm('Remove this notice?')) await db.collection('announcements').doc(del).delete(); else return;
      loadNotices();
    } catch (ex) { toast('Action failed'); }
  });
  $('#annForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const t = $('#annText').value.trim(); if (!t) return;
    try { await db.collection('announcements').add({ text: t, status: 'approved', createdBy: auth.currentUser.uid, createdAt: ts() }); $('#annText').value = ''; show($('#annMsg'), 'Notice published.', 'ok'); loadNotices(); }
    catch (ex) { show($('#annMsg'), 'Could not publish.', 'err'); }
  });
})();
