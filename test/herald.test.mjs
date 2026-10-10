import test from 'node:test';
import assert from 'node:assert/strict';
import { dayNumber, dateForDay, allDays, normalizeSourceUrl, seals, pace, userTally, compact } from '../lib/herald.mjs';

const f = (id, shipped_on) => ({ id, shipped_on, title: id, summary: '', category: 'Feature', source_url: 'https://x.com/a/status/1' });

test('the window is Oct 10 to Dec 8, exactly 60 calendar days', () => {
  assert.equal(dayNumber('2026-10-10'), 1);
  assert.equal(dayNumber('2026-12-08'), 60);
  assert.equal(dateForDay(60), '2026-12-08');
  assert.equal(allDays().length, 60);
  for (const v of ['2026-10-09', '2026-12-09', '2026-02-30', '2026-10-10T00:00:00Z', '', null]) assert.equal(dayNumber(v), null);
});

test('source URLs accept only real X post paths', () => {
  assert.equal(normalizeSourceUrl('https://twitter.com/adcock_brett/status/123?s=20'), 'https://x.com/adcock_brett/status/123');
  for (const u of ['https://x.com.evil.test/a/status/1', 'http://x.com/a/status/1', 'javascript:alert(1)', 'https://x.com/a', 'https://x.com/a/status/1/photo/1']) assert.equal(normalizeSourceUrl(u), null);
});

test('seals fill in shipping order; extras are bonus, after Dec 8 is late', () => {
  const list = Array.from({ length: 13 }, (_, i) => f(`f-${i}`, dateForDay(i + 1)));
  list.push(f('f-late', '2026-12-09'));
  const s = seals(list.reverse());
  assert.equal(s.slots[0].feature.id, 'f-0');
  assert.equal(s.slots[11].feature.id, 'f-11');
  assert.deepEqual(s.bonus.map(x => x.id), ['f-12']);
  assert.deepEqual(s.late.map(x => x.id), ['f-late']);
  assert.equal(seals([]).slots.every(x => x.feature === null), true);
});

test('pace is one feature every five days', () => {
  assert.equal(pace([], '2026-10-09').status, 'upcoming');
  const d1 = pace([], '2026-10-10');
  assert.equal(d1.status, 'on-pace'); assert.equal(d1.day, 1); assert.equal(d1.daysLeft, 59); assert.equal(d1.nextDue, '2026-10-14');
  assert.equal(pace([], '2026-10-14').status, 'behind');
  assert.equal(pace([f('a', '2026-10-12')], '2026-10-14').status, 'on-pace');
  assert.equal(pace([f('a', '2026-10-10'), f('b', '2026-10-11'), f('c', '2026-10-11')], '2026-10-11').status, 'ahead');
  assert.equal(pace([f('a', '2026-10-12')], '2026-10-14').nextDue, '2026-10-19');
  // a feature dated after today is not counted yet
  assert.equal(pace([f('a', '2026-10-20')], '2026-10-14').delivered, 0);
});

test('final verdict after Dec 8', () => {
  const twelve = Array.from({ length: 12 }, (_, i) => f(`f-${i}`, dateForDay(i * 5 + 1)));
  assert.equal(pace(twelve, '2026-12-09').status, 'kept');
  assert.equal(pace(twelve.slice(0, 7), '2026-12-09').status, 'short');
  assert.equal(pace(twelve.map((x, i) => ({ ...x, shipped_on: dateForDay(i * 2 + 1) })), '2026-11-10').status, 'kept');
  assert.equal(pace([...twelve, f('x', '2026-12-01')], '2026-12-09').bonus, 1);
});

test('user tally and compact numbers', () => {
  assert.equal(userTally([]), null);
  const t = userTally([{ as_of: '2026-10-12', users: 700000, source_url: 'u2' }, { as_of: '2026-10-10', users: 562000, source_url: 'u1' }]);
  assert.deepEqual([t.users, t.growth, t.since, t.source_url], [700000, 138000, '2026-10-10', 'u2']);
  assert.equal(compact(562000), '562K'); assert.equal(compact(1250000), '1.25M'); assert.equal(compact(900), '900');
});

import { routeX, routeY, roadPath, paceSigns } from '../lib/herald.mjs';
test('route geometry spans the map and pace signs fall every five days', () => {
  assert.equal(routeX(1), 40); assert.equal(routeX(60), 1160);
  assert.ok(routeY(600) > 100 && routeY(600) < 180);
  assert.match(roadPath(), /^M20,\d+ L40,\d+/);
  const signs = paceSigns(3);
  assert.equal(signs.length, 12);
  assert.deepEqual(signs.slice(0, 4).map(s => [s.day, s.reached]), [[5, true], [10, true], [15, true], [20, false]]);
  assert.equal(signs[11].date, '2026-12-08');
});
