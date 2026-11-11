import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import { Filters } from './components/Filters';
import { MapView, GREEN, RED, type ViewInfo } from './components/MapView';
import { Sheet } from './components/Sheet';
import { StationCard } from './components/StationCard';
import { inBounds, loadMeta, loadStations, loadVilles, percentile, pricedFor, sortedPrices, type Priced } from './lib/data';
import { formatAgeMs, formatPrice2 } from './lib/format';
import { readUrl, writeUrl } from './lib/url';
import type { Fuel, Meta, Station, Ville } from './lib/types';

const REFRESH_AFTER_MS = 15 * 60 * 1000;
const LIST_MAX = 100;

export function App() {
  const initial = useMemo(readUrl, []);
  const mapRef = useRef<MapRef | null>(null);

  const [stations, setStations] = useState<Station[]>([]);
  const [villes, setVilles] = useState<Ville[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fuel, setFuel] = useState<Fuel>(initial.fuel);
  const [rmin, setRmin] = useState<number | null>(initial.min);
  const [rmax, setRmax] = useState<number | null>(initial.max);
  const [showPrices, setShowPrices] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [view, setView] = useState<ViewInfo | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, m, v] = await Promise.all([loadStations(), loadMeta(), loadVilles()]);
      setStations(s);
      setMeta(m);
      setVilles(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Rechargement quand l'onglet redevient visible et que les données ont plus de 15 minutes ; l'âge affiché reste à jour.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      setTick((t) => t + 1);
      if (meta && Date.now() - new Date(meta.asOf).getTime() > REFRESH_AFTER_MS) void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
  }, [meta, load]);

  const priced = useMemo(() => pricedFor(stations, fuel), [stations, fuel]);

  // Bornes du slider = percentiles 1 et 99 du carburant choisi.
  const bounds = useMemo(() => {
    if (priced.length === 0) return null;
    const sorted = sortedPrices(priced);
    const lo = Math.floor(percentile(sorted, 1) * 100) / 100;
    const hi = Math.ceil(percentile(sorted, 99) * 100) / 100;
    return { lo, hi: Math.max(hi, lo + 0.01) };
  }, [priced]);

  const low = bounds ? Math.min(Math.max(rmin ?? bounds.lo, bounds.lo), bounds.hi) : null;
  const high = bounds ? Math.min(Math.max(rmax ?? bounds.hi, bounds.lo), bounds.hi) : null;
  const restricted = bounds !== null && ((rmin !== null && rmin > bounds.lo + 0.001) || (rmax !== null && rmax < bounds.hi - 0.001));

  const ranged = useMemo<Priced[]>(() => {
    if (!restricted) return priced;
    return priced.filter((p) => p.price >= (low ?? 0) - 0.0005 && p.price <= (high ?? 99) + 0.0005);
  }, [priced, restricted, low, high]);

  const visible = useMemo(() => (view ? inBounds(ranged, view.bounds) : ranged), [ranged, view]);
  const sortedVisible = useMemo(() => [...visible].sort((a, b) => a.price - b.price), [visible]);
  const listItems = useMemo(() => sortedVisible.slice(0, LIST_MAX), [sortedVisible]);

  // Dégradé : percentiles 5 et 95 des prix de la zone visible (ou de tout ce qui est chargé s'il y en a trop peu).
  const colorRange = useMemo<[number, number]>(() => {
    const src = sortedVisible.length >= 5 ? sortedVisible : ranged;
    if (src.length === 0) return [1.5, 2];
    const sorted = sortedPrices(src);
    return [percentile(sorted, 5), percentile(sorted, 95)];
  }, [sortedVisible, ranged]);

  const selected = useMemo(() => stations.find((s) => s.id === selectedId) ?? null, [stations, selectedId]);

  // URL partageable.
  useEffect(() => {
    writeUrl({
      fuel,
      min: restricted ? low : null,
      max: restricted ? high : null,
      lat: view?.lat ?? null,
      lng: view?.lng ?? null,
      zoom: view?.zoom ?? null,
    });
  }, [fuel, restricted, low, high, view]);

  const changeFuel = (f: Fuel) => {
    setFuel(f);
    setRmin(null);
    setRmax(null);
  };

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const locate = () => {
    if (!('geolocation' in navigator)) return flash('La géolocalisation n’est pas disponible sur cet appareil.');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(p);
        mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 12.5, duration: 1200 });
      },
      () => flash('Position indisponible : autorisez la localisation dans votre navigateur.'),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  };

  const pickVille = (v: Ville) => mapRef.current?.flyTo({ center: [v.lng, v.lat], zoom: 12, duration: 1000 });

  const pickStation = (p: Priced) => {
    setSelectedId(p.station.id);
    mapRef.current?.flyTo({ center: [p.station.lng, p.station.lat], zoom: Math.max(mapRef.current.getZoom(), 13), duration: 800 });
  };

  const emptyInZone = !loading && !error && stations.length > 0 && sortedVisible.length === 0;
  const colorLegend = `linear-gradient(90deg, ${GREEN}, #d97706, ${RED})`;

  return (
    <div className="app">
      <div className="map-area">
        <MapView
          mapRef={mapRef}
          items={ranged}
          colorRange={colorRange}
          showPrices={showPrices}
          selectedId={selectedId}
          userPos={userPos}
          initial={initial}
          onSelect={setSelectedId}
          onDeselect={() => setSelectedId(null)}
          onView={setView}
        />

        <Filters
          fuel={fuel}
          onFuel={changeFuel}
          bounds={bounds}
          low={low}
          high={high}
          onRange={(l, h) => {
            setRmin(l);
            setRmax(h);
          }}
          villes={villes}
          onPickVille={pickVille}
        />

        {stations.length > 0 && (
          <div className="legend" aria-label="Légende des prix">
            <span>{formatPrice2(colorRange[0])}</span>
            <i style={{ background: colorLegend }} />
            <span>{formatPrice2(colorRange[1])} €</span>
            <small>moins cher → plus cher</small>
          </div>
        )}

        <div className="controls">
          <button className="ctl" onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom avant">
            +
          </button>
          <button className="ctl" onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom arrière">
            −
          </button>
          <button className="ctl" onClick={locate} aria-label="Ma position">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="12" cy="12" r="3.5" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          </button>
          <button
            className={showPrices ? 'ctl toggle on' : 'ctl toggle'}
            role="switch"
            aria-checked={showPrices}
            onClick={() => setShowPrices((s) => !s)}
            aria-label="Afficher les prix"
          >
            <span aria-hidden>€</span>
            <small>Prix</small>
          </button>
        </div>

        {loading && stations.length === 0 && <div className="banner">Chargement des prix…</div>}
        {error && (
          <div className="banner error" role="alert">
            Impossible de charger les prix ({error}).
            <button onClick={() => void load()}>Réessayer</button>
          </div>
        )}
        {emptyInZone && restricted && (
          <div className="banner">
            Aucune station dans cette fourchette de prix.
            <button
              onClick={() => {
                setRmin(null);
                setRmax(null);
              }}
            >
              Réinitialiser
            </button>
          </div>
        )}
        {toast && (
          <div className="banner" role="status">
            {toast}
          </div>
        )}
      </div>

      {selected && <StationCard station={selected} fuel={fuel} onClose={() => setSelectedId(null)} />}

      <Sheet
        items={listItems}
        total={sortedVisible.length}
        onPick={pickStation}
        selectedId={selectedId}
        emptyMessage={restricted ? 'Aucune station dans cette fourchette de prix.' : 'Aucune station avec ce carburant dans la zone.'}
        footer={
          <>
            <span>{meta ? `Prix mis à jour ${formatAgeMs(meta.asOf)}` : 'Prix : chargement…'}</span>
            <span>
              Source : <a href="https://www.prix-carburants.gouv.fr/rubrique/opendata/">prix-carburants.gouv.fr</a>, Licence Ouverte 2.0 · Enseignes : ©{' '}
              <a href="https://www.openstreetmap.org/copyright">contributeurs OpenStreetMap</a>
            </span>
          </>
        }
      />
    </div>
  );
}

