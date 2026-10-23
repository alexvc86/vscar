import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Step D1.8 — artefactos reproducibles (`docs/data/d18/`): navegación Marca → Modelo → Año generada desde la API real
 * contra `vscar_dev`, y revisión de promoción. Sin valores.
 */
const root = (p: string) => fileURLToPath(new URL(`../../../${p}`, import.meta.url));
const json = <T,>(p: string) => JSON.parse(readFileSync(root(p), 'utf8')) as T;

type Conf = { availability: string; members: number; cycles: string[]; comparesSlug?: string; reasons?: string[]; name?: string };
type Year = { year: number | null; basis: string[]; availability: string; resolution: string; technicalOnly: number; configurations: Conf[] };
type Nav = { channel: string; brands: { brand: string; availability: string; models: { model: string; availability: string; years: Year[] }[] }[]; summary: Record<string, unknown> };
const nav = json<Nav>('docs/data/d18/catalog-navigation.json');
const models = nav.brands.flatMap((b) => b.models.map((m) => ({ brand: b.brand, ...m })));
const yearOf = (brand: string, model: string, year: number) => models.find((m) => m.brand === brand && m.model === model)!.years.find((y) => y.year === year)!;

describe('D1.8 — brand & model catalogue from real records', () => {
  it('15 makes and 24 models from the 92 technical homologations; 16 / 25 navigable with the selectable catalogue (SEAT León)', () => {
    const technical = models.filter((m) => m.years.some((y) => y.basis.includes('REGISTRATION_OBSERVED')));
    expect(new Set(technical.map((m) => m.brand)).size).toBe(15);
    expect(technical.length).toBe(24);
    expect(nav.brands.length).toBe(16);
    expect(models.length).toBe(25);
    expect(nav.channel).toBe('PREVIEW');
  });

  it('no duplicated make or model after normalization (case, accents, spaces)', () => {
    const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    expect(new Set(nav.brands.map((b) => norm(b.brand))).size).toBe(nav.brands.length);
    expect(new Set(models.map((m) => `${norm(m.brand)}|${norm(m.model)}`)).size).toBe(models.length);
  });

  it('years come from evidence: model year only from the selectable catalogue, registration years never in the future, nothing beyond MY 2027', () => {
    for (const m of models) for (const y of m.years) {
      expect(y.year).not.toBeNull();
      if (y.basis.includes('REGISTRATION_OBSERVED') && !y.basis.includes('MODEL_YEAR')) expect(y.year!).toBeLessThanOrEqual(2026);
      expect(y.year!).toBeLessThanOrEqual(2027);
    }
    const golf2027 = yearOf('Volkswagen', 'Golf', 2027);
    expect(golf2027.basis).toEqual(['MODEL_YEAR']);
  });

  it('only the 9 selectable variants are comparable, as 7 options; every other model-year is information only', () => {
    const comparable = models.flatMap((m) => m.years.flatMap((y) => y.configurations.filter((c) => c.availability === 'COMPARISON_ELIGIBLE')));
    expect(comparable.length).toBe(7);
    expect(comparable.reduce((n, c) => n + c.members, 0)).toBe(9);
    for (const m of models) for (const y of m.years) {
      if (y.availability !== 'COMPARISON_ELIGIBLE') {
        expect(y.resolution).toBe('UNRESOLVED');
        expect(y.configurations.every((c) => !c.comparesSlug && c.reasons?.includes('NOT_PROMOTED'))).toBe(true);
      }
    }
  });

  it('Golf 2018: NEDC + WLTP homologations → one option compared on the WLTP member; Model 3 2021: real clarification', () => {
    const golf = yearOf('Volkswagen', 'Golf', 2018);
    expect(golf.resolution).toBe('EQUIVALENT_GROUP');
    const opts = golf.configurations.filter((c) => c.availability === 'COMPARISON_ELIGIBLE');
    expect(opts).toHaveLength(1);
    expect(opts[0]).toMatchObject({ members: 2, cycles: ['NEDC', 'WLTP'], comparesSlug: 'volkswagen-golf-2018-advance-1-5-tsi-130-h35' });
    const m3 = yearOf('Tesla', 'Model 3', 2021);
    expect(m3.resolution).toBe('NEEDS_CONFIGURATION');
    expect(m3.configurations.filter((c) => c.availability === 'COMPARISON_ELIGIBLE').map((c) => c.members).sort()).toEqual([1, 2]);
  });
});

describe('D1.8 — controlled promotion review (nothing promoted automatically)', () => {
  const r = json<{ candidates: number; promoted: number; blocked: Record<string, number>; review: { rank: number; decision: string; blockedBy: string[]; gates: Record<string, { pass: boolean }> }[] }>('docs/data/d18/promotion-review.json');

  it('the 9 review candidates are evaluated; 0 promoted because commercial identity (generation, model year, trim) has no source', () => {
    expect(r.review.map((x) => x.rank)).toEqual([5, 6, 7, 26, 27, 28, 48, 56, 81]);
    expect(r.promoted).toBe(0);
    expect(r.blocked).toEqual({ identity: 9, rights: 0, data: 0, conflicts: 0 });
    for (const x of r.review) {
      expect(x.decision).toBe('NOT_PROMOTED');
      expect(x.gates.TECHNICAL_IDENTITY!.pass && x.gates.QUALITY!.pass && x.gates.CATEGORY_ELIGIBILITY!.pass).toBe(true);
      expect(x.gates.CONFIGURATION_RESOLUTION!.pass).toBe(false);
    }
  });
});
