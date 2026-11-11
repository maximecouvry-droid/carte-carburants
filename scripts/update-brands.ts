// Mise à jour hebdomadaire des enseignes depuis OpenStreetMap (Overpass). Fusionne dans data/brands.json.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { idsFromRef, pickBrand } from './brands';

const QUERY = `[out:json][timeout:180];
area["ISO3166-1"="FR"][admin_level=2]->.fr;
nwr["amenity"="fuel"]["ref:FR:prix-carburants"](area.fr);
out tags;`;
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];

async function fetchOverpass(): Promise<any> {
  let last: unknown;
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: new URLSearchParams({ data: QUERY }),
        signal: AbortSignal.timeout(240_000),
        headers: { 'User-Agent': 'carte-carburants/1.0 (projet perso, maj hebdomadaire; github.com/maximecouvry-droid/carte-carburants)' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      last = e;
      console.warn(url, String(e));
    }
  }
  throw new Error(`Overpass indisponible : ${last}`);
}

const data = await fetchOverpass();
const previous: Record<string, string> = existsSync('data/brands.json') ? JSON.parse(readFileSync('data/brands.json', 'utf8')) : {};
const found: Record<string, string> = {};
for (const el of data.elements ?? []) {
  const brand = pickBrand(el.tags ?? {});
  if (!brand) continue;
  for (const id of idsFromRef(el.tags['ref:FR:prix-carburants'] ?? '')) found[id] = brand;
}
if (Object.keys(found).length < 3000) {
  throw new Error(`Garde-fou : seulement ${Object.keys(found).length} enseignes reçues, fichier inchangé`);
}
// Fusion : les nouvelles valeurs écrasent, les anciennes absentes sont conservées.
const merged = { ...previous, ...found };
const sorted = Object.fromEntries(Object.entries(merged).sort((a, b) => Number(a[0]) - Number(b[0])));
writeFileSync('data/brands.json', JSON.stringify(sorted));
console.log(`OSM : ${Object.keys(found).length} enseignes, fichier : ${Object.keys(sorted).length}`);
