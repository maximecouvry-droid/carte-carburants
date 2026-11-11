import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeXml, parseFeed, parisToUnix } from './parse';

const fixture = decodeXml(new Uint8Array(readFileSync(new URL('./fixtures/extrait.xml', import.meta.url))));
const wrap = (pdv: string) => `<?xml version="1.0" encoding="ISO-8859-1"?><pdv_liste>${pdv}</pdv_liste>`;

describe('parseFeed (extrait réel)', () => {
  const { stations } = parseFeed(fixture);
  it('lit les stations, coordonnées divisées par 100 000', () => {
    expect(stations.length).toBeGreaterThanOrEqual(3);
    const s = stations.find((x) => x.id === 27340001)!;
    expect(s.lat).toBeCloseTo(49.301637, 5);
    expect(s.lng).toBeCloseTo(1.165554, 5);
    expect(s.ville).toBe('Les Damps');
    expect(s.adresse).toBe('75 Avenue Forêt de Bord'); // encodage ISO-8859-1 correct
    expect(s.pop).toBe('R');
  });
  it('lit les prix par nom de carburant avec date', () => {
    const s = stations.find((x) => x.id === 27340001)!;
    expect(s.prices.Gazole![0]).toBe(2.099);
    expect(s.prices.E10![0]).toBe(1.959);
    expect(s.prices.SP95).toBeUndefined();
    expect(s.prices.Gazole![1]).toBe(parisToUnix('2026-11-06 01:00:00'));
  });
});

describe('dates (heure de Paris)', () => {
  it('hiver = UTC+1, été = UTC+2', () => {
    expect(parisToUnix('2026-01-15 12:00:00')).toBe(Date.UTC(2026, 0, 15, 11) / 1000);
    expect(parisToUnix('2026-07-15 12:00:00')).toBe(Date.UTC(2026, 6, 15, 10) / 1000);
    expect(parisToUnix('n’importe quoi')).toBeNull();
  });
});

describe('rejets', () => {
  const st = (attrs: string, prix = '<prix nom="E10" id="5" maj="2026-11-06 01:00:00" valeur="1.9"/>') =>
    `<pdv id="1000001" ${attrs} pop="R"><adresse>a</adresse><ville>v</ville>${prix}</pdv>`;
  const ok = 'latitude="4800000" longitude="200000" cp="75001"';
  it('garde une station valide', () => expect(parseFeed(wrap(st(ok))).stations).toHaveLength(1));
  it('écarte les prix aberrants', () => {
    const r = parseFeed(wrap(st(ok, '<prix nom="E10" id="5" maj="2026-11-06 01:00:00" valeur="19.9"/><prix nom="Gazole" id="1" maj="2026-11-06 01:00:00" valeur="1.8"/>')));
    expect(r.rejectedPrices).toBe(1);
    expect(r.stations[0].prices.E10).toBeUndefined();
    expect(r.stations[0].prices.Gazole![0]).toBe(1.8);
  });
  it('écarte coordonnées nulles, outre-mer (cp 97/98) et hors boîte', () => {
    expect(parseFeed(wrap(st('latitude="0" longitude="0" cp="75001"'))).stations).toHaveLength(0);
    expect(parseFeed(wrap(st('latitude="4800000" longitude="200000" cp="97400"'))).stations).toHaveLength(0);
    expect(parseFeed(wrap(st('latitude="-2100000" longitude="5500000" cp="75001"'))).stations).toHaveLength(0);
  });
  it('écarte une station sans aucun prix valide', () => {
    expect(parseFeed(wrap(st(ok, ''))).stations).toHaveLength(0);
  });
  it('accepte la Corse', () => {
    expect(parseFeed(wrap(st('latitude="4195000" longitude="885000" cp="20000"'))).stations).toHaveLength(1);
  });
});
