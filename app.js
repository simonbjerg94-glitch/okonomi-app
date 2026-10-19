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
  { id: 'c-udlejning', name: 'Udlejning', emoji: '🏡', color: '#ff6b8b', type: 'income' },
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
const JOB_KINDS = { ansat: 'Lønansættelse', selvstaendig: 'Selvstændig / freelance', udlejning: 'Udlejning / sideindkomst' };
const DEFAULT_JOBS = [
  { id: 'job-artrose', name: 'Artrose Fys', emoji: '🩺', color: '#22d39a', kind: 'ansat', role: 'Fysioterapeut', categoryId: 'c-lon', taxRate: null },
  { id: 'job-pt', name: 'Personlig træning', emoji: '🏋️', color: '#00c2ff', kind: 'selvstaendig', role: 'Privat personlig træner', categoryId: 'c-pt', taxRate: 40 },
  { id: 'job-handicap', name: 'Handicapformidlingen', emoji: '♿', color: '#a78bfa', kind: 'ansat', role: 'Lønansættelse', categoryId: 'c-lon', taxRate: null },
  { id: 'job-airbnb', name: 'Airbnb', emoji: '🏡', color: '#ff6b8b', kind: 'udlejning', role: 'Udlejning af bolig', categoryId: 'c-udlejning', taxRate: 40 }
];
const clone = o => JSON.parse(JSON.stringify(o));
const freshState = () => ({
  version: 4,
  rules: [], networth: { items: [] },
  jobs: clone(DEFAULT_JOBS),
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
  if (migrate()) save();
}
/* Migrering af ældre data (v1 -> v2: jobs). Sletter aldrig noget. */
function migrate() {
  let changed = false;
  if (!S.categories.some(c => c.id === 'c-udlejning')) {
    const i = S.categories.findIndex(c => c.id === 'c-indt-andet');
    S.categories.splice(i >= 0 ? i : S.categories.length, 0, clone(DEFAULT_CATEGORIES.find(c => c.id === 'c-udlejning')));
    changed = true;
  }
  if (!Array.isArray(S.jobs)) {
    S.jobs = clone(DEFAULT_JOBS);
    const pt = S.jobs.find(j => j.id === 'job-pt');
    if (S.settings.ptTaxRate != null && !isNaN(Number(S.settings.ptTaxRate))) pt.taxRate = Number(S.settings.ptTaxRate);
    const ptCats = S.categories.filter(c => c.isPT || c.id === 'c-pt').map(c => c.id);
    for (const t of [...S.transactions, ...S.recurring]) {
      if (t.type !== 'income' || t.jobId) continue;
      if (t.categoryId === 'c-lon') t.jobId = 'job-artrose';
      else if (ptCats.includes(t.categoryId)) t.jobId = 'job-pt';
    }
    changed = true;
  }
  if (!Array.isArray(S.rules)) { S.rules = []; changed = true; }
  if (!S.networth || !Array.isArray(S.networth.items)) { S.networth = { items: [] }; changed = true; }
  if (S.version !== 4) { S.version = 4; changed = true; }
  return changed;
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
      S.transactions.push({ id: uid(), type: r.type, amount: r.amount, date: `${m}-${pad(Math.min(r.day || 1, dim(m)))}`, categoryId: r.categoryId, note: r.name, recurringId: r.id, example: !!r.example, ...(r.type === 'income' && r.jobId ? { jobId: r.jobId } : {}) });
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
const job = id => (S.jobs || []).find(j => j.id === id);
const hasReserve = j => !!j && j.kind !== 'ansat';
const jobRate = j => hasReserve(j) ? (Number(j.taxRate) || 0) : 0;
const jobIncome = (jobId, key) => sum(S.transactions.filter(t => t.type === 'income' && t.date.startsWith(key) && (jobId === 'none' ? !job(t.jobId) : t.jobId === jobId)).map(t => t.amount));
const reserveFor = key => sum(S.jobs.filter(hasReserve).map(j => jobIncome(j.id, key) * jobRate(j) / 100));
function jobForCategory(catId, text = '') {
  const low = text.toLowerCase();
  const byName = S.jobs.find(j => low && low.includes(j.name.toLowerCase().split(' ')[0]));
  if (byName) return byName.id;
  const last = S.transactions.filter(t => t.type === 'income' && t.categoryId === catId && job(t.jobId)).sort((a, b) => b.date.localeCompare(a.date))[0];
  return last ? last.jobId : (S.jobs.find(j => j.categoryId === catId)?.id || '');
}
const goalSaved = g => sum((g.contributions || []).map(c => c.amount));

/* ---------- UI-state ---------- */
let selMonth = curMonth();
const charts = [];
const ROUTES = {
  overblik: { title: 'Overblik', ico: '📊', render: renderOverblik, month: true },
  posteringer: { title: 'Posteringer', ico: '🧾', render: renderPosteringer, month: true },
  budget: { title: 'Budget', ico: '🎯', render: renderBudget, month: true },
  maal: { title: 'Opsparingsmål', short: 'Mål', ico: '🏆', render: renderMaal },
  formue: { title: 'Nettoformue', ico: '💎', render: renderFormue },
  jobs: { title: 'Mine jobs', ico: '💼', render: renderJobs, month: true },
  aarsoversigt: { title: 'Årsoversigt til skat', ico: '📑', render: renderAarsoversigt },
  abonnementer: { title: 'Abonnementsjæger', ico: '✂️', render: renderAbonnementer },
  sparetips: { title: 'Sparetips', ico: '💡', render: renderSparetips },
  skole: { title: 'Økonomiskolen', ico: '🎓', render: renderSkole },
  renter: { title: 'Renters rente', ico: '🧮', render: renderRenter },
  hvadnu: { title: 'Hvad nu hvis', ico: '🔮', render: renderHvadnu },
  indstillinger: { title: 'Indstillinger', ico: '⚙️', render: renderIndstillinger },
  mere: { title: 'Mere', ico: '☰', render: renderMere, hidden: true }
};
const routeParts = () => (location.hash.replace(/^#\/?/, '') || 'overblik').split('?')[0].split('/');
const route = () => { const r = routeParts()[0]; if (r === 'pt') return 'jobs'; return ROUTES[r] ? r : 'overblik'; };
const jobTab = () => { const p = routeParts(); if (p[0] === 'pt') return job('job-pt') ? 'job-pt' : 'samlet'; return p[1] && job(p[1]) ? p[1] : 'samlet'; };

function renderNav() {
  const r = route();
  $('#sideNav').innerHTML = Object.entries(ROUTES).filter(([, v]) => !v.hidden).map(([k, v]) =>
    `<a class="nav-link ${k === r ? 'active' : ''}" href="#/${k}"><span class="ico">${v.ico}</span>${v.title}</a>`).join('');
  const moreActive = ['budget', 'jobs', 'aarsoversigt', 'formue', 'abonnementer', 'sparetips', 'skole', 'renter', 'hvadnu', 'indstillinger', 'mere'].includes(r);
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
  $('#monthLabel').textContent = monthLabel(selMonth);
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
const nf1 = new Intl.NumberFormat('da-DK', { maximumFractionDigits: 1 });
const tickKr = v => Math.abs(v) >= 1000 ? nf1.format(v / 1000) + 't' : nf0.format(v);
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
  const jl = S.jobs.map(j => [j, jobIncome(j.id, key)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (jl.length) {
    const tot = sum(jl.map(x => x[1]));
    let t = `Fra dine ${jl.length > 1 ? jl.length + ' jobs' : 'job'}: ${jl.map(([j, v]) => `${j.emoji} ${esc(j.name)} ${kr(v, false)}${jl.length > 1 ? ` (${pct(v / tot * 100)})` : ''}`).join(', ').replace(/, ([^,]*)$/, ' og $1')}.`;
    const res = reserveFor(key);
    if (res > 0) t += ` Med dine egne satser bør du overveje at sætte ca. ${kr(res, false)} til side til skat af selvstændig- og udlejningsindtægt.`;
    out.push(t);
  }
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
  return `${importReminderHTML()}
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
  ${dagensRaadCard()}

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

/* ---------- Visning: Mine jobs (samlet + pr. job) ---------- */
function jobChipsHTML(sel) {
  return `<div class="chips" data-chips="job">${S.jobs.map(j => `<button type="button" class="chip ${j.id === sel ? 'on' : ''}" data-val="${j.id}">${j.emoji} ${esc(j.name)}</button>`).join('')}<button type="button" class="chip ${!sel || !job(sel) ? 'on' : ''}" data-val="">Intet job</button></div>`;
}
const kindPill = j => `<span class="pill ${j.kind === 'ansat' ? '' : 'accent'}">${JOB_KINDS[j.kind] || j.kind}</span>`;
const yearKeys = year => Array.from({ length: 12 }, (_, i) => `${year}-${pad(i + 1)}`);
function renderJobs() {
  const tab = jobTab();
  const tabs = `<div class="tabs">${[['samlet', '📊', 'Samlet'], ...S.jobs.map(j => [j.id, j.emoji, j.name])].map(([id, e, n]) =>
    `<a class="chip ${tab === id ? 'on' : ''}" href="#/jobs${id === 'samlet' ? '' : '/' + id}">${e} ${esc(n)}</a>`).join('')}<button type="button" class="chip" data-action="add-job">＋ Nyt job</button></div>`;
  if (!S.jobs.length) return tabs + `<div class="card empty"><div class="emoji">💼</div><h2>Ingen jobs endnu</h2><p>Opret dine jobs, så kan du se indtægten fra hvert job og samlet.</p><button class="btn btn-primary" data-action="add-job">＋ Opret job</button></div>`;
  return tabs + (tab === 'samlet' ? renderJobsSamlet() : renderJobDetail(job(tab)));
}
const reserveNote = `<div class="disclaimer">ℹ️ Skattereserven er et <strong>estimat ud fra de procentsatser, du selv har sat</strong> for dine selvstændige jobs og din udlejning – ikke skatterådgivning. Din faktiske skat afhænger af bl.a. kommuneskat, fradrag, bundfradrag ved udlejning og topskat. Tjek din forskudsopgørelse på skat.dk eller spørg en revisor.</div>`;
function renderJobsSamlet() {
  const year = selMonth.slice(0, 4), upto = Number(selMonth.slice(5)), mName = MONTHS[upto - 1];
  const yKeys = yearKeys(year);
  const last12 = Array.from({ length: 12 }, (_, i) => addMonths(selMonth, i - 11));
  const rows = S.jobs.map(j => { const vals = yKeys.map(k => jobIncome(j.id, k)); return { j, vals, y: sum(vals), m: jobIncome(j.id, selMonth) }; });
  const totalY = sum(rows.map(r => r.y)), totalM = sum(rows.map(r => r.m));
  const prevM = sum(S.jobs.map(j => jobIncome(j.id, addMonths(selMonth, -1))));
  const toDate = sum(rows.map(r => sum(r.vals.slice(0, upto))));
  const monthsWith = yKeys.slice(0, upto).filter(k => S.jobs.some(j => jobIncome(j.id, k) > 0)).length;
  const reserveY = sum(rows.filter(r => hasReserve(r.j)).map(r => r.y * jobRate(r.j) / 100));
  const reserveM = reserveFor(selMonth);
  const noneY = sum(yKeys.map(k => jobIncome('none', k)));
  const withY = rows.filter(r => r.y > 0).sort((a, b) => b.y - a.y);
  afterRender.jobs = () => {
    mkChart('chJobsBar', {
      type: 'bar',
      data: { labels: last12.map(monthShort), datasets: S.jobs.map(j => ({ label: j.name, data: last12.map(k => jobIncome(j.id, k)), backgroundColor: j.color, borderRadius: 4, stack: 's', maxBarThickness: 26 })) },
      options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 14 } } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { callback: tickKr } } } }
    });
    if (withY.length) mkChart('chJobsDough', {
      type: 'doughnut', plugins: [centerText],
      data: { labels: withY.map(r => r.j.name), datasets: [{ data: withY.map(r => r.y), backgroundColor: withY.map(r => r.j.color), borderWidth: 0, spacing: 2, borderRadius: 6, hoverOffset: 8 }] },
      options: { maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false }, centerText: { title: kr(totalY, false), sub: year }, tooltip: { callbacks: { label: c => ` ${kr(c.parsed)} (${pct(c.parsed / totalY * 100)})` } } } }
    });
  };
  return `
  <div class="grid kpis">
    <div class="card kpi hero"><div class="label">Samlet indtægt fra jobs · ${year}</div><div class="value">${kr(totalY, false)}</div><div class="sub">${S.jobs.length} jobs · ${kr(totalM, false)} i ${mName}</div></div>
    <div class="card kpi"><div class="label">💼 ${mName[0].toUpperCase() + mName.slice(1)} i alt</div><div class="value">${kr(totalM, false)}</div><div class="sub">${deltaPill(totalM, prevM)} vs. sidste md.</div></div>
    <div class="card kpi"><div class="label">📅 Gns. pr. måned</div><div class="value">${kr(monthsWith ? toDate / monthsWith : 0, false)}</div><div class="sub">${monthsWith} måneder i ${year}</div></div>
    <div class="card kpi"><div class="label">🏦 Skattereserve i alt</div><div class="value warn">${kr(reserveY, false)}</div><div class="sub">${kr(reserveM, false)} i ${mName} · egne satser</div></div>
  </div>
  <div class="grid cols-2-1 section">
    <div class="card"><h2>Indtægt pr. job <small>seneste 12 måneder</small></h2><div class="chart-box tall"><canvas id="chJobsBar"></canvas></div></div>
    <div class="card"><h2>Fordeling <small>${year}</small></h2>
      ${withY.length ? `<div class="chart-box small"><canvas id="chJobsDough"></canvas></div>
      <div class="list" style="margin-top:8px">${withY.map(r => `<div class="row"><span style="width:10px;height:10px;border-radius:50%;background:${r.j.color};flex-shrink:0"></span><div class="main-col"><div class="title" style="font-size:13.5px">${r.j.emoji} ${esc(r.j.name)}</div></div><div class="amt" style="font-size:13.5px">${pct(r.y / totalY * 100)}</div></div>`).join('')}</div>` : `<p class="muted">Ingen jobindtægter i ${year} endnu.</p>`}
    </div>
  </div>
  <div class="grid jobs-grid section">${rows.map(r => `
    <a class="card job-card" href="#/jobs/${r.j.id}">
      <div class="goal-head"><div class="avatar" style="background:${r.j.color}26">${r.j.emoji}</div>
        <div class="main-col" style="min-width:0"><div class="title" style="font-weight:650">${esc(r.j.name)}</div><div style="margin-top:3px">${kindPill(r.j)}</div></div><span class="muted">›</span></div>
      <div class="big" style="margin-top:12px">${kr(r.y, false)} <span class="muted" style="font-size:13px;font-weight:500">i ${year}</span></div>
      <div class="progress" style="height:6px"><span style="width:${totalY ? r.y / totalY * 100 : 0}%;background:${r.j.color}"></span></div>
      <div class="goal-stats">
        <div class="stat"><div class="l">${mName}</div><div class="v">${kr(r.m, false)}</div></div>
        <div class="stat"><div class="l">${hasReserve(r.j) ? `Reserve (${jobRate(r.j)} %)` : 'Andel'}</div><div class="v ${hasReserve(r.j) ? 'warn' : ''}">${hasReserve(r.j) ? kr(r.y * jobRate(r.j) / 100, false) : pct(totalY ? r.y / totalY * 100 : 0)}</div></div>
      </div>
    </a>`).join('')}</div>
  <div class="card section"><h2>Måned for måned <small>${year}</small></h2><div class="scroll-x"><table class="tbl">
    <thead><tr><th>Måned</th>${S.jobs.map(j => `<th class="r" title="${esc(j.name)}">${j.emoji} ${esc(j.name)}</th>`).join('')}<th class="r">I alt</th><th class="r">Reserve</th></tr></thead>
    <tbody>${yKeys.map((k, i) => { const t = sum(rows.map(r => r.vals[i])); return `<tr${k === selMonth ? ' style="font-weight:700"' : ''}><td style="text-transform:capitalize">${MONTHS[i]}</td>${rows.map(r => `<td class="r">${r.vals[i] ? kr(r.vals[i], false) : '–'}</td>`).join('')}<td class="r">${t ? kr(t, false) : '–'}</td><td class="r">${reserveFor(k) ? kr(reserveFor(k), false) : '–'}</td></tr>`; }).join('')}
    <tr style="font-weight:700"><td>I alt</td>${rows.map(r => `<td class="r">${kr(r.y, false)}</td>`).join('')}<td class="r">${kr(totalY, false)}</td><td class="r">${kr(reserveY, false)}</td></tr></tbody></table></div></div>
  ${noneY > 0 ? `<p class="muted small" style="margin:12px 4px">＋ ${kr(noneY, false)} anden indtægt i ${year} uden tilknyttet job (fx salg eller gaver) – ikke med i tallene ovenfor.</p>` : ''}
  <div class="section">${reserveNote}</div>`;
}
function renderJobDetail(j) {
  const year = selMonth.slice(0, 4), upto = Number(selMonth.slice(5)), mName = MONTHS[upto - 1];
  const res = hasReserve(j), rate = jobRate(j);
  const keys = yearKeys(year);
  const vals = keys.map(k => jobIncome(j.id, k));
  const prevVals = Array.from({ length: upto }, (_, i) => jobIncome(j.id, `${Number(year) - 1}-${pad(i + 1)}`));
  const prevYear = prevVals.filter(v => v > 0).length >= Math.ceil(upto / 2) ? sum(prevVals) : 0;
  const ytd = sum(vals), ytdUpto = sum(vals.slice(0, upto)), thisM = jobIncome(j.id, selMonth);
  const activeMonths = vals.filter(v => v > 0).length;
  const payments = S.transactions.filter(t => t.type === 'income' && t.jobId === j.id && t.date.startsWith(year)).length;
  const best = vals.reduce((bi, v, i) => v > vals[bi] ? i : bi, 0);
  const allTotal = sum(S.jobs.map(x => sum(keys.map(k => jobIncome(x.id, k)))));
  afterRender.jobs = () => mkChart('chJob', {
    type: 'bar',
    data: { labels: MSHORT, datasets: res ? [
      { label: 'Til dig', data: vals.map(v => v * (1 - rate / 100)), backgroundColor: j.color, borderRadius: 6, stack: 's', maxBarThickness: 26 },
      { label: 'Skattereserve', data: vals.map(v => v * rate / 100), backgroundColor: '#7c5cff88', borderRadius: 6, stack: 's', maxBarThickness: 26 }
    ] : [{ label: 'Indtægt', data: vals, backgroundColor: j.color, borderRadius: 6, maxBarThickness: 26 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: res, position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8 } } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { callback: tickKr } } } }
  });
  const recent = S.transactions.filter(t => t.type === 'income' && t.jobId === j.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  return `
  <div class="grid kpis">
    <div class="card kpi hero" style="background:linear-gradient(135deg, ${j.color}, #7c5cff)"><div class="label">${j.emoji} ${esc(j.name)} · ${year}</div><div class="value">${kr(ytd, false)}</div><div class="sub">${prevYear ? `${deltaPill(ytdUpto, prevYear)} vs. samme periode ${Number(year) - 1}` : `${payments} betalinger · ${activeMonths} måneder med indtægt`}</div></div>
    <div class="card kpi"><div class="label">${mName[0].toUpperCase() + mName.slice(1)}</div><div class="value">${kr(thisM, false)}</div><div class="sub">${res ? `reservér ${kr(thisM * rate / 100, false)}` : `${pct(allTotal ? ytd / allTotal * 100 : 0)} af alle jobs i ${year}`}</div></div>
    ${res ? `<div class="card kpi"><div class="label">🏦 Sæt til side (${rate} %)</div><div class="value warn">${kr(ytd * rate / 100, false)}</div><div class="sub">for hele ${year}</div></div>`
      : `<div class="card kpi"><div class="label">🏆 Bedste måned</div><div class="value">${ytd ? kr(vals[best], false) : '–'}</div><div class="sub">${ytd ? MONTHS[best] : 'ingen data endnu'}</div></div>`}
    <div class="card kpi"><div class="label">Gns. pr. aktiv md.</div><div class="value">${kr(activeMonths ? ytd / activeMonths : 0, false)}</div><div class="sub">${res ? `${kr(ytd * (1 - rate / 100), false)} efter reserve` : `${activeMonths} måneder i ${year}`}</div></div>
  </div>
  <div class="grid cols-2 section">
    <div class="card"><h2>Indtægt pr. måned <small>${year}</small></h2><div class="chart-box tall"><canvas id="chJob"></canvas></div></div>
    <div class="card">
      ${res ? `<h2>Din skattereserve <button class="btn btn-sm" data-action="edit-job" data-id="${j.id}">✏️ Rediger job</button></h2>
      <div class="field"><label for="jobRate">Procentsats, du selv vælger at sætte til side</label>
        <div style="display:flex;gap:12px;align-items:center"><input type="range" id="jobRate" data-id="${j.id}" min="0" max="60" step="1" value="${rate}" style="flex:1;accent-color:#7c5cff"><input class="input" id="jobRateNum" data-id="${j.id}" type="number" min="0" max="100" value="${rate}" style="width:84px;text-align:center"><span>%</span></div></div>
      ${reserveNote}
      <div class="list" style="margin-top:12px">
        <div class="row"><div class="main-col"><div class="title">Indtægt i ${year}</div></div><div class="amt">${kr(ytd)}</div></div>
        <div class="row"><div class="main-col"><div class="title">Reserve (${rate} %)</div></div><div class="amt warn">−${kr(ytd * rate / 100)}</div></div>
        <div class="row"><div class="main-col"><div class="title">Til dig efter reserve</div></div><div class="amt pos">${kr(ytd * (1 - rate / 100))}</div></div>
      </div>` : `<h2>Om jobbet <button class="btn btn-sm" data-action="edit-job" data-id="${j.id}">✏️ Rediger job</button></h2>
      <div class="list">
        <div class="row"><div class="main-col"><div class="title">Type</div></div><div class="amt">${kindPill(j)}</div></div>
        ${j.role ? `<div class="row"><div class="main-col"><div class="title">Rolle</div></div><div class="amt">${esc(j.role)}</div></div>` : ''}
        <div class="row"><div class="main-col"><div class="title">Kategori</div></div><div class="amt">${cat(j.categoryId).emoji} ${esc(cat(j.categoryId).name)}</div></div>
        <div class="row"><div class="main-col"><div class="title">Udbetalinger i ${year}</div></div><div class="amt">${payments}</div></div>
      </div>
      <p class="muted small">Lønindkomst er normalt allerede beskattet via dit skattekort (A-skat), så der beregnes ingen reserve for dette job.</p>`}
      ${recent.length ? `<h3 style="margin:16px 0 4px;font-size:14px">Seneste indbetalinger</h3><div class="list">${recent.map(txRow).join('')}</div>` : ''}
    </div>
  </div>
  <div class="card section"><h2>Måned for måned <small>${year}</small></h2><div class="scroll-x"><table class="tbl">
    <thead><tr><th>Måned</th><th class="r">Indtægt</th>${res ? '<th class="r">Reserve</th><th class="r">Til dig</th>' : ''}</tr></thead>
    <tbody>${keys.map((k, i) => `<tr${k === selMonth ? ' style="font-weight:700"' : ''}><td style="text-transform:capitalize">${MONTHS[i]}</td><td class="r">${vals[i] ? kr(vals[i]) : '–'}</td>${res ? `<td class="r">${vals[i] ? kr(vals[i] * rate / 100) : '–'}</td><td class="r">${vals[i] ? kr(vals[i] * (1 - rate / 100)) : '–'}</td>` : ''}</tr>`).join('')}
    <tr style="font-weight:700"><td>I alt</td><td class="r">${kr(ytd)}</td>${res ? `<td class="r">${kr(ytd * rate / 100)}</td><td class="r">${kr(ytd * (1 - rate / 100))}</td>` : ''}</tr></tbody></table></div></div>`;
}

/* Job-formular */
const JOB_EMOJI = ['🩺', '🏋️', '♿', '🏡', '💼', '🏥', '🧑‍🏫', '🚴', '💻', '🎸', '📦', '🧾'];
function openJobModal(j) {
  const isNew = !j;
  const x = j ? { ...j } : { name: '', emoji: '💼', color: COLORS[(S.jobs.length + 2) % COLORS.length], kind: 'ansat', role: '', categoryId: 'c-lon', taxRate: 40 };
  const used = j ? S.transactions.filter(t => t.jobId === j.id).length : 0;
  openSheet(`${sheetHead(isNew ? 'Nyt job' : 'Rediger job')}
    <div class="field"><label for="jName">Navn</label><input class="input" id="jName" value="${esc(x.name)}" placeholder="Fx Artrose Fys" autofocus></div>
    <div class="field"><span class="lbl">Ikon</span><div class="chips" data-chips="jemoji">${JOB_EMOJI.map(e => `<button type="button" class="chip ${e === x.emoji ? 'on' : ''}" data-val="${e}" style="font-size:18px;padding:6px 10px">${e}</button>`).join('')}</div></div>
    <div class="field"><span class="lbl">Farve</span><div class="chips" id="jColors">${COLORS.map(col => `<span class="color-dot ${col === x.color ? 'on' : ''}" data-c="${col}" style="background:${col}"></span>`).join('')}</div></div>
    <div class="field-row">
      <div class="field"><label for="jKind">Type</label><select class="input" id="jKind">${Object.entries(JOB_KINDS).map(([k, l]) => `<option value="${k}" ${k === x.kind ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label for="jCat">Standardkategori</label><select class="input" id="jCat">${catsOf('income').map(c => `<option value="${c.id}" ${c.id === x.categoryId ? 'selected' : ''}>${c.emoji} ${esc(c.name)}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label for="jRole">Rolle / beskrivelse <span class="muted">(valgfri)</span></label><input class="input" id="jRole" value="${esc(x.role || '')}" placeholder="Fx Fysioterapeut"></div>
    <div class="field" id="jRateField" style="${x.kind === 'ansat' ? 'display:none' : ''}"><label for="jRateIn">Skattereserve i % <span class="muted">(dit eget estimat)</span></label><input class="input" id="jRateIn" type="number" min="0" max="100" value="${x.taxRate ?? 40}"></div>
    <div class="btn-row"><button class="btn btn-primary" style="flex:1" id="jSave">Gem job</button>${isNew ? '' : '<button class="btn btn-danger" id="jDel">Slet</button>'}</div>
    ${used ? `<p class="muted small">${used} indtægter er knyttet til jobbet. Sletter du det, bevares indtægterne – de bliver bare ikke knyttet til et job.</p>` : ''}`, sheet => {
    let emoji = x.emoji, color = x.color;
    bindChips(sheet, 'jemoji', v => emoji = v);
    $('#jColors', sheet).addEventListener('click', e => { const d = e.target.closest('.color-dot'); if (!d) return; color = d.dataset.c; $$('.color-dot', sheet).forEach(q => q.classList.toggle('on', q === d)); });
    $('#jKind', sheet).addEventListener('change', e => { $('#jRateField', sheet).style.display = e.target.value === 'ansat' ? 'none' : ''; });
    $('#jSave', sheet).onclick = () => {
      const name = $('#jName', sheet).value.trim(); if (!name) { toast('Giv jobbet et navn'); return; }
      const kind = $('#jKind', sheet).value;
      const data = { name, emoji, color, kind, role: $('#jRole', sheet).value.trim(), categoryId: $('#jCat', sheet).value, taxRate: kind === 'ansat' ? null : Math.max(0, Math.min(100, Number($('#jRateIn', sheet).value) || 0)) };
      let id = j?.id;
      if (isNew) { id = 'job-' + uid(); S.jobs.push({ id, ...data }); } else Object.assign(j, data);
      save(); closeSheet(); location.hash = '#/jobs/' + id; render(); toast('Job gemt ✓');
    };
    if (!isNew) $('#jDel', sheet).onclick = () => {
      if (!confirm(`Slet jobbet “${j.name}”? Indtægterne bevares.`)) return;
      S.transactions.forEach(t => { if (t.jobId === j.id) delete t.jobId; });
      S.recurring.forEach(r => { if (r.jobId === j.id) delete r.jobId; });
      S.jobs = S.jobs.filter(q => q.id !== j.id); save(); closeSheet(); location.hash = '#/jobs'; render(); toast('Job slettet');
    };
  });
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

/* ---------- Visning: Sparetips ---------- */
const TIP_CATS = { hverdag: '🛒 Hverdag', bolig: '🏠 Bolig & energi', skat: '🧾 Skat', opsparing: '🐷 Opsparing', gaeld: '💳 Gæld' };
const TIPS = [
  { id: 't-betal-selv', e: '💸', cat: 'opsparing', t: 'Betal dig selv først', b: 'Lav en fast, automatisk overførsel til opsparing samme dag som lønnen kommer – så sparer du op, før pengene bliver brugt. Selv et lille beløb hver måned vokser over tid.', links: [['#/maal', '🏆 Opsparingsmål']] },
  { id: 't-buffer', e: '🛟', cat: 'opsparing', t: 'Byg en buffer til det uventede', b: 'Hav en nødopsparing på en separat konto til fx tandlæge, bilreparation eller en periode med lavere indtægt. En udbredt tommelfingerregel er nogle måneders faste udgifter – og har du svingende indtægt, kan en større buffer give ro.', links: [['#/maal', '🏆 Opret et buffermål']] },
  { id: 't-abonnementer', e: '✂️', cat: 'hverdag', t: 'Gå dine abonnementer igennem', b: 'Streaming, apps, fitness og medlemskaber løber stille og roligt videre. Gennemgå dem et par gange om året og opsig dem, du ikke bruger – du kan altid tegne dem igen.', links: [['#/abonnementer', '✂️ Abonnementsjæger']] },
  { id: 't-forsikring', e: '🛡️', cat: 'hverdag', t: 'Sammenlign og forhandl dine forsikringer', b: 'Indhent tilbud fra flere selskaber og spørg dit nuværende selskab, om de kan give en bedre pris. Tjek også for dobbeltdækning – fx rejseforsikring, du måske allerede har via kort eller andre forsikringer.' },
  { id: 't-elpris', e: '⚡', cat: 'bolig', t: 'Flyt elforbruget til de billige timer', b: 'Har du en timeprisaftale, svinger elprisen hen over døgnet. Kør vaskemaskine, opvasker og opladning, når prisen er lav – en elpris-app eller et varsel om billige timer gør det nemt.' },
  { id: 't-skift', e: '🔁', cat: 'bolig', t: 'Skift el- og mobilabonnement', b: 'Mange betaler for et ældre abonnement, selvom der findes billigere med samme indhold. Sammenlign elaftaler på Forsyningstilsynets elpris.dk, og tjek hvor meget data du reelt bruger, før du vælger mobilabonnement.', links: [['https://elpris.dk', 'elpris.dk ↗']] },
  { id: 't-kviklaan', e: '🚫', cat: 'gaeld', t: 'Undgå kviklån og dyr kredit', b: 'Forbrugslån, kreditkort og “køb nu – betal senere” kan blive meget dyre, især hvis afdragene trækker ud. Har du allerede dyr gæld, så betal den med den højeste rente af først.' },
  { id: 't-aaop', e: '📊', cat: 'gaeld', t: 'Sammenlign lån på ÅOP og samlede omkostninger', b: 'ÅOP viser de samlede årlige omkostninger i procent – inkl. gebyrer – og gør lån nemmere at sammenligne end den pålydende rente. Se også, hvad lånet koster i alt i kroner over hele løbetiden.' },
  { id: 't-24timer', e: '⏳', cat: 'hverdag', t: 'Brug 24-timers reglen ved impulskøb', b: 'Læg varen i kurven og vent et døgn, før du køber noget, du ikke havde planlagt. Ofte er lysten væk dagen efter. Køber du online, har du som regel 14 dages fortrydelsesret – men tjek betingelserne.' },
  { id: 't-madplan', e: '🥕', cat: 'hverdag', t: 'Lav madplan og indkøbsliste', b: 'Planlæg ugens aftensmad og handl efter en liste. Det giver færre impulskøb, mindre madspild og færre dyre take away-aftener.', links: [['#/budget', '🎯 Sæt et madbudget']] },
  { id: 't-tilbud', e: '📰', cat: 'hverdag', t: 'Brug tilbudsaviser – med omtanke', b: 'Køb ind på tilbud, når det er varer, du alligevel bruger, og hamstr holdbare basisvarer. Sammenlign kiloprisen frem for pakkeprisen, og husk at et tilbud kun er en besparelse, hvis du havde brug for varen.' },
  { id: 't-fradrag', e: '🧾', cat: 'skat', t: 'Tjek, om du får alle dine fradrag', b: 'Fx kørselsfradrag til arbejde, håndværker- og servicefradrag (kun for arbejdsløn og betalt digitalt) samt fradrag for fagforening og a-kasse. Regler og satser ændrer sig – tjek skat.dk, hvad der gælder for dig.', links: [['https://skat.dk/borger/fradrag', 'Fradrag på skat.dk ↗']] },
  { id: 't-forskud', e: '📝', cat: 'skat', t: 'Hold forskudsopgørelsen opdateret', b: 'Ret forskudsopgørelsen, når din indkomst eller dine fradrag ændrer sig – fx nyt job, lønstigning eller indtægt ved siden af. Så undgår du en overraskende restskat og betaler den rigtige skat løbende.', links: [['#/jobs', '💼 Mine jobs'], ['https://skat.dk', 'skat.dk ↗']] },
  { id: 't-ask-pension', e: '📈', cat: 'opsparing', t: 'Kend aktiesparekonto og pension', b: 'En aktiesparekonto har sine egne skatteregler og et indskudsloft, og al investering indebærer risiko. Få overblik over din pension på pensionsinfo.dk – ikke for at vælge produkt her, men for at vide, hvad du har.', links: [['https://skat.dk/borger/aktier-og-andre-vaerdipapirer/aktiesparekonto', 'Aktiesparekonto ↗'], ['https://www.pensionsinfo.dk', 'PensionsInfo ↗']] },
  { id: 't-gebyrer', e: '🏦', cat: 'gaeld', t: 'Tjek gebyrerne i din bank', b: 'Gennemgå bankens prisblad og din kontoudskrift for kortgebyrer, kontogebyrer og gebyrer på overførsler eller udlandsbetalinger. Spørg banken, om der findes en billigere løsning – eller sammenlign med andre banker.' },
  { id: 't-brugt', e: '♻️', cat: 'hverdag', t: 'Køb brugt og sælg det, du ikke bruger', b: 'Møbler, tøj, børneting, sportsudstyr og elektronik kan ofte købes brugt for en brøkdel af prisen. Sælg samtidig de ting, der bare samler støv.' },
  { id: 't-del', e: '🤝', cat: 'hverdag', t: 'Lån og del ting i stedet for at købe', b: 'Boremaskine, trailer, festudstyr eller bøger: lån af naboen, familien, biblioteket eller deleordninger, når du kun skal bruge noget en gang imellem.' },
  { id: 't-kvalitet', e: '🧱', cat: 'hverdag', t: 'Køb kvalitet, der holder', b: 'Ting, du bruger hver dag – sko, værktøj, en god jakke – kan godt betale sig at købe i bedre kvalitet. Regn på prisen pr. brug frem for prisen i butikken, og husk reklamationsretten, hvis noget går i stykker for tidligt.' },
  { id: 't-maal', e: '🎯', cat: 'opsparing', t: 'Sæt konkrete mål', b: 'Et mål med beløb og dato – en rejse, en buffer, en ny cykel – gør det meget lettere at spare op end “jeg burde spare mere”. Del store mål op i et månedligt beløb.', links: [['#/maal', '🏆 Opsparingsmål']] },
  { id: 't-maaned', e: '📅', cat: 'opsparing', t: 'Gennemgå økonomien én gang om måneden', b: 'Sæt et fast tidspunkt af hver måned til at se indtægter, udgifter og budget igennem. Ti minutters overblik fanger glemte abonnementer, stigende priser og gør det nemt at justere i tide.', links: [['#/overblik', '📊 Månedens overblik'], ['#/budget', '🎯 Budget']] }
];
let tipFilter = 'alle';
afterRender.sparetips = () => { const on = $('.tips-head .chip.on'); if (on) { const t = on.parentElement; t.scrollLeft = on.getBoundingClientRect().left - t.getBoundingClientRect().left + t.scrollLeft - 12; } };
function renderSparetips() {
  const done = new Set(S.settings.tipsDone || []);
  const nDone = TIPS.filter(t => done.has(t.id)).length;
  const list = TIPS.map((t, i) => ({ ...t, n: i + 1 })).filter(t => tipFilter === 'alle' || (tipFilter === 'mangler' ? !done.has(t.id) : t.cat === tipFilter));
  const cnt = k => TIPS.filter(t => t.cat === k).length;
  const chip = (k, label, n) => `<button class="chip ${tipFilter === k ? 'on' : ''}" data-action="tip-filter" data-f="${k}">${label} <span class="muted">${n}</span></button>`;
  const link = ([href, label]) => href.startsWith('#') ? `<a class="btn btn-sm" href="${href}">${label}</a>` : `<a class="btn btn-sm btn-ghost" href="${href}" target="_blank" rel="noopener">${label}</a>`;
  return `
  <div class="card tips-head">
    <div class="tips-hero">
      <div><h2 style="margin:0">💡 20 sparetips alle burde kende</h2><p class="muted small" style="margin:4px 0 0">Enkle vaner, der virker år efter år. Sæt flueben, når du har gjort dem.</p></div>
      <div class="tips-count"><b>${nDone}</b><span>af ${TIPS.length} gjort</span></div>
    </div>
    <div class="progress"><span style="width:${nDone / TIPS.length * 100}%"></span></div>
    <div class="tabs" style="margin:14px 0 0;padding-bottom:2px">${chip('alle', 'Alle', TIPS.length)}${Object.entries(TIP_CATS).map(([k, l]) => chip(k, l, cnt(k))).join('')}${chip('mangler', '⬜ Ikke gjort', TIPS.length - nDone)}</div>
  </div>
  <div class="tips-grid">${list.map(t => `
    <article class="card tip ${done.has(t.id) ? 'done' : ''}">
      <div class="tip-top"><div class="avatar tip-emoji">${t.e}</div><div class="main-col"><span class="tip-n">Tip ${t.n}</span><h3>${t.t}</h3></div></div>
      <p>${t.b}</p>
      <div class="tip-foot">
        <span class="pill">${TIP_CATS[t.cat]}</span>${(t.links || []).map(link).join('')}
        <label class="tip-check"><input type="checkbox" data-tip="${t.id}" ${done.has(t.id) ? 'checked' : ''}><span>${done.has(t.id) ? 'Gjort ✓' : 'Marker som gjort ✓'}</span></label>
      </div>
    </article>`).join('') || '<div class="card"><p class="muted">Ingen tips her – godt gået! 🎉</p></div>'}</div>
  <p class="muted small tips-note">ℹ️ Tipsene er generelle og ikke personlig økonomisk rådgivning. Regler, satser og fradrag ændrer sig – tjek altid de aktuelle regler hos fx skat.dk, og søg rådgivning, hvis du er i tvivl om din egen situation.</p>`;
}

/* ---------- Visning: Økonomiskolen ---------- */
const lessonsRead = () => new Set(S.settings.lessonsRead || []);
const modRead = (m, rd = lessonsRead()) => m.lessons.filter(l => rd.has(l.id)).length;
function lessonOfDay(d = new Date()) {
  const n = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
  return SCHOOL_LESSONS[((n * 7) % SCHOOL_LESSONS.length + SCHOOL_LESSONS.length) % SCHOOL_LESSONS.length];
}
const lessonLink = l => `#/skole/${l.mod.id}/${l.id}`;
const skoleOpen = new Set(); let skoleScrolled = '';
document.addEventListener('toggle', e => { const d = e.target; if (d.classList && d.classList.contains('lesson')) d.open ? skoleOpen.add(d.id) : skoleOpen.delete(d.id); }, true);
function renderSkole() {
  const rd = lessonsRead(), p = routeParts();
  const total = SCHOOL_LESSONS.length, nRead = SCHOOL_LESSONS.filter(l => rd.has(l.id)).length;
  const firstOpen = SCHOOL.find(m => modRead(m, rd) < m.lessons.length) || SCHOOL[0];
  const mod = SCHOOL.find(m => m.id === p[1]) || firstOpen;
  const openId = p[2] || '';
  afterRender.skole = () => {
    const el = openId && skoleScrolled !== location.hash && document.getElementById('les-' + openId);
    skoleScrolled = location.hash;
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    const on = $('.mod-card.on'); if (on && on.parentElement.scrollWidth > on.parentElement.clientWidth) on.parentElement.scrollLeft = on.offsetLeft - 16;
  };
  const ext = ([href, label]) => `<a class="btn btn-sm btn-ghost" href="${href}" target="_blank" rel="noopener">${label} ↗</a>`;
  const idx = SCHOOL.indexOf(mod), next = SCHOOL[idx + 1];
  return `
  <div class="card tips-head">
    <div class="tips-hero">
      <div><h2 style="margin:0">🎓 Økonomiskolen</h2><p class="muted small" style="margin:4px 0 0">${total} korte lektioner om at forstå penge – det, alle burde have lært i skolen.</p></div>
      <div class="tips-count"><b>${nRead}</b><span>af ${total} læst</span></div>
    </div>
    <div class="progress"><span style="width:${nRead / total * 100}%"></span></div>
  </div>
  <div class="mod-grid">${SCHOOL.map(m => { const r = modRead(m, rd), n = m.lessons.length; return `
    <a class="card mod-card ${m === mod ? 'on' : ''} ${r === n ? 'done' : ''}" href="#/skole/${m.id}">
      <div class="mod-top"><span class="mod-emoji">${m.e}</span>${r === n ? '<span class="pill ok">✓</span>' : ''}</div>
      <strong>${m.name}</strong><span class="muted small">${r} af ${n} læst</span>
      <div class="progress thin"><span style="width:${r / n * 100}%"></span></div>
    </a>`; }).join('')}</div>
  <div class="card section mod-body">
    <div class="mod-head"><span class="mod-emoji big">${mod.e}</span><div class="main-col"><h2 style="margin:0">${mod.name}</h2><span class="muted small">${mod.desc} · ${modRead(mod, rd)} af ${mod.lessons.length} læst</span></div></div>
    <div class="lessons">${mod.lessons.map((l, i) => `
      <details class="lesson ${rd.has(l.id) ? 'read' : ''}" id="les-${l.id}" ${l.id === openId || skoleOpen.has('les-' + l.id) ? 'open' : ''}>
        <summary><span class="les-n">${rd.has(l.id) ? '✓' : i + 1}</span><span class="les-t">${l.t}</span><span class="les-chev">⌄</span></summary>
        <div class="les-body">
          <p>${l.b}</p>
          ${l.h ? `<p class="les-husk"><b>💡 Husk:</b> ${l.h}</p>` : ''}
          <div class="tip-foot">
            ${l.app ? `<a class="btn btn-sm" href="${l.app[0]}">${l.app[1]}</a>` : ''}${l.src ? ext(l.src) : ''}
            <label class="tip-check"><input type="checkbox" data-lesson="${l.id}" ${rd.has(l.id) ? 'checked' : ''}><span>${rd.has(l.id) ? 'Læst ✓' : 'Marker som læst'}</span></label>
          </div>
        </div>
      </details>`).join('')}</div>
    ${next ? `<a class="btn btn-block" style="margin-top:14px" href="#/skole/${next.id}">Næste modul: ${next.e} ${next.name} →</a>` : ''}
  </div>
  <p class="muted small tips-note">ℹ️ Økonomiskolen er generel undervisning og ikke personlig økonomisk, skattemæssig eller investeringsrådgivning. Regler og satser ændrer sig – tal med årstal er markeret med kilde og kan være forældede. Tjek altid de aktuelle regler hos fx skat.dk, borger.dk og forbrug.dk, og søg rådgivning om din egen situation.</p>`;
}
function dagensRaadCard() {
  const l = lessonOfDay();
  return `<div class="card section daily">
    <div class="daily-ico">${l.mod.e}</div>
    <div class="main-col"><span class="tag">🎓 Dagens råd · ${l.mod.name}</span><h3>${l.t}</h3><p class="muted small">${l.h || l.b.split('. ')[0] + '.'}</p></div>
    <a class="btn btn-sm" href="${lessonLink(l)}">Læs lektionen →</a>
  </div>`;
}

/* ---------- Visning: Renters rente-beregner ---------- */
const CALC_DEF = { start: 10000, monthly: 1000, ret: 6, years: 20, cost: 0.5, inc: 0, infl: 2, real: false };
const CALC_F = [
  { k: 'start', l: 'Startbeløb', u: 'kr', min: 0, max: 1000000, step: 1000 },
  { k: 'monthly', l: 'Månedlig opsparing', u: 'kr', min: 0, max: 50000, step: 100 },
  { k: 'ret', l: 'Forventet årligt afkast', u: '%', min: 0, max: 15, step: 0.1 },
  { k: 'years', l: 'Antal år', u: 'år', min: 1, max: 50, step: 1 },
  { k: 'cost', l: 'Årlige omkostninger', u: '%', min: 0, max: 3, step: 0.05, opt: true },
  { k: 'inc', l: 'Årlig stigning i månedlig opsparing', u: '%', min: 0, max: 10, step: 0.5, opt: true }
];
const calcState = () => ({ ...CALC_DEF, ...(S.settings.calc || {}) });
function compound(c, withCost = true) {
  const a = c.ret / 100, cost = withCost ? c.cost / 100 : 0;
  const net = (1 + a) * (1 - cost) - 1;            // afkast efter omkostninger pr. år
  const r = Math.pow(1 + net, 1 / 12) - 1;         // tilsvarende månedligt afkast
  let v = c.start, dep = c.start; const rows = [];
  for (let y = 1; y <= c.years; y++) {
    const m = c.monthly * Math.pow(1 + c.inc / 100, y - 1), v0 = v;
    for (let i = 0; i < 12; i++) v = (v + m) * (1 + r);   // indskud i starten af hver måned
    dep += m * 12;
    rows.push({ y, m, depYear: m * 12, dep, gain: v - dep, gainYear: v - v0 - m * 12, v, real: v / Math.pow(1 + c.infl / 100, y) });
  }
  return rows;
}
const rangePct = (f, v) => Math.max(0, Math.min(100, (v - f.min) / (f.max - f.min) * 100));
const fmtIn = (f, v) => f.u === 'kr' ? nf0.format(v) : String(v).replace('.', ',');
function renderRenter() {
  const c = calcState();
  afterRender.renter = () => updateCalc(true);
  return `
  <div class="grid calc-grid">
    <div class="card calc-in">
      <h2>🧮 Renters rente-beregner</h2>
      ${CALC_F.map(f => `
        <div class="cf ${f.opt ? 'opt' : ''}">
          <div class="cf-head"><label for="cn-${f.k}">${f.l}${f.opt ? ' <span class="muted small">(valgfri)</span>' : ''}</label>
            <span class="cf-num"><input class="input" id="cn-${f.k}" data-calc="${f.k}" inputmode="decimal" value="${fmtIn(f, c[f.k])}"><span>${f.u}</span></span></div>
          <input type="range" class="range" id="cr-${f.k}" data-calc="${f.k}" min="${f.min}" max="${f.max}" step="${f.step}" value="${c[f.k]}" style="--p:${rangePct(f, c[f.k])}%" aria-label="${f.l}">
        </div>`).join('')}
      <label class="switch"><span>Vis i dagens købekraft <span class="muted small">(inflation <input class="input mini-in" id="cn-infl" data-calc="infl" inputmode="decimal" value="${fmtIn({ u: '%' }, c.infl)}"> % om året)</span></span><input type="checkbox" id="calcReal" ${c.real ? 'checked' : ''}></label>
      <button class="btn btn-sm btn-ghost" data-action="calc-reset" style="margin-top:6px">↺ Nulstil til standard</button>
    </div>
    <div class="calc-out">
      <div class="grid calc-kpis" id="calcKpis"></div>
      <div class="card"><h2>Udvikling <small id="calcSub"></small></h2><div class="chart-box"><canvas id="chCalc"></canvas></div></div>
    </div>
  </div>
  <div class="card section"><h2>År for år</h2><div class="scroll-x" id="calcTable"></div></div>
  <details class="card section tip-how"><summary><strong>Sådan regner vi</strong></summary>
    <p class="muted small">Det årlige afkast omregnes til et tilsvarende månedligt afkast, og den månedlige opsparing indsættes i starten af hver måned, hvorefter hele beløbet forrentes. Årlige omkostninger trækkes fra afkastet hvert år. Stiger den månedlige opsparing, sker det én gang om året. Købekraft viser værdien omregnet til dagens priser med den inflation, du angiver. Skat er ikke medregnet – den afhænger af, hvor og hvordan pengene er placeret.</p>
  </details>
  <p class="muted small tips-note">ℹ️ Beregningen er en illustration af renters rente – ikke et løfte om afkast. Virkelige afkast svinger fra år til år og kan være negative, og tidligere afkast er ingen garanti for fremtidige. Skat er ikke medregnet. Det er ikke investeringsrådgivning. <a href="#/skole/invest">🎓 Lær mere i Økonomiskolen</a></p>`;
}
function updateCalc(full) {
  const c = calcState(), rows = compound(c), base = compound(c, false), last = rows[rows.length - 1], lb = base[base.length - 1];
  const R = c.real, val = r => R ? r.real : r.v, defl = (x, y) => R ? x / Math.pow(1 + c.infl / 100, y) : x;
  const costLoss = lb.v - last.v;
  $('#calcKpis').innerHTML = `
    <div class="card kpi hero"><div class="label">Slutværdi efter ${c.years} år${R ? ' · dagens kroner' : ''}</div><div class="value">${kr(val(last), false)}</div><div class="sub">${R ? `${kr(last.v, false)} i fremtidige kroner` : `${nf1.format(last.v / Math.max(1, last.dep))} × det indskudte`}</div></div>
    <div class="card kpi"><div class="label">💰 Samlede indskud</div><div class="value">${kr(last.dep, false)}</div><div class="sub">start + ${kr(c.monthly, false)}/md.${c.inc ? ` (+${String(c.inc).replace('.', ',')} %/år)` : ''}</div></div>
    <div class="card kpi"><div class="label">📈 Samlet afkast</div><div class="value pos">${kr(last.gain, false)}</div><div class="sub">${last.v ? pct(last.gain / last.v * 100) : '–'} af slutværdien</div></div>
    <div class="card kpi"><div class="label">🧾 Omkostninger koster</div><div class="value ${costLoss > 0 ? 'neg' : ''}">${c.cost ? '−' + kr(costLoss, false) : '0 kr'}</div><div class="sub">${c.cost ? `ved ${String(c.cost).replace('.', ',')} % om året` : 'ingen omkostninger valgt'}</div></div>`;
  $('#calcSub').textContent = `${String(c.ret).replace('.', ',')} % afkast${c.cost ? ` − ${String(c.cost).replace('.', ',')} % omk.` : ''}`;
  $('#calcTable').innerHTML = `<table class="tbl"><thead><tr><th>År</th><th class="r">Indskud i året</th><th class="r">Indskudt i alt</th><th class="r">Afkast i året</th><th class="r">Afkast i alt</th><th class="r">Værdi</th>${R ? '<th class="r">Købekraft</th>' : ''}</tr></thead><tbody>
    <tr><td>0</td><td class="r">${kr(c.start, false)}</td><td class="r">${kr(c.start, false)}</td><td class="r">–</td><td class="r">–</td><td class="r">${kr(c.start, false)}</td>${R ? `<td class="r">${kr(c.start, false)}</td>` : ''}</tr>
    ${rows.map(r => `<tr><td>${r.y}</td><td class="r">${kr(r.depYear, false)}</td><td class="r">${kr(r.dep, false)}</td><td class="r pos">${kr(r.gainYear, false)}</td><td class="r">${kr(r.gain, false)}</td><td class="r"><b>${kr(r.v, false)}</b></td>${R ? `<td class="r">${kr(r.real, false)}</td>` : ''}</tr>`).join('')}</tbody></table>`;
  const labels = rows.map(r => 'År ' + r.y);
  const dep = rows.map(r => Math.round(defl(r.dep, r.y))), gain = rows.map(r => Math.round(defl(r.v, r.y) - defl(r.dep, r.y)));
  const noCost = base.map(r => Math.round(defl(r.v, r.y)));
  const ch = charts.find(x => x.canvas && x.canvas.id === 'chCalc');
  if (ch && !full) {
    ch.data.labels = labels; ch.data.datasets[0].data = dep; ch.data.datasets[1].data = gain; ch.data.datasets[2].data = c.cost ? noCost : []; ch.update('none'); return;
  }
  if (ch) { ch.destroy(); charts.splice(charts.indexOf(ch), 1); }
  mkChart('chCalc', {
    type: 'bar',
    data: { labels, datasets: [
      { label: 'Indskud', data: dep, backgroundColor: 'rgba(124,92,255,.85)', borderRadius: 4, stack: 's', order: 2 },
      { label: 'Afkast', data: gain, backgroundColor: 'rgba(34,211,154,.85)', borderRadius: 4, stack: 's', order: 2 },
      { label: 'Uden omkostninger', type: 'line', data: c.cost ? noCost : [], borderColor: 'rgba(255,181,71,.9)', borderDash: [5, 4], borderWidth: 2, pointRadius: 0, fill: false, order: 1 }
    ] },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 12, usePointStyle: true, filter: (it, d) => d.datasets[it.datasetIndex].data.length > 0 } } },
      scales: { x: { stacked: true, grid: { display: false }, ticks: { maxTicksLimit: 10, autoSkip: true } }, y: { stacked: true, ticks: { callback: tickKr } } } }
  });
}
function setCalc(k, raw, from) {
  const f = CALC_F.find(x => x.k === k) || { k: 'infl', min: 0, max: 20 };
  let v = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/\./g, f.u === 'kr' ? '' : '.').replace(',', '.').replace(/[^\d.\-]/g, ''));
  if (!isFinite(v)) return;
  v = Math.max(f.min, Math.min(k === 'start' || k === 'monthly' ? 1e8 : f.max, v));
  if (k === 'years') v = Math.round(v);
  S.settings.calc = { ...calcState(), [k]: v }; save();
  const rng = $('#cr-' + k); if (rng) { if (from !== 'range') rng.value = v; rng.style.setProperty('--p', rangePct(f, v) + '%'); }
  const num = $('#cn-' + k); if (num && from !== 'num') num.value = fmtIn(f, v);
  updateCalc(false);
}

/* ---------- Import-påmindelse ---------- */
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 864e5);
function lastImportDate() {
  if (S.settings.lastImport) return S.settings.lastImport;
  const imp = S.transactions.filter(t => t.imported).map(t => t.importedAt || t.date).sort();
  return imp.length ? imp[imp.length - 1] : null;
}
function importReminder() {
  const every = S.settings.importReminder ?? 14;
  if (!every || S.isExample) return null;
  const today = todayISO();
  if (S.settings.importSnooze && S.settings.importSnooze > today) return null;
  const last = lastImportDate();
  if (!last) return S.transactions.length ? { first: true } : null;
  const days = daysBetween(last, today);
  return days >= every ? { days, last } : null;
}
function importReminderHTML() {
  const r = importReminder(); if (!r) return '';
  return `<div class="card section remind">
    <div class="remind-ico">🏦</div>
    <div class="main-col"><strong>${r.first ? 'Hent dine posteringer fra banken' : `Det er ${r.days} dage siden, du sidst importerede`}</strong>
      <span class="muted small">${r.first ? 'Importér et kontoudtog (CSV/Excel) – Lån & Spar genkendes automatisk, og du gennemser alt, før det gemmes.' : `Seneste import: ${fmtDate(r.last)}. Hent de nyeste posteringer, så dit overblik passer.`}</span></div>
    <div class="remind-btns"><button class="btn btn-sm btn-primary" data-action="import-csv">Importér nu</button><button class="btn btn-sm btn-ghost" data-action="snooze-import">Udsæt 7 dage</button></div>
  </div>`;
}

/* ---------- Årsoversigt til skat ---------- */
let taxYear = null;
function renderAarsoversigt() {
  const years = [...new Set(S.transactions.map(t => t.date.slice(0, 4)))].sort().reverse();
  const cy = String(new Date().getFullYear());
  if (!years.includes(cy)) years.unshift(cy);
  const Y = taxYear && years.includes(taxYear) ? taxYear : (years.includes(String(+cy - 1)) && new Date().getMonth() < 3 ? String(+cy - 1) : cy);
  const tx = S.transactions.filter(t => t.date.startsWith(Y));
  const inc = tx.filter(t => t.type === 'income'), exp = tx.filter(t => t.type === 'expense');
  const months = Array.from({ length: 12 }, (_, i) => `${Y}-${pad(i + 1)}`);
  const rows = [...S.jobs.map(j => ({ j, list: inc.filter(t => t.jobId === j.id) })), { j: null, list: inc.filter(t => !job(t.jobId)) }].filter(r => r.list.length || r.j);
  const tot = list => sum(list.map(t => t.amount));
  const totalInc = tot(inc), noTax = sum(rows.filter(r => hasReserve(r.j)).map(r => tot(r.list)));
  const reserve = sum(rows.filter(r => hasReserve(r.j)).map(r => tot(r.list) * jobRate(r.j) / 100));
  const fag = tot(exp.filter(t => t.categoryId === 'c-fag'));
  const isPartial = Y === cy;
  const monthCell = (list, m) => { const v = tot(list.filter(t => t.date.startsWith(m))); return v ? nf0.format(v) : '<span class="muted">–</span>'; };
  return `
  <div class="tabs">${years.map(y => `<button class="chip ${y === Y ? 'on' : ''}" data-action="tax-year" data-y="${y}">${y}</button>`).join('')}</div>
  <div class="card summary section" style="margin-top:0"><span class="tag">📑 Til forskuds- og årsopgørelsen</span>
    <p>Her er dine indtægter i <strong>${Y}</strong>${isPartial ? ' indtil nu' : ''} samlet pr. job – som hjælp, når du skal tjekke ${isPartial ? 'forskudsopgørelsen' : 'årsopgørelsen'} i TastSelv. Tallene kommer fra dine egne posteringer i appen.</p></div>
  <div class="grid kpis section">
    <div class="card kpi hero"><div class="label">Indtægter i ${Y}${isPartial ? ' (til dato)' : ''}</div><div class="value">${kr(totalInc, false)}</div><div class="sub">${inc.length} indbetalinger</div></div>
    <div class="card kpi"><div class="label">🧾 Uden trukket skat</div><div class="value">${kr(noTax, false)}</div><div class="sub">selvstændig & udlejning</div></div>
    <div class="card kpi"><div class="label">🛟 Din skattereserve</div><div class="value warn">${kr(reserve, false)}</div><div class="sub">dit eget skøn pr. job</div></div>
    <div class="card kpi"><div class="label">🤝 A-kasse & fagforening</div><div class="value">${kr(fag, false)}</div><div class="sub">betalt i ${Y}</div></div>
  </div>
  <div class="card section"><h2>Indtægter pr. job <small>${Y}</small></h2><div class="scroll-x"><table class="tbl">
    <thead><tr><th>Job</th><th>Type</th><th class="r">Indbetalinger</th><th class="r">I alt</th><th class="r">Reserve-sats</th><th class="r">Reserve (skøn)</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${r.j ? `${r.j.emoji} ${esc(r.j.name)}` : '❔ Uden job'}</td><td>${r.j ? JOB_KINDS[r.j.kind] : '–'}</td><td class="r">${r.list.length}</td><td class="r"><b>${kr(tot(r.list), false)}</b></td><td class="r">${hasReserve(r.j) ? jobRate(r.j) + ' %' : '–'}</td><td class="r">${hasReserve(r.j) ? kr(tot(r.list) * jobRate(r.j) / 100, false) : '–'}</td></tr>`).join('')}
    <tr class="tot"><td><b>I alt</b></td><td></td><td class="r">${inc.length}</td><td class="r"><b>${kr(totalInc, false)}</b></td><td></td><td class="r"><b>${kr(reserve, false)}</b></td></tr>
    </tbody></table></div>
    <p class="muted small" style="margin-top:10px">Lønindkomst (A-indkomst) er allerede indberettet af arbejdsgiveren – sammenlign med årsopgørelsen. Indtægter fra selvstændig virksomhed og udlejning skal du typisk selv oplyse. Reserven er dit eget skøn fra <a href="#/jobs">Mine jobs</a> – ikke en beregnet skat.</p>
  </div>
  <div class="card section"><h2>Måned for måned <small>kr.</small></h2><div class="scroll-x"><table class="tbl">
    <thead><tr><th>Job</th>${months.map(m => `<th class="r">${MONTHS[+m.slice(5) - 1].slice(0, 3)}</th>`).join('')}<th class="r">I alt</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${r.j ? `${r.j.emoji} ${esc(r.j.name)}` : '❔ Uden job'}</td>${months.map(m => `<td class="r">${monthCell(r.list, m)}</td>`).join('')}<td class="r"><b>${nf0.format(tot(r.list))}</b></td></tr>`).join('')}
    <tr class="tot"><td><b>I alt</b></td>${months.map(m => `<td class="r"><b>${monthCell(inc, m)}</b></td>`).join('')}<td class="r"><b>${nf0.format(totalInc)}</b></td></tr>
    </tbody></table></div></div>
  <div class="grid cols-2 section">
    <div class="card"><h2>✅ Tjekliste</h2><div class="list check-list">
      <div class="row"><span>🧾</span><div class="main-col"><div class="title">Sammenlign løn med årsopgørelsen</div><div class="meta">Lønnen fra ansættelser bør stemme med det, arbejdsgiverne har indberettet.</div></div></div>
      <div class="row"><span>🏋️</span><div class="main-col"><div class="title">Oplys indtægt fra selvstændig virksomhed</div><div class="meta">Fx personlig træning – husk også udgifter/bilag til virksomheden, og tjek reglerne på skat.dk.</div></div></div>
      <div class="row"><span>🏡</span><div class="main-col"><div class="title">Udlejning (fx Airbnb)</div><div class="meta">Der gælder særlige regler og bundfradrag for udlejning – se skat.dk.</div></div></div>
      <div class="row"><span>🤝</span><div class="main-col"><div class="title">Fagforening og a-kasse</div><div class="meta">Fradraget kommer normalt automatisk – tjek, at beløbet passer med det, du har betalt.</div></div></div>
      <div class="row"><span>🚲</span><div class="main-col"><div class="title">Kørselsfradrag</div><div class="meta">Beregnes ud fra afstand og arbejdsdage – ikke fra dine posteringer – og skal selv oplyses på årsopgørelsen.</div></div></div>
    </div></div>
    <div class="card"><h2>⬇️ Eksport</h2>
      <p class="muted small">Gem oversigten som regneark eller udskriv/gem som PDF, så du har den ved hånden i TastSelv eller hos en revisor.</p>
      <div class="btn-row"><button class="btn btn-primary" data-action="tax-csv" data-y="${Y}">📊 Hent som CSV</button><button class="btn" data-action="print">🖨️ Udskriv / PDF</button><a class="btn btn-ghost" href="https://skat.dk/tastselv" target="_blank" rel="noopener">TastSelv ↗</a></div>
    </div>
  </div>
  <p class="muted small tips-note">ℹ️ Årsoversigten er et overblik over dine egne posteringer – ikke en selvangivelse eller en skatteberegning, og den er ikke skatterådgivning. Det er dit eget ansvar, at oplysningerne til Skattestyrelsen er korrekte. Tjek reglerne på skat.dk, og søg rådgivning ved tvivl.</p>`;
}
function taxCSV(Y) {
  const inc = S.transactions.filter(t => t.type === 'income' && t.date.startsWith(Y));
  const months = Array.from({ length: 12 }, (_, i) => `${Y}-${pad(i + 1)}`);
  const groups = [...S.jobs.map(j => ({ name: j.name, kind: JOB_KINDS[j.kind], rate: hasReserve(j) ? jobRate(j) : '', list: inc.filter(t => t.jobId === j.id) })), { name: 'Uden job', kind: '', rate: '', list: inc.filter(t => !job(t.jobId)) }];
  const q = v => /[;"\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v;
  const rows = [[`Årsoversigt ${Y} – Min Økonomi (egne posteringer, ikke en skatteberegning)`], [], ['Job', 'Type', ...months.map(m => MONTHS[+m.slice(5) - 1]), 'I alt', 'Reserve-sats %', 'Reserve (skøn)']];
  groups.forEach(g => { const t = sum(g.list.map(x => x.amount)); rows.push([g.name, g.kind, ...months.map(m => nf2.format(sum(g.list.filter(x => x.date.startsWith(m)).map(x => x.amount)))), nf2.format(t), g.rate, g.rate !== '' ? nf2.format(t * g.rate / 100) : '']); });
  rows.push([], ['Posteringer'], ['Dato', 'Job', 'Kategori', 'Beløb', 'Note']);
  [...inc].sort((a, b) => a.date.localeCompare(b.date)).forEach(t => rows.push([fmtDateNum(t.date), job(t.jobId)?.name || '', cat(t.categoryId).name, nf2.format(t.amount), t.note || '']));
  download(`aarsoversigt-${Y}.csv`, '\ufeff' + rows.map(r => r.map(x => q(String(x))).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
}

/* ---------- Hvad nu hvis ---------- */
const WI_DEF = { incDelta: 0, newExpense: 0, oneOff: 0, cancel: [], cuts: {} };
const wiState = () => ({ ...WI_DEF, ...(S.settings.whatif || {}), cuts: { ...((S.settings.whatif || {}).cuts || {}) }, cancel: [...((S.settings.whatif || {}).cancel || [])] });
function wiBase() {
  const keys = []; for (let i = 1; i <= 3; i++) keys.push(addMonths(curMonth(), -i));
  let used = keys.filter(k => S.transactions.some(t => t.date.startsWith(k)));
  if (!used.length && S.transactions.some(t => t.date.startsWith(curMonth()))) used = [curMonth()];
  const n = used.length || 1, st = used.map(stats);
  const byCat = {}; st.forEach(s => Object.entries(s.byCat).forEach(([c, v]) => byCat[c] = (byCat[c] || 0) + v / n));
  return { inc: sum(st.map(s => s.inc)) / n, exp: sum(st.map(s => s.exp)) / n, byCat, months: used.length };
}
function wiCalc(w, b) {
  const subs = S.recurring.filter(r => r.type === 'expense' && !r.endMonth && w.cancel.includes(r.id));
  const subSave = sum(subs.map(r => r.amount));
  const cutSave = sum(Object.entries(w.cuts).map(([c, p]) => (b.byCat[c] || 0) * p / 100));
  const inc = b.inc + w.incDelta, exp = Math.max(0, b.exp - subSave - cutSave + w.newExpense);
  return { inc, exp, net: inc - exp, subSave, cutSave, delta: (inc - exp) - (b.inc - b.exp) };
}
function renderHvadnu() {
  const w = wiState(), b = wiBase();
  afterRender.hvadnu = () => updateWhatif(true);
  const subs = S.recurring.filter(r => r.type === 'expense' && !r.endMonth).sort((a, c) => c.amount - a.amount);
  const cutCats = Object.entries(b.byCat).filter(([c]) => !['c-bolig'].includes(c)).sort((a, c) => c[1] - a[1]).slice(0, 6);
  const sl = (id, label, min, max, step, val, unit = 'kr/md.') => `<div class="cf"><div class="cf-head"><label for="wn-${id}">${label}</label><span class="cf-num"><input class="input" id="wn-${id}" data-wi="${id}" inputmode="decimal" value="${nf0.format(val)}"><span>${unit}</span></span></div>
    <input type="range" class="range" id="wr-${id}" data-wi="${id}" min="${min}" max="${max}" step="${step}" value="${val}" style="--p:${(val - min) / (max - min) * 100}%"></div>`;
  return `
  <div class="card summary section" style="margin-top:0"><span class="tag">🔮 Hvad nu hvis …</span>
    <p>Prøv ændringer af på dit gennemsnit for de seneste ${b.months || 0} hele måneder (${kr(b.inc, false)} ind, ${kr(b.exp, false)} ud) og se, hvad det betyder for dit overskud og dine mål. Intet bliver ændret i dine data.</p></div>
  <div class="grid calc-grid">
    <div class="card calc-in">
      <h2>Dine ændringer</h2>
      ${sl('incDelta', 'Ændring i indtægt', -20000, 20000, 250, w.incDelta)}
      ${sl('newExpense', 'Ny fast udgift (fx bil, større bolig)', 0, 15000, 100, w.newExpense)}
      ${sl('oneOff', 'Engangsudgift nu', 0, 100000, 500, w.oneOff, 'kr')}
      ${cutCats.length ? `<h3 class="wi-h">✂️ Skær ned på forbrug</h3>${cutCats.map(([c, v]) => `<div class="cf"><div class="cf-head"><label>${cat(c).emoji} ${esc(cat(c).name)} <span class="muted small">${kr(v, false)}/md.</span></label><span class="cf-num"><b id="wcv-${c}">${w.cuts[c] || 0}</b> %</span></div>
        <input type="range" class="range" data-wicut="${c}" min="0" max="75" step="5" value="${w.cuts[c] || 0}" style="--p:${(w.cuts[c] || 0) / 75 * 100}%" aria-label="Skær ned på ${esc(cat(c).name)}"></div>`).join('')}` : ''}
      ${subs.length ? `<h3 class="wi-h">🔁 Stop faste udgifter</h3><div class="wi-subs">${subs.map(r => `<label class="wi-sub"><input type="checkbox" data-wisub="${r.id}" ${w.cancel.includes(r.id) ? 'checked' : ''}><span>${cat(r.categoryId).emoji} ${esc(r.name)}</span><b>${kr(r.amount, false)}</b></label>`).join('')}</div>` : ''}
      <button class="btn btn-sm btn-ghost" data-action="wi-reset" style="margin-top:10px">↺ Nulstil scenarie</button>
    </div>
    <div class="calc-out">
      <div class="grid calc-kpis" id="wiKpis"></div>
      <div class="card"><h2>Opsparing de næste 12 måneder <small>samlet overskud</small></h2><div class="chart-box"><canvas id="chWi"></canvas></div></div>
      <div class="card" id="wiGoals"></div>
    </div>
  </div>
  <p class="muted small tips-note">ℹ️ Et regneeksempel ud fra dit gennemsnit – virkeligheden svinger fra måned til måned, og skat af ekstra indtægt er ikke medregnet, medmindre du selv trækker den fra. Ikke økonomisk rådgivning.</p>`;
}
function updateWhatif(full) {
  const w = wiState(), b = wiBase(), r = wiCalc(w, b);
  const baseNet = b.inc - b.exp;
  const sgn = v => (v >= 0 ? '+' : '−') + kr(Math.abs(v), false);
  $('#wiKpis').innerHTML = `
    <div class="card kpi hero"><div class="label">Overskud pr. måned med ændringer</div><div class="value">${r.net < 0 ? '−' : ''}${kr(Math.abs(r.net), false)}</div><div class="sub">nu: ${baseNet < 0 ? '−' : ''}${kr(Math.abs(baseNet), false)} · ${sgn(r.delta)}/md.</div></div>
    <div class="card kpi"><div class="label">📅 Forskel på et år</div><div class="value ${r.delta >= 0 ? 'pos' : 'neg'}">${sgn(r.delta * 12 - w.oneOff)}</div><div class="sub">inkl. engangsudgift</div></div>
    <div class="card kpi"><div class="label">🐷 Opsparingsrate</div><div class="value">${r.inc > 0 ? pct(r.net / r.inc * 100) : '–'}</div><div class="sub">nu ${b.inc > 0 ? pct(baseNet / b.inc * 100) : '–'}</div></div>
    <div class="card kpi"><div class="label">✂️ Sparet på forbrug</div><div class="value pos">${kr(r.subSave + r.cutSave, false)}</div><div class="sub">pr. måned</div></div>`;
  const labels = [], now = [], sc = []; let a = 0, s = -w.oneOff;
  for (let i = 1; i <= 12; i++) { const m = addMonths(curMonth(), i); labels.push(MONTHS[+m.slice(5) - 1].slice(0, 3)); a += baseNet; s += r.net; now.push(Math.round(a)); sc.push(Math.round(s)); }
  const ch = charts.find(x => x.canvas && x.canvas.id === 'chWi');
  if (ch && !full) { ch.data.datasets[0].data = now; ch.data.datasets[1].data = sc; ch.update('none'); }
  else {
    if (ch) { ch.destroy(); charts.splice(charts.indexOf(ch), 1); }
    mkChart('chWi', { type: 'line', data: { labels, datasets: [
      { label: 'Som nu', data: now, borderColor: 'rgba(148,163,184,.9)', borderDash: [5, 4], borderWidth: 2, pointRadius: 0, tension: .3 },
      { label: 'Med ændringer', data: sc, borderColor: '#7c5cff', backgroundColor: 'rgba(124,92,255,.15)', fill: true, borderWidth: 3, pointRadius: 0, tension: .3 }
    ] }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: tickKr } } } } });
  }
  const goals = S.goals.filter(g => goalSaved(g) < g.target);
  const per = net => goals.length ? Math.max(0, net) / goals.length : 0;
  const eta = (g, pace) => { const rem = g.target - goalSaved(g); return pace > 0 ? Math.ceil(rem / pace) : null; };
  const lbl = n => n == null ? '—' : n <= 0 ? 'nu' : `${monthLabel(addMonths(curMonth(), n))}`;
  $('#wiGoals').innerHTML = `<h2>🏆 Dine mål <small>hvis overskuddet fordeles ligeligt</small></h2>${goals.length ? `<div class="list">${goals.map(g => { const n0 = eta(g, per(baseNet)), n1 = eta(g, per(r.net)); const diff = n0 != null && n1 != null ? n0 - n1 : null; return `<div class="row"><div class="avatar" style="background:${g.color}22">${g.emoji}</div><div class="main-col"><div class="title">${esc(g.name)}</div><div class="meta">nu: ${lbl(n0)} → med ændringer: <b>${lbl(n1)}</b></div></div>${diff ? `<span class="pill ${diff > 0 ? 'ok' : 'bad'}">${diff > 0 ? `${diff} md. før` : `${-diff} md. senere`}</span>` : ''}</div>`; }).join('')}</div>` : `<p class="muted small">Du har ingen aktive opsparingsmål. <a href="#/maal">Opret et mål</a> for at se, hvornår du når det.</p>`}`;
}
function setWhatif(k, raw, from) {
  const w = wiState(); let v = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, ''));
  if (!isFinite(v)) return;
  w[k] = v; S.settings.whatif = w; save();
  const rng = $('#wr-' + k); if (rng) { if (from !== 'range') rng.value = v; rng.style.setProperty('--p', (v - rng.min) / (rng.max - rng.min) * 100 + '%'); }
  const num = $('#wn-' + k); if (num && from !== 'num') num.value = nf0.format(v);
  updateWhatif(false);
}

/* ---------- Nettoformue ---------- */
const NW_KINDS = {
  asset: { konto: ['💳', 'Bankkonto'], opsparing: ['🐷', 'Opsparing'], investering: ['📈', 'Investeringer'], pension: ['👵', 'Pension'], bolig: ['🏠', 'Bolig'], bil: ['🚗', 'Bil / køretøj'], andet: ['📦', 'Andet'] },
  debt: { realkredit: ['🏦', 'Realkredit'], banklaan: ['🏛️', 'Banklån'], su: ['🎓', 'SU-lån'], billaan: ['🚗', 'Billån'], kredit: ['💳', 'Kreditkort / kassekredit'], andet: ['📦', 'Anden gæld'] }
};
const nwItems = () => (S.networth && S.networth.items) || [];
const nwCur = it => { const h = [...(it.history || [])].sort((a, b) => a.date.localeCompare(b.date)); return h.length ? h[h.length - 1] : null; };
const nwAt = (it, date) => { const h = (it.history || []).filter(x => x.date <= date).sort((a, b) => a.date.localeCompare(b.date)); return h.length ? h[h.length - 1].value : null; };
function nwTotals(date) {
  let a = 0, d = 0, any = false;
  nwItems().forEach(it => { const v = date ? nwAt(it, date) : nwCur(it)?.value; if (v == null) return; any = true; it.side === 'debt' ? d += v : a += v; });
  if (S.settings.nwGoals) a += sum(S.goals.map(goalSaved));
  return { a, d, net: a - d, any };
}
function renderFormue() {
  const items = nwItems(), t = nwTotals();
  const today = todayISO(), prevDate = `${addMonths(curMonth(), -1)}-${pad(dim(addMonths(curMonth(), -1)))}`;
  const prev = nwTotals(prevDate);
  const lastUpd = items.map(it => nwCur(it)?.date).filter(Boolean).sort().pop();
  const stale = lastUpd && daysBetween(lastUpd, today) > 35;
  const row = it => { const c = nwCur(it), k = NW_KINDS[it.side][it.kind] || ['📦', 'Andet']; const h = (it.history || []).length; return `<div class="row click" data-action="nw-edit" data-id="${it.id}">
    <div class="avatar" style="background:${it.side === 'debt' ? 'rgba(255,107,139,.14)' : 'rgba(34,211,154,.14)'}">${k[0]}</div>
    <div class="main-col"><div class="title">${esc(it.name)}</div><div class="meta">${k[1]}${c ? ` · opdateret ${fmtDate(c.date)}` : ''}${h > 1 ? ` · ${h} målinger` : ''}</div></div>
    <div class="amt ${it.side === 'debt' ? 'neg' : ''}">${it.side === 'debt' ? '−' : ''}${kr(c ? c.value : 0, false)}</div></div>`; };
  afterRender.formue = () => drawNetworth();
  const assets = items.filter(i => i.side === 'asset'), debts = items.filter(i => i.side === 'debt');
  return `
  ${!items.length ? `<div class="card summary section" style="margin-top:0"><span class="tag">💎 Nettoformue</span><p>Nettoformue er alt, du ejer, minus alt, du skylder. Tilføj dine konti, opsparing, pension, bolig og gæld – og opdatér værdierne fx en gang om måneden. Så kan du følge udviklingen over tid.</p></div>` : ''}
  ${stale ? `<div class="banner"><span>⏰</span><div class="grow"><strong>Sidst opdateret ${fmtDate(lastUpd)}.</strong> Opdatér værdierne, så grafen viser din aktuelle formue.</div><button class="btn btn-sm" data-action="nw-update-all">Opdatér nu</button></div>` : ''}
  <div class="grid kpis">
    <div class="card kpi hero"><div class="label">Nettoformue</div><div class="value">${t.net < 0 ? '−' : ''}${kr(Math.abs(t.net), false)}</div><div class="sub">${prev.any ? `${t.net - prev.net >= 0 ? '+' : '−'}${kr(Math.abs(t.net - prev.net), false)} siden ${monthLabel(addMonths(curMonth(), -1))}` : 'aktiver minus gæld'}</div></div>
    <div class="card kpi"><div class="label">💚 Aktiver</div><div class="value">${kr(t.a, false)}</div><div class="sub">${assets.length} poster${S.settings.nwGoals ? ' + mål' : ''}</div></div>
    <div class="card kpi"><div class="label">💳 Gæld</div><div class="value neg">${t.d ? '−' : ''}${kr(t.d, false)}</div><div class="sub">${debts.length} poster</div></div>
    <div class="card kpi"><div class="label">⚖️ Gældsgrad</div><div class="value">${t.a > 0 ? pct(t.d / t.a * 100) : '–'}</div><div class="sub">gæld i forhold til aktiver</div></div>
  </div>
  <div class="card section"><h2>Udvikling <small>seneste 24 måneder</small></h2>${items.length ? '<div class="chart-box tall"><canvas id="chNw"></canvas></div>' : '<p class="muted">Tilføj dine første poster for at se grafen.</p>'}</div>
  <div class="grid cols-2 section">
    <div class="card"><h2>💚 Aktiver <button class="btn btn-sm" data-action="nw-add" data-side="asset">＋ Tilføj</button></h2><div class="list">${assets.map(row).join('') || '<p class="muted small">Fx lønkonto, opsparing, aktiedepot, pension, bolig.</p>'}
      ${S.goals.length ? `<label class="switch" style="margin:10px 0 0"><span>🏆 Medregn opsparingsmål <span class="muted small">(${kr(sum(S.goals.map(goalSaved)), false)})</span></span><input type="checkbox" id="nwGoals" ${S.settings.nwGoals ? 'checked' : ''}></label>` : ''}</div></div>
    <div class="card"><h2>💳 Gæld <button class="btn btn-sm" data-action="nw-add" data-side="debt">＋ Tilføj</button></h2><div class="list">${debts.map(row).join('') || '<p class="muted small">Fx realkredit, SU-lån, billån, kreditkort.</p>'}</div></div>
  </div>
  ${items.length ? '<button class="btn btn-primary btn-block section" data-action="nw-update-all">🔄 Opdatér alle værdier i dag</button>' : ''}
  <p class="muted small tips-note">ℹ️ Værdierne er dine egne skøn (fx boligens handelsværdi eller pensionens depotværdi fra PensionsInfo). Pension og bolig kan ikke altid bruges med det samme, og skat ved udbetaling eller salg er ikke fratrukket.</p>`;
}
function drawNetworth() {
  const items = nwItems(); if (!items.length) return;
  const first = items.flatMap(i => (i.history || []).map(h => h.date)).sort()[0]; if (!first) return;
  const months = []; for (let m = addMonths(curMonth(), -23); m <= curMonth(); m = addMonths(m, 1)) if (m >= first.slice(0, 7)) months.push(m);
  const pts = months.map(m => nwTotals(m === curMonth() ? todayISO() : `${m}-${pad(dim(m))}`));
  mkChart('chNw', { type: 'bar', data: { labels: months.map(m => MONTHS[+m.slice(5) - 1].slice(0, 3) + ' ' + m.slice(2, 4)), datasets: [
    { type: 'line', label: 'Nettoformue', data: pts.map(p => Math.round(p.net)), borderColor: '#7c5cff', backgroundColor: '#7c5cff', borderWidth: 3, pointRadius: months.length > 12 ? 0 : 3, tension: .3, order: 0 },
    { label: 'Aktiver', data: pts.map(p => Math.round(p.a)), backgroundColor: 'rgba(34,211,154,.55)', borderRadius: 4, order: 1 },
    { label: 'Gæld', data: pts.map(p => -Math.round(p.d)), backgroundColor: 'rgba(255,107,139,.55)', borderRadius: 4, order: 1 }
  ] }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: false, ticks: { callback: tickKr } } } } });
}
function openNwModal(it, side) {
  const isNew = !it; const x = it ? clone(it) : { name: '', side, kind: Object.keys(NW_KINDS[side])[0], history: [] };
  const c = nwCur(x);
  openSheet(`${sheetHead(isNew ? (side === 'debt' ? 'Ny gæld' : 'Nyt aktiv') : esc(x.name))}
    <div class="field"><span class="lbl">Type</span><div class="chips" data-chips="nwkind">${Object.entries(NW_KINDS[x.side]).map(([k, v]) => `<button type="button" class="chip ${k === x.kind ? 'on' : ''}" data-val="${k}">${v[0]} ${v[1]}</button>`).join('')}</div></div>
    <div class="field"><label for="nwName">Navn</label><input class="input" id="nwName" placeholder="${x.side === 'debt' ? 'Fx Realkredit – Totalkredit' : 'Fx Lønkonto – Lån & Spar'}" value="${esc(x.name)}" ${isNew ? 'autofocus' : ''}></div>
    <div class="field-row"><div class="field"><label for="nwVal">${x.side === 'debt' ? 'Restgæld' : 'Værdi'} i dag</label><input class="input" id="nwVal" inputmode="decimal" placeholder="0" value="${c ? nf2.format(c.value) : ''}" ${isNew ? '' : 'autofocus'}></div>
      <div class="field"><label for="nwDate">Dato</label><input class="input" type="date" id="nwDate" value="${todayISO()}"></div></div>
    ${!isNew && x.history.length ? `<details class="map"><summary>Historik (${x.history.length})</summary><div class="list">${[...x.history].sort((a, b) => b.date.localeCompare(a.date)).map(h => `<div class="row"><div class="main-col"><div class="title">${fmtDate(h.date)}</div></div><div class="amt">${kr(h.value, false)}</div><button class="icon-btn" data-nwdel="${h.date}" aria-label="Slet måling">🗑️</button></div>`).join('')}</div></details>` : ''}
    <div class="btn-row"><button class="btn btn-primary" style="flex:1" id="nwSave">${isNew ? 'Tilføj' : 'Gem ny værdi'}</button>${isNew ? '' : '<button class="btn btn-danger" id="nwDelItem">Slet</button>'}</div>`, sheet => {
    let kind = x.kind; bindChips(sheet, 'nwkind', v => kind = v);
    sheet.addEventListener('click', e => { const d = e.target.closest('[data-nwdel]'); if (!d) return; const real = nwItems().find(i => i.id === x.id); real.history = real.history.filter(h => h.date !== d.dataset.nwdel); save(); closeSheet(); render(); toast('Måling slettet'); });
    $('#nwSave', sheet).onclick = () => {
      const name = $('#nwName', sheet).value.trim(), val = parseAmount($('#nwVal', sheet).value), date = $('#nwDate', sheet).value || todayISO();
      if (!name) { toast('Giv posten et navn'); return; }
      if (!(val >= 0)) { toast('Skriv en værdi (0 eller mere)'); return; }
      S.networth = S.networth || { items: [] };
      let real = nwItems().find(i => i.id === x.id);
      if (!real) { real = { id: uid(), side: x.side, history: [] }; S.networth.items.push(real); }
      real.name = name; real.kind = kind;
      real.history = (real.history || []).filter(h => h.date !== date); real.history.push({ date, value: Math.round(val * 100) / 100 });
      save(); closeSheet(); render(); toast(isNew ? 'Tilføjet ✓' : 'Ny værdi gemt ✓');
    };
    const del = $('#nwDelItem', sheet); if (del) del.onclick = () => { if (!confirm(`Slet “${x.name}” og hele dens historik?`)) return; S.networth.items = nwItems().filter(i => i.id !== x.id); save(); closeSheet(); render(); toast('Slettet'); };
  });
}
function openNwUpdateAll() {
  const items = nwItems();
  openSheet(`${sheetHead('Opdatér værdier')}
    <p class="muted small">Skriv dagens værdi for hver post. Tomme felter beholder den seneste værdi.</p>
    <div class="field"><label for="nwAllDate">Dato</label><input class="input" type="date" id="nwAllDate" value="${todayISO()}"></div>
    <div class="list">${items.map(it => { const c = nwCur(it), k = NW_KINDS[it.side][it.kind] || ['📦']; return `<div class="row"><div class="avatar">${k[0]}</div><div class="main-col"><div class="title">${esc(it.name)}</div><div class="meta">seneste ${kr(c ? c.value : 0, false)}</div></div><input class="input" style="width:130px;text-align:right" inputmode="decimal" data-nwall="${it.id}" placeholder="${c ? nf0.format(c.value) : '0'}"></div>`; }).join('')}</div>
    <button class="btn btn-primary btn-block" style="margin-top:14px" id="nwAllSave">Gem alle</button>`, sheet => {
    $('#nwAllSave', sheet).onclick = () => {
      const date = $('#nwAllDate', sheet).value || todayISO(); let n = 0;
      sheet.querySelectorAll('[data-nwall]').forEach(inp => { const it = items.find(i => i.id === inp.dataset.nwall); const raw = inp.value.trim(); const v = raw ? parseAmount(raw) : nwCur(it)?.value; if (v == null || !(v >= 0)) return; it.history = (it.history || []).filter(h => h.date !== date); it.history.push({ date, value: Math.round(v * 100) / 100 }); n++; });
      save(); closeSheet(); render(); toast(`${n} værdier gemt for ${fmtDate(date)} ✓`);
    };
  });
}

/* ---------- Visning: Mere & Indstillinger ---------- */
function renderMere() {
  const tiles = [['budget', '🎯', 'Budget', 'Loft pr. kategori'], ['jobs', '💼', 'Mine jobs', 'Samlet & pr. job'], ['aarsoversigt', '📑', 'Årsoversigt til skat', 'Indtægter pr. job'], ['formue', '💎', 'Nettoformue', 'Aktiver minus gæld'], ['abonnementer', '✂️', 'Abonnementsjæger', 'Faste poster & besparelser'], ['sparetips', '💡', 'Sparetips', '20 tips alle burde kende'], ['skole', '🎓', 'Økonomiskolen', `${SCHOOL_LESSONS.length} lektioner om penge`], ['renter', '🧮', 'Renters rente', 'Beregner med graf'], ['hvadnu', '🔮', 'Hvad nu hvis', 'Prøv ændringer af'], ['indstillinger', '⚙️', 'Indstillinger', 'Kategorier, backup, import']];
  return `<div class="more-grid">${tiles.map(([r, e, t, d]) => `<a class="card more-tile" href="#/${r}"><div class="avatar">${e}</div><strong>${t}</strong><span>${d}</span></a>`).join('')}</div>`;
}
function renderIndstillinger() {
  const catRow = c => `<div class="row click" data-action="edit-cat" data-id="${c.id}"><div class="avatar" style="background:${c.color}22">${c.emoji}</div><div class="main-col"><div class="title">${esc(c.name)}</div><div class="meta">${c.budget > 0 ? 'Budget ' + kr(c.budget, false) : 'Intet budget'}</div></div><span style="width:14px;height:14px;border-radius:50%;background:${c.color}"></span></div>`;
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
      <p class="muted small">Indlæs et kontoudtog som CSV eller Excel. Eksport fra <strong>Lån & Spar Bank</strong> genkendes automatisk – andre banker (fx Danske Bank, Nordea, Jyske Bank) virker også; der vælger du selv kolonnerne.</p>
      <button class="btn btn-primary" data-action="import-csv">🏦 Importér kontoudtog (CSV/Excel)</button>
      <div class="field-row" style="margin-top:12px;align-items:end"><div class="field"><label for="importRemind">🔔 Påmindelse om import</label><select class="input" id="importRemind">${[[0, 'Fra'], [7, 'Hver uge'], [14, 'Hver 14. dag'], [30, 'Hver måned']].map(([v, l]) => `<option value="${v}" ${(S.settings.importReminder ?? 14) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><span class="lbl">Seneste import</span><div class="muted small" style="padding:10px 0">${lastImportDate() ? `${fmtDate(lastImportDate())} (${daysBetween(lastImportDate(), todayISO())} dage siden)` : 'Ingen endnu'}</div></div></div>
      <details class="tip"><summary>💡 Sådan henter du posteringer fra Lån & Spar</summary>
        <ol>
          <li>Log på netbanken på en computer, og klik på kontoen.</li>
          <li>Markér de posteringer, du vil have med, i afkrydsningsfeltet til venstre for datoen (det kan være svært at se).</li>
          <li>Vælg eksport nederst på skærmen, og vælg CSV (eller Excel).</li>
          <li>Vælg den hentede fil her – den hedder typisk <em>Posteringsdetaljer.csv</em>.</li>
        </ol>
        <p>Andre banker: Eksportér posteringer som CSV fra din netbank.</p>
      </details>
    </div>
  </div>
  <div class="card section" id="rulesCard"><h2>🧠 Lærte regler <small>${(S.rules || []).length} stk.</small></h2>
    <p class="muted small">Når du retter kategorien for en forretning (under import eller senere), husker appen det og bruger det automatisk næste gang – før de indbyggede regler.</p>
    ${(S.rules || []).length ? `<div class="list">${[...S.rules].sort((a, b) => (b.updated || '').localeCompare(a.updated || '')).map(r => { const c = cat(r.categoryId); const j = job(r.jobId); return `<div class="row">
      <div class="avatar" style="background:${c.color}22">${c.emoji}</div>
      <div class="main-col"><div class="title">“${esc(r.key)}” → ${esc(c.name)}${j ? ` · ${j.emoji} ${esc(j.name)}` : ''}</div><div class="meta">${r.type === 'income' ? 'Indtægt' : 'Udgift'}${r.example ? ` · fx “${esc(r.example)}”` : ''}${r.updated ? ` · ${fmtDate(r.updated)}` : ''}</div></div>
      <button class="icon-btn" data-action="delete-rule" data-id="${r.id}" aria-label="Slet regel" title="Slet regel">🗑️</button></div>`; }).join('')}</div>
    <div class="btn-row" style="margin-top:10px"><button class="btn btn-sm btn-danger" data-action="clear-rules">Slet alle regler</button></div>`
    : '<p class="muted small">Ingen lærte regler endnu.</p>'}
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
function openSheet(html, onMount, cls = '') {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="overlay" data-close-overlay><div class="sheet ${cls}" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div></div>`;
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
  const t = tx ? { ...tx } : { type: preset.type || 'expense', amount: preset.amount || '', date: selMonth === curMonth() ? todayISO() : `${selMonth}-01`, categoryId: preset.categoryId || null, note: preset.note || '', jobId: preset.jobId };
  if (!t.categoryId) t.categoryId = t.type === 'expense' ? (recentExpenseCats()[0] || catsOf('expense')[0]?.id) : (S.categories.find(c => c.id === 'c-lon')?.id || catsOf('income')[0]?.id);
  const rec = tx?.recurringId ? S.recurring.find(r => r.id === tx.recurringId) : null;
  openSheet(`${sheetHead(isNew ? 'Ny postering' : 'Rediger postering')}
    <div class="segmented" id="typeSeg"><button type="button" data-t="expense" class="exp ${t.type === 'expense' ? 'on' : ''}">− Udgift</button><button type="button" data-t="income" class="inc ${t.type === 'income' ? 'on' : ''}">＋ Indtægt</button></div>
    <div class="field"><input class="input amount-input" id="fAmount" inputmode="decimal" placeholder="0,00 kr" value="${t.amount !== '' ? nf2.format(t.amount) : ''}" autofocus aria-label="Beløb"></div>
    <div class="field"><span class="lbl">Kategori</span><div id="chipWrap">${chipsHTML(t.type, t.categoryId)}</div></div>
    <div class="field" id="jobField" style="${t.type === 'income' && S.jobs.length ? '' : 'display:none'}"><span class="lbl">Job</span><div id="jobWrap">${jobChipsHTML(t.jobId ?? (t.type === 'income' ? jobForCategory(t.categoryId) : ''))}</div></div>
    <div class="field-row"><div class="field"><label for="fDate">Dato · <span id="fDateTxt">${fmtDate(t.date)}</span></label><input class="input" type="date" id="fDate" value="${t.date}"></div>
      <div class="field"><label for="fNote">Note</label><input class="input" id="fNote" placeholder="Fx Netto, PT-klient…" value="${esc(t.note)}"></div></div>
    ${isNew ? `<label class="switch"><span>🔁 Gentag hver måned <span class="muted small">(fast post)</span></span><input type="checkbox" id="fRec"></label>` : ''}
    ${rec ? `<p class="muted small">🔁 Denne postering kommer fra den faste post <strong>${esc(rec.name)}</strong>. Ændringer her gælder kun denne måned. <a href="#" data-action="edit-rec" data-id="${rec.id}">Rediger den faste post</a></p>` : ''}
    <div class="btn-row" style="margin-top:6px">
      <button class="btn btn-primary" style="flex:1" id="fSave">${isNew ? 'Gem postering' : 'Gem ændringer'}</button>
      ${isNew ? '' : '<button class="btn btn-danger" id="fDel">Slet</button>'}
    </div>`, sheet => {
    let type = t.type, catId = t.categoryId, jobId = t.jobId ?? (t.type === 'income' ? jobForCategory(t.categoryId) : '');
    const setJob = v => { jobId = v || ''; $('#jobWrap', sheet).innerHTML = jobChipsHTML(jobId); bindChips(sheet, 'job', x => jobId = x); };
    const pickCat = v => { catId = v; if (type === 'income') setJob(jobForCategory(v, $('#fNote', sheet).value)); };
    const seg = $('#typeSeg', sheet);
    seg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; type = b.dataset.t;
      $$('button', seg).forEach(x => x.classList.toggle('on', x === b));
      catId = type === 'income' ? (S.categories.find(c => c.id === 'c-lon')?.id || catsOf('income')[0]?.id) : (recentExpenseCats()[0] || catsOf('expense')[0]?.id);
      $('#chipWrap', sheet).innerHTML = chipsHTML(type, catId); bindChips(sheet, 'cat', pickCat);
      $('#jobField', sheet).style.display = type === 'income' && S.jobs.length ? '' : 'none';
      if (type === 'income') setJob(jobForCategory(catId));
    });
    bindChips(sheet, 'cat', pickCat);
    bindChips(sheet, 'job', x => jobId = x);
    $('#fDate', sheet).addEventListener('change', e => { $('#fDateTxt', sheet).textContent = fmtDate(e.target.value); });
    $('#fSave', sheet).onclick = () => {
      const amount = Math.abs(parseAmount($('#fAmount', sheet).value));
      const date = $('#fDate', sheet).value;
      if (!(amount > 0)) { toast('Skriv et beløb større end 0'); $('#fAmount', sheet).focus(); return; }
      if (!date) { toast('Vælg en dato'); return; }
      const note = $('#fNote', sheet).value.trim();
      const jobPart = type === 'income' && job(jobId) ? { jobId } : {};
      let learnedNow = '';
      if (isNew) {
        if ($('#fRec', sheet)?.checked) {
          const r = { id: uid(), type, amount, categoryId: catId, name: note || cat(catId).name, day: Number(date.slice(8)), startMonth: date.slice(0, 7), kind: catId === 'c-abonnement' ? 'abonnement' : 'fast', skipped: [], ...jobPart };
          S.recurring.push(r);
          S.transactions.push({ id: uid(), type, amount, date, categoryId: catId, note: r.name, recurringId: r.id, ...jobPart });
        } else S.transactions.push({ id: uid(), type, amount, date, categoryId: catId, note, ...jobPart });
        if (type === 'expense') lastUsed(catId);
      } else {
        const changedCat = tx.categoryId !== catId || (type === 'income' && (tx.jobId || '') !== (jobPart.jobId || ''));
        Object.assign(tx, { type, amount, date, categoryId: catId, note }); if (jobPart.jobId) tx.jobId = jobPart.jobId; else delete tx.jobId;
        if (changedCat && note && learnRule(note, type, catId, jobPart.jobId)) learnedNow = normalizeMerchant(note);
      }
      save(); closeSheet(); selMonth = date.slice(0, 7); render(); toast(isNew ? 'Postering gemt ✓' : learnedNow ? `Gemt ✓ · husker “${learnedNow}” som ${cat(catId).name} 🧠` : 'Ændringer gemt ✓');
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
  let val = '', mode = 'expense';
  const cats = recentExpenseCats();
  let catId = cats[0];
  const lastJob = [...S.transactions].filter(t => t.type === 'income' && job(t.jobId)).sort((a, b) => b.date.localeCompare(a.date))[0]?.jobId;
  let jobId = lastJob || S.jobs[0]?.id;
  const chips = () => mode === 'expense'
    ? cats.map(id => { const c = cat(id); return `<button type="button" class="chip ${id === catId ? 'on' : ''}" data-val="${id}">${c.emoji} ${esc(c.name)}</button>`; }).join('')
    : S.jobs.map(j => `<button type="button" class="chip ${j.id === jobId ? 'on' : ''}" data-val="${j.id}">${j.emoji} ${esc(j.name)}</button>`).join('');
  openSheet(`${sheetHead('⚡ Hurtig registrering')}
    ${S.jobs.length ? `<div class="segmented" id="qaSeg"><button type="button" data-m="expense" class="exp on">− Udgift</button><button type="button" data-m="income" class="inc">＋ Indtægt</button></div>` : ''}
    <div class="qa-amount"><span id="qaVal">0</span><span class="cur">kr</span></div>
    <div class="qa-sub" id="qaSub">${fmtDate(todayISO())} · vælg kategori og gem</div>
    <div class="chips" data-chips="qa" id="qaChips" style="justify-content:center">${chips()}</div>
    <div class="keypad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'].map(k => `<button type="button" data-k="${k}">${k}</button>`).join('')}</div>
    <div class="btn-row"><button class="btn" id="qaMore">Flere detaljer</button><button class="btn btn-primary" style="flex:1" id="qaSave">Gem udgift</button></div>`, sheet => {
    const show = () => { $('#qaVal', sheet).textContent = val ? (val.includes(',') ? nf0.format(Math.floor(parseAmount(val) || 0)) + ',' + val.split(',')[1] : nf0.format(parseAmount(val) || 0)) : '0'; };
    const bind = () => bindChips(sheet, 'qa', v => { if (mode === 'expense') catId = v; else jobId = v; });
    $('.keypad', sheet).addEventListener('click', e => {
      const k = e.target.closest('button')?.dataset.k; if (!k) return;
      if (navigator.vibrate) navigator.vibrate(8);
      if (k === '⌫') val = val.slice(0, -1);
      else if (k === ',') { if (!val.includes(',')) val = (val || '0') + ','; }
      else if (val.includes(',') ? val.split(',')[1].length < 2 : val.replace(/^0/, '').length < 7) val = (val === '0' ? '' : val) + k;
      show();
    });
    $('#qaSeg', sheet)?.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; mode = b.dataset.m;
      $$('#qaSeg button', sheet).forEach(x => x.classList.toggle('on', x === b));
      $('#qaChips', sheet).innerHTML = chips(); bind();
      $('#qaSub', sheet).textContent = `${fmtDate(todayISO())} · ${mode === 'expense' ? 'vælg kategori' : 'vælg job'} og gem`;
      $('#qaSave', sheet).textContent = mode === 'expense' ? 'Gem udgift' : 'Gem indtægt';
    });
    bind();
    $('#qaMore', sheet).onclick = () => { closeSheet(); openTxModal(null, mode === 'expense' ? { type: 'expense', amount: parseAmount(val) || '', categoryId: catId } : { type: 'income', amount: parseAmount(val) || '', categoryId: job(jobId)?.categoryId, jobId }); };
    $('#qaSave', sheet).onclick = () => {
      const amount = parseAmount(val);
      if (!(amount > 0)) { toast('Tast et beløb'); return; }
      if (mode === 'expense') {
        S.transactions.push({ id: uid(), type: 'expense', amount, date: todayISO(), categoryId: catId, note: cat(catId).name });
        lastUsed(catId); save(); closeSheet(); selMonth = curMonth(); render(); toast(`${cat(catId).emoji} ${kr(amount)} gemt ✓`);
      } else {
        const j = job(jobId); const cid = j && S.categories.some(c => c.id === j.categoryId) ? j.categoryId : (catsOf('income')[0]?.id);
        S.transactions.push({ id: uid(), type: 'income', amount, date: todayISO(), categoryId: cid, note: j ? j.name : cat(cid).name, ...(j ? { jobId: j.id } : {}) });
        save(); closeSheet(); selMonth = curMonth(); render(); toast(`${j ? j.emoji : '💰'} +${kr(amount)} gemt ✓`);
      }
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
    <div class="field" id="rJobField" style="${x.type === 'income' ? '' : 'display:none'}"><label for="rJob">Job</label><select class="input" id="rJob"><option value="">Intet job</option>${S.jobs.map(j => `<option value="${j.id}" ${j.id === x.jobId ? 'selected' : ''}>${j.emoji} ${esc(j.name)}</option>`).join('')}</select></div>
    <div class="field-row"><div class="field"><label for="rKind">Type</label><select class="input" id="rKind"><option value="fast" ${x.kind !== 'abonnement' ? 'selected' : ''}>Fast udgift/indtægt</option><option value="abonnement" ${x.kind === 'abonnement' ? 'selected' : ''}>Abonnement</option></select></div>
      <div class="field"><label for="rStart">Start fra måned</label><input class="input" id="rStart" type="month" value="${x.startMonth}"></div></div>
    <p class="muted small">Posten bogføres automatisk hver måned fra startmåneden.</p>
    <div class="btn-row"><button class="btn btn-primary" style="flex:1" id="rSave">Gem</button>
      ${isNew ? '' : `<button class="btn" id="rStop">⏹️ Stop efter denne md.</button><button class="btn btn-danger" id="rDel">Slet</button>`}</div>`, sheet => {
    let type = x.type, catId = x.categoryId;
    $('#rType', sheet).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; type = b.dataset.t; $$('#rType button', sheet).forEach(q => q.classList.toggle('on', q === b)); catId = catsOf(type)[0]?.id; $('#rChipWrap', sheet).innerHTML = chipsHTML(type, catId, 'rcat'); bindChips(sheet, 'rcat', v => catId = v); $('#rJobField', sheet).style.display = type === 'income' ? '' : 'none'; });
    bindChips(sheet, 'rcat', v => catId = v);
    $('#rSave', sheet).onclick = () => {
      const amount = Math.abs(parseAmount($('#rAmount', sheet).value)); const name = $('#rName', sheet).value.trim() || cat(catId).name;
      if (!(amount > 0)) { toast('Skriv et beløb'); return; }
      const day = Math.min(31, Math.max(1, Number($('#rDay', sheet).value) || 1));
      const data = { type, amount, name, day, categoryId: catId, kind: $('#rKind', sheet).value, startMonth: $('#rStart', sheet).value || curMonth() };
      const jid = type === 'income' ? $('#rJob', sheet).value : '';
      if (isNew) S.recurring.push({ id: uid(), skipped: [], ...data, ...(jid ? { jobId: jid } : {}) });
      else {
        Object.assign(r, data); if (jid) r.jobId = jid; else delete r.jobId;
        // Opdater indeværende måneds postering, så tallene passer med det samme
        const t = S.transactions.find(t => t.recurringId === r.id && t.date.startsWith(curMonth()));
        if (t) { Object.assign(t, { type, amount, categoryId: catId, note: name, date: `${curMonth()}-${pad(Math.min(day, dim(curMonth())))}` }); if (jid) t.jobId = jid; else delete t.jobId; }
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
    <div class="btn-row"><button class="btn btn-primary" style="flex:1" id="kSave">Gem</button>${isNew ? '' : `<button class="btn btn-danger" id="kDel">Slet</button>`}</div>
    ${used ? `<p class="muted small">Bruges af ${used} posteringer. Sletter du kategorien, flyttes de til “Andet”.</p>` : ''}`, sheet => {
    let emoji = x.emoji, color = x.color;
    bindChips(sheet, 'kemoji', v => emoji = v);
    $('#kColors', sheet).addEventListener('click', e => { const d = e.target.closest('.color-dot'); if (!d) return; color = d.dataset.c; $$('.color-dot', sheet).forEach(q => q.classList.toggle('on', q === d)); });
    $('#kSave', sheet).onclick = () => {
      const name = $('#kName', sheet).value.trim(); if (!name) { toast('Giv kategorien et navn'); return; }
      const data = { name, emoji, color };
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
/* Indbyggede danske regler (tekst -> kategori). Lærte regler (S.rules) har altid forrang. */
const CSV_RULES = [
  [/netflix|spotify|hbo|max\.com|viaplay|disney\s?\+?|skyshowtime|tv ?2 ?play|youtube|apple\.com|icloud|itunes|google (one|play|storage)|amazon prime|prime video|podimo|mofibo|storytel|nextory|audible|saxo premium|chatgpt|openai|adobe|microsoft 365|office 365|dropbox|patreon|playstation plus|xbox game pass|nintendo|allente|boxer|filmstriben|blockbuster|dazn|discovery\+|crunchyroll|deezer|tidal/i, 'c-abonnement'],
  [/netto|føtex|fotex|bilka|rema ?1000|\brema\b|lidl|coop ?365|365 ?discount|\bcoop\b|kvickly|superbrugsen|dagli'?brugsen|\bbrugsen\b|\birma\b|\bmeny\b|\bspar\b|min købmand|løvbjerg|\baldi\b|\bfakta\b|nemlig\.?com|wolt market|lokal brugs|fødevarer|slagter|grønthandel|frugt ?& ?grønt|naturli|too good to go/i, 'c-mad'],
  [/restaurant|\bcafe\b|café|mcdonald|\bmcd\b|burger king|max burgers|sunset ?boulevard|\bpizza|sushi|\bwolt\b|just ?eat|hungry|foodora|joe & the juice|joe and the juice|starbucks|espresso house|baresso|lagkagehuset|emmerys|\bbager|bageri|kebab|shawarma|grillbar|7-eleven|7 eleven|\bkfc\b|subway|domino|jensens bøfhus|o'learys|bistro|\bbar\b|bodega|cocktail|ølbar|street food|reffen|tapas|thai|vietnam|ramen/i, 'c-ude'],
  [/husleje|boligforening|boligselskab|andelsbolig|boligafgift|fællesudgift|ejerforening|grundejerforening|realkredit|nykredit|totalkredit|\bdlr\b|bolig ?leje|ejendomsadm|ejendom/i, 'c-bolig'],
  [/ørsted|orsted|andel energi|norlys energi|\bnorlys\b(?! fiber)|\bewii\b|\bseas\b|\bnve\b|\bnrgi\b|modstrøm|vindstød|true energy|velkommen energi|energi ?fyn|\baura\b|\bhofor\b|vandværk|\bvand\b|fjernvarme|varmeværk|forsyning|elselskab|radius|cerius|\bevida\b|naturgas|affald|renovation|el ?a ?conto|energi/i, 'c-el'],
  [/telenor|telia|yousee|\bcbb\b|lebara|oister|\bhiper\b|fastspeed|3 ?mobil|\b3\.dk\b|norlys fiber|stofa|\bwaoo\b|fibia|eniig|greenspeed|call ?me|\bduka\b|lycamobile|altibox|kviknet|nuuday|bredbånd|mobilabonnement/i, 'c-telefon'],
  [/tryg|topdanmark|alm\.? ?brand|codan|\bif skade|\bif forsikring|gjensidige|\blb forsikring|lærerstandens|købstædernes|\bgf forsikring|privatsikring|tjenestemændenes|sygeforsikring|forsikring/i, 'c-forsikring'],
  [/a-kasse|akasse|a kasse|fagforening|danske fysioterapeuter|fysioterapeuter|\bftf\b|\base\b|krifa|det faglige hus|\bhk\b|\b3f\b|dansk metal|djøf|\bida\b|magistrenes|\bma ?-?kasse|faglig fælles|lederne|kristelig fagbevægelse|fagligt fælles/i, 'c-fag'],
  [/\bdsb\b|rejsekort|movia|\bmetro\b|letbane|arriva|gomore|flixbus|\bq8\b|okq8|circle ?k|\bshell\b|uno-?x|\bingo\b|ok benzin|ok plus|\bf24\b|\bgoon\b|benzin|diesel|tankstation|parkering|easypark|parkman|apcoa|europark|q-park|bycykel|bycyklen|donkey republic|\blime\b|\bvoi\b|\btier\b|\btaxi\b|dantaxi|\buber\b|\bbolt\b|storebælt|brobizz|øresundsbro|\bclever\b|spirii|\bmonta\b|cykelreparation|cykelsmed|bilsyn|autoværksted|vejhjælp|falck/i, 'c-transport'],
  [/fitness|\bsats\b|puregym|loop fitness|fresh fitness|crossfit|apotek|tandlæge|\blæge|optiker|synoptik|profil optik|kiropraktor|massage|psykolog|\byoga\b|fysioterapi|løbeshop|running/i, 'c-sundhed'],
  [/h&m|\bhm\.com|zalando|magasin|\bmatas\b|\bnormal\b|elgiganten|\bpower\b|\bikea\b|\bjysk\b|\bzara\b|boozt|amazon|\btemu\b|shein|aliexpress|bahne|sport ?24|intersport|stadium|salling|søstrene grene|flying tiger|clas ohlson|bauhaus|silvan|harald nyborg|xl-byg|jem & fix|imerco|bog & idé|proshop|komplett|computersalg|coolshop|lyko|kop & kande|vinted|\bdba\b|apple store|samsung|lagerbutik/i, 'c-shopping'],
  [/biograf|nordisk film|\bkino\b|cinemaxx|tivoli|billetlugen|ticketmaster|billetnet|eventim|koncert|museum|\bzoo\b|bowling|\bpadel|\bsteam\b|playstation store|\blego\b|legoland|bakken|experimentarium|booking\.com|hotels\.com|\bhotel|\bsas\b|norwegian|ryanair|easyjet|ferie|rejsebureau|sportigan|holdsport/i, 'c-fritid']
];
const STOP_WORDS = new Set(['nota', 'nr', 'visa', 'dankort', 'mastercard', 'debit', 'kortkøb', 'køb', 'betaling', 'dk', 'aps', 'a/s', 'as', 'den', 'kl', 'fra', 'til', 'og', 'dkk', 'kr', 'mc', 'vd', 'ref']);
/* Normaliserer en bankpostering til en "forretning", fx "Netto Valby 1234 Nota 5678" -> "netto valby" */
function normalizeMerchant(text) {
  let s = String(text || '').split(' · ')[0].toLowerCase();
  s = s.replace(/\b\d{1,2}[.\-/]\d{1,2}([.\-/]\d{2,4})?\b/g, ' ').replace(/[*#:;,()"'’|/\\]/g, ' ').replace(/\S+/g, w => (/^[\d.\-+]+$/.test(w) || (w.match(/\d/g) || []).length >= 3) ? ' ' : w).replace(/[^a-z0-9æøåäöüé&+\- ]/g, ' ').replace(/\s+/g, ' ').trim();
  return s.split(' ').filter(w => w.length > 1 && !STOP_WORDS.has(w)).slice(0, 3).join(' ');
}
function ruleFor(text, type) {
  const key = normalizeMerchant(text); if (!key) return null;
  return (S.rules || []).filter(r => r.type === type && (key === r.key || key.startsWith(r.key + ' ')) && S.categories.some(c => c.id === r.categoryId))
    .sort((a, b) => b.key.length - a.key.length)[0] || null;
}
function learnRule(text, type, categoryId, jobId) {
  const key = normalizeMerchant(text); if (!key || !categoryId) return false;
  S.rules = S.rules || [];
  let r = S.rules.find(x => x.key === key && x.type === type);
  if (!r) { r = { id: uid(), key, type, categoryId, count: 0, example: String(text).split(' · ')[0].slice(0, 60) }; S.rules.push(r); }
  r.categoryId = categoryId; r.count = (r.count || 0) + 1; r.updated = todayISO();
  if (type === 'income' && job(jobId)) r.jobId = jobId; else delete r.jobId;
  return true;
}
/* Klassificér: lærte regler > indbyggede regler > standard */
function classify(text, type) {
  const r = ruleFor(text, type);
  if (r) return { categoryId: r.categoryId, jobId: type === 'income' ? (job(r.jobId) ? r.jobId : jobForCategory(r.categoryId, text)) : '', source: 'rule' };
  const categoryId = guessCat(text, type);
  return { categoryId, jobId: type === 'income' ? jobForCategory(categoryId, text) : '', source: 'builtin' };
}
function guessCat(text, type) {
  const has = id => S.categories.some(c => c.id === id);
  if (type === 'income') {
    if (/airbnb|udlejning|husleje fra|lejeindtægt|lejer/i.test(text) && has('c-udlejning')) return 'c-udlejning';
    if (/\bløn\b|lønoverførsel|loen|salary|feriepenge|handicapformidling|lønudbetaling/i.test(text) && has('c-lon')) return 'c-lon';
    if (/\bpt\b|personlig træning|træning|mobilepay|mobile pay/i.test(text) && has('c-pt')) return 'c-pt';
    return S.categories.find(c => c.id === 'c-indt-andet')?.id || catsOf('income')[0].id;
  }
  for (const [re, id] of CSV_RULES) if (re.test(text) && has(id)) return id;
  return S.categories.find(c => c.id === 'c-andet')?.id || catsOf('expense')[0].id;
}
function loadScript(src) {
  return new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}
async function fileToRows(file) {
  if (/\.(xlsx|xls)$/i.test(file.name) || /spreadsheet|ms-excel/.test(file.type)) {
    await loadScript('vendor/xlsx.mini.min.js');
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
    const cell = c => c instanceof Date ? `${pad(c.getDate())}-${pad(c.getMonth() + 1)}-${c.getFullYear()}`
      : typeof c === 'number' ? (Number.isInteger(c) && Math.abs(c) > 9999999 ? String(c) : c.toFixed(2).replace('.', ',')) : String(c).trim();
    return { rows: raw.map(r => r.map(cell)).filter(r => r.some(c => c !== '')), delim: 'xlsx' };
  }
  return parseCSV(await readFile(file));
}
/* Lån & Spar Bank (SDC-netbank) "Posteringsdetaljer": ingen overskrifter, ; som separator, UTF-8 med BOM,
   16 kolonner: 0 tekst fra afsender, 1 posteringstekst, 2 fra-konto, 3 til-konto, 4 beløb (med fortegn, dansk format),
   5 godkendt af, 7 oprettet, 8 bogføringsdato, 9 rentedato, 10 dispositionsdato (dd-mm-åååå), 11-12 referencer, 15 modtager. */
function detectLSB(rows) {
  const sample = rows.slice(0, 40);
  if (!sample.length) return null;
  const ok = sample.filter(r => r.length >= 11 && /^-?[\d.]*\d(,\d{1,2})?$/.test((r[4] || '').trim()) && /^\d{2}-\d{2}-\d{4}$/.test((r[8] || '').trim()) && (r[1] || '').trim());
  if (ok.length < Math.max(1, sample.length * 0.8)) return null;
  const counts = {};
  ok.forEach(r => { const acc = (parseAmount(r[4]) < 0 ? r[2] : r[3]).trim(); if (acc) counts[acc] = (counts[acc] || 0) + 1; });
  const account = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  return { bank: 'Lån & Spar Bank', format: 'Posteringsdetaljer', date: 8, text: 1, amount: 4, hasHeader: false, account,
    textOf: r => { const a = (r[1] || '').trim(), b = (r[0] || '').trim(); return b && b.toLowerCase() !== a.toLowerCase() ? `${a} · ${b}` : a; },
    isTransfer: r => !!((r[2] || '').trim() && (r[3] || '').trim() && /^(til|fra|overf)/i.test((r[1] || '').trim())) };
}
function guessColumns(rows) {
  const header = rows[0] || [];
  const ncol = Math.max(...rows.slice(0, 20).map(r => r.length));
  const find = re => header.findIndex(h => re.test(h));
  let cDate = find(/^(bogf.*dato|dato|date|posteringsdato|bogført)/i), cText = find(/tekst|beskriv|text|modtager|description|posteringstekst/i), cAmt = find(/bel[øo]b|amount|beloeb/i);
  const sample = rows.slice(1, 8).length ? rows.slice(1, 8) : rows.slice(0, 7);
  const cols = [...Array(ncol).keys()];
  if (cDate < 0) cDate = cols.find(i => sample.every(r => parseDateDK(r[i]))) ?? 0;
  const money = v => /^-?[\d.]*\d,\d{2}$/.test((v || '').trim());
  if (cAmt < 0) cAmt = cols.find(i => i !== cDate && sample.every(r => money(r[i]))) ?? cols.find(i => i !== cDate && sample.every(r => !isNaN(parseAmount(r[i])) && String(r[i]).replace(/\D/g, '').length < 10)) ?? 1;
  if (cText < 0) cText = cols.find(i => i !== cDate && i !== cAmt && sample.some(r => /[a-zæøå]{3}/i.test(r[i] || ''))) ?? cols.find(i => i !== cDate && i !== cAmt) ?? 2;
  return { ncol, header, date: cDate, text: cText, amount: cAmt, hasHeader: !parseDateDK(header[cDate]) && isNaN(parseAmount(header[cAmt])) };
}
const matchKey = r => r.matchKey || normalizeMerchant(r.name);
function prettyName(note) {
  let s = String(note || '').split(' · ')[0].replace(/\S*\d\S*/g, ' ').replace(/\s+/g, ' ').trim();
  if (s && s === s.toUpperCase()) s = s.toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase());
  return s.slice(0, 40) || 'Fast post';
}
const median = arr => { const a = [...arr].sort((x, y) => x - y); const m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
/* Find forretninger der går igen ca. hver måned med nogenlunde samme beløb (import + eksisterende historik) */
function detectRecurring(rows) {
  const groups = {};
  const add = (key, type, date, amount, note, src) => { const k = type + '|' + key; (groups[k] = groups[k] || { key, type, items: [] }).items.push({ date, amount, note, src }); };
  rows.filter(r => r.include && !r.dupe && !r.recurringId && r.key).forEach(r => add(r.key, r.type, r.date, r.amount, r.note, r));
  const keys = new Set(Object.keys(groups));
  S.transactions.filter(t => !t.recurringId && t.note).forEach(t => { const k = normalizeMerchant(t.note); if (k && keys.has(t.type + '|' + k)) add(k, t.type, t.date, t.amount, t.note, null); });
  const out = [];
  for (const g of Object.values(groups)) {
    const imp = g.items.filter(i => i.src); if (!imp.length) continue;
    const byMonth = {}; g.items.forEach(i => (byMonth[i.date.slice(0, 7)] = byMonth[i.date.slice(0, 7)] || []).push(i));
    const months = Object.keys(byMonth).sort();
    if (months.length < 3 || Object.values(byMonth).some(a => a.length > 2) || g.items.length / months.length > 1.3) continue;
    const span = monthDiff(months[0], months[months.length - 1]) + 1;
    if (months.length / span < 0.75) continue;
    const med = median(g.items.map(i => i.amount));
    const tol = Math.max(25, med * 0.15);
    if (g.items.filter(i => Math.abs(i.amount - med) > tol).length > g.items.length * 0.2) continue;
    const lastRow = imp.sort((a, b) => b.date.localeCompare(a.date))[0].src;
    const catId = lastRow.categoryId;
    const exists = S.recurring.some(r => isActiveRec(r) && r.type === g.type && (
      matchKey(r) === g.key || g.key.startsWith(matchKey(r) + ' ') || (matchKey(r) && matchKey(r).startsWith(g.key + ' ')) ||
      (r.categoryId === catId && Math.abs(r.amount - med) <= Math.max(5, med * 0.03))));
    if (exists) continue;
    out.push({ id: g.type + '|' + g.key, key: g.key, type: g.type, name: prettyName(lastRow.note), amount: Math.round(med * 100) / 100,
      day: Math.round(median(g.items.map(i => Number(i.date.slice(8))))), months: months.length, last: months[months.length - 1],
      categoryId: catId, jobId: lastRow.jobId, rowIds: imp.map(i => i.src.id) });
  }
  return out.sort((a, b) => b.amount - a.amount);
}
async function openCsvImport(file) {
  let parsed;
  try { parsed = await fileToRows(file); } catch (e) { toast('Kunne ikke læse filen'); return; }
  const { rows: raw, delim } = parsed;
  if (!raw.length) { toast('Filen ser tom ud'); return; }
  const lsb = detectLSB(raw), g = guessColumns(raw), ncol = g.ncol;
  const m0 = lsb ? { date: lsb.date, text: lsb.text, amount: lsb.amount, hasHeader: false } : g;
  const colName = i => g.hasHeader && !lsb ? (g.header[i] || `Kolonne ${i + 1}`) : `Kolonne ${i + 1}${raw[0][i] ? ' – ' + String(raw[0][i]).slice(0, 18) : ''}`;
  const colOpts = sel => [...Array(ncol).keys()].map(i => `<option value="${i}" ${i === sel ? 'selected' : ''}>${esc(colName(i))}</option>`).join('');
  const transfers = lsb ? raw.filter(lsb.isTransfer).length : 0;
  let rows = [], suggestions = [], dismissed = new Set(), suggAll = false;
  openSheet(`${sheetHead('🏦 Gennemse import')}
    ${lsb ? `<div class="banner ok"><span>✅</span><div class="grow"><strong>Genkendt: ${lsb.bank}</strong> (${lsb.format}${lsb.account ? ' · konto ' + esc(lsb.account) : ''}). Kolonnerne er sat op automatisk.</div></div>`
      : `<p class="muted small">Fundet ${raw.length} rækker${delim === 'xlsx' ? ' i Excel-arket' : ` · separator “${delim === '\t' ? 'tab' : delim}”`}. Vælg hvilke kolonner der indeholder dato, tekst og beløb.</p>`}
    <details class="map" ${lsb ? '' : 'open'}><summary>Kolonner</summary>
      <div class="field-row" style="grid-template-columns:1fr 1fr 1fr;margin-top:10px">
        <div class="field"><label>Dato</label><select class="input" id="mDate">${colOpts(m0.date)}</select></div>
        <div class="field"><label>Tekst</label><select class="input" id="mText">${colOpts(m0.text)}</select></div>
        <div class="field"><label>Beløb</label><select class="input" id="mAmt">${colOpts(m0.amount)}</select></div>
      </div>
      <label class="switch"><span>Første række er overskrifter</span><input type="checkbox" id="mHead" ${m0.hasHeader ? 'checked' : ''}></label>
    </details>
    ${transfers ? `<label class="switch"><span>Spring kontooverførsler over <span class="muted small">(${transfers} “Til/Fra …”-overførsler mellem konti)</span></span><input type="checkbox" id="mSkipTr"></label>` : ''}
    <div id="rvSummary" class="rv-summary"></div>
    <div id="rvSugg"></div>
    <p class="muted small" style="margin:4px 2px 10px">Ret kategori${S.jobs.length ? ' og job' : ''} direkte i listen – appen husker dit valg for den forretning næste gang. Markér flere for at ændre dem på én gang.</p>
    <div id="rvList"></div>
    <div class="rv-bar" id="rvBar"></div>`, sheet => {
    const isDupe = n => S.transactions.some(t => t.date === n.date && Math.abs(t.amount - n.amount) < .005 && t.type === n.type && (t.note || '') === n.note);
    const build = () => {
      const d = +$('#mDate', sheet).value, tx = +$('#mText', sheet).value, a = +$('#mAmt', sheet).value;
      const useLsb = lsb && d === lsb.date && tx === lsb.text && a === lsb.amount;
      const skipTr = $('#mSkipTr', sheet)?.checked;
      const body = $('#mHead', sheet).checked ? raw.slice(1) : raw;
      const active = S.recurring.filter(isActiveRec);
      const seen = new Set();
      rows = body.map(r => {
        if (skipTr && lsb.isTransfer(r)) return null;
        const date = parseDateDK(r[d]); const amount = parseAmount(r[a]);
        if (!date || isNaN(amount) || amount === 0) return null;
        const type = amount < 0 ? 'expense' : 'income';
        const note = (useLsb ? lsb.textOf(r) : String(r[tx] || '')).replace(/\s+/g, ' ').trim().slice(0, 90);
        const c = classify(note, type);
        const o = { id: uid(), date, amount: Math.abs(amount), type, note, key: normalizeMerchant(note), categoryId: c.categoryId, jobId: c.jobId, source: c.source, include: true, sel: false, user: false };
        const sig = `${date}|${o.amount}|${type}|${note}`;
        o.dupe = isDupe(o) || seen.has(sig); seen.add(sig);
        if (o.dupe) o.include = false;
        else {
          const rec = active.find(x => x.type === type && matchKey(x) && (o.key === matchKey(x) || o.key.startsWith(matchKey(x) + ' ')) && Math.abs(x.amount - o.amount) <= Math.max(5, x.amount * 0.15));
          if (rec) { o.recurringId = rec.id; o.matched = rec.name; if (o.source !== 'rule') { o.categoryId = rec.categoryId; if (type === 'income' && job(rec.jobId)) o.jobId = rec.jobId; } }
        }
        return o;
      }).filter(Boolean);
      suggestions = detectRecurring(rows);
    };
    const catOpts = (type, sel) => catsOf(type).map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${c.emoji} ${esc(c.name)}</option>`).join('');
    const jobOpts = sel => `<option value="">Intet job</option>` + S.jobs.map(j => `<option value="${j.id}" ${j.id === sel ? 'selected' : ''}>${j.emoji} ${esc(j.name)}</option>`).join('');
    const rowHTML = r => `<div class="rv-row ${r.include ? '' : 'off'} ${r.sel ? 'sel' : ''}" data-rid="${r.id}">
      ${r.dupe ? '<span class="rv-sel-ph"></span>' : `<input type="checkbox" class="rv-sel" data-rid="${r.id}" ${r.sel ? 'checked' : ''} aria-label="Markér">`}
      <div class="rv-main">
        <div class="rv-top"><span class="rv-note">${esc(r.note || '(ingen tekst)')}</span><span class="rv-amt ${r.type === 'income' ? 'pos' : ''}">${r.type === 'income' ? '+' : '−'}${kr(r.amount)}</span></div>
        <div class="rv-sub"><span class="rv-date">${fmtDate(r.date)}</span>
          ${r.dupe ? '<span class="pill">Dublet – springes over</span>' : `<select class="mini rv-cat" data-rid="${r.id}" aria-label="Kategori">${catOpts(r.type, r.categoryId)}</select>
          ${r.type === 'income' && S.jobs.length ? `<select class="mini rv-job" data-rid="${r.id}" aria-label="Job">${jobOpts(r.jobId)}</select>` : ''}
          ${r.matched ? `<span class="pill accent">🔁 ${esc(r.matched)}</span>` : ''}${r.source === 'rule' && !r.user ? '<span class="pill ok">🧠 lært</span>' : ''}`}
        </div>
      </div>
      ${r.dupe ? '' : `<button type="button" class="rv-inc ${r.include ? 'on' : ''}" data-rid="${r.id}" title="${r.include ? 'Medtages – tryk for at udelade' : 'Udeladt – tryk for at medtage'}" aria-label="${r.include ? 'Udelad' : 'Medtag'}">${r.include ? '✓' : '✕'}</button>`}
    </div>`;
    const renderReview = () => {
      const scroller = sheet; const top = scroller.scrollTop;
      const inc = rows.filter(r => r.include), dup = rows.filter(r => r.dupe), off = rows.filter(r => !r.include && !r.dupe);
      const sIn = sum(inc.filter(r => r.type === 'income').map(r => r.amount)), sOut = sum(inc.filter(r => r.type === 'expense').map(r => r.amount));
      $('#rvSummary', sheet).innerHTML = `<div class="rv-stat"><b>${inc.length}</b><span>gemmes</span></div><div class="rv-stat"><b class="pos">+${kr(sIn, false)}</b><span>ind</span></div><div class="rv-stat"><b class="neg">−${kr(sOut, false)}</b><span>ud</span></div><div class="rv-stat"><b>${dup.length + off.length}</b><span>${dup.length && off.length ? `springes over (${dup.length} dubl.)` : dup.length ? 'dubletter' : 'udeladt'}</span></div>`;
      const sg = suggestions.filter(s => !dismissed.has(s.id));
      $('#rvSugg', sheet).innerHTML = sg.length ? `<div class="rv-sugg"><h3>🔁 Ser ud til at være faste poster <small class="muted">(${sg.length})</small></h3>${(suggAll ? sg : sg.slice(0, 3)).map(s => `<div class="rv-sugg-item"><div class="avatar" style="background:${cat(s.categoryId).color}22">${cat(s.categoryId).emoji}</div><div class="main-col"><div class="title">${esc(s.name)}</div><div class="meta">${s.type === 'income' ? '+' : '−'}${kr(s.amount)} · ca. d. ${s.day}. · set ${s.months} måneder</div></div><button class="btn btn-sm btn-primary" data-sugg="${esc(s.id)}"><span class="hide-sm">Gør til </span>fast post</button><button class="icon-btn" data-sugg-x="${esc(s.id)}" aria-label="Ignorér">✕</button></div>`).join('')}${sg.length > 3 ? `<button class="btn btn-sm btn-ghost rv-more" data-sugg-more>${suggAll ? 'Vis færre' : `Vis alle ${sg.length} forslag`}</button>` : ''}</div>` : '';
      const groups = {};
      rows.filter(r => !r.dupe).forEach(r => (groups[r.categoryId] = groups[r.categoryId] || []).push(r));
      const order = Object.entries(groups).sort((a, b) => sum(b[1].filter(r => r.include).map(r => r.amount)) - sum(a[1].filter(r => r.include).map(r => r.amount)));
      $('#rvList', sheet).innerHTML = order.map(([cid, list]) => {
        const c = cat(cid); const incl = list.filter(r => r.include); const tot = sum(incl.map(r => r.type === 'income' ? r.amount : -r.amount));
        const allSel = list.every(r => r.sel);
        return `<div class="rv-group"><div class="rv-ghead"><input type="checkbox" class="rv-gsel" data-cid="${cid}" ${allSel ? 'checked' : ''} aria-label="Markér alle i ${esc(c.name)}"><span class="avatar" style="background:${c.color}22;width:30px;height:30px;font-size:15px;border-radius:9px">${c.emoji}</span><strong>${esc(c.name)}</strong><span class="muted small">${incl.length}${incl.length !== list.length ? ` af ${list.length}` : ''} stk.</span><span class="rv-gtot ${tot >= 0 ? 'pos' : ''}">${tot >= 0 ? '+' : '−'}${kr(Math.abs(tot), false)}</span></div>${list.sort((a, b) => b.date.localeCompare(a.date)).map(rowHTML).join('')}</div>`;
      }).join('') + (dup.length ? `<details class="rv-group rv-dupes"><summary class="rv-ghead"><span class="avatar" style="background:var(--input);width:30px;height:30px;font-size:15px;border-radius:9px">♻️</span><strong>Dubletter</strong><span class="muted small">${dup.length} stk. findes allerede – springes over</span></summary>${dup.map(rowHTML).join('')}</details>` : '')
        || '<p class="muted">Ingen gyldige posteringer i filen.</p>';
      const sel = rows.filter(r => r.sel);
      const types = new Set(sel.map(r => r.type));
      $('#rvBar', sheet).innerHTML = sel.length ? `<div class="rv-bulk"><strong>${sel.length} markeret</strong>
          ${types.size === 1 ? `<select class="mini" id="bulkCat"><option value="">Skift kategori…</option>${catOpts([...types][0], '')}</select>` : '<span class="muted small">Markér kun udgifter eller kun indtægter for at skifte kategori</span>'}
          ${types.has('income') && types.size === 1 && S.jobs.length ? `<select class="mini" id="bulkJob"><option value="-">Skift job…</option>${jobOpts('')}</select>` : ''}
          <button class="btn btn-sm" id="bulkOff">Udelad</button><button class="btn btn-sm" id="bulkOn">Medtag</button><button class="btn btn-sm btn-ghost" id="bulkClear">Fravælg</button></div>`
        : '';
      $('#rvBar', sheet).insertAdjacentHTML('beforeend', `<button class="btn btn-primary btn-block" id="rvSave" ${inc.length ? '' : 'disabled'}>Gem alle (${inc.length})</button>`);
      scroller.scrollTop = top;
    };
    const byId = id => rows.find(r => r.id === id);
    const setCat = (r, v, propagate) => {
      r.categoryId = v; r.user = true; r.source = 'user';
      if (r.type === 'income') r.jobId = jobForCategory(v, r.note) || r.jobId;
      let n = 0;
      if (propagate && r.key) rows.forEach(o => { if (o !== r && !o.dupe && !o.user && o.type === r.type && o.key === r.key) { o.categoryId = v; if (o.type === 'income') o.jobId = r.jobId; o.source = 'user'; n++; } });
      return n;
    };
    sheet.addEventListener('change', e => {
      const t = e.target;
      if (['mDate', 'mText', 'mAmt', 'mHead', 'mSkipTr'].includes(t.id)) { build(); renderReview(); return; }
      if (t.classList.contains('rv-sel')) { byId(t.dataset.rid).sel = t.checked; renderReview(); return; }
      if (t.classList.contains('rv-gsel')) { rows.filter(r => !r.dupe && r.categoryId === t.dataset.cid).forEach(r => r.sel = t.checked); renderReview(); return; }
      if (t.classList.contains('rv-cat')) { const r = byId(t.dataset.rid); const n = setCat(r, t.value, true); renderReview(); toast(n ? `Ændret – også ${n} andre fra samme forretning` : `Flyttet til ${cat(t.value).name}`); return; }
      if (t.classList.contains('rv-job')) { const r = byId(t.dataset.rid); r.jobId = t.value; r.user = true; rows.forEach(o => { if (o !== r && !o.dupe && !o.user && o.type === 'income' && o.key === r.key) o.jobId = t.value; }); renderReview(); return; }
      if (t.id === 'bulkCat' && t.value) { const sel = rows.filter(r => r.sel); sel.forEach(r => setCat(r, t.value, false)); sel.forEach(r => r.sel = false); renderReview(); toast(`${sel.length} flyttet til ${cat(t.value).name}`); return; }
      if (t.id === 'bulkJob' && t.value !== '-') { const sel = rows.filter(r => r.sel); sel.forEach(r => { r.jobId = t.value; r.user = true; r.sel = false; }); renderReview(); toast(`${sel.length} knyttet til ${t.value ? job(t.value).name : 'intet job'}`); return; }
    });
    sheet.addEventListener('click', e => {
      const t = e.target;
      const inc = t.closest('.rv-inc'); if (inc) { const r = byId(inc.dataset.rid); r.include = !r.include; renderReview(); return; }
      if (t.id === 'bulkOff' || t.id === 'bulkOn') { rows.filter(r => r.sel).forEach(r => { r.include = t.id === 'bulkOn'; r.sel = false; }); renderReview(); return; }
      if (t.id === 'bulkClear') { rows.forEach(r => r.sel = false); renderReview(); return; }
      if (t.closest('[data-sugg-more]')) { suggAll = !suggAll; renderReview(); return; }
      const sx = t.closest('[data-sugg-x]'); if (sx) { dismissed.add(sx.dataset.suggX); renderReview(); return; }
      const sb = t.closest('[data-sugg]'); if (sb) {
        const s = suggestions.find(x => x.id === sb.dataset.sugg); if (!s) return;
        const first = byId(s.rowIds[0]); const cid = first ? first.categoryId : s.categoryId;
        const r = { id: uid(), name: s.name, type: s.type, amount: s.amount, day: Math.min(28, Math.max(1, s.day)), categoryId: cid, kind: cid === 'c-abonnement' ? 'abonnement' : 'fast', startMonth: s.last, skipped: [], matchKey: s.key, ...(s.type === 'income' && job(first?.jobId) ? { jobId: first.jobId } : {}) };
        S.recurring.push(r);
        rows.forEach(o => { if (s.rowIds.includes(o.id) && o.date.slice(0, 7) >= r.startMonth) { o.recurringId = r.id; o.matched = r.name; } });
        S.transactions.forEach(t2 => { if (!t2.recurringId && t2.type === s.type && t2.date.slice(0, 7) >= r.startMonth && normalizeMerchant(t2.note) === s.key) t2.recurringId = r.id; });
        save(); dismissed.add(s.id); renderReview(); toast(`🔁 ${r.name} er nu en fast post (${kr(r.amount)}/md.)`); return;
      }
      if (t.id === 'rvSave') {
        const list = rows.filter(r => r.include && !r.dupe);
        if (!list.length) { toast('Ingen posteringer valgt'); return; }
        let learned = 0; const learnedKeys = new Set();
        for (const r of list) {
          if (r.recurringId) S.transactions = S.transactions.filter(x => !(x.recurringId === r.recurringId && x.date.slice(0, 7) === r.date.slice(0, 7) && !x.imported));
          const o = { id: r.id, date: r.date, amount: r.amount, type: r.type, note: r.note, categoryId: r.categoryId, imported: true };
          if (r.type === 'income' && job(r.jobId)) o.jobId = r.jobId;
          if (r.recurringId) o.recurringId = r.recurringId;
          S.transactions.push(o);
          if (r.user && r.key && !learnedKeys.has(r.type + r.key) && learnRule(r.note, r.type, r.categoryId, r.jobId)) { learned++; learnedKeys.add(r.type + r.key); }
        }
        S.settings.lastImport = todayISO(); delete S.settings.importSnooze;
        applyRecurring(); save(); closeSheet();
        selMonth = list.map(t2 => t2.date.slice(0, 7)).sort().pop(); location.hash = '#/posteringer'; render();
        toast(`${list.length} posteringer gemt ✓${learned ? ` · ${learned} ${learned === 1 ? 'regel' : 'regler'} lært 🧠` : ''}`);
      }
    });
    build(); renderReview();
  }, 'sheet-xl');
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
  rec('Løn – Artrose Fys', 'income', 22850, 'c-lon', 31, 'fast', { jobId: 'job-artrose' });
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
  const add = (date, type, amount, categoryId, note, jobId) => { if (date <= today) S.transactions.push({ id: uid(), date, type, amount: Math.round(amount * 100) / 100, categoryId, note, example: true, ...(jobId ? { jobId } : {}) }); };
  const shops = ['Netto', 'Føtex', 'Rema 1000', 'Lidl', 'Meny', 'Coop 365'];
  const eat = ['Joe & the Juice', 'Wolt – sushi', 'Café Norden', 'Kebabhuset', 'Restaurant Mother', 'Espresso House'];
  const shopping = ['Zalando', 'H&M', 'Sport 24', 'Matas', 'IKEA', 'Elgiganten'];
  const fun = ['Nordisk Film Biografer', 'Koncert – Royal Arena', 'Tivoli', 'Padel med vennerne', 'Bowling'];
  const clients = ['Mette', 'Jonas', 'Louise', 'Kasper', 'Sofie', 'Anders', 'Camilla'];
  for (let m = start, i = 0; m <= now; m = addMonths(m, 1), i++) {
    const D = dim(m), d = n => `${m}-${pad(Math.min(D, n))}`;
    const sessions = 3 + Math.floor(rnd() * 6);
    for (let k = 0; k < sessions; k++) add(d(2 + Math.floor(rnd() * 26)), 'income', [500, 550, 600, 1800, 650][Math.floor(rnd() * 5)], 'c-pt', `PT – ${clients[Math.floor(rnd() * clients.length)]} (MobilePay)`, 'job-pt');
    add(d(10), 'income', Math.round(2200 + rnd() * 2600), 'c-lon', 'Løn – Handicapformidlingen', 'job-handicap');
    const mo = Number(m.slice(5)), stays = [6, 7, 8].includes(mo) ? 3 + Math.floor(rnd() * 2) : rnd() < .55 ? 1 + Math.floor(rnd() * 2) : 0;
    for (let k = 0; k < stays; k++) add(d(3 + Math.floor(rnd() * 24)), 'income', Math.round((1400 + rnd() * 2600) / 10) * 10, 'c-udlejning', 'Airbnb – udbetaling', 'job-airbnb');
    if (stays) add(d(28), 'expense', 350 * stays, 'c-andet', 'Rengøring efter Airbnb-gæster');
    const groc = 9 + Math.floor(rnd() * 5);
    for (let k = 0; k < groc; k++) add(d(1 + Math.floor(rnd() * D)), 'expense', between(120, 520), 'c-mad', shops[Math.floor(rnd() * shops.length)]);
    const out = 3 + Math.floor(rnd() * 5);
    for (let k = 0; k < out; k++) add(d(1 + Math.floor(rnd() * D)), 'expense', between(65, 420), 'c-ude', eat[Math.floor(rnd() * eat.length)]);
    for (let k = 0; k < 2 + Math.floor(rnd() * 3); k++) add(d(1 + Math.floor(rnd() * D)), 'expense', between(40, 260), 'c-transport', ['Rejsekort', 'DSB', 'Bycyklen', 'Cykelreparation'][Math.floor(rnd() * 4)]);
    for (let k = 0; k < 1 + Math.floor(rnd() * 3); k++) add(d(1 + Math.floor(rnd() * D)), 'expense', between(180, 950), 'c-shopping', shopping[Math.floor(rnd() * shopping.length)]);
    for (let k = 0; k < Math.floor(rnd() * 3); k++) add(d(1 + Math.floor(rnd() * D)), 'expense', between(120, 650), 'c-fritid', fun[Math.floor(rnd() * fun.length)]);
    if (rnd() < .4) add(d(10 + Math.floor(rnd() * 15)), 'expense', between(90, 450), 'c-sundhed', ['Apotek', 'Tandlæge', 'Løbesko-rens'][Math.floor(rnd() * 3)]);
    if (i === 4) add(d(15), 'income', 4250, 'c-lon', 'Feriepenge (ferietillæg) – Artrose Fys', 'job-artrose');
    if (i === 7) add(d(20), 'expense', 6800, 'c-fritid', 'Sommerferie – fly & hotel');
    if (i === 9) add(d(3), 'income', 1200, 'c-indt-andet', 'Salg på DBA');
  }
  const contrib = (amount, monthsBack, from = 0) => Array.from({ length: monthsBack - from }, (_, k) => ({ id: uid(), date: `${addMonths(now, -(monthsBack - 1 - k) + 0)}-02`, amount })).filter(c => c.date <= today);
  S.goals = [
    { id: uid(), name: 'Bufferkonto', emoji: '🛟', color: '#22d39a', target: 30000, deadline: `${addMonths(now, 8)}-01`, example: true, contributions: [{ id: uid(), date: `${start}-02`, amount: 6000, note: 'Startbeløb', initial: true }, ...contrib(1500, 10)] },
    { id: uid(), name: 'Japan-rejse 2027', emoji: '✈️', color: '#7c5cff', target: 25000, deadline: `${addMonths(now, 11)}-15`, example: true, contributions: contrib(1250, 7) },
    { id: uid(), name: 'Ny racercykel', emoji: '🚴', color: '#ffb547', target: 14000, deadline: `${addMonths(now, 4)}-01`, example: true, contributions: contrib(600, 5) }
  ];
  const hist = (base, step, n = 12, noise = 0) => Array.from({ length: n }, (_, k) => ({ date: `${addMonths(now, -(n - 1 - k))}-${k === n - 1 ? today.slice(8) : '28'}`, value: Math.round(base + step * k + (noise ? (rnd() - .5) * noise : 0)) })).filter(h => h.date <= today);
  S.networth = { items: [
    { id: uid(), side: 'asset', kind: 'konto', name: 'Lønkonto – Lån & Spar', example: true, history: hist(9000, 300, 12, 6000) },
    { id: uid(), side: 'asset', kind: 'opsparing', name: 'Opsparingskonto', example: true, history: hist(18000, 1500) },
    { id: uid(), side: 'asset', kind: 'investering', name: 'Aktiesparekonto', example: true, history: hist(42000, 1600, 12, 5000) },
    { id: uid(), side: 'asset', kind: 'pension', name: 'Pension (PensionsInfo)', example: true, history: hist(186000, 3100) },
    { id: uid(), side: 'debt', kind: 'su', name: 'SU-lån', example: true, history: hist(96000, -900) },
    { id: uid(), side: 'debt', kind: 'kredit', name: 'Kreditkort', example: true, history: hist(4200, -300, 12, 1200) }
  ] };
  S.settings.lastImport = addMonths(now, -1) + '-' + today.slice(8);
  S.isExample = true; selMonth = now; save(); render(); toast('Eksempeldata indlæst 🧪');
}
function clearExample() {
  if (!confirm('Fjern alle eksempeldata? Dine egne posteringer bevares.')) return;
  S.transactions = S.transactions.filter(t => !t.example);
  S.recurring = S.recurring.filter(r => !r.example);
  S.goals = S.goals.filter(g => !g.example);
  if (S.networth) S.networth.items = S.networth.items.filter(i => !i.example);
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
  'add-job': () => openJobModal(),
  'edit-job': el => openJobModal(job(el.dataset.id)),
  'delete-rule': el => { S.rules = (S.rules || []).filter(r => r.id !== el.dataset.id); save(); render(); setTimeout(() => $('#rulesCard')?.scrollIntoView({ block: 'center' }), 50); toast('Regel slettet'); },
  'clear-rules': () => { if (!confirm('Slet alle lærte regler?')) return; S.rules = []; save(); render(); toast('Alle regler slettet'); },
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
  'import-csv': () => $('#csvFile').click(),
  'tip-filter': el => { tipFilter = el.dataset.f; render(); },
  'calc-reset': () => { S.settings.calc = { ...CALC_DEF }; save(); render(); },
  'snooze-import': () => { const d = new Date(); d.setDate(d.getDate() + 7); S.settings.importSnooze = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; save(); render(); toast('Påmindelsen er udsat i 7 dage'); },
  'tax-year': el => { taxYear = el.dataset.y; render(); },
  'tax-csv': el => taxCSV(el.dataset.y),
  'print': () => window.print(),
  'wi-reset': () => { S.settings.whatif = { ...WI_DEF }; save(); render(); },
  'nw-add': el => openNwModal(null, el.dataset.side),
  'nw-edit': el => { const it = nwItems().find(i => i.id === el.dataset.id); it && openNwModal(it); },
  'nw-update-all': () => openNwUpdateAll()
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
  if (e.target.id === 'jobRate' || e.target.id === 'jobRateNum') { const j = job(e.target.dataset.id); if (!j) return; j.taxRate = Math.max(0, Math.min(100, Number(e.target.value) || 0)); save(); clearTimeout(window._pr); window._pr = setTimeout(render, e.target.id === 'jobRate' ? 120 : 500); }
  if (e.target.dataset && e.target.dataset.wi) setWhatif(e.target.dataset.wi, e.target.type === 'range' ? Number(e.target.value) : e.target.value, e.target.type === 'range' ? 'range' : 'num');
  if (e.target.dataset && e.target.dataset.wicut) { const w = wiState(), v = Number(e.target.value); if (v) w.cuts[e.target.dataset.wicut] = v; else delete w.cuts[e.target.dataset.wicut]; S.settings.whatif = w; save(); e.target.style.setProperty('--p', v / 75 * 100 + '%'); const l = $('#wcv-' + e.target.dataset.wicut); if (l) l.textContent = v; updateWhatif(false); }
  if (e.target.dataset && e.target.dataset.calc) setCalc(e.target.dataset.calc, e.target.type === 'range' ? Number(e.target.value) : e.target.value, e.target.type === 'range' ? 'range' : 'num');
  if (e.target.id === 'nameInput') { S.settings.name = e.target.value.trim() || 'Simon'; save(); }
});
document.addEventListener('change', async e => {
  const id = e.target.id;
  if (id === 'txType') { txFilter.type = e.target.value; render(); }
  if (id === 'txCat') { txFilter.cat = e.target.value; render(); }
  if (id === 'subSort') { S.settings.subSort = e.target.value; save(); render(); }
  if (e.target.dataset.calc && e.target.type !== 'range') { const f = CALC_F.find(x => x.k === e.target.dataset.calc) || { u: '%' }; e.target.value = fmtIn(f, calcState()[e.target.dataset.calc]); }
  if (e.target.dataset.wisub) { const w = wiState(); const sid = e.target.dataset.wisub; w.cancel = e.target.checked ? [...new Set([...w.cancel, sid])] : w.cancel.filter(x => x !== sid); S.settings.whatif = w; save(); updateWhatif(false); }
  if (e.target.dataset.wi && e.target.type !== 'range') e.target.value = nf0.format(wiState()[e.target.dataset.wi] || 0);
  if (id === 'nwGoals') { S.settings.nwGoals = e.target.checked; save(); render(); }
  if (id === 'importRemind') { S.settings.importReminder = Number(e.target.value); delete S.settings.importSnooze; save(); toast(Number(e.target.value) ? 'Påmindelse gemt ✓' : 'Påmindelse slået fra'); }
  if (id === 'calcReal') { S.settings.calc = { ...calcState(), real: e.target.checked }; save(); updateCalc(true); }
  if (e.target.dataset.lesson) {
    const set = lessonsRead(); e.target.checked ? set.add(e.target.dataset.lesson) : set.delete(e.target.dataset.lesson);
    S.settings.lessonsRead = [...set]; save(); const y = window.scrollY; render(); window.scrollTo({ top: y });
    if (e.target.checked) { const l = SCHOOL_LESSONS.find(x => x.id === e.target.dataset.lesson), m = l && l.mod; const r = m ? modRead(m) : 0;
      toast(set.size === SCHOOL_LESSONS.length ? 'Alle lektioner læst – du er uddannet! 🎓' : m && r === m.lessons.length ? `Modul klaret: ${m.e} ${m.name} ✓` : `Læst ✓ · ${set.size} af ${SCHOOL_LESSONS.length}`); }
  }
  if (e.target.dataset.tip) {
    const set = new Set(S.settings.tipsDone || []); e.target.checked ? set.add(e.target.dataset.tip) : set.delete(e.target.dataset.tip);
    S.settings.tipsDone = [...set]; save(); const y = window.scrollY; render(); window.scrollTo({ top: y });
    if (e.target.checked) toast(set.size === TIPS.length ? 'Alle 20 tips gjort – flot! 🎉' : `Godt gået ✓ · ${set.size} af ${TIPS.length} gjort`);
  }
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
