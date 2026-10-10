import { START, TOTAL_DAYS, PROMISED, dayNumber, allDays, normalizeSourceUrl, ordered, seals, pace, userTally, compact } from './lib/herald.mjs';

const $ = s => document.querySelector(s);
let records, query = '', warning = '', toastTimer;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (date, opts = { month: 'short', day: 'numeric' }) => new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
const chicagoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const SEEN_KEY = 'hark-herald-seen';

function link(url, text, cls = 'source-link') {
  const safe = normalizeSourceUrl(url);
  return safe ? `<a class="${cls}" href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${text}</a>` : '';
}
function toast(text) { $('#toast').textContent = text; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2800); }
function seen() { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); } }
function remember(ids) { try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids)); } catch { /* storage blocked: stamps just replay */ } }

const VERDICT = {
  upcoming: ['Not started', 'The clock starts Oct 10.'],
  'on-pace': ['On pace', 'Right on schedule. One every five days keeps the promise.'],
  ahead: ['Ahead', 'Shipping faster than promised.'],
  behind: ['Behind', 'Falling behind the one-every-five-days pace.'],
  kept: ['Promise kept', 'All twelve seals stamped. 🔔'],
  short: ['Fell short', 'The sixty days are up.'],
};

function renderTally(p) {
  $('#delivered').textContent = p.delivered;
  const [pill, line] = VERDICT[p.status];
  $('#status-pill').textContent = pill;
  $('#status-pill').className = `pill ${p.status}`;
  let verdict = line;
  if (p.status === 'short') verdict = `${p.delivered} of 12 shipped by Dec 8.`;
  if (p.bonus) verdict += ` Plus ${plural(p.bonus, 'bonus feature')}.`;
  $('#verdict').textContent = verdict;
  $('#eyebrow').textContent = p.phase === 'live' ? `Day ${p.day} of 60 · Oct 10 — Dec 8` : p.phase === 'complete' ? 'Final · Oct 10 — Dec 8' : 'Starts Oct 10';
  $('#day-label').textContent = p.phase === 'live' ? `${plural(p.daysLeft, 'day')} left` : p.phase === 'complete' ? 'Sixty days are up' : '60 days to go';
  $('#next-due').textContent = p.nextDue ? `Feature #${p.delivered + 1} due by ${fmt(p.nextDue)} to stay on pace` : '';
  const fill = Math.min(100, p.counted / PROMISED * 100), mark = Math.min(100, p.expected / PROMISED * 100);
  $('#track-pace').hidden = p.phase !== 'live';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $('#track-fill').style.width = `${fill}%`;
    $('#track-pace').style.left = `${mark}%`;
  }));
}

function renderUsers() {
  const t = userTally(records.users);
  const chip = $('#users-chip');
  if (!t) { chip.hidden = true; return; }
  chip.hidden = false;
  chip.href = normalizeSourceUrl(t.source_url) || '#';
  chip.innerHTML = `<strong>${compact(t.users)}+</strong> users as of ${fmt(t.as_of)}${t.points > 1 && t.growth > 0 ? ` <span class="up">▲ ${compact(t.growth)} since ${fmt(t.since)}</span>` : ''} <span class="arrow">↗</span>`;
}

const SEAL_SVG = n => `<svg viewBox="0 0 100 100" aria-hidden="true"><path class="wax" d="M50 4c6 0 9 5 14 6s11-2 15 2 2 10 5 14 8 7 8 14-5 9-6 14 2 11-2 15-10 2-14 5-7 8-14 8-9-5-14-6-11 2-15-2-2-10-5-14-8-7-8-14 5-9 6-14-2-11 2-15 10-2 14-5 7-8 14-8Z"/><circle class="ring" cx="50" cy="50" r="30"/><text x="50" y="51" text-anchor="middle" dominant-baseline="middle">${n}</text></svg>`;

function renderSeals() {
  const { slots, bonus, late } = seals(records.features);
  const before = seen();
  $('#seals').innerHTML = slots.map((s, i) => {
    if (!s.feature) return `<button class="seal open" data-seal="${s.number}" aria-label="Seal ${s.number}: not yet shipped"><span class="seal-art"><span class="seal-q">${s.number}</span></span><span class="seal-title">Awaiting</span></button>`;
    const fresh = !before.has(s.feature.id);
    return `<button class="seal stamped${fresh ? ' fresh' : ''}" style="--i:${i}" data-feature="${esc(s.feature.id)}" aria-label="Seal ${s.number}: ${esc(s.feature.title)}, shipped ${fmt(s.feature.shipped_on)}"><span class="seal-art">${SEAL_SVG(s.number)}</span><span class="seal-title">${esc(s.feature.title)}</span><span class="seal-date">${fmt(s.feature.shipped_on)}</span></button>`;
  }).join('');
  const extra = [...bonus.map(f => ['Bonus', f]), ...late.map(f => ['Late', f])];
  $('#bonus').hidden = !extra.length;
  $('#bonus').innerHTML = extra.length ? `<h3>Beyond the twelve</h3><div class="bonus-list">${extra.map(([tag, f]) => `<button class="bonus-item" data-feature="${esc(f.id)}"><span class="tag ${tag.toLowerCase()}">${tag}</span>${esc(f.title)}</button>`).join('')}</div>` : '';
  remember(records.features.map(f => f.id));
}

function renderCalendar(today) {
  const current = dayNumber(today);
  $('#calendar').innerHTML = allDays().map(({ day, date }) => {
    const count = records.features.filter(f => f.shipped_on === date).length;
    const future = date > today, isToday = day === current, checkpoint = day % 5 === 0;
    const label = `Day ${day}, ${fmt(date)}: ${count ? plural(count, 'feature') : future ? 'coming up' : isToday ? 'today, nothing yet' : 'no feature'}${checkpoint ? `, pace checkpoint for feature ${day / 5}` : ''}`;
    return `<button class="cal-day${count ? ' shipped' : ''}${future ? ' future' : ''}${isToday ? ' today' : ''}${checkpoint ? ' checkpoint' : ''}" data-day="${day}" aria-label="${esc(label)}"><span class="cal-num">${day}</span>${count ? `<span class="cal-mark">${count > 1 ? `×${count}` : ''}</span>` : ''}${checkpoint ? '<span class="cal-bell" aria-hidden="true">🔔</span>' : ''}</button>`;
  }).join('');
}

function sealNumber(id) {
  const i = seals(records.features).slots.findIndex(s => s.feature?.id === id);
  return i >= 0 ? i + 1 : null;
}

function featureCard(f) {
  const n = sealNumber(f.id);
  return `<article class="card"><div class="card-seal ${n ? '' : 'extra'}">${n ?? '+'}</div><div class="card-body"><div class="card-meta"><span>${fmt(f.shipped_on, { month: 'short', day: 'numeric', year: 'numeric' })}</span>${dayNumber(f.shipped_on) ? `<span>Day ${dayNumber(f.shipped_on)}</span>` : '<span>After Dec 8</span>'}<span class="cat">${esc(f.category)}</span></div><h3>${esc(f.title)}</h3><p>${esc(f.summary)}</p><div class="card-links">${link(f.source_url, '𝕏 Source ↗')}${f.product_url && /^https:\/\//.test(f.product_url) ? `<a class="source-link" href="${esc(f.product_url)}" target="_blank" rel="noopener noreferrer">Try it ↗</a>` : ''}</div></div></article>`;
}

function renderLog() {
  const term = query.trim().toLowerCase();
  const list = ordered(records.features).reverse().filter(f => `${f.title} ${f.summary} ${f.category}`.toLowerCase().includes(term));
  $('#log').innerHTML = list.length ? list.map(featureCard).join('') : `<div class="empty"><h3>${term ? 'No matches' : 'No proclamations yet.'}</h3><p>${term ? 'Try another word or clear the search.' : 'The first seal is stamped when Hark ships its first major feature with a public post to back it.'}</p></div>`;
}

function render() {
  const today = chicagoToday();
  renderTally(pace(records.features, today));
  renderUsers();
  renderSeals();
  renderCalendar(today);
  renderLog();
  const src = records.challenge.source_url;
  if (/^https:\/\/x\.com\//.test(src || '')) $('#promise-link').href = src;
  $('#data-status').textContent = `Updated ${records.challenge.verified_at}${warning ? `. ${warning}` : ''}`;
}

function openDetail(html) { $('#detail').innerHTML = html; $('#detail-dialog').showModal(); }
function showFeature(id) { const f = records.features.find(x => x.id === id); if (f) openDetail(featureCard(f)); }
function showSeal(n) {
  const p = pace(records.features, chicagoToday());
  openDetail(`<div class="dialog-head"><span class="eyebrow">Seal ${n}</span><h2>Not stamped yet</h2></div><p class="dialog-note">${p.phase === 'complete' ? 'The sixty days ended before this one shipped.' : `To stay on pace, feature #${n} should ship by ${fmt(allDays()[Math.min(TOTAL_DAYS, n * 5) - 1].date)}.`}</p>`);
}
function showDay(day) {
  const d = allDays()[day - 1];
  const list = records.features.filter(f => f.shipped_on === d.date);
  const today = chicagoToday();
  const note = list.length ? list.map(featureCard).join('') : `<p class="dialog-note">${d.date > today ? 'Still to come.' : 'No major feature recorded this day.'}${day % 5 === 0 ? ` On pace means ${day / 5} feature${day === 5 ? '' : 's'} by today.` : ''}</p>`;
  openDetail(`<div class="dialog-head"><span class="eyebrow">${fmt(d.date, { weekday: 'long', month: 'long', day: 'numeric' })}</span><h2>Day ${day}<span class="red">.</span></h2></div>${note}`);
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
      $('#log').innerHTML = '<div class="empty"><h3>The herald has lost his voice.</h3><p>Live data is unavailable right now. Try Refresh in a moment.</p></div>';
      $('#status-pill').textContent = 'Unavailable'; $('#data-status').textContent = 'Live data unavailable';
      return;
    }
  } finally { button.disabled = false; button.textContent = '↻ Refresh'; }
  render();
}

document.addEventListener('click', e => {
  const t = e.target;
  const feature = t.closest('[data-feature]'); if (feature) showFeature(feature.dataset.feature);
  const seal = t.closest('[data-seal]'); if (seal) showSeal(Number(seal.dataset.seal));
  const day = t.closest('[data-day]'); if (day) showDay(Number(day.dataset.day));
  if (t.closest('.dialog-close')) t.closest('dialog').close();
});
document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => {
  if (e.target !== d) return;
  const b = d.getBoundingClientRect();
  if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) d.close();
}));
$('#search').addEventListener('input', e => { query = e.target.value; if (records) renderLog(); });
$('#refresh').addEventListener('click', load);
$('#agent-open').addEventListener('click', () => { $('#copy-status').textContent = ''; $('#agent-dialog').showModal(); });
$('#copy-agent-prompt').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#agent-prompt').value); $('#copy-status').textContent = 'Copied'; }
  catch { $('#agent-prompt').focus(); $('#agent-prompt').select(); $('#copy-status').textContent = 'Copy unavailable. Select and copy it manually.'; }
});
load();
