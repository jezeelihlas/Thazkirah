import test from 'node:test';
import assert from 'node:assert/strict';
import { historyDates, historyActivities, activityValue, historySeries } from '../lib/history.ts';
import { signValue, verifyValue } from '../lib/auth-session.ts';

test('history ranges include today and cross month/year boundaries', () => {
  assert.deepEqual(historyDates('2027-01-02', 4), ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
  assert.deepEqual(historyDates('', 7), []);
  assert.equal(historyDates('2026-11-10', 30).length, 30);
});

test('history distinguishes completion flags from counts and clamps invalid totals', () => {
  const records = { '2026-11-10': { Fajr: true, 'istighfar-count': 125, morning: false, invalid: -5 } };
  assert.equal(activityValue(records, '2026-11-10', 'Fajr', 'check'), 1);
  assert.equal(activityValue(records, '2026-11-10', 'morning', 'check'), 0);
  assert.equal(activityValue(records, '2026-11-10', 'istighfar-count', 'count'), 125);
  assert.equal(activityValue(records, '2026-11-09', 'Fajr', 'check'), 0);
  assert.equal(activityValue(records, '2026-11-10', 'invalid', 'count'), 0);
});

test('history retains removed practices and avoids counting jamaath twice', () => {
  const records = { '2026-11-10': { 'custom-old': true, 'Fajr-jamaath': true } };
  const activities = historyActivities([{ id: 'custom-new', title: 'Read', hint: '' }], records);
  assert.ok(activities.some(a => a.id === 'custom-old'));
  assert.ok(activities.some(a => a.id === 'custom-new' && a.title === 'Read'));
  assert.ok(activities.some(a => a.id === 'tahajjud'));
  assert.equal(activities.filter(a => a.id === 'Fajr').length, 1);
  assert.ok(!activities.some(a => a.id === 'Fajr-jamaath'));
});

test('habit history remains available after a habit is hidden or removed', () => {
  const records = { '2026-11-10': { 'habit-exercise': true } };
  const removed = historyActivities([], records);
  assert.ok(removed.some(activity => activity.id === 'habit-exercise' && activity.title === 'Gym or Jogging'));
  const hidden = historyActivities([{ id: 'habit-exercise', title: 'Evening walk', hint: '', hidden: true }], records);
  assert.ok(hidden.some(activity => activity.id === 'habit-exercise' && activity.title === 'Evening walk'));
});

test('history trends keep missing days as gaps and distinguish them from saved zero progress', () => {
  const dates = ['2026-11-08', '2026-11-09', '2026-11-10'];
  const records = { '2026-11-08': { reading: true }, '2026-11-10': { reading: false } };
  const routine = [{ id: 'reading', title: 'Read', hint: '' }, { id: 'paused', title: 'Paused', hint: '', hidden: true }];
  assert.deepEqual(historySeries(records, routine, dates), [{ date: dates[0], value: 100 }, { date: dates[1], value: null }, { date: dates[2], value: 0 }]);
  assert.deepEqual(historySeries(records, routine, dates, { id: 'reading', kind: 'check' }).map(point => point.value), [100, null, 0]);
});

test('count trends show actual repetition totals without converting them to percentages', () => {
  const records = { '2026-11-10': { 'istighfar-count': 125, 'note:istighfar': 'A quiet morning' } };
  assert.deepEqual(historySeries(records, [], ['2026-11-10'], { id: 'istighfar-count', kind: 'count' }), [{ date: '2026-11-10', value: 125 }]);
});

test('signed sessions reject tampering, a different secret, expiry, and malformed cookies', () => {
  const secret = 'test-secret-for-authentication-unit-tests';
  const value = { id: 'google-user', name: 'Test', email: 'test@example.com', exp: Date.now() + 60000 };
  const signed = signValue(value, secret);
  assert.deepEqual(verifyValue(signed, secret), value);
  const forged = Buffer.from(JSON.stringify({ ...value, id: 'attacker' })).toString('base64url') + '.' + signed.split('.')[1];
  assert.equal(verifyValue(forged, secret), null);
  assert.equal(verifyValue(signed, 'different-secret'), null);
  assert.equal(verifyValue(signValue({ ...value, exp: Date.now() - 1 }, secret), secret), null);
  assert.equal(verifyValue(signed + '.extra', secret), null);
  assert.equal(verifyValue('malformed.cookie', secret), null);
  assert.equal(verifyValue(undefined, secret), null);
});
