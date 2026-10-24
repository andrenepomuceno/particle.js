import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from 'react';
import { loadJson, saveJson } from '../persist';

interface Props {
  id: string;
  title: string;
  defaultPosition: { x: number; y: number };
  onClose: () => void;
  children: ReactNode;
}

const keyFor = (id: string) => `dialog-position:${id}`;

function clampToViewport(position: { x: number; y: number }) {
  return {
    x: Math.min(Math.max(position.x, 0), Math.max(window.innerWidth - 120, 0)),
    y: Math.min(Math.max(position.y, 0), Math.max(window.innerHeight - 40, 0)),
  };
}

export function Dialog({ id, title, defaultPosition, onClose, children }: Props) {
  const [position, setPosition] = useState(() => clampToViewport(loadJson(keyFor(id), defaultPosition)));
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => saveJson(keyFor(id), position), [id, position]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    drag.current = { dx: event.clientX - position.x, dy: event.clientY - position.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setPosition(clampToViewport({ x: event.clientX - drag.current.dx, y: event.clientY - drag.current.dy }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <section className="dialog" style={{ left: position.x, top: position.y }} aria-label={title} data-dialog={id}>
      <div className="dialog-title" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        <span>{title}</span>
        <button aria-label={`Close ${title}`} onClick={onClose}>✕</button>
      </div>
      <div className="dialog-body">{children}</div>
    </section>
  );
}
