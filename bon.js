/* Bon-scanning: OCR i browseren (Tesseract.js + dansk sprogdata, leveret lokalt i vendor/ocr og først hentet når man scanner).
   En bon er et bilag til en betaling – aldrig en ny udgift i sig selv. Den knyttes til bankposteringen (beløb ±1 kr, dato ±3 dage,
   ens butiksnavn). Ikke-matchede bonner står som "afventer bank" og tæller kun med, hvis de markeres som kontant
   (så oprettes én kontant-postering, som fjernes igen, hvis bonen senere knyttes til en bankbetaling). Data: S.receipts (synk + backup). */
const OCR = { base: 'vendor/ocr/' };
let ocrWorker = null, ocrLoading = null;
const receipts = () => (S.receipts = Array.isArray(S.receipts) ? S.receipts : []);
const bonById = id => receipts().find(r => r.id === id);
const txById = id => S.transactions.find(t => t.id === id);
function bonStatus(r) {
  if (r.txId && txById(r.txId)) return 'linked';
  if (r.cash && r.cashTxId && txById(r.cashTxId)) return 'cash';
  return 'pending';
}
const BON_STATUS = { linked: ['✅', 'Knyttet til betaling'], cash: ['💵', 'Kontant – tæller med'], pending: ['⏳', 'Afventer bank'] };

/* ---------- OCR ---------- */
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Kunne ikke hente ' + src)); document.head.appendChild(s); }); }
async function ocrLoad(onProgress) {
  if (ocrWorker) return ocrWorker;
  if (!ocrLoading) ocrLoading = (async () => {
    if (!window.Tesseract) await loadScript(OCR.base + 'tesseract.min.js');
    const abs = p => new URL(OCR.base + p, location.href).href;
    ocrWorker = await Tesseract.createWorker('dan', 1, { workerPath: abs('worker.min.js'), corePath: abs('core'), langPath: abs('lang'), gzip: true, cacheMethod: 'none', logger: m => ocrLoad.cb && ocrLoad.cb(m) });
    return ocrWorker;
  })().catch(e => { ocrLoading = null; throw e; });
  ocrLoad.cb = onProgress;
  return ocrLoading;
}
function fileToImage(file) { return new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = () => rej(new Error('Ikke et billede')); im.src = u; }); }
function scaled(im, max, gray) {
  const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
  c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
  const x = c.getContext('2d'); if (gray) x.filter = 'grayscale(1) contrast(1.25)'; x.drawImage(im, 0, 0, c.width, c.height); return c;
}

/* ---------- Fortolkning af bon-tekst ---------- */
const CHAINS = ['netto', 'føtex', 'bilka', 'rema 1000', 'lidl', 'coop 365', 'kvickly', 'superbrugsen', "dagli'brugsen", 'brugsen', 'meny', 'spar', 'irma', 'aldi', 'løvbjerg', 'lovbjerg', '7-eleven', 'normal', 'matas', 'circle k', 'q8', 'shell', 'ok plus', 'ikea', 'jysk', 'elgiganten', 'power', 'harald nyborg', 'silvan', 'bauhaus', 'apotek', 'salling', 'flying tiger', 'søstrene grene', 'h&m', 'imerco', 'sportmaster', 'stark', 'xl-byg', 'deichmann', 'zalando', 'mcdonald', 'burger king', 'sunset', 'joe & the juice', 'espresso house', 'baresso'];
const TOTAL_KW = [[/at\s*betale/i, 4], [/i\s*alt|ialt|total/i, 3], [/\bsum\b|subtotal/i, 2], [/dankort|visa|mastercard|kortbetaling|betalt/i, 1]];
const AMT_RE = /-?\d{1,3}(?:[.\s]\d{3})*,\d{2}(?!\d)|-?\d+[.,]\d{2}(?!\d)/g;
function bonNum(s) {
  s = String(s).replace(/\s/g, '');
  if (/,\d{2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/\.\d{2}$/.test(s)) s = s.replace(/,/g, '');
  const n = parseFloat(s); return isNaN(n) ? null : n;
}
function bonDate(text) {
  const today = new Date(); today.setHours(23, 59);
  const cands = [];
  for (const m of text.matchAll(/\b(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2}|\d{4})\b/g)) cands.push([+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2], +m[1]]);
  for (const m of text.matchAll(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g)) cands.push([+m[1], +m[2], +m[3]]);
  for (const [y, mo, d] of cands) {
    const dt = new Date(y, mo - 1, d);
    if (dt.getMonth() !== mo - 1 || y < 2015 || dt > today) continue;
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
}
function parseReceipt(text) {
  const lines = String(text || '').split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const low = text.toLowerCase();
  let store = '';
  const chain = CHAINS.find(c => new RegExp('(^|[^a-zæøå])' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-zæøå])', 'i').test(low));
  if (chain) { const l = lines.find(l => l.toLowerCase().includes(chain)); store = (l && l.length <= 32 ? l : chain).replace(/[^\p{L}\d&' .\-]/gu, '').trim(); }
  if (!store) store = (lines.find(l => /[a-zæøå]{3,}/i.test(l) && !/kvittering|tlf|telefon|cvr|www|@|\d{4} [a-zæøå]/i.test(l) && !AMT_RE.test(l)) || '').slice(0, 32);
  AMT_RE.lastIndex = 0;
  let total = null, best = 0, totalIdx = -1;
  lines.forEach((l, i) => {
    if (/moms|rabat|byttepenge|retur|kontant modtaget|heraf/i.test(l)) return;
    for (const [re, w] of TOTAL_KW) {
      if (!re.test(l) || w <= best) continue;
      let am = l.match(AMT_RE) || (lines[i + 1] || '').match(AMT_RE);
      if (am) { const v = bonNum(am[am.length - 1]); if (v > 0) { total = v; best = w; totalIdx = i; } }
    }
  });
  const items = [];
  lines.forEach((l, i) => {
    if (totalIdx >= 0 && i >= totalIdx) return;
    const m = l.match(/^(.*?[a-zæøå].*?)\s+(-?\d{1,3}(?:[.\s]\d{3})*,\d{2}|-?\d+[.,]\d{2})$/i);
    if (!m || /moms|sum|total|i alt|at betale|dankort|visa|byttepenge|cvr|tlf/i.test(m[1])) return;
    const v = bonNum(m[2]); if (v != null && Math.abs(v) < 100000) items.push({ name: m[1].replace(/[^\p{L}\d %&.,'\-]/gu, '').trim().slice(0, 40), amount: v });
  });
  if (total == null) { const all = (text.match(AMT_RE) || []).map(bonNum).filter(v => v > 0); if (all.length) total = Math.max(...all); }
  if (store && store === store.toUpperCase()) store = store.toLowerCase().replace(/(^|[\s\-'])(\p{L})/gu, (m, a, c) => a + c.toUpperCase());
  return { store, date: bonDate(text), total, items: items.slice(0, 40) };
}

/* ---------- Matching mod bankposteringer ---------- */
const BON_STOP = new Set(['dk', 'nota', 'nr', 'visa', 'dankort', 'mastercard', 'mc', 'kortkøb', 'køb', 'betaling', 'aps', 'as', 'a/s', 'kvittering', 'butik', 'ref', 'mobilepay', 'og', 'den', 'kl', 'dkk', 'kr']);
const bonTok = s => String(s || '').toLowerCase().replace(/foetex|f.tex/g, 'føtex').replace(/\d+/g, ' ').replace(/[^a-zæøå&]+/g, ' ').split(' ').filter(w => w.length >= 2 && !BON_STOP.has(w));
function lev(a, b) { if (Math.abs(a.length - b.length) > 2) return 9; const d = [...Array(b.length + 1).keys()]; for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } } return d[b.length]; }
function merchSim(a, b) {
  const A = bonTok(a), B = bonTok(b); if (!A.length || !B.length) return 0;
  const hit = A.filter(x => B.some(y => x === y || (x.length >= 4 && y.length >= 4 && (x.startsWith(y) || y.startsWith(x) || lev(x, y) <= 1)))).length;
  return hit / Math.min(A.length, B.length);
}
const bonDays = (a, b) => Math.abs(Math.round((Date.parse(a) - Date.parse(b)) / 864e5));
/* Kandidater: udgift, beløb ±1 kr, dato ±3 dage. Sikker = præcis én kandidat med ens butiksnavn (og bonen er ikke markeret kontant). */
function bonCandidates(r, txs) {
  if (!(r.total > 0) || !r.date) return [];
  return txs.filter(t => t.type === 'expense' && !t.cashReceipt && (!t.receiptId || t.receiptId === r.id) && !(r.rejected || []).includes(t.id) && Math.abs(t.amount - r.total) <= 1.0001 && bonDays(t.date, r.date) <= 3)
    .map(t => ({ t, sim: merchSim(r.store, t.note), diff: Math.abs(t.amount - r.total), days: bonDays(t.date, r.date) }))
    .sort((a, b) => b.sim - a.sim || a.diff - b.diff || a.days - b.days);
}
function bonClassify(r, txs) {
  const c = bonCandidates(r, txs); if (!c.length) return { kind: 'none', cands: [] };
  const strong = c.filter(x => x.sim >= 0.5);
  if (strong.length === 1 && !r.cash) return { kind: 'sure', tx: strong[0].t, cands: c };
  return { kind: 'ask', cands: c };
}
function bonLink(r, tx) {
  for (const o of S.transactions) if (o.receiptId === r.id && o.id !== tx.id && !o.cashReceipt) delete o.receiptId;
  if (r.cashTxId) S.transactions = S.transactions.filter(t => t.id !== r.cashTxId); // kontant-posteringen erstattes af bankbetalingen – aldrig dobbelt
  r.cash = false; delete r.cashTxId; r.txId = tx.id; tx.receiptId = r.id;
}
function bonUnlink(r) { const t = txById(r.txId); if (t && t.receiptId === r.id) delete t.receiptId; if (r.txId) (r.rejected = r.rejected || []).push(r.txId); delete r.txId; }
function bonSetCash(r, on) {
  if (on) {
    if (bonStatus(r) === 'linked') return false;
    const t = { id: uid(), type: 'expense', amount: r.total, date: r.date, note: r.store || 'Kontant køb', categoryId: r.categoryId || guessBonCat(r), receiptId: r.id, cashReceipt: true };
    S.transactions.push(t); r.cash = true; r.cashTxId = t.id;
  } else { S.transactions = S.transactions.filter(t => t.id !== r.cashTxId); r.cash = false; delete r.cashTxId; }
  return true;
}
function guessBonCat(r) {
  try { const c = classify(r.store || '', 'expense'); if (c && c.categoryId) return c.categoryId; } catch (e) {}
  return (S.categories.find(c => c.id === 'c-dagligvarer') || catsOf('expense')[0]).id;
}
/* Kører for alle ventende bonner mod eksisterende posteringer. Returnerer {linked, ask:[{r,cands}]} */
function bonAutoMatch() {
  const out = { linked: [], ask: [] };
  for (const r of receipts()) {
    if (bonStatus(r) === 'linked') continue;
    const m = bonClassify(r, S.transactions);
    if (m.kind === 'sure') { bonLink(r, m.tx); out.linked.push(r); } else if (m.kind === 'ask') out.ask.push({ r, cands: m.cands });
  }
  return out;
}
/* Import: rows = rækker fra gennemse-import. Sætter row.bonId for sikre match, returnerer spørgsmål for usikre. */
function bonImportMatch(rows) {
  const ask = []; rows.forEach(o => { if (o.bonAuto) { delete o.bonId; delete o.bonAuto; } });
  const used = new Set(rows.filter(o => o.bonId).map(o => o.bonId));
  for (const r of receipts()) {
    if (bonStatus(r) === 'linked' || used.has(r.id)) continue;
    const pool = rows.filter(o => o.include && !o.dupe && !o.bonId && !(o.bonNo || []).includes(r.id));
    const m = bonClassify(r, pool);
    if (m.kind === 'sure') { m.tx.bonId = r.id; m.tx.bonAuto = true; used.add(r.id); }
    else if (m.kind === 'ask') ask.push({ r, cands: m.cands });
  }
  return ask;
}
function bonImportApply(rows) {
  let n = 0;
  for (const o of rows) { if (!o.bonId) continue; const r = bonById(o.bonId), t = txById(o.id); if (r && t) { bonLink(r, t); n++; } }
  return n;
}
const bonThumb = (r, cls = 'bon-thumb') => r.image ? `<img class="${cls}" src="${r.image}" alt="Bon">` : `<span class="${cls} ph">🧾</span>`;
const bonAskHTML = (r, cands, scope) => `<div class="bon-ask" data-bonask="${r.id}">
  ${bonThumb(r)}<div class="grow"><b>Er denne bon den samme som betalingen?</b>
  <div class="muted small">🧾 ${esc(r.store || 'Ukendt butik')} · ${r.date ? fmtDate(r.date) : '–'} · ${kr(r.total)}${r.cash ? ' · markeret kontant' : ''}</div>
  ${cands.slice(0, 3).map(c => `<div class="bon-cand"><span class="grow">${esc(c.t.note || '(ingen tekst)')}<span class="muted small"> · ${fmtDate(c.t.date)} · ${kr(c.t.amount)}</span></span><button class="btn btn-sm btn-primary" data-bonyes="${r.id}" data-tx="${c.t.id}" data-scope="${scope}">Ja</button></div>`).join('')}
  <button class="btn btn-sm btn-ghost" data-bonno="${r.id}" data-scope="${scope}">Nej, ikke ${cands.length > 1 ? 'nogen af dem' : 'den'}</button></div></div>`;

/* ---------- Scan-ark ---------- */
function openBonScan() {
  let img = null, parsed = null;
  openSheet(`${sheetHead('🧾 Scan bon')}
    <div id="bonStep1"><p class="muted small">Tag et billede af bonen eller vælg et fra dine billeder. Teksten læses direkte på din telefon – billedet sendes ingen steder hen.</p>
      <div class="bon-pick"><label class="btn btn-primary">📷 Tag billede<input type="file" id="bonCam" accept="image/*" capture="environment" hidden></label>
      <label class="btn">🖼️ Vælg billede<input type="file" id="bonFile" accept="image/*" hidden></label></div></div>
    <div id="bonProg" hidden><div class="bon-prog"><div id="bonBar"></div></div><p class="muted small" id="bonProgTxt">Henter tekstgenkendelse…</p></div>
    <div id="bonForm" hidden></div>`, sheet => {
    const prog = (p, txt) => { $('#bonProg', sheet).hidden = false; $('#bonBar', sheet).style.width = Math.round(p * 100) + '%'; if (txt) $('#bonProgTxt', sheet).textContent = txt; };
    const onFile = async f => {
      if (!f) return;
      try { img = await fileToImage(f); } catch (e) { toast('Kunne ikke læse billedet'); return; }
      $('#bonStep1', sheet).hidden = true; prog(0.02, 'Henter tekstgenkendelse (første gang tager det lidt længere)…');
      let text = '';
      try {
        const w = await ocrLoad(m => { if (m.status === 'recognizing text') prog(0.3 + 0.7 * (m.progress || 0), 'Læser bonen…'); else prog(0.05 + 0.25 * (m.progress || 0)); });
        prog(0.3, 'Læser bonen…');
        const { data } = await w.recognize(scaled(img, 1800, true));
        text = data.text || '';
      } catch (e) { console.warn('OCR', e); toast('Tekstgenkendelse fejlede – udfyld felterne selv'); }
      parsed = parseReceipt(text); parsed.raw = text.slice(0, 4000);
      $('#bonProg', sheet).hidden = true; form();
    };
    const form = () => {
      const p = parsed, ok = p.store && p.date && p.total;
      $('#bonForm', sheet).hidden = false;
      $('#bonForm', sheet).innerHTML = `<div class="bon-edit"><img class="bon-prev" src="${scaled(img, 600).toDataURL('image/jpeg', .7)}" alt="Bon">
        <div class="grow"><div class="banner ${ok ? 'ok' : 'warn'}"><span>${ok ? '✅' : '✏️'}</span><div class="grow">${ok ? 'Tjek at det passer – ret gerne.' : 'Nogle felter kunne ikke læses – udfyld dem.'}</div></div>
        <div class="field"><label>Butik</label><input class="input" id="bonStore" value="${esc(p.store || '')}" placeholder="Fx Netto"></div>
        <div class="field-row"><div class="field"><label>Dato</label><input class="input" type="date" id="bonDate" value="${p.date || todayISO()}"></div>
        <div class="field"><label>Total (kr)</label><input class="input" id="bonTotal" inputmode="decimal" value="${p.total != null ? nf2.format(p.total) : ''}"></div></div>
        <div class="field"><label>Kategori</label><select class="input" id="bonCat">${catsOf('expense').map(c => `<option value="${c.id}" ${c.id === guessBonCat(p) ? 'selected' : ''}>${c.emoji} ${esc(c.name)}</option>`).join('')}</select></div>
        <label class="switch"><span>Betalt kontant <span class="muted small">(tæller med i forbruget nu – ellers venter bonen på bankbetalingen)</span></span><input type="checkbox" id="bonCash"></label>
        ${p.items.length ? `<details class="bon-items"><summary>${p.items.length} varelinjer fundet</summary>${p.items.map(i => `<div class="bon-item"><span>${esc(i.name)}</span><span>${kr(i.amount)}</span></div>`).join('')}</details>` : ''}
        <button class="btn btn-primary btn-block" id="bonSave">Gem bon</button></div></div>`;
    };
    sheet.addEventListener('change', e => { if (e.target.id === 'bonCam' || e.target.id === 'bonFile') onFile(e.target.files[0]); });
    sheet.addEventListener('click', e => {
      if (e.target.id !== 'bonSave') return;
      const total = parseAmount($('#bonTotal', sheet).value), date = $('#bonDate', sheet).value, store = $('#bonStore', sheet).value.trim();
      if (!(total > 0)) { toast('Skriv bonens total'); return; } if (!date) { toast('Vælg en dato'); return; }
      const r = { id: uid(), store, date, total: Math.abs(total), categoryId: $('#bonCat', sheet).value, items: parsed.items, image: scaled(img, 900, true).toDataURL('image/jpeg', 0.55), createdAt: new Date().toISOString() };
      const dup = receipts().find(o => o.date === r.date && Math.abs(o.total - r.total) < .01 && (merchSim(o.store, r.store) >= .5 || !o.store || !r.store));
      if (dup && !confirm(`Denne bon ser ud til at være gemt før (${dup.store || 'bon'} ${fmtDate(dup.date)}, ${kr(dup.total)}). Gem alligevel?`)) return;
      bonSave(r, $('#bonCash', sheet).checked);
    });
  });
}
function bonSave(r, cash) {
  receipts().push(r);
  const m = bonClassify(r, S.transactions);
  let msg;
  if (m.kind === 'sure') { bonLink(r, m.tx); msg = `🧾 Bon gemt og knyttet til “${m.tx.note || 'betaling'}” ${fmtDate(m.tx.date)}`; }
  else if (cash && m.kind === 'none') { bonSetCash(r, true); msg = '💵 Bon gemt som kontant køb'; }
  else { if (cash) r.cash = false; msg = m.kind === 'ask' ? '🧾 Bon gemt – bekræft betalingen nedenfor' : '🧾 Bon gemt – afventer bankbetalingen'; }
  save(); closeSheet(); location.hash = '#/vaerktoejer/bon'; render(); toast(msg);
  if (m.kind === 'ask') setTimeout(() => openSheet(`${sheetHead('🧾 Match bon')}${cash ? '<p class="muted small">Du markerede bonen som kontant, men der er en bankbetaling, der ligner. Hvis det er den, tælles den kun én gang.</p>' : ''}${bonAskHTML(r, m.cands, 'sheet')}`, sheet => { sheet.dataset.cash = cash ? '1' : ''; sheet.dataset.bon = r.id; }), 50);
}

/* ---------- Side: Bonner ---------- */
function renderBonner() {
  const all = [...receipts()].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const by = k => all.filter(r => bonStatus(r) === k);
  const asks = by('pending').map(r => ({ r, m: bonClassify(r, S.transactions) })).filter(x => x.m.kind === 'ask');
  const row = r => { const st = bonStatus(r), t = txById(st === 'linked' ? r.txId : r.cashTxId); return `<div class="row bon-row" data-bon="${r.id}">${bonThumb(r, 'bon-thumb sm')}
    <div class="main-col"><div class="title">${esc(r.store || 'Ukendt butik')}</div><div class="meta">${r.date ? fmtDate(r.date) : '–'} · <span class="pill ${st === 'linked' ? 'ok' : st === 'cash' ? 'accent' : 'warn'}">${BON_STATUS[st].join(' ')}</span>${st === 'linked' && t ? ` <span class="muted small">→ ${esc(t.note || '')}</span>` : ''}</div></div>
    <div class="bon-side"><div class="amt">${kr(r.total)}</div>
    ${st === 'pending' ? `<button class="btn btn-sm" data-boncash="${r.id}">💵 Kontant</button>` : st === 'cash' ? `<button class="btn btn-sm btn-ghost" data-boncash-off="${r.id}">Ikke kontant</button>` : `<button class="btn btn-sm btn-ghost" data-bonunlink="${r.id}">Fjern link</button>`}
    <button class="icon-btn" data-bondel="${r.id}" aria-label="Slet bon">🗑</button></div></div>`; };
  const sec = (k, h) => by(k).length ? `<h3 class="section-h">${h} <small class="muted">(${by(k).length})</small></h3><div class="card list">${by(k).map(row).join('')}</div>` : '';
  return `<div class="card bon-hero"><div class="grow"><b>Scan dine bonner</b><p class="muted small">Bonnen bliver et bilag på betalingen fra banken – den tælles aldrig med to gange. Bonner uden betaling venter, til du importerer kontoudtog, eller du markerer dem som kontant.</p></div>
    <button class="btn btn-primary" data-action="scan-bon">📷 Scan bon</button></div>
    <div class="kpis bon-kpis"><div class="kpi"><span>✅ Knyttet</span><b>${by('linked').length}</b></div><div class="kpi"><span>⏳ Afventer bank</span><b>${by('pending').length}</b></div><div class="kpi"><span>💵 Kontant</span><b>${by('cash').length}</b></div></div>
    ${asks.length ? `<h3 class="section-h">Bekræft match</h3>${asks.map(x => bonAskHTML(x.r, x.m.cands, 'page')).join('')}` : ''}
    ${sec('pending', '⏳ Afventer bank')}${sec('cash', '💵 Kontant')}${sec('linked', '✅ Knyttet til betaling')}
    ${all.length ? '' : '<div class="card empty"><div class="big">🧾</div><p>Ingen bonner endnu.</p></div>'}`;
}
function openBonView(r) {
  openSheet(`${sheetHead('🧾 ' + esc(r.store || 'Bon'))}<p class="muted small">${r.date ? fmtDate(r.date) : ''} · ${kr(r.total)} · ${BON_STATUS[bonStatus(r)].join(' ')}</p>${r.image ? `<img class="bon-full" src="${r.image}" alt="Bon">` : ''}
    ${(r.items || []).length ? `<details class="bon-items" open><summary>Varelinjer</summary>${r.items.map(i => `<div class="bon-item"><span>${esc(i.name)}</span><span>${kr(i.amount)}</span></div>`).join('')}</details>` : ''}`);
}
document.addEventListener('click', e => {
  const t = e.target, rr = () => (typeof toolRerender === 'function' && location.hash.startsWith('#/vaerktoejer') ? toolRerender() : render());
  const y = t.closest('[data-bonyes]');
  if (y && y.dataset.scope !== 'import') { const r = bonById(y.dataset.bonyes), tx = txById(y.dataset.tx); if (r && tx) { bonLink(r, tx); save(); if (y.dataset.scope === 'sheet') closeSheet(); rr(); toast('🧾 Bon knyttet til betalingen'); } return; }
  const n = t.closest('[data-bonno]');
  if (n && n.dataset.scope !== 'import') { const r = bonById(n.dataset.bonno); if (!r) return; const c = bonCandidates(r, S.transactions); r.rejected = [...new Set([...(r.rejected || []), ...c.map(x => x.t.id)])];
    const sh = t.closest('.sheet'); if (sh && sh.dataset.cash && sh.dataset.bon === r.id) bonSetCash(r, true);
    save(); if (n.dataset.scope === 'sheet') closeSheet(); rr(); toast(r.cash ? '💵 Gemt som kontant køb' : 'OK – bonen afventer bankbetalingen'); return; }
  const c = t.closest('[data-boncash]'); if (c) { const r = bonById(c.dataset.boncash); if (r && bonSetCash(r, true)) { save(); rr(); toast('💵 Markeret som kontant – tæller nu med i forbruget'); } return; }
  const co = t.closest('[data-boncash-off]'); if (co) { const r = bonById(co.dataset.boncashOff); if (r) { bonSetCash(r, false); save(); rr(); toast('Bonen afventer nu bankbetalingen'); } return; }
  const u = t.closest('[data-bonunlink]'); if (u) { const r = bonById(u.dataset.bonunlink); if (r) { bonUnlink(r); save(); rr(); toast('Link fjernet'); } return; }
  const d = t.closest('[data-bondel]'); if (d) { const r = bonById(d.dataset.bondel); if (!r || !confirm('Slet bonen? Selve betalingen beholdes.')) return; if (r.cashTxId) S.transactions = S.transactions.filter(x => x.id !== r.cashTxId); const tx = txById(r.txId); if (tx) delete tx.receiptId; S.receipts = receipts().filter(x => x !== r); save(); rr(); toast('Bon slettet'); return; }
  const v = t.closest('.bon-row, [data-bonview]'); if (v && !t.closest('button')) { const r = bonById(v.dataset.bon || v.dataset.bonview); if (r) { e.stopPropagation(); openBonView(r); } }
}, true);
