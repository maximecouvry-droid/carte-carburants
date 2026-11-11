import { useEffect, useMemo, useRef, useState } from 'react';
import { searchVilles } from '../lib/search';
import { FUELS, FUEL_LABEL, type Fuel, type Ville } from '../lib/types';
import { DualSlider } from './DualSlider';

interface Props {
  fuel: Fuel;
  onFuel: (f: Fuel) => void;
  bounds: { lo: number; hi: number } | null;
  low: number | null;
  high: number | null;
  onRange: (low: number, high: number) => void;
  villes: Ville[];
  onPickVille: (v: Ville) => void;
}

export function Filters({ fuel, onFuel, bounds, low, high, onRange, villes, onPickVille }: Props) {
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (search) input.current?.focus();
  }, [search]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearch(false);
        setMenu(false);
        setQ('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => (search ? searchVilles(villes, debounced) : []), [villes, debounced, search]);

  const closeSearch = () => {
    setSearch(false);
    setQ('');
  };

  return (
    <div className="filters" role="region" aria-label="Filtres">
      {search ? (
        <div className="searchbar">
          <input
            ref={input}
            type="search"
            inputMode="search"
            placeholder="Ville ou code postal"
            aria-label="Rechercher une ville"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
          />
          <button className="icon-btn" aria-label="Fermer la recherche" onClick={closeSearch}>
            ✕
          </button>
          {results.length > 0 && (
            <ul className="suggestions" role="listbox">
              {results.map((v) => (
                <li key={`${v.n}-${v.cps[0]}`}>
                  <button
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      onPickVille(v);
                      closeSearch();
                    }}
                  >
                    <strong>{v.nom}</strong>
                    <span>{v.cps.length > 1 ? `${v.cps[0].slice(0, 2)}…` : v.cps[0]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {debounced.length >= 2 && results.length === 0 && <div className="suggestions empty">Aucune commune avec station trouvée</div>}
        </div>
      ) : (
        <div className="filters-row">
          <div className="fuel-wrap">
            <button className="chip" aria-haspopup="listbox" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              {fuel} <span aria-hidden>▾</span>
            </button>
            {menu && (
              <ul className="menu" role="listbox" aria-label="Carburant">
                {FUELS.map((f) => (
                  <li key={f}>
                    <button
                      role="option"
                      aria-selected={f === fuel}
                      className={f === fuel ? 'on' : ''}
                      onClick={() => {
                        onFuel(f);
                        setMenu(false);
                      }}
                    >
                      {FUEL_LABEL[f]}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="slider-wrap">
            {bounds && low !== null && high !== null ? (
              <DualSlider min={bounds.lo} max={bounds.hi} low={low} high={high} onChange={onRange} />
            ) : (
              <span className="muted">Chargement…</span>
            )}
          </div>
          <button className="icon-btn" aria-label="Rechercher une ville" onClick={() => setSearch(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
