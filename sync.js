/* Synkronisering via Google Drive (skjult app-mappe "appDataFolder").
   Login: Google Identity Services token-klient i browseren (OAuth 2, kun scope drive.appdata, ingen client secret).
   Data krypteres med AES-256-GCM med en nøgle fra en separat sync-adgangsfrase (PBKDF2-SHA256), før de forlader enheden.
   Drive ser kun én krypteret fil, okonomi.enc, i appens skjulte mappe, som hverken brugeren eller andre apps kan se. */
const SYNC_CONFIG = {
  googleClientId: '972011945646-9horpvtik4csvc1man07jjjkcnq0662k.apps.googleusercontent.com', // ← Indsæt OAuth Client ID (type "Web application") her – den eneste ændring, der skal til
  scope: 'https://www.googleapis.com/auth/drive.appdata',
  fileName: 'okonomi.enc',
  iter: 600000,
  debounceMs: 4000
};
const SKEY = 'okonomi.sync', SBASE = 'okonomi.sync.base';
const GD = { gis: 'https://accounts.google.com/gsi/client', api: 'https://www.googleapis.com/drive/v3', up: 'https://www.googleapis.com/upload/drive/v3' };
const syncClientId = () => localStorage.getItem('okonomi.googleClientId') || SYNC_CONFIG.googleClientId; // lokal override kun til test
const syncKeyReady = () => /^[\w-]+\.apps\.googleusercontent\.com$/.test(syncClientId()) && !/^DIN_/.test(syncClientId());
const Sync = { cfg: null, key: null, busy: false, again: false, timer: null, suppress: 0, seq: 0, status: 'idle', msg: '', tc: null, pend: null, silentAt: 0 };
const syncOn = () => !!(Sync.cfg && Sync.cfg.provider === 'gdrive');
const syncReady = () => syncOn() && !!Sync.key;
const b64url = buf => b64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randB64url = n => b64url(crypto.getRandomValues(new Uint8Array(n)));
function stableStr(v) { if (Array.isArray(v)) return '[' + v.map(stableStr).join(',') + ']'; if (v && typeof v === 'object') return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + stableStr(v[k])).join(',') + '}'; return JSON.stringify(v === undefined ? null : v); }
const same = (a, b) => stableStr(a) === stableStr(b);
class SyncError extends Error { constructor(msg, kind) { super(msg); this.kind = kind; } }

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
// uid/hist: hver upload får et id og en liste over de versioner, den bygger på. Så kan en enhed se, om filen i Drive
// er skrevet uden at kende dens seneste upload (to samtidige uploads), og så flettes der uden at slette noget.
async function syncEncrypt(txt) {
  const iv = crypto.getRandomValues(new Uint8Array(12)), c = Sync.cfg, uid = randB64url(9);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, Sync.key, new TextEncoder().encode(txt));
  const hist = c.lastUid ? [c.lastUid, ...(c.lastHist || [])].slice(0, 40) : [];
  return { uid, hist, text: JSON.stringify({ app: 'min-okonomi', v: 1, kdf: 'PBKDF2-SHA256', iter: c.iter, salt: c.salt, enc: 'AES-GCM', iv: b64(iv), ct: b64(ct), uid, hist, savedAt: new Date().toISOString(), device: c.device }) };
}
function parseSyncFile(text) { const o = JSON.parse(text); if (o.app !== 'min-okonomi' || o.enc !== 'AES-GCM' || !o.salt) throw new Error('format'); return o; }
async function syncDecryptWith(file, key) { return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(file.iv) }, key, unb64(file.ct))); }
async function syncDeriveKey(pass, saltB64, iter) { const d = await deriveBits(pass, unb64(saltB64), iter); return { raw: b64(d.keyRaw), key: await aesKey(d.keyRaw) }; }

/* ---------- Google Identity Services (token-klient) ---------- */
let gisP = null;
const gisLoaded = () => !!(window.google && google.accounts && google.accounts.oauth2);
function loadGis() {
  if (gisLoaded()) return Promise.resolve();
  return gisP || (gisP = new Promise((res, rej) => { const el = document.createElement('script'); el.src = GD.gis; el.async = true; el.onload = () => res(); el.onerror = () => { gisP = null; el.remove(); rej(new SyncError('offline', 'offline')); }; document.head.appendChild(el); }));
}
function tokenClient() {
  if (Sync.tc) return Sync.tc;
  Sync.tc = google.accounts.oauth2.initTokenClient({ client_id: syncClientId(), scope: SYNC_CONFIG.scope,
    callback: r => { const p = Sync.pend; Sync.pend = null; if (!p) return; clearTimeout(p.t);
      if (r.error) p.rej(new SyncError(r.error_description || r.error, 'auth'));
      else if (!google.accounts.oauth2.hasGrantedAllScopes(r, SYNC_CONFIG.scope)) p.rej(new SyncError('Adgang til Google Drive blev ikke givet', 'denied'));
      else p.res(r); },
    error_callback: e => { const p = Sync.pend; Sync.pend = null; if (p) { clearTimeout(p.t); p.rej(new SyncError(e && e.type || 'popup', 'auth')); } } });
  return Sync.tc;
}
// Skal kaldes direkte fra et klik (popup). prompt '' = ingen dialog, hvis der allerede er givet samtykke.
function gisRequest(prompt = '') {
  if (!gisLoaded()) return loadGis().then(() => gisRequest(prompt));
  if (Sync.pend) { clearTimeout(Sync.pend.t); Sync.pend.rej(new SyncError('afbrudt', 'auth')); }
  return new Promise((res, rej) => {
    Sync.pend = { res, rej, t: setTimeout(() => { if (Sync.pend && Sync.pend.res === res) { Sync.pend = null; rej(new SyncError('timeout', 'auth')); } }, 120000) };
    const hint = Sync.cfg && Sync.cfg.account; tokenClient().requestAccessToken({ prompt, ...(hint ? { login_hint: hint } : {}) });
  }).then(async r => { if (!Sync.cfg) return r.access_token; Sync.cfg.token = { access: r.access_token, expiresAt: Date.now() + (Number(r.expires_in) || 3600) * 1000 }; await syncPersist(); return r.access_token; });
}
const tokenValid = () => !!(Sync.cfg && Sync.cfg.token && Sync.cfg.token.access && Sync.cfg.token.expiresAt > Date.now() + 60000);
async function gToken(interactive) {
  if (tokenValid()) return Sync.cfg.token.access;
  // Stille fornyelse uden dialog. Uden klik blokerer browseren ofte popup'en – så vises "Log ind igen", og ændringer venter lokalt.
  if (!interactive && Date.now() - Sync.silentAt < 10 * 60000) throw new SyncError('Log ind igen', 'auth');
  Sync.silentAt = Date.now();
  try { return await gisRequest(''); } catch (e) { if (e.kind === 'offline') throw e; throw new SyncError('Log ind igen', 'auth'); }
}

/* ---------- Google Drive HTTP (REST v3) ---------- */
async function gd(url, opts = {}, interactive = false, retry = true) {
  const tok = await gToken(interactive); let r;
  try { r = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: 'Bearer ' + tok } }); } catch (e) { throw new SyncError('offline', 'offline'); }
  if (r.status === 401 && retry) { Sync.cfg.token.expiresAt = 0; Sync.silentAt = 0; return gd(url, opts, interactive, false); }
  if (r.status === 401) throw new SyncError('Log ind igen', 'auth');
  if (r.status === 429 || r.status >= 500) throw new SyncError('Google Drive svarer ikke lige nu (' + r.status + ')', 'http');
  if (!r.ok) { const j = await r.json().catch(() => ({})); const m = j.error && (j.error.message || j.error.status) || ('HTTP ' + r.status);
    throw new SyncError(r.status === 403 && /scope|permission|insufficient/i.test(m) ? 'Appen har ikke adgang til Google Drive – log ind igen og giv adgang' : m, r.status === 403 && /scope|insufficient/i.test(m) ? 'auth' : 'http'); }
  return r;
}
const FIELDS = 'id,version,modifiedTime,createdTime';
async function gFind(interactive) { // alle kopier af filen i den skjulte app-mappe, ældste først
  const q = new URLSearchParams({ spaces: 'appDataFolder', q: `name = '${SYNC_CONFIG.fileName}' and trashed = false`, fields: `files(${FIELDS})`, orderBy: 'createdTime', pageSize: '10' });
  return ((await (await gd(`${GD.api}/files?${q}`, {}, interactive)).json()).files || []);
}
async function gDownload(id) { return (await gd(`${GD.api}/files/${encodeURIComponent(id)}?alt=media`)).text(); }
async function gCreate(text) {
  const bnd = 'okonomi' + randB64url(12), meta = { name: SYNC_CONFIG.fileName, parents: ['appDataFolder'], mimeType: 'application/json' };
  const body = `--${bnd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${bnd}\r\nContent-Type: application/json\r\n\r\n${text}\r\n--${bnd}--`;
  return (await gd(`${GD.up}/files?uploadType=multipart&fields=${FIELDS}`, { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + bnd }, body })).json();
}
async function gUpdate(id, text) { return (await gd(`${GD.up}/files/${encodeURIComponent(id)}?uploadType=media&fields=${FIELDS}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: text })).json(); }
async function gDelete(id) { await gd(`${GD.api}/files/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
const revOf = m => m ? m.id + ':' + m.version : null;

/* ---------- Forbind ---------- */
async function syncConnect() {
  if (!syncKeyReady()) { toast('Google Drive er ikke sat op endnu (Client ID mangler)'); return; }
  const fresh = !syncOn();
  if (fresh) Sync.cfg = { v: 2, provider: 'gdrive', device: randB64url(9), token: null, account: '', key: null, salt: null, iter: SYNC_CONFIG.iter, fileId: null, lastRev: null, lastUid: null, lastHist: [], lastSyncAt: null, dirty: true, connectedAt: new Date().toISOString() };
  setSyncStatus('syncing', 'Venter på Google…');
  try { await gisRequest(fresh ? 'consent' : ''); }
  catch (e) { if (fresh) { Sync.cfg = null; Sync.key = null; } setSyncStatus(fresh ? 'idle' : 'auth', fresh ? '' : 'Log ind igen for at synkronisere.');
    toast(e.kind === 'denied' ? 'Du skal give adgang til appens mappe i Google Drive' : e.kind === 'offline' ? 'Ingen forbindelse til Google' : 'Login blev afbrudt'); return; }
  if (fresh) { localStorage.removeItem(SBASE); Sync.key = null; await syncPersist(); toast('Google Drive er forbundet ✓'); await gAccount(); await syncSetupKey(); }
  else { toast('Logget ind igen ✓'); syncNow(false); }
}
async function gAccount() { try { const r = await gd(`${GD.api}/about?fields=user(emailAddress,displayName)`); const j = await r.json(); Sync.cfg.account = j.user && (j.user.emailAddress || j.user.displayName) || ''; await syncPersist(); refreshSyncCard(); } catch (e) {} }
async function syncSetupKey() {
  setSyncStatus('syncing', 'Tjekker Google Drive…');
  let file = null;
  try { const fs = await gFind(true); if (fs[0]) file = parseSyncFile(await gDownload(fs[0].id)); }
  catch (e) { if (e instanceof SyncError) return syncFail(e); setSyncStatus('error', 'Filen i Google Drive kan ikke læses'); return; }
  setSyncStatus('pass', 'Indtast din sync-adgangsfrase for at fortsætte.');
  openPassSheet(file, async (raw, key, salt, iter) => { Sync.key = key; Object.assign(Sync.cfg, { key: raw, salt, iter }); await syncPersist(); syncNow(true); });
}
function openPassSheet(file, onOk) {
  const create = !file;
  openSheet(`${sheetHead(create ? 'Vælg en sync-adgangsfrase' : 'Indtast din sync-adgangsfrase')}
    <p class="muted small">${create ? 'Dine data krypteres på enheden med en nøgle fra denne adgangsfrase, før de sendes til Google Drive. Google kan ikke læse dem.' : 'Der ligger allerede krypterede data i din Google Drive. Indtast den adgangsfrase, du valgte på din anden enhed.'}</p>
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
const SYNC_LISTS = { transactions: {}, recurring: {}, goals: { contributions: 'id' }, jobs: {}, rules: {}, categories: {}, receipts: {} };
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
    if (l) return b && same(l, b) ? undefined : l; // slettet på den anden side (uændret her) – ellers behold ændringen
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
function setSyncStatus(s, msg = '') { Sync.status = s; Sync.msg = msg; refreshSyncCard(); refreshSyncBanner(); }
function syncFail(e) {
  if (e && (e.kind === 'auth' || e.kind === 'denied')) { setSyncStatus('auth', Sync.cfg && Sync.cfg.dirty ? 'Dine ændringer er gemt på enheden og synkroniseres, når du logger ind igen.' : 'Log ind igen for at synkronisere.'); return; }
  if (e && e.kind === 'offline') { setSyncStatus('offline', 'Offline – synkroniserer, når der er forbindelse.'); return; }
  if (e && e.kind === 'pass') { setSyncStatus('pass', 'Filen i Google Drive er krypteret med en anden adgangsfrase.'); return; }
  console.warn('sync', e); setSyncStatus('error', (e && e.message) || 'Ukendt fejl');
}
function syncNoteChange() {
  if (Sync.suppress || !syncOn()) return;
  Sync.seq++; if (!Sync.cfg.dirty) { Sync.cfg.dirty = true; syncPersist(); }
  refreshSyncCard(); refreshSyncBanner();
  if (Sync.status === 'auth' && !tokenValid()) return; // ændringen venter lokalt, til der logges ind igen
  syncSoon(SYNC_CONFIG.debounceMs);
}
function syncSoon(ms) { clearTimeout(Sync.timer); Sync.timer = setTimeout(() => syncNow(false), ms); }
async function syncNow(manual) {
  if (!syncReady()) { if (manual && syncOn() && !Sync.key) syncSetupKey(); return; }
  if (Sync.busy) { Sync.again = true; return; }
  Sync.busy = true; clearTimeout(Sync.timer); setSyncStatus('syncing', 'Synkroniserer…');
  try { let r; for (let i = 0; i < 4; i++) { r = await syncOnce(manual); if (r !== 'retry') break; } if (r === 'retry') throw new SyncError('Kunne ikke synkronisere – prøv igen', 'http');
    if (r !== 'cancel') setSyncStatus('ok'); else setSyncStatus('idle', 'Synkronisering sat på pause – tryk "Synkroniser nu".'); if (manual && r !== 'cancel') toast('Synkroniseret med Google Drive ✓'); }
  catch (e) { syncFail(e); }
  finally { Sync.busy = false; if (Sync.again) { Sync.again = false; syncSoon(400); } }
}
function hasUserData(st) { return (st.transactions || []).some(t => !t.example) || (st.goals || []).some(g => !g.example) || (st.networth?.items || []).some(i => !i.example) || (st.recurring || []).some(r => !r.example); }
async function uploadState(extras = []) {
  const seq = Sync.seq, snap = JSON.stringify(S), c = Sync.cfg, enc = await syncEncrypt(snap);
  const meta = c.fileId ? await gUpdate(c.fileId, enc.text) : await gCreate(enc.text);
  for (const x of extras) { try { await gDelete(x.id); } catch (e) {} }
  c.fileId = meta.id; c.lastUid = enc.uid; c.lastHist = enc.hist;
  await syncDone(meta, snap, seq);
  syncSoon(8000); // kort efterkontrol: opdager en samtidig upload fra en anden enhed
}
async function syncDone(meta, snap, seq) {
  const c = Sync.cfg; c.lastRev = revOf(meta); c.lastSyncAt = new Date().toISOString(); c.dirty = Sync.seq !== seq;
  await syncSaveBase(snap); await syncPersist(); if (c.dirty) syncSoon(SYNC_CONFIG.debounceMs);
}
function applyRemote(next) {
  const theme = S.settings.theme, y = window.scrollY;
  Sync.suppress++;
  try { load(JSON.stringify(next)); S.settings.theme = theme; applyRecurring(); save(); } finally { Sync.suppress--; }
  if (!$('#modalRoot').innerHTML) { render(); window.scrollTo({ top: y }); }
}
async function readRemote(m) {
  let file; try { file = parseSyncFile(await gDownload(m.id)); } catch (e) { if (e instanceof SyncError) throw e; throw new SyncError('Filen i Google Drive kan ikke læses', 'http'); }
  if (file.salt !== Sync.cfg.salt) throw new SyncError('pass', 'pass');
  try { return { file, state: JSON.parse(await syncDecryptWith(file, Sync.key)) }; } catch (e) { throw new SyncError('pass', 'pass'); }
}
const noTheme = st => stableStr({ ...st, settings: { ...st.settings, theme: 0 } });
async function syncOnce(manual) {
  const c = Sync.cfg, files = await gFind(manual), meta = files[0], extras = files.slice(1);
  if (!meta) { c.fileId = null; c.lastUid = null; c.lastHist = []; return uploadState(); }
  c.fileId = meta.id;
  if (revOf(meta) === c.lastRev && !extras.length) { if (!c.dirty) { c.lastSyncAt = new Date().toISOString(); await syncPersist(); return; } return uploadState(); }
  const { file, state: remote0 } = await readRemote(meta); let remote = remote0;
  // Ekstra kopier (to enheder oprettede filen samtidig): flet dem ind uden at slette noget, og fjern dem bagefter
  for (const x of extras) { try { const r = await readRemote(x); remote = mergeStates(null, remote, r.state).state; } catch (e) { if (e.kind === 'pass') throw e; } }
  const seq = Sync.seq; let next;
  if (file.uid && file.uid === c.lastUid && !extras.length) { // samme indhold som vores seneste upload (kun metadata ændret)
    if (!c.dirty) { await syncDone(meta, JSON.stringify(S), Sync.seq); return; } return uploadState();
  }
  const descends = !c.lastUid || (file.hist || []).includes(c.lastUid);
  if (!c.lastRev && hasUserData(S)) {
    const pick = await askSync('Data findes begge steder', `<p>Der ligger allerede data i Google Drive (gemt ${fmtDate(file.savedAt.slice(0, 10))}), og der er også data på denne enhed. Hvad vil du gøre?</p>
      <ul class="small muted"><li><b>Flet</b>: samler begge – intet slettes (anbefalet).</li><li><b>Brug Google Drive</b>: erstatter denne enheds data.</li><li><b>Behold denne enhed</b>: overskriver data i Google Drive.</li></ul>`,
      [['merge', '🔀 Flet begge', 'btn-primary'], ['remote', '☁️ Brug Google Drive'], ['local', '📱 Behold denne enhed']]);
    if (!pick) return 'cancel';
    next = pick === 'remote' ? remote : pick === 'local' ? JSON.parse(JSON.stringify(S)) : mergeStates(null, S, remote);
    if (next.state) { if (next.conflicts.length) await resolveConflicts(next.conflicts); next = next.state; }
  } else if (!c.lastRev || (descends && !c.dirty && Sync.seq === seq && !extras.length)) next = remote; // ny enhed uden egne data, eller intet ændret her
  else {
    // Bygger filen ikke på vores seneste upload, er den skrevet af en enhed, der ikke kendte vores ændringer: flet uden sletninger
    const m = mergeStates(descends ? await syncLoadBase() : null, S, remote);
    if (m.conflicts.length) { const ok = await resolveConflicts(m.conflicts); if (!ok) return 'cancel'; } next = m.state;
  }
  const before = noTheme(S); applyRemote(next);
  if (before !== noTheme(S)) toast('Opdateret med ændringer fra Google Drive ☁️');
  c.lastUid = file.uid || null; c.lastHist = file.hist || [];
  if (noTheme(S) !== noTheme(remote0) || Sync.seq !== seq || extras.length) return uploadState(extras);
  await syncDone(meta, JSON.stringify(S), Sync.seq);
}
async function resolveConflicts(conf) {
  const ex = conf.slice(0, 5).map(x => `<li>${esc(x.label)} – <i>${esc(x.field)}</i>: her <b>${fmtVal(x.l)}</b> · Google Drive <b>${fmtVal(x.r)}</b></li>`).join('');
  const pick = await askSync('Ændret to steder', `<p>${conf.length} ${conf.length === 1 ? 'felt er' : 'felter er'} ændret både på denne enhed og på en anden enhed siden sidste synkronisering. Alt andet er flettet automatisk.</p><ul class="small">${ex}</ul>${conf.length > 5 ? `<p class="muted small">… og ${conf.length - 5} mere.</p>` : ''}<p>Hvilken version vil du beholde for ${conf.length === 1 ? 'dette felt' : 'disse felter'}?</p>`,
    [['local', '📱 Denne enheds version', 'btn-primary'], ['remote', '☁️ Google Drive-versionen']]);
  if (!pick) return false;
  conf.forEach(x => { const v = pick === 'local' ? x.l : x.r; if (v === undefined) delete x.out[x.field]; else x.out[x.field] = v; });
  return true;
}
async function syncDisconnect() {
  if (!confirm('Afbryd forbindelsen til Google Drive? Dine data bliver på enheden, og den krypterede fil bliver liggende i appens skjulte mappe i Google Drive.')) return;
  const tok = tokenValid() && Sync.cfg.token.access;
  if (tok && gisLoaded()) { try { google.accounts.oauth2.revoke(tok, () => {}); } catch (e) {} }
  clearTimeout(Sync.timer); syncForget(); Sync.tc = null; setSyncStatus('idle'); render(); toast('Google Drive er afbrudt');
}

/* ---------- Opstart og hændelser ---------- */
async function syncBoot() {
  Sync.cfg = await syncLoadCfg();
  if (Sync.cfg && Sync.cfg.provider !== 'gdrive') { syncForget(); } // rester fra den tidligere (aldrig aktiverede) Dropbox-udgave
  Sync.key = Sync.cfg && Sync.cfg.key ? await aesKey(unb64(Sync.cfg.key)) : null;
  refreshSyncCard(); refreshSyncBanner();
  if (syncOn()) loadGis().catch(() => {});
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
  if (!syncOn()) return `<div class="card section" id="syncCard"><h2>☁️ Synkronisering med Google Drive</h2>
    <p class="muted small">Hold dine data ens på telefon og computer. Alt krypteres på enheden med en adgangsfrase, før det sendes – Google Drive gemmer kun én krypteret fil i en skjult mappe, som kun denne app har adgang til, og Google kan ikke læse indholdet.</p>
    ${syncKeyReady() ? '' : '<p class="small sync-warn">⚙️ Google Drive-forbindelsen er ikke sat op endnu (Client ID mangler).</p>'}
    <button class="btn btn-primary" data-action="sync-connect" ${syncKeyReady() ? '' : 'disabled'}>☁️ Forbind Google Drive</button></div>`;
  const st = { syncing: ['🔄', 'Synkroniserer…'], ok: ['✅', 'Synkroniseret'], offline: ['📴', 'Offline'], error: ['⚠️', 'Fejl'], auth: ['🔑', 'Log ind igen'], pass: ['🔐', 'Adgangsfrase mangler'], idle: ['⏸️', 'Klar'] }[Sync.status] || ['⏸️', 'Klar'];
  const pending = c.dirty && Sync.status !== 'syncing';
  const label = Sync.status === 'auth' ? st[1] + (pending ? ' · ændringer venter' : '') : pending && Sync.status !== 'error' ? 'Ændringer venter' : st[1];
  return `<div class="card section" id="syncCard"><h2>☁️ Synkronisering med Google Drive <span class="pill ${Sync.status === 'ok' && !pending ? 'ok' : Sync.status === 'error' || Sync.status === 'auth' ? 'bad' : 'warnp'}" id="syncPill">${st[0]} ${label}</span></h2>
    <div class="list">
      <div class="row"><div class="main-col"><div class="title">Konto</div><div class="meta">${esc(c.account || 'Google-konto')} · skjult app-mappe i Google Drive</div></div></div>
      <div class="row"><div class="main-col"><div class="title">Seneste synkronisering</div><div class="meta" id="syncLast">${syncWhen(c.lastSyncAt)}</div></div></div>
      <div class="row"><div class="main-col"><div class="title">Kryptering</div><div class="meta">${Sync.key ? '🔐 AES-256-GCM med din sync-adgangsfrase' : 'Adgangsfrase ikke indtastet på denne enhed'}</div></div></div>
    </div>
    ${Sync.msg && Sync.status !== 'ok' ? `<p class="small sync-warn" id="syncMsg">${esc(Sync.msg)}</p>` : ''}
    <div class="btn-row" style="margin-top:10px">
      ${Sync.status === 'auth' ? '<button class="btn btn-primary" data-action="sync-login">🔑 Log ind igen</button>' : Sync.key ? '<button class="btn btn-primary" data-action="sync-now">🔄 Synkroniser nu</button>' : '<button class="btn btn-primary" data-action="sync-pass">🔐 Indtast adgangsfrase</button>'}
      ${Sync.status === 'pass' && Sync.key ? '<button class="btn" data-action="sync-pass">🔐 Indtast adgangsfrase</button>' : ''}
      <button class="btn btn-danger" data-action="sync-disconnect">Afbryd forbindelse</button></div>
    <p class="muted small">Synkroniserer, når appen åbnes, kort efter hver ændring og når du trykker "Synkroniser nu". Google-login varer ca. en time ad gangen; derefter fornyes det automatisk, når det kan lade sig gøre – ellers vises "Log ind igen", og dine ændringer venter sikkert på enheden.</p></div>`;
}
function refreshSyncCard() { const el = document.getElementById('syncCard'); if (el) el.outerHTML = syncSettingsCard(); }
function syncBanner() {
  if (!syncOn() || Sync.status !== 'auth') return '';
  return `<div class="banner" id="syncBanner"><span>🔑</span><div class="grow"><strong>Google Drive: log ind igen.</strong> ${Sync.cfg.dirty ? 'Dine seneste ændringer er gemt på enheden og synkroniseres, når du er logget ind.' : 'Så holdes dine enheder synkroniseret.'}</div><button class="btn btn-sm btn-primary" data-action="sync-login">Log ind igen</button></div>`;
}
function refreshSyncBanner() { const el = document.getElementById('syncBannerSlot'); if (el) el.innerHTML = syncBanner(); }
// Login-popups skal åbnes direkte i klik-handleren (ingen await før), ellers blokerer Safari/iOS dem
function syncLoginClick() {
  if (!gisLoaded()) { loadGis().then(() => toast('Tryk på "Log ind igen" en gang til')).catch(() => toast('Ingen forbindelse til Google')); return; }
  setSyncStatus('syncing', 'Venter på Google…');
  gisRequest('').then(() => { toast('Logget ind igen ✓'); syncNow(true); }).catch(e => syncFail(e.kind === 'offline' ? e : new SyncError('Log ind igen', 'auth')));
}
const syncActions = {
  'sync-connect': () => syncConnect(),
  'sync-login': () => syncLoginClick(),
  'sync-now': () => { if (syncReady() && !tokenValid() && gisLoaded()) { Sync.silentAt = Date.now(); gisRequest('').then(() => syncNow(true)).catch(e => syncFail(e)); } else syncNow(true); },
  'sync-pass': () => { Sync.key = null; Sync.cfg.key = null; syncSetupKey(); },
  'sync-disconnect': () => syncDisconnect()
};
