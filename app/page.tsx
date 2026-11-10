'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpRight, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Eye, EyeOff, Heart, House, Monitor, Moon, Plus, RotateCcw, Settings2, Sun, Sunrise, Sunset, Trash2, UserRound, X } from 'lucide-react';
import { cities, defaults, practiceCatalog, prepareRoutine, sanitisePractice, orderDefaultRoutine, placeIstighfarBeforeSleep, routineGroup, reorderRoutine, sanitiseDayRecord, prayers, progress, sriLankaDate, refreshDisplayDate, toggleCheck, type DayRecord, type Practice, type Records } from '../lib/practice';
import { adhkar } from '../lib/dhikr';
import { tamilMeanings } from '../lib/dhikr-tamil';
import History from './components/History';
import AccountSignIn from './components/AccountSignIn';
import ParentsReminders from './components/ParentsReminders';
import PracticeIcon from './components/PracticeIcon';
import RoutineDragHandle from './components/RoutineDragHandle';
import ActivityNote from './components/ActivityNote';
import { acjuSource, acjuCityZones, acjuZoneLabels } from '../lib/acju-zones';

type Period = 'morning' | 'evening';
type Preferences = { routine: Practice[]; archived: Practice[]; habitsVersion: number; layoutVersion: number; selected: Record<Period, string[]>; city: string; school: string; name: string; theme: 'light' | 'dark' | 'system'; appearanceVersion: number };
type Verse = { aya: string; arabic_text: string; translation: string };
const initial: Preferences = { routine: practiceCatalog, archived: [], habitsVersion: 1, layoutVersion: 2, selected: { morning: ['ikhlas', 'falaq', 'nas', 'tasbih'], evening: ['ikhlas', 'falaq', 'nas', 'tasbih'] }, city: 'Colombo', school: '0', name: '', theme: 'light', appearanceVersion: 2 };
const isPeriod = (id: string): id is Period => id === 'morning' || id === 'evening';
const available = (period: Period) => adhkar.filter(d => !d.period || d.period === period);
const formatTime = (time?: string) => {
  if (!time) return '—';
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

export default function Home() {
  const [date, setDate] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [records, setRecords] = useState<Records>({});
  const [prefs, setPrefs] = useState<Preferences>(initial);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [tab, setTab] = useState('today');
  const [editing, setEditing] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [dragging, setDragging] = useState('');
  const [dropTarget, setDropTarget] = useState('');
  const [reorderMessage, setReorderMessage] = useState('');
  const [newTime, setNewTime] = useState('');
  const [reader, setReader] = useState('');
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [readingError, setReadingError] = useState('');
  const [tamil, setTamil] = useState(true);
  const [dhikrFilter, setDhikrFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [timings, setTimings] = useState<Record<string, string>>({});
  const [scheduleError, setScheduleError] = useState('');
  const [schedulePdf, setSchedulePdf] = useState('');
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const appearanceMenu = useRef<HTMLDetailsElement>(null);
  const followToday = useRef(true);

  useEffect(() => {
    const today = sriLankaDate(); setDate(today); setCurrentDate(today);
    if (new URLSearchParams(window.location.search).get('view') === 'profile') setTab('profile');
    try {
      const saved = JSON.parse(localStorage.getItem('noor-daily-v1') || '{}');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        const clean: Records = {};
        for (const [key, value] of Object.entries(saved)) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(key) && value && typeof value === 'object') {
            const day = sanitiseDayRecord(value);
            clean[key] = day;
          }
        }
        setRecords(clean);
      }
      const p = JSON.parse(localStorage.getItem('thazkirah-preferences-v2') || 'null');
      if (p && typeof p === 'object') {
        const prepared = prepareRoutine(p.routine, p.habitsVersion === 1);
        const arranged = p.layoutVersion >= 1 ? prepared : orderDefaultRoutine(prepared);
        const routine = p.layoutVersion >= 2 ? arranged : placeIstighfarBeforeSleep(arranged);
        const archived = Array.isArray(p.archived) ? p.archived.map(sanitisePractice).filter((item: Practice | null): item is Practice => !!item && !routine.some(active => active.id === item.id)) : [];
        setPrefs({ routine, archived, habitsVersion: 1, layoutVersion: 2, selected: Object.fromEntries((['morning', 'evening'] as Period[]).map(period => [period, Array.isArray(p.selected?.[period]) ? p.selected[period].filter((id: string) => available(period).some(d => d.id === id)) : initial.selected[period]])) as Preferences['selected'], city: Object.hasOwn(cities, p.city) ? p.city : 'Colombo', school: p.school === '1' ? '1' : '0', name: typeof p.name === 'string' ? p.name : '', theme: p.appearanceVersion === 2 && (p.theme === 'light' || p.theme === 'dark' || p.theme === 'system') ? p.theme : 'light', appearanceVersion: 2 });
      }
    } catch { setStorageError(true); }
    setReady(true);
    const refreshDate = () => {
      const next = sriLankaDate();
      setDate(selected => refreshDisplayDate(selected, next, followToday.current));
      setCurrentDate(next);
    };
    const timer = setInterval(refreshDate, 1000);
    window.addEventListener('focus', refreshDate);
    window.addEventListener('pageshow', refreshDate);
    document.addEventListener('visibilitychange', refreshDate);
    return () => { clearInterval(timer); window.removeEventListener('focus', refreshDate); window.removeEventListener('pageshow', refreshDate); document.removeEventListener('visibilitychange', refreshDate); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { document.documentElement.dataset.theme = prefs.theme === 'system' ? (media.matches ? 'dark' : 'light') : prefs.theme; };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [prefs.theme, ready]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem('noor-daily-v1', JSON.stringify(records)); localStorage.setItem('thazkirah-preferences-v2', JSON.stringify(prefs)); }
    catch { setStorageError(true); }
  }, [records, prefs, ready]);

  useEffect(() => {
    if (!date || !ready || tab !== 'today') return;
    const controller = new AbortController();
    setTimings({}); setSchedulePdf(''); setScheduleError(''); setScheduleLoading(true);
    fetch(`/api/prayer-times?${new URLSearchParams({ date, city: prefs.city, school: prefs.school })}`, { signal: controller.signal, cache: 'no-store' })
      .then(async r => { const data = await r.json(); if (!r.ok) throw Error(data.error); return data; })
      .then(data => { setTimings(data.timings); setSchedulePdf(data.sourcePdf || ''); })
      .catch(e => { if (!controller.signal.aborted) setScheduleError(e.message || 'Unable to load prayer times.'); })
      .finally(() => { if (!controller.signal.aborted) setScheduleLoading(false); });
    return () => controller.abort();
  }, [date, prefs.city, prefs.school, retry, ready, tab]);

  useEffect(() => {
    if (!reader) return;
    dialog.current?.showModal(); document.body.style.overflow = 'hidden';
    const controller = new AbortController();
    setReadingError(''); setVerses([]); setLoading(false); setDhikrFilter('all'); setSearch('');
    if (reader === '36' || reader === '67') {
      setLoading(true);
      fetch(`/data/${reader}.json`, { signal: controller.signal }).then(r => { if (!r.ok) throw Error(); return r.json(); })
        .then(d => setVerses(d.result)).catch(() => { if (!controller.signal.aborted) setReadingError('Unable to load the verses. Close and reopen to try again.'); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }
    return () => { controller.abort(); document.body.style.overflow = ''; };
  }, [reader]);

  const day = records[date] || {};
  const stats = progress(day, prefs.routine);
  const visibleRoutine = prefs.routine.filter(p => !p.hidden);
  const restoreOptions = [...practiceCatalog, ...prefs.archived.filter(p => !practiceCatalog.some(d => d.id === p.id))].filter(p => !prefs.routine.some(active => active.id === p.id)).map(p => prefs.archived.find(saved => saved.id === p.id) || p);
  const count = typeof day['istighfar-count'] === 'number' ? day['istighfar-count'] : 0;
  const updateDay = (fn: (day: DayRecord) => DayRecord) => setRecords(r => ({ ...r, [date]: fn(r[date] || {}) }));
  const toggle = (id: string) => updateDay(d => {
    const next = toggleCheck(d, id);
    if (isPeriod(id)) for (const selected of prefs.selected[id]) next[`${id}:${selected}`] = next[id];
    return next;
  });
  const toggleDhikr = (period: Period, id: string) => updateDay(d => {
    const next = toggleCheck(d, `${period}:${id}`);
    next[period] = prefs.selected[period].length > 0 && prefs.selected[period].every(k => next[`${period}:${k}`] === true);
    return next;
  });
  const selectDhikr = (period: Period, id: string) => {
    const selected = prefs.selected[period].includes(id) ? prefs.selected[period].filter(k => k !== id) : [...prefs.selected[period], id];
    setPrefs(p => ({ ...p, selected: { ...p.selected, [period]: selected } }));
    updateDay(d => ({ ...d, [period]: selected.length > 0 && selected.every(k => d[`${period}:${k}`] === true) }));
  };
  const viewDate = (selected: string) => {
    const today = sriLankaDate();
    followToday.current = selected === today;
    setCurrentDate(today); setDate(selected); setTab('today');
  };
  const goToday = () => { viewDate(sriLankaDate()); setEditing(false); setReader(''); };
  const shift = (n: number) => { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); viewDate(d.toISOString().slice(0, 10)); };
  const box = (id: string, label: string) => <label className="check" title={label}><input type="checkbox" checked={day[id] === true} onChange={() => toggle(id)} aria-label={label} disabled={!ready} /><span>{day[id] === true && <Check size={14} />}</span></label>;
  const changeRoutine = (routine: Practice[]) => setPrefs(p => ({ ...p, routine }));
  const updatePractice = (id: string, changes: Partial<Practice>) => setPrefs(p => ({ ...p, routine: p.routine.map(item => item.id === id ? { ...item, ...changes } : item) }));
  const removePractice = (id: string) => setPrefs(p => {
    const item = p.routine.find(practice => practice.id === id);
    if (!item) return p;
    return { ...p, routine: p.routine.filter(practice => practice.id !== id), archived: [...p.archived.filter(practice => practice.id !== id), item] };
  });
  const restorePractice = (item: Practice) => setPrefs(p => ({ ...p, routine: p.routine.some(active => active.id === item.id) ? p.routine : [...p.routine, { ...item, hidden: false }], archived: p.archived.filter(practice => practice.id !== item.id) }));
  const title = defaults.find(p => p.id === reader)?.title || 'Reading';
  const moveCard = (id: string, target: string) => {
    setPrefs(p => ({ ...p, routine: reorderRoutine(p.routine, id, target) }));
    if (routineGroup(id) === routineGroup(target) && id !== target) setReorderMessage('Routine order saved.');
  };
  const stepCard = (id: string, direction: number) => {
    const group = visibleRoutine.filter(item => routineGroup(item.id) === routineGroup(id));
    const next = group[group.findIndex(item => item.id === id) + direction];
    if (next) moveCard(id, next.id);
  };



  const renderPractice = (p: Practice) => <section data-routine-id={p.id} className={'routine-item ' + (day[p.id] === true ? 'complete ' : '') + (dragging === p.id ? 'is-dragging ' : '') + (dropTarget === p.id && dragging !== p.id && routineGroup(dragging) === routineGroup(p.id) ? 'drop-target' : '')} key={p.id}><div className="routine-item-heading">{(routineGroup(p.id) === 'habits' || routineGroup(p.id) === 'dhikr') && <RoutineDragHandle id={p.id} title={p.title} onDrop={moveCard} onStep={stepCard} onDrag={setDragging} onHover={setDropTarget} />}<span className="activity-icon"><PracticeIcon id={p.id} /></span><div className="routine-item-title">{['morning', 'evening', '36', '67', 'tahajjud'].includes(p.id) ? <button onClick={() => setReader(p.id)}><h2>{p.title}</h2><ArrowUpRight size={17} /></button> : <h2>{p.title}</h2>}<p>{p.hint}</p></div><span className="routine-ar" lang="ar" dir="rtl">{p.ar}</span>{p.id !== 'prayers' && box(p.id, p.title + ' completed')}{editing && <div className="reorder-controls"><button aria-label={'Move ' + p.title + ' up'} disabled={visibleRoutine.filter(item => routineGroup(item.id) === routineGroup(p.id))[0]?.id === p.id} onClick={() => stepCard(p.id, -1)}><ArrowUp size={16} /></button><button aria-label={'Move ' + p.title + ' down'} disabled={visibleRoutine.filter(item => routineGroup(item.id) === routineGroup(p.id)).at(-1)?.id === p.id} onClick={() => stepCard(p.id, 1)}><ArrowDown size={16} /></button><button aria-label={'Hide ' + p.title} title={'Hide ' + p.title} onClick={() => updatePractice(p.id, { hidden: true })}><EyeOff size={16} /></button><button aria-label={'Remove ' + p.title} onClick={() => removePractice(p.id)}><Trash2 size={16} /></button></div>}</div>
          <div className="habit-detail activity-schedule"><div className="habit-time"><label htmlFor={`time-${p.id}`}>{p.id === 'habit-sleep' ? 'Bedtime' : p.id === 'habit-wake' ? 'Wake-up time' : p.id === 'prayers' ? 'Planned check-in time' : 'Planned time'}<input id={`time-${p.id}`} type="time" aria-label={'Planned time for ' + p.title} value={p.time || ''} onChange={e => updatePractice(p.id, { time: e.target.value })} /></label>{p.time && <button className="text-button" onClick={() => updatePractice(p.id, { time: '' })}>Clear time</button>}</div>{editing && (p.kind === 'habit' || p.id.startsWith('custom-')) && <label className="habit-name">Habit name<input aria-label={'Edit name of ' + p.title} maxLength={80} value={p.title} onChange={e => updatePractice(p.id, { title: e.target.value })} onBlur={() => { if (!p.title.trim()) updatePractice(p.id, { title: practiceCatalog.find(item => item.id === p.id)?.title || 'Daily habit' }); }} /></label>}</div>
          {p.id === 'prayers' && <div className="panel prayer-panel"><div className="prayer-head"><span>PRAYER</span><span>صَلَاة · தொழுகை</span><span>PRAYED</span><span>JAMAATH</span></div>{prayers.map((prayer, i) => <div className={'prayer-row ' + (day[prayer.name] ? 'done' : '')} key={prayer.name}><div className="prayer-name"><span className="prayer-symbol">{i === 0 ? <Sunrise size={22} /> : i === 3 ? <Sunset size={22} /> : i === 4 ? <Moon size={22} /> : <Sun size={22} />}</span><div><strong>{prayer.name}</strong><small>{formatTime(timings[prayer.name])}</small></div></div><div className="prayer-translation"><span lang="ar" dir="rtl">{prayer.ar}</span><small lang="ta">{prayer.ta}</small></div>{box(prayer.name, prayer.name + ' prayed')}{box(prayer.name + '-jamaath', prayer.name + ' in jamaath')}</div>)}<div className="panel-foot">Praying in Jamaath also marks the prayer as prayed.</div></div>}
          {isPeriod(p.id) && <div className="practice-detail"><button className="outline-button" onClick={() => setReader(p.id)}>{p.id === 'morning' ? <Sunrise size={17} /> : <Sunset size={17} />}Read & choose dhikr <ArrowUpRight size={15} /></button><span>{prefs.selected[p.id].length} selected for your daily practice</span><div className="selected-dhikr">{available(p.id).filter(d => prefs.selected[p.id as Period].includes(d.id)).map(d => <article className="selected-dhikr-card" key={d.id}><label><input type="checkbox" checked={day[`${p.id}:${d.id}`] === true} onChange={() => toggleDhikr(p.id as Period, d.id)} /><span>{d.title}<small>{d.count} {d.count === 1 ? 'time' : 'times'}</small></span></label><details><summary>Read dhikr & Tamil meaning</summary><p className="inline-dhikr-ar" lang="ar" dir="rtl">{d.ar}</p><p className="inline-dhikr-tamil" lang="ta">{tamilMeanings[d.id]}</p><a className="source-link" href={d.url} target="_blank" rel="noreferrer">{d.ref} ?</a></details></article>)}</div>{prefs.selected[p.id].length === 0 && <p className="muted">Open the dhikr library to choose your daily adhkar.</p>}</div>}
          {(p.id === '36' || p.id === '67' || p.id === 'tahajjud') && <div className="practice-detail"><button className="outline-button" onClick={() => setReader(p.id)}>{p.id === 'tahajjud' ? <Moon size={17} /> : <BookOpen size={17} />}{p.id === 'tahajjud' ? 'Read & reflect' : 'Read surah'}<ArrowUpRight size={15} /></button></div>}
          {p.id === 'istighfar' && <div className="istighfar-detail"><p className="istighfar-ar" lang="ar" dir="rtl">أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ</p><p lang="ta">அல்லாஹ்விடம் பாவமன்னிப்புக் கோருகிறேன்; அவனிடமே திரும்புகிறேன்.</p><div className="inline-counter"><button aria-label="Decrease istighfar total" disabled={count === 0} onClick={() => updateDay(d => ({ ...d, 'istighfar-count': Math.max(0, Number(d['istighfar-count'] || 0) - 1) }))}>−</button><label>Total for this day<input type="number" aria-label="Daily istighfar total" min="0" max="999999" value={count} onChange={e => { const n = Math.min(999999, Math.max(0, Math.floor(Number(e.target.value) || 0))); updateDay(d => ({ ...d, 'istighfar-count': n })); }} /></label><button className="primary-button" aria-label="Increase istighfar total" onClick={() => updateDay(d => ({ ...d, 'istighfar-count': Math.min(999999, Number(d['istighfar-count'] || 0) + 1) }))}>+1</button></div><a className="source-link" href="https://sunnah.com/bukhari:6307" target="_blank" rel="noreferrer">Sahih al-Bukhari 6307 ↗</a></div>}
        {p.id !== 'prayers' && <ActivityNote title={p.title} date={date} value={typeof day[`note:${p.id}`] === 'string' ? String(day[`note:${p.id}`]) : ''} onChange={value => updateDay(saved => ({ ...saved, [`note:${p.id}`]: value }))} />}
        </section>;
  return <div className="app-shell">
    <header className="topbar"><nav aria-label="Main navigation">
      <button className="wordmark" onClick={goToday} aria-label="Thazkirah daily practice"><Moon size={28} /><span className="brand-copy"><span className="brand-title">Thazkirah<small lang="ar" dir="rtl">تَذْكِرَة</small></span><em>Towards Allah, one day at a time.</em></span></button>
      <button className={tab === 'today' ? 'top-link active' : 'top-link'} onClick={goToday} aria-current={tab === 'today' ? 'page' : undefined}><House size={18} />Home</button>
      <button className={tab === 'history' ? 'top-link active' : 'top-link'} onClick={() => setTab('history')} aria-current={tab === 'history' ? 'page' : undefined}><CalendarDays size={18} />History</button>
      <button className={tab === 'profile' ? 'top-link active' : 'top-link'} onClick={() => setTab('profile')} aria-current={tab === 'profile' ? 'page' : undefined}><UserRound size={18} />Profile</button>
      <details className="appearance-menu" ref={appearanceMenu}><summary aria-label="Choose light, dark, or device appearance" title="Appearance">{prefs.theme === 'dark' ? <Moon size={19} /> : prefs.theme === 'system' ? <Monitor size={19} /> : <Sun size={19} />}</summary><fieldset><legend>Appearance</legend>{([{ value: 'light', label: 'Light mode', icon: Sun }, { value: 'dark', label: 'Dark mode', icon: Moon }, { value: 'system', label: 'Device preference', icon: Monitor }] as const).map(mode => <label key={mode.value}><mode.icon size={17} /><span>{mode.label}</span><input type="radio" name="appearance" checked={prefs.theme === mode.value} onChange={() => { setPrefs(p => ({ ...p, theme: mode.value })); if (appearanceMenu.current) appearanceMenu.current.open = false; }} /></label>)}</fieldset></details>
    </nav></header>
    {tab === 'today' && <section className="schedule-wrap" aria-label="Daily prayer schedule"><div className="schedule-inner">
      <div className="schedule-heading"><div><span className="overline">FIVE MOMENTS OF PEACE</span><h2>Prayer times <span>· {date && new Date(date + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Colombo' })}</span></h2></div><label className="city-label">Sri Lanka <select aria-label="Prayer times city" value={prefs.city} onChange={e => setPrefs(p => ({ ...p, city: e.target.value }))}>{Object.keys(cities).map(c => <option key={c}>{c}</option>)}</select></label></div>
      <div className="schedule-grid" aria-busy={scheduleLoading}>{prayers.map((p, i) => <div className="schedule-time" key={p.name}>{i === 0 ? <Sunrise size={19} /> : i === 3 ? <Sunset size={19} /> : i === 4 ? <Moon size={19} /> : <Sun size={19} />}<span>{p.name}</span><strong>{scheduleLoading ? '…' : formatTime(timings[p.name])}</strong><small lang="ar">{p.ar}</small></div>)}</div>
      {scheduleError && <p className="alert" role="alert">{scheduleError} <button onClick={() => setRetry(n => n + 1)}>Retry</button></p>}
      <p className="schedule-note">Asia/Colombo · UTC+05:30 · <a href={acjuSource} target="_blank" rel="noreferrer">ACJU published timetable</a> · {acjuZoneLabels[acjuCityZones[prefs.city]]} · {prefs.school === '1' ? 'Hanafi' : 'Shafi‘i'} Asr. {schedulePdf && <a href={schedulePdf} target="_blank" rel="noreferrer">View this month’s official PDF ↗</a>} Follow your mosque for Jamaath.</p>
    </div></section>}
    <main className="page-content">
      {storageError && <p className="alert" role="alert">Your browser could not read or save some data. Allow local storage to keep your progress and preferences.</p>}
      <div className="intro"><div><div className="eyebrow" lang="ar">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div><h1>{tab === 'history' ? 'Your days of intention.' : tab === 'profile' ? 'A space that feels like you.' : prefs.name ? `A day with intention, ${prefs.name}.` : 'A day with intention.'}</h1><p>{tab === 'today' ? 'Make space for prayer, remembrance, and reflection.' : 'Small acts. Sincere intentions. Every single day.'}</p></div>
        {tab === 'today' && <div className="date-picker"><button aria-label="Previous day" onClick={() => shift(-1)} disabled={!date}><ChevronLeft size={17} /></button><input aria-label="Practice date" type="date" value={date} onChange={e => { if (e.target.value) viewDate(e.target.value); }} /><button aria-label="Next day" onClick={() => shift(1)} disabled={!date}><ChevronRight size={17} /></button><button className="today-button" onClick={goToday}>Today</button></div>}
      </div>
      {tab === 'today' && date && currentDate && date !== currentDate && <p className="viewing-date-note">Viewing {date}. <button onClick={goToday}>Return to today</button></p>}
      {tab === 'profile' ? <section className="panel profile-panel"><span className="card-icon"><UserRound size={26} /></span><h2>Your profile</h2><AccountSignIn /><p>Personalise your daily space. Changes save automatically on this device.</p><label>Your name<input maxLength={50} value={prefs.name} placeholder="What should we call you?" onChange={e => setPrefs(p => ({ ...p, name: e.target.value }))} /></label><label>Prayer times city<select value={prefs.city} onChange={e => setPrefs(p => ({ ...p, city: e.target.value }))}>{Object.keys(cities).map(c => <option key={c}>{c}</option>)}</select></label><label>ACJU Asr timetable<select value={prefs.school} onChange={e => setPrefs(p => ({ ...p, school: e.target.value }))}><option value="0">Shafi‘i (ACJU)</option><option value="1">Hanafi (ACJU)</option></select></label><p>Timezone: Asia/Colombo (Sri Lanka). Your routine, dhikr choices, and progress are stored in this browser.</p><button className="primary-button" onClick={() => { goToday(); setEditing(true); }}>Manage my daily routine</button></section>
      : tab === 'history' ? <History records={records} routine={prefs.routine} archived={prefs.archived} today={currentDate} openDay={viewDate} />
      : <>
        <section className="hero"><div className="hero-copy"><span className="hero-label">ONE STEP AT A TIME</span><h2>Consistency grows<br />from little beginnings.</h2><p>Let today be another gentle step closer to Allah.</p><div className="hero-ar" lang="ar" dir="rtl">فَاذْكُرُونِي أَذْكُرْكُمْ</div><div className="hero-translation" lang="ta">என்னை நினைவுகூருங்கள்; நானும் உங்களை நினைவுகூருவேன்.</div><small>AL-BAQARAH 2:152 · EXCERPT</small></div><div className="hero-art" aria-hidden="true"><div className="arch"><span>☾</span><div className="minaret m1" /><div className="dome" /><div className="minaret m2" /><div className="art-line" /></div><span className="star s1">✦</span><span className="star s2">✧</span></div></section>
        <div className="progress-panel"><div className="progress-icon"><Check size={20} /></div><div className="progress-text"><strong>Your daily journey</strong><span>{stats.total > 0 && stats.completed === stats.total ? 'Alhamdulillah. Your routine is complete.' : 'Every sincere effort matters.'}</span></div><div className="progress-right"><div><strong>{stats.completed}<span> / {stats.total}</span></strong><span>completed</span></div><div className="track" role="progressbar" aria-label="Daily practice progress" aria-valuenow={stats.completed} aria-valuemin={0} aria-valuemax={stats.total || 1}><i style={{ width: `${stats.total ? stats.completed / stats.total * 100 : 0}%` }} /></div></div></div>
        <div className="routine-heading"><div><span className="overline">YOUR DAILY RHYTHM</span><h2>One practice at a time.</h2></div><button className={editing ? 'outline-button selected' : 'outline-button'} onClick={() => setEditing(e => !e)} aria-expanded={editing}><Settings2 size={16} />{editing ? 'Done editing' : 'Edit routine'}</button></div>
        {editing && <section className="routine-editor panel"><h3>Make this routine yours</h3><p>Drag the grips to reorder cards within the habits or dhikr section. Hide a practice to pause it, or remove it and restore it later. Saved progress is kept. Hidden practices do not count towards your daily total. Missed-reason notes are saved separately for each date.</p><h4>Restore removed practices</h4><div className="restore-list">{restoreOptions.map(p => <button key={p.id} className="outline-button" onClick={() => restorePractice(p)}><Plus size={14} />{p.title}</button>)}</div><h4>Hidden practices</h4><div className="restore-list">{prefs.routine.filter(p => p.hidden).map(p => <button key={p.id} className="outline-button" onClick={() => updatePractice(p.id, { hidden: false })}><Eye size={14} />Show {p.title}</button>)}{!prefs.routine.some(p => p.hidden) && <span className="muted">No hidden practices.</span>}</div><form onSubmit={e => { e.preventDefault(); const name = newTitle.trim(); if (name) { changeRoutine([...prefs.routine, { id: `custom-${crypto.randomUUID()}`, title: name, hint: 'Your personal daily practice', kind: 'habit', time: newTime }]); setNewTitle(''); setNewTime(''); } }}><label htmlFor="new-practice">Add a personal practice</label><div className="add-row"><input id="new-practice" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Read a page of Qur’an" maxLength={80} required /><label className="new-habit-time">Time (optional)<input type="time" aria-label="New habit time" value={newTime} onChange={e => setNewTime(e.target.value)} /></label><button className="primary-button" type="submit"><Plus size={16} />Add</button></div></form><button className="text-button" onClick={() => setPrefs(p => ({ ...p, routine: [...practiceCatalog.map(item => ({ ...(p.routine.find(saved => saved.id === item.id) || p.archived.find(saved => saved.id === item.id) || item), hidden: false })), ...p.routine.filter(item => !practiceCatalog.some(known => known.id === item.id))], archived: p.archived.filter(item => !practiceCatalog.some(known => known.id === item.id)) }))}><RotateCcw size={13} />Restore suggested routine</button></section>}
        <p className="routine-order-help">Drag the grip on a card to change its order. On a keyboard, focus the grip and use ? or ?.</p><p className="sr-only" aria-live="polite">{reorderMessage}</p>
        <div className="prayers-section">{visibleRoutine.filter(p => routineGroup(p.id) === 'prayers').map(renderPractice)}</div>
        <div className="routine-card-grid">{visibleRoutine.filter(p => routineGroup(p.id) === 'habits').map(renderPractice)}</div>
        <div className="dhikr-card-grid">{visibleRoutine.filter(p => routineGroup(p.id) === 'dhikr').map(renderPractice)}</div>

        {!visibleRoutine.length && <div className="panel empty-state"><Heart size={28} /><h2>Begin your own daily rhythm.</h2><button className="primary-button" onClick={() => setEditing(true)}>Add your first practice</button></div>}
        <div className="end-note">A fresh checklist each Sri Lankan day. Your previous days stay saved.<button onClick={() => { if (confirm('Clear all checkmarks and the istighfar total for this date?')) setRecords(r => ({ ...r, [date]: {} })); }}><RotateCcw size={13} />Reset this day</button></div>
      </>}
      {tab === 'today' && <ParentsReminders />}
      <footer><span className="footer-brand">Thazkirah · تَذْكِرَة</span><span>With intention. With remembrance. With peace.</span><small>Saved in this browser on this device.</small></footer>
    </main>
    {reader && <dialog ref={dialog} className="reader" aria-labelledby="reader-title" onCancel={() => setReader('')} onClick={e => { if (e.target === e.currentTarget) { const rect = e.currentTarget.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) setReader(''); } }}><div className="reader-head"><div><span className="overline">READ & REMEMBER</span><h2 id="reader-title">{title}</h2></div><button autoFocus aria-label="Close reading" onClick={() => setReader('')}><X /></button></div>
      {(reader === '36' || reader === '67') && <><label className="translation-toggle"><input type="checkbox" checked={tamil} onChange={e => setTamil(e.target.checked)} />Show Tamil meanings · தமிழ்</label><p className="reading-source">Arabic & Tamil translation: Omar Sharif, via <a href={`https://quranenc.com/en/browse/tamil_omar/${reader}`} target="_blank" rel="noreferrer">QuranEnc ↗</a></p>{loading && <p role="status">Loading verses…</p>}{readingError && <p className="alert" role="alert">{readingError}</p>}<p className="bismillah" dir="rtl" lang="ar">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>{verses.map(v => <div className="ayah" key={v.aya}><span className="ayah-number">{v.aya}</span><p lang="ar" dir="rtl">{v.arabic_text}</p>{tamil && <div lang="ta">{v.translation}</div>}</div>)}</>}
      {isPeriod(reader) && <><p className="reading-source">Explore a sourced collection of morning and evening adhkar. Select what you want to practise daily; your choices are saved separately for morning and evening. This collection is a starting point, rather than an exhaustive list of every authentic narration.</p><div className="library-controls"><div className="segmented"><button className={dhikrFilter === 'all' ? 'active' : ''} onClick={() => setDhikrFilter('all')}>All adhkar ({available(reader).length})</button><button className={dhikrFilter === 'selected' ? 'active' : ''} onClick={() => setDhikrFilter('selected')}>My daily selection ({prefs.selected[reader].length})</button></div><input type="search" aria-label="Search dhikr" placeholder="Search dhikr or source…" value={search} onChange={e => setSearch(e.target.value)} /></div>{available(reader).filter(d => (dhikrFilter === 'all' || prefs.selected[reader].includes(d.id)) && `${d.title} ${d.meaning} ${tamilMeanings[d.id]} ${d.ref} ${d.ar}`.toLowerCase().includes(search.toLowerCase())).map(d => <article className="ayah dhikr-entry" key={d.id}><div className="dhikr-entry-head"><h3>{d.title}</h3><span className="count-badge">{d.count}×</span></div><label className="daily-choice"><input type="checkbox" checked={prefs.selected[reader].includes(d.id)} onChange={() => selectDhikr(reader, d.id)} />Include in my {reader} practice</label><p dir="rtl" lang="ar">{d.ar}</p><p className="meaning tamil-meaning" lang="ta"><small>Tamil meaning (summary)</small>{tamilMeanings[d.id]}</p><p className="meaning" lang="en">{d.meaning}</p><a className="source-link" href={d.url} target="_blank" rel="noreferrer">{d.ref} ↗</a>{d.note && <p className="dhikr-note">{d.note}</p>}<small className="grade">{d.grade} · {reader}</small>{prefs.selected[reader].includes(d.id) && <label className="daily-choice complete-choice"><input type="checkbox" checked={day[`${reader}:${d.id}`] === true} onChange={() => toggleDhikr(reader, d.id)} />Completed for {date}</label>}</article>)}{!available(reader).some(d => (dhikrFilter === 'all' || prefs.selected[reader].includes(d.id)) && `${d.title} ${d.meaning} ${tamilMeanings[d.id]} ${d.ref} ${d.ar}`.toLowerCase().includes(search.toLowerCase())) && <p className="empty-state">No adhkar here yet. Browse all adhkar or change your search.</p>}</>}
      {reader === 'tahajjud' && <><p className="reading-source">Voluntary night prayer · தஹஜ்ஜுத்</p><div className="ayah"><p lang="ar" dir="rtl">وَمِنَ اللَّيْلِ فَتَهَجَّدْ بِهِ نَافِلَةً لَكَ</p><p className="meaning">Devote part of the night to additional prayer.</p><a className="source-link" href="https://quranenc.com/en/browse/tamil_omar/17#79" target="_blank" rel="noreferrer">Al-Isra 17:79 · Excerpt ↗</a></div><p>Tahajjud is voluntary night prayer after Isha and before Fajr, commonly prayed after sleeping.</p></>}
      <button className="mark-button" disabled={loading || !!readingError} onClick={() => { if (!day[reader]) toggle(reader); setReader(''); }}><Check size={17} />{day[reader] ? 'Completed — close reading' : 'Mark practice as completed'}</button>
    </dialog>}
  </div>;
}
