import { defaults, dailyHabits, prayers, progress, type Practice, type Records } from './practice.ts';

export function historyDates(end: string, length: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) return [];
  const date = new Date(`${end}T12:00:00Z`);
  return Array.from({ length }, (_, index) => {
    const day = new Date(date);
    day.setUTCDate(day.getUTCDate() - length + index + 1);
    return day.toISOString().slice(0, 10);
  });
}

export function historyActivities(routine: Practice[], records: Records) {
  const activeIds = new Set(routine.map(p => p.id));
  const recordedIds = new Set(Object.values(records).flatMap(day => Object.keys(day)));
  const practices = [...defaults, ...dailyHabits.filter(p => activeIds.has(p.id) || recordedIds.has(p.id)), ...routine.filter(p => ![...defaults, ...dailyHabits].some(d => d.id === p.id))]
    .map(p => routine.find(saved => saved.id === p.id) || p);
  const activities = practices.flatMap(p => p.id === 'prayers'
    ? prayers.map(prayer => ({ id: prayer.name, title: prayer.name, kind: 'check' as const }))
    : [{ id: p.id, title: p.title, kind: 'check' as const }]);
  const known = new Set(activities.map(p => p.id));
  for (const day of Object.values(records)) for (const [id, value] of Object.entries(day)) {
    if (typeof value === 'boolean' && id.startsWith('custom-') && !known.has(id)) {
      activities.push({ id, title: 'Archived personal practice', kind: 'check' });
      known.add(id);
    }
  }
  return [...activities, { id: 'istighfar-count', title: 'Istighfar repetitions', kind: 'count' as const }];
}

export function activityValue(records: Records, date: string, id: string, kind: 'check' | 'count') {
  if (kind === 'check') return records[date]?.[id] === true ? 1 : 0;
  const value = records[date]?.[id];
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function historySeries(records: Records, routine: Practice[], dates: string[], activity?: { id: string; kind: 'check' | 'count' }) {
  return dates.map(date => {
    if (!Object.hasOwn(records, date)) return { date, value: null };
    if (activity) return { date, value: activityValue(records, date, activity.id, activity.kind) * (activity.kind === 'check' ? 100 : 1) };
    const stats = progress(records[date], routine);
    return { date, value: stats.total ? Math.round(stats.completed / stats.total * 100) : 0 };
  });
}
