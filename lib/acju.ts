import timetable from '../data/acju-prayer-times.json' with { type: 'json' };
import { acjuCityZones, acjuSource, acjuZoneLabels } from './acju-zones.ts';

type Month = { source: string; days: Record<string, string[]> };
const zones = timetable.zones as Record<string, Record<string, Month>>;

export function isPrayerDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export function getAcjuSchedule(date: string, city: string, school = '0') {
  if (!isPrayerDate(date) || !Object.hasOwn(acjuCityZones, city)) return null;
  const zone = acjuCityZones[city];
  const [, month, day] = date.split('-');
  const published = zones[zone]?.[month];
  const row = published?.days[day];
  if (!row || row.length !== 7 || !row.every(time => /^([01]\d|2[0-3]):[0-5]\d$/.test(time))) return null;
  return {
    timings: { Fajr: row[0], Dhuhr: row[2], Asr: row[school === '1' ? 4 : 3], Maghrib: row[5], Isha: row[6] },
    city, date, timezone: 'Asia/Colombo', source: 'ACJU', sourceUrl: acjuSource, sourcePdf: published.source,
    zone, zoneLabel: acjuZoneLabels[zone], asr: school === '1' ? 'Hanafi' : 'Shafi‘i',
  };
}
