/* Værktøjer: hub med abonnementsjæger (auto-genkendelse), månedens rapport, fradrags-huskeliste, regningskalender,
   elforbrug i kroner, pensionstjek og udfordringer/streaks. Alle data ligger i S.settings.tools (indgår i backup og synk). */
const tools = () => (S.settings.tools = S.settings.tools || {});
const tSet = (k, v) => { tools()[k] = v; save(); };
const TOOL_LIST = [
  ['abon', '✂️', 'Abonnementsjæger', 'Find faste træk i dine posteringer', '#/abonnementer'],
  ['bon', '🧾', 'Bon-scanning', 'Scan bonner – knyttes til betalingen'],
  ['rapport', '📰', 'Månedens rapport', 'Forbrug, opsparing og et tip'],
  ['maal', '🏆', 'Sparemål med billeder', 'Mål, fremdrift og forventet dato', '#/maal'],
  ['fradrag', '🧾', 'Fradrags-huskeliste', 'Glem ingen fradrag – inkl. kørsel'],
  ['kalender', '📅', 'Regningskalender', 'Kommende regninger måned for måned'],
  ['elforbrug', '🔌', 'Elforbrug i kroner', 'Hvad koster vasken nu – og senere?'],
  ['pension', '🧓', 'Pensionstjek', 'Er jeg på rette spor?'],
  ['udfordringer', '🔥', 'Udfordringer & streaks', 'Små sparemål med badges']
];
const toolTitle = id => (TOOL_LIST.find(t => t[0] === id) || [])[2] || 'Værktøjer';
const nfK = n => nf0.format(Math.round(n));
const back = () => `<a class="btn btn-sm btn-ghost tool-back" href="#/vaerktoejer">← Værktøjer</a>`;

function renderVaerktoejer() {
  const id = routeParts()[1];
  const r = { bon: renderBonner, rapport: renderRapport, fradrag: renderFradrag, kalender: renderKalender, elforbrug: renderElforbrug, pension: renderPension, udfordringer: renderUdfordringer }[id];
  if (r) { document.getElementById('viewTitle').textContent = toolTitle(id); return `<div class="tool-page" data-tool="${id}">${back()}${r()}</div>`; }
  const subs = detectSubs(), opsig = subs.filter(s => subDecision(s.key) === 'opsig');
  const m = addMonths(curMonth(), -1), st = stats(m), bills = upcomingBills(1)[0];
  const ch = activeChallenges(), best = Math.max(0, ...ch.map(c => streakOf(c)));
  const fd = fradragState(new Date().getFullYear()), fdDone = Object.values(fd.checks || {}).filter(Boolean).length;
  const meta = {
    abon: subs.length ? `${subs.length} fundet · ${opsig.length ? 'spar ' + kr(sum(opsig.map(s => s.yearly)), false) + '/år' : kr(sum(subs.map(s => s.yearly)), false) + '/år'}` : 'Importér kontoudtog for at finde træk',
    bon: receipts().length ? `${receipts().length} bonner · ${receipts().filter(r => bonStatus(r) === 'pending').length} afventer bank` : 'Tag et billede af en bon',
    rapport: st.tx.length ? `${monthLabel(m)}: brugt ${kr(st.exp, false)}` : 'Ingen data for sidste måned endnu',
    maal: S.goals.length ? `${S.goals.length} mål · ${S.goals.filter(g => goalSaved(g) >= g.target).length} nået` : 'Opret dit første mål',
    fradrag: `${fdDone} af ${FRADRAG.length} tjekket for ${new Date().getFullYear()}`,
    kalender: bills ? `${monthLabel(bills.key)}: ${kr(bills.total, false)}` : 'Ingen faste udgifter endnu',
    elforbrug: 'Bruger dine elpriser og din elaftale', pension: tools().pension ? 'Sidst tjekket ' + fmtDate(tools().pension.at || todayISO()) : 'Tag et hurtigt tjek',
    udfordringer: ch.length ? `${ch.length} aktive · længste streak ${best} ${best === 1 ? 'dag' : 'dage'}` : 'Start en udfordring'
  };
  return `<p class="muted small" style="margin:0 0 12px">Praktiske værktøjer til din økonomi. Alt gemmes kun på din enhed (og i din krypterede Google Drive-synk, hvis den er slået til).</p>
  <div class="tool-grid">${TOOL_LIST.map(([id, e, n, d, href]) => `<a class="card tool-card" href="${href || '#/vaerktoejer/' + id}" data-tool="${id}">
    <span class="tool-ico">${e}</span><span class="tool-txt"><b>${n}</b><span class="muted small">${d}</span><span class="tool-meta">${esc(meta[id] || '')}</span></span><span class="tool-go">›</span></a>`).join('')}</div>`;
}

/* ---------- 1. Abonnementsjæger: genkend faste træk ---------- */
const merchantKey = s => String(s || '').toLowerCase().replace(/\b(dk|nota|nr|ref|betaling|mobilepay|dankort|visa|mc|kort|køb|overførsel|pbs|bs|aftale)\b/g, ' ')
  .replace(/[0-9]+([.,:/-][0-9]+)*/g, ' ').replace(/[^a-zæøå& ]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 3).join(' ');
// median() kommer fra app.js
const dayDiff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
function detectSubs() {
  const groups = {};
  for (const t of S.transactions) { if (t.type !== 'expense' || t.recurringId || t.example && !S.isExample) continue;
    const k = merchantKey(t.note); if (k.length < 3) continue; (groups[k] = groups[k] || []).push(t); }
  const out = [];
  for (const [key, tx] of Object.entries(groups)) {
    if (tx.length < 2) continue; tx.sort((a, b) => a.date.localeCompare(b.date));
    const gaps = tx.slice(1).map((t, i) => dayDiff(tx[i].date, t.date)).filter(g => g > 3), g = median(gaps), amts = tx.map(t => t.amount), a = median(amts);
    const freq = g >= 25 && g <= 36 ? ['månedlig', 12, 30.4] : g >= 80 && g <= 100 ? ['kvartalsvis', 4, 91] : g >= 340 && g <= 390 ? ['årlig', 1, 365] : null;
    if (!freq || !gaps.length) continue;
    const need = freq[1] === 12 ? 3 : 2; if (tx.length < need) continue;
    const regular = gaps.filter(x => Math.abs(x - g) <= Math.max(6, g * 0.2)).length / gaps.length, similar = amts.filter(x => Math.abs(x - a) <= Math.max(5, a * 0.15)).length / amts.length;
    if (regular < 0.7 || similar < 0.7) continue;
    const last = tx[tx.length - 1], next = new Date(Date.parse(last.date) + freq[2] * 864e5);
    if (Date.now() - Date.parse(last.date) > freq[2] * 2.2 * 864e5) continue; // ser ud til at være stoppet
    out.push({ key, name: last.note, n: tx.length, freq: freq[0], perYear: freq[1], amount: a, yearly: a * freq[1], last: last.date, next: dayKey(next), cat: last.categoryId,
      fixed: S.recurring.some(r => merchantKey(r.name) === key) });
  }
  return out.sort((x, y) => y.yearly - x.yearly);
}
const subDecision = k => (tools().subs || {})[k] || '';
function subsDetectedCard() {
  const subs = detectSubs(); if (!subs.length) return `<div class="card section" id="subsDetected"><h2>🔎 Fundet i dine posteringer</h2><p class="muted">Ingen gentagne træk fundet endnu. Importér dine kontoudtog fra Lån & Spar (Indstillinger → Import), så finder appen træk, der kommer igen hver måned, kvartal eller år.</p></div>`;
  const opsig = subs.filter(s => subDecision(s.key) === 'opsig'), saving = sum(opsig.map(s => s.yearly));
  return `<div class="card section" id="subsDetected"><h2>🔎 Fundet i dine posteringer <small>${subs.length} gentagne træk · ${kr(sum(subs.map(s => s.yearly)), false)}/år</small></h2>
    <p class="muted small" style="margin-top:0">Træk fra samme modtager med nogenlunde samme beløb hver måned, kvartal eller år. Marker hvad du vil <b>beholde</b> og hvad du vil <b>opsige</b>.</p>
    ${saving ? `<div class="banner ok"><span>💡</span><div class="grow"><strong>Mulig besparelse: ${kr(saving, false)} om året</strong> (${kr(saving / 12, false)}/md.) hvis du opsiger ${opsig.length} ${opsig.length === 1 ? 'aftale' : 'aftaler'}.</div></div>` : ''}
    <div class="list">${subs.map(s => { const c = cat(s.cat), d = subDecision(s.key); return `<div class="row sub-row ${d}" data-sub="${esc(s.key)}">
      <div class="avatar" style="background:${c.color}22">${c.emoji}</div>
      <div class="main-col"><div class="title">${esc(s.name)}</div><div class="meta">${s.freq} · ${s.n} træk · næste ca. ${fmtDate(s.next)}${s.fixed ? ' · <span class="pill">fast post</span>' : ''}</div></div>
      <div class="amt">${kr(s.amount)}<small>${kr(s.yearly, false)}/år</small></div>
      <div class="sub-dec"><button class="chip ${d === 'behold' ? 'on' : ''}" data-subdec="behold" aria-pressed="${d === 'behold'}">Behold</button><button class="chip opsig ${d === 'opsig' ? 'on' : ''}" data-subdec="opsig" aria-pressed="${d === 'opsig'}">Opsig</button></div></div>`; }).join('')}</div></div>`;
}

/* ---------- 2. Månedens rapport ---------- */
function renderRapport() {
  const months = [...new Set(S.transactions.map(t => t.date.slice(0, 7)))].sort(); const cur = curMonth();
  const def = months.filter(m => m < cur).pop() || cur, key = /^\d{4}-\d{2}$/.test(routeParts()[2] || '') ? routeParts()[2] : def;
  const st = stats(key), prev = stats(addMonths(key, -1)), i = months.indexOf(key);
  const nav = `<div class="rep-nav">${i > 0 ? `<a class="icon-btn" href="#/vaerktoejer/rapport/${months[i - 1]}" aria-label="Forrige måned">‹</a>` : '<span></span>'}<b>${monthLabel(key)}${key === cur ? ' <span class="pill">i gang</span>' : ''}</b>${i >= 0 && i < months.length - 1 ? `<a class="icon-btn" href="#/vaerktoejer/rapport/${months[i + 1]}" aria-label="Næste måned">›</a>` : '<span></span>'}</div>`;
  if (!st.tx.length) return nav + `<div class="card empty"><div class="emoji">📰</div><h2>Ingen posteringer i ${monthLabel(key)}</h2><p>Importér dine kontoudtog eller tilføj posteringer, så laver appen en rapport.</p></div>`;
  const top = Object.entries(st.byCat).sort((a, b) => b[1] - a[1]).slice(0, 5), maxC = top.length ? top[0][1] : 1;
  const dExp = st.exp - prev.exp, saved = st.net + sum(S.goals.flatMap(g => (g.contributions || []).filter(c => c.date.startsWith(key) && !c.initial).map(c => c.amount)));
  const tip = reportTip(key, st, prev);
  const delta = (v, inv) => v === 0 || !prev.tx.length ? '' : `<span class="${(v > 0) !== !!inv ? 'neg' : 'pos'}">${v > 0 ? '▲' : '▼'} ${kr(Math.abs(v), false)}</span>`;
  return nav + `<div class="card rep-card">
    <div class="rep-hero"><div><div class="muted small">Brugt i alt</div><div class="rep-big">${kr(st.exp, false)}</div><div class="small">${delta(dExp)} ${prev.tx.length ? 'ift. ' + MONTHS[Number(addMonths(key, -1).slice(5)) - 1] : ''}</div></div>
      <div><div class="muted small">Overskud</div><div class="rep-big ${st.net >= 0 ? 'pos' : 'neg'}">${kr(st.net, false)}</div><div class="small muted">${st.inc ? 'opsparingsrate ' + nf0.format(st.rate) + ' %' : ''}</div></div></div>
    <div class="rep-kpis"><div><span class="muted small">Indtægter</span><b>${kr(st.inc, false)}</b>${delta(st.inc - prev.inc, true)}</div><div><span class="muted small">Sat til side (overskud + mål)</span><b>${kr(Math.max(0, saved), false)}</b></div><div><span class="muted small">Posteringer</span><b>${st.tx.length}</b></div></div>
    <h3>Største kategorier</h3><div class="rep-cats">${top.map(([id, v]) => { const c = cat(id), pv = prev.byCat[id] || 0; return `<div class="rep-cat"><span>${c.emoji} ${esc(c.name)}</span><span class="rep-bar"><i style="width:${v / maxC * 100}%;background:${c.color}"></i></span><b>${kr(v, false)}</b><small class="${v > pv ? 'neg' : 'pos'}">${prev.tx.length ? (v > pv ? '+' : '−') + kr(Math.abs(v - pv), false) : ''}</small></div>`; }).join('')}</div>
    <div class="rep-tip"><span>💡</span><div><b>Månedens tip</b><br>${tip}</div></div></div>`;
}
function reportTip(key, st, prev) {
  const ups = Object.entries(st.byCat).map(([id, v]) => [id, v - (prev.byCat[id] || 0), v]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
  if (prev.tx.length && ups[0] && ups[0][1] > 300) { const c = cat(ups[0][0]); return `Du brugte <b>${kr(ups[0][1], false)} mere på ${esc(c.name.toLowerCase())}</b> end måneden før. ${c.budget > 0 ? `Dit budget er ${kr(c.budget, false)} – ` : 'Sæt et budget på '}<a href="#/budget">fx ${kr(Math.round((ups[0][2] - ups[0][1] / 2) / 50) * 50, false)} næste måned</a>, så halverer du stigningen.`; }
  if (st.inc > 0 && st.rate < 10) return `Din opsparingsrate var ${nf0.format(st.rate)} %. Prøv at sætte en fast overførsel til opsparing på lønningsdagen – selv ${kr(Math.max(250, Math.round(st.inc * 0.05 / 50) * 50), false)} om måneden (ca. 5 %) gør en forskel. <a href="#/maal">Opret et mål</a>.`;
  const subs = detectSubs().filter(s => !subDecision(s.key)); if (subs.length) return `Appen har fundet ${subs.length} gentagne træk for i alt ${kr(sum(subs.map(s => s.yearly)), false)} om året. <a href="#/abonnementer">Gennemgå dem</a> og opsig dem, du ikke bruger.`;
  const t = TIPS[(Number(key.slice(5)) + Number(key.slice(0, 4))) % TIPS.length]; return `<b>${t.e} ${esc(t.t)}:</b> ${esc(t.b)}`;
}

/* ---------- 4. Fradrags-huskeliste ---------- */
// Satser for kørselsfradrag 2026 fra skat.dk (forhøjet ved lov nr. 616 af 30. juni 2026). Kan rettes, hvis satserne ændres.
const BEFORDRING = { 2026: { low: 3.17, high: 1.59, yder: 3.51 }, 2025: { low: 2.23, high: 1.12, yder: 2.47 } };
const FRADRAG = [
  ['befordring', '🚗', 'Kørselsfradrag (befordring)', 'Mere end 24 km tur/retur mellem hjem og arbejde. Gælder alle transportmidler. Kun dage du faktisk kører.', 'https://skat.dk/borger/fradrag/koerselsfradrag/koerselsfradrag-befordringsfradrag'],
  ['haandvaerker', '🔨', 'Håndværker- og servicefradrag', 'Arbejdsløn til fx rengøring, havearbejde, vinduespudsning og visse grønne forbedringer. Kun arbejdsløn – ikke materialer. Betal digitalt og gem fakturaen.', 'https://skat.dk/borger/fradrag/haandvaerker-og-servicefradrag'],
  ['fagforening', '🤝', 'Fagforening', 'Kontingent til fagforening (ikke forsikringsdelen). Indberettes normalt automatisk – tjek årsopgørelsen.', 'https://skat.dk/borger/fradrag'],
  ['akasse', '🛡️', 'A-kasse', 'Kontingent til a-kasse og efterlønsbidrag. Indberettes normalt automatisk.', 'https://skat.dk/borger/fradrag'],
  ['renter', '🏦', 'Renteudgifter', 'Renter på boliglån, banklån, billån og studielån. Indberettes normalt af banken – tjek beløbet, især for private lån.', 'https://skat.dk/borger/fradrag'],
  ['gaver', '🎁', 'Gaver til velgørenhed', 'Gaver til godkendte foreninger. Foreningen indberetter, hvis den har dit CPR-nummer.', 'https://skat.dk/borger/fradrag'],
  ['dobbelt', '🏘️', 'Dobbelt husførelse', 'Hvis du midlertidigt må bo et andet sted end din familie pga. arbejdet. Kræver dokumentation.', 'https://skat.dk/borger/fradrag'],
  ['pt', '💼', 'Udgifter i egen virksomhed (PT)', 'Udstyr, kurser, kørsel, telefon m.m. til din private PT-praksis føres i regnskabet – ikke som ligningsmæssigt fradrag.', 'https://skat.dk/erhverv'],
  ['udlejning', '🏡', 'Udlejning (Airbnb)', 'Ved udlejning af egen bolig er der et bundfradrag eller mulighed for regnskab. Tjek hvilken metode der giver mest.', 'https://skat.dk/borger/fradrag'],
  ['ratepension', '🧓', 'Pensionsindbetalinger', 'Indbetalinger til ratepension og livrente via egen bank. Tjek at de er indberettet.', 'https://skat.dk/borger/fradrag'],
  ['underholdsbidrag', '👨‍👧', 'Børne- og ægtefællebidrag', 'Fastsatte underholdsbidrag kan give fradrag. Modtageren beskattes.', 'https://skat.dk/borger/fradrag'],
  ['fagligt', '📚', 'Faglitteratur, arbejdstøj m.m.', 'Lønmodtageres øvrige udgifter giver kun fradrag ud over et bundbeløb, som fastsættes hvert år – gem kvitteringer.', 'https://skat.dk/borger/fradrag']
];
function fradragState(y) { const f = tools().fradrag || {}; return f[y] || { checks: {}, bef: {} }; }
function setFradrag(y, patch) { const f = tools().fradrag || {}; f[y] = { ...fradragState(y), ...patch }; tSet('fradrag', f); }
function befCalc(y) {
  const b = fradragState(y).bef || {}, r = { ...(BEFORDRING[y] || BEFORDRING[2026]), ...(b.rates || {}) };
  const km = Number(b.km) || 0, days = Number(b.days) || 0, yder = !!b.yder;
  const lowKm = Math.max(0, Math.min(km, 120) - 24), highKm = Math.max(0, km - 120);
  const perDay = lowKm * (yder ? r.yder : r.low) + highKm * (yder ? r.yder : r.high);
  return { km, days, yder, r, perDay, year: perDay * days, value: perDay * days * (Number(b.pct ?? 26) / 100), pct: Number(b.pct ?? 26) };
}
function renderFradrag() {
  const y = Number(routeParts()[2]) || new Date().getFullYear(), st = fradragState(y), bc = befCalc(y), known = !!BEFORDRING[y];
  const done = FRADRAG.filter(f => st.checks[f[0]]).length;
  const nf2i = v => nf2.format(v);
  return `<div class="rep-nav"><a class="icon-btn" href="#/vaerktoejer/fradrag/${y - 1}" aria-label="Forrige år">‹</a><b>Indkomståret ${y}</b><a class="icon-btn" href="#/vaerktoejer/fradrag/${y + 1}" aria-label="Næste år">›</a></div>
  <div class="card section"><div class="tips-hero"><div><h2 style="margin:0">Har du husket det hele?</h2><p class="muted small" style="margin:4px 0 0">Sæt flueben, når du har tjekket fradraget på din forskudsopgørelse eller årsopgørelse i TastSelv. Huskelisten er ikke rådgivning – regler og beløbsgrænser står på skat.dk.</p></div><div class="tips-count"><b>${done}</b><span>af ${FRADRAG.length}</span></div></div><div class="progress"><span style="width:${done / FRADRAG.length * 100}%"></span></div></div>
  <div class="card section" id="befCalc"><h2>🚗 Beregn kørselsfradrag ${y}</h2>
    <div class="grid cols-2">
      <div class="field"><label for="bfKm">Km tur/retur pr. arbejdsdag</label><input class="input" id="bfKm" data-bef="km" inputmode="decimal" placeholder="fx 46" value="${bc.km || ''}"></div>
      <div class="field"><label for="bfDays">Arbejdsdage med kørsel pr. år</label><input class="input" id="bfDays" data-bef="days" inputmode="numeric" placeholder="fx 200" value="${bc.days || ''}"></div>
    </div>
    <label class="switch"><span>Jeg bor i en yderkommune eller på en småø</span><input type="checkbox" id="bfYder" ${bc.yder ? 'checked' : ''}></label>
    <div class="bef-res"><div><span class="muted small">Fradrag pr. dag</span><b>${kr(bc.perDay)}</b></div><div><span class="muted small">Fradrag for året</span><b id="bfYear">${kr(bc.year, false)}</b></div><div><span class="muted small">Ca. skattebesparelse (${nf0.format(bc.pct)} %)</span><b class="pos">${kr(bc.value, false)}</b></div></div>
    <details><summary class="small">Satser (${known ? 'skat.dk ' + y : 'ikke kendt for ' + y + ' – indtast selv'})</summary>
      <div class="grid cols-2" style="margin-top:8px">
        <div class="field"><label for="bfR1">25–120 km (kr/km)</label><input class="input" id="bfR1" data-befr="low" inputmode="decimal" value="${nf2i(bc.r.low)}"></div>
        <div class="field"><label for="bfR2">Over 120 km (kr/km)</label><input class="input" id="bfR2" data-befr="high" inputmode="decimal" value="${nf2i(bc.r.high)}"></div>
        <div class="field"><label for="bfR3">Yderkommune (kr/km)</label><input class="input" id="bfR3" data-befr="yder" inputmode="decimal" value="${nf2i(bc.r.yder)}"></div>
        <div class="field"><label for="bfPct">Fradragets værdi (%)</label><input class="input" id="bfPct" data-bef="pct" inputmode="decimal" value="${nf0.format(bc.pct)}"></div></div>
      <p class="muted small">Satser for 2026 og 2025 fra skat.dk (2026-satserne er forhøjet med tilbagevirkende kraft). De første 24 km pr. dag giver intet fradrag. Fradragets værdi er ca. 26 % ifølge skat.dk. Beregningen er vejledende – brug skat.dk's beregner til det endelige tal.</p>
      <a class="btn btn-sm btn-ghost" href="https://skat.dk/borger/fradrag/koerselsfradrag/beregn-dit-koerselsfradrag" target="_blank" rel="noopener">skat.dk: Beregn dit kørselsfradrag ↗</a></details>
  </div>
  <div class="card section"><h2>Huskeliste</h2><div class="list">${FRADRAG.map(([id, e, n, d, href]) => `<label class="row fd-row ${st.checks[id] ? 'done' : ''}">
      <input type="checkbox" class="fd-check" data-fd="${id}" data-year="${y}" ${st.checks[id] ? 'checked' : ''}>
      <div class="main-col"><div class="title">${e} ${n}${id === 'befordring' && bc.year ? ` <span class="pill ok">${kr(bc.year, false)}</span>` : ''}</div><div class="meta fd-desc">${d}</div></div>
      <a class="btn btn-sm btn-ghost" href="${href}" target="_blank" rel="noopener" aria-label="Læs om ${esc(n)} på skat.dk">skat.dk ↗</a></label>`).join('')}</div></div>`;
}

/* ---------- 5. Regningskalender ---------- */
function upcomingBills(n = 12) {
  const start = curMonth(), subs = detectSubs().filter(s => s.perYear < 12 && !s.fixed), out = [];
  for (let i = 0; i < n; i++) {
    const key = addMonths(start, i), items = [];
    for (const r of S.recurring) if (r.type === 'expense' && (!r.endMonth || r.endMonth >= key) && (!r.startMonth || r.startMonth <= key) && !(r.skipped || []).includes(key))
      items.push({ day: Math.min(r.day || 1, dim(key)), name: r.name, amount: r.amount, cat: r.categoryId, kind: r.kind === 'abonnement' ? 'Abonnement' : 'Fast' });
    for (const s of subs) { let d = new Date(s.next); for (let k = 0; k < 6 && dayKey(d).slice(0, 7) < key; k++) d = new Date(d.getTime() + (365 / s.perYear) * 864e5);
      if (dayKey(d).slice(0, 7) === key) items.push({ day: d.getDate(), name: s.name, amount: s.amount, cat: s.cat, kind: s.freq === 'årlig' ? 'Årlig' : 'Kvartal', est: true }); }
    items.sort((a, b) => a.day - b.day); out.push({ key, items, total: sum(items.map(x => x.amount)) });
  }
  return out;
}
function renderKalender() {
  const months = upcomingBills(12), avgT = avg(months.map(m => m.total)) || 0, max = Math.max(1, ...months.map(m => m.total));
  const heavy = m => m.total > avgT * 1.15 && m.total - avgT > 500;
  const today = new Date().getDate();
  if (!months.some(m => m.items.length)) return `<div class="card empty"><div class="emoji">📅</div><h2>Ingen faste udgifter endnu</h2><p>Tilføj faste udgifter som husleje, forsikring og abonnementer, så viser kalenderen dine kommende regninger.</p><a class="btn btn-primary" href="#/abonnementer">＋ Tilføj faste poster</a></div>`;
  return `<div class="card section"><h2>Næste 12 måneder <small>gns. ${kr(avgT, false)}/md.</small></h2>
    <div class="cal-bars" role="list">${months.map(m => `<a href="#cal-${m.key}" class="cal-bar ${heavy(m) ? 'heavy' : ''}" role="listitem" title="${monthLabel(m.key)}: ${kr(m.total, false)}"><i style="height:${Math.max(4, m.total / max * 100)}%"></i><span>${MSHORT[Number(m.key.slice(5)) - 1]}</span></a>`).join('')}</div>
    <p class="muted small">Røde søjler er tunge måneder – over 15 % dyrere end gennemsnittet. Kvartals- og årlige træk er fundet i dine posteringer og er anslåede.</p></div>
  ${months.map((m, i) => `<div class="card section cal-month ${heavy(m) ? 'heavy' : ''}" id="cal-${m.key}"><h2>${monthLabel(m.key)} <small>${kr(m.total, false)}</small>${heavy(m) ? ' <span class="pill bad">⚠️ Tung måned</span>' : ''}</h2>
    ${heavy(m) ? `<p class="small sync-warn">Denne måned er ${kr(m.total - avgT, false)} dyrere end normalt. Overvej at sætte penge til side de foregående måneder.</p>` : ''}
    <div class="cal-list">${m.items.map(x => { const c = cat(x.cat), past = i === 0 && x.day < today; return `<div class="cal-item ${past ? 'past' : ''}"><div class="cal-day"><b>${x.day}</b><span>${MSHORT[Number(m.key.slice(5)) - 1]}</span></div><div class="main-col"><div class="title">${c.emoji} ${esc(x.name)}</div><div class="meta">${x.kind}${x.est ? ' · anslået' : ''}${past ? ' · betalt' : ''}</div></div><div class="amt">${kr(x.amount, false)}</div></div>`; }).join('') || '<p class="muted small">Ingen regninger.</p>'}</div></div>`).join('')}`;
}

/* ---------- 6. Elforbrug i kroner ---------- */
function renderElforbrug() {
  const st = elSet(), m = elModel(), total = spot => (spot + st.nettarif + st.tillaeg + st.elafgift) * (1 + st.moms / 100);
  if (!m.today.length && !Elp.loading) setTimeout(() => elFetch(false), 0);
  const raw = k => (elDay(st.area, dayKey(addDays(new Date(), k))) || []);
  const cur = raw(0).find(p => p[0] <= Date.now() && Date.now() < p[1]);
  const fut = [...raw(0).filter(p => p[1] > Date.now()), ...raw(1)].map(p => [p[0], p[1], total(p[2])]), win = cheapestWindow(fut);
  const now = cur ? total(cur[2]) : null;
  return `<div class="card section"><h2>Din elaftale</h2>
    <p class="muted small" style="margin-top:0">Bruges også på <a href="#/elpriser">⚡ Elpriser</a>. Find tallene på din elregning eller hos dit netselskab.</p>
    <div class="grid cols-2">
      <div class="field"><label for="efTill">Elselskabets tillæg til spotprisen (kr/kWh ekskl. moms)</label><input class="input" id="efTill" data-el="tillaeg" inputmode="decimal" value="${nfKwh.format(st.tillaeg)}"></div>
      <div class="field"><label for="efNet">Gns. nettarif inkl. Energinet (kr/kWh ekskl. moms)</label><input class="input" id="efNet" data-el="nettarif" inputmode="decimal" value="${nfKwh.format(st.nettarif)}"></div>
    </div>
    <div class="segmented el-area" id="elAreaSeg"><button type="button" data-a="DK1" class="${st.area === 'DK1' ? 'on' : ''}">DK1 · Vest</button><button type="button" data-a="DK2" class="${st.area === 'DK2' ? 'on' : ''}">DK2 · Øst</button></div>
    <div class="bef-res"><div><span class="muted small">Din pris lige nu</span><b id="efNow">${now != null ? krKwh(now) : Elp.loading ? 'Henter…' : '–'}</b></div><div><span class="muted small">Billigste 3 timer</span><b>${win ? `${hhmm(win.start)}–${hhmm(win.end)}` : '–'}</b></div><div><span class="muted small">Pris i perioden</span><b class="pos">${win ? krKwh(win.avg) : '–'}</b></div></div>
    <p class="muted small">Anslået totalpris = (spotpris + tillæg + nettarif + elafgift) + ${nf0.format(st.moms)} % moms. Nettariffen er et gennemsnit – den er højere kl. 17–21.</p></div>
  <div class="card section" id="efTable"><h2>Hvad koster det?</h2>
    ${now != null || win ? `<div class="list">${ELP.appliances.map(([k, e, n]) => { const kwh = st.kwh[k] || 0, a = now != null ? kwh * now : null, b = win ? kwh * win.avg : null; return `<div class="row ef-row"><div class="avatar">${e}</div>
      <div class="main-col"><div class="title">${n}</div><div class="meta"><input class="input mini-in" data-elkwh="${k}" inputmode="decimal" value="${nfKwh.format(kwh)}" aria-label="kWh for ${n}"> kWh pr. gang</div></div>
      <div class="ef-cmp"><span><small>Nu</small><b>${a != null ? kr(a) : '–'}</b></span><span><small>${win ? hhmm(win.start) : 'Billigst'}</small><b class="pos">${b != null ? kr(b) : '–'}</b></span>${a != null && b != null && a - b > 0.005 ? `<em class="pos">spar ${kr(a - b)}</em>` : ''}</div></div>`; }).join('')}</div>
    <p class="muted small">Forbrug pr. gang er typiske tal – ret dem til dine egne maskiner (energimærket viser kWh pr. program).</p>` : `<p class="muted">${Elp.err ? esc(Elp.err) : 'Henter elpriser…'}</p>`}</div>`;
}

/* ---------- 7. Pensionstjek ---------- */
const PEN_DEF = { age: 32, retire: 68, saved: 150000, monthly: 3000, income: 35000, want: 67, ret: 3, years: 22, folk: 0 };
function penCalc() {
  const p = { ...PEN_DEF, ...(tools().pension || {}) }, n = Math.max(0, p.retire - p.age), r = p.ret / 100, rm = Math.pow(1 + r, 1 / 12) - 1;
  const fv = p.saved * Math.pow(1 + r, n) + (rm ? p.monthly * (Math.pow(1 + rm, n * 12) - 1) / rm : p.monthly * n * 12);
  const months = p.years * 12, pay = rm ? fv * rm / (1 - Math.pow(1 + rm, -months)) : fv / months;
  const goal = p.income * p.want / 100, total = pay + Number(p.folk || 0), gap = goal - total;
  const needMonthly = gap > 0 && n > 0 ? (gap / (rm ? rm / (1 - Math.pow(1 + rm, -months)) : 1 / months)) * (rm ? rm / (Math.pow(1 + rm, n * 12) - 1) : 1 / (n * 12)) : 0;
  return { p, n, fv, pay, goal, total, gap, needMonthly, pct: goal ? total / goal * 100 : 0 };
}
function renderPension() {
  const c = penCalc(), p = c.p, f = (id, k, l, unit) => `<div class="field"><label for="pn-${k}">${l}</label><div class="input-unit"><input class="input" id="pn-${k}" data-pen="${k}" inputmode="decimal" value="${nf0.format(p[k])}"><span>${unit}</span></div></div>`;
  const ok = c.pct >= 95, close = c.pct >= 75;
  return `<div class="card section"><h2>Dine tal</h2><div class="grid cols-2">
      ${f(1, 'age', 'Din alder nu', 'år')}${f(2, 'retire', 'Ønsket pensionsalder', 'år')}
      ${f(3, 'saved', 'Pensionsopsparing i dag (alle ordninger)', 'kr')}${f(4, 'monthly', 'Indbetaling pr. måned (dig + arbejdsgiver)', 'kr')}
      ${f(5, 'income', 'Månedsløn før skat i dag', 'kr')}${f(6, 'want', 'Ønsket pension i % af lønnen', '%')}
    </div>
    <details><summary class="small">Forudsætninger (kan rettes)</summary><div class="grid cols-2" style="margin-top:8px">
      ${f(7, 'ret', 'Årligt afkast efter omkostninger og inflation', '%')}${f(8, 'years', 'Antal år pensionen skal udbetales', 'år')}
      ${f(9, 'folk', 'Folkepension m.m. pr. måned (i dagens kroner, valgfri)', 'kr')}</div>
      <p class="muted small">Alle beløb er i dagens kroner (realt afkast). Folkepensionen afhænger af regler, indtægt og formue – se dit tal på <a href="https://www.borger.dk/pension-og-efterloen" target="_blank" rel="noopener">borger.dk</a> og hele dit overblik på <a href="https://www.pensionsinfo.dk" target="_blank" rel="noopener">PensionsInfo</a>.</p></details></div>
  <div class="card section pen-res ${ok ? 'ok' : close ? 'mid' : 'bad'}" id="penRes"><div class="pen-face">${ok ? '😀' : close ? '😐' : '🙁'}</div>
    <h2>${ok ? 'Du ser ud til at være på rette spor' : close ? 'Du er tæt på' : 'Du er bagud i forhold til dit mål'}</h2>
    <div class="progress"><span style="width:${Math.min(100, c.pct)}%"></span></div>
    <div class="bef-res"><div><span class="muted small">Opsparing ved ${p.retire} år</span><b>${kr(c.fv, false)}</b></div><div><span class="muted small">Ca. pr. måned i ${p.years} år</span><b>${kr(c.total, false)}</b></div><div><span class="muted small">Dit mål pr. måned</span><b>${kr(c.goal, false)}</b></div></div>
    <p>${ok ? `Med de tal når du ca. ${nf0.format(c.pct)} % af dit mål.` : `Du når ca. ${nf0.format(c.pct)} % af dit mål. ${c.needMonthly > 0 ? `For at lukke hullet skal du indbetale ca. <b>${kr(c.needMonthly, false)} mere pr. måned</b> – eller gå senere på pension.` : ''}`}</p>
    <p class="muted small">⚠️ Et groft skøn før skat – ikke rådgivning. Afkast, skat, folkepension og regler ændrer sig. Tal med din pensionsselskab eller bank om din egen situation.</p></div>`;
}

/* ---------- 8. Udfordringer & streaks ---------- */
const CHALLENGES = [
  { id: 'no-takeaway', e: '🥡', n: '30 dage uden takeaway', d: 'Lav mad selv i 30 dage.', days: 30, badge: ['🍳', 'Køkkenchef'] },
  { id: 'spar500', e: '💰', n: 'Spar 500 kr denne uge', d: 'Sæt 500 kr ekstra til side inden for 7 dage – check ind hver dag, du holder igen.', days: 7, badge: ['🐷', 'Sparegris'] },
  { id: 'nospend-weekend', e: '🛑', n: 'No-spend weekend', d: 'Ingen køb fredag aften til søndag – kun det allermest nødvendige.', days: 3, badge: ['🧘', 'Zen-weekend'] },
  { id: 'kaffe', e: '☕', n: '14 dage med medbragt kaffe', d: 'Drop to-go-kaffen i to uger.', days: 14, badge: ['🫖', 'Termokop'] },
  { id: 'madpakke', e: '🥪', n: '20 dage med madpakke', d: 'Tag madpakke med på arbejde.', days: 20, badge: ['🥪', 'Madpakke-mester'] },
  { id: 'no-impulse', e: '🛍️', n: '7 dage uden impulskøb', d: 'Vent 24 timer før hvert køb, der ikke er planlagt.', days: 7, badge: ['🧠', 'Viljestyrke'] },
  { id: 'cykel', e: '🚴', n: '10 dage på cykel', d: 'Cykel i stedet for bil eller bus.', days: 10, badge: ['🚲', 'Pedalkraft'] },
  { id: 'el', e: '⚡', n: '7 dage med billig strøm', d: 'Kør vask og opvask i billige timer (se Elpriser).', days: 7, badge: ['🔌', 'Strømspareren'] }
];
const chState = () => tools().challenges || { active: {}, done: {} };
const activeChallenges = () => Object.entries(chState().active || {}).map(([id, v]) => ({ id, ...v, def: CHALLENGES.find(c => c.id === id) })).filter(c => c.def);
function streakOf(c) { const set = new Set(c.checkins || []); let n = 0, d = new Date(); if (!set.has(dayKey(d))) d = addDays(d, -1); while (set.has(dayKey(d))) { n++; d = addDays(d, -1); } return n; }
function setCh(fn) { const s = JSON.parse(JSON.stringify(chState())); s.active = s.active || {}; s.done = s.done || {}; fn(s); tSet('challenges', s); }
function renderUdfordringer() {
  const s = chState(), act = activeChallenges(), today = dayKey(new Date());
  const card = c => { const d = c.def, n = (c.checkins || []).length, pct = Math.min(100, n / d.days * 100), st = streakOf(c), checked = (c.checkins || []).includes(today);
    return `<div class="card ch-card" data-ch="${d.id}"><div class="ch-top"><span class="ch-e">${d.e}</span><div class="main-col"><b>${d.n}</b><div class="muted small">${d.d}</div></div><div class="ch-streak" title="Streak">🔥 <b>${st}</b></div></div>
      <div class="progress"><span style="width:${pct}%"></span></div><div class="ch-meta muted small">${n} af ${d.days} dage · startet ${fmtDate(c.start)}</div>
      <div class="ch-dots">${Array.from({ length: Math.min(d.days, 30) }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>
      <div class="btn-row"><button class="btn ${checked ? '' : 'btn-primary'}" data-chk="${d.id}" ${checked ? 'disabled' : ''}>${checked ? '✓ Checket ind i dag' : '✅ Check ind for i dag'}</button><button class="btn btn-sm btn-ghost" data-chquit="${d.id}">Stop</button></div></div>`; };
  const avail = CHALLENGES.filter(c => !(s.active || {})[c.id]);
  const best = Math.max(0, ...act.map(streakOf));
  return `<div class="grid kpis"><div class="card kpi hero"><div class="label">🔥 Længste aktive streak</div><div class="value">${best} ${best === 1 ? 'dag' : 'dage'}</div><div class="sub">${act.length} aktive udfordringer</div></div>
    <div class="card kpi"><div class="label">🏅 Badges</div><div class="value">${Object.keys(s.done || {}).length} / ${CHALLENGES.length}</div><div class="sub">fra udfordringer</div></div></div>
  ${act.length ? `<h3 class="track-h">I gang</h3><div class="ch-grid">${act.map(card).join('')}</div>` : ''}
  <h3 class="track-h">Start en udfordring</h3><div class="ch-grid">${avail.map(c => `<div class="card ch-card idle"><div class="ch-top"><span class="ch-e">${c.e}</span><div class="main-col"><b>${c.n}</b><div class="muted small">${c.d}</div></div></div>
    <div class="ch-meta muted small">${c.days} dage · badge: ${c.badge[0]} ${c.badge[1]}${s.done && s.done[c.id] ? ' · ✅ klaret før' : ''}</div><button class="btn btn-sm" data-chstart="${c.id}">▶ Start</button></div>`).join('')}</div>
  ${challengeBadges()}`;
}
function challengeBadges() {
  const done = chState().done || {};
  return `<div class="card section" id="chBadges"><h2>🏅 Badges fra udfordringer <span class="muted small" style="font-weight:500">${Object.keys(done).length} af ${CHALLENGES.length}</span></h2>
    <div class="badge-grid">${CHALLENGES.map(c => `<a class="badge ${done[c.id] ? 'got' : ''}" href="#/vaerktoejer/udfordringer" title="${esc(c.n)}"><span class="badge-ico">${done[c.id] ? c.badge[0] : '🔒'}</span><b>${c.badge[1]}</b><span class="muted small">${done[c.id] ? 'Optjent ' + fmtDate(done[c.id]) : esc(c.n)}</span></a>`).join('')}</div></div>`;
}

/* ---------- Konfetti ---------- */
function confetti(ms = 2200) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.createElement('canvas'); cv.className = 'confetti'; cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(cv);
  const ctx = cv.getContext('2d'), dpr = devicePixelRatio || 1, W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr;
  const P = Array.from({ length: 140 }, () => ({ x: W / 2 + (Math.random() - .5) * W * .3, y: H * .35, vx: (Math.random() - .5) * 14 * dpr, vy: (-Math.random() * 14 - 4) * dpr, s: (4 + Math.random() * 5) * dpr, c: COLORS[Math.floor(Math.random() * 8)], r: Math.random() * 6, vr: (Math.random() - .5) * .3 }));
  const t0 = performance.now(); window.__confetti = (window.__confetti || 0) + 1;
  (function f(t) { ctx.clearRect(0, 0, W, H); for (const p of P) { p.vy += .35 * dpr; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }
    if (t - t0 < ms) requestAnimationFrame(f); else cv.remove(); })(t0);
}
// Billede til sparemål: skaleres ned og gemmes som lille JPEG (data-URL) i målet, så det kommer med i backup og synk
function goalImageFromFile(file) {
  return new Promise((res, rej) => { const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const s = 320, k = Math.min(1, s / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.8)); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('billede')); }; img.src = url; });
}

/* ---------- Hændelser ---------- */
const toolNum = v => { const n = Number(String(v).replace(/\s/g, '').replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : null; };
function toolRerender() { const y = window.scrollY, open = [...document.querySelectorAll('.tool-page details[open]')].map(d => d.querySelector('summary')?.textContent); render(); window.scrollTo({ top: y }); document.querySelectorAll('.tool-page details').forEach(d => { if (open.includes(d.querySelector('summary')?.textContent)) d.open = true; }); }
document.addEventListener('click', e => {
  const sd = e.target.closest('[data-subdec]'); if (sd) { const k = sd.closest('[data-sub]').dataset.sub, v = sd.dataset.subdec, m = { ...(tools().subs || {}) }; m[k] = m[k] === v ? '' : v; if (!m[k]) delete m[k]; tSet('subs', m); const y = scrollY; render(); scrollTo({ top: y }); return; }
  const cs = e.target.closest('[data-chstart]'); if (cs) { setCh(s => { s.active[cs.dataset.chstart] = { start: todayISO(), checkins: [] }; }); toolRerender(); toast('Udfordring startet – held og lykke! 💪'); return; }
  const cq = e.target.closest('[data-chquit]'); if (cq) { if (!confirm('Stop udfordringen? Dine check-ins slettes.')) return; setCh(s => { delete s.active[cq.dataset.chquit]; }); toolRerender(); return; }
  const ck = e.target.closest('[data-chk]'); if (ck) { const id = ck.dataset.chk, def = CHALLENGES.find(c => c.id === id); let finished = false;
    setCh(s => { const a = s.active[id]; if (!a) return; a.checkins = [...new Set([...(a.checkins || []), todayISO()])]; if (a.checkins.length >= def.days) { s.done[id] = todayISO(); delete s.active[id]; finished = true; } });
    toolRerender(); if (finished) { confetti(); toast(`Udfordring klaret! Badge: ${def.badge[0]} ${def.badge[1]}`); } else toast(`Checket ind 🔥 ${streakOf({ checkins: chState().active[id].checkins })} dage i træk`); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.classList.contains('fd-check')) { const y = Number(t.dataset.year), st = fradragState(y); setFradrag(y, { checks: { ...st.checks, [t.dataset.fd]: t.checked } }); toolRerender(); }
  if (t.dataset.bef || t.dataset.befr || t.id === 'bfYder') { const y = Number(routeParts()[2]) || new Date().getFullYear(), st = fradragState(y), b = { ...(st.bef || {}) };
    if (t.id === 'bfYder') b.yder = t.checked; else { const n = toolNum(t.value); if (n == null || n < 0) { toast('Skriv et tal'); toolRerender(); return; } if (t.dataset.befr) b.rates = { ...(b.rates || {}), [t.dataset.befr]: n }; else b[t.dataset.bef] = n; }
    setFradrag(y, { bef: b }); toolRerender(); }
  if ((t.dataset.el || t.dataset.elkwh) && route() === 'vaerktoejer') setTimeout(toolRerender, 0);
  if (t.dataset.pen) { const n = toolNum(t.value); if (n == null || n < 0) { toast('Skriv et tal'); toolRerender(); return; } tSet('pension', { ...PEN_DEF, ...(tools().pension || {}), [t.dataset.pen]: n, at: todayISO() }); toolRerender(); }
});
