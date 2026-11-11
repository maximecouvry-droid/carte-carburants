import { MAX_AGE_DAYS, type Bounds, type Fuel, type Meta, type Station, type Ville } from './types';

const base = import.meta.env.BASE_URL;

async function getJson<T>(file: string): Promise<T> {
  const res = await fetch(`${base}data/${file}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${file} : HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const loadStations = () => getJson<Station[]>('stations.json');
export const loadMeta = () => getJson<Meta>('meta.json');
export const loadVilles = () => getJson<Ville[]>('villes.json');

export interface Priced {
  station: Station;
  price: number;
  updatedAt: number;
}

/** Stations qui ont ce carburant avec un prix de moins de 60 jours. */
export function pricedFor(stations: Station[], fuel: Fuel, nowMs = Date.now()): Priced[] {
  const limit = nowMs / 1000 - MAX_AGE_DAYS * 86400;
  const out: Priced[] = [];
  for (const station of stations) {
    const p = station.prices[fuel];
    if (p && p[1] > limit) out.push({ station, price: p[0], updatedAt: p[1] });
  }
  return out;
}

export function inBounds<T extends { station: Station }>(items: T[], b: Bounds): T[] {
  return items.filter(({ station: s }) => s.lat >= b.south && s.lat <= b.north && s.lng >= b.west && s.lng <= b.east);
}

/** Percentile (0..100) d'un tableau trié croissant. */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const i = (sorted.length - 1) * (p / 100);
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

export function sortedPrices(items: Priced[]): number[] {
  return items.map((i) => i.price).sort((a, b) => a - b);
}
