/* Min Økonomi – personlig økonomi-app (statisk, offline, data i localStorage) */
'use strict';

/* ---------- Hjælpere ---------- */
const KEY = 'okonomi.v1';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf2 = new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 });
const kr = (n, dec = true) => (dec ? nf2 : nf0).format(Math.round((n || 0) * 100) / 100) + ' kr';
const pct = n => nf0.format(Math.round(n)) + ' %';
const pad = n => String(n).padStart(2, '0');
const MONTHS = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
const MSHORT = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const WEEKDAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const curMonth = () => todayISO().slice(0, 7);
const addMonths = (key, n) => { let [y, m] = key.split('-').map(Number); m += n; y += Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1; return `${y}-${pad(m)}`; };
const monthDiff = (a, b) => { const [ya, ma] = a.split('-').map(Number), [yb, mb] = b.split('-').map(Number); return (yb - ya) * 12 + (mb - ma); };
const dim = key => { const [y, m] = key.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const monthLabel = key => { const [y, m] = key.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };
const monthShort = key => { const [y, m] = key.split('-').map(Number); return `${MSHORT[m - 1]}${key.slice(0, 4) !== curMonth().slice(0, 4) ? ' ' + String(y).slice(2) : ''}`; };
const fmtDate = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return `${d}. ${MSHORT[m - 1]}. ${y}`; };
const fmtDateNum = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}.${m}.${y}`; };
const dayHead = iso => { const [y, m, d] = iso.split('-').map(Number); const dt = new Date(y, m - 1, d); const t = todayISO(); if (iso === t) return 'I dag'; const yest = new Date(); yest.setDate(yest.getDate() - 1); if (iso === `${yest.getFullYear()}-${pad(yest.getMonth() + 1)}-${pad(yest.getDate())}`) return 'I går'; return `${WEEKDAYS[dt.getDay()]} ${d}. ${MONTHS[m - 1]}`; };
function parseAmount(v) {
  if (typeof v === 'number') return v;
  let s = String(v ?? '').replace(/kr\.?|dkk|\s|\u00a0/gi, '').trim();
  if (!s) return NaN;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (s.endsWith('-')) { neg = true; s = s.slice(0, -1); }
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if ((s.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return neg ? -n : n;
}
const sum = arr => arr.reduce((a, b) => a + b, 0);

/* ---------- Data ---------- */
const COLORS = ['#7c5cff', '#00c2ff', '#22d39a', '#ffb547', '#ff6b8b', '#f472b6', '#a78bfa', '#38bdf8', '#34d399', '#fb923c', '#facc15', '#94a3b8', '#e879f9', '#2dd4bf'];
const DEFAULT_CATEGORIES = [
  { id: 'c-lon', name: 'Løn', emoji: '💼', color: '#22d39a', type: 'income' },
  { id: 'c-pt', name: 'Personlig træning', emoji: '🏋️', color: '#00c2ff', type: 'income', isPT: true },
  { id: 'c-indt-andet', name: 'Anden indtægt', emoji: '💰', color: '#facc15', type: 'income' },
  { id: 'c-bolig', name: 'Bolig', emoji: '🏠', color: '#7c5cff', type: 'expense' },
  { id: 'c-el', name: 'El & varme', emoji: '⚡', color: '#ffb547', type: 'expense' },
  { id: 'c-forsikring', name: 'Forsikring', emoji: '🛡️', color: '#38bdf8', type: 'expense' },
  { id: 'c-abonnement', name: 'Abonnementer', emoji: '📺', color: '#f472b6', type: 'expense' },
  { id: 'c-telefon', name: 'Telefon & internet', emoji: '📱', color: '#a78bfa', type: 'expense' },
  { id: 'c-fag', name: 'A-kasse & fagforening', emoji: '🤝', color: '#94a3b8', type: 'expense' },
  { id: 'c-mad', name: 'Dagligvarer', emoji: '🛒', color: '#34d399', type: 'expense' },
  { id: 'c-ude', name: 'Restaurant & café', emoji: '🍔', color: '#fb923c', type: 'expense' },
  { id: 'c-transport', name: 'Transport', emoji: '🚲', color: '#2dd4bf', type: 'expense' },
  { id: 'c-sundhed', name: 'Træning & sundhed', emoji: '💪', color: '#00c2ff', type: 'expense' },
  { id: 'c-shopping', name: 'Tøj & shopping', emoji: '🛍️', color: '#e879f9', type: 'expense' },
  { id: 'c-fritid', name: 'Fritid & oplevelser', emoji: '🎉', color: '#ff6b8b', type: 'expense' },
  { id: 'c-andet', name: 'Andet', emoji: '📦', color: '#64748b', type: 'expense' }
];
const freshState = () => ({
  version: 1,
  settings: { theme: document.documentElement.dataset.theme || 'dark', ptTaxRate: 40, name: 'Simon', subSort: 'amount-desc' },
  categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
  transactions: [], recurring: [], goals: [], isExample: false
});
let S;
function load() {
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
  if (!S || !Array.isArray(S.categories)) S = freshState();
  S.settings = Object.assign({ theme: 'dark', ptTaxRate: 40, name: 'Simon', subSort: 'amount-desc' }, S.settings || {});
  ['transactions', 'recurring', 'goals'].forEach(k => { if (!Array.isArray(S[k])) S[k] = []; });
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('Kunne ikke gemme – browserens lager er fuldt'); }
}
const cat = id => S.categories.find(c => c.id === id) || { id, name: 'Ukendt', emoji: '❔', color: '#64748b', type: 'expense' };
const catsOf = type => S.categories.filter(c => c.type === type);

/* Faste poster: opret månedens postering automatisk */
function applyRecurring() {
  const now = curMonth();
  let added = 0;
  for (const r of S.recurring) {
    if (!r.startMonth) r.startMonth = now;
    r.skipped = r.skipped || [];
    const end = r.endMonth && r.endMonth < now ? r.endMonth : now;
    for (let m = r.startMonth; m <= end; m = addMonths(m, 1)) {
      if (r.skipped.includes(m)) continue;
      if (S.transactions.some(t => t.recurringId === r.id && t.date.startsWith(m))) continue;
      S.transactions.push({ id: uid(), type: r.type, amount: r.amount, date: `${m}-${pad(Math.min(r.day || 1, dim(m)))}`, categoryId: r.categoryId, note: r.name, recurringId: r.id, example: !!r.example });
      added++;
    }
  }
  if (added) save();
}
const isActiveRec = r => !r.endMonth || r.endMonth >= curMonth();

/* Statistik */
function stats(key) {
  const tx = S.transactions.filter(t => t.date.startsWith(key));
  const inc = sum(tx.filter(t => t.type === 'income').map(t => t.amount));
  const exp = sum(tx.filter(t => t.type === 'expense').map(t => t.amount));
  const byCat = {};
  tx.filter(t => t.type === 'expense').forEach(t => { byCat[t.categoryId] = (byCat[t.categoryId] || 0) + t.amount; });
  const incByCat = {};
  tx.filter(t => t.type === 'income').forEach(t => { incByCat[t.categoryId] = (incByCat[t.categoryId] || 0) + t.amount; });
  return { tx, inc, exp, net: inc - exp, rate: inc > 0 ? (inc - exp) / inc * 100 : 0, byCat, incByCat };
}
function avgNet(months = 3) {
  // Gennemsnitligt overskud for de seneste hele måneder (ikke den igangværende)
  const keys = []; for (let i = 1; i <= months; i++) keys.push(addMonths(curMonth(), -i));
  const withData = keys.filter(k => S.transactions.some(t => t.date.startsWith(k)));
  if (!withData.length) return null;
  return sum(withData.map(k => stats(k).net)) / withData.length;
}
const ptCatIds = () => S.categories.filter(c => c.isPT).map(c => c.id);
const ptIncome = key => sum(S.transactions.filter(t => t.type === 'income' && t.date.startsWith(key) && ptCatIds().includes(t.categoryId)).map(t => t.amount));
const goalSaved = g => sum((g.contributions || []).map(c => c.amount));

/* ---------- UI-state ---------- */
let selMonth = curMonth();
const charts = [];
const ROUTES = {
  overblik: { title: 'Overblik', ico: '📊', render: renderOverblik, month: true },
  posteringer: { title: 'Posteringer', ico: '🧾', render: renderPosteringer, month: true },
  budget: { title: 'Budget', ico: '🎯', render: renderBudget, month: true },
  maal: { title: 'Opsparingsmål', short: 'Mål', ico: '🏆', render: renderMaal },
  pt: { title: 'Personlig træning', ico: '🏋️', render: renderPT, month: true },
  abonnementer: { title: 'Abonnementsjæger', ico: '✂️', render: renderAbonnementer },
  indstillinger: { title: 'Indstillinger', ico: '⚙️', render: renderIndstillinger },
  mere: { title: 'Mere', ico: '☰', render: renderMere, hidden: true }
};
const route = () => { const r = (location.hash.replace(/^#\/?/, '') || 'overblik').split('?')[0]; return ROUTES[r] ? r : 'overblik'; };

function renderNav() {
  const r = route();
  $('#sideNav').innerHTML = Object.entries(ROUTES).filter(([, v]) => !v.hidden).map(([k, v]) =>
    `<a class="nav-link ${k === r ? 'active' : ''}" href="#/${k}"><span class="ico">${v.ico}</span>${v.title}</a>`).join('');
  const moreActive = ['budget', 'pt', 'abonnementer', 'indstillinger', 'mere'].includes(r);
  $('#bottomNav').innerHTML = `
    <a href="#/overblik" class="${r === 'overblik' ? 'active' : ''}"><span class="ico">📊</span>Overblik</a>
    <a href="#/posteringer" class="${r === 'posteringer' ? 'active' : ''}"><span class="ico">🧾</span>Poster</a>
    <a class="spacer" aria-hidden="true"></a>
    <a href="#/maal" class="${r === 'maal' ? 'active' : ''}"><span class="ico">🏆</span>Mål</a>
    <a href="#/mere" class="${moreActive ? 'active' : ''}"><span class="ico">☰</span>Mere</a>`;
}
function render() {
  charts.splice(0).forEach(c => c.destroy());
  const r = route(), def = ROUTES[r];
  renderNav();
  $('#viewTitle').textContent = def.title;
  const h = new Date().getHours();
  $('#greeting').textContent = `${h < 5 ? 'God nat' : h < 10 ? 'Godmorgen' : h < 18 ? 'Goddag' : 'Godaften'}, ${S.settings.name || 'Simon'} 👋`;
  $('#monthPicker').classList.toggle('hidden', !def.month);
  $('#monthLabel').textContent = r === 'pt' ? `${monthLabel(selMonth)}` : monthLabel(selMonth);
  $('#banner').innerHTML = S.isExample ? `<div class="banner"><span>🧪</span><div class="grow"><strong>Du ser eksempeldata.</strong> Alle tal er opdigtede og kun til at prøve appen.</div><button class="btn btn-sm" data-action="clear-example">Fjern eksempeldata</button></div>` : '';
  const view = $('#view');
  view.style.animation = 'none'; void view.offsetWidth; view.style.animation = '';
  view.innerHTML = def.render();
  afterRender[r] && afterRender[r]();
  window.scrollTo({ top: 0 });
}
const afterRender = {};

/* ---------- Diagrammer ---------- */
function themeVars() {
  const cs = getComputedStyle(document.documentElement);
  return { text: cs.getPropertyValue('--text').trim(), muted: cs.getPropertyValue('--muted').trim(), border: cs.getPropertyValue('--border').trim(), card: cs.getPropertyValue('--card-solid').trim() };
}
function chartDefaults() {
  if (!window.Chart) return false;
  const v = themeVars();
  Chart.defaults.color = v.muted;
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.font.size = 12;
  Chart.defaults.borderColor = v.border;
  Chart.defaults.locale = 'da-DK';
  Chart.defaults.plugins.tooltip.backgroundColor = v.card;
  Chart.defaults.plugins.tooltip.titleColor = v.text;
  Chart.defaults.plugins.tooltip.bodyColor = v.text;
  Chart.defaults.plugins.tooltip.borderColor = v.border;
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 10;
  Chart.defaults.plugins.tooltip.callbacks.label = ctx => ` ${ctx.dataset.label ? ctx.dataset.label + ': ' : ''}${kr(ctx.parsed.y ?? ctx.parsed)}`;
  return true;
}
const tickKr = v => Math.abs(v) >= 1000 ? nf0.format(v / 1000) + 't' : nf0.format(v);
function mkChart(id, cfg) {
  const el = document.getElementById(id);
  if (!el || !chartDefaults()) return;
  charts.push(new Chart(el, cfg));
}
function gradient(ctx, area, c1, c2) {
  const g = ctx.createLinearGradient(0, area.top, 0, area.bottom);
  g.addColorStop(0, c1); g.addColorStop(1, c2); return g;
}
const centerText = {
  id: 'centerText',
  afterDraw(chart, args, opts) {
    if (!opts || !opts.title) return;
    const { ctx, chartArea: a } = chart; const v = themeVars();
    const x = (a.left + a.right) / 2, y = (a.top + a.bottom) / 2;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = v.muted; ctx.font = `500 12px ${Chart.defaults.font.family}`; ctx.fillText(opts.sub || '', x, y - 13);
    ctx.fillStyle = v.text; ctx.font = `700 17px ${Chart.defaults.font.family}`; ctx.fillText(opts.title, x, y + 8);
    ctx.restore();
  }
};

/* ---------- Visning: Overblik ---------- */
function emptyState() {
  return `<div class="card empty">
    <div class="emoji">✨</div>
    <h2>Velkommen til din økonomi</h2>
    <p>Start med at skrive din løn og dine faste udgifter ind – så tegner appen grafer, budget og prognoser for dig. Alt gemmes kun her i din browser.</p>
    <div class="btn-row" style="justify-content:center">
      <button class="btn btn-primary" data-action="add-tx">＋ Tilføj første postering</button>
      <button class="btn" data-action="add-rec">🔁 Tilføj fast post</button>
      <button class="btn" data-action="load-example">🧪 Prøv med eksempeldata</button>
    </div>
  </div>`;
}
function deltaPill(cur, prev, goodWhenUp = true) {
  if (!prev) return '';
  const d = (cur - prev) / Math.abs(prev) * 100;
  if (!isFinite(d) || Math.abs(d) < 0.5) return `<span class="delta">± 0 %</span>`;
  const good = goodWhenUp ? d > 0 : d < 0;
  return `<span class="delta ${good ? 'pos' : 'neg'}">${d > 0 ? '▲' : '▼'} ${nf0.format(Math.abs(d))} %</span>`;
}
function monthSummary(key) {
  const s = stats(key), p = stats(addMonths(key, -1));
  const prevName = MONTHS[Number(addMonths(key, -1).slice(5)) - 1];
  const ongoing = key === curMonth();
  const label = MONTHS[Number(key.slice(5)) - 1];
  if (!s.inc && !s.exp) return [`Der er endnu ingen posteringer i ${monthLabel(key)}.`];
  const out = [];
  out.push(`I ${label} har du ${ongoing ? 'indtil videre ' : ''}tjent <strong>${kr(s.inc, false)}</strong> og brugt <strong>${kr(s.exp, false)}</strong>. ` +
    (s.net >= 0 ? `Det giver et overskud på <strong class="pos">${kr(s.net, false)}</strong>.` : `Du har brugt <strong class="neg">${kr(-s.net, false)}</strong> mere, end du har tjent.`));
  if (s.inc > 0) {
    let t = `Din opsparingsrate er <strong>${pct(s.rate)}</strong>`;
    if (p.inc > 0) { const d = s.rate - p.rate; t += Math.abs(d) < 1 ? ` – på niveau med ${prevName}` : ` – ${d > 0 ? 'op' : 'ned'} ${nf0.format(Math.abs(d))} procentpoint fra ${prevName}`; }
    t += s.rate >= 20 ? '. Flot! 🎉' : s.rate >= 10 ? '. Et fint niveau.' : s.rate >= 0 ? '. Der er plads til at spare lidt mere op.' : '.';
    out.push(t);
  }
  const top = Object.entries(s.byCat).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (top.length) out.push(`Mest gik til ${top.map(([id, v]) => `${cat(id).emoji} ${esc(cat(id).name)} (${kr(v, false)})`).join(top.length > 2 ? ', ' : ' og ').replace(/, ([^,]*)$/, ' og $1')}.`);
  if (p.exp > 0) {
    const d = (s.exp - p.exp) / p.exp * 100;
    let t = `Dine samlede udgifter er ${Math.abs(d) < 1 ? 'på niveau med' : `${nf0.format(Math.abs(d))} % ${d > 0 ? 'højere' : 'lavere'} end i`} ${prevName}${ongoing && d < 0 ? ' (måneden er ikke slut endnu)' : ''}.`;
    const ch = Object.keys({ ...s.byCat, ...p.byCat }).map(id => [id, (s.byCat[id] || 0) - (p.byCat[id] || 0)]).sort((a, b) => b[1] - a[1]);
    if (ch.length && ch[0][1] > 100) t += ` Største stigning: ${esc(cat(ch[0][0]).name)} (+${kr(ch[0][1], false)}).`;
    const dn = ch[ch.length - 1];
    if (!ongoing && dn && dn[1] < -100) t += ` Største fald: ${esc(cat(dn[0]).name)} (−${kr(-dn[1], false)}).`;
    out.push(t);
  }
  const over = S.categories.filter(c => c.type === 'expense' && c.budget > 0 && (s.byCat[c.id] || 0) > c.budget);
  if (over.length) out.push(`⚠️ Over budget: ${over.map(c => esc(c.name)).join(', ')}.`);
  const pt = ptIncome(key);
  if (pt > 0) out.push(`Personlig træning gav ${kr(pt, false)} – med din egen sats på ${S.settings.ptTaxRate} % bør du overveje at sætte ca. ${kr(pt * S.settings.ptTaxRate / 100, false)} til side til skat.`);
  return out;
}
function renderOverblik() {
  if (!S.transactions.length && !S.recurring.length) return emptyState();
  const s = stats(selMonth), p = stats(addMonths(selMonth, -1));
  const top = Object.entries(s.byCat).sort((a, b) => b[1] - a[1]);
  const budgets = S.categories.filter(c => c.type === 'expense' && c.budget > 0)
    .map(c => ({ c, spent: s.byCat[c.id] || 0 })).sort((a, b) => b.spent / b.c.budget - a.spent / a.c.budget).slice(0, 4);
  const recent = [...s.tx].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  afterRender.overblik = () => drawOverblikCharts(s, top);
  return `
  <div class="grid kpis">
    <div class="card kpi hero">
      <div class="label">Rådighedsbeløb · ${monthLabel(selMonth)}</div>
      <div class="value">${kr(s.net)}</div>
      <div class="sub">${s.net >= 0 ? 'tilbage efter alle udgifter' : 'mere brugt end tjent'}</div>
    </div>
    <div class="card kpi"><div class="label">💚 Indtægter</div><div class="value">${kr(s.inc, false)}</div><div class="sub">${deltaPill(s.inc, p.inc)} vs. sidste md.</div></div>
    <div class="card kpi"><div class="label">💸 Udgifter</div><div class="value">${kr(s.exp, false)}</div><div class="sub">${deltaPill(s.exp, p.exp, false)} vs. sidste md.</div></div>
    <div class="card kpi"><div class="label">🐷 Opsparingsrate</div><div class="value ${s.rate >= 0 ? 'pos' : 'neg'}">${s.inc ? pct(s.rate) : '–'}</div><div class="sub">${p.inc ? `${prevRateTxt(p.rate)}` : 'af indtægterne'}</div></div>
  </div>

  <div class="card summary section">
    <span class="tag">✨ Månedens overblik</span>
    ${monthSummary(selMonth).map(t => `<p>${t}</p>`).join('')}
  </div>

  <div class="grid cols-2 section">
    <div class="card">
      <h2>Udgifter pr. kategori <small>${monthLabel(selMonth)}</small></h2>
      ${top.length ? `<div class="chart-box small"><canvas id="chDough"></canvas></div>` : `<p class="muted">Ingen udgifter denne måned.</p>`}
    </div>
    <div class="card">
      <h2>Topkategorier <small>andel af udgifter</small></h2>
      <div class="list">${top.slice(0, 6).map(([id, v]) => { const c = cat(id); const sh = s.exp ? v / s.exp * 100 : 0; return `
        <div class="row" style="flex-wrap:wrap">
          <div class="avatar" style="background:${c.color}22">${c.emoji}</div>
          <div class="main-col"><div class="title">${esc(c.name)}</div><div class="progress" style="margin-top:6px;height:6px"><span style="width:${sh}%;background:${c.color}"></span></div></div>
          <div class="amt">${kr(v, false)}<small>${pct(sh)}</small></div>
        </div>`; }).join('') || '<p class="muted">Ingen data.</p>'}</div>
    </div>
  </div>

  <div class="card section">
    <h2>Indtægter vs. udgifter <small>seneste 12 måneder</small></h2>
    <div class="chart-box tall"><canvas id="chBar"></canvas></div>
  </div>

  <div class="grid cols-2 section">
    <div class="card">
      <h2>Opsparing over tid <small>akkumuleret overskud</small></h2>
      <div class="chart-box"><canvas id="chLine"></canvas></div>
    </div>
    <div class="card">
      <h2>Budget <a class="btn btn-sm btn-ghost" href="#/budget">Se alle ›</a></h2>
      ${budgets.length ? budgets.map(budgetItem).join('') : `<p class="muted">Du har ikke sat budgetter endnu.</p><button class="btn btn-sm" data-action="edit-budgets">🎯 Sæt budgetter</button>`}
    </div>
  </div>

  <div class="card section">
    <h2>Seneste posteringer <a class="btn btn-sm btn-ghost" href="#/posteringer">Se alle ›</a></h2>
    <div class="list">${recent.map(txRow).join('') || '<p class="muted">Ingen posteringer i denne måned.</p>'}</div>
  </div>`;
}
const prevRateTxt = r => `sidste md.: ${pct(r)}`;
function drawOverblikCharts(s, top) {
  if (top.length) mkChart('chDough', {
    type: 'doughnut', plugins: [centerText],
    data: { labels: top.map(([id]) => cat(id).name), datasets: [{ data: top.map(([, v]) => v), backgroundColor: top.map(([id]) => cat(id).color), borderWidth: 0, hoverOffset: 8, spacing: 2, borderRadius: 6 }] },
    options: { maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false }, centerText: { title: kr(s.exp, false), sub: 'i alt' }, tooltip: { callbacks: { label: c => ` ${kr(c.parsed)}` } } } }
  });
  const keys = []; for (let i = 11; i >= 0; i--) keys.push(addMonths(selMonth, -i));
  const st = keys.map(stats);
  mkChart('chBar', {
    type: 'bar',
    data: { labels: keys.map(monthShort), datasets: [
      { label: 'Indtægter', data: st.map(x => x.inc), backgroundColor: c => c.chart.chartArea ? gradient(c.chart.ctx, c.chart.chartArea, '#22d39a', '#22d39a55') : '#22d39a', borderRadius: 8, maxBarThickness: 22 },
      { label: 'Udgifter', data: st.map(x => x.exp), backgroundColor: c => c.chart.chartArea ? gradient(c.chart.ctx, c.chart.chartArea, '#ff6b8b', '#ff6b8b55') : '#ff6b8b', borderRadius: 8, maxBarThickness: 22 }
    ] },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8 } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: tickKr }, beginAtZero: true } } }
  });
  let acc = 0; const cum = st.map(x => (acc += x.net));
  mkChart('chLine', {
    type: 'line',
    data: { labels: keys.map(monthShort), datasets: [{ label: 'Opsparet', data: cum, borderColor: '#7c5cff', borderWidth: 3, tension: .4, pointRadius: 0, pointHoverRadius: 6, fill: true,
      backgroundColor: c => c.chart.chartArea ? gradient(c.chart.ctx, c.chart.chartArea, 'rgba(124,92,255,.45)', 'rgba(0,194,255,0)') : 'transparent' }] },
    options: { maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' }, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: tickKr } } } }
  });
}

/* ---------- Visning: Posteringer ---------- */
let txFilter = { q: '', type: 'all', cat: 'all' };
function txRow(t) {
  const c = cat(t.categoryId);
  return `<div class="row click" data-action="edit-tx" data-id="${t.id}">
    <div class="avatar" style="background:${c.color}22">${c.emoji}</div>
    <div class="main-col"><div class="title">${esc(t.note || c.name)}</div>
      <div class="meta">${esc(c.name)} · ${fmtDate(t.date)} ${t.recurringId ? '<span class="pill accent">🔁 Fast</span>' : ''} ${t.example ? '<span class="pill">eksempel</span>' : ''}</div></div>
    <div class="amt ${t.type === 'income' ? 'pos' : ''}">${t.type === 'income' ? '+' : '−'}${kr(t.amount)}</div>
  </div>`;
}
function renderPosteringer() {
  const s = stats(selMonth);
  const q = txFilter.q.toLowerCase();
  let list = s.tx.filter(t => (txFilter.type === 'all' || t.type === txFilter.type) && (txFilter.cat === 'all' || t.categoryId === txFilter.cat) &&
    (!q || (t.note || '').toLowerCase().includes(q) || cat(t.categoryId).name.toLowerCase().includes(q)));
  list.sort((a, b) => b.date.localeCompare(a.date) || (a.type === 'income' ? -1 : 1));
  const groups = {}; list.forEach(t => (groups[t.date] = groups[t.date] || []).push(t));
  afterRender.posteringer = () => {
    const i = $('#txSearch'); if (i && txFilter.q) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  };
  return `
  <div class="toolbar">
    <input class="input grow" id="txSearch" type="search" placeholder="🔍 Søg i posteringer…" value="${esc(txFilter.q)}">
    <select class="input" id="txType" style="width:auto">
      <option value="all">Alle typer</option><option value="income" ${txFilter.type === 'income' ? 'selected' : ''}>Indtægter</option><option value="expense" ${txFilter.type === 'expense' ? 'selected' : ''}>Udgifter</option>
    </select>
    <select class="input" id="txCat" style="width:auto"><option value="all">Alle kategorier</option>
      ${S.categories.map(c => `<option value="${c.id}" ${txFilter.cat === c.id ? 'selected' : ''}>${c.emoji} ${esc(c.name)}</option>`).join('')}</select>
    <button class="btn btn-primary" data-action="add-tx">＋ Ny</button>
    <button class="btn" data-action="export-csv-month">⬇️ CSV</button>
  </div>
  <div class="grid kpis" style="grid-template-columns:repeat(3,1fr);margin-bottom:14px">
    <div class="card kpi"><div class="label">Indtægter</div><div class="value pos" style="font-size:17px">${kr(sum(list.filter(t => t.type === 'income').map(t => t.amount)), false)}</div></div>
    <div class="card kpi"><div class="label">Udgifter</div><div class="value neg" style="font-size:17px">${kr(sum(list.filter(t => t.type === 'expense').map(t => t.amount)), false)}</div></div>
    <div class="card kpi"><div class="label">Antal</div><div class="value" style="font-size:17px">${list.length}</div></div>
  </div>
  <div class="card">
    ${Object.keys(groups).length ? Object.entries(groups).map(([d, ts]) => `<div class="day-head">${dayHead(d)}</div><div class="list">${ts.map(txRow).join('')}</div>`).join('')
      : `<div class="empty"><div class="emoji">🧾</div><h2>Ingen posteringer</h2><p>Der er ingen posteringer i ${monthLabel(selMonth)}${q || txFilter.type !== 'all' || txFilter.cat !== 'all' ? ' der matcher dit filter' : ''}.</p><button class="btn btn-primary" data-action="add-tx">＋ Tilføj postering</button></div>`}
  </div>`;
}

/* ---------- Visning: Budget ---------- */
function budgetItem({ c, spent }) {
  const r = spent / c.budget * 100;
  const cls = r > 100 ? 'over' : r >= 85 ? 'near' : '';
  const note = r > 100 ? `<span class="neg">⚠️ Over budget med ${kr(spent - c.budget, false)}</span>` : r >= 85 ? `<span class="warn">Næsten brugt – ${kr(c.budget - spent, false)} tilbage</span>` : `${kr(c.budget - spent, false)} tilbage`;
  return `<div class="budget-item">
    <div class="budget-top"><div class="avatar" style="background:${c.color}22">${c.emoji}</div>
      <div class="main-col"><div class="title" style="font-weight:600">${esc(c.name)}</div><div class="budget-note">${note}</div></div>
      <div class="amt" style="font-weight:650">${kr(spent, false)}<small class="muted" style="display:block;font-weight:500;font-size:12px">af ${kr(c.budget, false)}</small></div></div>
    <div class="progress ${cls}"><span style="width:${Math.min(r, 100)}%"></span></div>
  </div>`;
}
function renderBudget() {
  const s = stats(selMonth);
  const items = S.categories.filter(c => c.type === 'expense' && c.budget > 0).map(c => ({ c, spent: s.byCat[c.id] || 0 }));
  const totalB = sum(items.map(i => i.c.budget)), totalS = sum(items.map(i => i.spent));
  const isCur = selMonth === curMonth();
  const daysLeft = isCur ? dim(selMonth) - new Date().getDate() + 1 : 0;
  const over = items.filter(i => i.spent > i.c.budget);
  const noBudget = S.categories.filter(c => c.type === 'expense' && !(c.budget > 0) && (s.byCat[c.id] || 0) > 0);
  return `
  <div class="grid kpis">
    <div class="card kpi hero"><div class="label">Tilbage af budget · ${monthLabel(selMonth)}</div><div class="value">${kr(totalB - totalS, false)}</div>
      <div class="sub">${isCur && totalB - totalS > 0 ? `≈ ${kr((totalB - totalS) / daysLeft, false)} pr. dag i ${daysLeft} dage` : `af samlet budget på ${kr(totalB, false)}`}</div></div>
    <div class="card kpi"><div class="label">Budget i alt</div><div class="value">${kr(totalB, false)}</div></div>
    <div class="card kpi"><div class="label">Brugt</div><div class="value">${kr(totalS, false)}</div><div class="sub">${totalB ? pct(totalS / totalB * 100) + ' af budget' : ''}</div></div>
    <div class="card kpi"><div class="label">Over budget</div><div class="value ${over.length ? 'neg' : 'pos'}">${over.length} ${over.length === 1 ? 'kategori' : 'kategorier'}</div></div>
  </div>
  <div class="card section">
    <h2>Budget pr. kategori <button class="btn btn-sm" data-action="edit-budgets">✏️ Rediger budgetter</button></h2>
    ${items.length ? items.sort((a, b) => b.spent / b.c.budget - a.spent / a.c.budget).map(budgetItem).join('') :
      `<div class="empty"><div class="emoji">🎯</div><h2>Ingen budgetter endnu</h2><p>Sæt et månedligt loft for fx dagligvarer og restaurantbesøg, så advarer appen dig, når du nærmer dig grænsen.</p><button class="btn btn-primary" data-action="edit-budgets">Sæt budgetter</button></div>`}
  </div>
  ${noBudget.length ? `<div class="card section"><h3>Udgifter uden budget <small>${monthLabel(selMonth)}</small></h3><div class="list">${noBudget.map(c => `<div class="row"><div class="avatar" style="background:${c.color}22">${c.emoji}</div><div class="main-col"><div class="title">${esc(c.name)}</div></div><div class="amt">${kr(s.byCat[c.id], false)}</div></div>`).join('')}</div></div>` : ''}`;
}

/* ---------- Visning: Mål ---------- */
function goalForecast(g, fallbackPace) {
  const saved = goalSaved(g), remaining = Math.max(0, g.target - saved);
  const now = curMonth();
  const deadlineM = g.deadline ? g.deadline.slice(0, 7) : null;
  const monthsLeft = deadlineM ? Math.max(1, monthDiff(now, deadlineM)) : null;
  const needed = deadlineM ? remaining / monthsLeft : null;
  // Tempo: indbetalinger de seneste 3 måneder (inkl. denne)
  const from = addMonths(now, -2) + '-01';
  const recent = sum((g.contributions || []).filter(c => c.date >= from).map(c => c.amount));
  let pace = recent / 3, basis = 'dine indbetalinger de seneste 3 måneder';
  if (pace <= 0 && fallbackPace > 0) { pace = fallbackPace; basis = 'din gennemsnitlige månedlige opsparing (fordelt på dine mål)'; }
  if (remaining <= 0) return { saved, remaining, needed: 0, status: 'done', pace, basis };
  if (!(pace > 0)) return { saved, remaining, needed, monthsLeft, status: 'none', pace: 0, basis };
  const n = Math.ceil(remaining / pace);
  const eta = addMonths(now, n);
  const status = !deadlineM ? 'ok' : eta <= deadlineM ? 'ok' : 'behind';
  return { saved, remaining, needed, monthsLeft, status, pace, basis, eta, n };
}
function renderMaal() {
  const avg = avgNet(3);
  const active = S.goals.filter(g => goalSaved(g) < g.target);
  const fallback = avg > 0 && active.length ? avg / active.length : 0;
  const totalT = sum(S.goals.map(g => g.target)), totalS = sum(S.goals.map(goalSaved));
  return `
  <div class="grid kpis">
    <div class="card kpi hero"><div class="label">Sparet op til dine mål</div><div class="value">${kr(totalS, false)}</div><div class="sub">af ${kr(totalT, false)} · ${S.goals.length} mål</div></div>
    <div class="card kpi"><div class="label">Gns. overskud pr. md.</div><div class="value ${avg >= 0 ? 'pos' : 'neg'}">${avg == null ? '–' : kr(avg, false)}</div><div class="sub">seneste 3 hele måneder</div></div>
    <div class="card kpi"><div class="label">Skal spares pr. md.</div><div class="value">${kr(sum(S.goals.map(g => goalForecast(g, fallback).needed || 0)), false)}</div><div class="sub">for at nå alle mål til tiden</div></div>
    <div class="card kpi"><div class="label">På sporet</div><div class="value">${S.goals.filter(g => ['ok', 'done'].includes(goalForecast(g, fallback).status)).length} / ${S.goals.length}</div><div class="sub">mål</div></div>
  </div>
  <div class="toolbar section"><div class="grow muted small">Prognosen bygger på dit tempo de seneste måneder.</div><button class="btn btn-primary" data-action="add-goal">＋ Nyt mål</button></div>
  ${S.goals.length ? `<div class="grid goals">${S.goals.map(g => goalCard(g, fallback)).join('')}</div>` :
    `<div class="card empty"><div class="emoji">🏆</div><h2>Ingen opsparingsmål endnu</h2><p>Sæt et mål – fx en buffer, en rejse eller en ny cykel – og se hvor meget du skal spare op hver måned.</p><button class="btn btn-primary" data-action="add-goal">＋ Opret mål</button></div>`}`;
}
function goalCard(g, fallback) {
  const f = goalForecast(g, fallback);
  const p = Math.min(100, g.target ? f.saved / g.target * 100 : 0);
  const pill = { done: '<span class="pill ok">✅ Nået</span>', ok: '<span class="pill ok">🟢 På sporet</span>', behind: '<span class="pill bad">🔴 Bagud</span>', none: '<span class="pill warnp">⏸️ Ingen prognose</span>' }[f.status];
  let fc = '';
  if (f.status === 'done') fc = 'Målet er nået – godt gået! 🎉';
  else if (f.status === 'none') fc = `Der er ikke sparet op til målet for nylig, så der kan ikke laves en prognose endnu.${f.needed ? ` Spar ${kr(f.needed, false)} pr. md. for at nå det til tiden.` : ''}`;
  else {
    fc = `Med ${kr(f.pace, false)} pr. md. (${f.basis}) når du målet i <strong>${monthLabel(f.eta)}</strong>`;
    if (f.status === 'behind') fc += ` – ${monthDiff(g.deadline.slice(0, 7), f.eta)} md. efter deadline. Hæv til <strong>${kr(f.needed, false)}</strong> pr. md. for at nå det.`;
    else fc += g.deadline ? ` – før deadline. 👌` : '.';
  }
  return `<div class="card goal-card">
    <div class="goal-head"><div class="avatar" style="background:${g.color || '#7c5cff'}26">${g.emoji || '🎯'}</div>
      <div class="main-col" style="min-width:0"><div class="title" style="font-weight:650">${esc(g.name)}</div><div class="meta small muted">${g.deadline ? 'Deadline ' + fmtDate(g.deadline) : 'Ingen deadline'}</div><div style="margin-top:4px">${pill} ${g.example ? '<span class="pill">eksempel</span>' : ''}</div></div>
      <div class="ring" style="--p:${p}" data-label="${nf0.format(p)} %"></div></div>
    <div class="big" style="margin-top:12px">${kr(f.saved, false)} <span class="muted" style="font-size:14px;font-weight:500">af ${kr(g.target, false)}</span></div>
    <div class="progress"><span style="width:${p}%;background:linear-gradient(90deg, ${g.color || '#7c5cff'}, #00c2ff)"></span></div>
    <div class="goal-stats">
      <div class="stat"><div class="l">Mangler</div><div class="v">${kr(f.remaining, false)}</div></div>
      <div class="stat"><div class="l">Nødvendigt pr. md.</div><div class="v">${f.needed != null ? kr(f.needed, false) : '–'}</div></div>
    </div>
    <div class="forecast">📈 ${fc}</div>
    <div class="btn-row" style="margin-top:14px"><button class="btn btn-primary btn-sm" data-action="contribute" data-id="${g.id}">＋ Indbetal</button><button class="btn btn-sm" data-action="edit-goal" data-id="${g.id}">Rediger</button></div>
  </div>`;
}

/* ---------- Visning: Personlig træning ---------- */
function renderPT() {
  const year = selMonth.slice(0, 4);
  const rate = Number(S.settings.ptTaxRate) || 0;
  const keys = Array.from({ length: 12 }, (_, i) => `${year}-${pad(i + 1)}`);
  const vals = keys.map(ptIncome);
  const upto = Number(selMonth.slice(5));
  const prevVals = Array.from({ length: upto }, (_, i) => ptIncome(`${Number(year) - 1}-${pad(i + 1)}`));
  const prevYear = prevVals.filter(v => v > 0).length >= Math.ceil(upto / 2) ? sum(prevVals) : 0;
  const ytdUpto = sum(vals.slice(0, upto));
  const ytd = sum(vals), thisM = ptIncome(selMonth);
  const activeMonths = vals.filter(v => v > 0).length;
  const sessions = S.transactions.filter(t => t.type === 'income' && t.date.startsWith(year) && ptCatIds().includes(t.categoryId)).length;
  afterRender.pt = () => mkChart('chPT', {
    type: 'bar',
    data: { labels: MSHORT, datasets: [
      { label: 'Til dig', data: vals.map(v => v * (1 - rate / 100)), backgroundColor: '#00c2ff', borderRadius: 6, stack: 's', maxBarThickness: 26 },
      { label: 'Skat-reserve', data: vals.map(v => v * rate / 100), backgroundColor: '#7c5cff88', borderRadius: 6, stack: 's', maxBarThickness: 26 }
    ] },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8 } } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { callback: tickKr } } } }
  });
  if (!ptCatIds().length) return `<div class="card empty"><div class="emoji">🏋️</div><h2>Ingen PT-kategori</h2><p>Markér en indtægtskategori som "personlig træning" under Indstillinger.</p></div>`;
  return `
  <div class="grid kpis">
    <div class="card kpi hero"><div class="label">PT-indtægt ${year}</div><div class="value">${kr(ytd, false)}</div><div class="sub">${prevYear ? `${deltaPill(ytdUpto, prevYear)} vs. samme periode ${Number(year) - 1}` : `${sessions} betalinger · ${activeMonths} måneder med indtægt`}</div></div>
    <div class="card kpi"><div class="label">${MONTHS[Number(selMonth.slice(5)) - 1]}</div><div class="value">${kr(thisM, false)}</div><div class="sub">reservér ${kr(thisM * rate / 100, false)}</div></div>
    <div class="card kpi"><div class="label">🏦 Sæt til side (${rate} %)</div><div class="value warn">${kr(ytd * rate / 100, false)}</div><div class="sub">for hele ${year}</div></div>
    <div class="card kpi"><div class="label">Gns. pr. aktiv md.</div><div class="value">${kr(activeMonths ? ytd / activeMonths : 0, false)}</div><div class="sub">${kr(ytd * (1 - rate / 100), false)} efter reserve</div></div>
  </div>
  <div class="grid cols-2 section">
    <div class="card"><h2>PT-indtægt pr. måned <small>${year}</small></h2><div class="chart-box tall"><canvas id="chPT"></canvas></div></div>
    <div class="card">
      <h2>Din skat-reserve</h2>
      <div class="field"><label for="ptRate">Procentsats, du selv vælger at sætte til side</label>
        <div style="display:flex;gap:12px;align-items:center"><input type="range" id="ptRate" min="0" max="60" step="1" value="${rate}" style="flex:1;accent-color:#7c5cff"><input class="input" id="ptRateNum" type="number" min="0" max="100" value="${rate}" style="width:84px;text-align:center"><span>%</span></div></div>
      <div class="disclaimer">ℹ️ Dette er et <strong>estimat ud fra den procentsats, du selv har sat</strong> – ikke skatterådgivning. Din faktiske skat afhænger af bl.a. kommuneskat, fradrag og topskat. Tjek din forskudsopgørelse på skat.dk eller spørg en revisor.</div>
      <div class="list" style="margin-top:12px">
        <div class="row"><div class="main-col"><div class="title">Indtægt i ${year}</div></div><div class="amt">${kr(ytd)}</div></div>
        <div class="row"><div class="main-col"><div class="title">Reserve (${rate} %)</div></div><div class="amt warn">−${kr(ytd * rate / 100)}</div></div>
        <div class="row"><div class="main-col"><div class="title">Til dig efter reserve</div></div><div class="amt pos">${kr(ytd * (1 - rate / 100))}</div></div>
      </div>
    </div>
  </div>
  <div class="card section"><h2>Måned for måned <small>${year}</small></h2><div class="scroll-x"><table class="tbl">
    <thead><tr><th>Måned</th><th class="r">Indtægt</th><th class="r">Reserve</th><th class="r">Til dig</th></tr></thead>
    <tbody>${keys.map((k, i) => `<tr${k === selMonth ? ' style="font-weight:700"' : ''}><td style="text-transform:capitalize">${MONTHS[i]}</td><td class="r">${vals[i] ? kr(vals[i]) : '–'}</td><td class="r">${vals[i] ? kr(vals[i] * rate / 100) : '–'}</td><td class="r">${vals[i] ? kr(vals[i] * (1 - rate / 100)) : '–'}</td></tr>`).join('')}
    <tr style="font-weight:700"><td>I alt</td><td class="r">${kr(ytd)}</td><td class="r">${kr(ytd * rate / 100)}</td><td class="r">${kr(ytd * (1 - rate / 100))}</td></tr></tbody></table></div></div>`;
}

/* ---------- Visning: Abonnementsjæger ---------- */
function renderAbonnementer() {
  const exp = S.recurring.filter(r => r.type === 'expense' && isActiveRec(r));
  const inc = S.recurring.filter(r => r.type === 'income' && isActiveRec(r));
  const stopped = S.recurring.filter(r => !isActiveRec(r));
  const sorters = {
    'amount-desc': (a, b) => b.amount - a.amount, 'amount-asc': (a, b) => a.amount - b.amount,
    'name': (a, b) => a.name.localeCompare(b.name, 'da'), 'category': (a, b) => cat(a.categoryId).name.localeCompare(cat(b.categoryId).name, 'da') || b.amount - a.amount,
    'cancel': (a, b) => (b.considerCancel ? 1 : 0) - (a.considerCancel ? 1 : 0) || b.amount - a.amount
  };
  exp.sort(sorters[S.settings.subSort] || sorters['amount-desc']);
  const monthly = sum(exp.map(r => r.amount));
  const subs = exp.filter(r => r.kind === 'abonnement');
  const marked = exp.filter(r => r.considerCancel);
  const saving = sum(marked.map(r => r.amount)) * 12;
  const row = r => { const c = cat(r.categoryId); return `<div class="row">
    <div class="avatar" style="background:${c.color}22">${c.emoji}</div>
    <div class="main-col click" data-action="edit-rec" data-id="${r.id}" style="cursor:pointer"><div class="title">${esc(r.name)}</div>
      <div class="meta">${r.kind === 'abonnement' ? '<span class="pill accent">Abonnement</span>' : '<span class="pill">Fast</span>'} ${esc(c.name)} · d. ${r.day}.</div></div>
    <div class="amt ${r.type === 'income' ? 'pos' : ''}">${kr(r.amount)}<small>${kr(r.amount * 12, false)}/år</small></div>
    ${r.type === 'expense' ? `<button class="icon-btn" title="Overvej at opsige" aria-label="Overvej at opsige" data-action="toggle-cancel" data-id="${r.id}" style="${r.considerCancel ? 'background:rgba(255,107,139,.18)' : 'filter:grayscale(1);opacity:.5'}">✂️</button>` : ''}
  </div>`; };
  return `
  <div class="grid kpis">
    <div class="card kpi hero"><div class="label">Faste udgifter pr. måned</div><div class="value">${kr(monthly, false)}</div><div class="sub">${kr(monthly * 12, false)} om året · ${exp.length} poster</div></div>
    <div class="card kpi"><div class="label">📺 Abonnementer</div><div class="value">${kr(sum(subs.map(r => r.amount)), false)}</div><div class="sub">${subs.length} stk. · ${kr(sum(subs.map(r => r.amount)) * 12, false)}/år</div></div>
    <div class="card kpi"><div class="label">✂️ Overvejer at opsige</div><div class="value">${marked.length}</div><div class="sub">${marked.length ? marked.map(r => esc(r.name)).join(', ') : 'tryk ✂️ på en post'}</div></div>
    <div class="card kpi"><div class="label">💡 Mulig besparelse</div><div class="value pos">${kr(saving, false)}</div><div class="sub">om året (${kr(saving / 12, false)}/md.)</div></div>
  </div>
  <div class="toolbar section">
    <label class="lbl" for="subSort">Sortér</label>
    <select class="input" id="subSort" style="width:auto">
      ${[['amount-desc', 'Beløb – højeste først'], ['amount-asc', 'Beløb – laveste først'], ['name', 'Navn (A–Å)'], ['category', 'Kategori'], ['cancel', 'Markerede først']].map(([v, l]) => `<option value="${v}" ${S.settings.subSort === v ? 'selected' : ''}>${l}</option>`).join('')}
    </select>
    <div class="grow"></div>
    <button class="btn btn-primary" data-action="add-rec">＋ Ny fast post</button>
  </div>
  <div class="card"><h2>Faste udgifter & abonnementer <small>bogføres automatisk hver måned</small></h2>
    <div class="list">${exp.map(row).join('') || '<p class="muted">Ingen faste udgifter endnu. Tilføj fx husleje, el, forsikring og streaming.</p>'}</div></div>
  ${inc.length ? `<div class="card section"><h2>Faste indtægter <small>${kr(sum(inc.map(r => r.amount)), false)}/md.</small></h2><div class="list">${inc.map(row).join('')}</div></div>` : ''}
  ${stopped.length ? `<div class="card section"><h2>Stoppede poster</h2><div class="list">${stopped.map(r => `<div class="row"><div class="avatar" style="background:var(--input)">${cat(r.categoryId).emoji}</div><div class="main-col"><div class="title">${esc(r.name)}</div><div class="meta">Stoppet efter ${monthLabel(r.endMonth)} · sparer ${kr(r.amount * 12, false)}/år</div></div><button class="btn btn-sm" data-action="reactivate-rec" data-id="${r.id}">Genaktivér</button></div>`).join('')}</div></div>` : ''}`;
}

/* ---------- Visning: Mere & Indstillinger ---------- */
function renderMere() {
  const tiles = [['budget', '🎯', 'Budget', 'Loft pr. kategori'], ['pt', '🏋️', 'Personlig træning', 'Indtægt & skat-reserve'], ['abonnementer', '✂️', 'Abonnementsjæger', 'Faste poster & besparelser'], ['indstillinger', '⚙️', 'Indstillinger', 'Kategorier, backup, import']];
  return `<div class="more-grid">${tiles.map(([r, e, t, d]) => `<a class="card more-tile" href="#/${r}"><div class="avatar">${e}</div><strong>${t}</strong><span>${d}</span></a>`).join('')}</div>`;
}
function renderIndstillinger() {
  const catRow = c => `<div class="row click" data-action="edit-cat" data-id="${c.id}"><div class="avatar" style="background:${c.color}22">${c.emoji}</div><div class="main-col"><div class="title">${esc(c.name)}</div><div class="meta">${c.budget > 0 ? 'Budget ' + kr(c.budget, false) : 'Intet budget'}${c.isPT ? ' · <span class="pill accent">PT</span>' : ''}</div></div><span style="width:14px;height:14px;border-radius:50%;background:${c.color}"></span></div>`;
  return `
  <div class="grid cols-2">
    <div class="card"><h2>Udgiftskategorier <button class="btn btn-sm" data-action="add-cat" data-type="expense">＋ Ny</button></h2><div class="list">${catsOf('expense').map(catRow).join('')}</div></div>
    <div>
      <div class="card"><h2>Indtægtskategorier <button class="btn btn-sm" data-action="add-cat" data-type="income">＋ Ny</button></h2><div class="list">${catsOf('income').map(catRow).join('')}</div></div>
      <div class="card section"><h2>Udseende</h2>
        <label class="switch"><span>🌙 Mørkt tema</span><input type="checkbox" id="darkToggle" ${S.settings.theme === 'dark' ? 'checked' : ''}></label>
        <div class="field"><label for="nameInput">Dit navn</label><input class="input" id="nameInput" value="${esc(S.settings.name)}"></div>
      </div>
    </div>
  </div>
  <div class="grid cols-2 section">
    <div class="card"><h2>Backup & data</h2>
      <p class="muted small">Dine data gemmes kun i denne browser på denne enhed. Tag en backup jævnligt – og brug den til at flytte data til en anden enhed.</p>
      <div class="btn-row">
        <button class="btn" data-action="export-json">💾 Eksportér backup (JSON)</button>
        <button class="btn" data-action="import-json">📂 Gendan backup</button>
        <button class="btn" data-action="export-csv-all">⬇️ Eksportér alt som CSV</button>
      </div>
      <input type="file" id="jsonFile" accept=".json,application/json" hidden>
    </div>
    <div class="card"><h2>Import fra bank</h2>
      <p class="muted small">Indlæs et kontoudtog som CSV (fx fra Danske Bank, Nordea, Jyske Bank eller Lunar). Semikolon og komma-decimaler understøttes, og du vælger selv kolonnerne.</p>
      <button class="btn btn-primary" data-action="import-csv">🏦 Importér kontoudtog (CSV)</button>
      <input type="file" id="csvFile" accept=".csv,.txt,text/csv" hidden>
    </div>
  </div>
  <div class="card section"><h2>Eksempeldata & nulstil</h2>
    <p class="muted small">Prøv appen med opdigtede tal for et helt år, eller start forfra med en tom app.</p>
    <div class="btn-row">
      ${S.isExample ? '<button class="btn" data-action="clear-example">🧹 Fjern eksempeldata</button>' : '<button class="btn" data-action="load-example">🧪 Prøv med eksempeldata</button>'}
      <button class="btn btn-danger" data-action="reset">🗑️ Nulstil alt</button>
    </div>
  </div>
  <p class="muted small" style="text-align:center;margin-top:20px">Min Økonomi · virker offline · tip: vælg “Føj til hjemmeskærm” i browseren for at installere appen</p>`;
}

/* ---------- Modaler ---------- */
function openSheet(html, onMount) {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="overlay" data-close-overlay><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div></div>`;
  document.body.style.overflow = 'hidden';
  onMount && onMount(root.querySelector('.sheet'));
  const first = root.querySelector('[autofocus]'); if (first && matchMedia('(min-width: 900px)').matches) first.focus();
}
function closeSheet() { $('#modalRoot').innerHTML = ''; document.body.style.overflow = ''; }
const sheetHead = t => `<div class="sheet-head"><h2>${t}</h2><button class="icon-btn" data-action="close" aria-label="Luk">✕</button></div>`;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400); }
function chipsHTML(type, selected, name = 'cat') {
  return `<div class="chips" data-chips="${name}">${catsOf(type).map(c => `<button type="button" class="chip ${c.id === selected ? 'on' : ''}" data-val="${c.id}">${c.emoji} ${esc(c.name)}</button>`).join('')}</div>`;
}
function bindChips(sheet, name, onPick) {
  const box = sheet.querySelector(`[data-chips="${name}"]`); if (!box) return;
  box.addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; $$('.chip', box).forEach(x => x.classList.toggle('on', x === b)); onPick && onPick(b.dataset.val); });
}
const pickedChip = (sheet, name) => sheet.querySelector(`[data-chips="${name}"] .chip.on`)?.dataset.val;

/* Postering – fuld formular */
function openTxModal(tx, preset = {}) {
  const isNew = !tx;
  const t = tx ? { ...tx } : { type: preset.type || 'expense', amount: preset.amount || '', date: selMonth === curMonth() ? todayISO() : `${selMonth}-01`, categoryId: preset.categoryId || null, note: preset.note || '' };
  if (!t.categoryId) t.categoryId = t.type === 'expense' ? (recentExpenseCats()[0] || catsOf('expense')[0]?.id) : (S.categories.find(c => c.id === 'c-lon')?.id || catsOf('income')[0]?.id);
  const rec = tx?.recurringId ? S.recurring.find(r => r.id === tx.recurringId) : null;
  openSheet(`${sheetHead(isNew ? 'Ny postering' : 'Rediger postering')}
    <div class="segmented" id="typeSeg"><button type="button" data-t="expense" class="exp ${t.type === 'expense' ? 'on' : ''}">− Udgift</button><button type="button" data-t="income" class="inc ${t.type === 'income' ? 'on' : ''}">＋ Indtægt</button></div>
    <div class="field"><input class="input amount-input" id="fAmount" inputmode="decimal" placeholder="0,00 kr" value="${t.amount !== '' ? nf2.format(t.amount) : ''}" autofocus aria-label="Beløb"></div>
    <div class="field"><span class="lbl">Kategori</span><div id="chipWrap">${chipsHTML(t.type, t.categoryId)}</div></div>
    <div class="field-row"><div class="field"><label for="fDate">Dato · <span id="fDateTxt">${fmtDate(t.date)}</span></label><input class="input" type="date" id="fDate" value="${t.date}"></div>
      <div class="field"><label for="fNote">Note</label><input class="input" id="fNote" placeholder="Fx Netto, PT-klient…" value="${esc(t.note)}"></div></div>
    ${isNew ? `<label class="switch"><span>🔁 Gentag hver måned <span class="muted small">(fast post)</span></span><input type="checkbox" id="fRec"></label>` : ''}
    ${rec ? `<p class="muted small">🔁 Denne postering kommer fra den faste post <strong>${esc(rec.name)}</strong>. Ændringer her gælder kun denne måned. <a href="#" data-action="edit-rec" data-id="${rec.id}">Rediger den faste post</a></p>` : ''}
    <div class="btn-row" style="margin-top:6px">
      <button class="btn btn-primary" style="flex:1" id="fSave">${isNew ? 'Gem postering' : 'Gem ændringer'}</button>
      ${isNew ? '' : '<button class="btn btn-danger" id="fDel">Slet</button>'}
    </div>`, sheet => {
    let type = t.type, catId = t.categoryId;
    const seg = $('#typeSeg', sheet);
    seg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; type = b.dataset.t;
      $$('button', seg).forEach(x => x.classList.toggle('on', x === b));
      catId = catsOf(type)[0]?.id; $('#chipWrap', sheet).innerHTML = chipsHTML(type, catId); bindChips(sheet, 'cat', v => catId = v);
    });
    bindChips(sheet, 'cat', v => catId = v);
    $('#fDate', sheet).addEventListener('change', e => { $('#fDateTxt', sheet).textContent = fmtDate(e.target.value); });
    $('#fSave', sheet).onclick = () => {
      const amount = Math.abs(parseAmount($('#fAmount', sheet).value));
      const date = $('#fDate', sheet).value;
      if (!(amount > 0)) { toast('Skriv et beløb større end 0'); $('#fAmount', sheet).focus(); return; }
      if (!date) { toast('Vælg en dato'); return; }
      const note = $('#fNote', sheet).value.trim();
      if (isNew) {
        if ($('#fRec', sheet)?.checked) {
          const r = { id: uid(), type, amount, categoryId: catId, name: note || cat(catId).name, day: Number(date.slice(8)), startMonth: date.slice(0, 7), kind: catId === 'c-abonnement' ? 'abonnement' : 'fast', skipped: [] };
          S.recurring.push(r);
          S.transactions.push({ id: uid(), type, amount, date, categoryId: catId, note: r.name, recurringId: r.id });
        } else S.transactions.push({ id: uid(), type, amount, date, categoryId: catId, note });
        lastUsed(catId);
      } else Object.assign(tx, { type, amount, date, categoryId: catId, note });
      save(); closeSheet(); selMonth = date.slice(0, 7); render(); toast(isNew ? 'Postering gemt ✓' : 'Ændringer gemt ✓');
    };
    const del = $('#fDel', sheet);
    if (del) del.onclick = () => {
      if (!confirm('Slet denne postering?')) return;
      if (tx.recurringId) { const r = S.recurring.find(x => x.id === tx.recurringId); if (r) { r.skipped = r.skipped || []; r.skipped.push(tx.date.slice(0, 7)); } }
      S.transactions = S.transactions.filter(x => x.id !== tx.id); save(); closeSheet(); render(); toast('Postering slettet');
    };
  });
}
function lastUsed(catId) { S.settings.recentCats = [catId, ...(S.settings.recentCats || []).filter(x => x !== catId)].slice(0, 8); }
function recentExpenseCats() {
  const ids = [...(S.settings.recentCats || [])];
  [...S.transactions].filter(t => t.type === 'expense' && !t.recurringId).sort((a, b) => b.date.localeCompare(a.date)).forEach(t => ids.includes(t.categoryId) || ids.push(t.categoryId));
  ['c-mad', 'c-ude', 'c-transport', 'c-shopping', 'c-fritid', 'c-andet'].forEach(id => ids.includes(id) || ids.push(id));
  return ids.filter(id => S.categories.some(c => c.id === id && c.type === 'expense')).slice(0, 6);
}

/* Hurtig registrering – keypad */
function openQuickAdd() {
  let val = '';
  const cats = recentExpenseCats();
  let catId = cats[0];
  openSheet(`${sheetHead('⚡ Hurtig udgift')}
    <div class="qa-amount"><span id="qaVal">0</span><span class="cur">kr</span></div>
    <div class="qa-sub">${fmtDate(todayISO())} · vælg kategori og gem</div>
    <div class="chips" data-chips="qa" style="justify-content:center">${cats.map(id => { const c = cat(id); return `<button type="button" class="chip ${id === catId ? 'on' : ''}" data-val="${id}">${c.emoji} ${esc(c.name)}</button>`; }).join('')}</div>
    <div class="keypad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'].map(k => `<button type="button" data-k="${k}">${k}</button>`).join('')}</div>
    <div class="btn-row"><button class="btn" id="qaMore">Flere detaljer</button><button class="btn btn-primary" style="flex:1" id="qaSave">Gem udgift</button></div>`, sheet => {
    const show = () => { $('#qaVal', sheet).textContent = val ? (val.includes(',') ? nf0.format(Math.floor(parseAmount(val) || 0)) + ',' + val.split(',')[1] : nf0.format(parseAmount(val) || 0)) : '0'; };
    $('.keypad', sheet).addEventListener('click', e => {
      const k = e.target.closest('button')?.dataset.k; if (!k) return;
      if (navigator.vibrate) navigator.vibrate(8);
      if (k === '⌫') val = val.slice(0, -1);
      else if (k === ',') { if (!val.includes(',')) val = (val || '0') + ','; }
      else if (val.includes(',') ? val.split(',')[1].length < 2 : val.replace(/^0/, '').length < 7) val = (val === '0' ? '' : val) + k;
      show();
    });
    bindChips(sheet, 'qa', v => catId = v);
    $('#qaMore', sheet).onclick = () => { closeSheet(); openTxModal(null, { type: 'expense', amount: parseAmount(val) || '', categoryId: catId }); };
    $('#qaSave', sheet).onclick = () => {
      const amount = parseAmount(val);
      if (!(amount > 0)) { toast('Tast et beløb'); return; }
      S.transactions.push({ id: uid(), type: 'expense', amount, date: todayISO(), categoryId: catId, note: cat(catId).name });
      lastUsed(catId); save(); closeSheet(); selMonth = curMonth(); render(); toast(`${cat(catId).emoji} ${kr(amount)} gemt ✓`);
    };
  });
}

/* Fast post */
function openRecModal(r) {
  const isNew = !r;
  const x = r ? { ...r } : { type: 'expense', amount: '', categoryId: 'c-abonnement', name: '', day: 1, kind: 'abonnement', startMonth: curMonth() };
  openSheet(`${sheetHead(isNew ? 'Ny fast post' : 'Rediger fast post')}
    <div class="segmented" id="rType"><button type="button" data-t="expense" class="exp ${x.type === 'expense' ? 'on' : ''}">− Fast udgift</button><button type="button" data-t="income" class="inc ${x.type === 'income' ? 'on' : ''}">＋ Fast indtægt</button></div>
    <div class="field"><label for="rName">Navn</label><input class="input" id="rName" placeholder="Fx Husleje, Netflix, Løn" value="${esc(x.name)}" autofocus></div>
    <div class="field-row"><div class="field"><label for="rAmount">Beløb pr. måned</label><input class="input" id="rAmount" inputmode="decimal" placeholder="0,00" value="${x.amount !== '' ? nf2.format(x.amount) : ''}"></div>
      <div class="field"><label for="rDay">Dag i måneden</label><input class="input" id="rDay" type="number" min="1" max="31" value="${x.day}"></div></div>
    <div class="field"><span class="lbl">Kategori</span><div id="rChipWrap">${chipsHTML(x.type, x.categoryId, 'rcat')}</div></div>
    <div class="field-row"><div class="field"><label for="rKind">Type</label><select class="input" id="rKind"><option value="fast" ${x.kind !== 'abonnement' ? 'selected' : ''}>Fast udgift/indtægt</option><option value="abonnement" ${x.kind === 'abonnement' ? 'selected' : ''}>Abonnement</option></select></div>
      <div class="field"><label for="rStart">Start fra måned</label><input class="input" id="rStart" type="month" value="${x.startMonth}"></div></div>
    <p class="muted small">Posten bogføres automatisk hver måned fra startmåneden.</p>
    <div class="btn-row"><button class="btn btn-primary" style="flex:1" id="rSave">Gem</button>
      ${isNew ? '' : `<button class="btn" id="rStop">⏹️ Stop efter denne md.</button><button class="btn btn-danger" id="rDel">Slet</button>`}</div>`, sheet => {
    let type = x.type, catId = x.categoryId;
    $('#rType', sheet).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; type = b.dataset.t; $$('#rType button', sheet).forEach(q => q.classList.toggle('on', q === b)); catId = catsOf(type)[0]?.id; $('#rChipWrap', sheet).innerHTML = chipsHTML(type, catId, 'rcat'); bindChips(sheet, 'rcat', v => catId = v); });
    bindChips(sheet, 'rcat', v => catId = v);
    $('#rSave', sheet).onclick = () => {
      const amount = Math.abs(parseAmount($('#rAmount', sheet).value)); const name = $('#rName', sheet).value.trim() || cat(catId).name;
      if (!(amount > 0)) { toast('Skriv et beløb'); return; }
      const day = Math.min(31, Math.max(1, Number($('#rDay', sheet).value) || 1));
      const data = { type, amount, name, day, categoryId: catId, kind: $('#rKind', sheet).value, startMonth: $('#rStart', sheet).value || curMonth() };
      if (isNew) S.recurring.push({ id: uid(), skipped: [], ...data });
      else {
        Object.assign(r, data);
        // Opdater indeværende måneds postering, så tallene passer med det samme
        const t = S.transactions.find(t => t.recurringId === r.id && t.date.startsWith(curMonth()));
        if (t) Object.assign(t, { type, amount, categoryId: catId, note: name, date: `${curMonth()}-${pad(Math.min(day, dim(curMonth())))}` });
        S.transactions = S.transactions.filter(t => t.recurringId !== r.id || t.date.slice(0, 7) >= r.startMonth);
      }
      applyRecurring(); save(); closeSheet(); render(); toast('Fast post gemt ✓');
    };
    if (!isNew) {
      $('#rStop', sheet).onclick = () => { r.endMonth = curMonth(); r.considerCancel = false; save(); closeSheet(); render(); toast('Stoppet – bogføres ikke fra næste måned'); };
      $('#rDel', sheet).onclick = () => {
        if (!confirm('Slet den faste post? Tidligere posteringer bevares.')) return;
        S.transactions.forEach(t => { if (t.recurringId === r.id) delete t.recurringId; });
        S.recurring = S.recurring.filter(q => q.id !== r.id); save(); closeSheet(); render(); toast('Fast post slettet');
      };
    }
  });
}

/* Mål */
const GOAL_EMOJI = ['🛟', '✈️', '🚴', '🏠', '🚗', '💍', '🎓', '💻', '🏖️', '🎯'];
function openGoalModal(g) {
  const isNew = !g;
  const x = g ? { ...g } : { name: '', emoji: '🎯', target: '', deadline: '', color: COLORS[S.goals.length % COLORS.length] };
  openSheet(`${sheetHead(isNew ? 'Nyt opsparingsmål' : 'Rediger mål')}
    <div class="field"><span class="lbl">Ikon</span><div class="chips" data-chips="gemoji">${GOAL_EMOJI.map(e => `<button type="button" class="chip ${e === x.emoji ? 'on' : ''}" data-val="${e}" style="font-size:18px">${e}</button>`).join('')}</div></div>
    <div class="field"><label for="gName">Navn</label><input class="input" id="gName" placeholder="Fx Buffer, Ferie, Ny cykel" value="${esc(x.name)}" autofocus></div>
    <div class="field-row"><div class="field"><label for="gTarget">Målbeløb</label><input class="input" id="gTarget" inputmode="decimal" placeholder="25.000" value="${x.target !== '' ? nf2.format(x.target) : ''}"></div>
      <div class="field"><label for="gDeadline">Deadline</label><input class="input" type="date" id="gDeadline" value="${x.deadline || ''}"></div></div>
    ${isNew ? `<div class="field"><label for="gStart">Allerede sparet op</label><input class="input" id="gStart" inputmode="decimal" placeholder="0,00"></div>` : ''}
    <div class="field"><span class="lbl">Farve</span><div class="chips" id="gColors">${COLORS.slice(0, 8).map(c => `<span class="color-dot ${c === x.color ? 'on' : ''}" data-c="${c}" style="background:${c}"></span>`).join('')}</div></div>
    <div class="btn-row"><button class="btn btn-primary" style="flex:1" id="gSave">Gem mål</button>${isNew ? '' : '<button class="btn btn-danger" id="gDel">Slet</button>'}</div>`, sheet => {
    let emoji = x.emoji, color = x.color;
    bindChips(sheet, 'gemoji', v => emoji = v);
    $('#gColors', sheet).addEventListener('click', e => { const d = e.target.closest('.color-dot'); if (!d) return; color = d.dataset.c; $$('.color-dot', sheet).forEach(q => q.classList.toggle('on', q === d)); });
    $('#gSave', sheet).onclick = () => {
      const target = parseAmount($('#gTarget', sheet).value);
      if (!(target > 0)) { toast('Skriv et målbeløb'); return; }
      const data = { name: $('#gName', sheet).value.trim() || 'Mit mål', emoji, color, target, deadline: $('#gDeadline', sheet).value || '' };
      if (isNew) { const st = parseAmount($('#gStart', sheet).value); S.goals.push({ id: uid(), ...data, contributions: st > 0 ? [{ id: uid(), date: todayISO(), amount: st, note: 'Startbeløb', initial: true }] : [] }); }
      else Object.assign(g, data);
      save(); closeSheet(); render(); toast('Mål gemt ✓');
    };
    if (!isNew) $('#gDel', sheet).onclick = () => { if (!confirm('Slet målet?')) return; S.goals = S.goals.filter(q => q.id !== g.id); save(); closeSheet(); render(); };
  });
}
function openContribute(g) {
  const hist = [...(g.contributions || [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  openSheet(`${sheetHead(`${g.emoji} Indbetal til ${esc(g.name)}`)}
    <div class="segmented" id="cSeg"><button type="button" class="inc on" data-s="1">＋ Indbetal</button><button type="button" class="exp" data-s="-1">− Hæv</button></div>
    <div class="field"><input class="input amount-input" id="cAmount" inputmode="decimal" placeholder="0,00 kr" autofocus aria-label="Beløb"></div>
    <div class="chips" style="justify-content:center;margin-bottom:14px">${[250, 500, 1000, 2000].map(v => `<button type="button" class="chip" data-quick="${v}">${nf0.format(v)} kr</button>`).join('')}</div>
    <div class="field"><label for="cDate">Dato</label><input class="input" type="date" id="cDate" value="${todayISO()}"></div>
    <button class="btn btn-primary btn-block" id="cSave">Gem</button>
    ${hist.length ? `<h3 style="margin:18px 0 6px;font-size:14px">Seneste bevægelser</h3><div class="list">${hist.map(c => `<div class="row"><div class="main-col"><div class="title">${esc(c.note || (c.amount > 0 ? 'Indbetaling' : 'Hævning'))}</div><div class="meta">${fmtDate(c.date)}</div></div><div class="amt ${c.amount > 0 ? 'pos' : 'neg'}">${c.amount > 0 ? '+' : '−'}${kr(Math.abs(c.amount))}</div></div>`).join('')}</div>` : ''}`, sheet => {
    let sign = 1;
    $('#cSeg', sheet).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; sign = Number(b.dataset.s); $$('#cSeg button', sheet).forEach(q => q.classList.toggle('on', q === b)); });
    sheet.addEventListener('click', e => { const q = e.target.closest('[data-quick]'); if (q) $('#cAmount', sheet).value = nf2.format(Number(q.dataset.quick)); });
    $('#cSave', sheet).onclick = () => {
      const a = Math.abs(parseAmount($('#cAmount', sheet).value)); if (!(a > 0)) { toast('Skriv et beløb'); return; }
      g.contributions = g.contributions || []; g.contributions.push({ id: uid(), date: $('#cDate', sheet).value || todayISO(), amount: sign * a });
      save(); closeSheet(); render(); toast(sign > 0 ? `${kr(a)} sat ind 🎉` : `${kr(a)} hævet`);
    };
  });
}

/* Budgetter */
function openBudgetModal() {
  openSheet(`${sheetHead('🎯 Månedlige budgetter')}
    <p class="muted small">Sæt et loft pr. kategori. Lad feltet stå tomt for ingen grænse. Gennemsnittet er dit forbrug de seneste 3 måneder.</p>
    ${catsOf('expense').map(c => { const avg = sum([1, 2, 3].map(i => stats(addMonths(curMonth(), -i)).byCat[c.id] || 0)) / 3; return `<div class="row"><div class="avatar" style="background:${c.color}22">${c.emoji}</div><div class="main-col"><div class="title">${esc(c.name)}</div><div class="meta">gns. ${kr(avg, false)}</div></div><input class="input" style="width:120px;text-align:right" inputmode="decimal" data-bud="${c.id}" placeholder="–" value="${c.budget > 0 ? nf0.format(c.budget) : ''}"></div>`; }).join('')}
    <button class="btn btn-primary btn-block" style="margin-top:14px" id="bSave">Gem budgetter</button>`, sheet => {
    $('#bSave', sheet).onclick = () => { $$('[data-bud]', sheet).forEach(i => { const c = cat(i.dataset.bud); const v = parseAmount(i.value); c.budget = v > 0 ? v : null; }); save(); closeSheet(); render(); toast('Budgetter gemt ✓'); };
  });
}

/* Kategorier */
const CAT_EMOJI = ['🏠', '⚡', '🛡️', '📺', '📱', '🛒', '🍔', '☕', '🚲', '🚗', '💪', '🛍️', '🎉', '✈️', '🐶', '👶', '🎁', '💊', '📚', '🍷', '💼', '🏋️', '💰', '📦', '🤝', '🧾'];
function openCatModal(c, type) {
  const isNew = !c;
  const x = c ? { ...c } : { name: '', emoji: '📦', color: COLORS[S.categories.length % COLORS.length], type: type || 'expense' };
  const used = c ? S.transactions.filter(t => t.categoryId === c.id).length + S.recurring.filter(r => r.categoryId === c.id).length : 0;
  openSheet(`${sheetHead(isNew ? 'Ny kategori' : 'Rediger kategori')}
    <div class="field"><label for="kName">Navn</label><input class="input" id="kName" value="${esc(x.name)}" placeholder="Fx Kæledyr" autofocus></div>
    <div class="field"><span class="lbl">Emoji</span><div class="chips" data-chips="kemoji">${CAT_EMOJI.map(e => `<button type="button" class="chip ${e === x.emoji ? 'on' : ''}" data-val="${e}" style="font-size:18px;padding:6px 10px">${e}</button>`).join('')}</div></div>
    <div class="field"><span class="lbl">Farve</span><div class="chips" id="kColors">${COLORS.map(col => `<span class="color-dot ${col === x.color ? 'on' : ''}" data-c="${col}" style="background:${col}"></span>`).join('')}</div></div>
    ${x.type === 'income' ? `<label class="switch"><span>🏋️ Tæl som personlig træning <span class="muted small">(PT-oversigt)</span></span><input type="checkbox" id="kPT" ${x.isPT ? 'checked' : ''}></label>` : ''}
    <div class="btn-row"><button class="btn btn-primary" style="flex:1" id="kSave">Gem</button>${isNew ? '' : `<button class="btn btn-danger" id="kDel">Slet</button>`}</div>
    ${used ? `<p class="muted small">Bruges af ${used} posteringer. Sletter du kategorien, flyttes de til “Andet”.</p>` : ''}`, sheet => {
    let emoji = x.emoji, color = x.color;
    bindChips(sheet, 'kemoji', v => emoji = v);
    $('#kColors', sheet).addEventListener('click', e => { const d = e.target.closest('.color-dot'); if (!d) return; color = d.dataset.c; $$('.color-dot', sheet).forEach(q => q.classList.toggle('on', q === d)); });
    $('#kSave', sheet).onclick = () => {
      const name = $('#kName', sheet).value.trim(); if (!name) { toast('Giv kategorien et navn'); return; }
      const data = { name, emoji, color }; if (x.type === 'income') data.isPT = $('#kPT', sheet).checked;
      if (isNew) S.categories.push({ id: 'c-' + uid(), type: x.type, ...data }); else Object.assign(c, data);
      save(); closeSheet(); render(); toast('Kategori gemt ✓');
    };
    if (!isNew) $('#kDel', sheet).onclick = () => {
      if (catsOf(c.type).length <= 1) { toast('Der skal være mindst én kategori'); return; }
      if (!confirm(`Slet kategorien “${c.name}”?`)) return;
      const fallback = (c.type === 'expense' ? S.categories.find(q => q.id === 'c-andet' && q.id !== c.id) : S.categories.find(q => q.id === 'c-indt-andet' && q.id !== c.id)) || catsOf(c.type).find(q => q.id !== c.id);
      S.transactions.forEach(t => { if (t.categoryId === c.id) t.categoryId = fallback.id; });
      S.recurring.forEach(r => { if (r.categoryId === c.id) r.categoryId = fallback.id; });
      S.categories = S.categories.filter(q => q.id !== c.id); save(); closeSheet(); render();
    };
  });
}

/* ---------- Eksport / import ---------- */
function download(name, content, mime) {
  const blob = new Blob([content], { type: mime }); const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function toCSV(list) {
  const q = v => /[;"\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v;
  const rows = [['Dato', 'Type', 'Kategori', 'Beløb', 'Note', 'Fast post']];
  [...list].sort((a, b) => a.date.localeCompare(b.date)).forEach(t => rows.push([fmtDateNum(t.date), t.type === 'income' ? 'Indtægt' : 'Udgift', cat(t.categoryId).name, nf2.format(t.type === 'income' ? t.amount : -t.amount), t.note || '', t.recurringId ? 'Ja' : '']));
  return '\ufeff' + rows.map(r => r.map(x => q(String(x))).join(';')).join('\r\n');
}
function readFile(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const txt = r.result;
      if (txt.includes('\ufffd')) { const r2 = new FileReader(); r2.onload = () => res(r2.result); r2.onerror = rej; r2.readAsText(file, 'windows-1252'); }
      else res(txt);
    };
    r.onerror = rej; r.readAsText(file, 'utf-8');
  });
}
function parseCSV(text) {
  text = text.replace(/^\ufeff/, '');
  const firstLine = text.split(/\r?\n/)[0] || '';
  const delim = [';', '\t', ','].map(d => [d, firstLine.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cell = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false; } else cell += ch; }
    else if (ch === '"') inQ = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); if (row.some(c => c.trim())) rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  row.push(cell); if (row.some(c => c.trim())) rows.push(row);
  return { rows: rows.map(r => r.map(c => c.trim())), delim };
}
function parseDateDK(s) {
  s = (s || '').trim(); let m;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/))) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${pad(m[2])}-${pad(m[1])}`; }
  return null;
}
const CSV_RULES = [
  [/netto|føtex|fotex|bilka|rema|lidl|coop|kvickly|irma|meny|superbrugsen|aldi|løvbjerg|spar |dagli'brugsen|365discount|wolt market|nemlig/i, 'c-mad'],
  [/restaurant|cafe|café|mcd|burger|pizza|sushi|wolt|just ?eat|joe & the juice|starbucks|espresso house|bar |bodega|7-eleven|kebab|bager/i, 'c-ude'],
  [/netflix|spotify|hbo|max\.com|viaplay|disney|youtube|apple\.com|icloud|tv ?2|podimo|mofibo|storytel|google one|chatgpt|adobe/i, 'c-abonnement'],
  [/husleje|boligforening|ejendom|leje|boligselskab/i, 'c-bolig'],
  [/ørsted|orsted|andel energi|norlys energi|ewii|vandværk|fjernvarme|forsyning|elselskab|radius/i, 'c-el'],
  [/tryg|topdanmark|alm\. ?brand|codan|if skade|gjensidige|lb forsikring|forsikring/i, 'c-forsikring'],
  [/telenor|telia|yousee|cbb|lebara|oister|hiper|fastspeed|3 mobil|norlys fiber|stofa|waoo/i, 'c-telefon'],
  [/a-kasse|akasse|fagforening|danske fysioterapeuter|ftf|lærernes|ase |krifa/i, 'c-fag'],
  [/dsb|rejsekort|movia|metro|q8|circle ?k|shell|uno-?x|ingo|ok benzin|parkering|easypark|bycyk|cykel/i, 'c-transport'],
  [/fitness|sats|puregym|apotek|fysio|tandlæge|læge|crossfit/i, 'c-sundhed'],
  [/h&m|zalando|magasin|matas|normal|elgiganten|power|ikea|jysk|zara|boozt|amazon|bahne|sport ?24|intersport/i, 'c-shopping'],
  [/biograf|nordisk film|kino|tivoli|billetlugen|ticketmaster|koncert|museum|steam|playstation/i, 'c-fritid']
];
function guessCat(text, type) {
  if (type === 'income') {
    if (/løn|loen|salary|lønoverførsel/i.test(text)) return 'c-lon';
    if (/pt|personlig træning|træning|mobilepay/i.test(text) && S.categories.some(c => c.id === 'c-pt')) return 'c-pt';
    return S.categories.find(c => c.id === 'c-indt-andet')?.id || catsOf('income')[0].id;
  }
  for (const [re, id] of CSV_RULES) if (re.test(text) && S.categories.some(c => c.id === id)) return id;
  return S.categories.find(c => c.id === 'c-andet')?.id || catsOf('expense')[0].id;
}
async function openCsvImport(file) {
  let parsed;
  try { parsed = parseCSV(await readFile(file)); } catch (e) { toast('Kunne ikke læse filen'); return; }
  const { rows, delim } = parsed;
  if (rows.length < 1) { toast('Filen ser tom ud'); return; }
  const header = rows[0];
  const ncol = Math.max(...rows.slice(0, 20).map(r => r.length));
  const find = re => { const i = header.findIndex(h => re.test(h)); return i; };
  // Gæt kolonner ud fra overskrifter eller indhold
  let cDate = find(/dato|date|bogf|posteringsdato/i), cText = find(/tekst|beskriv|text|modtager|navn|description|posteringstekst/i), cAmt = find(/bel[øo]b|amount|beloeb/i);
  const sample = rows.slice(1, 6);
  if (cDate < 0) cDate = [...Array(ncol).keys()].find(i => sample.every(r => parseDateDK(r[i]))) ?? 0;
  if (cAmt < 0) cAmt = [...Array(ncol).keys()].find(i => i !== cDate && sample.every(r => !isNaN(parseAmount(r[i])))) ?? 1;
  if (cText < 0) cText = [...Array(ncol).keys()].find(i => i !== cDate && i !== cAmt) ?? 2;
  const hasHeader = !parseDateDK(header[cDate]);
  const colOpts = sel => [...Array(ncol).keys()].map(i => `<option value="${i}" ${i === sel ? 'selected' : ''}>${esc(hasHeader ? header[i] || `Kolonne ${i + 1}` : `Kolonne ${i + 1}`)}</option>`).join('');
  openSheet(`${sheetHead('🏦 Importér kontoudtog')}
    <p class="muted small">Fundet ${rows.length} rækker · separator “${delim === '\t' ? 'tab' : delim}”. Vælg hvilke kolonner der indeholder dato, tekst og beløb. Negative beløb bliver til udgifter, positive til indtægter. Kategorier gættes ud fra teksten.</p>
    <div class="field-row" style="grid-template-columns:1fr 1fr 1fr">
      <div class="field"><label>Dato</label><select class="input" id="mDate">${colOpts(cDate)}</select></div>
      <div class="field"><label>Tekst</label><select class="input" id="mText">${colOpts(cText)}</select></div>
      <div class="field"><label>Beløb</label><select class="input" id="mAmt">${colOpts(cAmt)}</select></div>
    </div>
    <label class="switch"><span>Første række er overskrifter</span><input type="checkbox" id="mHead" ${hasHeader ? 'checked' : ''}></label>
    <div id="mPreview"></div>
    <button class="btn btn-primary btn-block" id="mImport" style="margin-top:12px">Importér</button>`, sheet => {
    const build = () => {
      const d = +$('#mDate', sheet).value, tx = +$('#mText', sheet).value, a = +$('#mAmt', sheet).value;
      const body = $('#mHead', sheet).checked ? rows.slice(1) : rows;
      return body.map(r => { const date = parseDateDK(r[d]); const amount = parseAmount(r[a]); if (!date || isNaN(amount) || amount === 0) return null; const type = amount < 0 ? 'expense' : 'income'; const note = (r[tx] || '').slice(0, 80); return { id: uid(), date, amount: Math.abs(amount), type, note, categoryId: guessCat(note, type), imported: true }; }).filter(Boolean);
    };
    const preview = () => {
      const list = build();
      const dupes = list.filter(n => S.transactions.some(t => t.date === n.date && Math.abs(t.amount - n.amount) < .005 && t.type === n.type && (t.note || '') === n.note)).length;
      $('#mPreview', sheet).innerHTML = `<div class="scroll-x"><table class="tbl"><thead><tr><th>Dato</th><th>Tekst</th><th>Kategori</th><th class="r">Beløb</th></tr></thead><tbody>${list.slice(0, 6).map(t => `<tr><td>${fmtDateNum(t.date)}</td><td>${esc(t.note)}</td><td>${cat(t.categoryId).emoji} ${esc(cat(t.categoryId).name)}</td><td class="r ${t.type === 'income' ? 'pos' : ''}">${t.type === 'income' ? '' : '−'}${kr(t.amount)}</td></tr>`).join('')}</tbody></table></div>
        <p class="small muted">${list.length} gyldige posteringer${dupes ? ` · ${dupes} findes allerede og springes over` : ''}.</p>`;
    };
    ['#mDate', '#mText', '#mAmt', '#mHead'].forEach(s => $(s, sheet).addEventListener('change', preview));
    preview();
    $('#mImport', sheet).onclick = () => {
      const list = build().filter(n => !S.transactions.some(t => t.date === n.date && Math.abs(t.amount - n.amount) < .005 && t.type === n.type && (t.note || '') === n.note));
      if (!list.length) { toast('Ingen nye posteringer at importere'); return; }
      S.transactions.push(...list); save(); closeSheet();
      selMonth = list.map(t => t.date.slice(0, 7)).sort().pop(); location.hash = '#/posteringer'; render();
      toast(`${list.length} posteringer importeret ✓`);
    };
  });
}

/* ---------- Eksempeldata ---------- */
function loadExample() {
  let seed = 42; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const between = (a, b) => Math.round((a + rnd() * (b - a)) / 5) * 5 + (rnd() < .5 ? .95 : 0) * (rnd() < .5 ? 1 : 0);
  const now = curMonth(), start = addMonths(now, -11), today = todayISO();
  const fresh = freshState(); fresh.settings = { ...S.settings };
  S = fresh;
  const budgets = { 'c-mad': 3500, 'c-ude': 1200, 'c-shopping': 1500, 'c-fritid': 1000, 'c-transport': 900, 'c-sundhed': 600 };
  S.categories.forEach(c => { if (budgets[c.id]) c.budget = budgets[c.id]; });
  const rec = (name, type, amount, categoryId, day, kind = 'fast', extra = {}) => S.recurring.push({ id: uid(), name, type, amount, categoryId, day, kind, startMonth: start, skipped: [], example: true, ...extra });
  rec('Løn – fysioterapeut', 'income', 27480, 'c-lon', 31);
  rec('Husleje', 'expense', 8450, 'c-bolig', 1);
  rec('El a conto', 'expense', 585, 'c-el', 1);
  rec('Indboforsikring', 'expense', 129, 'c-forsikring', 1);
  rec('Ulykkesforsikring', 'expense', 164, 'c-forsikring', 1);
  rec('A-kasse & Danske Fysioterapeuter', 'expense', 812, 'c-fag', 1);
  rec('Mobil – Telenor', 'expense', 179, 'c-telefon', 5);
  rec('Internet – Hiper', 'expense', 299, 'c-telefon', 5);
  rec('Netflix', 'expense', 129, 'c-abonnement', 8, 'abonnement');
  rec('Spotify Premium', 'expense', 109, 'c-abonnement', 12, 'abonnement');
  rec('Viaplay', 'expense', 449, 'c-abonnement', 15, 'abonnement', { considerCancel: true });
  rec('HBO Max', 'expense', 99, 'c-abonnement', 20, 'abonnement', { considerCancel: true });
  rec('Fitness World', 'expense', 299, 'c-sundhed', 1, 'abonnement');
  rec('Storytel', 'expense', 169, 'c-abonnement', 22, 'abonnement');
  applyRecurring();
  const add = (date, type, amount, categoryId, note) => { if (date <= today) S.transactions.push({ id: uid(), date, type, amount: Math.round(amount * 100) / 100, categoryId, note, example: true }); };
  const shops = ['Netto', 'Føtex', 'Rema 1000', 'Lidl', 'Meny', 'Coop 365'];
  const eat = ['Joe & the Juice', 'Wolt – sushi', 'Café Norden', 'Kebabhuset', 'Restaurant Mother', 'Espresso House'];
  const shopping = ['Zalando', 'H&M', 'Sport 24', 'Matas', 'IKEA', 'Elgiganten'];
  const fun = ['Nordisk Film Biografer', 'Koncert – Royal Arena', 'Tivoli', 'Padel med vennerne', 'Bowling'];
  const clients = ['Mette', 'Jonas', 'Louise', 'Kasper', 'Sofie', 'Anders', 'Camilla'];
  for (let m = start, i = 0; m <= now; m = addMonths(m, 1), i++) {
    const D = dim(m), d = n => `${m}-${pad(Math.min(D, n))}`;
    const sessions = 3 + Math.floor(rnd() * 6);
    for (let k = 0; k < sessions; k++) add(d(2 + Math.floor(rnd() * 26)), 'income', [500, 550, 600, 1800, 650][Math.floor(rnd() * 5)], 'c-pt', `PT – ${clients[Math.floor(rnd() * clients.length)]} (MobilePay)`);
    const groc = 9 + Math.floor(rnd() * 5);
    for (let k = 0; k < groc; k++) add(d(1 + Math.floor(rnd() * D)), 'expense', between(120, 520), 'c-mad', shops[Math.floor(rnd() * shops.length)]);
    const out = 3 + Math.floor(rnd() * 5);
    for (let k = 0; k < out; k++) add(d(1 + Math.floor(rnd() * D)), 'expense', between(65, 420), 'c-ude', eat[Math.floor(rnd() * eat.length)]);
    for (let k = 0; k < 2 + Math.floor(rnd() * 3); k++) add(d(1 + Math.floor(rnd() * D)), 'expense', between(40, 260), 'c-transport', ['Rejsekort', 'DSB', 'Bycyklen', 'Cykelreparation'][Math.floor(rnd() * 4)]);
    for (let k = 0; k < 1 + Math.floor(rnd() * 3); k++) add(d(1 + Math.floor(rnd() * D)), 'expense', between(180, 950), 'c-shopping', shopping[Math.floor(rnd() * shopping.length)]);
    for (let k = 0; k < Math.floor(rnd() * 3); k++) add(d(1 + Math.floor(rnd() * D)), 'expense', between(120, 650), 'c-fritid', fun[Math.floor(rnd() * fun.length)]);
    if (rnd() < .4) add(d(10 + Math.floor(rnd() * 15)), 'expense', between(90, 450), 'c-sundhed', ['Apotek', 'Tandlæge', 'Løbesko-rens'][Math.floor(rnd() * 3)]);
    if (i === 4) add(d(15), 'income', 4250, 'c-indt-andet', 'Feriepenge (ferietillæg)');
    if (i === 7) add(d(20), 'expense', 6800, 'c-fritid', 'Sommerferie – fly & hotel');
    if (i === 9) add(d(3), 'income', 1200, 'c-indt-andet', 'Salg på DBA');
  }
  const contrib = (amount, monthsBack, from = 0) => Array.from({ length: monthsBack - from }, (_, k) => ({ id: uid(), date: `${addMonths(now, -(monthsBack - 1 - k) + 0)}-02`, amount })).filter(c => c.date <= today);
  S.goals = [
    { id: uid(), name: 'Bufferkonto', emoji: '🛟', color: '#22d39a', target: 30000, deadline: `${addMonths(now, 8)}-01`, example: true, contributions: [{ id: uid(), date: `${start}-02`, amount: 6000, note: 'Startbeløb', initial: true }, ...contrib(1500, 10)] },
    { id: uid(), name: 'Japan-rejse 2027', emoji: '✈️', color: '#7c5cff', target: 25000, deadline: `${addMonths(now, 11)}-15`, example: true, contributions: contrib(1250, 7) },
    { id: uid(), name: 'Ny racercykel', emoji: '🚴', color: '#ffb547', target: 14000, deadline: `${addMonths(now, 4)}-01`, example: true, contributions: contrib(600, 5) }
  ];
  S.isExample = true; selMonth = now; save(); render(); toast('Eksempeldata indlæst 🧪');
}
function clearExample() {
  if (!confirm('Fjern alle eksempeldata? Dine egne posteringer bevares.')) return;
  S.transactions = S.transactions.filter(t => !t.example);
  S.recurring = S.recurring.filter(r => !r.example);
  S.goals = S.goals.filter(g => !g.example);
  S.categories.forEach(c => { const d = DEFAULT_CATEGORIES.find(x => x.id === c.id); if (d) c.budget = null; });
  S.isExample = false; save(); render(); toast('Eksempeldata fjernet');
}

/* ---------- Hændelser ---------- */
const actions = {
  'add-tx': () => openTxModal(),
  'quick-add': () => openQuickAdd(),
  'edit-tx': el => { const t = S.transactions.find(x => x.id === el.dataset.id); t && openTxModal(t); },
  'add-rec': () => openRecModal(),
  'edit-rec': el => { const r = S.recurring.find(x => x.id === el.dataset.id); if (r) { closeSheet(); openRecModal(r); } },
  'toggle-cancel': el => { const r = S.recurring.find(x => x.id === el.dataset.id); if (r) { r.considerCancel = !r.considerCancel; save(); render(); toast(r.considerCancel ? `✂️ ${r.name} markeret – sparer ${kr(r.amount * 12, false)}/år` : 'Markering fjernet'); } },
  'reactivate-rec': el => { const r = S.recurring.find(x => x.id === el.dataset.id); if (r) { delete r.endMonth; applyRecurring(); save(); render(); } },
  'add-goal': () => openGoalModal(),
  'edit-goal': el => openGoalModal(S.goals.find(g => g.id === el.dataset.id)),
  'contribute': el => openContribute(S.goals.find(g => g.id === el.dataset.id)),
  'edit-budgets': () => openBudgetModal(),
  'add-cat': el => openCatModal(null, el.dataset.type),
  'edit-cat': el => openCatModal(cat(el.dataset.id)),
  'prev-month': () => { selMonth = addMonths(selMonth, -1); render(); },
  'next-month': () => { selMonth = addMonths(selMonth, 1); render(); },
  'toggle-theme': () => setTheme(S.settings.theme === 'dark' ? 'light' : 'dark'),
  'close': () => closeSheet(),
  'load-example': () => { if ((S.transactions.some(t => !t.example) || S.goals.some(g => !g.example)) && !confirm('Eksempeldata erstatter dine nuværende data. Tag evt. en backup først. Fortsæt?')) return; loadExample(); },
  'clear-example': () => clearExample(),
  'reset': () => { if (!confirm('Nulstil ALT? Alle posteringer, mål og kategorier slettes fra denne enhed.')) return; const th = S.settings.theme; S = freshState(); S.settings.theme = th; save(); selMonth = curMonth(); location.hash = '#/overblik'; render(); toast('Appen er nulstillet'); },
  'export-json': () => download(`okonomi-backup-${todayISO()}.json`, JSON.stringify(S, null, 2), 'application/json'),
  'import-json': () => $('#jsonFile').click(),
  'export-csv-all': () => download(`posteringer-${todayISO()}.csv`, toCSV(S.transactions), 'text/csv;charset=utf-8'),
  'export-csv-month': () => download(`posteringer-${selMonth}.csv`, toCSV(stats(selMonth).tx), 'text/csv;charset=utf-8'),
  'import-csv': () => $('#csvFile').click()
};
document.addEventListener('click', e => {
  if (e.target.matches('[data-close-overlay]')) { closeSheet(); return; }
  const el = e.target.closest('[data-action]'); if (!el) return;
  const a = actions[el.dataset.action]; if (!a) return;
  if (el.tagName === 'A') e.preventDefault();
  a(el);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
document.addEventListener('input', e => {
  if (e.target.id === 'txSearch') { txFilter.q = e.target.value; clearTimeout(window._sq); window._sq = setTimeout(render, 220); }
  if (e.target.id === 'ptRate' || e.target.id === 'ptRateNum') { const v = Math.max(0, Math.min(100, Number(e.target.value) || 0)); S.settings.ptTaxRate = v; save(); clearTimeout(window._pr); window._pr = setTimeout(render, e.target.id === 'ptRate' ? 120 : 500); }
  if (e.target.id === 'nameInput') { S.settings.name = e.target.value.trim() || 'Simon'; save(); }
});
document.addEventListener('change', async e => {
  const id = e.target.id;
  if (id === 'txType') { txFilter.type = e.target.value; render(); }
  if (id === 'txCat') { txFilter.cat = e.target.value; render(); }
  if (id === 'subSort') { S.settings.subSort = e.target.value; save(); render(); }
  if (id === 'darkToggle') setTheme(e.target.checked ? 'dark' : 'light');
  if (id === 'nameInput') render();
  if (id === 'csvFile' && e.target.files[0]) { await openCsvImport(e.target.files[0]); e.target.value = ''; }
  if (id === 'jsonFile' && e.target.files[0]) {
    try {
      const data = JSON.parse(await readFile(e.target.files[0]));
      if (!Array.isArray(data.categories) || !Array.isArray(data.transactions)) throw new Error('format');
      if (!confirm(`Gendan backup med ${data.transactions.length} posteringer? Dine nuværende data bliver erstattet.`)) return;
      localStorage.setItem(KEY, JSON.stringify(data)); load(); applyRecurring(); setTheme(S.settings.theme); toast('Backup gendannet ✓');
    } catch (err) { toast('Filen er ikke en gyldig backup'); }
    e.target.value = '';
  }
});
function setTheme(t) {
  S.settings.theme = t; document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]').setAttribute('content', t === 'dark' ? '#0b0d17' : '#f4f5fb');
  save(); render();
}
window.addEventListener('hashchange', render);

/* ---------- Start ---------- */
load();
document.documentElement.dataset.theme = S.settings.theme;
document.querySelector('meta[name="theme-color"]').setAttribute('content', S.settings.theme === 'dark' ? '#0b0d17' : '#f4f5fb');
applyRecurring();
render();
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
