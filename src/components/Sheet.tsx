import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import type { Priced } from '../lib/data';
import { formatAge, formatPrice } from '../lib/format';

export const SHEET_CLOSED = 100;

type Pos = 'closed' | 'half' | 'full';

interface Props {
  items: Priced[];
  total: number;
  onPick: (p: Priced) => void;
  selectedId: number | null;
  footer: ReactNode;
  emptyMessage: ReactNode;
}

const heights = () => ({
  closed: SHEET_CLOSED,
  half: Math.round(window.innerHeight * 0.48),
  full: Math.round(window.innerHeight - 64),
});

export function Sheet({ items, total, onPick, selectedId, footer, emptyMessage }: Props) {
  const [pos, setPos] = useState<Pos>('closed');
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<{ y: number; h: number; moved: boolean } | null>(null);

  const h = heights();
  const height = drag ?? h[pos];

  const down = (e: PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { y: e.clientY, h: h[pos], moved: false };
  };
  const move = (e: PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dy = s.y - e.clientY;
    if (Math.abs(dy) > 5) s.moved = true;
    if (s.moved) setDrag(Math.min(h.full, Math.max(h.closed, s.h + dy)));
  };
  const up = () => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    if (!s.moved) {
      setPos(pos === 'closed' ? 'half' : 'closed');
    } else if (drag !== null) {
      const best = (Object.keys(h) as Pos[]).reduce((a, b) => (Math.abs(h[a] - drag) < Math.abs(h[b] - drag) ? a : b));
      setPos(best);
    }
    setDrag(null);
  };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') setPos(pos === 'closed' ? 'half' : 'full');
    else if (e.key === 'ArrowDown') setPos(pos === 'full' ? 'half' : 'closed');
    else if (e.key === 'Enter' || e.key === ' ') setPos(pos === 'closed' ? 'half' : 'closed');
  };

  const best = items[0];
  return (
    <section className={`sheet ${drag !== null ? 'dragging' : ''}`} style={{ height }} aria-label="Stations de la zone">
      <div
        className="handle"
        role="button"
        tabIndex={0}
        aria-expanded={pos !== 'closed'}
        aria-label="Volet des stations de la zone : tirer vers le haut pour agrandir"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
      >
        <span className="grip" />
        <span className="summary">
          {total === 0 ? 'Aucune station dans la zone' : `${total} station${total > 1 ? 's' : ''} · dès ${formatPrice(best.price)}`}
        </span>
      </div>
      <ol className="list">
        {items.length === 0 && <li className="empty">{emptyMessage}</li>}
        {items.map((p) => (
          <li key={p.station.id}>
            <button className={p.station.id === selectedId ? 'row on' : 'row'} onClick={() => onPick(p)}>
              <strong className="row-price">{formatPrice(p.price)}</strong>
              <span className="row-main">
                <span className="row-brand">{p.station.enseigne ?? p.station.adresse}</span>
                <span className="row-addr">
                  {p.station.enseigne ? `${p.station.adresse}, ` : ''}
                  {p.station.ville}
                </span>
              </span>
              <span className="row-age">{formatAge(p.updatedAt)}</span>
            </button>
          </li>
        ))}
        {total > items.length && <li className="more">{items.length} plus bas prix affichés sur {total}</li>}
      </ol>
      <footer className="foot">{footer}</footer>
    </section>
  );
}
