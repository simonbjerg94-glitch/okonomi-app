/* Elpriser: spotpriser (day-ahead, kvarterpriser) fra Energi Data Service med reserve-kilde, lokal cache og "billig nu"-varsler.
   Primær kilde: api.energidataservice.dk/dataset/DayAheadPrices. API'et sender i dag kun CORS-headere til Energinets egne
   domæner, så fra GitHub Pages blokerer browseren svaret. Appen prøver derfor kun den kilde ca. én gang om ugen og bruger ellers
   reservekilden elprisenligenu.dk (samme day-ahead-priser, åben CORS). */
const ELP = {
  eds: 'https://api.energidataservice.dk/dataset/DayAheadPrices',
  alt: 'https://www.elprisenligenu.dk/api/v1/prices',
  cacheKey: 'okonomi.elpriser', edsKey: 'okonomi.elpriser.eds',
  // Standardværdier (kan rettes under "Indstillinger for elpris"). Afgifter er årsafhængige: elafgift 2026–27 er midlertidigt nedsat.
  def: { area: 'DK2', mode: 'spot', nettarif: 0.35, tillaeg: 0.00, elafgift: 0.008, moms: 25, ratio: 75, threshold: null, notify: false,
    kwh: { elbil: 30, vask: 1.0, opvask: 1.1, tumbler: 2.5 } },
  appliances: [['elbil', '🚗', 'Oplad elbil'], ['vask', '🧺', 'Vaskemaskine'], ['opvask', '🍽️', 'Opvaskemaskine'], ['tumbler', '🌀', 'Tørretumbler']]
};
const Elp = { loading: false, err: '', src: '', day: 'today', lastCheapKey: null, fetchedAt: 0, timer: null };
function elSet() { const s = S.settings.el || {}; return { ...ELP.def, ...s, kwh: { ...ELP.def.kwh, ...(s.kwh || {}) } }; }
function elSave(patch) { S.settings.el = { ...elSet(), ...patch }; save(); }
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); x.setHours(0, 0, 0, 0); return x; };
const nfKwh = new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const krKwh = v => nfKwh.format(v) + ' kr/kWh';
const hhmm = t => { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };

/* ---------- Cache ---------- */
function elCache() { try { return JSON.parse(localStorage.getItem(ELP.cacheKey)) || {}; } catch (e) { return {}; } }
function elStore(area, days, src) {
  const c = elCache(); c[area] = c[area] || {};
  for (const [k, pts] of Object.entries(days)) if (pts.length) c[area][k] = { src, pts, at: Date.now() };
  const keep = new Set(Array.from({ length: 10 }, (_, i) => dayKey(addDays(new Date(), 2 - i))));
  for (const a of Object.keys(c)) for (const k of Object.keys(c[a])) if (!keep.has(k)) delete c[a][k];
  try { localStorage.setItem(ELP.cacheKey, JSON.stringify(c)); } catch (e) {}
}
function elDay(area, k) { const d = elCache()[area]; return d && d[k] ? d[k].pts : null; } // [[startMs, endMs, spot kr/kWh ekskl. moms]]

/* ---------- Hentning ---------- */
const dayFull = pts => pts && pts.length >= 23;
async function fetchEds(area, from, to) {
  const q = new URLSearchParams({ start: dayKey(from) + 'T00:00', end: dayKey(to) + 'T00:00', filter: JSON.stringify({ PriceArea: [area] }), columns: 'TimeDK,PriceArea,DayAheadPriceDKK', sort: 'TimeDK asc', limit: '2000' });
  const r = await fetch(`${ELP.eds}?${q}`); if (!r.ok) throw new Error('HTTP ' + r.status);
  const recs = (await r.json()).records || [], days = {};
  recs.forEach((x, i) => { if (x.DayAheadPriceDKK == null) return; const t = new Date(x.TimeDK).getTime(), nx = recs[i + 1], e = nx ? new Date(nx.TimeDK).getTime() : t + 900000;
    const k = dayKey(new Date(t)); (days[k] = days[k] || []).push([t, Math.min(e, t + 3600000), x.DayAheadPriceDKK / 1000]); });
  return days;
}
async function fetchAltDay(area, d) {
  const r = await fetch(`${ELP.alt}/${d.getFullYear()}/${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${area}.json`);
  if (r.status === 404) return null; if (!r.ok) throw new Error('HTTP ' + r.status);
  return (await r.json()).map(x => [Date.parse(x.time_start), Date.parse(x.time_end), x.DKK_per_kWh]);
}
async function elFetch(force) {
  const st = elSet(), area = st.area, today = addDays(new Date(), 0), keys = [-7, -6, -5, -4, -3, -2, -1, 0, 1].map(n => [n, dayKey(addDays(today, n))]);
  const tomorrowDue = new Date().getHours() >= 13;
  const missing = keys.filter(([n, k]) => { const p = elDay(area, k); return n === 1 ? tomorrowDue && !dayFull(p) : !dayFull(p) || (n === 0 && force); });
  if (!missing.length || Elp.loading) return;
  Elp.loading = true; Elp.err = ''; elRefresh();
  try {
    let days = null, src = '';
    const eds = JSON.parse(localStorage.getItem(ELP.edsKey) || '{}');
    if (!(eds.blockedUntil > Date.now())) {
      try { days = await fetchEds(area, addDays(today, -7), addDays(today, 2)); src = 'Energi Data Service'; localStorage.setItem(ELP.edsKey, JSON.stringify({ ok: Date.now() })); }
      catch (e) { localStorage.setItem(ELP.edsKey, JSON.stringify({ blockedUntil: Date.now() + 7 * 864e5, why: String(e.message || e) })); }
    }
    if (!days || !days[keys[7][1]]) {
      days = days || {}; src = 'elprisenligenu.dk (day-ahead-priser)';
      const got = await Promise.all(missing.map(([n]) => fetchAltDay(area, addDays(today, n)).catch(e => (n === 0 ? Promise.reject(e) : null))));
      missing.forEach(([n, k], i) => { if (got[i]) days[k] = got[i]; });
    }
    elStore(area, days, src); Elp.src = src; Elp.fetchedAt = Date.now();
    if (!elDay(area, keys[7][1])) throw new Error('ingen priser for i dag');
  } catch (e) {
    Elp.err = elDay(area, keys[7][1]) ? 'Kunne ikke hente nye elpriser lige nu – viser de senest hentede priser.' : 'Elpriserne kunne ikke hentes. Tjek din internetforbindelse og prøv igen om lidt.';
  } finally { Elp.loading = false; Elp.fetchedAt = Date.now(); elRefresh(); }
}

/* ---------- Beregning ---------- */
const elPrice = (spot, st) => st.mode === 'total' ? (spot + st.nettarif + st.tillaeg + st.elafgift) * (1 + st.moms / 100) : spot;
const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
const wAvg = pts => { let s = 0, w = 0; for (const p of pts) { const d = p[1] - p[0]; s += p[2] * d; w += d; } return w ? s / w : null; };
function elModel() {
  const st = elSet(), area = st.area, now = Date.now(), t0 = addDays(new Date(), 0);
  const day = n => (elDay(area, dayKey(addDays(t0, n))) || []).map(p => [p[0], p[1], elPrice(p[2], st)]);
  const today = day(0), tomorrow = day(1);
  const past = [-7, -6, -5, -4, -3, -2, -1].map(day).filter(dayFull);
  const avg7 = past.length >= 3 ? avg(past.map(wAvg)) : null;
  const cur = today.find(p => p[0] <= now && now < p[1]) || null;
  const dayAvg = wAvg(today), tAvg = wAvg(tomorrow);
  const cheapBy = cur && [st.threshold != null && st.threshold !== '' && cur[2] <= Number(st.threshold) ? 'grænse' : null,
    dayAvg != null && cur[2] <= dayAvg * st.ratio / 100 ? 'dag' : null, avg7 != null && cur[2] <= avg7 * st.ratio / 100 ? 'uge' : null].filter(Boolean);
  return { st, today, tomorrow, cur, dayAvg, tAvg, avg7, cheap: !!(cheapBy && cheapBy.length), cheapBy: cheapBy || [], now,
    winToday: cheapestWindow(today.filter(p => p[1] > now)), winTomorrow: cheapestWindow(tomorrow) };
}
function cheapestWindow(pts, hours = 3) {
  if (!pts.length) return null; let best = null;
  for (let i = 0; i < pts.length; i++) { const end = pts[i][0] + hours * 3600000, sl = [];
    for (let j = i; j < pts.length && pts[j][0] < end; j++) sl.push(pts[j]);
    if (!sl.length || sl[sl.length - 1][1] < end) break;
    const a = wAvg(sl); if (!best || a < best.avg) best = { start: pts[i][0], end, avg: a }; }
  return best;
}
const colorFor = (v, a) => v <= a * 0.85 ? '#22d39a' : v >= a * 1.15 ? '#ff6b8b' : '#ffb547';

/* ---------- Visning ---------- */
function renderElpriser() {
  const m = elModel(), st = m.st, unit = st.mode === 'total' ? 'anslået totalpris' : 'spotpris';
  if (!Elp.loading && Date.now() - Elp.fetchedAt > 10 * 60000) setTimeout(() => elFetch(false), 0);
  const days = m.tomorrow.length ? `<div class="segmented el-days" id="elDaySeg"><button type="button" data-d="today" class="${Elp.day !== 'tomorrow' ? 'on' : ''}">I dag</button><button type="button" data-d="tomorrow" class="${Elp.day === 'tomorrow' ? 'on' : ''}">I morgen</button></div>` : '';
  const show = Elp.day === 'tomorrow' && m.tomorrow.length ? m.tomorrow : m.today, showAvg = show === m.tomorrow ? m.tAvg : m.dayAvg;
  const why = { grænse: 'under din grænse', dag: `≤ ${st.ratio} % af dagens gennemsnit`, uge: `≤ ${st.ratio} % af 7-dages gennemsnittet` };
  const win = w => w ? `<b>${hhmm(w.start)}–${hhmm(w.end)}</b> · gns. ${krKwh(w.avg)}` : '<span class="muted">ikke nok priser endnu</span>';
  const best = m.winToday || m.winTomorrow, bestAvg = best === m.winToday ? m.dayAvg : m.tAvg;
  const sugg = best && bestAvg != null ? ELP.appliances.map(([k, e, n]) => { const kwh = st.kwh[k] || 0, save = kwh * (bestAvg - best.avg);
    return `<div class="row"><div class="avatar">${e}</div><div class="main-col"><div class="title">${n}</div><div class="meta">${nfKwh.format(kwh)} kWh · ≈ ${kr(kwh * best.avg)}</div></div><div class="amt ${save > 0.005 ? 'pos' : 'muted'}">${save > 0.005 ? 'spar ' + kr(save) : '–'}</div></div>`; }).join('') : '';
  const notifState = !('Notification' in window) ? 'ikke understøttet i denne browser' : Notification.permission === 'granted' ? 'tilladt' : Notification.permission === 'denied' ? 'blokeret i browseren' : 'ikke givet endnu';
  return `<div id="elRoot">
  ${Elp.err ? `<div class="banner" id="elErr"><span>⚠️</span><div class="grow">${esc(Elp.err)}</div><button class="btn btn-sm" data-action="el-retry">Prøv igen</button></div>` : ''}
  <div class="segmented el-area" id="elAreaSeg"><button type="button" data-a="DK1" class="${st.area === 'DK1' ? 'on' : ''}">DK1 · Vestdanmark</button><button type="button" data-a="DK2" class="${st.area === 'DK2' ? 'on' : ''}">DK2 · Østdanmark</button></div>
  <div class="grid kpis">
    <div class="card kpi hero el-now"><div class="label">⚡ Pris lige nu ${m.cur ? `(${hhmm(m.cur[0])}–${hhmm(m.cur[1])})` : ''} ${m.cheap ? '<span class="pill el-cheap" id="elCheap">🟢 Billig nu</span>' : ''}</div>
      <div class="value" id="elNow">${m.cur ? krKwh(m.cur[2]) : Elp.loading ? 'Henter…' : '–'}</div>
      <div class="sub">${st.mode === 'total' ? 'Anslået totalpris inkl. nettarif, elafgift og moms' : 'Spotpris ekskl. moms, afgifter og nettarif'}${m.cheap ? ' · ' + m.cheapBy.map(x => why[x]).join(', ') : ''}</div></div>
    <div class="card kpi"><div class="label">📅 Gns. i dag</div><div class="value">${m.dayAvg != null ? krKwh(m.dayAvg) : '–'}</div><div class="sub">${m.today.length ? `${krKwh(Math.min(...m.today.map(p => p[2])))} – ${krKwh(Math.max(...m.today.map(p => p[2])))}` : ''}</div></div>
    <div class="card kpi"><div class="label">🗓️ Gns. 7 dage</div><div class="value">${m.avg7 != null ? krKwh(m.avg7) : '–'}</div><div class="sub">${m.tomorrow.length ? `I morgen gns. ${krKwh(m.tAvg)}` : 'Morgendagens priser kommer ca. kl. 13'}</div></div>
  </div>
  <div class="card section"><h2>${st.mode === 'total' ? 'Anslået totalpris' : 'Spotpris'} pr. kvarter</h2>
    ${days}
    <label class="switch el-mode"><span>Vis anslået totalpris <span class="muted small">(inkl. nettarif, elafgift og moms)</span></span><input type="checkbox" id="elMode" ${st.mode === 'total' ? 'checked' : ''}></label>
    ${show.length ? `<div class="chart-box el-chart"><canvas id="elChart" aria-label="Elpriser ${Elp.day === 'tomorrow' ? 'i morgen' : 'i dag'}"></canvas></div>
    <div class="el-legend small muted"><span><i style="background:#22d39a"></i>Billig (≤ 85 % af dagens gns.)</span><span><i style="background:#ffb547"></i>Normal</span><span><i style="background:#ff6b8b"></i>Dyr (≥ 115 %)</span>${show === m.today ? '<span><i class="el-nowmark"></i>Nu</span>' : ''}</div>`
      : `<p class="muted">${Elp.loading ? 'Henter elpriser…' : 'Ingen priser at vise endnu.'}</p>`}
    <p class="muted small">Dagens gennemsnit for den viste dag: ${showAvg != null ? krKwh(showAvg) : '–'} (${unit}). Kilde: ${esc(Elp.src || (elCache()[st.area] && Object.values(elCache()[st.area]).slice(-1)[0]?.src) || 'Energi Data Service')}. Day-ahead-priser for ${st.area}.</p>
  </div>
  <div class="card section" id="elWindow"><h2>⏱️ Billigste 3 timer</h2>
    <div class="list"><div class="row"><div class="main-col"><div class="title">Resten af i dag</div><div class="meta">${win(m.winToday)}</div></div></div>
      <div class="row"><div class="main-col"><div class="title">I morgen</div><div class="meta">${m.tomorrow.length ? win(m.winTomorrow) : 'Priserne offentliggøres ca. kl. 13'}</div></div></div></div>
    ${sugg ? `<h3>Gode ting at gøre ${best === m.winToday ? 'i dag' : 'i morgen'} kl. ${hhmm(best.start)}–${hhmm(best.end)}</h3><div class="list" id="elSugg">${sugg}</div>
      <p class="muted small">Besparelse = forbrug × (dagens gennemsnitspris − gennemsnitsprisen i perioden), med ${unit}. Forbruget pr. gang er typiske tal og kan rettes nedenfor.</p>` : ''}
  </div>
  ${eluSection()}
  <div class="card section" id="elNotify"><h2>🔔 Besked når strømmen er billig</h2>
    <label class="switch"><span>Giv besked, når en billig periode starter</span><input type="checkbox" id="elNotifyOn" ${st.notify ? 'checked' : ''}></label>
    <div class="grid cols-2">
      <div class="field"><label for="elRatio">Billig = højst (% af dagens eller 7-dages gns.)</label><input class="input" id="elRatio" data-el="ratio" inputmode="decimal" value="${nf0.format(st.ratio)}"></div>
      <div class="field"><label for="elThr">Eller under (kr/kWh, valgfri)</label><input class="input" id="elThr" data-el="threshold" inputmode="decimal" placeholder="fx 0,50" value="${st.threshold != null && st.threshold !== '' ? nfKwh.format(st.threshold) : ''}"></div>
    </div>
    <p class="muted small">Browser-notifikationer: ${notifState}. Beskeder virker indtil videre kun, mens appen er åben (også i baggrunden af en åben fane) – varsler når appen er lukket kommer senere.</p>
  </div>
  <details class="card section" id="elSettings"><summary><b>⚙️ Indstillinger for totalpris og forbrug</b></summary>
    <p class="muted small">Totalprisen er et <b>skøn</b>: spotpris + gennemsnitlig nettarif (inkl. Energinets tariffer) + elselskabets tillæg + elafgift, plus moms. Din faktiske pris afhænger af netselskab, tidspunkt (tarifferne er højest kl. 17–21) og elaftale. Elafgiften er sat til 0,8 øre/kWh ekskl. moms (midlertidigt nedsat i 2026–27) – tjek tallet, hvis du har elvarme eller satserne ændres.</p>
    <div class="grid cols-2">
      <div class="field"><label for="elNet">Gns. nettarif (kr/kWh ekskl. moms)</label><input class="input" id="elNet" data-el="nettarif" inputmode="decimal" value="${nfKwh.format(st.nettarif)}"></div>
      <div class="field"><label for="elTill">Elselskabets tillæg (kr/kWh ekskl. moms)</label><input class="input" id="elTill" data-el="tillaeg" inputmode="decimal" value="${nfKwh.format(st.tillaeg)}"></div>
      <div class="field"><label for="elAfg">Elafgift (kr/kWh ekskl. moms)</label><input class="input" id="elAfg" data-el="elafgift" inputmode="decimal" value="${new Intl.NumberFormat('da-DK', { minimumFractionDigits: 3, maximumFractionDigits: 4 }).format(st.elafgift)}"></div>
      <div class="field"><label for="elMoms">Moms (%)</label><input class="input" id="elMoms" data-el="moms" inputmode="decimal" value="${nf0.format(st.moms)}"></div>
      ${ELP.appliances.map(([k, e, n]) => `<div class="field"><label for="elK-${k}">${e} ${n} (kWh pr. gang)</label><input class="input" id="elK-${k}" data-elkwh="${k}" inputmode="decimal" value="${nfKwh.format(st.kwh[k])}"></div>`).join('')}
    </div>
    <button class="btn btn-sm btn-ghost" data-action="el-reset">↺ Nulstil til standard</button>
  </details>
  </div>`;
}
const elNowLine = {
  id: 'elNowLine',
  afterDatasetsDraw(chart, args, o) {
    if (!o || o.idx == null || o.idx < 0) return; const meta = chart.getDatasetMeta(0), bar = meta.data[o.idx]; if (!bar) return;
    const { ctx, chartArea: a } = chart; ctx.save(); ctx.strokeStyle = themeVars().text; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(bar.x, a.top); ctx.lineTo(bar.x, a.bottom); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = themeVars().text; ctx.font = `700 11px ${Chart.defaults.font.family}`; ctx.textAlign = bar.x > a.right - 30 ? 'right' : 'left'; ctx.fillText('Nu', bar.x + (bar.x > a.right - 30 ? -4 : 4), a.top + 10); ctx.restore();
  }
};
function elChart() {
  const m = elModel(), pts = Elp.day === 'tomorrow' && m.tomorrow.length ? m.tomorrow : m.today; if (!pts.length) return;
  const a = wAvg(pts), idx = pts === m.today && m.cur ? pts.indexOf(m.cur) : -1;
  mkChart('elChart', { type: 'bar', data: { labels: pts.map(p => hhmm(p[0])), datasets: [{ data: pts.map(p => Math.round(p[2] * 1000) / 1000),
      backgroundColor: pts.map((p, i) => colorFor(p[2], a) + (idx >= 0 && i < idx ? '66' : '')), borderRadius: 2, borderSkipped: false, barPercentage: 1, categoryPercentage: 0.9 }] },
    options: { responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false }, elNowLine: { idx }, tooltip: { callbacks: { title: it => { const p = pts[it[0].dataIndex]; return `${hhmm(p[0])}–${hhmm(p[1])}`; }, label: c => ' ' + krKwh(c.parsed.y) } } },
      scales: { x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, callback: (v, i) => { const d = new Date(pts[i][0]); return d.getMinutes() === 0 && d.getHours() % 3 === 0 ? pad(d.getHours()) : ''; } } },
        y: { beginAtZero: true, ticks: { callback: v => nfKwh.format(v) } } } },
    plugins: [elNowLine] });
}
function elRefresh() { if (typeof route === 'function' && route() === 'elpriser' && S && !document.querySelector('#modalRoot .sheet')) { const y = window.scrollY, open = document.getElementById('elSettings')?.open; render(); window.scrollTo({ top: y }); if (open) document.getElementById('elSettings').open = true; } }

/* ---------- Billig-varsler (mens appen er åben) ---------- */
function elTick() {
  if (!S || (typeof Lock !== 'undefined' && Lock.locked)) return;
  const st = elSet(); if (!st.notify && route() !== 'elpriser') return;
  if (Date.now() - Elp.fetchedAt > 60 * 60000 || (new Date().getHours() >= 13 && !dayFull(elDay(st.area, dayKey(addDays(new Date(), 1))))) && Date.now() - Elp.fetchedAt > 15 * 60000) elFetch(false);
  const m = elModel(), key = m.cur ? st.area + ':' + m.cur[0] : null;
  if (m.cheap && st.notify) {
    if (Elp.lastCheapKey == null) { // start af en billig periode = forrige kvarter var ikke billigt (og vi har ikke givet besked endnu)
      const prev = m.today.find(p => p[1] === m.cur[0]); const prevCheap = prev && ((m.dayAvg && prev[2] <= m.dayAvg * st.ratio / 100) || (m.avg7 && prev[2] <= m.avg7 * st.ratio / 100) || (st.threshold != null && st.threshold !== '' && prev[2] <= Number(st.threshold)));
      const seen = localStorage.getItem('okonomi.elpriser.notified');
      if (!prevCheap || seen !== dayKey(new Date()) + ':' + st.area) elNotify(m);
    }
    Elp.lastCheapKey = key;
  } else Elp.lastCheapKey = null;
  if (route() === 'elpriser') { const el = document.getElementById('elNow'); if (el && m.cur && el.textContent !== krKwh(m.cur[2])) elRefresh(); }
}
function elNotify(m) {
  const w = cheapestWindow(m.today.filter(p => p[1] > Date.now()), 1);
  const msg = `Strømmen er billig nu: ${krKwh(m.cur[2])} (${m.st.area})`;
  localStorage.setItem('okonomi.elpriser.notified', dayKey(new Date()) + ':' + m.st.area);
  toast('⚡ ' + msg);
  try { if ('Notification' in window && Notification.permission === 'granted') new Notification('Billig strøm nu ⚡', { body: msg + (w ? ` · billigste time ${hhmm(w.start)}–${hhmm(w.end)}` : ''), icon: 'icons/icon-192.png', tag: 'elpris-billig' }); } catch (e) {}
}
setInterval(elTick, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(elTick, 500); });

/* ---------- Hændelser ---------- */
const parseNum = v => { const n = Number(String(v).replace(/\s/g, '').replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : null; };
document.addEventListener('click', e => {
  const a = e.target.closest('#elAreaSeg [data-a]'); if (a) { elSave({ area: a.dataset.a }); Elp.fetchedAt = 0; Elp.lastCheapKey = null; render(); elFetch(false); eluFetch(false); return; }
  const d = e.target.closest('#elDaySeg [data-d]'); if (d) { Elp.day = d.dataset.d; elRefresh(); }
});
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.id === 'elMode') { elSave({ mode: t.checked ? 'total' : 'spot' }); elRefresh(); }
  if (t.id === 'elNotifyOn') {
    if (t.checked && 'Notification' in window && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch (err) {} }
    elSave({ notify: t.checked }); Elp.lastCheapKey = null;
    toast(t.checked ? ('Notification' in window && Notification.permission === 'granted' ? 'Du får besked, når strømmen bliver billig 🔔' : 'Du får besked i appen, når strømmen bliver billig') : 'Beskeder om billig strøm er slået fra');
    elRefresh(); if (t.checked) setTimeout(elTick, 300);
  }
  if (t.dataset.el) { const k = t.dataset.el, n = t.value.trim() === '' && (k === 'threshold' || k === 'uThr') ? null : parseNum(t.value);
    if (n == null && k !== 'threshold' && k !== 'uThr') { toast('Skriv et tal'); elRefresh(); return; }
    elSave({ [k]: k === 'ratio' ? Math.max(1, Math.min(100, n)) : k === 'uThr' && n == null ? 0.25 : n }); Elp.lastCheapKey = null; elRefresh(); }
  if (t.dataset.elkwh) { const n = parseNum(t.value); if (n == null || n < 0) { toast('Skriv et tal'); elRefresh(); return; } const st = elSet(); elSave({ kwh: { ...st.kwh, [t.dataset.elkwh]: n } }); elRefresh(); }
});
const elActions = {
  'el-retry': () => { Elp.fetchedAt = 0; localStorage.removeItem(ELP.edsKey); elFetch(true); },
  'el-reset': () => { const st = elSet(); S.settings.el = { area: st.area, mode: st.mode, notify: st.notify }; save(); elRefresh(); toast('Standardværdier gendannet'); }
};

/* ---------- 7-dages elpris-udsigt (vejrbaseret skøn) ----------
   Grundlag: egen analyse af 12 måneders timepriser (okt. 2025–okt. 2026) mod vejrdata for samme punkter.
   Vind er den vigtigste faktor; sol sænker middagspriserne forår/sommer, men næsten ikke om vinteren. */
const ELU = {
  om: 'https://api.open-meteo.com/v1/forecast', cacheKey: 'okonomi.elpriser.vejr',
  pts: { DK1: [[56.09, 8.24, 'Ringkøbing'], [55.47, 8.45, 'Esbjerg'], [57.05, 9.92, 'Aalborg'], [55.5, 7.8, 'Horns Rev']],
         DK2: [[55.68, 12.57, 'København'], [54.8, 11.5, 'Lolland'], [55.0, 12.9, 'Kriegers Flak'], [55.1, 14.9, 'Bornholm']] },
  wc: [2, 6, 10, 14], // midtpunkt af vindintervaller <4, 4-8, 8-12, >12 m/s
  // Gns. spotpris (kr/kWh) pr. sæson og vindinterval
  price: { DK1: { Vinter: [0.74, 0.835, 0.712, 0.545], 'Forår': [0.771, 0.807, 0.626, 0.273], Sommer: [0.987, 0.944, 0.681, 0.374], 'Efterår': [1.061, 1.076, 0.767, 0.425] },
           DK2: { Vinter: [0.795, 0.898, 0.691, 0.66], 'Forår': [0.719, 0.785, 0.585, 0.141], Sommer: [0.959, 0.924, 0.67, 0.286], 'Efterår': [1.012, 1.063, 0.758, 0.365] } },
  // Andel timer ≤ 0,25 kr pr. vindinterval (hele året)
  share: { DK1: [0.080, 0.079, 0.122, 0.282], DK2: [0.071, 0.082, 0.145, 0.391] },
  base: { DK1: 0.121, DK2: 0.130 }, mean: { DK1: 0.80, DK2: 0.80 },
  solarCoef: { DK1: -0.129, DK2: -0.141 }, // kr/kWh pr. 100 W/m² (regression)
  solarSeason: { Vinter: 0.2, 'Forår': 1, Sommer: 1, 'Efterår': 0.6 }, // solens effekt er lille om vinteren
  solarMean: { Vinter: 20, 'Forår': 150, Sommer: 210, 'Efterår': 70 }, // typisk gns. instråling over døgnet (W/m²)
  skill: [0.99, 0.99, 0.97, 0.95, 0.87, 0.79, 0.67, 0.55], // korrelation vejrprognose vs. faktisk vind efter 0–7 dage
  sigma: 0.5
};
const Elu = { loading: false, err: '', at: 0 };
const seasonOf = d => { const m = d.getMonth() + 1; return [12, 1, 2].includes(m) ? 'Vinter' : m <= 5 ? 'Forår' : m <= 8 ? 'Sommer' : 'Efterår'; };
const interp = (x, xs, ys) => { if (x <= xs[0]) return ys[0]; for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1]); return ys[ys.length - 1]; };
function phi(z) { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
function eluCache() { try { return JSON.parse(localStorage.getItem(ELU.cacheKey)) || {}; } catch (e) { return {}; } }
async function eluFetch(force) {
  const area = elSet().area, c = eluCache(), hit = c[area];
  if (Elu.loading || (!force && hit && Date.now() - hit.at < 3 * 3600e3)) return;
  Elu.loading = true; Elu.err = '';
  try {
    const p = ELU.pts[area], q = new URLSearchParams({ latitude: p.map(x => x[0]).join(','), longitude: p.map(x => x[1]).join(','), hourly: 'wind_speed_100m,shortwave_radiation', wind_speed_unit: 'ms', timezone: 'Europe/Copenhagen', forecast_days: '8' });
    const r = await fetch(`${ELU.om}?${q}`); if (!r.ok) throw new Error('HTTP ' + r.status);
    let j = await r.json(); if (!Array.isArray(j)) j = [j];
    const time = j[0].hourly.time, w = time.map((_, i) => avg(j.map(x => x.hourly.wind_speed_100m[i]).filter(v => v != null))), s = time.map((_, i) => avg(j.map(x => x.hourly.shortwave_radiation[i]).filter(v => v != null)));
    c[area] = { at: Date.now(), time, w, s }; try { localStorage.setItem(ELU.cacheKey, JSON.stringify(c)); } catch (e) {}
  } catch (e) { Elu.err = hit ? 'Kunne ikke hente en ny vejrprognose – viser den senest hentede.' : 'Vejrprognosen kunne ikke hentes lige nu, så udsigten kan ikke beregnes. Prøv igen senere.'; }
  finally { Elu.loading = false; Elu.at = Date.now(); elRefresh(); }
}
// Skøn for én time: forventet spotpris og sandsynlighed for pris ≤ grænse, krympet mod normalen efter prognosens træfsikkerhed
function eluHour(area, wind, sun, date, lead, thr) {
  const se = seasonOf(date), muW = interp(wind, ELU.wc, ELU.price[area][se]);
  const sol = ELU.solarCoef[area] * ELU.solarSeason[se] * (sun - ELU.solarMean[se]) / 100;
  const mu = Math.max(-0.1, muW + sol), shareW = interp(wind, ELU.wc, ELU.share[area]);
  let p = Math.min(0.97, shareW * phi((thr - mu) / ELU.sigma) / phi((0.25 - muW) / ELU.sigma));
  const wSk = Math.pow(ELU.skill[Math.min(lead, 7)], 2), pBase = ELU.base[area] * phi((thr - ELU.mean[area]) / ELU.sigma) / phi((0.25 - ELU.mean[area]) / ELU.sigma);
  return { mu: wSk * mu + (1 - wSk) * ELU.mean[area], p: wSk * p + (1 - wSk) * pBase, wSk };
}
function eluModel() {
  const st = elSet(), area = st.area, c = eluCache()[area], thr = st.uThr != null ? st.uThr : 0.25; if (!c) return null;
  const t0 = addDays(new Date(), 0), out = [];
  for (let n = 1; n <= 7; n++) {
    const day = addDays(t0, n), k = dayKey(day), idx = c.time.map((t, i) => [t, i]).filter(([t]) => t.startsWith(k));
    if (idx.length < 20) continue;
    const hrs = idx.map(([t, i]) => ({ h: Number(t.slice(11, 13)), w: c.w[i], s: c.s[i], ...eluHour(area, c.w[i], c.s[i], day, n, thr) }));
    const actual = n === 1 && dayFull(elDay(area, k)) ? elDay(area, k) : null;
    const blocks = [0, 6, 12, 18].map(b => { const hs = hrs.filter(x => x.h >= b && x.h < b + 6);
      if (actual) { const ap = actual.filter(p => new Date(p[0]).getHours() >= b && new Date(p[0]).getHours() < b + 6); return { b, p: ap.some(p => p[2] <= thr) ? 1 : 0, mu: wAvg(ap) }; }
      return { b, p: avg(hs.map(x => x.p)), mu: avg(hs.map(x => x.mu)) }; });
    const p = actual ? (actual.some(x => x[2] <= thr) ? 1 : 0) : 1 - blocks.reduce((q, x) => q * (1 - x.p), 1);
    const mu = actual ? wAvg(actual) : avg(hrs.map(x => x.mu)), wSk = hrs[0].wSk, spread = actual ? 0 : 0.12 + 0.35 * (1 - wSk);
    const lo = actual ? Math.min(...actual.map(x => x[2])) : Math.max(-0.05, Math.min(...blocks.map(x => x.mu)) - spread), hi = actual ? Math.max(...actual.map(x => x[2])) : Math.max(...blocks.map(x => x.mu)) + spread;
    const sunDay = hrs.filter(x => x.h >= 9 && x.h < 16);
    out.push({ n, day, k, p, mu, lo, hi, blocks, actual: !!actual, wind: avg(hrs.map(x => x.w)), windMax: Math.max(...hrs.map(x => x.w)), sun: avg(sunDay.map(x => x.s)),
      cert: actual ? 'Kendte priser' : n <= 2 ? 'Ret sikker' : n === 3 ? 'Semisikker' : n <= 5 ? 'Usikker' : 'Næsten gætværk' });
  }
  return { thr, days: out, at: c.at };
}
const pct0 = v => nf0.format(Math.round(v * 100)) + ' %';
function eluSection() {
  const st = elSet(), m = eluModel(); if (!Elu.loading && Date.now() - Elu.at > 60000) setTimeout(() => eluFetch(false), 0);
  const thr = m ? m.thr : (st.uThr != null ? st.uThr : 0.25);
  const wd = ['søn', 'man', 'tir', 'ons', 'tor', 'fre', 'lør'];
  const cards = m && m.days.length ? m.days.map(d => { const pr = Math.round(d.p * 100), cls = pr >= 55 ? 'good' : pr >= 35 ? 'mid' : 'bad', face = cls === 'good' ? '😀' : cls === 'mid' ? '😐' : '🙁';
    const fade = d.actual || d.n <= 3 ? '' : d.n <= 5 ? ' fade1' : ' fade2';
    return `<div class="elu-card ${cls}${fade}" data-day="${d.k}">
      <div class="elu-top"><div><div class="elu-wd">${d.n === 1 ? 'I morgen' : wd[d.day.getDay()][0].toUpperCase() + wd[d.day.getDay()].slice(1)}</div><div class="elu-date">${d.day.getDate()}/${d.day.getMonth() + 1}</div></div><div class="elu-face" aria-hidden="true">${face}</div></div>
      <div class="elu-p">${pct0(d.p)}</div><div class="elu-plab">chance for billig strøm</div>
      <div class="elu-blocks" aria-label="Chance pr. 6 timer">${d.blocks.map(x => `<span title="kl. ${pad(x.b)}–${pad(x.b + 6)}: ${pct0(x.p)}"><i style="height:${Math.max(8, Math.round(x.p * 100))}%"></i><em>${pad(x.b)}</em></span>`).join('')}</div>
      <div class="elu-wx"><span title="Gns. vind i 100 m højde">💨 ${nf1.format(d.wind)} m/s</span><span title="Gns. solindstråling kl. 9–16">☀️ ${nf0.format(d.sun)} W/m²</span></div>
      <div class="elu-range">${d.actual ? 'Kendt' : 'Ca.'} ${nfKwh.format(d.lo)}–${nfKwh.format(d.hi)} kr/kWh</div>
      <div class="elu-cert">${d.cert}</div></div>`; }).join('') : `<p class="muted">${Elu.loading || !m ? 'Henter vejrprognose…' : 'Ingen prognose endnu.'}</p>`;
  return `<div class="card section" id="elUdsigt"><h2>🔭 Elpris-udsigt – 7 dage</h2>
    ${Elu.err ? `<p class="small sync-warn" id="eluErr">${esc(Elu.err)}</p>` : ''}
    <p class="muted small" style="margin-top:0">Chancen for at strømmen bliver billig (spotpris ≤ ${nfKwh.format(thr)} kr/kWh i mindst en del af dagen) i ${st.area}, beregnet ud fra vejrudsigten for vind og sol.</p>
    <div class="elu-row" id="eluCards" tabindex="0" aria-label="7-dages udsigt, kan rulles vandret">${cards}</div>
    <div class="elu-disc">ℹ️ <b>Det er et skøn – ikke en pris.</b> Udsigten bygger på vejrprognosen og på, hvordan elprisen tidligere har reageret på vind og sol. Den kender ikke til fx brændselspriser, kabler ude af drift eller forbrug. Jo længere frem, jo mere usikker er vejrprognosen, og jo mere nærmer skønnet sig en helt almindelig dag. De rigtige priser for i morgen offentliggøres ca. kl. 13.</div>
    <div class="field" style="max-width:280px;margin-top:12px"><label for="elUThr">Billig strøm = spotpris højst (kr/kWh)</label><input class="input" id="elUThr" data-el="uThr" inputmode="decimal" value="${nfKwh.format(thr)}"></div>
    <details class="elu-how"><summary>Hvordan beregnes det?</summary>
      <p>Vi har sammenholdt 12 måneders timepriser (oktober 2025–oktober 2026) med vind i 100 meters højde og solindstråling målt over fire punkter i hvert prisområde (DK1: Ringkøbing, Esbjerg, Aalborg, Horns Rev · DK2: København, Lolland, Kriegers Flak, Bornholm).</p>
      <ul><li><b>Vind betyder mest.</b> Gns. spotpris i DK2 ved vind under 4 m/s: 0,89 kr · 4–8 m/s: 0,91 kr · 8–12 m/s: 0,69 kr · over 12 m/s: 0,44 kr pr. kWh. Andelen af timer under 0,25 kr stiger fra 7–8 % til 39 % i blæsevejr (DK1: 8 % → 28 %).</li>
        <li><b>Sol sænker middagspriserne forår og sommer</b> (DK2 sommer kl. 10–15: 0,32 kr mod 0,98 kr resten af døgnet), men har næsten ingen effekt om vinteren.</li>
        <li>Samlet regression: ca. −0,06 kr/kWh pr. m/s vind og −0,14 kr/kWh pr. 100 W/m² sol (DK1: −0,06 og −0,13).</li>
        <li><b>Træfsikkerhed:</b> vindprognosen rammer meget præcist 1 dag frem (korrelation 0,99), godt 3 dage frem (0,95), men kun nogenlunde 5 dage frem (0,79) og svagt 7 dage frem (0,55). Derfor trækkes skønnet mere og mere mod det normale, jo længere frem det er.</li>
        <li>Chancen for dagen regnes som chancen for, at mindst én af dagens fire 6-timers perioder får billige timer. Grøn = mindst 55 %, gul = 35–54 %, rød = under 35 % (en helt almindelig dag ligger omkring 40 %). Prisspændet er det forventede spænd mellem dagens perioder plus en usikkerhed, der vokser med antal dage frem.</li></ul>
      <p class="muted small">Vejrdata: Open-Meteo. Spotpriser er ekskl. moms, afgifter og nettarif. Skønnet er ikke personlig rådgivning.</p></details>
  </div>`;
}
