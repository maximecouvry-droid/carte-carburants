const NON_INFORMATIVE = new Set([
  '', 'station', 'station service', 'station-service', 'station essence', 'gas station', 'carburant', 'carburants',
  'fuel', 'essence', 'gazole', 'pompe', 'pompes', 'libre service', 'automate', 'borne', 'yes', 'no', 'unknown', 'inconnu',
]);

const ALIASES: Record<string, string> = {
  total: 'TotalEnergies', totalenergies: 'TotalEnergies', 'total energies': 'TotalEnergies',
  'total access': 'TotalEnergies Access', 'totalenergies access': 'TotalEnergies Access',
  leclerc: 'E.Leclerc', 'e leclerc': 'E.Leclerc', 'e. leclerc': 'E.Leclerc', 'e.leclerc': 'E.Leclerc', 'centre leclerc': 'E.Leclerc',
  intermarche: 'Intermarché', 'intermarché': 'Intermarché', 'intermarche contact': 'Intermarché Contact',
  carrefour: 'Carrefour', 'carrefour market': 'Carrefour Market', 'carrefour contact': 'Carrefour Contact',
  'super u': 'Super U', 'hyper u': 'Hyper U', 'u express': 'U Express', 'systeme u': 'Système U', 'système u': 'Système U',
  auchan: 'Auchan', casino: 'Casino', esso: 'Esso', bp: 'BP', shell: 'Shell', avia: 'AVIA', agip: 'Agip', eni: 'Eni',
  elan: 'Elan', dyneff: 'Dyneff', vito: 'Vito', netto: 'Netto', cora: 'Cora', 'géant': 'Géant Casino', 'geant casino': 'Géant Casino',
};

/** Retire les espaces et les zéros de tête : "01000001" et "1000001" donnent la même clé. */
export function normalizeId(raw: string): string | null {
  const t = String(raw).replace(/\s+/g, '');
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isSafeInteger(n) && n > 0 ? String(n) : null;
}

export function cleanBrand(raw: string | undefined, maxLen = 64): string | null {
  if (!raw) return null;
  const t = raw.trim().replace(/\s+/g, ' ');
  const key = t.toLowerCase();
  if (NON_INFORMATIVE.has(key) || t.length > maxLen) return null;
  return ALIASES[key] ?? t;
}

/** brand, sinon name (24 caractères maximum), sinon operator. */
export function pickBrand(tags: Record<string, string>): string | null {
  return cleanBrand(tags.brand) ?? cleanBrand(tags.name, 24) ?? cleanBrand(tags.operator);
}

/** Plusieurs refs séparées par « ; » dans OSM. */
export function idsFromRef(ref: string): string[] {
  return ref.split(/[;,]/).map(normalizeId).filter((x): x is string => x !== null);
}
