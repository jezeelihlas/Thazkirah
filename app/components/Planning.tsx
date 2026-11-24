'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Clock3, Plus, X } from 'lucide-react';
import { prayers, type DayRecord, type Practice, type Records } from '../../lib/practice';
import styles from './Planning.module.css';

type Plan = { name: string; tasks: string[] };
type Props = { date: string; plans: Plan[]; records: Records; routine: Practice[]; onPlans: (plans: Plan[]) => void; onRecords: (records: Records) => void };
const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const toDate = (value: string) => new Date(`${value}T12:00:00Z`);
const iso = (value: Date) => value.toISOString().slice(0, 10);
const mondayOf = (value: string) => { const date = toDate(value); const day = date.getUTCDay() || 7; date.setUTCDate(date.getUTCDate() - day + 1); return date; };

export default function Planning({ date, plans, records, routine, onPlans, onRecords }: Props) {
  const [activePlan, setActivePlan] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [focusRunning, setFocusRunning] = useState(false);
  const [seconds, setSeconds] = useState(3 * 60 * 60);
  const [hourNotes, setHourNotes] = useState(['', '', '']);
  const [newTask, setNewTask] = useState('');
  const plan = plans[activePlan] || { name: `Plan ${activePlan + 1}`, tasks: [] };
  const weekStart = mondayOf(date); weekStart.setUTCDate(weekStart.getUTCDate() + weekOffset * 7);
  const weekDates = dayNames.map((_, index) => { const day = new Date(weekStart); day.setUTCDate(day.getUTCDate() + index); return iso(day); });
  const routineRows = routine.filter(item => !item.hidden && item.id !== 'prayers').map(item => ({ id: item.id, title: item.title }));
  const taskRows = [...routineRows, ...plan.tasks.filter(task => !routineRows.some(row => row.title === task)).map(task => ({ id: `custom:${task}`, title: task })), { id: 'focus', title: 'Daily focus' }];
  const rows = [...prayers.map(prayer => ({ id: `prayer:${prayer.name}`, title: prayer.name })), ...taskRows];
  const rowKey = (rowId: string) => `weekly-plan:${activePlan}:${rowId}`;

  useEffect(() => { if (date) { const day = toDate(date).getUTCDate(); setActivePlan(Math.min(3, Math.max(0, Math.ceil(day / 7) - 1))); } }, [date]);
  useEffect(() => { if (!focusRunning) return; const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000); return () => window.clearInterval(timer); }, [focusRunning]);
  const toggleCell = (dayDate: string, rowId: string) => { const nextDay: DayRecord = { ...(records[dayDate] || {}) }; const key = rowKey(rowId); nextDay[key] = nextDay[key] === true ? false : true; onRecords({ ...records, [dayDate]: nextDay }); };
  const updatePlan = (tasks: string[]) => onPlans(plans.map((item, index) => index === activePlan ? { ...item, tasks } : item));
  const rename = (name: string) => onPlans(plans.map((item, index) => index === activePlan ? { ...item, name: name.slice(0, 40) } : item));
  const format = (value: number) => `${String(Math.floor(value / 3600)).padStart(2, '0')}:${String(Math.floor(value / 60) % 60).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  const shiftWeek = (amount: number) => setWeekOffset(value => value + amount);
  const labelDate = (value: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Colombo' }).format(toDate(value));

  return <section className={`${styles.panel} panel`} aria-label="Weekly plans">
    <div className={styles.header}><div><span className="overline">YOUR WEEKLY RHYTHM</span><h2>Weekly plans</h2><p>Choose a week, then track every prayer and task independently.</p></div><span className={styles.weekBadge}>Week {activePlan + 1} · {labelDate(weekDates[0])} – {labelDate(weekDates[6])}</span></div>
    <div className={styles.planTabs} role="tablist" aria-label="Weekly plans">{plans.map((item, index) => <button key={index} className={activePlan === index ? styles.activeTab : ''} role="tab" aria-selected={activePlan === index} onClick={() => setActivePlan(index)}>{item.name || `Plan ${index + 1}`}<small>Week {index + 1}</small></button>)}</div>
    <div className={styles.planCard}><div className={styles.planCardHeader}><div><span className="overline">WEEK {activePlan + 1}</span><h3><input aria-label={`Name for ${plan.name}`} value={plan.name} onChange={event => rename(event.target.value)} /></h3><p>Days run horizontally. Prayers and tasks run vertically.</p></div><div className={styles.weekControls}><button aria-label="Previous week" onClick={() => shiftWeek(-1)}><ChevronLeft size={16} /></button><button aria-label="Next week" onClick={() => shiftWeek(1)}><ChevronRight size={16} /></button></div></div><div className={styles.tableScroll}><table className={styles.weekTable}><thead><tr><th>Prayer / task</th>{dayNames.map((dayName, index) => <th key={dayName}><strong>{dayName}</strong><small>{labelDate(weekDates[index])}</small></th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}><th scope="row">{row.title}</th>{weekDates.map(dayDate => { const checked = records[dayDate]?.[rowKey(row.id)] === true; return <td key={dayDate}><button className={`${styles.cell} ${checked ? styles.complete : styles.incomplete}`} aria-label={`${row.title}, ${labelDate(dayDate)}, ${checked ? 'completed' : 'not completed'}`} onClick={() => toggleCell(dayDate, row.id)}>{checked ? <Check size={15} /> : <X size={15} />}</button></td>; })}</tr>)}</tbody></table></div></div>
    <form className={styles.addTask} onSubmit={event => { event.preventDefault(); const task = newTask.trim(); if (!task || plan.tasks.includes(task)) return; updatePlan([...plan.tasks, task]); setNewTask(''); }}><input value={newTask} onChange={event => setNewTask(event.target.value)} placeholder="Add a custom task to this week" maxLength={80} /><button className="primary-button" type="submit"><Plus size={15} />Add task</button></form>
    <div className={styles.focus}><div className={styles.focusHeader}><div><span className="overline">FOCUS</span><h3><Clock3 size={18} /> Daily focus</h3><p>Use three one-hour blocks and write the intention for each hour.</p></div><div className={styles.timer}><strong>{format(seconds)}</strong><button className="outline-button" onClick={() => { if (seconds === 0) setSeconds(3 * 60 * 60); setFocusRunning(value => !value); }}>{focusRunning ? 'Pause' : seconds < 3 * 60 * 60 ? 'Resume' : 'Start focus'}</button></div></div><div className={styles.hours}>{hourNotes.map((note, index) => <label key={index}>Hour {index + 1}<input value={note} onChange={event => setHourNotes(current => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder="What is this hour for?" maxLength={120} /></label>)}</div></div>
  </section>;
}
