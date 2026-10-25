'use strict';
/* Lamma: order food together and split the bill. Accounts and live sync run on Firebase. */

const CFG = window.LAMMA_CONFIG;
const N = window.LammaNative || null;
const F = window.Fuzzy;
const FB = window.FB;
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

const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/></svg>',
  orders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 4h14l-1.5 16h-11z"/><path d="M9 8h6"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 21V5M9 8h6"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  google: '<svg class="g-logo" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>',
};

/* ---------------- firebase ---------------- */
const fbApp = FB.initializeApp(CFG.firebase);
const auth = FB.initializeAuth(fbApp, { persistence: FB.browserLocalPersistence });
const db = FB.initializeFirestore(fbApp, { experimentalAutoDetectLongPolling: true });
if (CFG.emulator) {
  FB.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  FB.connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
const D = (...p) => FB.doc(db, ...p);
const C = (...p) => FB.collection(db, ...p);

/* ---------------- state ---------------- */
const S = {
  user: null, profile: null, view: 'loading', navTab: 'orders', authMode: 'signin',
  hosted: [], joined: [], menus: [],
  order: null, people: [], me: null, orderTab: 'checklist', orderMissing: false,
  pendingCode: null,
};
const subs = { global: [], order: [] };
const stop = k => { subs[k].forEach(u => u()); subs[k] = []; };

/* ---------------- native helpers ---------------- */
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  $('#toast').appendChild(t);
  setTimeout(() => t.remove(), 2600);
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
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
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

/* ---------------- money & bill ---------------- */
function money(n, cur) {
  const d = cur === 'KWD' ? 3 : 2;
  const r = Math.round((n || 0) * 10 ** d) / 10 ** d;
  return (Number.isInteger(r) ? r.toLocaleString('en-US') : r.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })) + ' ' + (cur || 'EGP');
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
function priceFor(o, name, keys) {
  const p = o.prices || {};
  const k = F.normalize(name);
  if (p[k] != null && p[k] !== '') return num(p[k]);
  for (const kk of keys || []) if (p[kk] != null && p[kk] !== '') return num(p[kk]);
  return null;
}
function computeBill(o, people) {
  const groups = groupsOf(o, people);
  const keysOf = {};
  for (const g of groups) for (const k of g.keys) keysOf[k] = g.keys;
  const unit = name => priceFor(o, name, keysOf[F.normalize(name)]);
  const rows = new Map(people.map(p => [p.id, { p, lines: [], sub: 0 }]));
  for (const p of people) for (const it of p.items || []) {
    const u = unit(it.name), a = (u || 0) * qtyOf(it);
    const r = rows.get(p.id); r.sub += a; r.lines.push({ n: it.name, q: qtyOf(it), note: it.note || '', u, a });
  }
  for (const s of o.shared || []) {
    const who = (s.sharers || []).filter(id => rows.has(id));
    if (!who.length) continue;
    const u = unit(s.name), a = (u || 0) * qtyOf(s) / who.length;
    for (const id of who) { const r = rows.get(id); r.sub += a; r.lines.push({ n: s.name, q: qtyOf(s), u, a, split: who.length }); }
  }
  const f = o.fees || {};
  const list = [...rows.values()];
  const S0 = list.reduce((a, r) => a + r.sub, 0);
  const disc = Math.min(S0, f.discountType === 'pct' ? S0 * num(f.discount) / 100 : num(f.discount));
  const eaters = list.filter(r => r.sub > 0);
  for (const r of list) {
    r.disc = S0 ? disc * r.sub / S0 : 0;
    const base = r.sub - r.disc;
    r.service = base * num(f.service) / 100;
    r.vat = (base + (f.vatOnService !== false ? r.service : 0)) * num(f.vat) / 100;
    r.delivery = eaters.includes(r) ? num(f.delivery) / eaters.length : 0;
    r.total = base + r.service + r.vat + r.delivery;
    r.adj = 0;
  }
  const computed = list.reduce((a, r) => a + r.total, 0);
  const receipt = num(f.receipt);
  if (receipt > 0 && computed > 0) for (const r of list) { r.adj = r.total * (receipt / computed - 1); r.total += r.adj; }
  const missing = groups.filter(g => g.items.some(it => unit(it.name) == null)).length;
  return { groups, rows: list, sub: S0, disc, computed, grand: list.reduce((a, r) => a + r.total, 0), missing, receipt };
}
// the part of the bill a member is allowed to see: their own share only
function billForPerson(r, o, missing) {
  const R = v => Math.round(v * 100) / 100;
  return {
    lines: r.lines.map(l => ({ n: l.n, q: l.q, a: R(l.a), split: l.split || 0, priced: l.u != null })),
    sub: R(r.sub), disc: R(r.disc), service: R(r.service), vat: R(r.vat), delivery: R(r.delivery), adj: R(r.adj), total: R(r.total),
    vatPct: num(o.fees.vat), servicePct: num(o.fees.service), missing: missing > 0,
  };
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
  try { await FB.signInWithCredential(auth, FB.GoogleAuthProvider.credential(idToken)); }
  catch (e) { toast('Google sign-in failed. Try again.'); }
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

FB.onAuthStateChanged(auth, async user => {
  stop('global'); stop('order');
  S.user = user;
  if (!user) { S.view = 'auth'; render(); return; }
  S.view = 'loading'; render();
  try { S.profile = await ensureProfile(user); } catch (e) { S.profile = { name: 'Me', username: '' }; }
  const uid = user.uid;
  const rerenderHome = () => { if (S.view === 'home') render(); };
  subs.global.push(FB.onSnapshot(D('users', uid), s => { if (s.exists()) S.profile = s.data(); }));
  subs.global.push(FB.onSnapshot(FB.query(C('orders'), FB.where('hostUid', '==', uid)), s => {
    S.hosted = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
    rerenderHome();
  }));
  subs.global.push(FB.onSnapshot(C('users', uid, 'joined'), s => {
    S.joined = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => ts(b.joinedAt) - ts(a.joinedAt));
    rerenderHome();
  }));
  subs.global.push(FB.onSnapshot(FB.query(C('menus'), FB.where('ownerUid', '==', uid)), s => {
    S.menus = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => ts(b.updatedAt) - ts(a.updatedAt));
    rerenderHome();
  }));
  S.view = 'home'; render();
  if (S.pendingCode) { const c = S.pendingCode; S.pendingCode = null; joinByCode(c); }
});

/* ---------------- deep links & back button ---------------- */
function handleLink(url) {
  const u = String(url || '');
  const tok = (u.match(/[?&#]t=([^&#]+)/) || [])[1];
  if (tok && /auth/.test(u)) { googleToken(decodeURIComponent(tok)); return; }
  const code = (u.match(/[?&]c=([A-Za-z0-9]{6})/) || [])[1];
  if (code) { if (S.user) joinByCode(code); else { S.pendingCode = code.toUpperCase(); toast('Sign in to join the order'); } }
}
window.lammaLink = handleLink;
window.lammaBack = () => {
  if ($('.viewer')) { $('.viewer').remove(); return true; }
  if ($('#sheet-root').firstChild) { closeSheet(); return true; }
  if (S.view === 'order') { goHome(); return true; }
  if (S.view === 'home' && S.navTab !== 'orders') { S.navTab = 'orders'; render(); return true; }
  return false;
};

/* ---------------- navigation ---------------- */
function goHome() { stop('order'); S.view = 'home'; S.order = null; S.people = []; S.me = null; render(); window.scrollTo(0, 0); }
function openOrder(id) {
  stop('order');
  Object.assign(S, { view: 'order', order: null, people: [], me: null, orderMissing: false, orderTab: 'checklist' });
  render();
  const uid = S.user.uid;
  let child = false;
  subs.order.push(FB.onSnapshot(D('orders', id), s => {
    if (!s.exists()) { S.orderMissing = true; S.order = null; render(); return; }
    S.order = { id: s.id, ...s.data() };
    if (!child) {
      child = true;
      if (S.order.hostUid === uid) {
        subs.order.push(FB.onSnapshot(C('orders', id, 'people'), ps => {
          S.people = ps.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.id === uid) - (a.id === uid) || ts(a.joinedAt) - ts(b.joinedAt));
          S.me = S.people.find(p => p.id === uid) || null;
          renderOrderKeepScroll(); syncBills();
        }));
      } else {
        subs.order.push(FB.onSnapshot(D('orders', id, 'people', uid), ps => {
          S.me = ps.exists() ? { id: ps.id, ...ps.data() } : null;
          renderOrderKeepScroll();
        }, () => { }));
      }
    }
    renderOrderKeepScroll();
    if (isHost()) syncBills();
  }, () => { S.orderMissing = true; render(); }));
  window.scrollTo(0, 0);
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
const isHost = () => !!(S.order && S.user && S.order.hostUid === S.user.uid);

// the host's phone keeps each person's share up to date in that person's document
let syncTimer = null;
function syncBills() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    const o = S.order; if (!o || !isHost()) return;
    const bill = computeBill(o, S.people);
    for (const r of bill.rows) {
      const b = billForPerson(r, o, bill.missing);
      if (JSON.stringify(b) !== JSON.stringify(r.p.bill || null)) FB.updateDoc(D('orders', o.id, 'people', r.p.id), { bill: b }).catch(() => { });
    }
  }, 600);
}

/* ---------------- render ---------------- */
function render() {
  const el = $('#app');
  if (S.view === 'loading') el.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  else if (S.view === 'auth') el.innerHTML = viewAuth();
  else if (S.view === 'order') el.innerHTML = viewOrder();
  else el.innerHTML = viewHome();
}

function viewAuth() {
  const up = S.authMode === 'signup';
  return `<div class="page no-nav">
    <div class="auth-logo"><img src="logo.svg" alt=""><h1>Lamma</h1><p class="sub">Order food together and split the bill.</p></div>
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
function viewHome() {
  const body = { orders: tabOrders, menus: tabMenus, settings: tabSettings }[S.navTab]();
  const nav = [['orders', ICON.orders, 'Orders'], ['menus', ICON.book, 'Menus'], ['settings', ICON.gear, 'Settings']];
  return `<div class="page">${body}</div>
  <nav class="nav">${nav.map(([k, i, l]) => `<button class="${S.navTab === k ? 'on' : ''}" data-a="nav" data-v="${k}">${i}${l}</button>`).join('')}</nav>`;
}
function tabOrders() {
  const row = (o, joined) => `<div class="list-row tap" data-a="openOrder" data-id="${o.id}">
      <div class="initial">${esc(initials(o.place))}</div>
      <div class="grow"><div class="t">${esc(o.place || 'Order')}</div><div class="sub">${joined ? `Hosted by ${esc(o.hostName || 'a friend')}` : new Date(ts(o.createdAt)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div></div>
      ${!joined ? (o.open ? '<span class="badge accent">Open</span>' : '<span class="badge">Closed</span>') : ''}
      <span class="chev">${ICON.chev}</span></div>`;
  return `<div class="head"><div class="brand grow"><img src="logo.svg" alt=""><h1>Lamma</h1></div></div>
    <div class="row" style="margin-bottom:6px"><button class="btn primary" data-a="newOrder">New order</button><button class="btn" data-a="joinSheet">Join with code</button></div>
    ${!S.hosted.length && !S.joined.length ? helpCard() : ''}
    ${S.hosted.length ? `<div class="section"><h2>You're hosting</h2></div><div class="card flush">${S.hosted.map(o => row(o, false)).join('')}</div>` : ''}
    ${S.joined.length ? `<div class="section"><h2>You joined</h2></div><div class="card flush">${S.joined.map(o => row(o, true)).join('')}</div>` : ''}`;
}
function helpCard() {
  return `<div class="card" style="margin-top:12px"><b>How Lamma works</b>
    <ol class="steps" style="margin-top:12px">
      <li><b>Start an order</b><span class="sub">Pick the restaurant and add its menu link, location or photos.</span></li>
      <li><b>Invite friends</b><span class="sub">Send the link or the 6-letter code. Each friend adds what they want.</span></li>
      <li><b>Order and split</b><span class="sub">You get one list of all the food to order. Type the receipt prices and Lamma works out what each person pays.</span></li>
    </ol></div>`;
}
function tabMenus() {
  return `<div class="head"><div class="grow"><h1>Menus</h1><div class="sub">Restaurants you saved, ready for your next order.</div></div></div>
    <button class="btn primary block" data-a="menuSheet">Add a menu</button>
    ${S.menus.length ? `<div class="card flush" style="margin-top:14px">${S.menus.map(m => `<div class="list-row tap" data-a="menuSheet" data-id="${m.id}">
        ${m.cover ? `<img class="thumb" src="${m.cover}" alt="">` : `<div class="thumb">${ICON.book.replace('<svg', '<svg width="22" height="22"')}</div>`}
        <div class="grow"><div class="t">${esc(m.name)}</div><div class="sub">${[m.photoCount ? `${m.photoCount} photo${m.photoCount > 1 ? 's' : ''}` : '', m.website ? 'website' : '', m.maps ? 'location' : ''].filter(Boolean).join(' · ') || 'No details yet'}</div></div>
        <span class="chev">${ICON.chev}</span></div>`).join('')}</div>`
      : `<div class="empty">No saved menus yet. Menus you add when you start an order are saved here too.</div>`}`;
}
function tabSettings() {
  const p = S.profile || {};
  const t = themeSetting();
  return `<div class="head"><div class="grow"><h1>Settings</h1></div></div>
    <div class="card">
      <div class="field"><label>Your name</label><input class="inp" id="st-name" value="${esc(p.name)}" maxlength="30"></div>
      <div class="field"><label>InstaPay link or address <span class="opt">(optional)</span></label><input class="inp" id="st-ip" value="${esc(p.instapay)}" placeholder="name@instapay or ipn.eg/…"><p class="hint" style="margin:6px 2px 0">Friends see this on their bill so they can pay you.</p></div>
      <button class="btn primary block" data-a="saveSettings">Save</button>
    </div>
    <div class="card"><div class="field" style="margin:0"><label>Appearance</label><div class="seg">
      ${[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([k, l]) => `<button class="${t === k ? 'on' : ''}" data-a="theme" data-v="${k}">${l}</button>`).join('')}</div></div></div>
    ${helpCard()}
    <div class="card flush">
      <div class="list-row"><div class="grow"><div class="t">Signed in as</div><div class="sub">${esc(p.username ? '@' + p.username : (S.user && S.user.email) || '')}</div></div></div>
      <div class="list-row tap" data-a="signOut"><div class="grow t" style="color:var(--danger)">Sign out</div></div>
    </div>
    <p class="sub" style="text-align:center;margin-top:16px">Lamma 2.0</p>`;
}

/* ----- order ----- */
function viewOrder() {
  const back = `<button class="icon-btn" data-a="home" aria-label="Back">${ICON.back}</button>`;
  if (S.orderMissing) return `<div class="page no-nav"><div class="head">${back}</div><div class="empty">This order isn't available anymore. The host may have deleted it.</div></div>`;
  const o = S.order;
  if (!o) return `<div class="page no-nav"><div class="head">${back}</div><div class="loading"><div class="spinner"></div></div></div>`;
  const host = isHost();
  return `<div class="page no-nav">
    <div class="head">${back}
      <div class="grow"><h1>${esc(o.place)}</h1><div class="sub">${host ? 'You are the host' : `Hosted by ${esc(o.hostName)}`} · ${o.open ? 'Open' : 'Closed'}</div></div>
      ${host ? `<button class="icon-btn" data-a="orderMenu" aria-label="More">${ICON.more}</button>` : ''}
    </div>
    ${linksRow(o)}
    ${host ? hostView(o) : memberView(o)}
  </div>`;
}
function linksRow(o) {
  const b = [];
  if (o.website) b.push(`<button class="btn" data-a="url" data-v="${esc(o.website)}">${ICON.link} Menu</button>`);
  if (o.maps) b.push(`<button class="btn" data-a="url" data-v="${esc(o.maps)}">${ICON.map} Location</button>`);
  if (o.menuId && o.photoCount) b.push(`<button class="btn" data-a="photos" data-id="${o.menuId}">${ICON.photo} Photos (${o.photoCount})</button>`);
  return b.length ? `<div class="links" style="margin-bottom:12px">${b.join('')}</div>` : '';
}

function hostView(o) {
  const bill = computeBill(o, S.people);
  const tabs = [['checklist', 'Checklist'], ['names', 'Names', S.people.length], ['foods', 'Foods', bill.groups.length], ['prices', 'Prices']];
  const body = { checklist: hostChecklist, names: hostNames, foods: hostFoods, prices: hostPrices }[S.orderTab](o, bill);
  return `${o.open ? `<div class="card">
      <div class="row" style="justify-content:space-between;align-items:flex-start"><div><div class="sub">Invite code</div><div class="code-big">${esc(o.code)}</div></div>
      <span class="badge accent" style="margin-top:4px">${S.people.length} ${S.people.length === 1 ? 'person' : 'people'}</span></div>
      <div class="row" style="margin-top:10px"><button class="btn primary sm" data-a="shareInvite">${ICON.share} Share invite link</button><button class="btn sm" data-a="copyCode">${ICON.copy} Copy code</button></div>
    </div>` : `<div class="card"><b>This order is closed.</b><p class="sub">Friends can't change their food anymore. You can reopen it from the ⋯ menu.</p></div>`}
    <div class="tabs">${tabs.map(([k, l, c]) => `<button class="${S.orderTab === k ? 'on' : ''}" data-a="orderTab" data-v="${k}">${l}${c != null ? ` <span class="count">${c}</span>` : ''}</button>`).join('')}</div>
    ${body}`;
}
function hostChecklist(o, bill) {
  const rows = bill.rows;
  const others = rows.filter(r => r.p.id !== o.hostUid);
  const paid = others.filter(r => r.p.paid);
  const owed = others.reduce((a, r) => a + r.total, 0), got = paid.reduce((a, r) => a + r.total, 0);
  if (!rows.some(r => r.lines.length)) return `<p class="hint">Only you can see this checklist: every person, what they ordered and what they pay.</p><div class="empty">Nobody has added food yet. Share the invite link, or add people without the app in Names.</div>`;
  return `<p class="hint">Only you can see this list. Tick people off when they get their food and when they pay you.</p>
    <div class="card"><div class="stat"><span class="sub">Paid ${paid.length} of ${others.length}</span><span><b>${money(got, o.currency)}</b> <span class="sub">of ${money(owed, o.currency)}</span></span></div>
      <div class="progress"><i style="width:${owed ? got / owed * 100 : 0}%"></i></div>
      ${bill.missing ? `<p class="sub" style="margin-top:10px;color:var(--warn)">${bill.missing} food${bill.missing > 1 ? 's have' : ' has'} no price yet. <a href="#" data-a="orderTab" data-v="prices">Add prices</a></p>` : ''}</div>
    ${rows.map(r => {
      const p = r.p, me = p.id === o.hostUid;
      return `<div class="card">
        <div class="person-head"><div class="initial">${esc(initials(p.name))}</div><div class="grow"><div class="t">${esc(p.name)}${me ? ' <span class="badge">You</span>' : ''}</div></div><div class="amount">${money(r.total, o.currency)}</div></div>
        <div style="margin-top:8px">${r.lines.length ? r.lines.map(l => `<div class="item-line"><span class="q">${l.q}×</span><span class="grow" dir="auto">${esc(l.n)}${l.split ? ` <span class="muted small">(shared by ${l.split})</span>` : ''}${l.note ? `<span class="note" dir="auto">${esc(l.note)}</span>` : ''}</span><span class="a">${l.u == null ? '<span class="muted small">no price</span>' : money(l.a, o.currency)}</span></div>`).join('') : '<p class="sub">No food yet</p>'}</div>
        ${me ? '' : `<div class="actions">
          <button class="check-btn ${p.received ? 'on' : ''}" data-a="tick" data-k="received" data-id="${p.id}"><span class="box"></span>Got food</button>
          <button class="check-btn ${p.paid ? 'on' : ''}" data-a="tick" data-k="paid" data-id="${p.id}"><span class="box"></span>Paid</button>
          ${!p.paid && r.total > 0 ? `<button class="btn sm ghost" data-a="remind" data-id="${p.id}">Send reminder</button>` : ''}
        </div>`}
      </div>`;
    }).join('')}`;
}
function hostNames(o) {
  return `<p class="hint">Everyone in this order. Tap a name to see or change their food.</p>
    <div class="card flush">${S.people.map(p => `<div class="list-row tap" data-a="personSheet" data-id="${p.id}">
      <div class="initial">${esc(initials(p.name))}</div>
      <div class="grow"><div class="t">${esc(p.name)}${p.id === o.hostUid ? ' <span class="badge">You</span>' : ''}</div><div class="sub">${(p.items || []).length ? `${sumQty(p.items)} item${sumQty(p.items) > 1 ? 's' : ''}` : 'No food yet'}${p.noApp ? ' · added by you' : ''}</div></div>
      <span class="chev">${ICON.chev}</span></div>`).join('')}</div>
    <button class="btn block" data-a="addPerson">Add a person without the app</button>`;
}
function hostFoods(o, bill) {
  const groups = [...bill.groups].sort((a, b) => sumQty(b.items) - sumQty(a.items));
  const nameOf = it => it.shared ? 'shared' : (S.people.find(p => p.id === it.pid) || {}).name || '?';
  return `<p class="hint">Everything to order from the restaurant, counted together. Names that are almost the same, like “Chicken burger” and “chiken Burger”, are added up.</p>
    <div class="row" style="margin-bottom:12px;flex-wrap:wrap"><button class="btn sm" data-a="copyFoods">${ICON.copy} Copy list</button><button class="btn sm" data-a="sharedSheet">Add shared item</button></div>
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
    ${groups.length ? `<p class="hint">The counter shows how many arrived. Tap + as the delivery comes in.</p>` : ''}`;
}
function hostPrices(o, bill) {
  const f = o.fees || {};
  return `<p class="hint">Type the prices from the receipt (the price of one). Lamma adds VAT, service and delivery and splits them fairly.</p>
    ${bill.groups.length ? `<div class="card flush">${bill.groups.map(g => {
      const u = g.items.map(i => priceFor(o, i.name, g.keys)).find(v => v != null);
      return `<div class="list-row"><div class="grow"><div class="t" dir="auto">${esc(g.label)}</div><div class="sub">× ${sumQty(g.items)}</div></div>
        <input class="inp num ${u == null ? 'missing' : ''}" inputmode="decimal" placeholder="0" value="${u == null ? '' : u}" data-f="price" data-v="${esc(g.anchor)}"></div>`;
    }).join('')}</div>` : '<div class="empty">No food yet.</div>'}
    <div class="section"><h2>Fees</h2></div>
    <div class="card">
      <div class="grid2">
        <div class="field"><label>VAT %</label><input class="inp" inputmode="decimal" value="${f.vat ?? 14}" data-f="fee" data-v="vat"></div>
        <div class="field"><label>Service %</label><input class="inp" inputmode="decimal" value="${f.service ?? 12}" data-f="fee" data-v="service"></div>
        <div class="field"><label>Delivery fee</label><input class="inp" inputmode="decimal" value="${f.delivery || ''}" placeholder="0" data-f="fee" data-v="delivery"></div>
        <div class="field"><label>Discount</label><input class="inp" inputmode="decimal" value="${f.discount || ''}" placeholder="0" data-f="fee" data-v="discount"></div>
      </div>
      <div class="field"><label>Discount type</label><div class="seg">${[['amount', 'Amount (' + o.currency + ')'], ['pct', 'Percent']].map(([k, l]) => `<button class="${(f.discountType || 'amount') === k ? 'on' : ''}" data-a="discType" data-v="${k}">${l}</button>`).join('')}</div></div>
      <div class="row" style="margin-bottom:14px"><div style="flex:1"><b style="font-size:15px">Add VAT on the service charge</b><div class="sub">This is how most restaurants in Egypt do it.</div></div><button class="switch ${f.vatOnService !== false ? 'on' : ''}" data-a="vatSvc"></button></div>
      <div class="field" style="margin:0"><label>Receipt total <span class="opt">(optional)</span></label><input class="inp" inputmode="decimal" value="${f.receipt || ''}" placeholder="Final total on the receipt" data-f="fee" data-v="receipt">
        <p class="hint" style="margin:6px 2px 0">If you type it, everyone's share is adjusted so the total matches the receipt exactly.</p></div>
    </div>
    <div class="card" id="price-summary">${priceSummary(o, bill)}</div>`;
}
function priceSummary(o, bill) {
  return `<div class="money"><span>Food</span><b>${money(bill.sub, o.currency)}</b></div>
    ${bill.disc ? `<div class="money"><span>Discount</span><b>−${money(bill.disc, o.currency)}</b></div>` : ''}
    <div class="money"><span>Service, VAT and delivery</span><b>${money(bill.computed - bill.sub + bill.disc, o.currency)}</b></div>
    ${bill.receipt > 0 && Math.abs(bill.receipt - bill.computed) > .009 ? `<div class="money"><span>Matched to the receipt</span><b>${bill.receipt > bill.computed ? '+' : '−'}${money(Math.abs(bill.receipt - bill.computed), o.currency)}</b></div>` : ''}
    <div class="money total"><span>Total</span><span>${money(bill.grand, o.currency)}</span></div>
    ${bill.missing ? `<p class="sub" style="margin-top:8px;color:var(--warn)">${bill.missing} food${bill.missing > 1 ? 's' : ''} still without a price.</p>` : ''}`;
}
function refreshPrices() {
  const o = S.order; if (!o || !isHost()) return;
  const el = $('#price-summary');
  if (el) el.innerHTML = priceSummary(o, computeBill(o, S.people));
}

function memberView(o) {
  const me = S.me;
  if (!me) return `<div class="card"><b>You're not in this order.</b><p class="sub">Join it to add your food.</p><button class="btn primary block" style="margin-top:12px" data-a="joinThis">Join this order</button></div>`;
  const b = me.bill;
  return `<p class="hint">Only you and ${esc(o.hostName)} can see your order.</p>
    <div class="card"><div class="person-head"><div class="grow"><div class="t">Your order</div></div>${o.open ? `<button class="btn sm primary" data-a="itemSheet">Add food</button>` : '<span class="badge">Closed</span>'}</div>
      <div style="margin-top:8px">${(me.items || []).length ? me.items.map(it => `<div class="item-line" ${o.open ? `data-a="itemSheet" data-id="${it.id}"` : ''}><span class="q">${qtyOf(it)}×</span><span class="grow" dir="auto">${esc(it.name)}${it.note ? `<span class="note" dir="auto">${esc(it.note)}</span>` : ''}</span>${o.open ? `<span class="chev">${ICON.chev}</span>` : ''}</div>`).join('') : `<p class="sub">You haven't added anything yet. Check the menu, then tap “Add food”.</p>`}</div>
    </div>
    <div class="card">
      <div class="person-head"><div class="grow"><div class="t">What you pay</div></div>${me.paid ? '<span class="badge good">Paid</span>' : ''}</div>
      ${b && b.total > 0 ? `<div style="margin-top:8px">
        ${b.lines.map(l => `<div class="money"><span dir="auto">${l.q}× ${esc(l.n)}${l.split ? ` (shared by ${l.split})` : ''}</span><b>${l.priced ? money(l.a, o.currency) : '–'}</b></div>`).join('')}
        ${b.disc ? `<div class="money"><span>Discount</span><b>−${money(b.disc, o.currency)}</b></div>` : ''}
        ${b.service ? `<div class="money"><span>Service ${b.servicePct}%</span><b>${money(b.service, o.currency)}</b></div>` : ''}
        ${b.vat ? `<div class="money"><span>VAT ${b.vatPct}%</span><b>${money(b.vat, o.currency)}</b></div>` : ''}
        ${b.delivery ? `<div class="money"><span>Your part of delivery</span><b>${money(b.delivery, o.currency)}</b></div>` : ''}
        ${b.adj ? `<div class="money"><span>Matched to the receipt</span><b>${money(b.adj, o.currency)}</b></div>` : ''}
        <div class="money total"><span>Total</span><span>${money(b.total, o.currency)}</span></div>
        ${b.missing ? `<p class="sub" style="margin-top:8px">The host is still adding prices, so this may change.</p>` : ''}
        ${!me.paid && o.instapay ? `<button class="btn primary block" style="margin-top:12px" data-a="payInsta">Pay ${esc(o.hostName)} with InstaPay</button>` : ''}
      </div>` : `<p class="sub" style="margin-top:6px">Your total shows up here once ${esc(o.hostName)} adds the prices from the receipt.</p>`}
    </div>
    ${o.open ? `<button class="btn block ghost danger" data-a="leaveOrder">Leave this order</button>` : ''}`;
}

/* ---------------- sheets ---------------- */
function openSheet(html) {
  const root = $('#sheet-root');
  root.innerHTML = `<div class="backdrop" data-a="closeSheet"></div><div class="sheet" role="dialog"><div class="grab"></div>${html}</div>`;
  return $('.sheet', root);
}
function closeSheet() { $('#sheet-root').innerHTML = ''; }

function sheetJoin() {
  openSheet(`<h2>Join an order</h2><p class="sub">Type the 6-letter code your friend sent you, or paste their invite link.</p>
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
      if (!od.open) return fail('This order is closed.');
      await FB.setDoc(D('orders', oid, 'people', uid), { uid, name: S.profile.name, items: [], joinedAt: Date.now(), updatedAt: Date.now() });
    }
    await FB.setDoc(D('users', uid, 'joined', oid), { place: od.place, hostName: od.hostName, joinedAt: Date.now() });
    closeSheet();
    openOrder(oid);
    toast(`You joined ${od.hostName}'s order`);
  } catch (e) { console.error(e); fail('Could not join. Check your internet and try again.'); }
}

/* new order / edit order details */
async function sheetOrder(editing) {
  const o = editing ? S.order : null;
  const st = { menuId: o ? o.menuId || null : null, photos: [], editing: !!o };
  if (st.menuId) st.photos = await loadPhotos(st.menuId);
  const s = openSheet(`<h2>${o ? 'Order details' : 'New order'}</h2><p class="sub">${o ? 'Changes show up for everyone in the order.' : 'Friends will see the restaurant, its menu and location.'}</p>
    ${!o && S.menus.length ? `<div class="field"><label>Use a saved menu <span class="opt">(optional)</span></label><div class="chips">${S.menus.map(m => `<button data-a="useMenu" data-id="${m.id}">${esc(m.name)}</button>`).join('')}</div></div>` : ''}
    <div class="field"><label>Restaurant</label><input class="inp" id="od-place" value="${esc(o ? o.place : '')}" placeholder="e.g. KFC" dir="auto"></div>
    <div class="field"><label>Menu website <span class="opt">(optional)</span></label><input class="inp" id="od-web" value="${esc(o ? o.website : '')}" placeholder="https://…" inputmode="url" autocapitalize="none"></div>
    <div class="field"><label>Google Maps link <span class="opt">(optional)</span></label><input class="inp" id="od-maps" value="${esc(o ? o.maps : '')}" placeholder="https://maps.app.goo.gl/…" inputmode="url" autocapitalize="none"></div>
    <div class="field"><label>Menu photos <span class="opt">(up to ${MAX_PHOTOS})</span></label><div class="photos" id="od-photos"></div></div>
    <div class="field"><label>Currency</label><select class="inp" id="od-cur">${CURRENCIES.map(c => `<option ${c === (o ? o.currency : 'EGP') ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    ${!o ? `<div class="row" style="margin-bottom:16px"><div style="flex:1"><b style="font-size:15px">Save this menu for next time</b><div class="sub">You'll find it in Menus.</div></div><button class="switch on" id="od-save" data-a="toggleSwitch"></button></div>` : ''}
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
async function saveOrder() {
  const s = $('.sheet'), st = s._st, o = st.editing ? S.order : null;
  const place = $('#od-place').value.trim(), website = $('#od-web').value.trim(), maps = $('#od-maps').value.trim(), currency = $('#od-cur').value;
  if (!place) { $('#od-err').textContent = 'Type the restaurant name.'; return; }
  const btn = $('#od-go'); btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const wantMenu = o ? !!(st.menuId || st.photos.length) : ($('#od-save').classList.contains('on') || st.photos.length > 0);
    let menu = { menuId: st.menuId || null, photoCount: st.photos.length };
    if (wantMenu) menu = await saveMenu(st.menuId, { name: place, website, maps }, st);
    const uid = S.user.uid;
    if (o) {
      await FB.updateDoc(D('orders', o.id), { place, website, maps, currency, menuId: menu.menuId, photoCount: menu.photoCount });
      closeSheet(); toast('Saved');
      return;
    }
    const id = rid(16);
    let code = newCode();
    for (let i = 0; i < 5; i++) { const c = await FB.getDoc(D('codes', code)); if (!c.exists()) break; code = newCode(); }
    await FB.setDoc(D('orders', id), {
      hostUid: uid, hostName: S.profile.name, place, website, maps, currency, code, open: true, createdAt: Date.now(),
      menuId: menu.menuId, photoCount: menu.photoCount, instapay: S.profile.instapay || '',
      fees: { vat: 14, service: 12, vatOnService: true, delivery: 0, discount: 0, discountType: 'amount', receipt: '' },
      prices: {}, delivered: {}, smart: true, blocks: [], joins: [], shared: [],
    });
    await FB.setDoc(D('codes', code), { orderId: id, hostUid: uid });
    await FB.setDoc(D('orders', id, 'people', uid), { uid, name: S.profile.name, items: [], joinedAt: Date.now(), updatedAt: Date.now() });
    closeSheet();
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
    ${m ? `<button class="btn block" style="margin-top:10px" data-a="orderFromMenu">Start an order with this menu</button>
    <button class="btn block ghost danger" style="margin-top:6px" data-a="deleteMenu">Delete menu</button>` : ''}`);
  s._st = st;
  drawPhotoGrid('#mn-photos', st);
}

/* food items */
function sheetItem(itemId, personId) {
  const o = S.order;
  const pid = personId || S.user.uid;
  const person = isHost() ? S.people.find(p => p.id === pid) : S.me;
  const it = itemId ? (person.items || []).find(i => i.id === itemId) : null;
  const known = isHost() ? computeBill(o, S.people).groups.map(g => g.label) : [];
  const s = openSheet(`<h2>${it ? 'Change food' : 'Add food'}</h2><p class="sub">${person.id === S.user.uid ? 'For you' : 'For ' + esc(person.name)}</p>
    <div class="field"><label>Food</label><input class="inp" id="it-name" value="${esc(it ? it.name : '')}" placeholder="e.g. Zinger sandwich" dir="auto" autocomplete="off">
      ${known.length ? `<div class="chips">${known.slice(0, 8).map(n => `<button data-a="pickName" data-v="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : ''}</div>
    <div class="field"><label>How many</label><div class="stepper"><button data-a="qty" data-v="-1">−</button><span class="v" id="it-qty">${it ? qtyOf(it) : 1}</span><button data-a="qty" data-v="1">+</button></div></div>
    <div class="field"><label>Note <span class="opt">(optional)</span></label><input class="inp" id="it-note" value="${esc(it ? it.note : '')}" placeholder="e.g. no onions, spicy" dir="auto"></div>
    <button class="btn primary block" data-a="saveItem">${it ? 'Save' : 'Add'}</button>
    ${it ? `<button class="btn block ghost danger" style="margin-top:6px" data-a="deleteItem">Remove</button>` : ''}`);
  s._pid = person.id; s._itemId = itemId || null;
  if (!it) setTimeout(() => { const i = $('#it-name'); if (i) i.focus(); }, 200);
}
const writeItems = (pid, items) => FB.updateDoc(D('orders', S.order.id, 'people', pid), { items, updatedAt: Date.now() });

/* people (host only) */
function sheetPerson(pid) {
  const o = S.order, p = S.people.find(x => x.id === pid);
  if (!p) return;
  openSheet(`<h2>${esc(p.name)}</h2><p class="sub">${p.noApp ? 'Added by you (no app)' : p.id === o.hostUid ? 'You' : 'Joined with the app'}</p>
    <div class="card">${(p.items || []).length ? p.items.map(it => `<div class="item-line" data-a="itemSheet" data-id="${it.id}" data-p="${p.id}"><span class="q">${qtyOf(it)}×</span><span class="grow" dir="auto">${esc(it.name)}${it.note ? `<span class="note">${esc(it.note)}</span>` : ''}</span><span class="chev">${ICON.chev}</span></div>`).join('') : '<p class="sub">No food yet.</p>'}</div>
    <button class="btn primary block" data-a="itemSheet" data-p="${p.id}">Add food for ${p.id === o.hostUid ? 'yourself' : esc(p.name)}</button>
    ${p.noApp ? `<div class="field" style="margin-top:14px"><label>Name</label><div class="row"><input class="inp" id="ps-name" value="${esc(p.name)}" style="flex:1"><button class="btn" style="flex:none" data-a="renamePerson" data-id="${p.id}">Rename</button></div></div>` : ''}
    ${p.id !== o.hostUid ? `<button class="btn block ghost danger" style="margin-top:6px" data-a="removePerson" data-id="${p.id}">Remove ${esc(p.name)} from the order</button>` : ''}`);
}
function sheetAddPerson() {
  openSheet(`<h2>Add a person</h2><p class="sub">For friends who don't have Lamma. You add their food for them.</p>
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
    <div class="field"><label>How many</label><div class="stepper"><button data-a="shQty" data-v="-1">−</button><span class="v" id="sh-qty">${st.qty}</span><button data-a="shQty" data-v="1">+</button></div></div>
    <div class="field"><label>Shared by</label><div class="chips">${S.people.map(p => `<button class="${st.sharers.has(p.id) ? 'on' : ''}" data-a="shWho" data-id="${p.id}">${esc(p.name)}</button>`).join('')}</div></div>
    <button class="btn primary block" data-a="saveShared">${s0 ? 'Save' : 'Add'}</button>
    ${s0 ? `<button class="btn block ghost danger" style="margin-top:6px" data-a="deleteShared">Remove</button>` : ''}`);
  s._st = st; s._id = id || null;
}

function sheetOrderMenu() {
  const o = S.order;
  openSheet(`<h2>${esc(o.place)}</h2><div class="card flush" style="margin-top:10px">
    <div class="list-row tap" data-a="editOrder"><div class="grow t">Edit restaurant, links and photos</div></div>
    <div class="list-row tap" data-a="shareBill"><div class="grow t">Share the bill in a chat</div></div>
    <div class="list-row tap" data-a="exportCsv"><div class="grow t">Export to Excel</div></div>
    <div class="list-row tap" data-a="toggleOpen"><div class="grow"><div class="t">${o.open ? 'Close the order' : 'Reopen the order'}</div><div class="sub">${o.open ? 'Friends can no longer change their food.' : 'Friends can change their food again.'}</div></div></div>
    <div class="list-row tap" data-a="deleteOrder"><div class="grow t" style="color:var(--danger)">Delete the order</div></div>
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
  const lines = bill.rows.filter(r => r.lines.length).map(r => `${r.p.name}: ${money(r.total, o.currency)}${r.p.id === o.hostUid ? ' (host)' : r.p.paid ? ' - paid' : ''}`);
  return `${o.place} order\n\n${lines.join('\n')}\n\nTotal: ${money(bill.grand, o.currency)}${o.instapay ? `\nPay with InstaPay: ${o.instapay}` : ''}\n\nSplit with Lamma`;
}
function csvOf(o, bill) {
  const q = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const r2 = n => (Math.round((n || 0) * 100) / 100).toFixed(2);
  const out = [[q(o.place), q(new Date(ts(o.createdAt)).toLocaleString('en-GB')), q(o.currency)].join(','), '',
    ['Person', 'Food', 'Qty', 'Price of one', 'Amount', 'Shared by', 'Note'].map(q).join(',')];
  for (const r of bill.rows) for (const l of r.lines) out.push([q(r.p.name), q(l.n), l.q, l.u == null ? '' : r2(l.u), r2(l.a), l.split || '', q(l.note)].join(','));
  out.push('', ['Person', 'Food', 'Discount', 'Service', 'VAT', 'Delivery', 'Receipt match', 'Total', 'Paid'].map(q).join(','));
  for (const r of bill.rows) out.push([q(r.p.name), r2(r.sub), r2(r.disc), r2(r.service), r2(r.vat), r2(r.delivery), r2(r.adj), r2(r.total), r.p.id === o.hostUid ? 'host' : r.p.paid ? 'yes' : 'no'].join(','));
  out.push(['"Total"', r2(bill.sub), r2(bill.disc), '', '', '', '', r2(bill.grand), ''].join(','));
  out.push('', ['Food', 'Qty', 'Spellings combined'].map(q).join(','));
  for (const g of bill.groups) out.push([q(g.label), sumQty(g.items), q(g.variants.join(' / '))].join(','));
  return out.join('\r\n');
}
const inviteLink = o => `${CFG.webBase}/j/?c=${o.code}`;

/* ---------------- actions ---------------- */
const upd = patch => FB.updateDoc(D('orders', S.order.id), patch).catch(() => toast('Could not save. Check your internet.'));
const groupByAnchor = anchor => computeBill(S.order, S.people).groups.find(x => x.anchor === anchor);
const A = {
  authMode: el => { S.authMode = el.dataset.v; render(); },
  doAuth: () => doAuth(),
  google: () => googleSignIn(),
  nav: el => { S.navTab = el.dataset.v; render(); window.scrollTo(0, 0); },
  home: () => goHome(),
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
    if (!confirm('Delete this menu and its photos?')) return;
    const id = $('.sheet')._st.menuId;
    const ph = await FB.getDocs(C('menus', id, 'photos'));
    for (const d of ph.docs) await FB.deleteDoc(d.ref);
    await FB.deleteDoc(D('menus', id));
    closeSheet(); toast('Menu deleted');
  },
  photos: el => showPhotos(el.dataset.id),
  url: el => openUrl(el.dataset.v),
  orderTab: el => { S.orderTab = el.dataset.v; render(); },
  orderMenu: () => sheetOrderMenu(),
  shareInvite: () => { const o = S.order; share(`Join my ${o.place} order on Lamma:\n${inviteLink(o)}\n\nOr open Lamma, tap “Join with code” and type ${o.code}`); },
  copyCode: () => copy(S.order.code),
  tick: el => { const p = S.people.find(x => x.id === el.dataset.id), k = el.dataset.k; FB.updateDoc(D('orders', S.order.id, 'people', p.id), { [k]: !p[k] }).catch(() => toast('Could not save')); },
  remind: el => {
    const o = S.order, r = computeBill(o, S.people).rows.find(x => x.p.id === el.dataset.id);
    share(`Hi ${r.p.name}, your share of the ${o.place} order is ${money(r.total, o.currency)}.${o.instapay ? `\nInstaPay: ${o.instapay}` : ''}\nThanks!`);
  },
  personSheet: el => sheetPerson(el.dataset.id),
  addPerson: () => sheetAddPerson(),
  saveNewPerson: async () => {
    const name = $('#ap-name').value.trim(); if (!name) return;
    await FB.setDoc(D('orders', S.order.id, 'people', 'x_' + rid(10)), { uid: null, name, items: [], noApp: true, joinedAt: Date.now(), updatedAt: Date.now() });
    closeSheet(); toast(`${name} added`);
  },
  renamePerson: async el => { const name = $('#ps-name').value.trim(); if (!name) return; await FB.updateDoc(D('orders', S.order.id, 'people', el.dataset.id), { name }); closeSheet(); },
  removePerson: async el => {
    const p = S.people.find(x => x.id === el.dataset.id);
    if (!confirm(`Remove ${p.name} and their food from this order?`)) return;
    await FB.deleteDoc(D('orders', S.order.id, 'people', p.id));
    await upd({ shared: (S.order.shared || []).map(s => ({ ...s, sharers: (s.sharers || []).filter(x => x !== p.id) })) });
    closeSheet();
  },
  itemSheet: el => sheetItem(el.dataset.id || null, el.dataset.p || null),
  pickName: el => { $('#it-name').value = el.dataset.v; },
  qty: el => { const v = $('#it-qty'); v.textContent = Math.max(1, Math.min(99, +v.textContent + +el.dataset.v)); },
  saveItem: async () => {
    const s = $('.sheet'), name = $('#it-name').value.trim();
    if (!name) { $('#it-name').focus(); return; }
    const person = isHost() ? S.people.find(p => p.id === s._pid) : S.me;
    const items = [...(person.items || [])];
    const data = { name, qty: +$('#it-qty').textContent, note: $('#it-note').value.trim() };
    if (s._itemId) { const i = items.findIndex(x => x.id === s._itemId); items[i] = { ...items[i], ...data }; }
    else items.push({ id: rid(8), ...data });
    try {
      await writeItems(person.id, items);
      closeSheet();
    } catch (e) { toast(S.order.open ? 'Could not save. Check your internet.' : 'The order is closed.'); }
  },
  deleteItem: async () => {
    const s = $('.sheet'), person = isHost() ? S.people.find(p => p.id === s._pid) : S.me;
    await writeItems(person.id, (person.items || []).filter(i => i.id !== s._itemId)).catch(() => toast('Could not save'));
    closeSheet();
  },
  leaveOrder: async () => {
    if (!confirm('Leave this order? Your food will be removed.')) return;
    const uid = S.user.uid, id = S.order.id;
    await FB.deleteDoc(D('orders', id, 'people', uid)).catch(() => { });
    await FB.deleteDoc(D('users', uid, 'joined', id)).catch(() => { });
    goHome();
  },
  payInsta: () => { const ip = S.order.instapay; if (/^(https?:\/\/|ipn\.eg)/i.test(ip)) openUrl(ip); else { copy(ip); toast('InstaPay address copied. Paste it in the InstaPay app.'); } },
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
    const o = S.order, g = computeBill(o, S.people).groups;
    copy(`${o.place} order:\n` + g.map(x => `${sumQty(x.items)} × ${x.label}`).join('\n'));
  },
  sharedSheet: el => sheetShared(el.dataset.id || null),
  shQty: el => { const s = $('.sheet'); s._st.qty = Math.max(1, Math.min(99, s._st.qty + +el.dataset.v)); $('#sh-qty').textContent = s._st.qty; },
  shWho: el => { const st = $('.sheet')._st, id = el.dataset.id; if (st.sharers.has(id)) st.sharers.delete(id); else st.sharers.add(id); el.classList.toggle('on', st.sharers.has(id)); },
  saveShared: async () => {
    const s = $('.sheet'), st = s._st, name = $('#sh-name').value.trim();
    if (!name || !st.sharers.size) { toast(name ? 'Pick who shares it' : 'Type the food name'); return; }
    const list = [...(S.order.shared || [])];
    const data = { name, qty: st.qty, sharers: [...st.sharers] };
    if (s._id) { const i = list.findIndex(x => x.id === s._id); list[i] = { ...list[i], ...data }; } else list.push({ id: rid(8), ...data });
    await upd({ shared: list }); closeSheet();
  },
  deleteShared: async () => { const s = $('.sheet'); await upd({ shared: (S.order.shared || []).filter(x => x.id !== s._id) }); closeSheet(); },
  discType: el => upd({ 'fees.discountType': el.dataset.v }),
  vatSvc: () => upd({ 'fees.vatOnService': S.order.fees.vatOnService === false }),
  shareBill: () => { closeSheet(); share(billText(S.order, computeBill(S.order, S.people))); },
  exportCsv: () => {
    closeSheet();
    const o = S.order, csv = csvOf(o, computeBill(o, S.people));
    const name = `Lamma-${o.place.replace(/[^\p{L}\p{N}]+/gu, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    if (N) { if (N.saveFile(name, 'text/csv', csv)) toast('Saved to Downloads/Lamma'); }
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = name; a.click(); }
  },
  toggleOpen: async () => { closeSheet(); const was = S.order.open; await upd({ open: !was }); toast(was ? 'Order closed' : 'Order reopened'); },
  deleteOrder: async () => {
    if (!confirm('Delete this order for everyone? This cannot be undone.')) return;
    const o = S.order;
    closeSheet(); stop('order');
    try {
      const ps = await FB.getDocs(C('orders', o.id, 'people'));
      for (const d of ps.docs) await FB.deleteDoc(d.ref);
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
    for (const o of S.hosted) if (o.open) FB.updateDoc(D('orders', o.id), { hostName: name, instapay }).catch(() => { });
    toast('Saved');
  },
  theme: el => { try { localStorage.setItem('lamma.theme', el.dataset.v); } catch (e) { } applyTheme(); render(); },
  signOut: () => { if (confirm('Sign out of Lamma?')) FB.signOut(auth); },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el) return;
  if (el.tagName === 'A') e.preventDefault();
  const fn = A[el.dataset.a];
  if (fn) fn(el, e);
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (e.target.id === 'au-pass' || e.target.id === 'au-user') doAuth();
  if (e.target.id === 'jn-code') A.doJoin();
});

// prices and fees save as the host types
let feeTimer = null;
document.addEventListener('input', e => {
  const el = e.target, f = el.dataset && el.dataset.f;
  if (!f || !isHost()) return;
  const o = S.order;
  if (f === 'price') {
    const g = groupByAnchor(el.dataset.v);
    const v = el.value.trim() === '' ? null : num(el.value);
    o.prices = { ...(o.prices || {}) };
    for (const k of g.keys) o.prices[k] = v;
    el.classList.toggle('missing', v == null);
  }
  if (f === 'fee') o.fees = { ...o.fees, [el.dataset.v]: el.dataset.v === 'receipt' ? el.value.trim() : num(el.value) };
  refreshPrices();
  clearTimeout(feeTimer);
  feeTimer = setTimeout(() => upd({ prices: o.prices, fees: o.fees }), 500);
});

applyTheme();
