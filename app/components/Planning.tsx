'use client';

import { useEffect, useState } from 'react';
import { Check, Clock3, Plus, X } from 'lucide-react';
import type { DayRecord, Practice, Records } from '../../lib/practice';

type Plan = { name: string; tasks: string[] };
type Props = {
  date: string;
  plans: Plan[];
  records: Records;
  routine: Practice[];
  onPlans: (plans: Plan[]) => void;
  onRecords: (records: Records) => void;
};

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
  const toggleTask = (taskId: string) => {
    const next = { ...records };
    for (let offset = 0; offset < duration; offset += 1) {
      const target = addDays(date, offset);
      const day: DayRecord = { ...(next[target] || {}) };
      day[taskId] = day[taskId] === true ? false : true;
      next[target] = day;
    }
    onRecords(next);
  };
  const updatePlan = (tasks: string[]) => onPlans(plans.map((item, index) => index === planIndex ? { ...item, tasks } : item));
  const format = (value: number) => `${String(Math.floor(value / 3600)).padStart(2, '0')}:${String(Math.floor(value / 60) % 60).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  const rename = (name: string) => onPlans(plans.map((item, index) => index === planIndex ? { ...item, name: name.slice(0, 40) } : item));

  return <section className="planning-panel panel" aria-label="Weekly plans">
    <div className="planning-heading"><div><span className="overline">PLAN YOUR WEEK</span><h2>Weekly plans</h2><p>Choose a plan and track each task for today, the next 10 days, or this month.</p></div><select aria-label="Plan" value={planIndex} onChange={event => setPlanIndex(Number(event.target.value))}>{plans.map((item, index) => <option value={index} key={index}>{item.name || `Plan ${index + 1}`}</option>)}</select></div>
    <div className="planning-plan-editor"><input aria-label="Plan name" value={plan.name} onChange={event => rename(event.target.value)} /><span>Plan {planIndex + 1} repeats in week {planIndex + 1} of the month.</span></div>
    <div className="planning-grid">{dayNames.map((name, index) => <div className="planning-day" key={name}><strong>{name}</strong>{plan.tasks.map((task, taskIndex) => { const id = taskIds[taskIndex]; const complete = records[date]?.[id] === true; return <button key={`${task}-${taskIndex}`} className={complete ? 'planning-task complete' : 'planning-task'} onClick={() => toggleTask(id)} title={`Apply ${task} to selected period`}><span>{complete ? <Check size={14} /> : <X size={14} />}</span>{task || 'Untitled task'}</button>; })}</div>)}</div>
    <div className="planning-actions"><span>Apply a task to:</span>{([1, 10, 30] as const).map(value => <button key={value} className={duration === value ? 'selected' : ''} onClick={() => setDuration(value)}>{value === 1 ? 'Today' : value === 10 ? '10 days' : 'This month'}</button>)}</div>
    <form className="planning-add" onSubmit={event => { event.preventDefault(); const task = newTask.trim(); if (!task) return; updatePlan([...plan.tasks, task]); setNewTask(''); }}><input value={newTask} onChange={event => setNewTask(event.target.value)} placeholder="Add a task to this plan" maxLength={80} /><button className="primary-button" type="submit"><Plus size={15} />Add task</button></form>
    <div className="focus-panel"><div><span className="overline">FOCUS</span><h3><Clock3 size={18} /> 3-hour focus session</h3><p>Break the session into three one-hour blocks and write what each hour is for.</p></div><strong className="focus-clock">{format(seconds)}</strong><button className="outline-button" onClick={() => { if (seconds === 0) setSeconds(3 * 60 * 60); setFocusRunning(value => !value); }}>{focusRunning ? 'Pause focus' : seconds < 3 * 60 * 60 ? 'Resume focus' : 'Start focus'}</button><div className="focus-hours">{hourNotes.map((note, index) => <label key={index}>Hour {index + 1}<input value={note} onChange={event => setHourNotes(current => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder="What is this hour for?" maxLength={120} /></label>)}</div></div>
  </section>;
}
