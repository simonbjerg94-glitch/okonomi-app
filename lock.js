/* App-lås: PIN (PBKDF2-SHA256), valgfri AES-GCM-kryptering af data, passkey som bekvem oplåsning (kun uden kryptering), auto-lås.
   Låsekonfigurationen ligger i sin egen nøgle og er ikke en del af backuppen. Data slettes aldrig ved forkerte forsøg. */
const LKEY = 'okonomi.lock', TKEY = 'okonomi.theme', PBKDF2_ITER = 600000;
const Lock = { cfg: null, key: null, locked: false, started: false, queue: Promise.resolve(), lastAct: Date.now(), hiddenAt: 0, onStart: null };
function lockCfg() { try { return JSON.parse(localStorage.getItem(LKEY)); } catch (e) { return null; } }
function saveLockCfg(c) { if (c) localStorage.setItem(LKEY, JSON.stringify(c)); else localStorage.removeItem(LKEY); Lock.cfg = c; }
const lockOn = () => !!Lock.cfg;
function b64(buf) { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function deriveBits(pin, salt, iter) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, base, 512));
  return { verify: bits.slice(0, 32), keyRaw: bits.slice(32) };
}
const aesKey = raw => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
function sameBytes(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; }
async function checkPin(pin, cfg = Lock.cfg) { const d = await deriveBits(pin, unb64(cfg.salt), cfg.iter); return sameBytes(d.verify, unb64(cfg.verify)) ? d : null; }
async function makeLockCfg(pin, base = {}) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), d = await deriveBits(pin, salt, PBKDF2_ITER);
  return { cfg: { v: 1, ...base, salt: b64(salt), iter: PBKDF2_ITER, verify: b64(d.verify), fails: 0, until: 0 }, d };
}
async function encryptText(txt, key) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(txt)); return JSON.stringify({ enc: 'AES-GCM', v: 1, iv: b64(iv), ct: b64(ct) }); }
async function decryptText(blob, key) { const o = JSON.parse(blob); return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(o.iv) }, key, unb64(o.ct))); }
const isEncBlob = raw => { try { return JSON.parse(raw)?.enc === 'AES-GCM'; } catch (e) { return false; } };
/* Kaldes af save(): returnerer true hvis låsen har håndteret skrivningen */
function lockWrite(txt) {
  if (!Lock.cfg || !Lock.cfg.enc) return false;
  if (!Lock.key) return true; // aldrig skriv ukrypteret, når kryptering er slået til
  const key = Lock.key;
  Lock.queue = Lock.queue.then(async () => localStorage.setItem(KEY, await encryptText(txt, key))).catch(() => toast('Kunne ikke gemme krypteret – browserens lager er måske fuldt'));
  return true;
}
const delayLeft = () => Math.max(0, Math.ceil((((Lock.cfg?.until) || 0) - Date.now()) / 1000));
function failDelay(f) { return f < 3 ? 0 : Math.min(300, 5 * 2 ** (f - 3)); }

/* ---------- Låseskærm ---------- */
function showLockScreen(msg = '') {
  Lock.locked = true; document.documentElement.classList.add('locked');
  const c = Lock.cfg, el = document.getElementById('lockScreen'); el.hidden = false;
  const pk = c.passkey && !c.enc && window.PublicKeyCredential;
  el.innerHTML = `<form class="lock-box" id="lockForm" autocomplete="off">
    <img src="icons/icon.svg" alt="" width="64" height="64">
    <h1>Min Økonomi er låst</h1>
    <p class="muted small">Indtast din PIN-kode for at fortsætte.</p>
    <input class="input pin-input" id="lockPin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" placeholder="••••" aria-label="PIN-kode" autocomplete="off" enterkeyhint="go">
    <div class="lock-msg" id="lockMsg" role="alert">${msg}</div>
    <button class="btn btn-primary btn-block" id="lockGo" type="submit">Lås op</button>
    ${pk ? '<button class="btn btn-block" type="button" id="lockPasskey">👆 Lås op med Face ID / fingeraftryk</button>' : ''}
    <button class="btn btn-ghost btn-sm" type="button" id="lockForgot">Glemt PIN?</button>
    <p class="muted small lock-note">${c.enc ? '🔐 Dine data er krypteret på denne enhed.' : '🙈 Låsen skjuler dine data på skærmen. Data er ikke krypteret.'}</p>
  </form>`;
  const pin = el.querySelector('#lockPin'); setTimeout(() => pin.focus(), 50);
  el.querySelector('#lockForm').addEventListener('submit', e => { e.preventDefault(); tryUnlock(pin.value); });
  el.querySelector('#lockForgot').addEventListener('click', openForgot);
  el.querySelector('#lockPasskey')?.addEventListener('click', passkeyUnlock);
  tickDelay();
}
function tickDelay() {
  clearTimeout(Lock._t); const left = delayLeft(), msg = document.getElementById('lockMsg'), go = document.getElementById('lockGo'); if (!msg) return;
  if (left > 0) { go.disabled = true; msg.textContent = `For mange forkerte forsøg. Prøv igen om ${left} sek. Dine data er uændrede.`; Lock._t = setTimeout(tickDelay, 1000); }
  else { go.disabled = false; if (/Prøv igen om/.test(msg.textContent)) msg.textContent = ''; }
}
async function tryUnlock(pin) {
  const msg = document.getElementById('lockMsg'), go = document.getElementById('lockGo');
  if (delayLeft() > 0) return tickDelay();
  if (!/^\d{4,8}$/.test(pin)) { msg.textContent = 'PIN-koden er 4–8 cifre.'; return; }
  go.disabled = true; go.textContent = 'Låser op…';
  const d = await checkPin(pin).catch(() => null);
  go.textContent = 'Lås op'; go.disabled = false;
  if (!d) {
    const c = { ...Lock.cfg, fails: (Lock.cfg.fails || 0) + 1 }; const w = failDelay(c.fails); c.until = w ? Date.now() + w * 1000 : 0; saveLockCfg(c);
    const p = document.getElementById('lockPin'); p.value = ''; p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake');
    msg.textContent = `Forkert PIN-kode.${c.fails >= 2 ? ` (${c.fails} forsøg)` : ''}`; tickDelay(); p.focus(); return;
  }
  if (Lock.cfg.enc) Lock.key = await aesKey(d.keyRaw);
  await finishUnlock();
}
async function finishUnlock() {
  let raw = localStorage.getItem(KEY);
  if (Lock.cfg.enc && raw && isEncBlob(raw)) {
    try { raw = await decryptText(raw, Lock.key); } catch (e) { Lock.key = null; document.getElementById('lockMsg').textContent = 'Data kunne ikke dekrypteres. Prøv igen, eller brug "Glemt PIN?" for at gendanne fra backup.'; return; }
  }
  saveLockCfg({ ...Lock.cfg, fails: 0, until: 0 });
  Lock.locked = false; Lock.lastAct = Date.now();
  document.documentElement.classList.remove('locked'); const el = document.getElementById('lockScreen'); el.hidden = true; el.innerHTML = '';
  Lock.onStart(raw, !Lock.started); Lock.started = true;
  if (Lock.cfg.enc && raw && !isEncBlob(localStorage.getItem(KEY))) save(); // krypter data, der endnu ligger ukrypteret
}
async function lockNow() {
  if (!lockOn() || Lock.locked) return;
  await Lock.queue; closeSheet();
  if (typeof charts !== 'undefined') charts.splice(0).forEach(c => c.destroy());
  document.getElementById('view').innerHTML = '';
  if (Lock.cfg.enc) { Lock.key = null; S = null; }
  showLockScreen();
}
function lockBoot(onStart) {
  Lock.onStart = onStart; Lock.cfg = lockCfg();
  if (!Lock.cfg) { document.documentElement.classList.remove('locked'); Lock.started = true; onStart(null, true); return; }
  showLockScreen();
}
/* Auto-lås */
['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(ev => window.addEventListener(ev, () => { Lock.lastAct = Date.now(); }, { passive: true, capture: true }));
setInterval(() => { const a = Lock.cfg?.autolock; if (lockOn() && !Lock.locked && a > 0 && Date.now() - Lock.lastAct > a * 60000) lockNow(); }, 10000);
document.addEventListener('visibilitychange', () => {
  if (!lockOn() || Lock.locked) return; const a = Lock.cfg.autolock;
  if (document.hidden) { Lock.hiddenAt = Date.now(); if (a === -1) lockNow(); }
  else if (a > 0 && Lock.hiddenAt && Date.now() - Lock.hiddenAt >= a * 60000) lockNow();
});

/* ---------- Glemt PIN ---------- */
function openForgot() {
  openSheet(`${sheetHead('Glemt PIN-kode?')}
    <p>Af sikkerhedsgrunde kan PIN-koden ikke nulstilles${Lock.cfg.enc ? ', og dine krypterede data kan ikke læses uden den' : ''}. Du har to muligheder:</p>
    <div class="card section"><h3 style="margin-top:0">📂 Gendan fra en backup-fil</h3><p class="muted small">Vælg en backup (JSON), som du tidligere har hentet fra appen. Låsen fjernes, og dataene på denne enhed erstattes af backuppen.</p>
      <button class="btn btn-primary" id="fgRestore">Vælg backup-fil</button><input type="file" id="fgFile" accept=".json,application/json" hidden></div>
    <div class="card section danger-zone"><h3 style="margin-top:0">🗑️ Slet alt og start forfra</h3><p class="muted small"><b>Alle data på denne enhed slettes permanent</b> – posteringer, mål, budgetter, jobs og kursus-fremskridt. Det kan ikke fortrydes.</p>
      <div class="field"><label for="fgConfirm">Skriv <b>SLET</b> for at bekræfte</label><input class="input" id="fgConfirm" autocomplete="off"></div>
      <button class="btn btn-danger" id="fgWipe" disabled>Slet alle data</button></div>`, sh => {
    const f = sh.querySelector('#fgFile');
    sh.querySelector('#fgRestore').onclick = () => f.click();
    f.onchange = async () => {
      try { const txt = await f.files[0].text(), data = JSON.parse(txt); if (!Array.isArray(data.categories) || !Array.isArray(data.transactions)) throw 0;
        if (!confirm(`Gendan backup med ${data.transactions.length} posteringer og fjern app-låsen?`)) return;
        await Lock.queue; Lock.key = null; saveLockCfg(null); localStorage.setItem(KEY, JSON.stringify(data)); closeSheet(); unlockFresh(); toast('Backup gendannet – app-låsen er slået fra'); }
      catch (e) { toast('Filen er ikke en gyldig backup'); }
    };
    const c = sh.querySelector('#fgConfirm'), w = sh.querySelector('#fgWipe');
    c.oninput = () => { w.disabled = c.value.trim().toUpperCase() !== 'SLET'; };
    w.onclick = async () => { if (!confirm('Sidste chance: Slet ALLE data på denne enhed permanent?')) return; await Lock.queue; Lock.key = null; saveLockCfg(null); localStorage.removeItem(KEY); closeSheet(); unlockFresh(); toast('Alle data er slettet'); };
  });
}
function unlockFresh() { Lock.locked = false; document.documentElement.classList.remove('locked'); const el = document.getElementById('lockScreen'); el.hidden = true; el.innerHTML = ''; Lock.onStart(null, !Lock.started); Lock.started = true; }

/* ---------- Passkey (bekvemmelighed, kun uden kryptering) ---------- */
async function passkeyAvailable() { try { return !!window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); } catch (e) { return false; } }
async function passkeyRegister() {
  if (!(await passkeyAvailable())) { toast('Face ID / fingeraftryk understøttes ikke i denne browser'); return; }
  try {
    const cred = await navigator.credentials.create({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'Min Økonomi' },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'min-okonomi', displayName: (S.settings.name || 'Simon') + ' – Min Økonomi' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, timeout: 60000, attestation: 'none' } });
    saveLockCfg({ ...Lock.cfg, passkey: { id: b64(cred.rawId) } }); toast('Face ID / fingeraftryk tilføjet ✓'); render();
  } catch (e) { console.warn('passkey', e); toast(e && e.name === 'NotAllowedError' ? 'Passkey blev annulleret' : 'Passkey blev ikke oprettet'); }
}
async function passkeyUnlock() {
  const msg = document.getElementById('lockMsg');
  if (delayLeft() > 0) return tickDelay();
  try {
    await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: unb64(Lock.cfg.passkey.id) }], userVerification: 'required', timeout: 60000 } });
    await finishUnlock();
  } catch (e) { msg.textContent = 'Oplåsning med passkey lykkedes ikke – brug PIN-koden.'; }
}

/* ---------- Indstillinger ---------- */
const AUTOLOCK = [[-1, 'Straks, når appen skjules'], [1, 'Efter 1 minut'], [5, 'Efter 5 minutter'], [15, 'Efter 15 minutter'], [0, 'Aldrig']];
function lockSettingsCard() {
  const c = Lock.cfg;
  if (!c) return `<div class="card section" id="lockCard"><h2>🔒 App-lås</h2>
    <p class="muted small">Beskyt appen med en PIN-kode – evt. med kryptering af dine data og Face ID/fingeraftryk. Låsen gælder kun denne enhed og browser.</p>
    <button class="btn btn-primary" data-action="lock-setup">🔒 Slå app-lås til</button></div>`;
  return `<div class="card section" id="lockCard"><h2>🔒 App-lås <span class="pill ok">Til</span></h2>
    <div class="list">
      <div class="row"><div class="main-col"><div class="title">Beskyttelse</div><div class="meta">${c.enc ? '🔐 PIN + AES-256-GCM-kryptering af dine data' : '🙈 PIN som privatlivsskærm (data er ikke krypteret)'}</div></div></div>
      <div class="row"><div class="main-col"><div class="title">Auto-lås</div></div><select class="input" id="autoLock" style="max-width:230px">${AUTOLOCK.map(([v, l]) => `<option value="${v}" ${c.autolock === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      ${c.enc ? '' : `<div class="row"><div class="main-col"><div class="title">Face ID / fingeraftryk</div><div class="meta">${c.passkey ? 'Tilføjet – bruges som genvej. PIN virker altid.' : 'Bekvem oplåsning med enhedens passkey, hvis den understøttes.'}</div></div>${c.passkey ? '<button class="btn btn-sm" data-action="passkey-remove">Fjern</button>' : '<button class="btn btn-sm" data-action="passkey-add" id="pkAdd">Tilføj</button>'}</div>`}
    </div>
    ${c.enc ? '<p class="muted small">⚠️ Backup-filer (JSON) er <b>ikke</b> krypteret – opbevar dem sikkert. Glemmer du PIN-koden, er en backup den eneste vej tilbage.</p>' : ''}
    <div class="btn-row" style="margin-top:10px"><button class="btn" data-action="lock-now">🔒 Lås nu</button><button class="btn" data-action="lock-change">Skift PIN</button><button class="btn btn-danger" data-action="lock-off">Slå app-lås fra</button></div></div>`;
}
const pinField = (id, label) => `<div class="field"><label for="${id}">${label}</label><input class="input pin-input sm" id="${id}" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="new-password"></div>`;
function openLockSetup() {
  openSheet(`${sheetHead('Slå app-lås til')}
    <div class="lock-warn"><b>1. Tag en backup først</b><p class="small">Hent en backup-fil, før du slår låsen til. Glemmer du PIN-koden, er den din vej tilbage.</p>
      <button class="btn btn-sm" type="button" data-action="export-json">💾 Hent backup nu</button>
      <label class="check"><input type="checkbox" id="lsBackup"> Jeg har en frisk backup gemt et sikkert sted</label></div>
    <h3>2. Vælg PIN-kode (4–8 cifre)</h3>
    <div class="grid cols-2">${pinField('lsPin', 'PIN-kode')}${pinField('lsPin2', 'Gentag PIN-kode')}</div>
    <h3>3. Hvor stærk skal låsen være?</h3>
    <label class="switch"><span>🔐 Kryptér mine data (AES-256-GCM)</span><input type="checkbox" id="lsEnc"></label>
    <div class="lock-info" id="lsInfo"></div>
    <div class="field"><label for="lsAuto">Auto-lås</label><select class="input" id="lsAuto">${AUTOLOCK.map(([v, l]) => `<option value="${v}" ${v === 5 ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="lock-msg" id="lsMsg" role="alert"></div>
    <button class="btn btn-primary btn-block" id="lsGo">🔒 Slå app-lås til</button>`, sh => {
    const info = sh.querySelector('#lsInfo'), enc = sh.querySelector('#lsEnc');
    const upd = () => { info.className = 'lock-info ' + (enc.checked ? 'warn' : ''); info.innerHTML = enc.checked
      ? '⚠️ <b>Dine data krypteres med en nøgle, der kommer fra din PIN-kode.</b> Glemmer du PIN-koden, kan ingen – heller ikke appen – gendanne dine data. Den eneste vej tilbage er en backup-fil. Face ID/fingeraftryk kan ikke bruges sammen med kryptering.'
      : 'ℹ️ <b>Uden kryptering er låsen en privatlivsskærm:</b> den skjuler appen for andre, der låner din telefon, men dataene ligger ukrypteret i browseren. Glemmer du PIN-koden, kan du gendanne fra backup eller slette data og starte forfra.'; };
    enc.onchange = upd; upd();
    sh.querySelector('#lsGo').onclick = async () => {
      const p1 = sh.querySelector('#lsPin').value, p2 = sh.querySelector('#lsPin2').value, m = sh.querySelector('#lsMsg');
      if (!/^\d{4,8}$/.test(p1)) return m.textContent = 'PIN-koden skal være 4–8 cifre.';
      if (p1 !== p2) return m.textContent = 'De to PIN-koder er ikke ens.';
      if (/^(\d)\1+$/.test(p1) || '0123456789'.includes(p1) || '9876543210'.includes(p1)) { if (!confirm('Den PIN-kode er let at gætte. Vil du bruge den alligevel?')) return; }
      if (enc.checked && !sh.querySelector('#lsBackup').checked) return m.textContent = 'Med kryptering skal du bekræfte, at du har en frisk backup.';
      const btn = sh.querySelector('#lsGo'); btn.disabled = true; btn.textContent = 'Slår låsen til…';
      const { cfg, d } = await makeLockCfg(p1, { enc: enc.checked, autolock: Number(sh.querySelector('#lsAuto').value), since: todayISO() });
      saveLockCfg(cfg);
      if (cfg.enc) { Lock.key = await aesKey(d.keyRaw); save(); await Lock.queue; }
      Lock.lastAct = Date.now(); closeSheet(); render(); toast(cfg.enc ? 'App-lås og kryptering er slået til 🔐' : 'App-lås er slået til 🔒');
    };
  });
}
function openPinPrompt(title, extra, onOk) {
  openSheet(`${sheetHead(title)}${extra.top || ''}${pinField('ppCur', 'Nuværende PIN-kode')}${extra.fields || ''}<div class="lock-msg" id="ppMsg" role="alert"></div><button class="btn ${extra.danger ? 'btn-danger' : 'btn-primary'} btn-block" id="ppGo">${extra.btn}</button>`, sh => {
    sh.querySelector('#ppGo').onclick = async () => {
      const m = sh.querySelector('#ppMsg'), b = sh.querySelector('#ppGo');
      if (delayLeft() > 0) return m.textContent = `For mange forkerte forsøg. Vent ${delayLeft()} sek.`;
      b.disabled = true; const d = await checkPin(sh.querySelector('#ppCur').value).catch(() => null); b.disabled = false;
      if (!d) { const c = { ...Lock.cfg, fails: (Lock.cfg.fails || 0) + 1 }; const w = failDelay(c.fails); c.until = w ? Date.now() + w * 1000 : 0; saveLockCfg(c); return m.textContent = 'Forkert PIN-kode.'; }
      saveLockCfg({ ...Lock.cfg, fails: 0, until: 0 });
      const err = await onOk(sh, d); if (err) m.textContent = err;
    };
  });
}
const lockActions = {
  'lock-setup': () => openLockSetup(),
  'lock-now': () => lockNow(),
  'lock-off': () => openPinPrompt('Slå app-lås fra', { top: `<p class="muted small">${Lock.cfg.enc ? 'Dine data dekrypteres og gemmes igen ukrypteret i browseren.' : 'Appen åbner herefter uden PIN-kode.'}</p>`, btn: 'Slå app-lås fra', danger: true }, async () => {
    await Lock.queue; const wasEnc = Lock.cfg.enc; Lock.key = null; saveLockCfg(null); if (wasEnc) save(); closeSheet(); render(); toast('App-lås er slået fra'); }),
  'lock-change': () => openPinPrompt('Skift PIN-kode', { fields: `<div class="grid cols-2">${pinField('ppNew', 'Ny PIN-kode')}${pinField('ppNew2', 'Gentag ny PIN-kode')}</div>`, btn: 'Gem ny PIN-kode' }, async sh => {
    const p1 = sh.querySelector('#ppNew').value, p2 = sh.querySelector('#ppNew2').value;
    if (!/^\d{4,8}$/.test(p1)) return 'Den nye PIN-kode skal være 4–8 cifre.'; if (p1 !== p2) return 'De nye PIN-koder er ikke ens.';
    await Lock.queue; const old = Lock.cfg; const { cfg, d } = await makeLockCfg(p1, { enc: old.enc, autolock: old.autolock, since: old.since, passkey: old.passkey });
    saveLockCfg(cfg); if (cfg.enc) { Lock.key = await aesKey(d.keyRaw); save(); await Lock.queue; }
    closeSheet(); toast('PIN-koden er skiftet ✓'); }),
  'passkey-add': () => passkeyRegister(),
  'passkey-remove': () => { const c = { ...Lock.cfg }; delete c.passkey; saveLockCfg(c); render(); toast('Passkey fjernet'); }
};
