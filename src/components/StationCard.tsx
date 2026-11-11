import { formatAge, formatPrice } from '../lib/format';
import { FUELS, FUEL_LABEL, MAX_AGE_DAYS, type Fuel, type Station } from '../lib/types';

interface Props {
  station: Station;
  fuel: Fuel;
  onClose: () => void;
}

export function StationCard({ station, fuel, onClose }: Props) {
  const limit = Date.now() / 1000 - MAX_AGE_DAYS * 86400;
  const rows = FUELS.filter((f) => {
    const p = station.prices[f];
    return p && p[1] > limit;
  });
  const title = station.enseigne ?? station.adresse;
  return (
    <aside className="card" role="dialog" aria-label={`Station ${title}`}>
      <button className="icon-btn close" aria-label="Fermer la fiche" onClick={onClose}>
        ✕
      </button>
      <h2>{title}</h2>
      <p className="addr">
        {station.enseigne ? `${station.adresse}, ` : ''}
        {station.cp} {station.ville}
        {station.pop === 'A' && <span className="tag">Autoroute</span>}
      </p>
      {rows.length === 0 ? (
        <p className="muted">Aucun prix récent (moins de {MAX_AGE_DAYS} jours).</p>
      ) : (
        <ul className="prices">
          {rows.map((f) => {
            const [price, at] = station.prices[f]!;
            return (
              <li key={f} className={f === fuel ? 'hl' : ''}>
                <span className="fuel">{FUEL_LABEL[f]}</span>
                <span className="age">{formatAge(at)}</span>
                <strong>{formatPrice(price)}</strong>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
