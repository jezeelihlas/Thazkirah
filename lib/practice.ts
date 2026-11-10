export type DayRecord = Record<string, boolean | number | string>;
export type Records = Record<string, DayRecord>;
export type Practice = { id: string; title: string; ar?: string; hint: string; kind?: 'habit'; time?: string; hidden?: boolean };
export const prayers = [
  { name: 'Fajr', ar: 'الفَجْر', ta: 'வைகறைத் தொழுகை' },
  { name: 'Dhuhr', ar: 'الظُّهْر', ta: 'நண்பகல் தொழுகை' },
  { name: 'Asr', ar: 'العَصْر', ta: 'பிற்பகல் தொழுகை' },
  { name: 'Maghrib', ar: 'المَغْرِب', ta: 'மாலைத் தொழுகை' },
  { name: 'Isha', ar: 'العِشَاء', ta: 'இரவுத் தொழுகை' },
];
export const defaults: Practice[] = [
  { id: 'prayers', title: 'The five daily prayers', ar: 'الصَّلَوَاتُ الْخَمْس', hint: 'Make time for what matters most.' },
  { id: 'tahajjud', title: 'Tahajjud', ar: 'التَّهَجُّد', hint: 'A quiet moment in the night.' },
  { id: 'morning', title: 'Morning dhikr', ar: 'أَذْكَارُ الصَّبَاح', hint: 'Begin the day with remembrance.' },
  { id: '36', title: 'Surah Yaseen', ar: 'سُورَةُ يس', hint: '83 verses · Surah 36' },
  { id: 'evening', title: 'Evening dhikr', ar: 'أَذْكَارُ الْمَسَاء', hint: 'Return to a peaceful heart.' },
  { id: '67', title: 'Surah Mulk', ar: 'سُورَةُ الْمُلْك', hint: '30 verses · Surah 67' },
  { id: 'istighfar', title: 'Total istighfar', ar: 'الاسْتِغْفَار', hint: 'Seek His forgiveness, one remembrance at a time.' },
];
export const dailyHabits: Practice[] = [
  { id: 'habit-sleep', title: 'Sleep on time', hint: 'Wind down and make room for rest.', kind: 'habit', time: '22:00' },
  { id: 'habit-wake', title: 'Wake up on time', hint: 'Begin your day with intention.', kind: 'habit', time: '05:00' },
  { id: 'habit-duha', title: 'Duha prayer (Luha)', ar: 'صَلَاةُ الضُّحَى', hint: 'Make space for voluntary forenoon prayer.', kind: 'habit' },
  { id: 'habit-exercise', title: 'Gym or Jogging', hint: 'Move your body in a way that works for you.', kind: 'habit' },
  { id: 'habit-quran', title: 'Learn the Qur’an', ar: 'تَعَلُّمُ الْقُرْآن', hint: 'Practise recitation, memorisation, or understanding.', kind: 'habit' },
  { id: 'habit-parents', title: 'Care for your parents', hint: 'A call, a kind word, or a helping hand.', kind: 'habit' },
];
export const defaultRoutineOrder = ['prayers', 'habit-wake', 'tahajjud', 'habit-duha', 'habit-exercise', 'habit-quran', 'habit-parents', '67', '36', 'istighfar', 'habit-sleep', 'morning', 'evening'];
export function orderDefaultRoutine(items: Practice[]) {
  return [...items].sort((a, b) => {
    const rank = (id: string) => { const index = defaultRoutineOrder.indexOf(id); return index < 0 ? 8.5 : index; };
    return rank(a.id) - rank(b.id);
  });
}
export const practiceCatalog = orderDefaultRoutine([...defaults, ...dailyHabits]);
export function placeIstighfarBeforeSleep(items: Practice[]) {
  const counter = items.find(p => p.id === 'istighfar');
  if (!counter || !items.some(p => p.id === 'habit-sleep')) return items;
  const next = items.filter(p => p.id !== 'istighfar');
  next.splice(next.findIndex(p => p.id === 'habit-sleep'), 0, counter);
  return next;
}
export function routineGroup(id: string) {
  return id === 'prayers' ? 'prayers' : id === 'morning' || id === 'evening' ? 'dhikr' : 'habits';
}
export function reorderRoutine(items: Practice[], from: string, target: string) {
  if (from === target || routineGroup(from) !== routineGroup(target)) return items;
  const slots = items.map((item, index) => ({ item, index })).filter(entry => !entry.item.hidden && routineGroup(entry.item.id) === routineGroup(from));
  const sourceIndex = slots.findIndex(entry => entry.item.id === from);
  const targetIndex = slots.findIndex(entry => entry.item.id === target);
  if (sourceIndex < 0 || targetIndex < 0) return items;
  const ordered = slots.map(entry => entry.item);
  ordered.splice(targetIndex, 0, ordered.splice(sourceIndex, 1)[0]);
  const next = [...items];
  slots.forEach((slot, index) => { next[slot.index] = ordered[index]; });
  return next;
}
export function sanitiseDayRecord(value: unknown): DayRecord {
  if (!value || typeof value !== 'object') return {};
  const day = Object.fromEntries(Object.entries(value).filter(([key, entry]) => typeof entry === 'boolean' || (typeof entry === 'number' && Number.isFinite(entry)) || (key.startsWith('note:') && typeof entry === 'string')).map(([key, entry]) => [key, typeof entry === 'string' ? entry.slice(0, 500) : entry])) as DayRecord;
  for (const prayer of prayers) if (day[prayer.name + '-jamaath'] === true) day[prayer.name] = true;
  return day;
}
export const isHabitTime = (value: unknown): value is string => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export function sanitisePractice(value: unknown): Practice | null {
  if (!value || typeof value !== 'object') return null;
  const saved = value as Partial<Practice>;
  if (typeof saved.id !== 'string' || typeof saved.title !== 'string' || typeof saved.hint !== 'string') return null;
  const known = practiceCatalog.find(p => p.id === saved.id);
  const habit = known?.kind === 'habit' || (!known && saved.kind === 'habit');
  const title = saved.id === 'habit-exercise' && saved.title === 'Gym or jogging' ? 'Gym or Jogging' : saved.title;
  return {
    ...(known || { id: saved.id, title: saved.title.slice(0, 80), hint: saved.hint.slice(0, 160) }),
    ...(habit ? { title: title.trim().slice(0, 80) || known?.title || 'Daily habit', kind: 'habit' as const } : {}),
    time: isHabitTime(saved.time) ? saved.time : '',
    hidden: saved.hidden === true,
  };
}

export function prepareRoutine(value: unknown, habitsAdded: boolean): Practice[] {
  if (!Array.isArray(value)) return practiceCatalog;
  const seen = new Set<string>();
  const routine = value.map(sanitisePractice).filter((p): p is Practice => {
    if (!p || seen.has(p.id)) return false;
    seen.add(p.id); return true;
  });
  return habitsAdded ? routine : [...routine, ...dailyHabits.filter(p => !seen.has(p.id))];
}
export function sriLankaDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function refreshDisplayDate(selected: string, today: string, followToday: boolean) {
  return followToday ? today : selected;
}
export function toggleCheck(day: DayRecord, id: string): DayRecord {
  const next = { ...day, [id]: !day[id] };
  if (id.endsWith('-jamaath') && next[id]) next[id.replace('-jamaath', '')] = true;
  if (prayers.some(p => p.name === id) && !next[id]) next[id + '-jamaath'] = false;
  return next;
}
export function movePractice(items: Practice[], index: number, direction: number) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
export function moveVisiblePractice(items: Practice[], id: string, direction: number) {
  const visible = items.map((item, index) => ({ item, index })).filter(entry => !entry.item.hidden);
  const index = visible.findIndex(entry => entry.item.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= visible.length) return items;
  const next = [...items];
  const fromIndex = visible[index].index;
  const toIndex = visible[target].index;
  [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
  return next;
}
export function progress(day: DayRecord, items: Practice[]) {
  const keys = items.filter(p => !p.hidden).flatMap(p => p.id === 'prayers' ? prayers.map(p => p.name) : [p.id]);
  return { completed: keys.filter(k => day[k] === true).length, total: keys.length };
}
export const cities: Record<string, [number, number]> = {
  Colombo: [6.9271, 79.8612], Kandy: [7.2906, 80.6337], Galle: [6.0535, 80.2210],
  Jaffna: [9.6615, 80.0255], Batticaloa: [7.7310, 81.6747], Trincomalee: [8.5874, 81.2152],
  Kurunegala: [7.4863, 80.3647], Puttalam: [8.0362, 79.8283], Negombo: [7.2083, 79.8358],
  Anuradhapura: [8.3114, 80.4037], Badulla: [6.9895, 81.0557], Kalmunai: [7.4090, 81.8347],
};
