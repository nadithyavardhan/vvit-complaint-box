(function () {
  const { db, auth, $, DEPARTMENTS, mountChrome, show, authError, ts } = VVIT;
  mountChrome('login');
  const msg = $('#msg'), params = new URLSearchParams(location.search);
  const next = (params.get('next') || 'dashboard.html').replace(/^[a-z]+:\/\//i, '').replace(/^\/+/, '');
  const go = () => { location.href = /^[\w\-./?=&]+$/.test(next) && !next.startsWith('..') ? next : 'dashboard.html'; };
  $('#upDept').innerHTML = DEPARTMENTS.map((d) => `<option>${d}</option>`).join('');

  function tab(up) {
    $('#tabIn').setAttribute('aria-selected', !up); $('#tabUp').setAttribute('aria-selected', up);
    $('#inForm').hidden = up; $('#upForm').hidden = !up; msg.hidden = true;
  }
  $('#tabIn').onclick = () => tab(false); $('#tabUp').onclick = () => tab(true);
  if (params.get('tab') === 'register') tab(true);
  $('#upRole').onchange = (e) => { $('#rollWrap').hidden = e.target.value !== 'student'; };

  auth.onAuthStateChanged((u) => { if (u && !window.__registering) go(); });

  $('#inForm').addEventListener('submit', async (e) => {
    e.preventDefault(); msg.hidden = true;
    try { await auth.signInWithEmailAndPassword($('#inEmail').value.trim(), $('#inPass').value); go(); }
    catch (ex) { show(msg, authError(ex), 'err'); }
  });
  $('#forgot').onclick = async (e) => {
    e.preventDefault(); const em = $('#inEmail').value.trim();
    if (!em) return show(msg, 'Enter your email above first, then click “Forgot password?”.', 'err');
    try { await auth.sendPasswordResetEmail(em); show(msg, 'Password reset link sent. Check your inbox (and spam).', 'ok'); }
    catch (ex) { show(msg, authError(ex), 'err'); }
  };
  $('#upForm').addEventListener('submit', async (e) => {
    e.preventDefault(); msg.hidden = true;
    const name = $('#upName').value.trim(), role = $('#upRole').value;
    if (name.length < 2) return show(msg, 'Please enter your full name.', 'err');
    if (role === 'student' && !$('#upRoll').value.trim()) return show(msg, 'Students must enter a roll number.', 'err');
    window.__registering = true;
    try {
      const cred = await auth.createUserWithEmailAndPassword($('#upEmail').value.trim(), $('#upPass').value);
      await cred.user.updateProfile({ displayName: name });
      await db.collection('users').doc(cred.user.uid).set({ name, role, rollNo: role === 'student' ? $('#upRoll').value.trim().toUpperCase() : '',
        department: $('#upDept').value, email: cred.user.email, createdAt: ts() });
      go();
    } catch (ex) { window.__registering = false; show(msg, authError(ex), 'err'); }
  });
})();
