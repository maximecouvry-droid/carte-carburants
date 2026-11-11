import { FUELS, type Fuel } from './types';

export interface UrlState {
  fuel: Fuel;
  min: number | null;
  max: number | null;
  lat: number | null;
  lng: number | null;
  zoom: number | null;
}

const num = (v: string | null) => {
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function readUrl(search = window.location.search): UrlState {
  const q = new URLSearchParams(search);
  const f = q.get('f') as Fuel | null;
  return {
    fuel: f && (FUELS as readonly string[]).includes(f) ? f : 'E10',
    min: num(q.get('min')),
    max: num(q.get('max')),
    lat: num(q.get('lat')),
    lng: num(q.get('lng')),
    zoom: num(q.get('z')),
  };
}

export function writeUrl(s: UrlState) {
  const q = new URLSearchParams();
  if (s.fuel !== 'E10') q.set('f', s.fuel);
  if (s.min !== null) q.set('min', s.min.toFixed(2));
  if (s.max !== null) q.set('max', s.max.toFixed(2));
  if (s.lat !== null && s.lng !== null && s.zoom !== null) {
    q.set('lat', s.lat.toFixed(4));
    q.set('lng', s.lng.toFixed(4));
    q.set('z', s.zoom.toFixed(1));
  }
  const str = q.toString();
  try {
    window.history.replaceState(null, '', `${window.location.pathname}${str ? `?${str}` : ''}`);
  } catch {
    /* sans importance */
  }
}
