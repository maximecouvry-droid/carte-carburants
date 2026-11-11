import { formatPrice2 } from '../lib/format';

interface Props {
  min: number;
  max: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
}

/** Slider à deux poignées : deux <input range> superposés. */
export function DualSlider({ min, max, low, high, onChange }: Props) {
  const span = Math.max(max - min, 0.01);
  const pct = (v: number) => ((v - min) / span) * 100;
  return (
    <div className="dual">
      <div className="dual-values" aria-live="polite">
        {formatPrice2(low)} – {formatPrice2(high)} €
      </div>
      <div className="dual-track">
        <div className="dual-fill" style={{ left: `${pct(low)}%`, right: `${100 - pct(high)}%` }} />
        <input
          type="range"
          aria-label="Prix minimum"
          min={min}
          max={max}
          step={0.01}
          value={low}
          onChange={(e) => onChange(Math.min(Number(e.target.value), high), high)}
        />
        <input
          type="range"
          aria-label="Prix maximum"
          min={min}
          max={max}
          step={0.01}
          value={high}
          onChange={(e) => onChange(low, Math.max(Number(e.target.value), low))}
        />
      </div>
    </div>
  );
}
