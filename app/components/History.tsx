'use client';

import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { activityValue, historyActivities, historyDates, historySeries } from '../../lib/history';
import { prayers, progress, type Practice, type Records } from '../../lib/practice';
import { adhkar } from '../../lib/dhikr';

const labelDate = (date: string, long = false) => new Date(date + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: long ? 'long' : 'short', ...(long ? { year: 'numeric' as const } : {}), timeZone: 'Asia/Colombo' });

export default function History({ records, routine, archived = [], today, openDay }: { records: Records; routine: Practice[]; archived?: Practice[]; today: string; openDay: (date: string) => void }) {
  const [range, setRange] = useState(7);
  const [selected, setSelected] = useState('all');
  const [chosenDate, setChosenDate] = useState('');
  const dates = historyDates(today, range);
  const tracked = dates.filter(date => Object.hasOwn(records, date));
  const activities = historyActivities([...routine, ...archived], records);
  const dhikrIds = new Set(Object.values(records).flatMap(day => Object.keys(day).filter(key => /^(morning|evening):/.test(key))));
  const dhikrActivities = [...dhikrIds].map(id => {
    const [period, dhikr] = id.split(':');
    return { id, title: `${period === 'morning' ? 'Morning' : 'Evening'} · ${adhkar.find(d => d.id === dhikr)?.title || dhikr}`, kind: 'check' as const };
  });
  const jamaath = prayers.map(p => ({ id: `${p.name}-jamaath`, title: `${p.name} in Jamaath`, kind: 'check' as const }));
  const allActivities = [...activities, ...jamaath, ...dhikrActivities];
  const activity = allActivities.find(item => item.id === selected);
  const series = historySeries(records, routine, dates, activity);
  const overall = historySeries(records, routine, dates);
  const average = tracked.length ? Math.round(overall.reduce((sum, point) => sum + (point.value || 0), 0) / tracked.length) : 0;
  const totalPrayers = tracked.reduce((sum, date) => sum + prayers.filter(p => records[date][p.name] === true).length, 0);
  const totalIstighfar = tracked.reduce((sum, date) => sum + activityValue(records, date, 'istighfar-count', 'count'), 0);
  const currentDate = dates.includes(chosenDate) ? chosenDate : dates.at(-1) || today;
  const selectedPoint = series.find(point => point.date === currentDate);
  const selectedStats = progress(records[currentDate] || {}, routine);
  const countMode = activity?.kind === 'count';
  const formatValue = (value: number | null | undefined) => value == null ? 'No record' : countMode ? value.toLocaleString() : activity ? value ? 'Completed' : 'Not completed' : `${value}%`;
  const max = countMode ? Math.max(2, Math.ceil(Math.max(0, ...series.map(point => point.value || 0)) / 2) * 2) : 100;
  const x = (index: number) => 46 + index / Math.max(1, series.length - 1) * 536;
  const y = (value: number) => 164 - value / max * 138;
  // Start a fresh segment after a missing day instead of implying zero completion.
  let newSegment = true;
  const path = series.map((point, index) => {
    if (point.value === null) { newSegment = true; return ''; }
    const command = `${newSegment ? 'M' : 'L'}${x(index)},${y(point.value)}`;
    newSegment = false; return command;
  }).join(' ');
  const ticks = [...new Set([0, Math.floor((dates.length - 1) / 2), dates.length - 1])].filter(index => index >= 0);
  const note = activity && records[currentDate]?.[`note:${activity.id}`];

  return <section className="history-view history-redesign">
    <button className="outline-button" onClick={() => openDay(today)}><ChevronLeft size={17} />Back to today</button>
    <div className="history-toolbar"><div><h2>Your progress, at a glance.</h2><p>{dates.length ? `${labelDate(dates[0])} – ${labelDate(dates.at(-1)!, true)}` : 'Your saved daily practice'}</p></div><div className="history-range" role="group" aria-label="History time period">{[7, 30].map(days => <button key={days} aria-pressed={range === days} onClick={() => setRange(days)}>{days === 7 ? 'Last 7 days' : 'Last 30 days'}</button>)}</div></div>
    <div className="history-summary"><div className="panel"><strong>{tracked.length ? `${average}%` : '—'}</strong><span>average daily completion</span></div><div className="panel"><strong>{tracked.length}<small> / {range}</small></strong><span>days with saved progress</span></div><div className="panel"><strong>{totalPrayers}</strong><span>prayers completed</span></div><div className="panel"><strong>{totalIstighfar.toLocaleString()}</strong><span>istighfar repetitions</span></div></div>
    <section className="panel progress-explorer" aria-labelledby="progress-explorer-title">
      <div className="explorer-heading"><div><h3 id="progress-explorer-title">{activity?.title || 'Daily routine completion'}</h3><p>{countMode ? 'Repetitions recorded each day.' : activity ? 'See which days you completed this activity.' : 'A simple view of your consistency over time.'}</p></div><label>View progress<select aria-label="Activity graph" value={selected} onChange={event => setSelected(event.target.value)}><option value="all">Overall routine</option><optgroup label="Prayers and daily activities">{activities.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</optgroup><optgroup label="Jamaath">{jamaath.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</optgroup>{!!dhikrActivities.length && <optgroup label="Individual dhikr">{dhikrActivities.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</optgroup>}</select></label></div>
      <div className="trend-chart"><svg viewBox="0 0 610 205" role="img" aria-label={`${activity?.title || 'Overall routine'} trend. Missing records appear as gaps; exact daily values are available in the date buttons below.`}>
        {[0, .5, 1].map(ratio => <g key={ratio}><line x1={46} x2={582} y1={y(max * ratio)} y2={y(max * ratio)} className="trend-grid" /><text x={36} y={y(max * ratio) + 4} textAnchor="end" className="trend-axis">{countMode ? new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(max * ratio) : `${Math.round(ratio * 100)}%`}</text></g>)}
        <path d={path} className="trend-line" />
        {series.map((point, index) => point.value === null ? null : <g key={point.date} role="button" tabIndex={0} aria-label={`${labelDate(point.date, true)}: ${formatValue(point.value)}`} onClick={() => setChosenDate(point.date)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setChosenDate(point.date); } }}><circle cx={x(index)} cy={y(point.value)} r={14} fill="transparent" /><circle cx={x(index)} cy={y(point.value)} r={point.date === currentDate ? 6 : 3.5} className={point.date === currentDate ? 'trend-point selected' : 'trend-point'} /><title>{labelDate(point.date)}: {formatValue(point.value)}</title></g>)}
        {ticks.map(index => <text key={index} x={x(index)} y={191} textAnchor={index === 0 ? 'start' : index === dates.length - 1 ? 'end' : 'middle'} className="trend-axis">{labelDate(dates[index])}</text>)}
      </svg>{!tracked.length && <p className="trend-empty">Your graph will grow as you record your days.</p>}</div>
      <div className="history-legend"><span><i className="legend-done" />{activity ? countMode ? 'Repetitions' : 'Completed' : 'More completed'}</span><span><i className="legend-zero" />{activity && !countMode ? 'Not completed' : 'Zero recorded'}</span><span><i className="legend-missing" />No saved day</span></div>
      <div className="history-day-grid" aria-label="Choose a day to inspect">{series.map(point => <button key={point.date} className={'history-day-cell ' + (point.value === null ? 'missing' : point.value === 0 ? 'zero' : 'done') + (point.date === currentDate ? ' selected' : '')} aria-pressed={point.date === currentDate} aria-label={`${labelDate(point.date, true)}: ${formatValue(point.value)}`} onClick={() => setChosenDate(point.date)}><span>{labelDate(point.date)}</span><strong>{point.value === null ? '—' : countMode ? point.value.toLocaleString() : activity ? point.value ? '✓' : '0' : `${point.value}%`}</strong></button>)}</div>
      <div className="selected-day-summary" aria-live="polite"><div><span>{labelDate(currentDate, true)}</span><strong>{formatValue(selectedPoint?.value)}</strong><small>{Object.hasOwn(records, currentDate) ? activity ? countMode ? 'repetitions recorded' : activityValue(records, currentDate, activity!.id, 'check') ? 'You completed this activity.' : 'This activity was not marked complete.' : `${selectedStats.completed} of ${selectedStats.total} current routine activities completed` : 'No progress has been saved for this day.'}</small>{typeof note === 'string' && note && <p className="day-note">{note}</p>}</div><button className="outline-button" onClick={() => openDay(currentDate)}>Open this day<ChevronRight size={16} /></button></div>
      <p className="history-method-note">Overall completion uses your current visible routine. Averages include saved days only; missing days are shown as gaps.</p>
    </section>
    <section className="panel activity-overview"><div className="explorer-heading"><div><h3>Your activities</h3><p>Select an activity to see its detailed graph above.</p></div></div><div className="activity-summary-list">{activities.map(item => {
      const total = tracked.reduce((sum, date) => sum + activityValue(records, date, item.id, item.kind), 0);
      const percent = item.kind === 'check' && tracked.length ? Math.round(total / tracked.length * 100) : 0;
      return <button key={item.id} aria-pressed={selected === item.id} className={'activity-summary-row' + (selected === item.id ? ' selected' : '')} onClick={() => { setSelected(item.id); document.getElementById('progress-explorer-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><span className="activity-summary-name">{item.title}</span><span className="activity-summary-track" aria-hidden="true" style={item.kind === 'count' ? { visibility: 'hidden' } : undefined}><i style={{ width: `${percent}%` }} /></span><span className="activity-summary-value">{item.kind === 'count' ? `${total.toLocaleString()} repetitions` : `${total} / ${tracked.length} days`}</span><ChevronRight size={15} /></button>;
    })}</div></section>
    <details className="panel saved-days-disclosure"><summary><CalendarDays size={18} />All saved days <span>{Object.keys(records).length}</span></summary><div className="saved-day-links">{Object.keys(records).sort().reverse().map(date => <button key={date} onClick={() => openDay(date)}>{labelDate(date, true)}<ChevronRight size={15} /></button>)}{!Object.keys(records).length && <p>Your first checkmark begins your history.</p>}</div></details>
  </section>;
}
