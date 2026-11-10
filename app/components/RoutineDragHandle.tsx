'use client';

import { useRef } from 'react';
import { GripVertical } from 'lucide-react';

export default function RoutineDragHandle({ id, title, onDrop, onStep, onDrag, onHover }: { id: string; title: string; onDrop: (id: string, target: string) => void; onStep: (id: string, direction: number) => void; onDrag: (id: string) => void; onHover: (id: string) => void }) {
  const start = useRef<{ x: number; y: number; moving: boolean } | null>(null);
  const targetAt = (x: number, y: number) => document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-routine-id]')?.dataset.routineId || '';
  return <button className="routine-drag-handle" aria-label={`Reorder ${title}. Drag or use the up and down arrow keys.`} title="Drag to reorder" onKeyDown={event => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); onStep(id, event.key === 'ArrowUp' ? -1 : 1); }
  }} onPointerDown={event => {
    if (event.button !== 0) return;
    start.current = { x: event.clientX, y: event.clientY, moving: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }} onPointerMove={event => {
    if (!start.current) return;
    if (!start.current.moving && Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 6) { start.current.moving = true; onDrag(id); }
    if (start.current.moving) {
      if (event.clientY < 60) window.scrollBy(0, -18);
      else if (event.clientY > window.innerHeight - 60) window.scrollBy(0, 18);
      onHover(targetAt(event.clientX, event.clientY));
    }
  }} onPointerUp={event => {
    if (start.current?.moving) { const target = targetAt(event.clientX, event.clientY); if (target) onDrop(id, target); }
    start.current = null; onDrag(''); onHover('');
  }} onPointerCancel={() => { start.current = null; onDrag(''); onHover(''); }}><GripVertical size={18} strokeWidth={1.6} /></button>;
}
