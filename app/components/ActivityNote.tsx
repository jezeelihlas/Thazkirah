'use client';

import { useLayoutEffect, useRef } from 'react';

export default function ActivityNote({ title, date, value, onChange }: { title: string; date: string; value: string; onChange: (value: string) => void }) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element) return;
    const fit = () => {
      element.style.height = '0px';
      element.style.height = `${Math.min(240, Math.max(value.length ? 68 : 34, element.scrollHeight + 2))}px`;
    };
    fit();
    let width = element.getBoundingClientRect().width;
    const observer = new ResizeObserver(() => {
      const next = element.getBoundingClientRect().width;
      if (next !== width) { width = next; fit(); }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [value]);

  return <div className="missed-reason compact-note"><textarea ref={textarea} rows={1} maxLength={500} aria-label={`Note for ${title} on ${date}`} value={value} placeholder="Note (optional)" onChange={event => onChange(event.target.value)} /></div>;
}
