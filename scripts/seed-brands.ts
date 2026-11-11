// Premier remplissage de data/brands.json depuis enseignes.csv (dépôt communautaire, dérivé d'OpenStreetMap, ODbL).
import { readFileSync, writeFileSync } from 'node:fs';
import { normalizeId } from './brands';

const lines = readFileSync(process.argv[2] ?? '.cache/enseignes.csv', 'utf8').split(/\r?\n/).slice(1);
const out: Record<string, string> = {};
for (const line of lines) {
  const i = line.indexOf(',');
  if (i < 0) continue;
  const id = normalizeId(line.slice(0, i));
  const name = line.slice(i + 1).trim().replace(/^"|"$/g, '');
  if (id && name) out[id] = name;
}
writeFileSync('data/brands.json', JSON.stringify(out));
console.log(`${Object.keys(out).length} enseignes écrites dans data/brands.json`);
