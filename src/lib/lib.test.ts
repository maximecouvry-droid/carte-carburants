import { describe, expect, it } from 'vitest';
import { formatAge, formatPrice, normalizeText } from './format';
import { percentile } from './data';
import { searchVilles } from './search';
import type { Ville } from './types';

const v = (nom: string, cps: string[], stations: number): Ville => ({ nom, n: normalizeText(nom), cps, lat: 0, lng: 0, stations });

describe('format', () => {
  it('prix à 3 décimales avec virgule', () => expect(formatPrice(1.859)).toBe('1,859 €'));
  it('ancienneté', () => {
    const now = Date.UTC(2026, 10, 11, 12) ;
    expect(formatAge(now / 1000 - 3 * 86400, now)).toBe('il y a 3 j');
    expect(formatAge(now / 1000 - 5 * 3600, now)).toBe('il y a 5 h');
    expect(formatAge(now / 1000 - 12 * 60, now)).toBe('il y a 12 min');
  });
  it('normalise accents et tirets', () => expect(normalizeText("Saint-Étienne")).toBe('saint etienne'));
});

describe('percentile', () => {
  it('interpole', () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    expect(percentile([1, 2, 3, 4, 5], 0)).toBe(1);
    expect(percentile([1, 2, 3, 4, 5], 100)).toBe(5);
  });
});

describe('searchVilles', () => {
  const villes = [v('Paris', ['75001'], 41), v('Parisot', ['81310'], 2), v('Le Pas Paris', ['12000'], 1), v('Saint-Étienne', ['42000'], 20)];
  it('préfixe avant contenu, accents ignorés', () => {
    expect(searchVilles(villes, 'pari').map((x) => x.nom)).toEqual(['Paris', 'Parisot', 'Le Pas Paris']);
    expect(searchVilles(villes, 'st etienne')).toHaveLength(0);
    expect(searchVilles(villes, 'saint etienne')[0].nom).toBe('Saint-Étienne');
    expect(searchVilles(villes, 'ÉTIENNE')[0].nom).toBe('Saint-Étienne');
  });
  it('code postal', () => expect(searchVilles(villes, '750')[0].nom).toBe('Paris'));
  it('trop court', () => expect(searchVilles(villes, 'p')).toEqual([]));
});
