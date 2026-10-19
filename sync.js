/* Dropbox-synkronisering: OAuth 2 PKCE i browseren (ingen secret), App folder, refresh token.
   Data krypteres med AES-256-GCM med en nøgle fra en separat sync-adgangsfrase (PBKDF2-SHA256), før de forlader enheden.
   Dropbox ser kun én krypteret fil: /okonomi.enc i appens egen mappe (Apps/<appnavn>/). */
const SYNC_CONFIG = {
  dropboxAppKey: 'DIN_DROPBOX_APP_KEY', // ← Indsæt "App key" fra Dropbox App Console her (den eneste ændring, der skal til)
  redirectUri: 'https://simonbjerg94-glitch.github.io/okonomi-app/',
  file: '/okonomi.enc',
  iter: 600000,
  debounceMs: 4000
};
const SKEY = 'okonomi.sync', SBASE = 'okonomi.sync.base', SPEND = 'okonomi.sync.pkce';
const DBX = { auth: 'https://www.dropbox.com/oauth2/authorize', token: 'https://api.dropboxapi.com/oauth2/token', api: 'https://api.dropboxapi.com/2', content: 'https://content.dropboxapi.com/2' };
const syncAppKey = () => localStorage.getItem('okonomi.dropboxAppKey') || SYNC_CONFIG.dropboxAppKey; // lokal override kun til test
const syncKeyReady = () => !!syncAppKey() && !/^DIN_/.test(syncAppKey());
const syncRedirect = () => /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? location.origin + location.pathname : SYNC_CONFIG.redirectUri;
const Sync = { cfg: null, key: null, busy: false, again: false, timer: null, suppress: 0, seq: 0, status: 'idle', msg: '', handledRedirect: false };
const syncOn = () => !!(Sync.cfg && Sync.cfg.token && Sync.cfg.token.refresh);
const syncReady = () => syncOn() && !!Sync.key;
const b64url = buf => b64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randB64url = n => b64url(crypto.getRandomValues(new Uint8Array(n)));
function stableStr(v) { if (Array.isArray(v)) return '[' + v.map(stableStr).join(',') + ']'; if (v && typeof v === 'object') return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + stableStr(v[k])).join(',') + '}'; return JSON.stringify(v === undefined ? null : v); }
const same = (a, b) => stableStr(a) === stableStr(b);

/* ---------- Lokal konfiguration (krypteres med app-låsens nøgle, hvis kryptering er slået til) ---------- */
async function syncPersist() {
  const c = Sync.cfg; if (!c) { localStorage.removeItem(SKEY); return; }
  const txt = JSON.stringify(c);
  if (typeof Lock !== 'undefined' && Lock.cfg && Lock.cfg.enc) { if (!Lock.key) return; Sync.persistKey = Lock.key; localStorage.setItem(SKEY, await encryptText(txt, Lock.key)); }
  else { Sync.persistKey = null; localStorage.setItem(SKEY, txt); }
}
/* Kaldes fra save(): hvis app-låsens kryptering er slået til/fra eller PIN er skiftet, gemmes sync-opsætningen igen i det rette format */
function syncCheckFormat() {
  if (!Sync.cfg) return; const enc = !!(typeof Lock !== 'undefined' && Lock.cfg && Lock.cfg.enc);
  if (enc ? (Lock.key && Sync.persistKey !== Lock.key) : Sync.persistKey || isEncBlob(localStorage.getItem(SKEY) || '')) syncPersist();
}
async function syncLoadCfg() {
  const raw = localStorage.getItem(SKEY); if (!raw) return null;
  try { if (isEncBlob(raw)) { if (!Lock.key) return null; const c = JSON.parse(await decryptText(raw, Lock.key)); Sync.persistKey = Lock.key; return c; } Sync.persistKey = null; return JSON.parse(raw); } catch (e) { return null; }
}
function syncForget() { localStorage.removeItem(SKEY); localStorage.removeItem(SBASE); Sync.cfg = null; Sync.key = null; }
async function syncSaveBase(txt) { if (Sync.key) localStorage.setItem(SBASE, await encryptText(txt, Sync.key)); }
async function syncLoadBase() { try { const r = localStorage.getItem(SBASE); return r ? JSON.parse(await decryptText(r, Sync.key)) : null; } catch (e) { return null; } }

/* ---------- Kryptering af filen ---------- */
async function syncEncrypt(txt) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, Sync.key, new TextEncoder().encode(txt));
  return JSON.stringify({ app: 'min-okonomi', v: 1, kdf: 'PBKDF2-SHA256', iter: Sync.cfg.iter, salt: Sync.cfg.salt, enc: 'AES-GCM', iv: b64(iv), ct: b64(ct), savedAt: new Date().toISOString(), device: Sync.cfg.device });
}
function parseSyncFile(text) { const o = JSON.parse(text); if (o.app !== 'min-okonomi' || o.enc !== 'AES-GCM' || !o.salt) throw new Error('format'); return o; }
async function syncDecryptWith(file, key) { return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(file.iv) }, key, unb64(file.ct))); }
async function syncDeriveKey(pass, saltB64, iter) { const d = await deriveBits(pass, unb64(saltB64), iter); return { raw: b64(d.keyRaw), key: await aesKey(d.keyRaw) }; }

/* ---------- Dropbox HTTP ---------- */
const apiArg = o => JSON.stringify(o).replace(/[\u007f-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
class SyncError extends Error { constructor(msg, kind) { super(msg); this.kind = kind; } }
async function dbxRefresh() {
  let r; try { r = await fetch(DBX.token, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: Sync.cfg.token.refresh, client_id: syncAppKey() }) }); }
  catch (e) { throw new SyncError('offline', 'offline'); }
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new SyncError(j.error_description || j.error || 'Login udløbet', r.status === 400 || r.status === 401 ? 'auth' : 'http'); }
  const j = await r.json(); Sync.cfg.token.access = j.access_token; Sync.cfg.token.expiresAt = Date.now() + (j.expires_in || 14400) * 1000; await syncPersist(); return j.access_token;
}
async function dbxToken() { const t = Sync.cfg.token; return t.access && t.expiresAt > Date.now() + 60000 ? t.access : dbxRefresh(); }
async function dbx(url, opts = {}, retry = true) {
  const tok = await dbxToken(); let r;
  try { r = await fetch(url, { method: 'POST', ...opts, headers: { ...(opts.headers || {}), Authorization: 'Bearer ' + tok } }); } catch (e) { throw new SyncError('offline', 'offline'); }
  if (r.status === 401 && retry) { Sync.cfg.token.expiresAt = 0; return dbx(url, opts, false); }
  if (r.status === 401) throw new SyncError('Login udløbet', 'auth');
  if (r.status === 429 || r.status >= 500) throw new SyncError('Dropbox svarer ikke lige nu (' + r.status + ')', 'http');
  return r;
}
async function dbxErr(r) { const j = await r.json().catch(() => ({})); return j.error_summary || ('HTTP ' + r.status); }
async function dbxMeta() { // list_folder på app-mappens rod i stedet for get_metadata: undgår en 409-fejl, når filen endnu ikke findes
  const name = SYNC_CONFIG.file.replace(/^\//, '').toLowerCase();
  let r = await dbx(DBX.api + '/files/list_folder', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: '', recursive: false }) });
  for (let i = 0; i < 50; i++) {
    if (!r.ok) throw new SyncError(await dbxErr(r), 'http');
    const j = await r.json(), hit = (j.entries || []).find(e => e['.tag'] === 'file' && (e.path_lower === '/' + name || (e.name || '').toLowerCase() === name));
    if (hit) return hit; if (!j.has_more) return null;
    r = await dbx(DBX.api + '/files/list_folder/continue', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cursor: j.cursor }) });
  }
  return null;
}
async function dbxDownload() {
  const r = await dbx(DBX.content + '/files/download', { headers: { 'Dropbox-API-Arg': apiArg({ path: SYNC_CONFIG.file }) } });
  if (r.status === 409) return null; if (!r.ok) throw new SyncError(await dbxErr(r), 'http');
  return { meta: JSON.parse(r.headers.get('Dropbox-API-Result') || '{}'), text: await r.text() };
}
async function dbxUpload(text, rev) {
  const r = await dbx(DBX.content + '/files/upload', { headers: { 'Content-Type': 'application/octet-stream', 'Dropbox-API-Arg': apiArg({ path: SYNC_CONFIG.file, mode: rev ? { '.tag': 'update', update: rev } : { '.tag': 'add' }, autorename: false, mute: true, strict_conflict: true }) }, body: text });
  if (r.status === 409) { const e = await dbxErr(r); if (/conflict/.test(e)) return { conflict: true }; throw new SyncError(e, 'http'); }
  if (!r.ok) throw new SyncError(await dbxErr(r), 'http'); return r.json();
}

/* ---------- OAuth 2 PKCE ---------- */
async function syncConnect() {
  if (!syncKeyReady()) { toast('Dropbox-appnøglen er ikke sat op endnu'); return; }
  const verifier = randB64url(64), state = randB64url(16);
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  sessionStorage.setItem(SPEND, JSON.stringify({ verifier, state, redirect: syncRedirect() }));
  const u = new URL(DBX.auth);
  u.search = new URLSearchParams({ client_id: syncAppKey(), response_type: 'code', code_challenge: challenge, code_challenge_method: 'S256', redirect_uri: syncRedirect(), token_access_type: 'offline', state }).toString();
  location.assign(u.toString());
}
async function syncHandleRedirect() {
  const q = new URLSearchParams(location.search);
  if (!q.has('code') && !q.has('error')) return false;
  const pend = JSON.parse(sessionStorage.getItem(SPEND) || 'null'); sessionStorage.removeItem(SPEND);
  history.replaceState(null, '', location.pathname + '#/indstillinger'); render();
  if (q.has('error')) { toast(q.get('error') === 'access_denied' ? 'Forbindelsen til Dropbox blev annulleret' : 'Dropbox: ' + q.get('error')); return true; }
  if (!pend || pend.state !== q.get('state')) { toast('Ugyldigt svar fra Dropbox – prøv at forbinde igen'); return true; }
  let j;
  try {
    const r = await fetch(DBX.token, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code: q.get('code'), grant_type: 'authorization_code', code_verifier: pend.verifier, client_id: syncAppKey(), redirect_uri: pend.redirect }) });
    j = await r.json(); if (!r.ok || !j.refresh_token) throw new Error(j.error_description || j.error || 'token');
  } catch (e) { toast('Kunne ikke forbinde til Dropbox: ' + e.message); return true; }
  const old = Sync.cfg || {};
  Sync.cfg = { v: 1, device: old.device || randB64url(9), token: { access: j.access_token, refresh: j.refresh_token, expiresAt: Date.now() + (j.expires_in || 14400) * 1000 }, accountId: j.account_id, account: '', key: null, salt: null, iter: SYNC_CONFIG.iter, lastRev: null, lastSyncAt: null, dirty: true, connectedAt: new Date().toISOString() };
  Sync.key = null; localStorage.removeItem(SBASE); await syncPersist();
  try { const r = await dbx(DBX.api + '/users/get_current_account', { headers: { 'Content-Type': 'application/json' }, body: 'null' }); if (r.ok) { const a = await r.json(); Sync.cfg.account = a.email || a.name?.display_name || ''; await syncPersist(); } } catch (e) {}
  refreshSyncCard(); toast('Dropbox er forbundet ✓');
  await syncSetupKey();
  return true;
}
async function syncSetupKey() {
  setSyncStatus('syncing', 'Tjekker Dropbox…');
  let dl; try { dl = (await dbxMeta()) ? await dbxDownload() : null; } catch (e) { return syncFail(e); }
  let file = null; if (dl) { try { file = parseSyncFile(dl.text); } catch (e) { setSyncStatus('error', 'Filen i Dropbox kan ikke læses'); return; } }
  setSyncStatus('pass', 'Indtast din sync-adgangsfrase for at fortsætte.');
  openPassSheet(file, async (raw, key, salt, iter) => {
    Sync.key = key; Object.assign(Sync.cfg, { key: raw, salt, iter }); await syncPersist(); syncNow(true);
  });
}
function openPassSheet(file, onOk) {
  const create = !file;
  openSheet(`${sheetHead(create ? 'Vælg en sync-adgangsfrase' : 'Indtast din sync-adgangsfrase')}
    <p class="muted small">${create ? 'Dine data krypteres på enheden med en nøgle fra denne adgangsfrase, før de sendes til Dropbox. Dropbox kan ikke læse dem.' : 'Der ligger allerede krypterede data i din Dropbox. Indtast den adgangsfrase, du valgte på din anden enhed.'}</p>
    ${create ? `<div class="lock-info warn">⚠️ <b>Skriv adgangsfrasen ned et sikkert sted.</b> Den kan ikke nulstilles, og du skal bruge den på dine andre enheder. Brug ikke din PIN-kode – vælg mindst 10 tegn, gerne nogle ord.</div>` : ''}
    <div class="field"><label for="spPass">Adgangsfrase</label><input class="input" id="spPass" type="password" autocomplete="${create ? 'new-password' : 'current-password'}"></div>
    ${create ? '<div class="field"><label for="spPass2">Gentag adgangsfrase</label><input class="input" id="spPass2" type="password" autocomplete="new-password"></div>' : ''}
    <div class="lock-msg" id="spMsg" role="alert"></div>
    <button class="btn btn-primary btn-block" id="spGo">${create ? '🔐 Kryptér og synkronisér' : '🔓 Lås op og synkronisér'}</button>`, sh => {
    const go = sh.querySelector('#spGo'), m = sh.querySelector('#spMsg');
    go.onclick = async () => {
      const p = sh.querySelector('#spPass').value;
      if (create) {
        if (p.length < 10) return m.textContent = 'Adgangsfrasen skal være mindst 10 tegn.';
        if (p !== sh.querySelector('#spPass2').value) return m.textContent = 'De to adgangsfraser er ikke ens.';
        if (/^\d+$/.test(p)) return m.textContent = 'Brug ikke kun tal – vælg fx nogle ord.';
      }
      go.disabled = true; go.textContent = 'Udleder nøgle…';
      const salt = create ? b64(crypto.getRandomValues(new Uint8Array(16))) : file.salt, iter = create ? SYNC_CONFIG.iter : file.iter;
      const k = await syncDeriveKey(p, salt, iter);
      if (!create) { try { await syncDecryptWith(file, k.key); } catch (e) { go.disabled = false; go.textContent = '🔓 Lås op og synkronisér'; return m.textContent = 'Forkert adgangsfrase – prøv igen.'; } }
      closeSheet(); onOk(k.raw, k.key, salt, iter);
    };
  });
}

/* ---------- Fletning ---------- */
const SYNC_LISTS = { transactions: {}, recurring: {}, goals: { contributions: 'id' }, jobs: {}, rules: {}, categories: {} };
const NW_NESTED = { history: 'date' };
function itemLabel(coll, it) {
  if (!it) return '';
  if (coll === 'transactions') return `Postering “${it.note || cat(it.categoryId).name}” ${it.date ? fmtDate(it.date) : ''}`;
  return ({ recurring: 'Fast post', goals: 'Mål', jobs: 'Job', rules: 'Regel', categories: 'Kategori', networth: 'Formuepost' }[coll] || coll) + ` “${it.name || it.key || it.id}”`;
}
function mergeObj(b, l, r, nested, conf, label) {
  const out = {}, keys = new Set([...Object.keys(l || {}), ...Object.keys(r || {})]);
  for (const k of keys) {
    const bv = b ? b[k] : undefined, lv = l ? l[k] : undefined, rv = r ? r[k] : undefined;
    if (same(lv, rv)) { if (lv !== undefined) out[k] = lv; continue; }
    if (b && same(lv, bv)) { if (rv !== undefined) out[k] = rv; continue; }
    if (b && same(rv, bv)) { if (lv !== undefined) out[k] = lv; continue; }
    if (!b && (lv === undefined || rv === undefined)) { out[k] = lv !== undefined ? lv : rv; continue; } // første fletning: et felt findes kun ét sted
    if (nested[k] && Array.isArray(lv) && Array.isArray(rv)) { out[k] = mergeList(Array.isArray(bv) ? bv : [], lv, rv, nested[k], {}, conf, label, null); continue; }
    if (Array.isArray(lv) && Array.isArray(rv) && [...lv, ...rv].every(x => typeof x !== 'object')) { out[k] = [...new Set([...lv, ...rv])]; continue; }
    out[k] = lv !== undefined ? lv : rv;
    conf.push({ label, field: k, out, l: lv, r: rv });
  }
  return out;
}
function mergeList(bArr, lArr, rArr, key, nested, conf, coll, labelFn = itemLabel) {
  const idx = a => new Map((a || []).filter(x => x && x[key] != null).map(x => [x[key], x]));
  const B = idx(bArr), L = idx(lArr), R = idx(rArr), out = [], seen = new Set();
  const push = (id, v) => { if (v !== undefined && !seen.has(id)) { seen.add(id); out.push(v); } };
  const one = id => {
    const b = B.get(id), l = L.get(id), r = R.get(id), label = labelFn ? labelFn(coll, l || r) : coll;
    if (l && r) return same(l, r) ? l : (typeof l === 'object' ? mergeObj(b, l, r, nested, conf, label) : l);
    if (l) return b && same(l, b) ? undefined : l; // slettet i Dropbox (uændret her) – ellers behold ændringen
    if (r) return b && same(r, b) ? undefined : r; // slettet her
  };
  for (const id of new Set([...L.keys(), ...R.keys()])) push(id, one(id));
  return out;
}
function mergeSettings(b = {}, l = {}, r = {}) {
  const out = { ...r, ...l };
  for (const k of new Set([...Object.keys(l), ...Object.keys(r)])) {
    const bv = b[k], lv = l[k], rv = r[k];
    if (['theme', 'importSnooze'].includes(k)) { out[k] = lv !== undefined ? lv : rv; continue; }
    if (['lessonsRead', 'tipsDone'].includes(k)) { out[k] = [...new Set([...(lv || []), ...(rv || [])])]; continue; }
    if (k === 'lastImport') { out[k] = [lv, rv].filter(Boolean).sort().pop(); continue; }
    if (k === 'courses') { const o = {}; for (const id of new Set([...Object.keys(lv || {}), ...Object.keys(rv || {})])) { const a = (lv || {})[id] || {}, c = (rv || {})[id] || {};
      o[id] = { ...c, ...a, step: Math.max(a.step || 0, c.step || 0), best: Math.max(a.best || 0, c.best || 0), attempts: Math.max(a.attempts || 0, c.attempts || 0), ...(a.done || c.done ? { done: true, doneAt: [a.doneAt, c.doneAt].filter(Boolean).sort()[0] } : {}) }; } out[k] = o; continue; }
    if (same(lv, bv)) out[k] = rv; else out[k] = lv; // begge ændret: denne enhed vinder for indstillinger
    if (out[k] === undefined) delete out[k];
  }
  return out;
}
function mergeStates(base, L, R) {
  const b = base || {}, conf = [], M = { ...R, ...L };
  for (const [k, nested] of Object.entries(SYNC_LISTS)) M[k] = mergeList(b[k] || [], L[k] || [], R[k] || [], 'id', nested, conf, k);
  M.networth = { items: mergeList(b.networth?.items || [], L.networth?.items || [], R.networth?.items || [], 'id', NW_NESTED, conf, 'networth') };
  M.settings = mergeSettings(b.settings, L.settings, R.settings);
  M.version = Math.max(L.version || 0, R.version || 0);
  M.isExample = same(L.isExample, b.isExample) ? !!R.isExample : !!L.isExample;
  // To enheder kan have oprettet samme faste post i samme måned – behold kun én
  const baseIds = new Set((b.transactions || []).map(t => t.id)), keep = new Map();
  M.transactions = M.transactions.filter(t => { if (!t.recurringId) return true; const k = t.recurringId + '|' + (t.date || '').slice(0, 7), prev = keep.get(k);
    if (!prev) { keep.set(k, t); return true; } if (baseIds.has(t.id) && !baseIds.has(prev.id)) { keep.set(k, t); prev._drop = true; } return false; }).filter(t => !t._drop);
  return { state: M, conflicts: conf };
}
function askSync(title, html, buttons) {
  return new Promise(res => {
    let done = false;
    openSheet(`${sheetHead(title)}${html}<div class="btn-row sync-choice">${buttons.map(([v, l, cls]) => `<button class="btn ${cls || ''}" data-sync-pick="${v}">${l}</button>`).join('')}</div>`, sh => {
      sh.addEventListener('click', e => { const b = e.target.closest('[data-sync-pick]'); if (!b) return; done = true; closeSheet(); res(b.dataset.syncPick); });
    });
    const t = setInterval(() => { if (!done && !document.querySelector('[data-sync-pick]')) { clearInterval(t); done = true; res(null); } else if (done) clearInterval(t); }, 300);
  });
}
const fmtVal = v => v == null ? '–' : typeof v === 'number' ? nf2.format(v) : typeof v === 'object' ? '(ændret)' : esc(String(v)).slice(0, 40);

/* ---------- Selve synkroniseringen ---------- */
function setSyncStatus(s, msg = '') { Sync.status = s; Sync.msg = msg; refreshSyncCard(); }
function syncFail(e) {
  if (e && e.kind === 'auth') { setSyncStatus('auth', 'Forbindelsen til Dropbox er udløbet – forbind igen.'); return; }
  if (e && e.kind === 'offline') { setSyncStatus('offline', 'Offline – synkroniserer, når der er forbindelse.'); return; }
  if (e && e.kind === 'pass') { setSyncStatus('pass', 'Filen i Dropbox er krypteret med en anden adgangsfrase.'); return; }
  console.warn('sync', e); setSyncStatus('error', (e && e.message) || 'Ukendt fejl');
}
function syncNoteChange() {
  if (Sync.suppress || !syncOn()) return;
  Sync.seq++; if (!Sync.cfg.dirty) { Sync.cfg.dirty = true; syncPersist(); }
  refreshSyncCard(); syncSoon(SYNC_CONFIG.debounceMs);
}
function syncSoon(ms) { clearTimeout(Sync.timer); Sync.timer = setTimeout(() => syncNow(false), ms); }
async function syncNow(manual) {
  if (!syncReady()) { if (manual && syncOn() && !Sync.key) syncSetupKey(); return; }
  if (Sync.busy) { Sync.again = true; return; }
  Sync.busy = true; clearTimeout(Sync.timer); setSyncStatus('syncing', 'Synkroniserer…');
  try { let r; for (let i = 0; i < 4; i++) { r = await syncOnce(); if (r !== 'retry') break; } if (r === 'retry') throw new SyncError('Kunne ikke løse konflikten – prøv igen', 'http'); if (r !== 'cancel') setSyncStatus('ok'); else setSyncStatus('idle', 'Synkronisering sat på pause – tryk "Synkroniser nu".'); if (manual && r !== 'cancel') toast('Synkroniseret med Dropbox ✓'); }
  catch (e) { syncFail(e); }
  finally { Sync.busy = false; if (Sync.again) { Sync.again = false; syncSoon(400); } }
}
function hasUserData(st) { return (st.transactions || []).some(t => !t.example) || (st.goals || []).some(g => !g.example) || (st.networth?.items || []).some(i => !i.example) || (st.recurring || []).some(r => !r.example); }
async function uploadState(rev) {
  const seq = Sync.seq, snap = JSON.stringify(S);
  const res = await dbxUpload(await syncEncrypt(snap), rev);
  if (res.conflict) return 'retry';
  await syncDone(res, snap, seq);
}
async function syncDone(meta, snap, seq) {
  const c = Sync.cfg; c.lastRev = meta.rev; c.lastSyncAt = new Date().toISOString(); c.serverModified = meta.server_modified || c.serverModified; c.dirty = Sync.seq !== seq;
  await syncSaveBase(snap); await syncPersist(); if (c.dirty) syncSoon(SYNC_CONFIG.debounceMs);
}
function applyRemote(next) {
  const theme = S.settings.theme, y = window.scrollY;
  Sync.suppress++;
  try { load(JSON.stringify(next)); S.settings.theme = theme; applyRecurring(); save(); } finally { Sync.suppress--; }
  if (!$('#modalRoot').innerHTML) { render(); window.scrollTo({ top: y }); }
}
async function syncOnce() {
  const c = Sync.cfg, meta = await dbxMeta();
  if (!meta) return uploadState(null);
  if (meta.rev === c.lastRev) { if (!c.dirty) { c.lastSyncAt = new Date().toISOString(); await syncPersist(); return; } return uploadState(meta.rev); }
  const dl = await dbxDownload(); if (!dl) return 'retry';
  let file, remote; try { file = parseSyncFile(dl.text); } catch (e) { throw new SyncError('Filen i Dropbox kan ikke læses', 'http'); }
  if (file.salt !== c.salt) throw new SyncError('pass', 'pass');
  try { remote = JSON.parse(await syncDecryptWith(file, Sync.key)); } catch (e) { throw new SyncError('pass', 'pass'); }
  const seq = Sync.seq; let next;
  if (!c.lastRev && hasUserData(S)) {
    const pick = await askSync('Data findes begge steder', `<p>Der ligger allerede data i Dropbox (gemt ${fmtDate(file.savedAt.slice(0, 10))}), og der er også data på denne enhed. Hvad vil du gøre?</p>
      <ul class="small muted"><li><b>Flet</b>: samler begge – intet slettes (anbefalet).</li><li><b>Brug Dropbox</b>: erstatter denne enheds data.</li><li><b>Behold denne enhed</b>: overskriver data i Dropbox.</li></ul>`,
      [['merge', '🔀 Flet begge', 'btn-primary'], ['remote', '☁️ Brug Dropbox'], ['local', '📱 Behold denne enhed']]);
    if (!pick) return 'cancel';
    next = pick === 'remote' ? remote : pick === 'local' ? JSON.parse(JSON.stringify(S)) : mergeStates(null, S, remote);
    if (next.state) { if (next.conflicts.length) await resolveConflicts(next.conflicts); next = next.state; }
  } else if (!c.lastRev || (!c.dirty && Sync.seq === seq)) next = remote; // ny enhed uden egne data, eller intet ændret her
  else { const m = mergeStates(await syncLoadBase(), S, remote); if (m.conflicts.length) { const ok = await resolveConflicts(m.conflicts); if (!ok) return 'cancel'; } next = m.state; }
  const before = stableStr({ ...S, settings: { ...S.settings, theme: 0 } });
  applyRemote(next);
  const remoteChangedUs = before !== stableStr({ ...S, settings: { ...S.settings, theme: 0 } });
  const differs = stableStr({ ...S, settings: { ...S.settings, theme: 0 } }) !== stableStr({ ...remote, settings: { ...remote.settings, theme: 0 } });
  if (remoteChangedUs) toast('Opdateret med ændringer fra Dropbox ☁️');
  if (differs || Sync.seq !== seq) return uploadState(dl.meta.rev || meta.rev);
  await syncDone(dl.meta.rev ? dl.meta : meta, JSON.stringify(S), Sync.seq);
}
async function resolveConflicts(conf) {
  const ex = conf.slice(0, 5).map(x => `<li>${esc(x.label)} – <i>${esc(x.field)}</i>: her <b>${fmtVal(x.l)}</b> · Dropbox <b>${fmtVal(x.r)}</b></li>`).join('');
  const pick = await askSync('Ændret to steder', `<p>${conf.length} ${conf.length === 1 ? 'felt er' : 'felter er'} ændret både på denne enhed og på en anden enhed siden sidste synkronisering. Alt andet er flettet automatisk.</p><ul class="small">${ex}</ul>${conf.length > 5 ? `<p class="muted small">… og ${conf.length - 5} mere.</p>` : ''}<p>Hvilken version vil du beholde for ${conf.length === 1 ? 'dette felt' : 'disse felter'}?</p>`,
    [['local', '📱 Denne enheds version', 'btn-primary'], ['remote', '☁️ Dropbox-versionen']]);
  if (!pick) return false;
  conf.forEach(x => { const v = pick === 'local' ? x.l : x.r; if (v === undefined) delete x.out[x.field]; else x.out[x.field] = v; });
  return true;
}
async function syncDisconnect() {
  if (!confirm('Afbryd forbindelsen til Dropbox? Dine data bliver på enheden, og den krypterede fil bliver liggende i Dropbox.')) return;
  try { if (Sync.cfg?.token) await fetch(DBX.api + '/auth/token/revoke', { method: 'POST', headers: { Authorization: 'Bearer ' + await dbxToken() } }); } catch (e) {}
  clearTimeout(Sync.timer); syncForget(); setSyncStatus('idle'); render(); toast('Dropbox er afbrudt');
}

/* ---------- Opstart og hændelser ---------- */
async function syncBoot() {
  Sync.cfg = await syncLoadCfg();
  Sync.key = Sync.cfg && Sync.cfg.key ? await aesKey(unb64(Sync.cfg.key)) : null;
  if (!Sync.handledRedirect) { Sync.handledRedirect = true; if (await syncHandleRedirect()) return; }
  refreshSyncCard();
  if (syncReady()) syncNow(false);
  else if (syncOn() && !Sync.key) setSyncStatus('pass', 'Indtast din sync-adgangsfrase for at fortsætte.');
}
function syncOnLock() { clearTimeout(Sync.timer); if (Lock.cfg && Lock.cfg.enc) { Sync.cfg = null; Sync.key = null; } }
window.addEventListener('online', () => { if (syncReady()) syncNow(false); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && syncReady() && !(typeof Lock !== 'undefined' && Lock.locked) && Date.now() - Date.parse(Sync.cfg.lastSyncAt || 0) > 60000) syncNow(false); });
window.addEventListener('pagehide', () => { if (syncReady() && Sync.cfg.dirty) syncPersist(); });

/* ---------- UI ---------- */
function syncWhen(iso) { if (!iso) return 'aldrig'; const d = new Date(iso), t = d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }); return d.toDateString() === new Date().toDateString() ? 'i dag kl. ' + t : fmtDate(iso.slice(0, 10)) + ' kl. ' + t; }
function syncSettingsCard() {
  const c = Sync.cfg;
  if (!syncOn()) return `<div class="card section" id="syncCard"><h2>☁️ Synkronisering med Dropbox</h2>
    <p class="muted small">Hold dine data ens på telefon og computer. Alt krypteres på enheden med en adgangsfrase, før det sendes – Dropbox gemmer kun én krypteret fil i appens egen mappe og kan ikke læse indholdet.</p>
    ${syncKeyReady() ? '' : '<p class="small sync-warn">⚙️ Dropbox-forbindelsen er ikke sat op endnu (appnøgle mangler).</p>'}
    <button class="btn btn-primary" data-action="sync-connect" ${syncKeyReady() ? '' : 'disabled'}>☁️ Forbind Dropbox</button></div>`;
  const st = { syncing: ['🔄', 'Synkroniserer…'], ok: ['✅', 'Synkroniseret'], offline: ['📴', 'Offline'], error: ['⚠️', 'Fejl'], auth: ['🔑', 'Log ind igen'], pass: ['🔐', 'Adgangsfrase mangler'], idle: ['⏸️', 'Klar'] }[Sync.status] || ['⏸️', 'Klar'];
  const pending = c.dirty && Sync.status !== 'syncing';
  return `<div class="card section" id="syncCard"><h2>☁️ Synkronisering med Dropbox <span class="pill ${Sync.status === 'ok' && !pending ? 'ok' : Sync.status === 'error' || Sync.status === 'auth' ? 'bad' : 'warnp'}" id="syncPill">${st[0]} ${pending && Sync.status !== 'error' ? 'Ændringer venter' : st[1]}</span></h2>
    <div class="list">
      <div class="row"><div class="main-col"><div class="title">Konto</div><div class="meta">${esc(c.account || 'Dropbox')} · fil: Apps/…${SYNC_CONFIG.file}</div></div></div>
      <div class="row"><div class="main-col"><div class="title">Seneste synkronisering</div><div class="meta" id="syncLast">${syncWhen(c.lastSyncAt)}</div></div></div>
      <div class="row"><div class="main-col"><div class="title">Kryptering</div><div class="meta">${Sync.key ? '🔐 AES-256-GCM med din sync-adgangsfrase' : 'Adgangsfrase ikke indtastet på denne enhed'}</div></div></div>
    </div>
    ${Sync.msg && Sync.status !== 'ok' ? `<p class="small sync-warn" id="syncMsg">${esc(Sync.msg)}</p>` : ''}
    <div class="btn-row" style="margin-top:10px">
      ${Sync.status === 'auth' ? '<button class="btn btn-primary" data-action="sync-connect">🔑 Forbind igen</button>' : Sync.key ? '<button class="btn btn-primary" data-action="sync-now">🔄 Synkroniser nu</button>' : '<button class="btn btn-primary" data-action="sync-pass">🔐 Indtast adgangsfrase</button>'}
      ${Sync.status === 'pass' && Sync.key ? '<button class="btn" data-action="sync-pass">🔐 Indtast adgangsfrase</button>' : ''}
      <button class="btn btn-danger" data-action="sync-disconnect">Afbryd forbindelse</button></div>
    <p class="muted small">Synkroniserer, når appen åbnes, kort efter hver ændring og når du trykker "Synkroniser nu".</p></div>`;
}
function refreshSyncCard() { const el = document.getElementById('syncCard'); if (el) el.outerHTML = syncSettingsCard(); }
const syncActions = {
  'sync-connect': () => syncConnect(),
  'sync-now': () => syncNow(true),
  'sync-pass': () => { Sync.key = null; Sync.cfg.key = null; syncSetupKey(); },
  'sync-disconnect': () => syncDisconnect()
};
