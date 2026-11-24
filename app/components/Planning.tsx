'use client';

import { useEffect, useState } from 'react';
import { Check, Clock3, Plus, X } from 'lucide-react';
import type { DayRecord, Practice, Records } from '../../lib/practice';
import styles from './Planning.module.css';

type Plan = { name: string; tasks: string[] };
type Props = { date: string; plans: Plan[]; records: Records; routine: Practice[]; onPlans: (plans: Plan[]) => void; onRecords: (records: Records) => void };
const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Planning({ date, plans, records, routine, onPlans, onRecords }: Props) {
  const [activePlan, setActivePlan] = useState(0);
  const [focusRunning, setFocusRunning] = useState(false);
  const [seconds, setSeconds] = useState(3 * 60 * 60);
  const [hourNotes, setHourNotes] = useState(['', '', '']);
  const [newTask, setNewTask] = useState('');

  useEffect(() => { if (date) setActivePlan(Math.min(3, Math.max(0, Math.ceil(new Date(`${date}T12:00:00Z`).getUTCDate() / 7) - 1))); }, [date]);

  useEffect(() => { if (!focusRunning) return; const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000); return () => window.clearInterval(timer); }, [focusRunning]);
  const plan = plans[activePlan] || { name: `Plan ${activePlan + 1}`, tasks: [] };
  const updatePlan = (tasks: string[]) => onPlans(plans.map((item, index) => index === activePlan ? { ...item, tasks } : item));
  const rename = (name: string) => onPlans(plans.map((item, index) => index === activePlan ? { ...item, name: name.slice(0, 40) } : item));
  const taskKey = (dayName: string, task: string) => `weekly-plan:${activePlan}:${dayName}:${task}`;
  const toggleTask = (dayName: string, task: string) => { const id = taskKey(dayName, task); const nextDay: DayRecord = { ...(records[date] || {}) }; nextDay[id] = nextDay[id] === true ? false : true; onRecords({ ...records, [date]: nextDay }); };
  const format = (value: number) => `${String(Math.floor(value / 3600)).padStart(2, '0')}:${String(Math.floor(value / 60) % 60).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  const routineNames = new Set(routine.map(item => item.title));

  return <section className={`${styles.panel} panel`} aria-label="Weekly plans">
    <div className={styles.header}><div><span className="overline">YOUR WEEKLY RHYTHM</span><h2>Weekly plans</h2><p>Choose a plan for this week and complete each day independently.</p></div><span className={styles.weekBadge}>Default: Week {activePlan + 1}</span></div>
    <div className={styles.planTabs} role="tablist" aria-label="Weekly plans">{plans.map((item, index) => <button key={index} className={activePlan === index ? styles.activeTab : ''} role="tab" aria-selected={activePlan === index} onClick={() => setActivePlan(index)}>{item.name || `Plan ${index + 1}`}<small>Week {index + 1}</small></button>)}</div>
    <div className={styles.planCard}><div className={styles.planCardHeader}><div><span className="overline">WEEK {activePlan + 1}</span><h3><input aria-label={`Name for ${plan.name}`} value={plan.name} onChange={event => rename(event.target.value)} /></h3><p>Every checkmark belongs only to its selected day.</p></div><span className={styles.planCount}>{plan.tasks.length} tasks</span></div><div className={styles.dayList}>{dayNames.map(dayName => <div className={styles.dayRow} key={dayName}><strong>{dayName}</strong><div className={styles.taskList}>{plan.tasks.map(task => { const id = taskKey(dayName, task); const complete = records[date]?.[id] === true; return <button key={task} className={`${styles.task} ${complete ? styles.complete : styles.incomplete}`} onClick={() => toggleTask(dayName, task)}><span className={styles.status}>{complete ? <Check size={13} /> : <X size={13} />}</span><span>{task}</span></button>; })}</div></div>)}</div></div>
    <form className={styles.addTask} onSubmit={event => { event.preventDefault(); const task = newTask.trim(); if (!task || routineNames.has(task)) return; updatePlan([...plan.tasks, task]); setNewTask(''); }}><input value={newTask} onChange={event => setNewTask(event.target.value)} placeholder="Add a task to this weekly plan" maxLength={80} /><button className="primary-button" type="submit"><Plus size={15} />Add task</button></form>
    <div className={styles.focus}><div className={styles.focusHeader}><div><span className="overline">FOCUS</span><h3><Clock3 size={18} /> Three-hour focus</h3><p>Use three one-hour blocks and write the intention for each hour.</p></div><div className={styles.timer}><strong>{format(seconds)}</strong><button className="outline-button" onClick={() => { if (seconds === 0) setSeconds(3 * 60 * 60); setFocusRunning(value => !value); }}>{focusRunning ? 'Pause' : seconds < 3 * 60 * 60 ? 'Resume' : 'Start focus'}</button></div></div><div className={styles.hours}>{hourNotes.map((note, index) => <label key={index}>Hour {index + 1}<input value={note} onChange={event => setHourNotes(current => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder="What is this hour for?" maxLength={120} /></label>)}</div></div>
  </section>;
}
