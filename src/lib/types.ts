export const FUELS = ['Gazole', 'SP95', 'SP98', 'E10', 'E85', 'GPLc'] as const;
export type Fuel = (typeof FUELS)[number];

export const FUEL_LABEL: Record<Fuel, string> = {
  E10: 'SP95-E10',
  SP95: 'SP95',
  SP98: 'SP98',
  Gazole: 'Gazole',
  E85: 'E85',
  GPLc: 'GPLc',
};

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

export interface Meta {
  asOf: string;
  stations: number;
  withBrand: number;
}

export interface Ville {
  nom: string;
  /** nom sans accents ni majuscules */
  n: string;
  cps: string[];
  lat: number;
  lng: number;
  stations: number;
}

export interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export const MAX_AGE_DAYS = 60;
