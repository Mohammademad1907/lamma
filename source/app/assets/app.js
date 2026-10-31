'use strict';
/* Lamma: order food together and split the bill. Accounts and live sync run on Firebase. */

const CFG = window.LAMMA_CONFIG;
const N = window.LammaNative || null;
const F = window.Fuzzy;
const FB = window.FB;
const VERSION = '2.9';
const CURRENCIES = ['EGP', 'SAR', 'AED', 'KWD', 'QAR', 'USD', 'EUR', 'GBP'];
const MAX_PHOTOS = 10;
const USER_DOMAIN = 'users.lamma.app';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; };
const rid = (n = 10) => { const a = 'abcdefghijkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
const newCode = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const ts = v => (v && v.toMillis ? v.toMillis() : v || 0);
const qtyOf = it => it.qty || 1;
const sumQty = items => items.reduce((s, i) => s + qtyOf(i), 0);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const isSet = v => v != null && v !== '';

const svg = (d, fill) => `<svg viewBox="0 0 24 24" ${fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'}>${d}</svg>`;
const ICON = {
  back: svg('<path d="M19 12H5M11 18l-6-6 6-6"/>'),
  more: svg('<circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/>', true),
  chev: svg('<path d="M9 6l6 6-6 6"/>'),
  link: svg('<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>'),
  map: svg('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  photo: svg('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>'),
  share: svg('<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6"/>'),
  copy: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>'),
  list: svg('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
  plusCircle: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  userPlus: svg('<circle cx="9" cy="8" r="4"/><path d="M2 21v-1a6 6 0 016-6h2a6 6 0 016 6v1"/><path d="M19 8v6M16 11h6"/>'),
  users: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20v-.5A5.5 5.5 0 018 14h2a5.5 5.5 0 015.5 5.5v.5"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14a5.5 5.5 0 013.5 5.2v.8"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>'),
  unlock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 017.8-1.2"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  truck: svg('<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'),
  checklist: svg('<path d="M4 7l2 2 3-3M4 15l2 2 3-3M12 8h8M12 16h8"/>'),
  download: svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  edit: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  bulb: svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0012 3z"/>'),
  card: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>'),
  receipt: svg('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>'),
  note: svg('<path d="M5 4h14v11l-5 5H5z"/><path d="M14 20v-5h5"/>'),
  checkCircle: svg('<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>'),
  bell: svg('<path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 004 0"/>'),
  crown: svg('<path d="M4 18h16M5 15l-1-8 5 4 3-6 3 6 5-4-1 8z"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
  reload: svg('<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/>'),
  camera: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  help: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 015 .5c0 1.7-2.5 2-2.5 3.5M12 17h.01"/>'),
  google: '<svg class="g-logo" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>',
};

/* ---------------- firebase ---------------- */
const fbApp = FB.initializeApp(CFG.firebase);
// the web version (iPhone) signs in with Google in a popup; the Android app uses the browser page instead
const auth = FB.initializeAuth(fbApp, N ? { persistence: FB.browserLocalPersistence } : { persistence: FB.browserLocalPersistence, popupRedirectResolver: FB.browserPopupRedirectResolver });
const db = FB.initializeFirestore(fbApp, { experimentalAutoDetectLongPolling: true });
if (CFG.emulator) {
  FB.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  FB.connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
const D = (...p) => FB.doc(db, ...p);
const C = (...p) => FB.collection(db, ...p);

/* ---------------- state ---------------- */
const S = {
  user: null, profile: null, view: 'loading', homeTab: 'mine', authMode: 'signin',
  hosted: [], joined: [], joinedOrders: {}, menus: [],
  order: null, people: [], me: null, screen: 'details', listTab: 'people', orderMissing: false, delivering: false,
  pendingCode: null, inbox: [], scores: [], myGuess: null, guesses: [], avatars: {}, q: '', searchPeople: null,
};
const subs = { global: [], order: [], joined: {} };
const stop = k => { subs[k].forEach(u => u()); subs[k] = []; };

/* ---------------- native helpers ---------------- */
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  $('#toast').appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
// in-app confirm box (replaces the phone's grey "The page at ... says" popup)
function ask({ title, body = '', ok = 'OK', danger = false, icon = '' }) {
  return new Promise(done => {
    const d = document.createElement('div');
    d.className = 'dialog-bg';
    d.innerHTML = `<div class="dialog" role="alertdialog" aria-modal="true">
      ${icon ? `<div class="dialog-icon ${danger ? 'danger' : ''}">${icon}</div>` : ''}
      <h3 dir="auto">${esc(title)}</h3>${body ? `<p class="sub" dir="auto">${esc(body)}</p>` : ''}
      <div class="dialog-btns"><button class="btn" data-r="0">Cancel</button><button class="btn ${danger ? 'danger-fill' : 'primary'}" data-r="1">${esc(ok)}</button></div></div>`;
    const end = v => { d.classList.add('out'); setTimeout(() => d.remove(), 160); done(v); };
    d.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) end(b.dataset.r === '1'); else if (e.target === d) end(false); });
    d.close = () => end(false);
    document.body.appendChild(d);
    d.querySelector('[data-r="1"]').focus();
  });
}
function share(text) {
  if (N) N.share(text);
  else if (navigator.share) navigator.share({ text }).catch(() => { });
  else copy(text);
}
function copy(text) {
  if (N) N.copy(text); else if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => { });
  toast('Copied');
}
function openUrl(url) {
  if (!/^[a-z]+:\/\//i.test(url)) url = 'https://' + url;
  if (N) N.openUrl(url); else window.open(url, '_blank');
}

/* ---------------- theme ---------------- */
function themeSetting() { try { return localStorage.getItem('lamma.theme') || 'system'; } catch (e) { return 'system'; } }
function systemDark() { return N ? N.isSystemDark() : matchMedia('(prefers-color-scheme: dark)').matches; }
function applyTheme() {
  const t = themeSetting();
  const dark = t === 'dark' || (t === 'system' && systemDark());
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  if (N) N.setBars(dark);
}
window.lammaSystemDark = () => applyTheme();
if (!N) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

/* ---------------- dates & order status ---------------- */
const fmtDate = t => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = t => new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
function fmtWhen(t) {
  const d = new Date(t), now = new Date();
  const day = d.toDateString() === now.toDateString() ? 'today'
    : d.toDateString() === new Date(now.getTime() + 864e5).toDateString() ? 'tomorrow'
      : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day} at ${fmtTime(t)}`;
}
function timeLeft(t) {
  const m = Math.max(0, Math.round((t - Date.now()) / 60000));
  if (m < 1) return 'less than a minute';
  if (m < 60) return plural(m, 'minute');
  const h = Math.floor(m / 60), r = m % 60;
  if (h < 24) return `${plural(h, 'hour')}${r ? ` ${r} min` : ''}`;
  return plural(Math.round(h / 24), 'day');
}
// value for <input type="datetime-local"> in the phone's own time zone
const toLocalInput = t => { const d = new Date(t - new Date(t).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };
const delivered = o => o.stage === 'delivered';
const deadlinePassed = o => !!(o.lockAt && Date.now() >= o.lockAt);
// locked: friends can't add or change food anymore
const locked = o => !o.open || deadlinePassed(o) || delivered(o);
function statusBadges(o) {
  if (delivered(o)) return `<span class="badge good">${ICON.truck} Delivered</span>`;
  if (locked(o)) return `<span class="badge active">Active</span><span class="badge locked">${ICON.lock} Locked</span>`;
  return `<span class="badge active">Active</span>${o.lockAt ? `<span class="badge warn">${ICON.clock} Locks ${fmtTime(o.lockAt)}</span>` : ''}`;
}

/* ---------------- money & bill ---------------- */
function money(n, cur) {
  const d = cur === 'KWD' ? 3 : 2;
  const r = Math.round((n || 0) * 10 ** d) / 10 ** d;
  return (cur || 'EGP') + ' ' + r.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

// every food in the order: people's items plus shared items
function allItems(o, people) {
  const out = [];
  for (const p of people) for (const it of p.items || []) out.push({ ...it, pid: p.id });
  for (const s of o.shared || []) out.push({ ...s, shared: true });
  return out;
}
function groupsOf(o, people) {
  return F.group(allItems(o, people), { smart: o.smart !== false, blocks: new Set(o.blocks || []), joins: o.joins || [] });
}
// extras with the same name (any spelling case or spacing) are priced together
function extraGroups(people) {
  const m = new Map();
  for (const p of people) for (const it of p.items || []) for (const ex of it.extras || []) {
    const k = F.normalize(ex.name);
    if (!k) continue;
    if (!m.has(k)) m.set(k, { key: k, label: ex.name, qty: 0, prices: [] });
    const g = m.get(k); g.qty += qtyOf(it);
    if (isSet(ex.price)) g.prices.push(num(ex.price));
  }
  return [...m.values()];
}
function priceFor(o, name, keys) {
  const p = o.prices || {};
  const k = F.normalize(name);
  if (isSet(p[k])) return num(p[k]);
  for (const kk of keys || []) if (isSet(p[kk])) return num(p[kk]);
  return null;
}
const itemPrice = it => (isSet(it.price) ? num(it.price) : null);
const itemKey = (pid, id) => `${pid}|${id}`;
// host price for one person's item > host price for that food > the price the person typed
function makeUnit(o, groups) {
  const keysOf = {};
  for (const g of groups) for (const k of g.keys) keysOf[k] = g.keys;
  const ip = o.itemPrices || {}, xp = o.extraPrices || {};
  return {
    item: it => {
      if (!it.shared && isSet(ip[itemKey(it.pid, it.id)])) return num(ip[itemKey(it.pid, it.id)]);
      const h = priceFor(o, it.name, keysOf[F.normalize(it.name)]);
      return h != null ? h : itemPrice(it);
    },
    extra: ex => (isSet(xp[F.normalize(ex.name)]) ? num(xp[F.normalize(ex.name)]) : itemPrice(ex)),
  };
}
function computeBill(o, people) {
  const groups = groupsOf(o, people);
  const unit = makeUnit(o, groups);
  const rows = new Map(people.map(p => [p.id, { p, lines: [], extras: [], items: 0, extrasT: 0 }]));
  let missing = 0;
  for (const p of people) for (const it0 of p.items || []) {
    const it = { ...it0, pid: p.id }, q = qtyOf(it), u = unit.item(it), r = rows.get(p.id);
    if (u == null) missing++;
    r.lines.push({ id: it.id, n: it.name, q, note: it.note || '', u, a: (u || 0) * q, member: itemPrice(it), over: isSet((o.itemPrices || {})[itemKey(p.id, it.id)]) });
    r.items += (u || 0) * q;
    for (const ex of it.extras || []) {
      const eu = unit.extra(ex);
      if (eu == null) missing++;
      r.extras.push({ n: ex.name, on: it.name, q, u: eu, a: (eu || 0) * q });
      r.extrasT += (eu || 0) * q;
    }
  }
  for (const s of o.shared || []) {
    const who = (s.sharers || []).filter(id => rows.has(id));
    if (!who.length) continue;
    const u = unit.item({ ...s, shared: true });
    if (u == null) missing++;
    const a = (u || 0) * qtyOf(s) / who.length;
    for (const id of who) { const r = rows.get(id); r.items += a; r.lines.push({ n: s.name, q: qtyOf(s), u, a, split: who.length, shared: true }); }
  }
  const f = o.fees || {};
  const vatP = o.autoFees === false ? 0 : num(f.vat), svcP = o.autoFees === false ? 0 : num(f.service);
  const list = [...rows.values()];
  for (const r of list) r.sub = r.items + r.extrasT;
  const S0 = list.reduce((a, r) => a + r.sub, 0);
  const disc = Math.min(S0, f.discountType === 'pct' ? S0 * num(f.discount) / 100 : num(f.discount));
  const eaters = list.filter(r => r.sub > 0);
  for (const r of list) {
    r.disc = S0 ? disc * r.sub / S0 : 0;
    const base = r.sub - r.disc;
    r.service = base * svcP / 100;
    r.vat = (base + (f.vatOnService !== false ? r.service : 0)) * vatP / 100;
    r.delivery = eaters.includes(r) ? num(f.delivery) / eaters.length : 0;
    r.total = base + r.service + r.vat + r.delivery;
    r.adj = 0;
  }
  const computed = list.reduce((a, r) => a + r.total, 0);
  const receipt = num(f.receipt);
  if (receipt > 0 && computed > 0) for (const r of list) { r.adj = r.total * (receipt / computed - 1); r.total += r.adj; }
  return { groups, unit, rows: list, sub: S0, disc, computed, grand: list.reduce((a, r) => a + r.total, 0), missing, receipt, vatP, svcP };
}

/* ---------------- auth ---------------- */
const emailFor = u => `${u.toLowerCase()}@${USER_DOMAIN}`;
const AUTH_ERRORS = {
  'auth/invalid-credential': 'Wrong username or password.', 'auth/wrong-password': 'Wrong username or password.',
  'auth/user-not-found': 'Wrong username or password.', 'auth/email-already-in-use': 'That username is already taken.',
  'auth/weak-password': 'The password needs at least 6 characters.', 'auth/too-many-requests': 'Too many tries. Wait a minute and try again.',
  'auth/network-request-failed': 'No internet connection.',
};
async function doAuth() {
  const u = $('#au-user').value.trim(), pw = $('#au-pass').value, err = $('#au-err');
  err.textContent = '';
  if (!/^[a-zA-Z0-9_.]{3,20}$/.test(u)) { err.textContent = 'Usernames are 3 to 20 letters, numbers, dots or underscores.'; return; }
  if (pw.length < 6) { err.textContent = 'The password needs at least 6 characters.'; return; }
  const btn = $('#au-go'); btn.disabled = true;
  try {
    if (S.authMode === 'signup') {
      S.signupName = $('#au-name').value.trim() || u;
      S.signupUser = u.toLowerCase();
      await FB.createUserWithEmailAndPassword(auth, emailFor(u), pw);
    } else {
      await FB.signInWithEmailAndPassword(auth, emailFor(u), pw);
    }
  } catch (e) {
    err.textContent = AUTH_ERRORS[e.code] || 'Something went wrong. Try again.';
    btn.disabled = false;
  }
}
function googleSignIn() {
  if (N) { openUrl(`${CFG.webBase}/auth/`); toast('Finish signing in in your browser'); return; }
  FB.signInWithPopup(auth, new FB.GoogleAuthProvider()).catch(e => toast(AUTH_ERRORS[e.code] || 'Google sign-in failed'));
}
async function googleToken(idToken) {
  const cred = FB.GoogleAuthProvider.credential(idToken);
  // signed in already: this token came from "Connect Google", so add Google to this account
  if (auth.currentUser) { try { await FB.linkWithCredential(auth.currentUser, cred); linked(); } catch (e) { linkFailed(e); } return; }
  try { await FB.signInWithCredential(auth, cred); }
  catch (e) { toast('Google sign-in failed. Try again.'); }
}
function linkGoogle() {
  if (N) { openUrl(`${CFG.webBase}/auth/`); toast('Choose your Google account in the browser'); return; }
  FB.linkWithPopup(auth.currentUser, new FB.GoogleAuthProvider()).then(linked, linkFailed);
}
function linked() {
  auth.currentUser.reload().then(() => { if (S.view === 'settings') render(); }).catch(() => { });
  toast('Google connected. You can now sign in with either one.');
}
function linkFailed(e) {
  if (e && (e.code === 'auth/credential-already-in-use' || e.code === 'auth/email-already-in-use')) {
    openSheet(`<h2>That Google account already has a Lamma account</h2>
      <p class="sub">A Google account can belong to one Lamma account only. To connect it here, first remove the other one:</p>
      <ol class="plain"><li>Open the Firebase console → Authentication → Users.</li><li>Find the user with the Google icon and this Google email, open its ⋮ menu and choose <b>Delete account</b>. Only do this if that account has no orders you need.</li><li>Come back and tap <b>Connect Google</b> again.</li></ol>
      <button class="btn primary block" data-a="closeSheet">OK</button>`);
  } else if (e && e.code === 'auth/provider-already-linked') toast('Google is already connected.');
  else if (e && e.code !== 'auth/popup-closed-by-user') toast('Could not connect Google. Try again.');
}
async function ensureProfile(user) {
  const ref = D('users', user.uid);
  const snap = await FB.getDoc(ref);
  if (snap.exists()) return snap.data();
  const fromEmail = (user.email || 'user').split('@')[0].replace(/[^a-z0-9_.]/gi, '').toLowerCase() || 'user';
  const p = { name: S.signupName || user.displayName || fromEmail, username: S.signupUser || fromEmail, instapay: '', createdAt: Date.now() };
  await FB.setDoc(ref, p);
  return p;
}

// joined orders are shown with live details (status, member count), so each one is watched
function watchJoined() {
  const want = new Set(S.joined.map(j => j.id));
  for (const id of Object.keys(subs.joined)) if (!want.has(id)) { subs.joined[id](); delete subs.joined[id]; delete S.joinedOrders[id]; }
  for (const id of want) if (!subs.joined[id]) {
    subs.joined[id] = FB.onSnapshot(D('orders', id), s => {
      if (s.exists()) S.joinedOrders[id] = { id, ...s.data() }; else S.joinedOrders[id] = { id, gone: true };
      scheduleDeadlines();
      if (S.view === 'home') render();
    }, () => { });
  }
}

FB.onAuthStateChanged(auth, async user => {
  stop('global'); stop('order');
  for (const id of Object.keys(subs.joined)) subs.joined[id]();
  subs.joined = {}; S.joinedOrders = {};
  S.user = user;
  if (!user) { S.view = 'auth'; S.inbox = []; if (N && N.setAuth) N.setAuth('', '', '', '', 0); render(); return; }
  S.view = 'loading'; render();
  try { S.profile = await ensureProfile(user); } catch (e) { S.profile = { name: 'Me', username: '' }; }
  const uid = user.uid;
  const rerenderHome = () => { if (['home', 'menus'].includes(S.view)) render(); };
  subs.global.push(FB.onSnapshot(D('users', uid), s => { if (s.exists()) S.profile = s.data(); }));
  subs.global.push(FB.onSnapshot(FB.query(C('orders'), FB.where('hostUid', '==', uid)), s => {
    S.hosted = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
    rerenderHome();
    scheduleDeadlines();
  }));
  subs.global.push(FB.onSnapshot(C('users', uid, 'joined'), s => {
    S.joined = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => ts(b.joinedAt) - ts(a.joinedAt));
    watchJoined();
    rerenderHome();
    scheduleDeadlines();
  }));
  subs.global.push(FB.onSnapshot(FB.query(C('menus'), FB.where('ownerUid', '==', uid)), s => {
    S.menus = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => ts(b.updatedAt) - ts(a.updatedAt));
    rerenderHome();
  }));
  watchInbox(uid);
  if (N && N.askNotify) N.askNotify();
  S.view = 'home'; render();
  if (S.pendingOrder) { const o = S.pendingOrder; S.pendingOrder = null; openOrder(o); }
  // after a refresh, open the order you were looking at
  if (WEB && savedOrder() && !S.pendingCode) openOrder(savedOrder());
  else { let r = ''; try { r = sessionStorage.getItem('lamma.reopen') || ''; sessionStorage.removeItem('lamma.reopen'); } catch (e) { } if (r && !S.pendingOrder && !S.pendingCode) openOrder(r); }
  if (S.pendingCode) { const c = S.pendingCode; S.pendingCode = null; joinByCode(c); }
});

/* ---------------- notifications ----------------
   Each person has an inbox (users/{uid}/inbox). Whoever does something writes a note into the inbox of
   the people it concerns. The phone shows new notes as notifications: the Android app also checks every
   15 minutes while closed, and sets alarms on the phone itself for deadlines and payment reminders. */
function notifyUsers(uids, n) {
  const me = S.user && S.user.uid;
  const to = [...new Set(uids)].filter(u => u && u !== me && !String(u).startsWith('x_'));
  const orderId = n.orderId || (S.order && S.order.id);
  if (!to.length || !orderId) return Promise.resolve();
  const b = FB.writeBatch(db), at = Date.now();
  for (const u of to) b.set(D('users', u, 'inbox', rid(16)), { type: n.type, title: n.title, body: n.body || '', orderId, from: me, fromName: S.profile.name, at, read: false, ...(n.amount != null ? { amount: n.amount } : {}) });
  return b.commit().catch(e => console.warn('notify failed', e));
}
const notifyMembers = n => notifyUsers(S.people.filter(p => !p.noApp).map(p => p.id), n);
const unreadCount = () => S.inbox.filter(x => !x.read).length;
const notifStart = Date.now();
const shownNotes = new Set();
function onInbox(list) {
  const fresh = list.filter(x => !x.read && !shownNotes.has(x.id) && x.at > notifStart - 120000);
  list.forEach(x => shownNotes.add(x.id));
  S.inbox = list;
  if (S.view === 'home' || S.view === 'inbox') render();
  for (const x of fresh.reverse()) {
    const inThisOrder = S.view === 'order' && S.order && S.order.id === x.orderId;
    if (N && N.notify) N.notify(x.id, x.title, x.body || '', x.orderId || '', !document.hidden);
    if (!document.hidden && !inThisOrder) banner(x);
    if (x.type === 'delivered') schedulePayReminder(x.orderId, x.title, x.amount);
  }
  if (N && N.seen) list.forEach(x => N.seen(x.id));
}
// a tappable banner at the top while the app is open
function banner(x) {
  const el = document.createElement('button');
  el.className = 'banner'; el.dataset.a = x.badge ? 'go' : 'openNote'; el.dataset.id = x.id; if (x.badge) el.dataset.v = 'profile';
  el.innerHTML = `${ICON.bell}<span><b>${esc(x.title)}</b><span class="sub">${esc(x.body || '')}</span></span>`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('out'), 4500);
  setTimeout(() => el.remove(), 5000);
}
function schedulePayReminder(orderId, title, amount) {
  if (!N || !N.schedule || !orderId) return;
  const o = S.joinedOrders[orderId] || (S.order && S.order.id === orderId ? S.order : null);
  N.schedule('pay-' + orderId, Date.now() + 24 * 36e5, `Reminder: pay for ${o ? o.place : 'your order'}`, amount ? `You still owe ${money(amount, o && o.currency)}. Tap to pay and mark it as paid.` : 'Tap to see what you owe.', orderId);
}
// alarms on the phone for each open order you're in: 10 minutes before it locks, and when it locks
function scheduleDeadlines() {
  if (!N || !N.schedule || !S.user) return;
  const orders = [...S.hosted, ...Object.values(S.joinedOrders)].filter(o => o && !o.gone && o.id);
  for (const o of orders) {
    const host = isHostOf(o, S.user.uid), future = o.lockAt && o.lockAt > Date.now() && o.open && !delivered(o);
    if (future && o.lockAt - 10 * 60000 > Date.now()) N.schedule('dl10-' + o.id, o.lockAt - 10 * 60000, `${o.place} locks in 10 minutes`, host ? 'Check that everyone added their food.' : 'Add or check your food before it locks.', o.id);
    else N.cancel('dl10-' + o.id);
    if (future) N.schedule('dl-' + o.id, o.lockAt, `${o.place} is now locked`, host ? 'Time to order from the restaurant. Your full list is in the Delivery Checklist.' : 'The deadline passed, so food can\'t be changed now.', o.id);
    else N.cancel('dl-' + o.id);
  }
}
function viewInbox() {
  const items = S.inbox;
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : fmtDate(t); };
  return `<div class="page no-nav"><div class="head">${backBtn()}<div class="grow"><h1>Notifications</h1></div>
      ${unreadCount() ? `<button class="btn sm ghost" data-a="readAll">Mark all read</button>` : ''}</div>
    ${N ? '' : `<p class="hint">On iPhone, notifications show here and as a banner while Lamma is open.</p>`}
    ${items.length ? `<div class="card flush">${items.map(x => `<div class="list-row tap note-row ${x.read ? '' : 'unread'}" data-a="openNote" data-id="${x.id}">
        ${avatar(x.from, x.fromName)}
        <div class="grow"><div class="t2">${esc(x.title)}</div><div class="sub">${esc(x.body || '')}</div><div class="sub small">${ago(x.at)}</div></div>
        ${x.read ? '' : '<span class="unread-dot"></span>'}</div>`).join('')}</div>`
      : `<div class="empty">No notifications yet. You'll see here when people join your orders, when an order locks or is delivered, and payment reminders.</div>`}
  </div>`;
}
function watchInbox(uid) {
  subs.global.push(FB.onSnapshot(FB.query(C('users', uid, 'inbox'), FB.orderBy('at', 'desc'), FB.limit(40)),
    s => onInbox(s.docs.map(d => ({ id: d.id, ...d.data() }))), e => console.warn('inbox', e)));
  // the Android app checks the inbox in the background with this sign-in
  if (N && N.setAuth && auth.currentUser) N.setAuth(auth.currentUser.refreshToken || '', uid, CFG.firebase.apiKey, CFG.firebase.projectId, CFG.emulator ? 1 : 0);
}

/* ---------------- deep links & back button ---------------- */
function handleLink(url) {
  const u = String(url || '');
  const tok = (u.match(/[?&#]t=([^&#]+)/) || [])[1];
  if (tok && /auth/.test(u)) { googleToken(decodeURIComponent(tok)); return; }
  const oid = (u.match(/^lamma:\/\/order\?o=([A-Za-z0-9]+)/) || [])[1];
  if (oid) { if (S.user) { closeSheet(); openOrder(oid); } else S.pendingOrder = oid; return; }
  const code = (u.match(/[?&]c=([A-Za-z0-9]{6})/) || [])[1];
  if (code) { if (S.user) joinByCode(code); else { S.pendingCode = code.toUpperCase(); toast('Sign in to join the order'); } }
}
window.lammaLink = handleLink;
window.lammaBack = () => {
  if ($('.dialog-bg')) { $('.dialog-bg').close(); return true; }
  if ($('.viewer')) { $('.viewer').remove(); return true; }
  if ($('.game')) { $('#g-close').click(); return true; }
  if ($('#sheet-root').firstChild) { closeSheet(); return true; }
  if (S.view === 'order' && S.screen !== 'details') { showScreen('details'); return true; }
  if (S.view === 'search') { closeSearch(); return true; }
  if (['order', 'menus', 'settings', 'inbox', 'profile'].includes(S.view)) { goHome(); return true; }
  return false;
};

/* In the browser (iPhone), the back button / back swipe moves back inside Lamma instead of leaving it:
   one extra history entry sits on top, and each back press is caught and turned into an in-app back. */
const WEB = !N;
const remember = () => { if (WEB) try { history.replaceState(history.state, '', S.view === 'order' && S.order ? `#o=${S.order.id}` : location.pathname + location.search); } catch (e) { } };
if (WEB) {
  try { if (!history.state || !history.state.lammaTop) { history.replaceState({ lammaBase: 1 }, ''); history.pushState({ lammaTop: 1 }, ''); } } catch (e) { }
  window.addEventListener('popstate', () => {
    if (window.lammaBack()) { try { history.pushState({ lammaTop: 1 }, ''); } catch (e) { } remember(); }
    else history.back();
  });
}
const savedOrder = () => (location.hash.match(/^#o=([A-Za-z0-9]+)/) || [])[1];

/* ---------------- navigation ---------------- */
function goHome() { stop('order'); S.view = 'home'; S.order = null; S.people = []; S.me = null; render(); remember(); window.scrollTo(0, 0); }
function showScreen(k) { S.screen = k; if (k !== 'prices') S.delivering = false; render(); window.scrollTo(0, 0); }
const sortPeople = (docs, uid) => docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.id === uid) - (a.id === uid) || ts(a.joinedAt) - ts(b.joinedAt));
let lockTimer = null;
function openOrder(id) {
  stop('order');
  Object.assign(S, { view: 'order', order: null, people: [], me: null, orderMissing: false, screen: 'details', delivering: false, avatars: {} });
  render();
  const uid = S.user.uid;
  let child = false;
  subs.order.push(FB.onSnapshot(D('orders', id), s => {
    if (!s.exists()) { S.orderMissing = true; S.order = null; render(); return; }
    const first = !S.order;
    S.orderMissing = false;
    S.order = { id: s.id, ...s.data() };
    if (first) remember();
    // redraw the moment the deadline passes
    clearTimeout(lockTimer);
    const o = S.order;
    if (o.lockAt && o.lockAt > Date.now() && o.lockAt - Date.now() < 864e5) lockTimer = setTimeout(renderOrderKeepScroll, o.lockAt - Date.now() + 300);
    if (!child) {
      child = true;
      let games = false;
      const onPeople = ps => {
        S.people = sortPeople(ps.docs, uid);
        S.me = S.people.find(p => p.id === uid) || null;
        renderOrderKeepScroll();
        countMembers();
        if (!games && (S.me || isHost())) { games = true; watchGames(id, uid); }
      };
      if (o.hostUid === uid) subs.order.push(FB.onSnapshot(C('orders', id, 'people'), onPeople));
      else {
        // only people in the order may read it; anyone else sees "Join this order"
        subs.order.push(FB.onSnapshot(C('orders', id, 'people'), onPeople, () => { S.people = []; S.me = null; renderOrderKeepScroll(); }));
      }
    }
    if (S.loadGuesses && delivered(o)) S.loadGuesses();
    renderOrderKeepScroll();
  }, e => { console.warn('order listener', e && e.code, e && e.message); S.orderMissing = true; render(); }));
  window.scrollTo(0, 0);
}
// mini game scores and Guess the Check for the open order
let guessesSub = null;
function watchGames(id, uid) {
  Object.assign(S, { scores: [], myGuess: null, guesses: [] });
  subs.order.push(FB.onSnapshot(C('orders', id, 'scores'), s => {
    S.scores = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.best - a.best || a.at - b.at);
    renderOrderKeepScroll();
  }, () => { }));
  subs.order.push(FB.onSnapshot(D('orders', id, 'guesses', uid), s => { S.myGuess = s.exists() ? s.data() : null; renderOrderKeepScroll(); }, () => { }));
  // everyone's guesses can be read once the order is delivered
  subs.order.push(() => { if (guessesSub) guessesSub(); guessesSub = null; });
  const loadGuesses = () => {
    if (guessesSub || !S.order || !delivered(S.order)) return;
    guessesSub = FB.onSnapshot(C('orders', id, 'guesses'), s => { S.guesses = s.docs.map(d => ({ id: d.id, ...d.data() })); renderOrderKeepScroll(); }, () => { guessesSub = null; });
  };
  loadGuesses();
  S.loadGuesses = loadGuesses;
}
function renderOrderKeepScroll() {
  if (S.view !== 'order') return;
  const a = document.activeElement;
  // don't rebuild the page while the host is typing a price
  if (a && a.dataset && a.dataset.f && $('#app').contains(a)) { refreshPrices(); return; }
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
}
// the main host and the co-hosts they promoted run the order together
const hostsOf = o => [o.hostUid, ...(o.coHosts || [])];
const isHostOf = (o, uid) => !!o && hostsOf(o).includes(uid);
const isHost = () => !!(S.order && S.user && isHostOf(S.order, S.user.uid));
const isMainHost = () => !!(S.order && S.user && S.order.hostUid === S.user.uid);
const hostNames = o => [o.hostName, ...(S.people.filter(p => (o.coHosts || []).includes(p.id)).map(p => p.name))].filter(Boolean);
// the host's phone keeps the member count on the order so it shows on everyone's home screen
function countMembers() {
  const o = S.order;
  if (!o || !isHost()) return;
  if (o.memberCount !== S.people.length) FB.updateDoc(D('orders', o.id), { memberCount: S.people.length }).catch(() => { });
}
setInterval(() => {
  if (S.view === 'order' && S.order && S.order.lockAt && !locked(S.order)) renderOrderKeepScroll();
  else if (S.view === 'home' && !$('#sheet-root').firstChild) render();
}, 30000);

/* ---------------- render ---------------- */
function render() {
  const el = $('#app');
  if (S.view === 'loading') el.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  else if (S.view === 'auth') el.innerHTML = viewAuth();
  else if (S.view === 'order') el.innerHTML = viewOrder();
  else if (S.view === 'menus') el.innerHTML = viewMenus();
  else if (S.view === 'settings') el.innerHTML = viewSettings();
  else if (S.view === 'inbox') el.innerHTML = viewInbox();
  else if (S.view === 'profile') el.innerHTML = viewProfile();
  else if (S.view === 'search') { el.innerHTML = viewSearch(); bindSearch(); }
  else el.innerHTML = viewHome();
}
const backBtn = (a = 'home') => `<button class="icon-btn" data-a="${a}" aria-label="Back">${ICON.back}</button>`;

function viewAuth() {
  const up = S.authMode === 'signup';
  return `<div class="page no-nav">
    <div class="auth-logo"><img src="logo.svg" alt=""><h1 class="ar-name">لمَّة</h1><p class="sub">Order food together and split the bill.</p></div>
    <div class="seg" style="margin-bottom:18px"><button class="${up ? '' : 'on'}" data-a="authMode" data-v="signin">Sign in</button><button class="${up ? 'on' : ''}" data-a="authMode" data-v="signup">Create account</button></div>
    ${up ? `<div class="field"><label>Your name</label><input class="inp" id="au-name" placeholder="How friends will see you" autocomplete="name"></div>` : ''}
    <div class="field"><label>Username</label><input class="inp" id="au-user" autocapitalize="none" autocomplete="username" spellcheck="false"></div>
    <div class="field"><label>Password</label><input class="inp" id="au-pass" type="password" autocomplete="${up ? 'new-password' : 'current-password'}"></div>
    <div class="err" id="au-err"></div>
    <button class="btn primary block" id="au-go" data-a="doAuth">${up ? 'Create account' : 'Sign in'}</button>
    <div class="or">or</div>
    <button class="btn block" data-a="google">${ICON.google} Continue with Google</button>
  </div>`;
}

/* ----- home ----- */
function orderCard(o) {
  const count = o.memberCount || 1;
  return `<div class="ocard tap" data-a="openOrder" data-id="${o.id}">
    <div class="ocard-top"><div class="t" dir="auto">${esc(o.place || 'Order')}</div><div class="badges">${statusBadges(o)}</div></div>
    ${o.description ? `<p class="desc" dir="auto">${esc(o.description)}</p>` : ''}
    <div class="meta"><span>${ICON.users} Hosted by ${esc(o.hostUid === S.user.uid ? 'you' : o.hostName || 'a friend')}${(o.coHosts || []).includes(S.user.uid) ? ' and you' : (o.coHosts || []).length ? ` +${o.coHosts.length}` : ''}</span><span>${fmtDate(ts(o.createdAt))}</span></div>
    <div class="meta"><span>${ICON.users} ${plural(count, 'member')}</span>${o.lockAt && !locked(o) ? `<span>Closes in ${timeLeft(o.lockAt)}</span>` : ''}</div>
  </div>`;
}
function viewHome() {
  setTimeout(checkBadges, 0);
  const mine = S.homeTab === 'mine';
  const all = S.joined.map(j => S.joinedOrders[j.id] || { id: j.id, place: j.place, hostName: j.hostName, createdAt: j.joinedAt }).filter(o => !o.gone);
  const cohosted = all.filter(o => (o.coHosts || []).includes(S.user.uid));
  const joined = all.filter(o => !cohosted.includes(o));
  const list = mine ? joined : [...S.hosted, ...cohosted].sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
  return `<div class="app-head">
      <div class="brand grow"><img src="logo.svg" alt=""><div><h1 class="ar-name">لمَّة</h1><div class="sub">${mine ? 'My Orders' : 'Hosted Orders'}</div></div></div>
      <button class="icon-btn" data-a="search" aria-label="Search">${ICON.search}</button>
      <button class="icon-btn" data-a="reload" aria-label="Refresh">${ICON.reload}</button>
      <button class="icon-btn bell" data-a="go" data-v="inbox" aria-label="Notifications">${ICON.bell}${unreadCount() ? `<span class="dot-count">${unreadCount() > 9 ? '9+' : unreadCount()}</span>` : ''}</button>
      <button class="icon-btn" data-a="go" data-v="profile" aria-label="My profile">${avatar(S.user.uid, (S.profile || {}).name, 'sm')}</button>
      <button class="icon-btn" data-a="homeMenu" aria-label="More">${ICON.more}</button>
    </div>
    <div class="htabs"><button class="${mine ? 'on' : ''}" data-a="homeTab" data-v="mine">My Orders</button><button class="${mine ? '' : 'on'}" data-a="homeTab" data-v="hosted">Hosted Orders</button></div>
    <div class="page">
      ${list.length ? list.map(orderCard).join('') : `<div class="empty-big">${mine
        ? `<b>No orders yet</b><p class="sub">When a friend sends you an invite link or code, the order shows up here.</p><button class="btn primary" data-a="joinSheet">${ICON.userPlus} Join an order</button>`
        : `<b>You're not hosting any order</b><p class="sub">Start one, share the code, and everyone adds their own food.</p><button class="btn primary" data-a="newOrder">${ICON.plus} Host an order</button>`}</div>`}
    </div>
    <button class="fab" data-a="newOrder" aria-label="Host an order">${ICON.plus}</button>
    <nav class="nav">
      <button class="on" data-a="homeTab" data-v="mine">${ICON.list}My Orders</button>
      <button data-a="newOrder">${ICON.plusCircle}Host</button>
      <button data-a="joinSheet">${ICON.userPlus}Join</button>
    </nav>`;
}
const HELP = `<ol class="steps" style="margin-top:12px">
  <li><b>Host an order</b><span class="sub">Pick the restaurant, add its menu link, location or photos, and an optional deadline.</span></li>
  <li><b>Friends join</b><span class="sub">Send the link or the group code. Each person adds their own food with its price.</span></li>
  <li><b>Lock and order</b><span class="sub">Lock the order (or let the deadline lock it), then order everything from the combined list.</span></li>
  <li><b>Deliver and get paid</b><span class="sub">Check the prices, add VAT, service and delivery, and everyone sees exactly what they owe.</span></li>
</ol>`;
function viewMenus() {
  return `<div class="page no-nav"><div class="head">${backBtn()}<div class="grow"><h1>Saved menus</h1><div class="sub">Restaurants ready for your next order.</div></div></div>
    <button class="btn primary block" data-a="menuSheet">${ICON.plus} Add a menu</button>
    ${S.menus.length ? `<div class="card flush" style="margin-top:14px">${S.menus.map(m => `<div class="list-row tap" data-a="menuSheet" data-id="${m.id}">
        ${m.cover ? `<img class="thumb" src="${m.cover}" alt="">` : `<div class="thumb">${ICON.photo}</div>`}
        <div class="grow"><div class="t">${esc(m.name)}</div><div class="sub">${[m.photoCount ? plural(m.photoCount, 'photo') : '', m.website ? 'website' : '', m.maps ? 'location' : ''].filter(Boolean).join(' · ') || 'No details yet'}</div></div>
        <span class="chev">${ICON.chev}</span></div>`).join('')}</div>`
      : `<div class="empty">No saved menus yet. Menus you add when you host an order are saved here too.</div>`}</div>`;
}
function viewSettings() {
  const p = S.profile || {};
  const t = themeSetting();
  return `<div class="page no-nav"><div class="head">${backBtn()}<div class="grow"><h1>Settings</h1></div></div>
    <div class="card">
      <div class="field"><label>Your name</label><input class="inp" id="st-name" value="${esc(p.name)}" maxlength="30"></div>
      <div class="field"><label>Payment link or InstaPay address <span class="opt">(optional)</span></label><input class="inp" id="st-ip" value="${esc(p.instapay)}" placeholder="name@instapay or https://ipn.eg/…"><p class="hint" style="margin:6px 2px 0">Filled in for you when you mark an order as delivered.</p></div>
      <button class="btn primary block" data-a="saveSettings">Save</button>
    </div>
    <div class="card"><div class="row"><div style="flex:1"><b style="font-size:15px">Notifications</b><div class="sub">${N ? (N.notifyAllowed && !N.notifyAllowed() ? 'Turned off for Lamma on this phone.' : 'On. You get them even when Lamma is closed (checked about every 15 minutes).') : 'On iPhone they show inside Lamma: the bell on the home screen and a banner while the app is open.'}</div></div>
      ${N && N.openNotifySettings ? `<button class="btn sm" style="flex:none" data-a="notifySettings">${N.notifyAllowed && !N.notifyAllowed() ? 'Turn on' : 'Settings'}</button>` : ''}</div></div>
    <div class="card"><div class="field" style="margin:0"><label>Appearance</label><div class="seg">
      ${[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([k, l]) => `<button class="${t === k ? 'on' : ''}" data-a="theme" data-v="${k}">${l}</button>`).join('')}</div></div></div>
    ${(() => {
      const prov = ((auth.currentUser && auth.currentUser.providerData) || []).map(x => x.providerId);
      const g = prov.includes('google.com'), pw = prov.includes('password');
      return `<div class="card"><b style="font-size:15px">Sign-in methods</b>
        <div class="money" style="margin-top:6px"><span>Username and password</span><b>${pw ? 'On' : 'Off'}</b></div>
        <div class="money"><span>Google${g ? ` (${esc((auth.currentUser.providerData.find(x => x.providerId === 'google.com') || {}).email || '')})` : ''}</span><b>${g ? 'Connected' : 'Not connected'}</b></div>
        ${g ? '' : `<button class="btn block" style="margin-top:10px" data-a="linkGoogle">${ICON.google} Connect Google</button><p class="hint" style="margin:6px 2px 0">Adds Google sign-in to this account. Your orders, menus and badges stay exactly as they are.</p>`}</div>`;
    })()}
    <div class="card flush">
      <div class="list-row"><div class="grow"><div class="t">Signed in as</div><div class="sub">${esc(p.username ? '@' + p.username : (S.user && S.user.email) || '')}</div></div></div>
      <div class="list-row tap" data-a="signOut"><div class="grow t" style="color:var(--danger)">Sign out</div></div>
    </div>
    <p class="sub" style="text-align:center;margin-top:16px">Lamma ${VERSION}</p></div>`;
}

/* ----- order ----- */
function viewOrder() {
  if (S.orderMissing) return `<div class="page no-nav"><div class="head">${backBtn()}<div class="grow"><h1>Order Details</h1></div></div><div class="empty">This order isn't available anymore. The host may have deleted it.</div></div>`;
  const o = S.order;
  if (!o) return `<div class="page no-nav"><div class="head">${backBtn()}<div class="grow"><h1>Order Details</h1></div></div><div class="loading"><div class="spinner"></div></div></div>`;
  if (S.screen === 'checklist' && isHost()) return viewChecklist(o);
  if (S.screen === 'prices' && isHost()) return viewPrices(o);
  return viewDetails(o);
}
function linksRow(o) {
  const b = [];
  if (o.website) b.push(`<button class="btn" data-a="url" data-v="${esc(o.website)}">${ICON.link} Menu</button>`);
  if (o.maps) b.push(`<button class="btn" data-a="url" data-v="${esc(o.maps)}">${ICON.map} Location</button>`);
  if (o.menuId && o.photoCount) b.push(`<button class="btn" data-a="photos" data-id="${o.menuId}">${ICON.photo} Photos (${o.photoCount})</button>`);
  return b.length ? `<div class="links">${b.join('')}</div>` : '';
}
function lockLine(o) {
  if (delivered(o)) return `<div class="lock-line">${ICON.truck} Delivered${o.deliveredAt ? ` ${fmtWhen(o.deliveredAt)}` : ''}. Check what you owe below.</div>`;
  if (!o.open) return `<div class="lock-line">${ICON.lock} The host locked this order. Food can't be added or changed.</div>`;
  if (deadlinePassed(o)) return `<div class="lock-line">${ICON.lock} Locked automatically ${fmtWhen(o.lockAt)}. Food can't be added or changed.</div>`;
  if (o.lockAt) return `<div class="lock-line warn">${ICON.clock} Add your food before ${fmtWhen(o.lockAt)} (${timeLeft(o.lockAt)} left).</div>`;
  return '';
}
function viewDetails(o) {
  const host = isHost(), me = S.me, lk = locked(o);
  const canEditMine = !!me && (host || !lk);
  const bill = computeBill(o, S.people);
  const r = me && bill.rows.find(x => x.p.id === me.id);
  const appOthers = S.people.filter(p => p.id !== (me && me.id) && !p.noApp);
  const offline = S.people.filter(p => p.noApp);
  const count = S.people.length || o.memberCount || 1;
  return `<div class="page no-nav">
    <div class="head">${backBtn()}<div class="grow"><h1 class="h-sm">Order Details</h1></div>
      <button class="icon-btn" data-a="search" aria-label="Search">${ICON.search}</button>
      <button class="icon-btn" data-a="reload" aria-label="Refresh">${ICON.reload}</button>
      ${host ? `<button class="icon-btn" data-a="shareInvite" aria-label="Share invite">${ICON.share}</button>` : ''}
      <button class="icon-btn" data-a="orderMenu" aria-label="More">${ICON.more}</button></div>
    ${!lk && me ? `<div class="tip">${ICON.bulb}<span>Item already listed by someone? Tap “Add to my items” on it instead of typing it again.</span></div>` : ''}
    <h2 class="o-title" dir="auto">${esc(o.place)}</h2>
    <div class="badges">${statusBadges(o)}</div>
    ${o.description ? `<p class="desc" dir="auto">${esc(o.description)}</p>` : ''}
    ${lockLine(o)}
    <div class="info-grid">
      <div><div class="k">Hosted by</div><div class="v">${hostNames(o).map(n => esc(n)).join(', ')}${isMainHost() ? ' (you)' : ''}</div></div>
      <div><div class="k">Members</div><div class="v">${plural(count, 'member')}</div></div>
      <div><div class="k">Date</div><div class="v">${fmtDate(ts(o.createdAt))}</div></div>
      <div><div class="k">Group Code</div><div class="v code-v">${esc(o.code)} <button class="mini" data-a="copyCode" aria-label="Copy code">${ICON.copy}</button></div></div>
    </div>
    ${linksRow(o)}
    ${!me ? `<div class="card" style="margin-top:16px"><b>You're not in this order.</b><p class="sub">Join it to add your food.</p>${lk ? '<p class="sub" style="margin-top:6px">This order is locked, so new people can\'t join.</p>' : `<button class="btn primary block" style="margin-top:12px" data-a="joinThis">Join this order</button>`}</div></div>` : `
    ${!isMainHost() && delivered(o) && r && r.total > 0 ? paymentCard(o, r, me) : ''}
    <div class="sec-head"><h3>My Items</h3><span class="caps">${plural(sumQty(me.items || []), 'item')}</span></div>
    ${(me.items || []).length ? placedLine(o, me, r) : ''}
    ${(me.items || []).length ? me.items.map(it => itemCard(o, bill, me, it, canEditMine)).join('') : `<div class="empty-card">${canEditMine ? 'You haven\'t added anything yet. Check the menu, then tap “Add Item”, or tap “Add to my items” on a friend\'s food below.' : 'You didn\'t add any food to this order.'}</div>`}
    ${!isMainHost() && !delivered(o) && r && r.sub > 0 ? `<div class="so-far"><span>Your food so far</span><b>${money(r.sub, o.currency)}</b></div><p class="hint">VAT, service and your part of delivery are added when the host marks the order as delivered.</p>` : ''}
    ${host ? offlineCard(o, bill, offline) : ''}
    ${canEditMine ? `<button class="btn primary block big" data-a="itemSheet">${ICON.plus} Add Item</button>` : ''}
    ${host ? `<div class="row two"><button class="btn soft" data-a="screen" data-v="checklist">${ICON.checklist} DELIVERY CHECKLIST</button><button class="btn soft" data-a="exportCsv">${ICON.download} EXPORT EXCEL</button></div>
      <hr class="sep">
      ${delivered(o) ? `<button class="btn block big outline" data-a="screen" data-v="prices">${ICON.edit} Edit prices</button><button class="btn block big outline" data-a="shareBill">${ICON.share} Share the bill</button>`
          : `${lk ? `<button class="btn block big outline" data-a="unlock">${ICON.unlock} Unlock Order</button>` : `<button class="btn block big outline" data-a="lockSheet">${ICON.lock} Lock Order</button>`}
             <button class="btn primary block big" data-a="deliverSheet">${ICON.truck} Mark as Delivered</button>`}`
        : ''}
    <div class="sec-head" style="margin-top:26px"><h3>Who's in</h3><span class="caps">${S.people.length === 1 ? '1 person' : `${S.people.length} people`}</span></div>
    ${host && !appOthers.length ? `<div class="empty-card">Nobody joined yet. Share the invite link or the group code ${esc(o.code)}.<div class="row" style="margin-top:10px"><button class="btn sm primary" data-a="shareInvite">${ICON.share} Share invite</button><button class="btn sm" data-a="copyCode">${ICON.copy} Copy code</button></div></div>` : ''}
    ${host ? `<p class="hint">As a host you can change anyone's food, prices and notes. Tap ${ICON.edit.replace('<svg', '<svg width="14" height="14"')} on a person.</p>` : ''}
    ${[me, ...appOthers, ...offline].map(p => personCard(o, bill, p, !lk && p.id !== me.id)).join('')}
    ${gamesCard(o, bill)}
    ${!isMainHost() && !lk ? `<button class="btn block ghost danger" style="margin-top:8px" data-a="leaveOrder">Leave this order</button>` : ''}
    </div>`}`;
}
// tells you your food is in the order and who can see it
function placedLine(o, me, r) {
  const n = sumQty(me.items || []);
  const when = delivered(o) ? 'The order was delivered.' : locked(o) ? 'The order is locked, so it can\'t change now.'
    : o.lockAt ? `You can change it until ${fmtWhen(o.lockAt)}.` : 'You can change it until the host locks the order.';
  return `<div class="placed">${ICON.checkCircle}<div><b>Your order is placed</b><div class="sub">${plural(n, 'item')}${r && r.sub > 0 ? ` · ${money(r.sub, o.currency)}` : ''}. ${o.hostUid === S.user.uid ? 'Everyone in the order can see it.' : `${esc(o.hostName)} and everyone in the order can see it.`} ${when}</div></div></div>`;
}
function sheetPlaced(name) {
  const o = S.order, me = S.me;
  openSheet(`<div class="placed-big">${ICON.checkCircle}<h2>Order placed</h2>
    <p class="sub"><b dir="auto">${esc(name)}</b> is in your order${me ? ` (${plural(sumQty(me.items || []), 'item')} now)` : ''}. ${o.hostUid === S.user.uid ? 'Everyone in the order can see it.' : `${esc(o.hostName)} can see it in the order.`}</p></div>
    <button class="btn primary block" data-a="closeSheet">Done</button>
    ${!locked(o) ? `<button class="btn block ghost" style="margin-top:6px" data-a="itemSheet">${ICON.plus} Add another item</button>` : ''}`);
}
/* ---------------- games ---------------- */
function gamesCard(o, bill) {
  const uid = S.user.uid, res = o.results || {}, done = delivered(o);
  const myBest = (S.scores.find(x => x.id === uid) || {}).best || 0;
  const board = S.scores.slice(0, 5);
  const hostSide = isHost();
  let guess;
  if (done && res.guessTotal != null) {
    const ranked = S.guesses.map(g => ({ ...g, diff: Math.abs(g.guess - res.guessTotal) })).sort((a, b) => a.diff - b.diff);
    guess = `<p class="sub">The real total was <b>${money(res.guessTotal, o.currency)}</b>.</p>
      ${ranked.length ? `<div class="board">${ranked.map((g, i) => `<div class="board-row ${g.id === uid ? 'me' : ''}"><span class="rank">${i === 0 ? '🎯' : i + 1}</span><span class="grow">${esc(g.name)}</span><span class="sub">${money(g.guess, o.currency)}</span><b>${g.diff < 0.005 ? 'exact!' : '±' + money(g.diff, o.currency).replace(/^\S+ /, '')}</b></div>`).join('')}</div>`
        : '<p class="sub">Nobody guessed this time.</p>'}`;
  } else if (done) {
    guess = '<p class="sub">This order was delivered before the game started.</p>';
  } else if (hostSide) {
    guess = `<p class="sub">Friends guess the final total. When you confirm the prices and deliver, the closest guess wins 🎯. Hosts don't play, since they know the prices.</p>`;
  } else {
    guess = `<p class="sub">Guess the final total of the whole order, with VAT, service and delivery. The closest guess to the host's confirmed total wins 🎯.</p>
      <div class="row" style="margin-top:10px"><div class="inp-icon" style="margin:0;flex:1"><span>${esc(o.currency)}</span><input class="inp" id="guess-v" inputmode="decimal" placeholder="Your guess" value="${S.myGuess ? S.myGuess.guess : ''}"></div>
      <button class="btn primary" style="flex:none" data-a="saveGuess">${S.myGuess ? 'Change' : 'Guess'}</button></div>
      ${S.myGuess ? `<p class="hint" style="margin:8px 2px 0">Your guess: ${money(S.myGuess.guess, o.currency)}. Guesses are revealed when the order is delivered.</p>` : ''}`;
  }
  return `<div class="sec-head" style="margin-top:26px"><h3>Play while you wait</h3></div>
    <div class="game-card">
      <div class="gc-head"><span class="gc-icon">🛵</span><div class="grow"><b>Lamma Dash</b><div class="sub">${done ? (res.gameWinner ? `Champion: ${esc((S.scores.find(x => x.id === res.gameWinner) || {}).name || 'someone')} 🏆` : 'Game over for this order.') : 'Jump over the cones, grab the food. Top score when the order is delivered wins 🏆.'}</div></div>
        ${!done ? `<button class="btn primary sm" data-a="playDash">Play</button>` : ''}</div>
      ${board.length ? `<div class="board">${board.map((x, i) => `<div class="board-row ${x.id === uid ? 'me' : ''}"><span class="rank">${i === 0 ? (done ? '🏆' : '🥇') : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>${avatar(x.id, x.name, 'xs')}<span class="grow">${esc(x.name)}${x.id === uid ? ' (you)' : ''}</span><b>${x.best}</b></div>`).join('')}</div>`
        : `<p class="sub" style="margin-top:8px">No scores yet. Be the first!</p>`}
      ${myBest && !board.some(x => x.id === uid) ? `<p class="hint" style="margin:8px 2px 0">Your best: ${myBest}</p>` : ''}
    </div>
    <div class="game-card">
      <div class="gc-head"><span class="gc-icon">🧾</span><div class="grow"><b>Guess the Check</b></div></div>
      ${guess}
    </div>`;
}
// when the host delivers: top Dash score and closest guess win, saved on the order
async function decideWinners(o, total) {
  const results = { guessTotal: Math.round(total * 100) / 100 };
  try {
    const sc = (await FB.getDocs(C('orders', o.id, 'scores'))).docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.best - a.best || a.at - b.at);
    if (sc.length && sc[0].best > 0) { results.gameWinner = sc[0].id; results.gameBest = sc[0].best; }
    const gs = (await FB.getDocs(C('orders', o.id, 'guesses'))).docs.map(d => ({ id: d.id, ...d.data() }))
      .map(g => ({ ...g, diff: Math.abs(g.guess - total) })).sort((a, b) => a.diff - b.diff || a.at - b.at);
    if (gs.length) { results.guessWinner = gs[0].id; results.guessDiff = Math.round(gs[0].diff * 100) / 100; }
  } catch (e) { console.warn('winners', e); }
  await upd({ results });
  if (results.gameWinner) notifyUsers([results.gameWinner], { type: 'win', title: `🏆 You won Lamma Dash in ${o.place}`, body: `Top score: ${results.gameBest}. It's on your profile now.` });
  if (results.guessWinner) notifyUsers([results.guessWinner], { type: 'win', title: `🎯 You won Guess the Check in ${o.place}`, body: `The total was ${money(results.guessTotal, o.currency)}. Your guess was the closest.` });
}


/* ---------------- avatars ----------------
   users/{uid}.avatar is { photo: small JPEG data URL } or { e: emoji, c: color } or { c: color } for coloured initials.
   Other people's avatars are read from their user doc once and kept for the session. */
const AV_COLORS = ['#E8552D', '#F59E0B', '#16A34A', '#0EA5E9', '#6366F1', '#DB2777', '#0F766E', '#57534E'];
const AV_EMOJI = ['😀', '😎', '🤠', '🥳', '🤓', '😇', '🥷', '👻', '😺', '🐼', '🦊', '🐯', '🐸', '🦁', '🐵', '🐧', '🍔', '🍕', '🌮', '🍩', '🍣', '🌯', '☕', '🧋', '⚽', '🎮', '🚀', '👑'];
const avPending = new Set(); let avTimer = 0;
function avatarOf(uid) {
  if (S.user && uid === S.user.uid) return (S.profile || {}).avatar || null;
  return S.avatars[uid];
}
function wantAvatar(uid) {
  if (!uid || /^x_/.test(uid) || uid in S.avatars || avPending.has(uid)) return;
  avPending.add(uid); clearTimeout(avTimer); avTimer = setTimeout(loadAvatars, 40);
}
async function loadAvatars() {
  const ids = [...avPending]; avPending.clear();
  await Promise.all(ids.map(id => FB.getDoc(D('users', id)).then(d => { S.avatars[id] = d.exists() ? (d.data().avatar || null) : null; }).catch(() => { S.avatars[id] = null; })));
  if (ids.some(id => S.avatars[id])) rerenderKeep();
}
function rerenderKeep() {
  const a = document.activeElement;
  if (a && /INPUT|TEXTAREA/.test(a.tagName) && $('#app').contains(a)) return;
  if (S.view === 'order') return renderOrderKeepScroll();
  if (S.view === 'search') return;
  const y = window.scrollY; render(); window.scrollTo(0, y);
}
const safePhoto = u => typeof u === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u) ? u : '';
function avatar(uid, name, cls = '') {
  const a = avatarOf(uid);
  if (a === undefined) wantAvatar(uid);
  const col = a && AV_COLORS.includes(a.c) ? a.c : '';
  if (a && safePhoto(a.photo)) return `<div class="initial av ${cls}"><img src="${safePhoto(a.photo)}" alt=""></div>`;
  if (a && a.e && AV_EMOJI.includes(a.e)) return `<div class="initial av ${cls}" style="background:${col || 'var(--accent-soft)'}"><span class="av-e">${a.e}</span></div>`;
  return `<div class="initial ${cls}"${col ? ` style="background:${col};color:#fff"` : ''}>${esc(initials(name))}</div>`;
}
function sheetAvatar() {
  const cur = (S.profile || {}).avatar || {};
  S.avDraft = { photo: safePhoto(cur.photo), e: cur.e || '', c: cur.c || AV_COLORS[0] };
  openSheet(`<h2>Profile picture</h2><div id="av-prev" class="av-prev"></div>
    <div class="row" style="margin:14px 0 4px"><button class="btn" data-a="avPhoto">${ICON.camera} Upload photo</button><button class="btn" data-a="avPick" data-k="init">Use initials</button></div>
    <div class="sec-head" style="margin-top:14px"><h3>Or pick an emoji</h3></div>
    <div class="av-emoji">${AV_EMOJI.map(e => `<button data-a="avPick" data-k="e" data-v="${e}">${e}</button>`).join('')}</div>
    <div class="sec-head" style="margin-top:14px"><h3>Colour</h3></div>
    <div class="av-colors">${AV_COLORS.map(c => `<button data-a="avPick" data-k="c" data-v="${c}" style="background:${c}" aria-label="Colour"></button>`).join('')}</div>
    <button class="btn primary block" style="margin-top:18px" data-a="avSave">Save</button>`);
  avPreview();
}
function avPreview() {
  const d = S.avDraft, el = $('#av-prev'); if (!el) return;
  const a = d.photo ? { photo: d.photo } : d.e ? { e: d.e, c: d.c } : { c: d.c };
  const keep = S.profile.avatar; S.profile.avatar = a;
  el.innerHTML = avatar(S.user.uid, S.profile.name, 'big');
  S.profile.avatar = keep;
  document.querySelectorAll('.av-colors button').forEach(b => b.classList.toggle('on', b.dataset.v === d.c && !d.photo));
  document.querySelectorAll('.av-emoji button').forEach(b => b.classList.toggle('on', b.dataset.v === d.e && !d.photo));
}
// square-crop a picked photo and shrink it to 192px so it fits easily in the user doc
function photoToAvatar(file) {
  return new Promise((ok, bad) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const n = 192, c = document.createElement('canvas'); c.width = c.height = n;
      const k = Math.min(img.width, img.height), x = (img.width - k) / 2, y = (img.height - k) / 2;
      c.getContext('2d').drawImage(img, x, y, k, k, 0, 0, n, n);
      URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); bad(new Error('image')); };
    img.src = url;
  });
}


/* ---------------- search ----------------
   One box for everything: your orders, the food and people in them, saved menus, notifications, badges and settings.
   Food in other orders is loaded once (the 20 newest orders) when search opens. */
function openSearch() {
  S.searchFrom = S.view === 'order' && S.order ? S.order.id : null;
  if (S.view !== 'order') stop('order');
  S.view = 'search'; render(); window.scrollTo(0, 0);
  loadSearchPeople();
}
function closeSearch() { if (S.searchFrom) openOrder(S.searchFrom); else goHome(); }
function searchOrders() {
  const joined = S.joined.map(j => S.joinedOrders[j.id] || { id: j.id, place: j.place, hostName: j.hostName, createdAt: j.joinedAt }).filter(o => !o.gone);
  const seen = new Set();
  return [...S.hosted, ...joined].filter(o => !seen.has(o.id) && seen.add(o.id)).sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
}
async function loadSearchPeople() {
  if (S.searchPeople) return;
  S.searchPeople = {};
  const list = searchOrders().slice(0, 20);
  await Promise.all(list.map(o => FB.getDocs(C('orders', o.id, 'people')).then(q => { S.searchPeople[o.id] = q.docs.map(d => ({ id: d.id, ...d.data() })); }).catch(() => { })));
  if (S.view === 'search') $('#sres').innerHTML = searchResults(S.q);
}
const SEARCH_PAGES = [
  ['Settings', 'name payment instapay link dark mode theme light', 'go', 'settings', '⚙️'],
  ['Dark mode', 'theme night light appearance', 'go', 'settings', '🌙'],
  ['Connect Google', 'google sign in account link email', 'go', 'settings', '🔗'],
  ['My profile and badges', 'achievements avatar picture photo stats', 'go', 'profile', '🏅'],
  ['Notifications', 'inbox alerts bell', 'go', 'inbox', '🔔'],
  ['Saved menus', 'restaurants menu photos', 'go', 'menus', '📖'],
  ['Host an order', 'new create start', 'newOrder', '', '➕'],
  ['Join an order', 'code invite link', 'joinSheet', '', '🎟️'],
  ['How Lamma works', 'help guide', 'helpSheet', '', '❓'],
];
function viewSearch() {
  return `<div class="page no-nav"><div class="head">${backBtn('closeSearch')}<div class="search-box grow">${ICON.search}<input class="inp" id="sq" type="search" dir="auto" placeholder="Search orders, food, people…" autocomplete="off" value="${esc(S.q)}"></div></div>
    <div id="sres">${searchResults(S.q)}</div></div>`;
}
function bindSearch() {
  const i = $('#sq'); if (!i) return;
  i.oninput = () => { S.q = i.value; $('#sres').innerHTML = searchResults(S.q); };
  setTimeout(() => i.focus(), 50);
}
function searchResults(q) {
  const n = F.normalize(q);
  if (!n) return `<div class="empty">Type to search your orders, the food and people in them, saved menus, notifications, badges and settings.</div>`;
  const has = (...t) => t.some(x => x && F.normalize(x).includes(n));
  const row = (icon, title, sub, a, extra = '') => `<div class="list-row tap" data-a="${a}" ${extra}><span class="s-ic">${icon}</span><div class="grow" style="min-width:0"><div class="t" dir="auto">${esc(title)}</div>${sub ? `<div class="sub" dir="auto">${esc(sub)}</div>` : ''}</div>${ICON.chev}</div>`;
  const sec = (h, rows) => rows.length ? `<div class="sec-head" style="margin-top:18px"><h3>${h}</h3><span class="caps">${rows.length}</span></div><div class="card flush">${rows.slice(0, 12).join('')}</div>` : '';
  const orders = searchOrders();
  const oRows = orders.filter(o => has(o.place, o.description, o.hostName, o.code)).map(o => row('🧾', o.place || 'Order', `${o.hostUid === S.user.uid ? 'Hosted by you' : 'Hosted by ' + (o.hostName || 'a friend')} · ${fmtDate(ts(o.createdAt))}`, 'openOrder', `data-id="${o.id}"`));
  const food = [], people = [];
  const pool = { ...(S.searchPeople || {}) };
  if (S.order && S.people.length) pool[S.order.id] = S.people;
  for (const [oid, ps] of Object.entries(pool)) {
    const o = orders.find(x => x.id === oid) || (S.order && S.order.id === oid ? S.order : {});
    for (const p of ps) {
      if (has(p.name)) people.push(row(avatar(p.uid || p.id, p.name, 'sm'), p.name, `In ${o.place || 'an order'}`, 'openOrder', `data-id="${oid}"`));
      for (const it of p.items || []) if (has(it.name, it.note, ...(it.extras || []).map(x => x.name)))
        food.push(row('🍴', `${qtyOf(it)} × ${it.name}`, `${p.name} · ${o.place || 'an order'}`, 'openOrder', `data-id="${oid}"`));
    }
  }
  const seenP = new Set(); const peopleU = people.filter(r => !seenP.has(r) && seenP.add(r));
  const mRows = S.menus.filter(m => has(m.place, m.name, m.web)).map(m => row('📖', m.place || m.name || 'Menu', 'Saved menu', 'go', 'data-v="menus"'));
  const nRows = S.inbox.filter(x => has(x.title, x.body, x.fromName)).map(x => row('🔔', x.title, x.body, 'openNote', `data-id="${x.id}"`));
  const st = myStats();
  const bRows = BADGES.filter(b => has(b[2], b[3], b[6])).map(b => row(b[1], b[2], `${b[3]}${b[4](st) >= b[5] ? ' · unlocked' : ''}`, 'go', 'data-v="profile"'));
  const pRows = SEARCH_PAGES.filter(x => has(x[0], x[1])).map(x => row(x[4], x[0], '', x[2], x[3] ? `data-v="${x[3]}"` : ''));
  const html = sec('Orders', oRows) + sec('Food', food) + sec('People', peopleU) + sec('Saved menus', mRows) + sec('Notifications', nRows) + sec('Badges', bRows) + sec('Settings and pages', pRows);
  return html || `<div class="empty">Nothing found for “${esc(q)}”.${S.searchPeople && !Object.keys(S.searchPeople).length ? '' : ''}</div>`;
}

/* ---------------- profile & achievements ---------------- */
function myStats() {
  const uid = S.user.uid;
  const joined = S.joined.map(j => S.joinedOrders[j.id]).filter(o => o && !o.gone);
  const all = [...S.hosted, ...joined];
  const hostedMain = S.hosted;
  const won = k => all.filter(o => (o.results || {})[k] === uid);
  const places = {};
  for (const o of all) { const k = F.normalize(o.place || ''); if (k) places[k] = (places[k] || 0) + 1; }
  const hours = all.map(o => new Date(ts(o.createdAt) || 0));
  // longest run of back-to-back weeks with at least one order
  const weeks = [...new Set(all.map(o => Math.floor((ts(o.createdAt) || 0) / 6048e5)))].sort((a, b) => a - b);
  let streak = 0, run = 0;
  weeks.forEach((w, i) => { run = i && w === weeks[i - 1] + 1 ? run + 1 : 1; streak = Math.max(streak, run); });
  return {
    joined: S.joined.length + S.hosted.length,
    completed: all.filter(delivered).length,
    hosted: hostedMain.length,
    hostedDone: hostedMain.filter(delivered).length,
    bigHost: Math.max(0, ...hostedMain.map(o => o.memberCount || 0)),
    guests: hostedMain.reduce((a, o) => a + Math.max(0, (o.memberCount || 1) - 1), 0),
    places: Object.keys(places).length,
    loyal: Math.max(0, ...Object.values(places)),
    night: hours.filter(d => d.getHours() >= 22 || d.getHours() < 4).length,
    early: hours.filter(d => d.getHours() >= 5 && d.getHours() < 10).length,
    weekend: hours.filter(d => d.getDay() === 5 || d.getDay() === 6).length,
    streak,
    dashWins: won('gameWinner').length,
    dashBest: Math.max(num((S.profile || {}).dashBest), ...won('gameWinner').map(o => o.results.gameBest || 0)),
    guessWins: won('guessWinner').length,
    bullseye: won('guessWinner').filter(o => (o.results.guessDiff || 0) <= (o.results.guessTotal || 0) * 0.01).length,
  };
}
/* Badge tracks: each step is [key, icon, name, goal]. The tier (bronze → silver → gold → diamond → legend)
   follows how far along the track a badge is. Old keys are kept so nobody loses a badge. */
const TRACKS = [
  ['Orders', 'joined', n => `Be in ${n === 1 ? 'your first order' : n + ' orders'}`, [
    ['first', '🍽️', 'First Bite', 1], ['regular', '🥡', 'Regular', 5], ['foodie', '🍱', 'Foodie', 10], ['legend', '👑', 'Lamma Legend', 25],
    ['o50', '🥈', 'Half Century', 50], ['o100', '💯', 'Centurion', 100], ['o250', '🍖', 'Feast Master', 250], ['o500', '🦾', 'Food Titan', 500], ['o1000', '🌟', 'Lamma Immortal', 1000]]],
  ['Delivered', 'completed', n => `Finish ${n} delivered orders`, [
    ['done5', '✅', 'Clean Plate', 5], ['done25', '😋', 'Happy Tummy', 25], ['done100', '🍲', 'Never Hungry', 100], ['done500', '🕳️', 'Bottomless', 500]]],
  ['Hosting', 'hosted', n => `Host ${n === 1 ? 'your first order' : n + ' orders'}`, [
    ['host1', '🎉', 'First Host', 1], ['host5', '🧑‍🍳', 'Party Planner', 5], ['host10', '🏟️', 'Big Host', 10], ['host25', '👨‍🍳', 'Head Chef', 25],
    ['host50', '🎩', 'Lamma Boss', 50], ['host100', '🏛️', 'Host Legend', 100], ['host250', '💼', 'Lunch Tycoon', 250], ['host500', '🏆', 'Hall of Fame', 500]]],
  ['Hosting', 'bigHost', n => `Host an order with ${n} or more people`, [
    ['crowd', '👥', 'Crowd Puller', 8], ['crowd15', '🎪', 'Full House', 15], ['crowd30', '🏟️', 'Stadium', 30]]],
  ['Hosting', 'guests', n => `Feed ${n} guests in total as host`, [
    ['feed25', '🍛', 'Generous', 25], ['feed100', '🤲', 'Big Heart', 100], ['feed500', '🫶', 'City Feeder', 500], ['feed1000', '🌍', 'Feeds the World', 1000]]],
  ['Explorer', 'places', n => `Order from ${n} different places`, [
    ['place3', '🧭', 'Explorer', 3], ['place10', '🗺️', 'Food Tourist', 10], ['place25', '🔎', 'Taste Hunter', 25], ['place50', '✈️', 'Globetrotter', 50]]],
  ['Explorer', 'loyal', n => `Order from the same place ${n} times`, [
    ['loyal10', '❤️', 'Loyal Customer', 10], ['loyal50', '💍', 'Married to the Menu', 50]]],
  ['Habits', 'night', n => n === 1 ? 'Be in an order started after 10 pm' : `${n} orders started after 10 pm`, [['night1', '🦉', 'Night Owl', 1], ['night10', '🌙', 'Midnight Muncher', 10], ['night50', '🧛', 'Vampire Diner', 50]]],
  ['Habits', 'early', n => n === 1 ? 'Be in an order started before 10 am' : `${n} orders started before 10 am`, [['early1', '🐦', 'Early Bird', 1], ['early10', '🥐', 'Breakfast Club', 10]]],
  ['Habits', 'weekend', n => `${n} orders on a Friday or Saturday`, [['wknd5', '🛋️', 'Weekend Feast', 5], ['wknd25', '🎊', 'Weekend Warrior', 25]]],
  ['Habits', 'streak', n => `Order ${n} weeks in a row`, [['streak4', '🔥', 'On Fire', 4], ['streak12', '📅', 'Clockwork', 12], ['streak52', '🗓️', 'Year Round', 52]]],
  ['Games', 'dashWins', n => `Win Lamma Dash ${n === 1 ? 'in an order' : n + ' times'}`, [
    ['dash1', '🏆', 'Dash Champion', 1], ['dash5', '🛵', 'Speed Demon', 5], ['dash10', '🏁', 'Road King', 10], ['dash25', '⚡', 'Unstoppable', 25], ['dash50', '🚀', 'Rocket Rider', 50]]],
  ['Games', 'dashBest', n => `Score ${n} in Lamma Dash`, [['score100', '🎮', 'Rookie Rider', 100], ['score500', '🕹️', 'Pro Rider', 500], ['score1000', '💨', 'Turbo', 1000], ['score2500', '🌠', 'Hyperdrive', 2500]]],
  ['Games', 'guessWins', n => `Win Guess the Check ${n === 1 ? 'once' : n + ' times'}`, [
    ['guess1', '🎯', 'Check Whisperer', 1], ['guess3', '🔮', 'Mind Reader', 3], ['guess10', '🧮', 'Human Calculator', 10], ['guess25', '🧙', 'Oracle', 25]]],
  ['Games', 'bullseye', n => n === 1 ? 'Guess the check within 1%' : `Guess within 1% ${n} times`, [['bull', '💯', 'Bullseye', 1], ['bull5', '🏹', 'Sharpshooter', 5]]],
];
const TIERS = ['bronze', 'silver', 'gold', 'diamond', 'legend'];
// [key, icon, name, description, stat fn, goal, group, tier]
const BADGES = TRACKS.flatMap(([group, stat, desc, steps]) => steps.map(([k, icon, name, goal], i) =>
  [k, icon, name, desc(goal), st => st[stat] || 0, goal, group, TIERS[Math.round(i * Math.min(4, steps.length - 1) / Math.max(1, steps.length - 1))]]));
function viewProfile() {
  const p = S.profile || {}, st = myStats();
  const got = BADGES.filter(b => b[4](st) >= b[5]);
  const groups = [...new Set(BADGES.map(b => b[6]))];
  const f = S.badgeFilter || 'all';
  const shown = b => f === 'all' || (f === 'got' ? b[4](st) >= b[5] : b[4](st) < b[5]);
  return `<div class="page no-nav"><div class="head">${backBtn()}<div class="grow"><h1>My profile</h1></div></div>
    <div class="profile-top"><button class="av-edit" data-a="avatarSheet" aria-label="Change profile picture">${avatar(S.user.uid, p.name, 'big')}<span class="av-cam">${ICON.camera}</span></button>
      <div class="grow" style="min-width:0"><h2>${esc(p.name)}</h2><div class="sub">@${esc(p.username || '')}</div>
      <div class="badge-count">🏅 ${got.length} of ${BADGES.length} badges</div></div></div>
    <div class="stats">
      <div><b>${st.joined}</b><span>Orders</span></div>
      <div><b>${st.hosted}</b><span>Hosted</span></div>
      <div><b>${st.dashWins}</b><span>Dash wins 🏆</span></div>
      <div><b>${st.guessWins}</b><span>Guess wins 🎯</span></div>
    </div>
    <div class="sec-head"><h3>Achievements</h3></div>
    <div class="seg" style="margin-bottom:14px"><button class="${f === 'all' ? 'on' : ''}" data-a="badgeFilter" data-v="all">All</button><button class="${f === 'got' ? 'on' : ''}" data-a="badgeFilter" data-v="got">Unlocked</button><button class="${f === 'next' ? 'on' : ''}" data-a="badgeFilter" data-v="next">To do</button></div>
    ${groups.map(g => { const list = BADGES.filter(b => b[6] === g && shown(b)); if (!list.length) return ''; return `<div class="caps" style="margin:16px 2px 8px">${g} · ${BADGES.filter(b => b[6] === g && b[4](st) >= b[5]).length}/${BADGES.filter(b => b[6] === g).length}</div>
      <div class="badge-grid">${list.map(b => { const v = b[4](st), ok = v >= b[5]; return `<div class="ach ${ok ? 'on' : ''} tier-${b[7]}">
        <div class="ach-icon">${b[1]}</div><b>${b[2]}</b><span class="sub">${b[3]}</span>
        ${ok ? `<span class="ach-done">${b[7]}</span>` : `<div class="progress"><i style="width:${Math.min(100, v / b[5] * 100)}%"></i></div><span class="sub small">${Math.min(v, b[5])} / ${b[5]}</span>`}</div>`; }).join('')}</div>`; }).join('')}
    <p class="hint" style="margin-top:14px">Counted from the orders you're in now. Orders a host deleted don't count.</p>
  </div>`;
}
// tell people about badges they just unlocked (checked on this phone)
let badgeSeen = null;
function checkBadges() {
  if (!S.user || !S.profile) return;
  const st = myStats(), now = BADGES.filter(b => b[4](st) >= b[5]).map(b => b[0]);
  const key = 'lamma.badges.' + S.user.uid;
  if (badgeSeen == null) { try { badgeSeen = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { badgeSeen = null; } if (badgeSeen == null) { badgeSeen = now; try { localStorage.setItem(key, JSON.stringify(now)); } catch (e) { } return; } }
  const fresh = now.filter(k => !badgeSeen.includes(k));
  if (!fresh.length) return;
  badgeSeen = [...new Set([...badgeSeen, ...fresh])];
  try { localStorage.setItem(key, JSON.stringify(badgeSeen)); } catch (e) { }
  if (fresh.length > 2) { banner({ id: 'bmany', title: `🏅 ${fresh.length} new badges unlocked`, body: 'Open your profile to see them.', badge: true }); return; }
  for (const k of fresh) { const b = BADGES.find(x => x[0] === k); banner({ id: 'b' + k, title: `${b[1]} New badge: ${b[2]}`, body: b[3], badge: true }); }
}

function itemCard(o, bill, p, it, editable) {
  const u = bill.unit.item({ ...it, pid: p.id });
  const exs = it.extras || [];
  const each = (u || 0) + exs.reduce((a, ex) => a + (bill.unit.extra(ex) || 0), 0);
  const over = isSet((o.itemPrices || {})[itemKey(p.id, it.id)]) || (u != null && itemPrice(it) != null && u !== itemPrice(it));
  return `<div class="item-card">
    <div class="ic-main">
      <div class="ic-name" dir="auto">${esc(it.name)}</div>
      ${it.note ? `<div class="sub" dir="auto">${esc(it.note)}</div>` : ''}
      <div class="ic-price">${u == null ? '<span class="muted">No price yet</span>' : money(each * qtyOf(it), o.currency)}${over ? ' <span class="badge">set by host</span>' : ''}</div>
      <div class="ic-row">
        ${editable ? `<div class="qty"><button data-a="itemQty" data-p="${p.id}" data-id="${it.id}" data-v="-1" aria-label="Less">−</button><span>${qtyOf(it)}</span><button data-a="itemQty" data-p="${p.id}" data-id="${it.id}" data-v="1" aria-label="More">+</button></div>
          <span class="grow"></span>
          <button class="mini" data-a="itemSheet" data-p="${p.id}" data-id="${it.id}" aria-label="Edit">${ICON.edit}</button>
          <button class="mini danger" data-a="deleteItem" data-p="${p.id}" data-id="${it.id}" aria-label="Remove">${ICON.trash}</button>`
      : `<span class="sub">Quantity: ${qtyOf(it)}</span>`}
      </div>
      ${editable ? `<button class="add-extra" data-a="extraSheet" data-p="${p.id}" data-id="${it.id}">${ICON.plusCircle} Add extra on item</button>` : ''}
    </div>
    ${exs.length ? `<div class="ic-extras"><div class="caps">Extras on item (${exs.length})</div>
      ${exs.map(ex => { const eu = bill.unit.extra(ex); return `<div class="extra">
        <span class="dot">${ICON.plus}</span>
        <div class="grow"><div dir="auto">${esc(ex.name)}</div><div class="sub">Price: ${eu == null ? 'not set' : money(eu, o.currency)}</div>${ex.byName ? `<div class="by">Added by: ${esc(ex.byName)}</div>` : ''}</div>
        ${editable ? `<button class="mini" data-a="extraSheet" data-p="${p.id}" data-id="${it.id}" data-x="${ex.id}" aria-label="Edit extra">${ICON.edit}</button><button class="mini danger" data-a="deleteExtra" data-p="${p.id}" data-id="${it.id}" data-x="${ex.id}" aria-label="Remove extra">${ICON.trash}</button>` : ''}
      </div>`; }).join('')}</div>` : ''}
  </div>`;
}
function personCard(o, bill, p, canAdd) {
  const items = p.items || [];
  return `<div class="card">
    <div class="person-head">${avatar(p.id, p.name)}<div class="grow"><div class="t">${esc(p.name)}${p.id === S.user.uid ? ' <span class="badge accent">You</span>' : ''}${(o.results || {}).gameWinner === p.id ? ' <span class="badge win" title="Lamma Dash champion">🏆</span>' : ''}${(o.results || {}).guessWinner === p.id ? ' <span class="badge win" title="Guessed the check">🎯</span>' : ''}${p.id === o.hostUid ? ' <span class="badge">Host</span>' : (o.coHosts || []).includes(p.id) ? ' <span class="badge">Co-host</span>' : ''}${p.noApp ? ' <span class="badge">Offline</span>' : ''}</div>
      <div class="sub">${items.length ? plural(sumQty(items), 'item') : 'Hasn\'t ordered yet'}</div></div>
      ${isHost() && p.id !== S.user.uid ? `<button class="mini" data-a="memberSheet" data-id="${p.id}" aria-label="Manage ${esc(p.name)}">${ICON.edit}</button>` : ''}</div>
    ${items.length ? `<div style="margin-top:8px">${items.map(it => {
      const u = bill.unit.item({ ...it, pid: p.id });
      return `<div class="item-line"><span class="q">${qtyOf(it)}×</span>
        <span class="grow" dir="auto">${esc(it.name)}${(it.extras || []).length ? `<span class="note">+ ${it.extras.map(e => esc(e.name)).join(', ')}</span>` : ''}${it.note ? `<span class="note" dir="auto">${esc(it.note)}</span>` : ''}${canAdd ? `<button class="add-mine" data-a="addMine" data-p="${p.id}" data-id="${it.id}">${ICON.plus} Add to my items</button>` : ''}</span>
        <span class="a">${u == null ? '<span class="muted small">no price</span>' : money(u * qtyOf(it), o.currency)}</span></div>`;
    }).join('')}</div>` : ''}
  </div>`;
}
function offlineCard(o, bill, offline) {
  return `<div class="offline">
    <div class="sec-head" style="margin:0 0 10px"><h3>Offline Members</h3><button class="link-btn" data-a="addPerson">${ICON.userPlus} Add Member</button></div>
    ${offline.length ? offline.map(p => `<div class="off-person">
        <div class="person-head">${avatar(p.id, p.name)}<div class="grow"><div class="t">${esc(p.name)}</div><div class="sub">${(p.items || []).length ? plural(sumQty(p.items), 'item') : 'No food yet'}</div></div>
          <button class="mini" data-a="personSheet" data-id="${p.id}" aria-label="Edit">${ICON.edit}</button></div>
        ${(p.items || []).map(it => { const u = bill.unit.item({ ...it, pid: p.id }); return `<div class="item-line tap" data-a="itemSheet" data-p="${p.id}" data-id="${it.id}"><span class="q">${qtyOf(it)}×</span><span class="grow" dir="auto">${esc(it.name)}${(it.extras || []).length ? `<span class="note">+ ${it.extras.map(e => esc(e.name)).join(', ')}</span>` : ''}</span><span class="a">${u == null ? '<span class="muted small">no price</span>' : money(u * qtyOf(it), o.currency)}</span></div>`; }).join('')}
        <button class="add-extra" data-a="itemSheet" data-p="${p.id}">${ICON.plusCircle} Add food for ${esc(p.name)}</button>
      </div>`).join('')
      : `<div class="off-hint">${ICON.userPlus}<span>Ordering for someone who doesn't have the app? Add them as an offline member and add their items for them. They'll be included in the order and the split.</span></div>`}
  </div>`;
}
function paymentCard(o, r, me) {
  const paid = !!me.paid;
  const line = (n, v) => `<div class="money"><span dir="auto">${n}</span><b>${v}</b></div>`;
  return `<div class="pay-card">
    <div class="pc-head">${ICON.card}<span>${paid ? 'Payment sent' : 'Payment Required'}</span></div>
    <div class="pc-amount">Your amount: <b>${money(r.total, o.currency)}</b></div>
    <div class="pc-box">
      <div class="pc-title">${ICON.receipt} Amount Breakdown:</div>
      <div class="pc-sub">Items:</div>
      ${r.lines.map(l => line(`• ${esc(l.n)}${l.q > 1 ? ` x${l.q}` : ''}${l.split ? ` (shared by ${l.split})` : ''}`, l.u == null ? '–' : money(l.a, o.currency))).join('')}
      <div class="money strong"><span>Items Total:</span><b>${money(r.items, o.currency)}</b></div>
      ${r.extras.length ? `<div class="pc-sub">Extras:</div>${r.extras.map(x => line(`• ${esc(x.n)} x${x.q}`, x.u == null ? '–' : money(x.a, o.currency))).join('')}
        <div class="money strong"><span>Extras Total:</span><b>${money(r.extrasT, o.currency)}</b></div>` : ''}
      <div class="money strong gap"><span>Base Amount:</span><b>${money(r.sub, o.currency)}</b></div>
      ${r.disc ? line('Discount', '−' + money(r.disc, o.currency)) : ''}
      ${r.service ? line(`Service ${num(o.fees.service)}%`, money(r.service, o.currency)) : ''}
      ${r.vat ? line(`VAT ${num(o.fees.vat)}%`, money(r.vat, o.currency)) : ''}
      ${r.delivery ? line('Your part of delivery', money(r.delivery, o.currency)) : ''}
      ${r.adj ? line('Matched to the receipt', money(r.adj, o.currency)) : ''}
      <div class="money total"><span>Total:</span><span>${money(r.total, o.currency)}</span></div>
    </div>
    ${o.paymentMode !== 'note' && o.paymentUrl ? `<button class="btn block pay-link" data-a="payLink">${ICON.link} Pay ${esc(o.hostName)}</button>` : ''}
    ${o.hostNote ? `<div class="pc-note"><div class="row"><span class="sub grow">${ICON.note} Host Note</span><button class="mini" data-a="copyNote" aria-label="Copy note">${ICON.copy}</button></div><div dir="auto" class="note-text">${esc(o.hostNote)}</div></div>` : ''}
    ${paid ? `<div class="paid-line">${ICON.checkCircle} You marked this as paid${me.received ? '' : ''}. <button class="link-btn" data-a="markPaid" data-v="0">Undo</button></div>`
      : `<button class="btn primary block big" data-a="markPaid" data-v="1">${ICON.checkCircle} Mark as Paid</button>`}
  </div>`;
}

/* ----- host: delivery checklist ----- */
function viewChecklist(o) {
  const bill = computeBill(o, S.people);
  const people = S.listTab === 'people';
  return `<div class="page no-nav">
    <div class="head">${backBtn('details')}<div class="grow"><h1 class="h-sm">Delivery Checklist</h1></div><button class="icon-btn" data-a="exportCsv" aria-label="Export Excel">${ICON.download}</button></div>
    <div class="seg" style="margin-bottom:14px"><button class="${people ? 'on' : ''}" data-a="listTab" data-v="people">People (${S.people.length})</button><button class="${people ? '' : 'on'}" data-a="listTab" data-v="foods">Foods (${bill.groups.length})</button></div>
    ${people ? checklistPeople(o, bill) : checklistFoods(o, bill)}
  </div>`;
}
function checklistPeople(o, bill) {
  const rows = bill.rows.filter(r => r.lines.length || r.p.id !== o.hostUid);
  const others = rows.filter(r => r.p.id !== o.hostUid);
  const paid = others.filter(r => r.p.paid), got = others.filter(r => r.p.received);
  const owed = others.reduce((a, r) => a + r.total, 0), in_ = paid.reduce((a, r) => a + r.total, 0);
  if (!bill.rows.some(r => r.lines.length)) return `<div class="empty">Nobody has added food yet.</div>`;
  return `<div class="card"><div class="stat"><span class="sub">Paid ${paid.length} of ${others.length} · Got food ${got.length} of ${others.length}</span></div>
      <div class="stat" style="margin-top:4px"><b>${money(in_, o.currency)}</b><span class="sub">of ${money(owed, o.currency)}</span></div>
      <div class="progress"><i style="width:${owed ? in_ / owed * 100 : 0}%"></i></div>
      ${bill.missing ? `<p class="sub" style="margin-top:10px;color:var(--warn)">${plural(bill.missing, 'price')} missing. <a href="#" data-a="screen" data-v="prices">Set prices</a></p>` : ''}
      ${!delivered(o) ? `<p class="sub" style="margin-top:8px">Totals include VAT, service and delivery once you mark the order as delivered.</p>` : ''}</div>
    <p class="hint">Tap a price to change it. You can change prices, but not the food people ordered.</p>
    ${rows.map(r => {
      const p = r.p, me = p.id === o.hostUid;
      return `<div class="card">
        <div class="person-head">${avatar(p.id, p.name)}<div class="grow"><div class="t">${esc(p.name)}${me ? ' <span class="badge">You</span>' : ''}${p.noApp ? ' <span class="badge">Offline</span>' : ''}</div></div><div class="amount">${money(r.total, o.currency)}</div></div>
        <div style="margin-top:8px">${r.lines.length ? r.lines.map(l => `<div class="item-line"><span class="q">${l.q}×</span><span class="grow" dir="auto">${esc(l.n)}${l.split ? ` <span class="muted small">(shared by ${l.split})</span>` : ''}${l.note ? `<span class="note" dir="auto">${esc(l.note)}</span>` : ''}</span>
            ${l.shared ? `<span class="a">${l.u == null ? '–' : money(l.a, o.currency)}</span>` : `<button class="price-btn ${l.u == null ? 'missing' : ''} ${l.over ? 'over' : ''}" data-a="priceSheet" data-p="${p.id}" data-id="${l.id}">${l.u == null ? 'Set price' : money(l.a, o.currency)}</button>`}</div>`).join('')
            + r.extras.map(x => `<div class="item-line sub-line"><span class="q"></span><span class="grow" dir="auto">+ ${esc(x.n)} <span class="muted small">on ${esc(x.on)}</span></span><span class="a">${x.u == null ? '–' : money(x.a, o.currency)}</span></div>`).join('') : '<p class="sub">No food yet</p>'}</div>
        ${me ? '' : `<div class="actions">
          <button class="check-btn ${p.received ? 'on' : ''}" data-a="tick" data-k="received" data-id="${p.id}"><span class="box"></span>Got food</button>
          <button class="check-btn ${p.paid ? 'on' : ''}" data-a="tick" data-k="paid" data-id="${p.id}"><span class="box"></span>Paid</button>
          ${!p.paid && r.total > 0 && !p.noApp ? `<button class="btn sm ghost" data-a="remind" data-id="${p.id}">Send reminder</button>` : ''}
        </div>`}
      </div>`;
    }).join('')}`;
}
function checklistFoods(o, bill) {
  const groups = [...bill.groups].sort((a, b) => sumQty(b.items) - sumQty(a.items));
  const nameOf = it => it.shared ? 'shared' : (S.people.find(p => p.id === it.pid) || {}).name || '?';
  const xg = extraGroups(S.people);
  return `<p class="hint">Everything to order from the restaurant, counted together. Names that are almost the same, like “Chicken burger” and “chiken Burger”, are added up.</p>
    <div class="row" style="margin-bottom:12px;flex-wrap:wrap"><button class="btn sm" data-a="copyFoods">${ICON.copy} Copy list</button><button class="btn sm" data-a="sharedSheet">${ICON.plus} Shared item</button></div>
    <div class="card row" style="padding:10px 14px"><div style="flex:1"><b style="font-size:15px">Combine similar names</b><div class="sub">Turn off to count only exact matches.</div></div><button class="switch ${o.smart !== false ? 'on' : ''}" data-a="toggleSmart" aria-label="Combine similar names"></button></div>
    ${groups.length ? groups.map(g => {
      const q = sumQty(g.items), got = Math.min((o.delivered || {})[g.anchor] || 0, q);
      const who = {}; for (const it of g.items) { const n = nameOf(it); who[n] = (who[n] || 0) + qtyOf(it); }
      const shared = g.items.filter(i => i.shared);
      return `<div class="card">
        <div class="person-head"><div class="amount" style="min-width:40px">${q}×</div><div class="grow"><div class="t" dir="auto">${esc(g.label)}</div><div class="sub">${Object.entries(who).map(([n, c]) => esc(n) + (c > 1 ? ' ×' + c : '')).join(', ')}</div></div>
          <div class="counter"><button data-a="recv" data-v="${esc(g.anchor)}" data-d="-1" aria-label="Less">−</button><span>${got}/${q}</span><button data-a="recv" data-v="${esc(g.anchor)}" data-d="1" aria-label="More">+</button></div></div>
        ${g.variants.length > 1 ? `<div class="merge"><span class="grow">Combined: ${g.variants.map(v => `“${esc(v)}”`).join(', ')}</span>${g.keys.length > 1 ? `<button data-a="split" data-v="${esc(g.anchor)}">Undo</button>` : ''}</div>` : ''}
        ${shared.length ? `<div class="actions">${shared.map(s => `<button class="btn sm" data-a="sharedSheet" data-id="${s.id}">Edit shared ${esc(s.name)}</button>`).join('')}</div>` : ''}
      </div>`;
    }).join('') : `<div class="empty">No food yet.</div>`}
    ${xg.length ? `<div class="sec-head"><h3>Extras</h3></div><div class="card flush">${xg.map(x => `<div class="list-row"><div class="amount" style="min-width:40px;font-size:16px">${x.qty}×</div><div class="grow t" dir="auto">${esc(x.label)}</div></div>`).join('')}</div>` : ''}
    ${groups.length ? `<p class="hint">The counter shows how many arrived. Tap + as the delivery comes in.</p>` : ''}`;
}

/* ----- host: set item prices ----- */
function viewPrices(o) {
  const bill = computeBill(o, S.people);
  const f = o.fees || {};
  const xg = extraGroups(S.people);
  const going = S.delivering && !delivered(o);
  return `<div class="page no-nav">
    <div class="head">${backBtn('details')}<div class="grow"><h1 class="h-sm">Set Item Prices</h1></div></div>
    <div class="ps-intro"><b>${ICON.edit} Manual Price Setting</b><p class="sub">Review the prices people typed for their items and extras. Type a price only to change it; leave it empty to keep the member price.</p></div>
    ${going ? `<div class="tip">${ICON.bulb}<span>VAT, service and the payment info are set from the previous step. After you confirm the prices, the order is marked as delivered and everyone sees what they owe.</span></div>` : ''}
    <h3 class="ps-h">Main Items:</h3>
    ${bill.groups.length ? bill.groups.map(g => {
      const h = priceFor(o, g.label, g.keys);
      const typed = [...new Set(g.items.map(itemPrice).filter(v => v != null))];
      const missing = h == null && g.items.some(i => itemPrice(i) == null);
      return `<div class="price-card">
        <div class="pr-top"><div class="t" dir="auto">${esc(g.label)}</div><span class="pill">${typed.length ? `Member Price: ${typed.map(v => money(v, o.currency)).join(' / ')}` : 'No member price'}</span></div>
        <div class="sub">Total quantity: ${sumQty(g.items)}${g.variants.length > 1 ? ` · ${g.variants.map(v => `“${esc(v)}”`).join(', ')}` : ''}</div>
        <div class="inp-icon"><span>${esc(o.currency)}</span><input class="inp ${missing ? 'missing' : ''}" inputmode="decimal" placeholder="Override price (${esc(o.currency)})" value="${h == null ? '' : h}" data-f="price" data-v="${esc(g.anchor)}"></div>
        <div class="hint" style="margin:6px 2px 0">Leave empty to use the member price, or type the price from the receipt.</div>
      </div>`;
    }).join('') : '<div class="empty">No food yet.</div>'}
    ${xg.length ? `<h3 class="ps-h">Extras/Add-ons:</h3>${xg.map(x => {
      const h = (o.extraPrices || {})[x.key];
      const typed = [...new Set(x.prices)];
      return `<div class="price-card">
        <div class="pr-top"><div class="t" dir="auto"><span class="xdot">${ICON.plus}</span> ${esc(x.label)}</div><span class="pill">${typed.length ? `Member Price: ${typed.map(v => money(v, o.currency)).join(' / ')}` : 'No member price'}</span></div>
        <div class="sub">Price per main item unit · ${x.qty} in total</div>
        <div class="inp-icon"><span>${esc(o.currency)}</span><input class="inp ${!isSet(h) && !typed.length ? 'missing' : ''}" inputmode="decimal" placeholder="Override price (${esc(o.currency)})" value="${isSet(h) ? h : ''}" data-f="xprice" data-v="${esc(x.key)}"></div>
        <div class="hint" style="margin:6px 2px 0">Leave empty to use the member price, or enter an adjusted price.</div>
      </div>`;
    }).join('')}` : ''}
    <h3 class="ps-h">Discount and receipt <span class="opt">(optional)</span></h3>
    <div class="card">
      <div class="grid2">
        <div class="field"><label>Discount</label><input class="inp" inputmode="decimal" value="${f.discount || ''}" placeholder="0" data-f="fee" data-v="discount"></div>
        <div class="field"><label>Type</label><div class="seg">${[['amount', o.currency], ['pct', '%']].map(([k, l]) => `<button class="${(f.discountType || 'amount') === k ? 'on' : ''}" data-a="discType" data-v="${k}">${l}</button>`).join('')}</div></div>
      </div>
      <div class="field" style="margin:0"><label>Receipt total</label><input class="inp" inputmode="decimal" value="${f.receipt || ''}" placeholder="Final total on the receipt" data-f="fee" data-v="receipt">
        <p class="hint" style="margin:6px 2px 0">If you type it, everyone's share is adjusted so the total matches the receipt exactly.</p></div>
    </div>
    <div class="card" id="price-summary">${priceSummary(o, bill)}</div>
    <div class="ps-actions">
      ${going ? `<button class="btn primary block big" data-a="confirmDeliver">Confirm Prices &amp; Deliver</button>` : `<button class="btn primary block big" data-a="screen" data-v="details">Done</button>`}
      <button class="btn block big outline" data-a="screen" data-v="details">Cancel</button>
    </div>
  </div>`;
}
function priceSummary(o, bill) {
  const extras = bill.rows.reduce((a, r) => a + r.extrasT, 0);
  return `<div class="money"><span>Items</span><b>${money(bill.sub - extras, o.currency)}</b></div>
    ${extras ? `<div class="money"><span>Extras</span><b>${money(extras, o.currency)}</b></div>` : ''}
    ${bill.disc ? `<div class="money"><span>Discount</span><b>−${money(bill.disc, o.currency)}</b></div>` : ''}
    <div class="money"><span>VAT ${bill.vatP}%, service ${bill.svcP}% and delivery</span><b>${money(bill.computed - bill.sub + bill.disc, o.currency)}</b></div>
    ${bill.receipt > 0 && Math.abs(bill.receipt - bill.computed) > .009 ? `<div class="money"><span>Matched to the receipt</span><b>${bill.receipt > bill.computed ? '+' : '−'}${money(Math.abs(bill.receipt - bill.computed), o.currency)}</b></div>` : ''}
    <div class="money total"><span>Total</span><span>${money(bill.grand, o.currency)}</span></div>
    ${bill.missing ? `<p class="sub" style="margin-top:8px;color:var(--warn)">${plural(bill.missing, 'price')} still missing.</p>` : ''}`;
}
function refreshPrices() {
  const o = S.order; if (!o || !isHost()) return;
  const el = $('#price-summary');
  if (el) el.innerHTML = priceSummary(o, computeBill(o, S.people));
}

/* ---------------- sheets ---------------- */
function openSheet(html) {
  const root = $('#sheet-root');
  root.innerHTML = `<div class="backdrop" data-a="closeSheet"></div><div class="sheet" role="dialog"><div class="grab-zone" data-a="closeSheet" aria-label="Close"><div class="grab"></div></div>${html}</div>`;
  return $('.sheet', root);
}
function closeSheet() { $('#sheet-root').innerHTML = ''; }
// drag a sheet down to close it: from the bar on top, or anywhere once the sheet is scrolled to the top
(function dragToClose() {
  let sh = null, y0 = 0, dy = 0, t0 = 0, active = false;
  document.addEventListener('touchstart', e => {
    const el = e.target.closest && e.target.closest('.sheet');
    if (!el || e.touches.length !== 1) return;
    const onBar = !!e.target.closest('.grab-zone');
    if (!onBar && (el.scrollTop > 0 || e.target.closest('input, textarea, select, .photos, .chips'))) return;
    sh = el; y0 = e.touches[0].clientY; dy = 0; t0 = Date.now(); active = onBar;
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!sh) return;
    dy = e.touches[0].clientY - y0;
    if (!active) { if (dy > 8 && sh.scrollTop <= 0) active = true; else if (dy < -4) { sh = null; return; } else return; }
    if (e.cancelable) e.preventDefault();
    sh.style.transition = 'none';
    sh.style.transform = `translateY(${Math.max(0, dy)}px)`;
    const bd = $('.backdrop'); if (bd) bd.style.opacity = String(Math.max(0.2, 1 - dy / 400));
  }, { passive: false });
  document.addEventListener('touchend', () => {
    if (!sh) return;
    const el = sh; sh = null;
    if (!active) return;
    const fast = dy > 40 && Date.now() - t0 < 250;
    if (dy > 110 || fast) {
      el.style.transition = 'transform .18s ease-in'; el.style.transform = 'translateY(100%)';
      setTimeout(() => { if (el.isConnected) closeSheet(); }, 170);
    } else {
      el.style.transition = 'transform .2s ease-out'; el.style.transform = '';
      const bd = $('.backdrop'); if (bd) bd.style.opacity = '';
    }
  });
})();

function sheetJoin() {
  openSheet(`<h2>Join an order</h2><p class="sub">Type the 6-letter group code your friend sent you, or paste their invite link.</p>
    <div class="field"><input class="inp code" id="jn-code" maxlength="80" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="ABC123"></div>
    <div class="err" id="jn-err"></div>
    <button class="btn primary block" data-a="doJoin">Join</button>`);
  setTimeout(() => { const i = $('#jn-code'); if (i) i.focus(); }, 200);
}
async function joinByCode(raw) {
  const t = String(raw || '').toUpperCase().trim();
  const m = t.match(/[?&]C=([A-Z0-9]{6})/) || t.match(/^([A-Z0-9]{6})$/) || t.match(/(?:^|[^A-Z0-9])([A-Z0-9]{6})(?![A-Z0-9])/);
  const fail = msg => { const err = $('#jn-err'); if (err) err.textContent = msg; else toast(msg); };
  if (!m) return fail('The code has 6 letters or numbers.');
  try {
    const c = await FB.getDoc(D('codes', m[1]));
    if (!c.exists()) return fail('No order found with that code.');
    const oid = c.data().orderId;
    const o = await FB.getDoc(D('orders', oid));
    if (!o.exists()) return fail('That order was deleted.');
    const od = o.data(), uid = S.user.uid;
    if (od.hostUid === uid) { closeSheet(); openOrder(oid); return; }
    const mine = await FB.getDoc(D('orders', oid, 'people', uid)).catch(() => null);
    if (!mine || !mine.exists()) {
      if (locked(od)) return fail('This order is locked, so new people can\'t join.');
      await FB.setDoc(D('orders', oid, 'people', uid), { uid, name: S.profile.name, items: [], joinedAt: Date.now(), updatedAt: Date.now() });
      notifyUsers(hostsOf(od), { type: 'join', title: `${S.profile.name} joined ${od.place}`, body: 'Tap to see who\'s in and what they order.', orderId: oid });
    }
    await FB.setDoc(D('users', uid, 'joined', oid), { place: od.place, hostName: od.hostName, joinedAt: Date.now() });
    closeSheet();
    openOrder(oid);
    toast(`You joined ${od.hostName}'s order`);
  } catch (e) { console.error(e); fail('Could not join. Check your internet and try again.'); }
}

/* host a new order / edit order details */
async function sheetOrder(editing) {
  const o = editing ? S.order : null;
  const st = { menuId: o ? o.menuId || null : null, photos: [], editing: !!o };
  if (st.menuId) st.photos = await loadPhotos(st.menuId);
  const s = openSheet(`<h2>${o ? 'Edit order' : 'Host an order'}</h2><p class="sub">${o ? 'Changes show up for everyone in the order.' : 'Friends will see the restaurant, its menu and location.'}</p>
    ${!o && S.menus.length ? `<div class="field"><label>Use a saved menu <span class="opt">(optional)</span></label><div class="chips">${S.menus.map(m => `<button data-a="useMenu" data-id="${m.id}">${esc(m.name)}</button>`).join('')}</div></div>` : ''}
    <div class="field"><label>Restaurant or order name</label><input class="inp" id="od-place" value="${esc(o ? o.place : '')}" placeholder="e.g. Lunch - KFC" dir="auto"></div>
    <div class="field"><label>Description <span class="opt">(optional)</span></label><textarea class="inp area" id="od-desc" rows="2" placeholder="e.g. Everyone can order a main dish plus a drink" dir="auto">${esc(o ? o.description : '')}</textarea></div>
    <div class="field"><label>Deadline for orders <span class="opt">(optional)</span></label><input class="inp" type="datetime-local" id="od-lock" value="${o && o.lockAt ? toLocalInput(o.lockAt) : ''}">
      <p class="hint" style="margin:6px 2px 0">The order locks by itself at this time, so nobody can add or change food after it.</p></div>
    <div class="field"><label>Menu website <span class="opt">(optional)</span></label><input class="inp" id="od-web" value="${esc(o ? o.website : '')}" placeholder="https://…" inputmode="url" autocapitalize="none"></div>
    <div class="field"><label>Google Maps link <span class="opt">(optional)</span></label><input class="inp" id="od-maps" value="${esc(o ? o.maps : '')}" placeholder="https://maps.app.goo.gl/…" inputmode="url" autocapitalize="none"></div>
    <div class="field"><label>Menu photos <span class="opt">(up to ${MAX_PHOTOS})</span></label><div class="photos" id="od-photos"></div></div>
    <div class="field"><label>Currency</label><select class="inp" id="od-cur">${CURRENCIES.map(c => `<option ${c === (o ? o.currency : 'EGP') ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    ${!o ? `<div class="row" style="margin-bottom:16px"><div style="flex:1"><b style="font-size:15px">Save this menu for next time</b><div class="sub">You'll find it in Saved menus.</div></div><button class="switch on" id="od-save" data-a="toggleSwitch"></button></div>` : ''}
    <div class="err" id="od-err"></div>
    <button class="btn primary block" data-a="saveOrder" id="od-go">${o ? 'Save' : 'Start order'}</button>`);
  s._st = st;
  drawPhotoGrid('#od-photos', st);
}
function drawPhotoGrid(sel, st) {
  const el = $(sel); if (!el) return;
  el.innerHTML = st.photos.map((p, i) => `<div class="ph"><img src="${p.data}" alt=""><button class="x" data-a="rmPhoto" data-v="${i}" aria-label="Remove">✕</button></div>`).join('')
    + (st.photos.length < MAX_PHOTOS ? `<button class="add" data-a="addPhotos">+ Add<br>photos</button>` : '');
}
async function loadPhotos(menuId) {
  try {
    const s = await FB.getDocs(C('menus', menuId, 'photos'));
    return s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.idx - b.idx);
  } catch (e) { return []; }
}
function resizeImage(src, max, quality) {
  return new Promise((res, rej) => {
    const url = typeof src === 'string' ? src : URL.createObjectURL(src);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      if (typeof src !== 'string') URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = rej;
    img.src = url;
  });
}
let photoTarget = null;
$('#file-input').addEventListener('change', async e => {
  const files = [...e.target.files];
  e.target.value = '';
  if (!photoTarget) return;
  const { st, sel } = photoTarget;
  const room = MAX_PHOTOS - st.photos.length;
  if (files.length > room) toast(`Up to ${MAX_PHOTOS} photos per menu, so ${files.length - room} ${files.length - room === 1 ? 'was' : 'were'} skipped`);
  for (const f of files.slice(0, room)) {
    try { st.photos.push({ id: null, data: await resizeImage(f, 1400, 0.72) }); } catch (er) { toast("Couldn't read one of the photos"); }
    drawPhotoGrid(sel, st);
  }
});
// saves a menu and its photos (one document per photo); returns {menuId, photoCount}
async function saveMenu(menuId, data, st) {
  const id = menuId || rid(16);
  const cover = st.photos[0] ? await resizeImage(st.photos[0].data, 160, 0.7).catch(() => '') : '';
  await FB.setDoc(D('menus', id), { ownerUid: S.user.uid, ...data, cover, photoCount: st.photos.length, updatedAt: Date.now() }, { merge: true });
  const existing = menuId ? (await FB.getDocs(C('menus', id, 'photos'))).docs.map(d => d.id) : [];
  const keep = new Set();
  for (let i = 0; i < st.photos.length; i++) {
    const p = st.photos[i];
    const pid = p.id || rid(12);
    keep.add(pid);
    if (!p.id || p.idx !== i) await FB.setDoc(D('menus', id, 'photos', pid), { data: p.data, idx: i });
    p.id = pid; p.idx = i;
  }
  for (const pid of existing) if (!keep.has(pid)) await FB.deleteDoc(D('menus', id, 'photos', pid));
  return { menuId: id, photoCount: st.photos.length };
}
function readLockInput(id) {
  const v = $(id) && $(id).value;
  if (!v) return { lockAt: null };
  const t = new Date(v).getTime();
  if (!isFinite(t)) return { lockAt: null };
  if (t <= Date.now()) return { error: 'Pick a deadline in the future.' };
  return { lockAt: t };
}
async function saveOrder() {
  const s = $('.sheet'), st = s._st, o = st.editing ? S.order : null;
  const place = $('#od-place').value.trim(), description = $('#od-desc').value.trim(), website = $('#od-web').value.trim(), maps = $('#od-maps').value.trim(), currency = $('#od-cur').value;
  if (!place) { $('#od-err').textContent = 'Type the restaurant name.'; return; }
  const dl = readLockInput('#od-lock');
  if (dl.error && !(o && o.lockAt && $('#od-lock').value === toLocalInput(o.lockAt))) { $('#od-err').textContent = dl.error; return; }
  const btn = $('#od-go'); btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const wantMenu = o ? !!(st.menuId || st.photos.length) : ($('#od-save').classList.contains('on') || st.photos.length > 0);
    let menu = { menuId: st.menuId || null, photoCount: st.photos.length };
    if (wantMenu) menu = await saveMenu(st.menuId, { name: place, website, maps }, st);
    const uid = S.user.uid;
    if (o) {
      const patch = { place, description, website, maps, currency, menuId: menu.menuId, photoCount: menu.photoCount };
      if (!dl.error) patch.lockAt = dl.lockAt;
      await FB.updateDoc(D('orders', o.id), patch);
      closeSheet(); toast('Saved');
      return;
    }
    const id = rid(16);
    let code = newCode();
    for (let i = 0; i < 5; i++) { const c = await FB.getDoc(D('codes', code)); if (!c.exists()) break; code = newCode(); }
    await FB.setDoc(D('orders', id), {
      hostUid: uid, hostName: S.profile.name, place, description, website, maps, currency, code, open: true, lockAt: dl.lockAt, stage: 'open',
      createdAt: Date.now(), memberCount: 1, menuId: menu.menuId, photoCount: menu.photoCount,
      paymentMode: 'url', paymentUrl: S.profile.instapay || '', hostNote: '', autoFees: true,
      fees: { vat: 14, service: 12, vatOnService: true, delivery: 0, discount: 0, discountType: 'amount', receipt: '' },
      prices: {}, itemPrices: {}, extraPrices: {}, delivered: {}, smart: true, blocks: [], joins: [], shared: [],
    });
    await FB.setDoc(D('codes', code), { orderId: id, hostUid: uid });
    await FB.setDoc(D('orders', id, 'people', uid), { uid, name: S.profile.name, items: [], joinedAt: Date.now(), updatedAt: Date.now() });
    closeSheet();
    S.homeTab = 'hosted';
    openOrder(id);
    toast('Order started. Share the invite link with your friends.');
  } catch (e) {
    console.error(e);
    btn.disabled = false; btn.textContent = o ? 'Save' : 'Start order';
    $('#od-err').textContent = 'Could not save. Check your internet and try again.';
  }
}

/* menus */
async function sheetMenu(id) {
  const m = id ? S.menus.find(x => x.id === id) : null;
  const st = { menuId: id || null, photos: id ? await loadPhotos(id) : [] };
  const s = openSheet(`<h2>${m ? esc(m.name) : 'Add a menu'}</h2><p class="sub">Save a restaurant's menu once and use it for every order.</p>
    <div class="field"><label>Restaurant</label><input class="inp" id="mn-name" value="${esc(m ? m.name : '')}" dir="auto"></div>
    <div class="field"><label>Menu website <span class="opt">(optional)</span></label><input class="inp" id="mn-web" value="${esc(m ? m.website : '')}" placeholder="https://…" inputmode="url" autocapitalize="none"></div>
    <div class="field"><label>Google Maps link <span class="opt">(optional)</span></label><input class="inp" id="mn-maps" value="${esc(m ? m.maps : '')}" placeholder="https://maps.app.goo.gl/…" inputmode="url" autocapitalize="none"></div>
    <div class="field"><label>Menu photos <span class="opt">(up to ${MAX_PHOTOS})</span></label><div class="photos" id="mn-photos"></div></div>
    <div class="err" id="mn-err"></div>
    <button class="btn primary block" data-a="saveMenuSheet" id="mn-go">Save menu</button>
    ${m ? `<button class="btn block" style="margin-top:10px" data-a="orderFromMenu">Host an order with this menu</button>
    <button class="btn block ghost danger" style="margin-top:6px" data-a="deleteMenu">Delete menu</button>` : ''}`);
  s._st = st;
  drawPhotoGrid('#mn-photos', st);
}

/* food items: you edit your own; the host also edits offline members' food */
const personFor = pid => S.people.find(p => p.id === (pid || S.user.uid));
const canEditFood = p => !!p && (isHost() || (p.id === S.user.uid && !locked(S.order)));
function sheetItem(itemId, personId) {
  const o = S.order, person = personFor(personId);
  if (!canEditFood(person)) { toast(locked(o) ? 'This order is locked.' : "You can't change someone else's food."); return; }
  const it = itemId ? (person.items || []).find(i => i.id === itemId) : null;
  const known = computeBill(o, S.people).groups.map(g => g.label);
  const s = openSheet(`<h2>${it ? 'Edit item' : 'Add Item'}</h2><p class="sub">${person.id === S.user.uid ? 'For you' : 'For ' + esc(person.name)}</p>
    <div class="field"><label>Food</label><input class="inp" id="it-name" value="${esc(it ? it.name : '')}" placeholder="e.g. Chicken cordon blue" dir="auto" autocomplete="off">
      ${known.length && !it ? `<div class="chips">${known.slice(0, 8).map(n => `<button data-a="pickName" data-v="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : ''}</div>
    <div class="grid2">
      <div class="field"><label>Price of one</label><input class="inp" id="it-price" inputmode="decimal" placeholder="${esc(o.currency)}" value="${it && itemPrice(it) != null ? itemPrice(it) : ''}"></div>
      <div class="field"><label>How many</label><div class="stepper"><button data-a="qty" data-v="-1">−</button><span class="v" id="it-qty">${it ? qtyOf(it) : 1}</span><button data-a="qty" data-v="1">+</button></div></div>
    </div>
    <div class="field"><label>Note <span class="opt">(optional)</span></label><input class="inp" id="it-note" value="${esc(it ? it.note : '')}" placeholder="e.g. no onions, spicy" dir="auto"></div>
    <button class="btn primary block" data-a="saveItem">${it ? 'Save' : 'Add'}</button>
    ${it ? `<button class="btn block ghost danger" style="margin-top:6px" data-a="deleteItem" data-p="${person.id}" data-id="${it.id}">Remove</button>` : ''}`);
  s._pid = person.id; s._itemId = itemId || null;
  if (!it) setTimeout(() => { const i = $('#it-name'); if (i) i.focus(); }, 200);
}
function sheetExtra(pid, itemId, extraId) {
  const person = personFor(pid), it = person && (person.items || []).find(i => i.id === itemId);
  if (!it || !canEditFood(person)) return;
  const ex = extraId ? (it.extras || []).find(x => x.id === extraId) : null;
  const known = extraGroups(S.people).map(x => x.label);
  const s = openSheet(`<h2>${ex ? 'Edit extra' : 'Add extra on item'}</h2><p class="sub">On ${esc(it.name)}. The price is for one ${esc(it.name)}, so it counts ${qtyOf(it)} time${qtyOf(it) > 1 ? 's' : ''}.</p>
    <div class="field"><label>Extra</label><input class="inp" id="ex-name" value="${esc(ex ? ex.name : '')}" placeholder="e.g. Extra cheese" dir="auto" autocomplete="off">
      ${known.length && !ex ? `<div class="chips">${known.slice(0, 8).map(n => `<button data-a="pickExtra" data-v="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : ''}</div>
    <div class="field"><label>Price</label><input class="inp" id="ex-price" inputmode="decimal" placeholder="${esc(S.order.currency)}" value="${ex && itemPrice(ex) != null ? itemPrice(ex) : ''}"></div>
    <button class="btn primary block" data-a="saveExtra">${ex ? 'Save' : 'Add extra'}</button>`);
  Object.assign(s, { _pid: person.id, _itemId: itemId, _extraId: extraId || null });
  if (!ex) setTimeout(() => { const i = $('#ex-name'); if (i) i.focus(); }, 200);
}
const writeItems = (pid, items) => FB.updateDoc(D('orders', S.order.id, 'people', pid), { items, updatedAt: Date.now() });
async function changeItems(pid, fn, what) {
  const p = personFor(pid);
  if (!canEditFood(p)) { toast(locked(S.order) ? 'This order is locked.' : "You can't change someone else's food."); return false; }
  const before = (p.items || []).length;
  const items = (p.items || []).map(i => ({ ...i, extras: [...(i.extras || [])] }));
  fn(items);
  try {
    await writeItems(p.id, items);
    const o = S.order;
    // tell the person when a host changed their food, and the hosts when someone places their first item
    if (p.id !== S.user.uid && !p.noApp) notifyUsers([p.id], { type: 'edited', title: `${S.profile.name} changed your order`, body: `${o.place}: ${what || 'your items were updated'}. Tap to check.` });
    if (p.id === S.user.uid && !before && items.length && !isMainHost()) notifyUsers(hostsOf(o), { type: 'placed', title: `${S.profile.name} placed their order`, body: `${o.place}: ${items.map(i => `${qtyOf(i)}× ${i.name}`).join(', ')}` });
    return true;
  }
  catch (e) { toast(locked(S.order) ? 'This order is locked.' : 'Could not save. Check your internet.'); return false; }
}

/* host: change the price of one person's item (the food itself stays as they ordered it) */
function sheetPrice(pid, itemId) {
  const o = S.order, p = personFor(pid), it = p && (p.items || []).find(i => i.id === itemId);
  if (!it) return;
  const bill = computeBill(o, S.people);
  const cur = (o.itemPrices || {})[itemKey(pid, itemId)];
  const group = bill.groups.find(g => g.items.some(x => x.pid === pid && x.id === itemId));
  const hostGroup = group ? priceFor(o, group.label, group.keys) : null;
  const s = openSheet(`<h2>Change price</h2><p class="sub">${esc(p.name)} ordered ${qtyOf(it)}× <b dir="auto">${esc(it.name)}</b>${it.note ? ` (${esc(it.note)})` : ''}. You can change its price, not the food.</p>
    <div class="money"><span>Price ${esc(p.name)} typed</span><b>${itemPrice(it) == null ? 'none' : money(itemPrice(it), o.currency)}</b></div>
    ${hostGroup != null ? `<div class="money"><span>Your price for everyone's ${esc(group.label)}</span><b>${money(hostGroup, o.currency)}</b></div>` : ''}
    <div class="field" style="margin-top:12px"><label>Price of one for ${esc(p.name)}</label><input class="inp" id="pr-v" inputmode="decimal" value="${isSet(cur) ? cur : ''}" placeholder="${esc(o.currency)}"></div>
    <button class="btn primary block" data-a="savePrice">Save price</button>
    ${isSet(cur) ? `<button class="btn block ghost" style="margin-top:6px" data-a="clearPrice">Use the normal price again</button>` : ''}`);
  Object.assign(s, { _pid: pid, _itemId: itemId });
  setTimeout(() => { const i = $('#pr-v'); if (i) i.focus(); }, 200);
}

/* lock now or at a time */
function sheetLock() {
  const o = S.order;
  const s = openSheet(`<h2>Lock Order</h2><p class="sub">When the order is locked, nobody can add, change or remove food. You can unlock it any time.</p>
    <button class="btn primary block big" data-a="lockNow">${ICON.lock} Lock now</button>
    <div class="or">or lock it automatically</div>
    <div class="field"><label>Deadline for orders</label><input class="inp" type="datetime-local" id="lk-at" value="${o.lockAt ? toLocalInput(o.lockAt) : toLocalInput(Date.now() + 36e5 - (Date.now() % 9e5))}"></div>
    <div class="chips" style="margin:-4px 0 14px">${[[15, '15 min'], [30, '30 min'], [60, '1 hour'], [120, '2 hours']].map(([m, l]) => `<button data-a="lockIn" data-v="${m}">In ${l}</button>`).join('')}</div>
    <div class="err" id="lk-err"></div>
    <button class="btn block" data-a="setDeadline">${ICON.clock} Set deadline</button>
    ${o.lockAt ? `<button class="btn block ghost danger" style="margin-top:6px" data-a="clearDeadline">Remove the deadline</button>` : ''}`);
  return s;
}

/* mark as delivered: payment info and fees, then prices */
function sheetDeliver() {
  const o = S.order, f = o.fees || {};
  const mode = o.paymentMode === 'note' ? 'note' : 'url', auto = o.autoFees !== false;
  const s = openSheet(`<h2>Mark Order as Delivered</h2>
    <h3 class="ps-h" style="margin-top:12px">Payment Information</h3>
    <div class="radios"><button class="radio ${mode === 'url' ? 'on' : ''}" data-a="payMode" data-v="url"><span></span>Payment URL</button><button class="radio ${mode === 'note' ? 'on' : ''}" data-a="payMode" data-v="note"><span></span>Note for Members</button></div>
    <div id="dl-url" ${mode === 'url' ? '' : 'hidden'}><div class="inp-icon"><span>${ICON.link}</span><input class="inp" id="dl-link" value="${esc(o.paymentUrl || (S.profile && S.profile.instapay) || '')}" placeholder="Payment URL or InstaPay address" inputmode="url" autocapitalize="none"></div></div>
    <div class="field" style="margin-top:10px"><label>${mode === 'note' ? 'Note for members' : 'Note for members <span class="opt">(optional)</span>'}</label><textarea class="inp area" id="dl-note" rows="2" placeholder="e.g. Pay me by Thursday, cash is fine too" dir="auto">${esc(o.hostNote || '')}</textarea></div>
    <button class="check-row ${auto ? 'on' : ''}" data-a="autoFees"><span class="box"></span>Use automatic calculation for VAT and service charge</button>
    <p class="hint">Works out each person's amount from their own items.</p>
    <div class="grid2" id="dl-fees" ${auto ? '' : 'hidden'}>
      <div class="field"><label>VAT % <span class="opt">(optional)</span></label><input class="inp" id="dl-vat" inputmode="decimal" value="${isSet(f.vat) ? f.vat : 14}"></div>
      <div class="field"><label>Service % <span class="opt">(optional)</span></label><input class="inp" id="dl-svc" inputmode="decimal" value="${isSet(f.service) ? f.service : 12}"></div>
    </div>
    <div id="dl-vs" class="row" style="margin:0 0 14px" ${auto ? '' : 'hidden'}><div style="flex:1"><b style="font-size:14.5px">Add VAT on the service charge</b><div class="sub">How most restaurants in Egypt do it.</div></div><button class="switch ${f.vatOnService !== false ? 'on' : ''}" id="dl-vos" data-a="toggleSwitch"></button></div>
    <div class="field"><label>Delivery charge <span class="opt">(optional)</span></label><div class="inp-icon"><span>${ICON.truck}</span><input class="inp" id="dl-del" inputmode="decimal" value="${f.delivery || ''}" placeholder="0"></div>
      <p class="hint" style="margin:6px 2px 0">Divided equally among everyone who ordered food.</p></div>
    <div class="err" id="dl-err"></div>
    <div class="row"><button class="btn ghost" data-a="closeSheet">Cancel</button><button class="btn primary" data-a="deliverNext">Next: check prices</button></div>`);
  s._mode = mode; s._auto = auto;
}

// hosts: change anyone's food, rename offline members, and (main host) promote co-hosts
function sheetPerson(pid) {
  const o = S.order, p = S.people.find(x => x.id === pid);
  if (!p || !isHost()) return;
  const co = (o.coHosts || []).includes(p.id), main = p.id === o.hostUid;
  openSheet(`<h2>${esc(p.name)}</h2><p class="sub">${p.noApp ? 'Offline member, added by a host.' : main ? 'Main host' : co ? 'Co-host' : 'Member'}. Tap an item to change it.</p>
    <div class="card">${(p.items || []).length ? p.items.map(it => `<div class="item-line tap" data-a="itemSheet" data-p="${p.id}" data-id="${it.id}"><span class="q">${qtyOf(it)}×</span><span class="grow" dir="auto">${esc(it.name)}${(it.extras || []).length ? `<span class="note">+ ${it.extras.map(e => esc(e.name)).join(', ')}</span>` : ''}${it.note ? `<span class="note" dir="auto">${esc(it.note)}</span>` : ''}</span><span class="chev">${ICON.edit.replace('<svg', '<svg width="16" height="16"')}</span></div>`).join('') : '<p class="sub">No food yet.</p>'}</div>
    <button class="btn primary block" data-a="itemSheet" data-p="${p.id}">${ICON.plus} Add food for ${esc(p.name)}</button>
    ${p.noApp ? `<div class="field" style="margin-top:14px"><label>Name</label><div class="row"><input class="inp" id="ps-name" value="${esc(p.name)}" style="flex:1"><button class="btn" style="flex:none" data-a="renamePerson" data-id="${p.id}">Rename</button></div></div>` : ''}
    ${isMainHost() && !p.noApp && !main ? (co
      ? `<button class="btn block" style="margin-top:10px" data-a="coHost" data-id="${p.id}" data-v="0">${ICON.crown} Remove as co-host</button>`
      : `<button class="btn block" style="margin-top:10px" data-a="coHost" data-id="${p.id}" data-v="1">${ICON.crown} Make co-host</button><p class="hint" style="margin-top:6px">A co-host can lock the order, change anyone's food and prices, and mark it as delivered, just like you.</p>`) : ''}
    ${!main && (p.noApp || isMainHost()) ? `<button class="btn block ghost danger" style="margin-top:6px" data-a="removePerson" data-id="${p.id}">Remove ${esc(p.name)} from the order</button>` : ''}`);
}
function sheetAddPerson() {
  openSheet(`<h2>Add Member</h2><p class="sub">For someone who doesn't have Lamma. You add their food for them, and they're included in the split.</p>
    <div class="field"><label>Name</label><input class="inp" id="ap-name" placeholder="e.g. Sara" dir="auto"></div>
    <button class="btn primary block" data-a="saveNewPerson">Add</button>`);
  setTimeout(() => { const i = $('#ap-name'); if (i) i.focus(); }, 200);
}

/* shared items (host only) */
function sheetShared(id) {
  const o = S.order;
  const s0 = id ? (o.shared || []).find(x => x.id === id) : null;
  const st = { qty: s0 ? qtyOf(s0) : 1, sharers: new Set(s0 ? s0.sharers : S.people.map(p => p.id)) };
  const s = openSheet(`<h2>${s0 ? 'Shared item' : 'Add a shared item'}</h2><p class="sub">Food that several people share, like family fries or a big pizza. Its price is split between them.</p>
    <div class="field"><label>Food</label><input class="inp" id="sh-name" value="${esc(s0 ? s0.name : '')}" placeholder="e.g. Family fries" dir="auto"></div>
    <div class="grid2">
      <div class="field"><label>Price of one</label><input class="inp" id="sh-price" inputmode="decimal" placeholder="${esc(o.currency)}" value="${s0 && itemPrice(s0) != null ? itemPrice(s0) : ''}"></div>
      <div class="field"><label>How many</label><div class="stepper"><button data-a="shQty" data-v="-1">−</button><span class="v" id="sh-qty">${st.qty}</span><button data-a="shQty" data-v="1">+</button></div></div>
    </div>
    <div class="field"><label>Shared by</label><div class="chips">${S.people.map(p => `<button class="${st.sharers.has(p.id) ? 'on' : ''}" data-a="shWho" data-id="${p.id}">${esc(p.name)}</button>`).join('')}</div></div>
    <button class="btn primary block" data-a="saveShared">${s0 ? 'Save' : 'Add'}</button>
    ${s0 ? `<button class="btn block ghost danger" style="margin-top:6px" data-a="deleteShared">Remove</button>` : ''}`);
  s._st = st; s._id = id || null;
}

function sheetOrderMenu() {
  const o = S.order, host = isHost();
  const row = (a, t, sub, danger) => `<div class="list-row tap" data-a="${a}"><div class="grow"><div class="t" ${danger ? 'style="color:var(--danger)"' : ''}>${t}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div></div>`;
  openSheet(`<h2 dir="auto">${esc(o.place)}</h2><div class="card flush" style="margin-top:10px">
    ${row('shareInvite', 'Share invite link', `Group code ${esc(o.code)}`)}
    ${host ? `${row('editOrder', 'Edit order', 'Name, description, deadline, menu and photos')}
      ${!delivered(o) ? (locked(o) ? row('unlock', 'Unlock order', 'Friends can change their food again.') : row('lockSheet', 'Lock order', o.lockAt ? `Locks by itself ${fmtWhen(o.lockAt)}` : 'Now or at a deadline')) : ''}
      ${row('screenFromMenu', 'Set item prices', 'Change the price of any food or extra')}
      ${row('shareBill', 'Share the bill in a chat')}
      ${delivered(o) ? row('undeliver', 'Undo delivered', 'Back to ordering, still locked') : ''}
      ${isMainHost() ? row('deleteOrder', 'Delete the order', '', true) : !locked(o) ? row('leaveOrder', 'Leave this order', 'Your food will be removed.', true) : ''}`
      : `${S.me && !locked(o) ? row('leaveOrder', 'Leave this order', 'Your food will be removed.', true) : ''}`}
  </div>`);
}
function sheetHelp() { openSheet(`<h2>How Lamma works</h2>${HELP}<button class="btn primary block" data-a="closeSheet">Got it</button>`); }
function sheetHomeMenu() {
  openSheet(`<h2 class="ar-name">لمَّة</h2><div class="card flush" style="margin-top:10px">
    <div class="list-row tap" data-a="go" data-v="profile"><span style="font-size:22px">🏆</span><div class="grow"><div class="t">My profile and badges</div><div class="sub">Achievements and game wins</div></div></div>
    <div class="list-row tap" data-a="go" data-v="menus">${ICON.photo.replace('<svg', '<svg width="22" height="22"')}<div class="grow"><div class="t">Saved menus</div><div class="sub">${plural(S.menus.length, 'menu')}</div></div></div>
    <div class="list-row tap" data-a="go" data-v="settings">${ICON.edit.replace('<svg', '<svg width="22" height="22"')}<div class="grow"><div class="t">Settings</div><div class="sub">Name, payment link, dark mode</div></div></div>
    <div class="list-row tap" data-a="helpSheet">${ICON.help.replace('<svg', '<svg width="22" height="22"')}<div class="grow"><div class="t">How Lamma works</div><div class="sub">A quick guide</div></div></div>
  </div>`);
}

async function showPhotos(menuId) {
  const v = document.createElement('div');
  v.className = 'viewer';
  v.innerHTML = `<div class="bar"><span id="pv-n">Loading…</span><button class="icon-btn" data-a="closeViewer" aria-label="Close">${ICON.close}</button></div><div class="strip"></div>`;
  document.body.appendChild(v);
  const photos = await loadPhotos(menuId);
  const strip = $('.strip', v), n = $('#pv-n', v);
  strip.innerHTML = photos.map(p => `<img src="${p.data}" alt="">`).join('');
  const count = () => { n.textContent = photos.length ? `${Math.round(strip.scrollLeft / Math.max(1, strip.clientWidth)) + 1} of ${photos.length}` : 'No photos'; };
  strip.addEventListener('scroll', count); count();
}

/* ---------------- texts ---------------- */
function billText(o, bill) {
  const lines = bill.rows.filter(r => r.sub > 0).map(r => `${r.p.name}: ${money(r.total, o.currency)}${r.p.id === o.hostUid ? ' (host)' : r.p.paid ? ' - paid' : ''}`);
  return `${o.place} order\n\n${lines.join('\n')}\n\nTotal: ${money(bill.grand, o.currency)}${o.paymentUrl && o.paymentMode !== 'note' ? `\nPay here: ${o.paymentUrl}` : ''}${o.hostNote ? `\n${o.hostNote}` : ''}\n\nSplit with Lamma`;
}
function csvOf(o, bill) {
  const q = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const r2 = n => (Math.round((n || 0) * 100) / 100).toFixed(2);
  const out = [[q(o.place), q(new Date(ts(o.createdAt)).toLocaleString('en-GB')), q(o.currency)].join(','), '',
    ['Person', 'Food', 'Qty', 'Price of one', 'Amount', 'Shared by', 'Note'].map(q).join(',')];
  for (const r of bill.rows) {
    for (const l of r.lines) out.push([q(r.p.name), q(l.n), l.q, l.u == null ? '' : r2(l.u), r2(l.a), l.split || '', q(l.note)].join(','));
    for (const x of r.extras) out.push([q(r.p.name), q(`+ ${x.n} (on ${x.on})`), x.q, x.u == null ? '' : r2(x.u), r2(x.a), '', ''].join(','));
  }
  out.push('', ['Person', 'Items', 'Extras', 'Discount', 'Service', 'VAT', 'Delivery', 'Receipt match', 'Total', 'Got food', 'Paid'].map(q).join(','));
  for (const r of bill.rows) out.push([q(r.p.name), r2(r.items), r2(r.extrasT), r2(r.disc), r2(r.service), r2(r.vat), r2(r.delivery), r2(r.adj), r2(r.total), r.p.received ? 'yes' : 'no', r.p.id === o.hostUid ? 'host' : r.p.paid ? 'yes' : 'no'].join(','));
  out.push(['"Total"', '', '', r2(bill.disc), '', '', '', '', r2(bill.grand), '', ''].join(','));
  out.push('', ['Food', 'Qty', 'Spellings combined'].map(q).join(','));
  for (const g of bill.groups) out.push([q(g.label), sumQty(g.items), q(g.variants.join(' / '))].join(','));
  for (const x of extraGroups(S.people)) out.push([q('+ ' + x.label), x.qty, ''].join(','));
  return out.join('\r\n');
}
const inviteLink = o => `${CFG.webBase}/j/?c=${o.code}`;

/* ---------------- actions ---------------- */
const upd = patch => FB.updateDoc(D('orders', S.order.id), patch).catch(e => { console.error(e); toast('Could not save. Check your internet.'); });
const groupByAnchor = anchor => computeBill(S.order, S.people).groups.find(x => x.anchor === anchor);
const A = {
  authMode: el => { S.authMode = el.dataset.v; render(); },
  doAuth: () => doAuth(),
  google: () => googleSignIn(),
  homeTab: el => { S.homeTab = el.dataset.v; if (S.view !== 'home') S.view = 'home'; render(); window.scrollTo(0, 0); },
  go: el => { closeSheet(); S.view = el.dataset.v; render(); window.scrollTo(0, 0); },
  openNote: el => {
    const x = S.inbox.find(n => n.id === el.dataset.id);
    if (el.classList.contains('banner')) el.remove();
    if (!x) return;
    if (!x.read) FB.updateDoc(D('users', S.user.uid, 'inbox', x.id), { read: true }).catch(() => { });
    if (x.orderId) openOrder(x.orderId);
  },
  readAll: () => { const b = FB.writeBatch(db); S.inbox.filter(x => !x.read).forEach(x => b.update(D('users', S.user.uid, 'inbox', x.id), { read: true })); b.commit().catch(() => { }); },
  helpSheet: () => sheetHelp(),
  homeMenu: () => sheetHomeMenu(),
  home: () => goHome(),
  details: () => showScreen('details'),
  screen: el => showScreen(el.dataset.v),
  screenFromMenu: () => { closeSheet(); showScreen('prices'); },
  listTab: el => { S.listTab = el.dataset.v; render(); },
  openOrder: el => openOrder(el.dataset.id),
  newOrder: () => sheetOrder(false),
  editOrder: () => sheetOrder(true),
  joinSheet: () => sheetJoin(),
  doJoin: () => joinByCode($('#jn-code').value),
  joinThis: () => joinByCode(S.order.code),
  closeSheet: () => closeSheet(),
  closeViewer: () => { const v = $('.viewer'); if (v) v.remove(); },
  toggleSwitch: el => el.classList.toggle('on'),
  useMenu: async el => {
    const m = S.menus.find(x => x.id === el.dataset.id), s = $('.sheet');
    $$('[data-a="useMenu"]').forEach(b => b.classList.toggle('on', b === el));
    $('#od-place').value = m.name; $('#od-web').value = m.website || ''; $('#od-maps').value = m.maps || '';
    s._st.menuId = m.id; s._st.photos = await loadPhotos(m.id);
    drawPhotoGrid('#od-photos', s._st);
  },
  addPhotos: () => { const s = $('.sheet'); photoTarget = { st: s._st, sel: $('#od-photos') ? '#od-photos' : '#mn-photos' }; $('#file-input').click(); },
  rmPhoto: el => { const s = $('.sheet'); s._st.photos.splice(+el.dataset.v, 1); drawPhotoGrid($('#od-photos') ? '#od-photos' : '#mn-photos', s._st); },
  saveOrder: () => saveOrder(),
  menuSheet: el => sheetMenu(el.dataset.id),
  saveMenuSheet: async () => {
    const s = $('.sheet'), name = $('#mn-name').value.trim();
    if (!name) { $('#mn-err').textContent = 'Type the restaurant name.'; return; }
    const b = $('#mn-go'); b.disabled = true; b.textContent = 'Saving…';
    try { await saveMenu(s._st.menuId, { name, website: $('#mn-web').value.trim(), maps: $('#mn-maps').value.trim() }, s._st); closeSheet(); toast('Menu saved'); }
    catch (e) { b.disabled = false; b.textContent = 'Save menu'; $('#mn-err').textContent = 'Could not save. Check your internet and try again.'; }
  },
  orderFromMenu: async () => {
    const id = $('.sheet')._st.menuId;
    await sheetOrder(false);
    const btn = $(`[data-a="useMenu"][data-id="${id}"]`);
    if (btn) A.useMenu(btn);
  },
  deleteMenu: async () => {
    if (!await ask({ title: 'Delete this menu?', body: 'Its photos will be deleted too.', ok: 'Delete', danger: true, icon: ICON.trash })) return;
    const id = $('.sheet')._st.menuId;
    const ph = await FB.getDocs(C('menus', id, 'photos'));
    for (const d of ph.docs) await FB.deleteDoc(d.ref);
    await FB.deleteDoc(D('menus', id));
    closeSheet(); toast('Menu deleted');
  },
  photos: el => showPhotos(el.dataset.id),
  url: el => openUrl(el.dataset.v),
  orderMenu: () => sheetOrderMenu(),
  shareInvite: () => { closeSheet(); const o = S.order; share(`Join my ${o.place} order on Lamma:\n${inviteLink(o)}\n\nOr open Lamma, tap “Join” and type the group code ${o.code}${o.lockAt && !locked(o) ? `\n\nAdd your food before ${fmtWhen(o.lockAt)}` : ''}`); },
  copyCode: () => copy(S.order.code),

  /* lock */
  lockSheet: () => { closeSheet(); sheetLock(); },
  lockNow: async () => {
    await upd({ open: false }); closeSheet(); toast('Order locked');
    notifyMembers({ type: 'locked', title: `${S.order.place} is locked`, body: `${S.profile.name} locked the order. Food can't be added or changed now.` });
  },
  lockIn: el => { $('#lk-at').value = toLocalInput(Date.now() + +el.dataset.v * 60000); },
  setDeadline: async () => {
    const r = readLockInput('#lk-at');
    if (r.error || !r.lockAt) { $('#lk-err').textContent = r.error || 'Pick a time.'; return; }
    await upd({ lockAt: r.lockAt, open: true }); closeSheet(); toast(`The order locks ${fmtWhen(r.lockAt)}`);
    notifyMembers({ type: 'deadline', title: `Add your food before ${fmtTime(r.lockAt)}`, body: `${S.order.place} locks ${fmtWhen(r.lockAt)}.` });
  },
  clearDeadline: async () => { await upd({ lockAt: null }); closeSheet(); toast('Deadline removed'); },
  unlock: async () => {
    closeSheet();
    const o = S.order;
    await upd({ open: true, ...(deadlinePassed(o) ? { lockAt: null } : {}) });
    toast('Order unlocked. Friends can change their food again.');
    notifyMembers({ type: 'unlocked', title: `${o.place} is open again`, body: 'You can add or change your food.' });
  },

  /* delivered */
  deliverSheet: () => sheetDeliver(),
  payMode: el => {
    const s = $('.sheet'); s._mode = el.dataset.v;
    $$('.radio', s).forEach(b => b.classList.toggle('on', b === el));
    $('#dl-url').hidden = s._mode !== 'url';
  },
  autoFees: el => {
    const s = $('.sheet'); s._auto = !s._auto;
    el.classList.toggle('on', s._auto); $('#dl-fees').hidden = !s._auto; $('#dl-vs').hidden = !s._auto;
  },
  deliverNext: async () => {
    const s = $('.sheet'), o = S.order;
    const paymentUrl = $('#dl-link').value.trim(), hostNote = $('#dl-note').value.trim();
    if (s._mode === 'url' && !paymentUrl) { $('#dl-err').textContent = 'Add a payment link, or choose “Note for Members”.'; return; }
    if (s._mode === 'note' && !hostNote) { $('#dl-err').textContent = 'Write a note for the members.'; return; }
    const fees = { ...o.fees, vat: num($('#dl-vat').value), service: num($('#dl-svc').value), vatOnService: $('#dl-vos').classList.contains('on'), delivery: num($('#dl-del').value) };
    await upd({ paymentMode: s._mode, paymentUrl: s._mode === 'url' ? paymentUrl : '', hostNote, autoFees: s._auto, fees });
    closeSheet();
    S.delivering = true; S.screen = 'prices'; render(); window.scrollTo(0, 0);
  },
  confirmDeliver: async () => {
    const bill = computeBill(S.order, S.people);
    if (bill.missing && !await ask({ title: `${plural(bill.missing, 'price')} still missing`, body: 'Missing prices count as 0 in the bill. Deliver anyway?', ok: 'Deliver anyway' })) return;
    await upd({ stage: 'delivered', open: false, deliveredAt: Date.now() });
    const o = S.order;
    await decideWinners(o, bill.grand);
    for (const r of bill.rows) if (!r.p.noApp && r.p.id !== o.hostUid && r.total > 0)
      notifyUsers([r.p.id], { type: 'delivered', title: `${o.place} was delivered`, body: `You owe ${money(r.total, o.currency)}. Tap to see the breakdown and pay ${o.hostName}.`, amount: Math.round(r.total * 100) / 100 });
    S.delivering = false; showScreen('details');
    toast('Order delivered. Everyone can see what they owe.');
  },
  undeliver: async () => { closeSheet(); await upd({ stage: 'open' }); toast('Back to ordering. The order is still locked.'); },
  payLink: () => {
    const u = S.order.paymentUrl;
    if (/^(https?:\/\/|ipn\.eg|www\.)/i.test(u)) openUrl(u); else { copy(u); toast('Payment address copied'); }
  },
  copyNote: () => copy(S.order.hostNote),
  markPaid: async el => {
    const v = el.dataset.v === '1';
    try {
      await FB.updateDoc(D('orders', S.order.id, 'people', S.user.uid), { paid: v });
      if (v) {
        toast('Marked as paid. The host will see it.');
        const o = S.order, r = computeBill(o, S.people).rows.find(x => x.p.id === S.user.uid);
        notifyUsers(hostsOf(o), { type: 'paid', title: `${S.profile.name} paid`, body: `${o.place}: ${r ? money(r.total, o.currency) : ''} marked as paid. Check it in the Delivery Checklist.` });
        if (N && N.cancel) N.cancel('pay-' + o.id);
      }
    }
    catch (e) { toast('Could not save. Check your internet.'); }
  },

  /* host checklist and prices */
  tick: el => { const p = S.people.find(x => x.id === el.dataset.id), k = el.dataset.k; FB.updateDoc(D('orders', S.order.id, 'people', p.id), { [k]: !p[k] }).catch(() => toast('Could not save')); },
  remind: el => {
    const o = S.order, r = computeBill(o, S.people).rows.find(x => x.p.id === el.dataset.id);
    if (!r.p.noApp) {
      notifyUsers([r.p.id], { type: 'reminder', title: `Payment reminder: ${money(r.total, o.currency)}`, body: `For ${o.place}. Tap to pay ${o.hostName}.` });
      toast(`Reminder sent to ${r.p.name}`);
      return;
    }
    share(`Hi ${r.p.name}, your share of the ${o.place} order is ${money(r.total, o.currency)}.${o.paymentUrl && o.paymentMode !== 'note' ? `\nPay here: ${o.paymentUrl}` : ''}\nThanks!`);
  },
  priceSheet: el => sheetPrice(el.dataset.p, el.dataset.id),
  savePrice: async () => {
    const s = $('.sheet'), v = $('#pr-v').value.trim();
    await upd({ itemPrices: { ...(S.order.itemPrices || {}), [itemKey(s._pid, s._itemId)]: v === '' ? null : num(v) } });
    closeSheet();
    const p = personFor(s._pid), it = p && (p.items || []).find(i => i.id === s._itemId);
    if (p && it && v !== '' && !p.noApp) notifyUsers([p.id], { type: 'price', title: `Price changed: ${it.name}`, body: `${S.profile.name} set it to ${money(num(v), S.order.currency)} in ${S.order.place}.` });
  },
  clearPrice: async () => {
    const s = $('.sheet'), ip = { ...(S.order.itemPrices || {}) };
    delete ip[itemKey(s._pid, s._itemId)];
    await upd({ itemPrices: ip }); closeSheet();
  },
  personSheet: el => sheetPerson(el.dataset.id),
  memberSheet: el => sheetPerson(el.dataset.id),
  coHost: async el => {
    const o = S.order, p = S.people.find(x => x.id === el.dataset.id), on = el.dataset.v === '1';
    await upd({ coHosts: on ? FB.arrayUnion(p.id) : FB.arrayRemove(p.id) });
    closeSheet();
    toast(on ? `${p.name} is now a co-host` : `${p.name} is no longer a co-host`);
    notifyUsers([p.id], on ? { type: 'cohost', title: `You're now a co-host of ${o.place}`, body: `${S.profile.name} made you a host. You can lock the order, change food and prices, and mark it as delivered.` }
      : { type: 'cohost', title: `You're no longer a co-host of ${o.place}`, body: `${S.profile.name} changed the hosts.` });
  },
  addPerson: () => sheetAddPerson(),
  saveNewPerson: async () => {
    const name = $('#ap-name').value.trim(); if (!name) return;
    await FB.setDoc(D('orders', S.order.id, 'people', 'x_' + rid(10)), { uid: null, name, items: [], noApp: true, joinedAt: Date.now(), updatedAt: Date.now() });
    closeSheet(); toast(`${name} added`);
  },
  renamePerson: async el => { const name = $('#ps-name').value.trim(); if (!name) return; await FB.updateDoc(D('orders', S.order.id, 'people', el.dataset.id), { name }); closeSheet(); },
  removePerson: async el => {
    const p = S.people.find(x => x.id === el.dataset.id);
    if (!p || !(p.noApp || isMainHost()) || !await ask({ title: `Remove ${p.name}?`, body: 'Their food will be removed from this order too.', ok: 'Remove', danger: true, icon: ICON.trash })) return;
    if (!p.noApp) { notifyUsers([p.id], { type: 'removed', title: `You were removed from ${S.order.place}`, body: `${S.profile.name} removed you from the order.` }); upd({ coHosts: FB.arrayRemove(p.id) }); }
    await FB.deleteDoc(D('orders', S.order.id, 'people', p.id));
    await upd({ shared: (S.order.shared || []).map(s => ({ ...s, sharers: (s.sharers || []).filter(x => x !== p.id) })) });
    closeSheet();
  },

  /* food */
  itemSheet: el => sheetItem(el.dataset.id || null, el.dataset.p || null),
  pickName: el => {
    $('#it-name').value = el.dataset.v;
    // reuse the price someone already typed for the same food
    const g = computeBill(S.order, S.people).groups.find(x => x.label === el.dataset.v);
    const known = g && g.items.map(itemPrice).find(v => v != null);
    if (known != null && !$('#it-price').value) $('#it-price').value = known;
  },
  pickExtra: el => {
    $('#ex-name').value = el.dataset.v;
    const x = extraGroups(S.people).find(g => g.label === el.dataset.v);
    if (x && x.prices.length && !$('#ex-price').value) $('#ex-price').value = x.prices[0];
  },
  addMine: async el => {
    const src = S.people.find(p => p.id === el.dataset.p), it = src && (src.items || []).find(i => i.id === el.dataset.id);
    if (!it || !S.me) return;
    const ok = await changeItems(S.me.id, items => {
      const same = items.find(i => F.normalize(i.name) === F.normalize(it.name) && !i.note && !(i.extras || []).length);
      if (same) same.qty = qtyOf(same) + 1;
      else items.push({ id: rid(8), name: it.name, qty: 1, note: '', price: itemPrice(it), extras: [] });
    });
    if (ok) sheetPlaced(it.name);
  },
  qty: el => { const v = $('#it-qty'); v.textContent = Math.max(1, Math.min(99, +v.textContent + +el.dataset.v)); },
  itemQty: el => {
    const p = personFor(el.dataset.p), it0 = p && (p.items || []).find(i => i.id === el.dataset.id);
    return changeItems(el.dataset.p, items => {
      const it = items.find(i => i.id === el.dataset.id);
      if (it) it.qty = Math.max(1, Math.min(99, qtyOf(it) + +el.dataset.v));
    }, it0 ? `${it0.name} quantity changed` : '');
  },
  saveItem: async () => {
    const s = $('.sheet'), name = $('#it-name').value.trim();
    if (!name) { $('#it-name').focus(); return; }
    const pr = $('#it-price').value.trim();
    const data = { name, qty: +$('#it-qty').textContent, note: $('#it-note').value.trim(), price: pr === '' ? null : num(pr) };
    const ok = await changeItems(s._pid, items => {
      if (s._itemId) { const i = items.findIndex(x => x.id === s._itemId); if (i >= 0) items[i] = { ...items[i], ...data }; }
      else items.push({ id: rid(8), ...data, extras: [] });
    }, `${s._itemId ? 'changed' : 'added'} ${data.qty}× ${name}`);
    if (ok) { if (s._itemId) { closeSheet(); toast('Saved'); } else if (s._pid === S.user.uid) sheetPlaced(name); else { closeSheet(); toast(`Added ${name}`); } }
  },
  deleteItem: async el => {
    const p = personFor(el.dataset.p), it = p && (p.items || []).find(i => i.id === el.dataset.id);
    if (!it || !await ask({ title: 'Remove this item?', body: `${qtyOf(it)} × ${it.name}`, ok: 'Remove', danger: true, icon: ICON.trash })) return;
    if (await changeItems(p.id, items => items.splice(items.findIndex(i => i.id === it.id), 1), `removed ${it.name}`)) closeSheet();
  },
  extraSheet: el => sheetExtra(el.dataset.p, el.dataset.id, el.dataset.x || null),
  saveExtra: async () => {
    const s = $('.sheet'), name = $('#ex-name').value.trim();
    if (!name) { $('#ex-name').focus(); return; }
    const pr = $('#ex-price').value.trim();
    const data = { name, price: pr === '' ? null : num(pr) };
    const ok = await changeItems(s._pid, items => {
      const it = items.find(i => i.id === s._itemId); if (!it) return;
      if (s._extraId) { const i = it.extras.findIndex(x => x.id === s._extraId); if (i >= 0) it.extras[i] = { ...it.extras[i], ...data }; }
      else it.extras.push({ id: rid(8), ...data, byName: S.profile.name });
    }, `extra ${name}`);
    if (ok) closeSheet();
  },
  deleteExtra: el => changeItems(el.dataset.p, items => {
    const it = items.find(i => i.id === el.dataset.id);
    if (it) it.extras = it.extras.filter(x => x.id !== el.dataset.x);
  }),
  leaveOrder: async () => {
    if (!await ask({ title: 'Leave this order?', body: 'Your food will be removed from it.', ok: 'Leave', danger: true })) return;
    closeSheet();
    const uid = S.user.uid, id = S.order.id;
    notifyUsers(hostsOf(S.order), { type: 'left', title: `${S.profile.name} left ${S.order.place}`, body: 'Their food was removed from the order.' });
    await FB.deleteDoc(D('orders', id, 'people', uid)).catch(() => { });
    await FB.deleteDoc(D('users', uid, 'joined', id)).catch(() => { });
    goHome();
  },

  /* foods list */
  toggleSmart: () => upd({ smart: S.order.smart === false }),
  recv: el => {
    const o = S.order, g = groupByAnchor(el.dataset.v);
    const v = Math.max(0, Math.min(sumQty(g.items), ((o.delivered || {})[g.anchor] || 0) + +el.dataset.d));
    upd({ delivered: { ...(o.delivered || {}), [g.anchor]: v } });
  },
  split: el => {
    const o = S.order, g = groupByAnchor(el.dataset.v);
    const pairs = new Set(o.blocks || []);
    for (let i = 0; i < g.keys.length; i++) for (let j = i + 1; j < g.keys.length; j++) pairs.add(F.pairKey(g.keys[i], g.keys[j]));
    upd({ blocks: [...pairs], joins: (o.joins || []).filter(([a, b]) => !(g.keys.includes(a) && g.keys.includes(b))) });
    toast('Split apart');
  },
  copyFoods: () => {
    const o = S.order, g = computeBill(o, S.people).groups, x = extraGroups(S.people);
    copy(`${o.place} order:\n` + g.map(v => `${sumQty(v.items)} × ${v.label}`).join('\n') + (x.length ? '\n\nExtras:\n' + x.map(v => `${v.qty} × ${v.label}`).join('\n') : ''));
  },
  sharedSheet: el => sheetShared(el.dataset.id || null),
  shQty: el => { const s = $('.sheet'); s._st.qty = Math.max(1, Math.min(99, s._st.qty + +el.dataset.v)); $('#sh-qty').textContent = s._st.qty; },
  shWho: el => { const st = $('.sheet')._st, id = el.dataset.id; if (st.sharers.has(id)) st.sharers.delete(id); else st.sharers.add(id); el.classList.toggle('on', st.sharers.has(id)); },
  saveShared: async () => {
    const s = $('.sheet'), st = s._st, name = $('#sh-name').value.trim();
    if (!name || !st.sharers.size) { toast(name ? 'Pick who shares it' : 'Type the food name'); return; }
    const list = [...(S.order.shared || [])];
    const pr = $('#sh-price').value.trim();
    const data = { name, qty: st.qty, sharers: [...st.sharers], price: pr === '' ? null : num(pr) };
    if (s._id) { const i = list.findIndex(x => x.id === s._id); list[i] = { ...list[i], ...data }; } else list.push({ id: rid(8), ...data });
    await upd({ shared: list }); closeSheet();
  },
  deleteShared: async () => { const s = $('.sheet'); await upd({ shared: (S.order.shared || []).filter(x => x.id !== s._id) }); closeSheet(); },
  discType: el => upd({ 'fees.discountType': el.dataset.v }),
  shareBill: () => { closeSheet(); share(billText(S.order, computeBill(S.order, S.people))); },
  exportCsv: () => {
    closeSheet();
    const o = S.order, csv = csvOf(o, computeBill(o, S.people));
    const name = `Lamma-${o.place.replace(/[^\p{L}\p{N}]+/gu, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    if (N) { if (N.saveFile(name, 'text/csv', csv)) toast('Saved to Downloads/Lamma'); }
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = name; a.click(); }
  },
  deleteOrder: async () => {
    if (!await ask({ title: 'Delete this order?', body: 'It will be deleted for everyone. This cannot be undone.', ok: 'Delete', danger: true, icon: ICON.trash })) return;
    const o = S.order;
    closeSheet(); stop('order');
    try {
      for (const sub of ['people', 'scores', 'guesses']) {
        const ps = await FB.getDocs(C('orders', o.id, sub)).catch(() => ({ docs: [] }));
        for (const d of ps.docs) await FB.deleteDoc(d.ref).catch(() => { });
      }
      await FB.deleteDoc(D('codes', o.code)).catch(() => { });
      await FB.deleteDoc(D('orders', o.id));
      toast('Order deleted');
    } catch (e) { toast('Could not delete everything. Try again.'); }
    goHome();
  },
  saveSettings: async () => {
    const name = $('#st-name').value.trim(), instapay = $('#st-ip').value.trim();
    if (!name) return toast('Type your name');
    await FB.updateDoc(D('users', S.user.uid), { name, instapay });
    for (const o of S.hosted) if (!delivered(o)) FB.updateDoc(D('orders', o.id), { hostName: name }).catch(() => { });
    toast('Saved');
  },
  notifySettings: () => N.openNotifySettings(),
  playDash: () => {
    const o = S.order, uid = S.user.uid;
    const mine = S.scores.find(x => x.id === uid);
    window.LammaDash.start({
      best: mine ? mine.best : 0,
      onEnd: score => {
        if (score > num(S.profile.dashBest)) { S.profile.dashBest = score; FB.updateDoc(D('users', uid), { dashBest: score }).catch(() => { }); }
        const cur = S.scores.find(x => x.id === uid);
        if (score > 0 && (!cur || score > cur.best) && !delivered(S.order))
          FB.setDoc(D('orders', o.id, 'scores', uid), { name: S.profile.name, best: score, at: Date.now() }).catch(e => console.warn('score', e));
      },
    });
  },
  saveGuess: async () => {
    const v = num($('#guess-v').value);
    if (!(v > 0)) { toast('Type your guess for the total'); return; }
    try { await FB.setDoc(D('orders', S.order.id, 'guesses', S.user.uid), { name: S.profile.name, guess: v, at: Date.now() }); toast('Guess saved. Good luck!'); }
    catch (e) { toast(delivered(S.order) ? 'The order was already delivered.' : 'Could not save. Check your internet.'); }
  },
  linkGoogle: () => linkGoogle(),
  search: () => { closeSheet(); openSearch(); },
  closeSearch: () => closeSearch(),
  reload: () => {
    try { sessionStorage.setItem('lamma.reopen', S.view === 'order' && S.order ? S.order.id : ''); } catch (e) { }
    remember(); location.reload();
  },
  badgeFilter: el => { S.badgeFilter = el.dataset.v; render(); },
  avatarSheet: () => sheetAvatar(),
  avPick: el => {
    const d = S.avDraft, k = el.dataset.k;
    if (k === 'init') { d.photo = ''; d.e = ''; }
    else if (k === 'e') { d.photo = ''; d.e = el.dataset.v; }
    else { d.photo = ''; d.c = el.dataset.v; }
    avPreview();
  },
  avPhoto: () => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
    i.onchange = async () => { const f = i.files[0]; if (!f) return; try { S.avDraft.photo = await photoToAvatar(f); avPreview(); } catch (e) { toast("Couldn't read that photo"); } };
    i.click();
  },
  avSave: async () => {
    const d = S.avDraft, a = d.photo ? { photo: d.photo } : d.e ? { e: d.e, c: d.c } : { c: d.c };
    try { await FB.updateDoc(D('users', S.user.uid), { avatar: a }); S.profile.avatar = a; closeSheet(); render(); toast('Profile picture saved'); }
    catch (e) { toast("Couldn't save. Check your connection."); }
  },
  theme: el => { try { localStorage.setItem('lamma.theme', el.dataset.v); } catch (e) { } applyTheme(); render(); },
  signOut: async () => { if (await ask({ title: 'Sign out of Lamma?', body: 'Your orders stay saved in your account. Sign in again any time to see them.', ok: 'Sign out' })) FB.signOut(auth); },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el) return;
  if (el.tagName === 'A') e.preventDefault();
  const fn = A[el.dataset.a];
  if (fn) { e.stopPropagation(); fn(el, e); }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (e.target.id === 'au-pass' || e.target.id === 'au-user') doAuth();
  if (e.target.id === 'jn-code') A.doJoin();
});

// prices and fees on the Set Item Prices screen save as the host types
let feeTimer = null;
document.addEventListener('input', e => {
  const el = e.target, f = el.dataset && el.dataset.f;
  if (!f || !isHost()) return;
  const o = S.order;
  const v = el.value.trim() === '' ? null : num(el.value);
  if (f === 'price') {
    const g = groupByAnchor(el.dataset.v);
    o.prices = { ...(o.prices || {}) };
    for (const k of g.keys) o.prices[k] = v;
  }
  if (f === 'xprice') o.extraPrices = { ...(o.extraPrices || {}), [el.dataset.v]: v };
  if (f === 'fee') o.fees = { ...o.fees, [el.dataset.v]: el.dataset.v === 'receipt' ? el.value.trim() : num(el.value) };
  refreshPrices();
  clearTimeout(feeTimer);
  feeTimer = setTimeout(() => upd({ prices: o.prices || {}, extraPrices: o.extraPrices || {}, fees: o.fees }), 500);
});

applyTheme();
// the web version (iPhone) gets invite links as ?c=CODE in its own address
if (!N && /[?&]c=/.test(location.search)) { handleLink(location.href); history.replaceState(history.state, '', location.pathname); }
