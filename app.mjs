import { START, TOTAL_DAYS, PROMISED, dayNumber, dateForDay, normalizeSourceUrl, seals, pace, userTally, compact, routeX, routeY, roadPath, paceSigns } from './lib/herald.mjs';

const $ = s => document.querySelector(s);
let records, warning = '', toastTimer;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (date, opts = { month: 'short', day: 'numeric' }) => new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
const upper = date => fmt(date).toUpperCase();
const chicagoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

function toast(text) { $('#toast').textContent = text; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2800); }
function sourceLink(url, text) {
  const safe = normalizeSourceUrl(url);
  return safe ? `<a class="sign-link" href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${text}</a>` : '';
}

const VERDICT = {
  upcoming: ['Not started', 'The trip starts Oct 10.'],
  'on-pace': ['On pace', 'Right on schedule: one stop every five days keeps the promise.'],
  ahead: ['Ahead', 'Driving faster than promised.'],
  behind: ['Behind', 'Falling behind one stop every five days.'],
  kept: ['Promise kept', 'All 12 stops reached. 🎄'],
  short: ['Fell short', 'The 60 days are up.'],
};

function renderTrip(p) {
  $('#delivered').textContent = p.delivered;
  const [pill, line] = VERDICT[p.status];
  $('#status-pill').textContent = pill;
  $('#status-pill').className = `pill ${p.status}`;
  $('#verdict').textContent = (p.status === 'short' ? `${p.delivered} of 12 stops reached by Dec 8.` : line) + (p.bonus ? ` Plus ${plural(p.bonus, 'bonus stop')}.` : '');
  $('#eyebrow').textContent = p.phase === 'live' ? `Day ${p.day} of 60 · Oct 10 → Dec 8` : p.phase === 'complete' ? 'Trip complete · Oct 10 → Dec 8' : 'Starts Oct 10 · Oct 10 → Dec 8';
  $('#days-left').textContent = p.phase === 'live' ? `${plural(p.daysLeft, 'day')} left` : p.phase === 'complete' ? 'The 60 days are up' : '60 days to go';
  $('#next-due').textContent = p.nextDue ? `Stop ${p.delivered + 1} due by ${fmt(p.nextDue)}` : '';
  $('#segments').innerHTML = Array.from({ length: PROMISED }, (_, i) => `<i class="${i < p.counted ? 'on' : ''}" style="--i:${i}"></i>`).join('');
}

function renderUsers() {
  const t = userTally(records.users), chip = $('#users-chip');
  if (!t) { chip.hidden = true; return; }
  chip.hidden = false;
  chip.href = normalizeSourceUrl(t.source_url) || '#';
  chip.innerHTML = `<strong>${compact(t.users)}+</strong> users${t.points > 1 && t.growth > 0 ? ` <span class="up">▲ ${compact(t.growth)} since ${fmt(t.since)}</span>` : ` <span class="muted">as of ${fmt(t.as_of)}</span>`}`;
}

/** The road map. Seasons follow the calendar: October fall, November Thanksgiving, December winter. */
function renderRoute(p, today) {
  const mid = (a, b) => Math.round((routeX(a) + routeX(b)) / 2);
  const novX = mid(dayNumber('2026-10-31'), dayNumber('2026-11-01'));
  const decX = mid(dayNumber('2026-11-30'), dayNumber('2026-12-01'));
  const tgX = Math.round(routeX(dayNumber('2026-11-26')));
  const road = roadPath();
  const signs = paceSigns(p.counted).map(s => {
    const top = s.y - 62, w = s.n > 9 ? 34 : 30;
    return `<g class="pace-sign${s.reached ? ' reached' : ''}"><title>Stop ${s.n} due by ${fmt(s.date)}</title><line x1="${s.x}" y1="${top + 26}" x2="${s.x}" y2="${s.y - 17}"/><rect x="${s.x - w / 2}" y="${top}" width="${w}" height="26" rx="4"/><text x="${s.x}" y="${top + 18}">${s.n}</text></g>`;
  }).join('');
  const dots = records.features.filter(f => dayNumber(f.shipped_on) && f.shipped_on <= today).map(f => {
    const x = routeX(dayNumber(f.shipped_on));
    return `<circle class="ship-dot" cx="${Math.round(x)}" cy="${Math.round(routeY(x))}" r="7"><title>${esc(f.title)} · ${fmt(f.shipped_on)}</title></circle>`;
  }).join('');
  const carDay = p.phase === 'upcoming' ? 1 : p.day;
  const cx = Math.round(routeX(carDay)), cy = Math.round(routeY(cx));
  const carLabel = p.phase === 'complete' ? 'TRIP COMPLETE' : p.phase === 'upcoming' ? 'STARTS OCT 10' : `TODAY · DAY ${p.day}`;
  const labelX = Math.min(1120, Math.max(80, cx));
  $('#route').innerHTML = `<svg viewBox="0 0 1200 240" role="img" aria-label="Route map from Oct 10 to Dec 8 through fall, Thanksgiving and winter. ${p.counted} of 12 stops reached.${p.phase === 'live' ? ` Today is day ${p.day}.` : ''}">
    <rect class="z-fall" x="0" y="0" width="${novX}" height="240"/>
    <rect class="z-nov" x="${novX}" y="0" width="${decX - novX}" height="240"/>
    <rect class="z-dec" x="${decX}" y="0" width="${1200 - decX}" height="240"/>
    <text class="zone fall" x="24" y="32">FALL · OCT</text>
    <text class="zone nov" x="${novX + 20}" y="32">THANKSGIVING · NOV</text>
    <text class="zone dec" x="${decX + 16}" y="32">WINTER · DEC</text>
    <g class="leaves"><ellipse cx="70" cy="214" rx="9" ry="5" transform="rotate(-25 70 214)"/><ellipse class="l2" cx="160" cy="205" rx="8" ry="4" transform="rotate(20 160 205)"/><ellipse class="l3" cx="300" cy="218" rx="9" ry="5" transform="rotate(-10 300 218)"/><ellipse cx="420" cy="62" rx="8" ry="4" transform="rotate(30 420 62)"/><ellipse class="l3" cx="60" cy="70" rx="7" ry="4" transform="rotate(-30 60 70)"/><ellipse class="l2" cx="560" cy="212" rx="8" ry="4" transform="rotate(15 560 212)"/></g>
    <g class="snow"><circle cx="${decX + 30}" cy="205" r="3"/><circle cx="${decX + 70}" cy="222" r="2.5"/><circle cx="${decX + 110}" cy="200" r="3"/><circle cx="${decX + 150}" cy="216" r="2"/><circle cx="${decX + 60}" cy="90" r="2"/><circle cx="${decX + 140}" cy="100" r="2.5"/></g>
    <g class="lights"><polyline points="${decX + 16},50 ${decX + 50},60 ${decX + 84},50 ${decX + 118},60 ${decX + 152},50"/><circle class="b1" cx="${decX + 16}" cy="50" r="4.5"/><circle class="b2" cx="${decX + 50}" cy="60" r="4.5"/><circle class="b3" cx="${decX + 84}" cy="50" r="4.5"/><circle class="b1" cx="${decX + 118}" cy="60" r="4.5"/><circle class="b2" cx="${decX + 152}" cy="50" r="4.5"/></g>
    <g class="tg-sign"><line x1="${tgX}" y1="182" x2="${tgX}" y2="198"/><rect x="${tgX - 80}" y="198" width="160" height="26" rx="4"/><text x="${tgX}" y="216">THANKSGIVING 11/26</text></g>
    <path class="road" d="${road}"/><path class="road-line" d="${road}"/>
    ${signs}${dots}
    <g class="car" style="--x:${cx}px;--y:${cy}px"><rect class="cabin" x="-13" y="-29" width="24" height="11" rx="4"/><rect class="window" x="-9" y="-27" width="16" height="6" rx="2"/><rect class="body" x="-22" y="-20" width="44" height="14" rx="5"/><circle class="wheel" cx="-13" cy="-5" r="5"/><circle class="wheel" cx="13" cy="-5" r="5"/></g>
    <text class="car-label" x="${labelX}" y="205">${carLabel}</text>
    <text class="end-label fall" x="40" y="232">OCT 10</text><text class="end-label dec" x="1160" y="232">DEC 8</text>
  </svg>`;
}

function exitCard(f, label, extra = '') {
  return `<button class="exit shipped${extra}" data-feature="${esc(f.id)}"><span class="exit-inner"><span class="exit-meta"><span class="exit-tag">${label}</span><span>${upper(f.shipped_on)}${dayNumber(f.shipped_on) ? ` · DAY ${dayNumber(f.shipped_on)}` : ' · AFTER DEC 8'}</span></span><span class="exit-title">${esc(f.title)}</span><span class="exit-summary">${esc(f.summary)}</span></span></button>`;
}

function renderExits(p) {
  const { slots, bonus, late } = seals(records.features.filter(f => f.shipped_on <= chicagoToday()));
  let nextShown = false, later = 0;
  const cards = slots.map(s => {
    if (s.feature) return exitCard(s.feature, `EXIT ${s.number}`);
    const due = dateForDay(s.number * (TOTAL_DAYS / PROMISED));
    if (!nextShown && p.phase !== 'complete') { nextShown = true; return `<div class="exit next"><span class="exit-meta"><span class="exit-tag">EXIT ${s.number}</span><span>NEXT STOP</span></span><span class="exit-title">Due by ${fmt(due)} to stay on pace</span></div>`; }
    later++;
    return `<div class="exit later"><span class="exit-meta"><span>EXIT ${s.number}${s.number === PROMISED ? ' · FINAL' : ''}</span></span><span class="exit-due">${p.phase === 'complete' ? 'Not reached' : `Due by ${fmt(due)}`}</span></div>`;
  });
  const extras = [...bonus.map(f => exitCard(f, 'BONUS EXIT', ' bonus')), ...late.map(f => exitCard(f, 'LATE EXIT', ' late'))];
  $('#exits').innerHTML = cards.join('') + extras.join('') + (later ? `<p class="more">${plural(later, 'more exit')} down the road</p>` : '');
}

function render() {
  const today = chicagoToday();
  const p = pace(records.features, today);
  renderTrip(p); renderUsers(); renderRoute(p, today); renderExits(p);
  const src = records.challenge.source_url;
  if (/^https:\/\/x\.com\//.test(src || '')) $('#promise-link').href = src;
  $('#data-status').textContent = `Updated ${fmt(records.challenge.verified_at)}${warning ? `. ${warning}` : ''}`;
}

function showFeature(id) {
  const f = records.features.find(x => x.id === id);
  if (!f) return;
  const n = seals(records.features).slots.findIndex(s => s.feature?.id === id) + 1;
  const product = f.product_url && /^https:\/\//.test(f.product_url) ? `<a class="sign-link" href="${esc(f.product_url)}" target="_blank" rel="noopener noreferrer">Try it ↗</a>` : '';
  $('#detail').innerHTML = `<div class="exit shipped big-sign"><span class="exit-inner"><span class="exit-meta"><span class="exit-tag">${n ? `EXIT ${n}` : 'BONUS EXIT'}</span><span>${upper(f.shipped_on)}${dayNumber(f.shipped_on) ? ` · DAY ${dayNumber(f.shipped_on)}` : ''}</span></span><span class="exit-title">${esc(f.title)}</span><span class="exit-summary">${esc(f.summary)}</span><span class="exit-links">${sourceLink(f.source_url, 'Source on X ↗')}${product}</span></span></div><p class="dialog-cat">${esc(f.category)}</p>`;
  $('#detail-dialog').showModal();
}

function validRecords(v) {
  return v?.challenge && Array.isArray(v.features) && Array.isArray(v.users)
    && v.features.every(f => typeof f.id === 'string' && typeof f.title === 'string' && typeof f.summary === 'string' && typeof f.category === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f.shipped_on) && f.shipped_on >= START && normalizeSourceUrl(f.source_url))
    && v.users.every(u => /^\d{4}-\d{2}-\d{2}$/.test(u.as_of) && Number.isFinite(u.users) && normalizeSourceUrl(u.source_url));
}

async function load() {
  const button = $('#refresh'); button.disabled = true; button.textContent = '↻ Loading'; warning = '';
  try {
    const r = await fetch('/api/tracker', { cache: 'no-store', signal: AbortSignal.timeout(12000) });
    if (!r.ok) throw new Error('Storage unavailable');
    const data = await r.json();
    if (!validRecords(data)) throw new Error('Invalid records');
    records = data;
  } catch {
    if (records) { warning = 'Refresh failed; showing the last loaded records.'; toast('Couldn’t refresh. Your last loaded records are still here.'); }
    else {
      $('#exits').innerHTML = '<div class="empty"><h3>We hit a detour.</h3><p>Live data is unavailable right now. Try Refresh in a moment.</p></div>';
      $('#status-pill').textContent = 'Unavailable'; $('#data-status').textContent = 'Live data unavailable';
      return;
    }
  } finally { button.disabled = false; button.textContent = '↻ Refresh'; }
  render();
}

document.addEventListener('click', e => {
  const feature = e.target.closest('[data-feature]'); if (feature) showFeature(feature.dataset.feature);
  if (e.target.closest('.dialog-close')) e.target.closest('dialog').close();
});
document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => {
  if (e.target !== d) return;
  const b = d.getBoundingClientRect();
  if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) d.close();
}));
$('#refresh').addEventListener('click', load);
$('#agent-open').addEventListener('click', () => { $('#copy-status').textContent = ''; $('#agent-dialog').showModal(); });
$('#copy-agent-prompt').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#agent-prompt').value); $('#copy-status').textContent = 'Copied'; }
  catch { $('#agent-prompt').focus(); $('#agent-prompt').select(); $('#copy-status').textContent = 'Copy unavailable. Select and copy it manually.'; }
});
load();
