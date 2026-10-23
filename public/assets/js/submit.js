(function () {
  const { db, auth, $, $$, CATEGORIES, DEPARTMENTS, mountChrome, genToken, show, ts } = VVIT;
  mountChrome('submit');
  const f = $('#form'), err = $('#err');
  $('#category').insertAdjacentHTML('beforeend', Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}">${v}</option>`).join(''));
  $('#department').insertAdjacentHTML('beforeend', DEPARTMENTS.map((d) => `<option>${d}</option>`).join(''));
  if (new URLSearchParams(location.search).get('mode') === 'named') $('input[value=named]').checked = true;

  let user = null, profile = null;
  const who = () => $('input[name=who]:checked').value;
  function refresh() {
    const named = who() === 'named';
    $('#needLogin').hidden = !(named && !user);
    $('#loginLink').href = 'login.html?next=' + encodeURIComponent('submit.html?mode=named');
    $('#whoAmI').hidden = !(named && user);
    if (named && user) $('#whoAmI').textContent = `Submitting as ${profile?.name || user.email} (${user.email}).`;
    $('#submitBtn').disabled = named && !user;
  }
  $$('input[name=who]').forEach((r) => r.addEventListener('change', refresh));
  $('#category').addEventListener('change', (e) => { $('#safety').hidden = e.target.value !== 'harassment'; });
  const count = (id, out, max) => $(id).addEventListener('input', (e) => { $(out).textContent = `${e.target.value.length}/${max}`; });
  count('#subject', '#subjectCount', 120); count('#description', '#descCount', 3000);

  auth.onAuthStateChanged(async (u) => {
    user = u; profile = null;
    if (u) { try { profile = (await db.collection('users').doc(u.uid).get()).data() || null; } catch (e) {} }
    refresh();
  });

  f.addEventListener('submit', async (e) => {
    e.preventDefault(); err.hidden = true;
    const category = $('#category').value, subject = $('#subject').value.trim(), description = $('#description').value.trim();
    if (!category) return show(err, 'Please choose a category.', 'err');
    if (subject.length < 5) return show(err, 'Subject must be at least 5 characters.', 'err');
    if (description.length < 20) return show(err, 'Please describe the issue in at least 20 characters.', 'err');
    const named = who() === 'named';
    if (named && !user) return refresh();
    const token = genToken();
    const doc = { token, category, department: $('#department').value, subject, description, expectedResolution: $('#resolution').value.trim(),
      isAnonymous: !named, status: 'submitted', createdAt: ts(), updatedAt: ts() };
    if (named) Object.assign(doc, { uid: user.uid, email: user.email, name: profile?.name || user.displayName || '', rollNo: profile?.rollNo || '' });
    const btn = $('#submitBtn'); btn.disabled = true; btn.textContent = 'Submitting…';
    try {
      await db.collection('complaints').doc(token).set(doc);
      $('#formPanel').hidden = true; $('#done').hidden = false;
      $('#tokenBox').textContent = token; $('#trackLink').href = 'track.html?token=' + token;
      $('#copyBtn').onclick = () => navigator.clipboard.writeText(token).then(() => VVIT.toast('Token copied'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (ex) {
      console.error(ex); show(err, 'Could not submit. Check your connection and try again.', 'err');
      btn.disabled = false; btn.textContent = 'Submit complaint';
    }
  });
})();
