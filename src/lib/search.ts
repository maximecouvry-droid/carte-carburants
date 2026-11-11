import { normalizeText } from './format';
import type { Ville } from './types';

/** Recherche de ville dans l'index local, accents et casse ignorés : préfixes d'abord, puis le reste, par nombre de stations. */
export function searchVilles(villes: Ville[], query: string, limit = 5): Ville[] {
  const q = normalizeText(query);
  if (q.length < 2) return [];
  const isCp = /^\d{2,5}$/.test(q);
  const starts: Ville[] = [];
  const contains: Ville[] = [];
  for (const v of villes) {
    if (isCp) {
      if (v.cps.some((cp) => cp.startsWith(q))) starts.push(v);
    } else if (v.n.startsWith(q)) starts.push(v);
    else if (v.n.includes(q)) contains.push(v);
  }
  return [...starts, ...contains].slice(0, limit); // villes.json est déjà trié par nombre de stations
}
