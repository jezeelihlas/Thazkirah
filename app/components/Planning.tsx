'use client';

import { useEffect, useState } from 'react';
import { Check, Clock3, Plus, X } from 'lucide-react';
import type { DayRecord, Practice, Records } from '../../lib/practice';
import styles from './Planning.module.css';

type Plan = { name: string; tasks: string[] };
type Props = { date: string; plans: Plan[]; records: Records; routine: Practice[]; onPlans: (plans: Plan[]) => void; onRecords: (records: Records) => void };
const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const addDays = (value: string, offset: number) => { const date = new Date(`${value}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10); };

export default function Planning({ date, plans, records, routine, onPlans, onRecords }: Props) {
  const [planIndex, setPlanIndex] = useState(0);
  const [duration, setDuration] = useState<1 | 10 | 30>(1);
  const [focusRunning, setFocusRunning] = useState(false);
  const [seconds, setSeconds] = useState(3 * 60 * 60);
  const [hourNotes, setHourNotes] = useState(['', '', '']);
  const [newTask, setNewTask] = useState('');
  const plan = plans[planIndex] || { name: `Plan ${planIndex + 1}`, tasks: [] };

  useEffect(() => { if (!focusRunning) return; const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000); return () => window.clearInterval(timer); }, [focusRunning]);
  const taskIds = plan.tasks.map(title => routine.find(item => item.title === title)?.id || `plan:${planIndex}:${title}`);
  const toggleTask = (taskId: string) => { const next = { ...records }; for (let offset = 0; offset < duration; offset += 1) { const target = addDays(date, offset); const day: DayRecord = { ...(next[target] || {}) }; day[taskId] = day[taskId] === true ? false : true; next[target] = day; } onRecords(next); };
  const updatePlan = (tasks: string[]) => onPlans(plans.map((item, index) => index === planIndex ? { ...item, tasks } : item));
  const rename = (name: string) => onPlans(plans.map((item, index) => index === planIndex ? { ...item, name: name.slice(0, 40) } : item));
  const format = (value: number) => `${String(Math.floor(value / 3600)).padStart(2, '0')}:${String(Math.floor(value / 60) % 60).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;

  return <section className={`${styles.panel} panel`} aria-label="Weekly plans">
    <div className={styles.header}><div><span className="overline">PLAN YOUR WEEK</span><h2>Weekly plans</h2><p>Build a rhythm for each week and keep your daily tasks visible.</p></div><div className={styles.planSelect}><label htmlFor="plan-select">Choose plan</label><select id="plan-select" value={planIndex} onChange={event => setPlanIndex(Number(event.target.value))}>{plans.map((item, index) => <option value={index} key={index}>{item.name || `Plan ${index + 1}`}</option>)}</select></div></div>
    <div className={styles.planMeta}><input aria-label="Plan name" value={plan.name} onChange={event => rename(event.target.value)} /><span>Repeats during week {planIndex + 1} of the month</span></div>
    <div className={styles.weekGrid}>{dayNames.map(name => <div className={styles.dayCard} key={name}><strong>{name}</strong><div className={styles.taskList}>{plan.tasks.map((task, taskIndex) => { const id = taskIds[taskIndex]; const complete = records[date]?.[id] === true; return <button key={`${task}-${taskIndex}`} className={`${styles.task} ${complete ? styles.complete : styles.incomplete}`} onClick={() => toggleTask(id)}><span className={styles.status}>{complete ? <Check size={13} /> : <X size={13} />}</span><span>{task || 'Untitled task'}</span></button>; })}</div></div>)}</div>
    <div className={styles.duration}><span>Apply selected task to:</span>{([1, 10, 30] as const).map(value => <button key={value} className={duration === value ? styles.selected : ''} onClick={() => setDuration(value)}>{value === 1 ? 'Today' : value === 10 ? 'Next 10 days' : 'This month'}</button>)}</div>
    <form className={styles.addTask} onSubmit={event => { event.preventDefault(); const task = newTask.trim(); if (!task) return; updatePlan([...plan.tasks, task]); setNewTask(''); }}><input value={newTask} onChange={event => setNewTask(event.target.value)} placeholder="Add a task to this plan" maxLength={80} /><button className="primary-button" type="submit"><Plus size={15} />Add task</button></form>
    <div className={styles.focus}><div className={styles.focusHeader}><div><span className="overline">FOCUS</span><h3><Clock3 size={18} /> Three-hour focus</h3><p>Use three one-hour blocks and write the intention for each hour.</p></div><div className={styles.timer}><strong>{format(seconds)}</strong><button className="outline-button" onClick={() => { if (seconds === 0) setSeconds(3 * 60 * 60); setFocusRunning(value => !value); }}>{focusRunning ? 'Pause' : seconds < 3 * 60 * 60 ? 'Resume' : 'Start focus'}</button></div></div><div className={styles.hours}>{hourNotes.map((note, index) => <label key={index}>Hour {index + 1}<input value={note} onChange={event => setHourNotes(current => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder="What is this hour for?" maxLength={120} /></label>)}</div></div>
  </section>;
}
