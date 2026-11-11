import { unzipSync } from 'fflate';
import { XMLParser } from 'fast-xml-parser';

export const FUELS = ['Gazole', 'SP95', 'SP98', 'E10', 'E85', 'GPLc'] as const;
export type Fuel = (typeof FUELS)[number];

export interface Station {
  id: number;
  lat: number;
  lng: number;
  adresse: string;
  ville: string;
  cp: string;
  pop: 'A' | 'R';
  enseigne?: string;
  /** carburant -> [prix €/L, date de mise à jour en secondes Unix] */
  prices: Partial<Record<Fuel, [number, number]>>;
}

export interface ParseResult {
  stations: Station[];
  rejectedStations: number;
  rejectedPrices: number;
}

export const PRICE_MIN = 0.5;
export const PRICE_MAX = 4.0;
export const BOX = { latMin: 41.2, latMax: 51.2, lngMin: -5.3, lngMax: 9.8 };

/** Lit l'encodage dans la déclaration XML (ISO-8859-1 par défaut observé, jamais supposé). */
export function decodeXml(bytes: Uint8Array): string {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 200));
  const enc = /encoding=["']([^"']+)["']/i.exec(head)?.[1] ?? 'utf-8';
  return new TextDecoder(enc).decode(bytes);
}

export function unzipFeed(zip: Uint8Array): Uint8Array {
  const files = unzipSync(zip);
  const name = Object.keys(files).find((n) => n.toLowerCase().endsWith('.xml'));
  if (!name) throw new Error('Aucun XML dans le ZIP');
  return files[name];
}

const offsetCache = new Map<string, number>();
/** Secondes Unix pour une date/heure « AAAA-MM-JJ HH:mm:ss » lue à l'heure de Paris. */
export function parisToUnix(maj: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(maj.trim());
  if (!m) return null;
  const [y, mo, d, h, mi, s] = m.slice(1).map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi, s);
  // Décalage de Paris à cet instant (1h ou 2h), obtenu via Intl.
  const key = `${y}-${mo}-${d}-${h}`;
  let off = offsetCache.get(key);
  if (off === undefined) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris', hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(asUtc - 3600_000)).reduce<Record<string, number>>((a, p) => {
      if (p.type !== 'literal') a[p.type] = Number(p.value);
      return a;
    }, {});
    const local = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    off = local - (asUtc - 3600_000);
    offsetCache.set(key, off);
  }
  return Math.round((asUtc - off) / 1000);
}

const arr = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

export function parseFeed(xml: string): ParseResult {
  const parser = new XMLParser({
    ignoreAttributes: false, attributeNamePrefix: '@', parseAttributeValue: false, parseTagValue: false,
    isArray: (name) => name === 'pdv' || name === 'prix',
    // Les horaires et services ne servent pas : on évite de les garder en mémoire.
    stopNodes: ['pdv_liste.pdv.horaires', 'pdv_liste.pdv.services', 'pdv_liste.pdv.rupture'],
  });
  const doc = parser.parse(xml);
  const stations: Station[] = [];
  let rejectedStations = 0;
  let rejectedPrices = 0;

  for (const p of arr<any>(doc?.pdv_liste?.pdv)) {
    const id = Number(p['@id']);
    const lat = Number(p['@latitude']) / 100000;
    const lng = Number(p['@longitude']) / 100000;
    const cp = String(p['@cp'] ?? '').trim();
    const pop = p['@pop'] === 'A' ? 'A' : 'R';
    const ok =
      Number.isInteger(id) && id > 0 && Number.isFinite(lat) && Number.isFinite(lng) &&
      !(lat === 0 && lng === 0) && !cp.startsWith('97') && !cp.startsWith('98') &&
      lat >= BOX.latMin && lat <= BOX.latMax && lng >= BOX.lngMin && lng <= BOX.lngMax;
    if (!ok) { rejectedStations++; continue; }

    const prices: Station['prices'] = {};
    for (const pr of arr<any>(p.prix)) {
      const fuel = pr['@nom'] as Fuel;
      const value = Number(pr['@valeur']);
      const at = parisToUnix(String(pr['@maj'] ?? ''));
      if (!FUELS.includes(fuel) || !(value >= PRICE_MIN && value <= PRICE_MAX) || at === null) { rejectedPrices++; continue; }
      prices[fuel] = [Math.round(value * 1000) / 1000, at];
    }
    if (Object.keys(prices).length === 0) { rejectedStations++; continue; }

    stations.push({
      id, lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5,
      adresse: String(p.adresse ?? '').trim(), ville: String(p.ville ?? '').trim(), cp, pop, prices,
    });
  }
  return { stations, rejectedStations, rejectedPrices };
}
