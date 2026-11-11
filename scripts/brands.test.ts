import { describe, expect, it } from 'vitest';
import { cleanBrand, idsFromRef, normalizeId, pickBrand } from './brands';

describe('brands', () => {
  it('normalise les identifiants', () => {
    expect(normalizeId('01000001')).toBe('1000001');
    expect(normalizeId(' 1000 001 ')).toBe('1000001');
    expect(normalizeId('abc')).toBeNull();
    expect(idsFromRef('1000001;02000002')).toEqual(['1000001', '2000002']);
  });
  it('choisit brand, puis name, puis operator', () => {
    expect(pickBrand({ brand: 'Total', name: 'x' })).toBe('TotalEnergies');
    expect(pickBrand({ name: 'Station Leclerc' })).toBe('Station Leclerc');
    expect(pickBrand({ name: 'Un nom beaucoup trop long pour une enseigne', operator: 'Dyneff' })).toBe('Dyneff');
    expect(pickBrand({ brand: 'Station service', operator: 'Esso' })).toBe('Esso');
    expect(pickBrand({})).toBeNull();
  });
  it('écarte les valeurs non informatives', () => {
    expect(cleanBrand('Station-service')).toBeNull();
  });
});
