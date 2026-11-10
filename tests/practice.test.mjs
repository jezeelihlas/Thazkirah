import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, dailyHabits, practiceCatalog, orderDefaultRoutine, placeIstighfarBeforeSleep, reorderRoutine, sanitiseDayRecord, prepareRoutine, sanitisePractice, movePractice, moveVisiblePractice, progress, sriLankaDate, refreshDisplayDate, toggleCheck } from '../lib/practice.ts';
import { adhkar } from '../lib/dhikr.ts';
import { tamilMeanings } from '../lib/dhikr-tamil.ts';

test('every dhikr has a Tamil meaning with intact Tamil characters', () => {
  for (const dhikr of adhkar) {
    assert.match(tamilMeanings[dhikr.id] || '', /[\u0B80-\u0BFF]/u, dhikr.id);
    assert.ok(!tamilMeanings[dhikr.id].includes('?'), dhikr.id);
  }
});

test('Jamaath marks prayed, while removing Jamaath preserves prayed', () => {
  const original = { tahajjud: true };
  const checked = toggleCheck(original, 'Fajr-jamaath');
  assert.equal(checked.Fajr, true);
  assert.equal(checked['Fajr-jamaath'], true);
  assert.deepEqual(original, { tahajjud: true });
  const unchecked = toggleCheck(checked, 'Fajr-jamaath');
  assert.equal(unchecked.Fajr, true);
  assert.equal(unchecked['Fajr-jamaath'], false);
});
test('unchecking prayed clears Jamaath; prayed alone never marks Jamaath', () => {
  assert.equal(toggleCheck({ Fajr: true, 'Fajr-jamaath': true }, 'Fajr')['Fajr-jamaath'], false);
  assert.equal(toggleCheck({}, 'Fajr')['Fajr-jamaath'], undefined);
});
test('default order matches the requested routine', () => {
  assert.deepEqual(defaults.map(p => p.id), ['prayers', 'tahajjud', 'morning', '36', 'evening', '67', 'istighfar']);
});
test('reordering is immutable, permits moving prayer section, and handles boundaries', () => {
  const moved = movePractice(defaults, 1, -1);
  assert.equal(moved[0].id, 'tahajjud');
  assert.equal(moved[1].id, 'prayers');
  assert.equal(defaults[0].id, 'prayers');
  assert.deepEqual(movePractice(defaults, 0, -1), defaults);
  assert.deepEqual(movePractice(defaults, defaults.length - 1, 1), defaults);
});
test('progress excludes Jamaath double counting, counters, and individual dhikr', () => {
  const day = { Fajr: true, 'Fajr-jamaath': true, morning: true, 'morning:tasbih': true, 'istighfar-count': 100 };
  assert.deepEqual(progress(day, defaults), { completed: 2, total: 11 });
});
test('progress follows additions and removals with no stale denominator', () => {
  const routine = [...defaults.filter(p => p.id !== 'prayers'), { id: 'custom-reading', title: 'Reading', hint: '' }];
  assert.deepEqual(progress({ Fajr: true, 'custom-reading': true }, routine), { completed: 1, total: 7 });
  assert.deepEqual(progress({}, []), { completed: 0, total: 0 });
});
test('Sri Lankan day rolls over at 18:30 UTC regardless of device timezone', () => {
  assert.equal(sriLankaDate(new Date('2026-11-09T18:29:59Z')), '2026-11-09');
  assert.equal(sriLankaDate(new Date('2026-11-09T18:30:00Z')), '2026-11-10');
});

test('Home catches up after multiple days asleep, while deliberate history browsing keeps its date', () => {
  const today = sriLankaDate(new Date('2026-11-12T18:30:00Z'));
  assert.equal(refreshDisplayDate('2026-11-10', today, true), '2026-11-13');
  assert.equal(refreshDisplayDate('2026-11-10', today, false), '2026-11-10');
  assert.equal(refreshDisplayDate('', today, true), '2026-11-13');
});
test('separate days and numeric totals survive browser-storage serialization', () => {
  const records = { '2026-11-09': { Fajr: true, 'istighfar-count': 52 }, '2026-11-10': {} };
  const loaded = JSON.parse(JSON.stringify(records));
  loaded['2026-11-10'] = toggleCheck(loaded['2026-11-10'], 'Fajr-jamaath');
  assert.equal(loaded['2026-11-09']['istighfar-count'], 52);
  assert.equal(loaded['2026-11-10']['istighfar-count'], undefined);
  assert.equal(loaded['2026-11-10'].Fajr, true);
});

test('habit migration adds suggestions only once and respects later removal', () => {
  const first = prepareRoutine(defaults, false);
  assert.equal(first.length, defaults.length + dailyHabits.length);
  assert.equal(new Set(first.map(item => item.id)).size, first.length);
  const removed = first.filter(item => item.id !== 'habit-sleep');
  assert.ok(!prepareRoutine(removed, true).some(item => item.id === 'habit-sleep'));
  assert.deepEqual(prepareRoutine([], true), []);
});

test('habit names, hidden state, and valid edited times survive saved preferences', () => {
  const original = { ...dailyHabits[0], title: 'My bedtime', time: '23:15', hidden: true };
  assert.deepEqual(sanitisePractice(JSON.parse(JSON.stringify(original))), original);
  for (const time of ['25:00', '10:60', 'bad', '<script>']) {
    assert.equal(sanitisePractice({ ...original, time }).time, '');
  }
  assert.equal(sanitisePractice(null), null);
  assert.equal(sanitisePractice({ id: 'broken' }), null);
});

test('hidden practices do not inflate daily totals and saved checkmarks remain intact', () => {
  const day = { Fajr: true, 'habit-sleep': true };
  const routine = [{ ...defaults[0], hidden: true }, dailyHabits[0]];
  assert.deepEqual(progress(day, routine), { completed: 1, total: 1 });
  assert.deepEqual(progress(day, routine.map(item => ({ ...item, hidden: true }))), { completed: 0, total: 0 });
  assert.deepEqual(day, { Fajr: true, 'habit-sleep': true });
});

test('reordering skips hidden practices while preserving their positions', () => {
  const items = [dailyHabits[0], { ...dailyHabits[1], hidden: true }, dailyHabits[2]];
  const moved = moveVisiblePractice(items, dailyHabits[2].id, -1);
  assert.deepEqual(moved.map(item => item.id), [dailyHabits[2].id, dailyHabits[1].id, dailyHabits[0].id]);
  assert.equal(moved[1].hidden, true);
  assert.equal(items[0].id, dailyHabits[0].id);
  assert.equal(moveVisiblePractice(items, dailyHabits[0].id, -1), items);
});

test('new card layout follows the requested habit order and preserves hidden/time settings during migration', () => {
  const expected = ['prayers', 'habit-wake', 'tahajjud', 'habit-duha', 'habit-exercise', 'habit-quran', 'habit-parents', '67', '36', 'istighfar', 'habit-sleep', 'morning', 'evening'];
  assert.deepEqual(practiceCatalog.map(p => p.id), expected);
  const old = [...defaults, ...dailyHabits].map(p => p.id === 'habit-wake' ? { ...p, hidden: true, time: '06:10' } : p);
  const migrated = orderDefaultRoutine(old);
  assert.deepEqual(migrated.map(p => p.id), expected);
  assert.equal(migrated.find(p => p.id === 'habit-wake').time, '06:10');
  assert.equal(migrated.find(p => p.id === 'habit-wake').hidden, true);
});

test('drag reorder inserts a card, preserves hidden slots, and prevents crossing sections', () => {
  const hidden = { ...dailyHabits[0], hidden: true };
  const items = [defaults[0], dailyHabits[1], hidden, dailyHabits[2], dailyHabits[3], defaults[2], defaults[4]];
  const result = reorderRoutine(items, 'habit-wake', 'habit-exercise');
  assert.deepEqual(result.map(p => p.id), ['prayers', 'habit-duha', 'habit-sleep', 'habit-exercise', 'habit-wake', 'morning', 'evening']);
  assert.equal(result[2], hidden);
  assert.equal(items[1].id, 'habit-wake');
  assert.equal(reorderRoutine(items, 'habit-wake', 'morning'), items);
  const periods = reorderRoutine(items, 'evening', 'morning');
  assert.deepEqual(periods.slice(-2).map(p => p.id), ['evening', 'morning']);
  assert.deepEqual(prepareRoutine(JSON.parse(JSON.stringify(result)), true).map(p => p.id), result.map(p => p.id));
});

test('daily missed reasons survive reload separately by date without entering completion totals', () => {
  const saved = JSON.parse(JSON.stringify({ '2026-11-10': { 'habit-wake': false, 'note:habit-wake': 'Was unwell', 'Fajr-jamaath': true }, '2026-11-11': { 'note:habit-wake': 'Worked late' } }));
  const first = sanitiseDayRecord(saved['2026-11-10']);
  const next = sanitiseDayRecord(saved['2026-11-11']);
  assert.equal(first['note:habit-wake'], 'Was unwell');
  assert.equal(next['note:habit-wake'], 'Worked late');
  assert.equal(first.Fajr, true);
  assert.deepEqual(progress(first, [dailyHabits[1]]), { completed: 0, total: 1 });
  const sanitised = sanitiseDayRecord({ 'note:habit-wake': 'a'.repeat(800), unexpected: 'text', invalid: Infinity });
  assert.equal(sanitised['note:habit-wake'].length, 500);
  assert.equal(sanitised.unexpected, undefined);
  assert.equal(sanitised.invalid, undefined);
});

test('moving istighfar before sleep preserves other user ordering, times, hidden items, and removal', () => {
  const items = [dailyHabits[3], dailyHabits[1], { ...dailyHabits[0], time: '23:20', hidden: true }, defaults[2], defaults[6]];
  const next = placeIstighfarBeforeSleep(items);
  assert.deepEqual(next.map(p => p.id), ['habit-exercise', 'habit-wake', 'istighfar', 'habit-sleep', 'morning']);
  assert.equal(next[3].time, '23:20');
  assert.equal(next[3].hidden, true);
  assert.equal(items.at(-1).id, 'istighfar');
  const removed = items.filter(p => p.id !== 'istighfar');
  assert.equal(placeIstighfarBeforeSleep(removed), removed);
});
