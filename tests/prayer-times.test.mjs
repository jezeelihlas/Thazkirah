import test from 'node:test';
import assert from 'node:assert/strict';
import { getAcjuSchedule, isPrayerDate } from '../lib/acju.ts';
import { acjuCityZones } from '../lib/acju-zones.ts';
import { cities } from '../lib/practice.ts';
import data from '../data/acju-prayer-times.json' with { type: 'json' };

test('Colombo times match the published ACJU 10 November table without offsets', () => {
  const result = getAcjuSchedule('2026-11-10', 'Colombo');
  assert.deepEqual(result.timings, { Fajr: '04:40', Dhuhr: '11:56', Asr: '15:18', Maghrib: '17:51', Isha: '19:02' });
  assert.equal(result.zone, '01');
  assert.equal(result.source, 'ACJU');
  assert.match(result.sourcePdf, /01\.-Colombo-11\.pdf$/);
});

test('ACJU Asr choice changes only the published Asr column', () => {
  const shafii = getAcjuSchedule('2026-11-10', 'Colombo', '0');
  const hanafi = getAcjuSchedule('2026-11-10', 'Colombo', '1');
  assert.equal(hanafi.timings.Asr, '16:12');
  for (const prayer of ['Fajr', 'Dhuhr', 'Maghrib', 'Isha']) assert.equal(hanafi.timings[prayer], shafii.timings[prayer]);
});

test('every selectable city maps to its correct ACJU district zone', () => {
  assert.deepEqual(Object.keys(cities).sort(), Object.keys(acjuCityZones).sort());
  assert.deepEqual(getAcjuSchedule('2026-11-10', 'Negombo').timings, getAcjuSchedule('2026-11-10', 'Colombo').timings);
  assert.equal(getAcjuSchedule('2026-11-10', 'Kandy').zone, '07');
  assert.deepEqual(getAcjuSchedule('2026-11-10', 'Kandy').timings, { Fajr: '04:37', Dhuhr: '11:53', Asr: '15:14', Maghrib: '17:47', Isha: '18:59' });
  assert.equal(getAcjuSchedule('2026-11-10', 'Kalmunai').zone, '08');
  assert.equal(getAcjuSchedule('2026-11-10', 'Galle').zone, '12');
  assert.notDeepEqual(getAcjuSchedule('2026-11-10', 'Kandy').timings, getAcjuSchedule('2026-11-10', 'Colombo').timings);
});

test('all 13 ACJU zones contain complete monthly tables with both Asr columns', () => {
  assert.equal(Object.keys(data.zones).length, 13);
  let total = 0;
  for (const months of Object.values(data.zones)) {
    assert.equal(Object.keys(months).length, 12);
    for (const [month, table] of Object.entries(months)) {
      const expected = new Date(Date.UTC(2024, Number(month), 0)).getUTCDate();
      assert.equal(Object.keys(table.days).length, expected);
      assert.match(table.source, /^https:\/\/www\.acju\.lk\/wp-content\/uploads\//);
      assert.match(table.sha256, /^[a-f0-9]{64}$/);
      for (const row of Object.values(table.days)) {
        assert.equal(row.length, 7);
        for (const time of row) assert.match(time, /^([01]\d|2[0-3]):[0-5]\d$/);
        assert.deepEqual(row, [...row].sort());
        total++;
      }
    }
  }
  assert.equal(total, 13 * 366);
});

test('daily date changes select the next published row; invalid dates never receive estimated times', () => {
  assert.notDeepEqual(getAcjuSchedule('2026-11-10', 'Colombo').timings, getAcjuSchedule('2026-11-13', 'Colombo').timings);
  assert.ok(getAcjuSchedule('2028-02-29', 'Colombo'));
  assert.equal(isPrayerDate('2026-02-29'), false);
  assert.equal(isPrayerDate('2026-04-31'), false);
  assert.equal(getAcjuSchedule('2026-02-29', 'Colombo'), null);
  assert.equal(getAcjuSchedule('2026-11-10', 'Unknown'), null);
  assert.deepEqual(getAcjuSchedule('2026-06-01', 'Colombo').timings, { Fajr: '04:30', Dhuhr: '12:10', Asr: '15:35', Maghrib: '18:25', Isha: '19:40' });
});
