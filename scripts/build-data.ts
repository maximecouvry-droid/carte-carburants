import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { decodeXml, parseFeed, unzipFeed, type Station } from './parse';

const URL_FEED = 'https://donnees.roulez-eco.fr/opendata/instantane';
const OUT = 'public/data';
const MIN_STATIONS = 5000;

export function normalizeName(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[-'’]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function displayCity(s: string): string {
  const t = s.trim();
  if (t !== t.toUpperCase()) return t;
  return t.toLowerCase().replace(/(^|[\s\-'’])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())
    .replace(/\b(Le|La|Les|De|Du|Des|Sur|Sous|En|Et|Aux?|L|D)\b(?!$)/g, (m, _x, off) => (off === 0 ? m : m.toLowerCase()));
}

async function download(): Promise<Uint8Array> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 2000 * attempt));
    try {
      const res = await fetch(URL_FEED, { signal: AbortSignal.timeout(30_000), headers: { 'User-Agent': 'carte-carburants (projet perso)' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return new Uint8Array(await res.arrayBuffer());
    } catch (e) { lastErr = e; console.warn(`Téléchargement raté (essai ${attempt + 1}) :`, String(e)); }
  }
  throw new Error(`Flux indisponible : ${lastErr}`);
}

function buildVilles(stations: Station[]) {
  const groups = new Map<string, { nom: string; n: string; cps: Set<string>; lat: number; lng: number; count: number }>();
  for (const s of stations) {
    if (!s.ville) continue;
    const n = normalizeName(s.ville);
    const key = `${n}|${s.cp.slice(0, 2)}`;
    const g = groups.get(key) ?? { nom: displayCity(s.ville), n, cps: new Set<string>(), lat: 0, lng: 0, count: 0 };
    g.cps.add(s.cp); g.lat += s.lat; g.lng += s.lng; g.count++;
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => ({
    nom: g.nom, n: g.n, cps: [...g.cps].sort(),
    lat: Math.round((g.lat / g.count) * 1e4) / 1e4, lng: Math.round((g.lng / g.count) * 1e4) / 1e4, stations: g.count,
  })).sort((a, b) => b.stations - a.stations);
}

async function main() {
  const zip = process.env.FEED_ZIP ? new Uint8Array(readFileSync(process.env.FEED_ZIP)) : await download();
  const { stations, rejectedStations, rejectedPrices } = parseFeed(decodeXml(unzipFeed(zip)));
  if (stations.length < MIN_STATIONS) throw new Error(`Garde-fou : ${stations.length} stations (< ${MIN_STATIONS}), publication annulée`);

  const brands: Record<string, string> = existsSync('data/brands.json') ? JSON.parse(readFileSync('data/brands.json', 'utf8')) : {};
  let withBrand = 0;
  for (const s of stations) {
    const b = brands[String(s.id)];
    if (b) { s.enseigne = b; withBrand++; }
  }

  mkdirSync(OUT, { recursive: true });
  stations.sort((a, b) => a.id - b.id);
  writeFileSync(`${OUT}/stations.json`, JSON.stringify(stations));
  writeFileSync(`${OUT}/villes.json`, JSON.stringify(buildVilles(stations)));
  const meta = { asOf: new Date().toISOString(), stations: stations.length, withBrand, rejectedStations, rejectedPrices };
  writeFileSync(`${OUT}/meta.json`, JSON.stringify(meta));
  console.log(`Stations ${stations.length} (rejetées ${rejectedStations}), prix rejetés ${rejectedPrices}, enseignes ${withBrand}/${stations.length} (${((100 * withBrand) / stations.length).toFixed(1)} %)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
