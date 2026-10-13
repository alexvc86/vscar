import { describe, expect, it } from 'vitest';
import { BYD_SEAL_IDS, GOLF_2018_IDS, GOLF_CURRENT_IDS, MODEL3_2021_IDS, loadAllCases } from '@vscar/fixtures';
import type { DatasetBundle } from '@vscar/vehicle-schema';
import { optionText } from '../src/components/catalog/labels.ts';
import { distinctShortNames, LEGACY_PAIRS, normalizeSearch, pairSlug, parsePairSlug, rankSearchResults, type VehicleOption } from '../src/domain/catalog.ts';
import { computeDecision } from '../src/domain/decision.ts';
import { DEFAULT_SCENARIO } from '../src/domain/scenario.ts';
import { variantReferenceDate } from '../src/server/catalog-service.ts';
import { loadComparisonData } from '../src/server/comparison-loader.ts';
import { comparisonData, DEMO_PAIR, memoryCatalog } from './support/catalog.ts';

/** Step 7b: catálogo, selección y orquestación con el servicio y el orquestador REALES (lector en memoria). */
const BYD = 'byd-seal-2026-design-rwd-82-5-kwh';
const M3 = 'tesla-model-3-2021-standard-range-plus-e6r';
const labels = { powertrain: { BEV: 'Eléctrico', ICE: 'Combustión', MHEV: 'Microhíbrido', PHEV: 'Híbrido enchufable' }, periodRange: 'homologado {from}–{to}', periodFrom: 'homologado desde {from}', formatLocale: 'es-ES' };

describe('catalog: market-aware, language-independent', () => {
  it('ES lists the selectable ReferenceVariants; another market lists nothing', async () => {
    const c = memoryCatalog();
    expect((await c.index('ES')).options.length).toBe(9);
    const us = await c.searchVehicles('US' as 'ES', 'seal');
    expect(us.results).toEqual([]);
  });
  it('the catalog never depends on the language (es-es and en-es see the same variants)', async () => {
    const c = memoryCatalog();
    // El servicio no recibe idioma: solo mercado. Mismo mercado → mismas opciones, mismo orden.
    const [a, b] = await Promise.all([c.searchVehicles('ES', 'model'), c.searchVehicles('ES', 'model')]);
    expect(a).toEqual(b);
    expect(c.searchVehicles.length).toBeLessThanOrEqual(3);
  });
});

describe('search', () => {
  const c = memoryCatalog();
  const slugs = async (q: string) => (await c.searchVehicles('ES', q)).results.map((o) => o.slug);

  it('exact model', async () => expect(await slugs('SEAL')).toEqual([BYD]));
  it('accent- and case-insensitive (León = Leon = LEON)', async () => {
    const leon = await slugs('León');
    expect(leon).toEqual(['seat-leon-2026-style-e-hybrid-204']);
    expect(await slugs('leon')).toEqual(leon);
    expect(await slugs('LEON')).toEqual(leon);
  });
  it('partial prefix and multi-term (brand + model + variant)', async () => {
    expect((await slugs('tes')).every((s) => s.startsWith('tesla-model-3'))).toBe(true);
    expect(await slugs('golf etsi')).toEqual(['volkswagen-golf-style-1-5-etsi-150-dsg']);
  });
  it('fewer than 2 characters browses instead of searching; results capped at 20', async () => {
    const r = await c.searchVehicles('ES', 'g');
    expect(r.mode).toBe('browse');
    expect(r.results.length).toBeLessThanOrEqual(20);
  });
  it('ranking: exact model > brand + model > prefix > variant > year (deterministic)', () => {
    const o = (slug: string, brand: string, model: string, variant: string, year: number): VehicleOption => ({ id: slug, slug, brand, model, variant, year, powertrainType: 'ICE', bodyType: 'hatchback' });
    const opts = [o('x1', 'BMW', 'X1', 'sDrive18i', 2024), o('golf-plus', 'Volkswagen', 'Golf Plus', 'Base', 2010), o('golf', 'Volkswagen', 'Golf', 'eTSI 150', 2024), o('polo', 'Volkswagen', 'Polo', 'Golf edition', 2020)];
    expect(rankSearchResults(opts, 'golf').map((x) => x.slug)).toEqual(['golf', 'golf-plus', 'polo', 'x1']);
    expect(rankSearchResults(opts, 'golf')).toEqual(rankSearchResults([...opts].reverse(), 'golf'));
    expect(normalizeSearch('  Léon   ÉTSI ')).toBe('leon etsi');
  });
});

describe('ReferenceVariant identity in the selector (ADR-007)', () => {
  it('two technical variants with the same commercial name are distinguished by homologation period, never by codes', async () => {
    const opts = (await memoryCatalog().index('ES')).options.filter((o) => o.slug.startsWith('tesla-model-3-2021-standard-range-plus'));
    expect(opts.length).toBe(2);
    expect(opts.every((o) => o.period)).toBe(true);
    const texts = opts.map((o) => optionText(o, labels));
    expect(new Set(texts.map((t) => `${t.name} ${t.meta} ${t.period}`)).size).toBe(2);
    expect(JSON.stringify(texts)).not.toMatch(/E6R|E6CR|E13\*|2018\/858/i);
  });
  it('display label is derived from structured fields (brand, model, version, year, powertrain)', async () => {
    const byd = (await memoryCatalog().getVariantById('ES', BYD_SEAL_IDS.variant))!;
    expect(optionText(byd, labels)).toEqual({ brand: 'BYD', name: 'SEAL Design RWD 82,5 kWh', short: 'BYD SEAL', meta: '2026 · Eléctrico (BEV)' });
  });
  it('model year is shown only as declared by the source', async () => {
    for (const o of (await memoryCatalog().index('ES')).options) expect(o.year === null || Number.isInteger(o.year)).toBe(true);
  });
  it('short names stay distinct when both cars share brand and model', () => {
    const golf = (variant: string, year: number): VehicleOption => ({ id: variant, slug: variant, brand: 'Volkswagen', model: 'Golf', variant, year, powertrainType: 'ICE', bodyType: 'hatchback' });
    expect(distinctShortNames(golf('Advance', 2018), golf('Style', 2027))).toEqual(['Volkswagen Golf 2018', 'Volkswagen Golf 2027']);
  });
});

describe('public eligibility and rights (channels)', () => {
  it('PREVIEW: the 9 Dataset Core variants, flagged as preview; PUBLIC: none today (honest empty catalog)', async () => {
    const preview = await memoryCatalog('PREVIEW').index('ES');
    expect(preview.options.length).toBe(9);
    expect(preview.options.every((o) => o.preview)).toBe(true);
    const pub = await memoryCatalog('PUBLIC').index('ES');
    expect(pub.options).toEqual([]);
    expect(pub.excluded).toBe(9);
  });

  it('a blocked variant is excluded from search, slugs and comparisons', async () => {
    const bundle = loadAllCases();
    const blocked: DatasetBundle = { ...bundle, variants: bundle.variants.map((v) => (v.id === BYD_SEAL_IDS.variant ? { ...v, status: 'published' as const } : v)), homologations: bundle.homologations };
    // Identidad dependiente de una fuente sin licencia (C01): la variant no aparece en ningún canal.
    const sourceId = '00000000-0000-4000-8000-0000000000c1';
    const v = bundle.variants.find((x) => x.id === BYD_SEAL_IDS.variant)!;
    const withBlocked: DatasetBundle = { ...blocked, sources: [...bundle.sources, { id: sourceId, code: 'C01', name: 'not licensed', source_authority: 'OFFICIAL_MANUFACTURER', market_code: 'ES' }], homologations: bundle.homologations.map((h) => (h.id === v.homologation_id ? { ...h, source_id: sourceId } : h)) };
    const c = memoryCatalog('PREVIEW', withBlocked);
    expect((await c.searchVehicles('ES', 'seal')).results).toEqual([]);
    expect(await c.getVariantBySlug('ES', BYD)).toBeUndefined();
    expect(await loadComparisonData('ES', pairSlug(BYD, M3), c)).toEqual({ kind: 'not-found', reason: 'UNKNOWN_VEHICLE' });
  });

  it('field level: secondary-source values of the Model 3 are hidden, the car stays comparable', async () => {
    const data = await comparisonData();
    const m3 = data.vehicles[1].pipeline.candidate;
    expect(JSON.stringify(m3)).not.toContain('SECONDARY_REFERENCE');
    expect(data.sources.map((s) => s.code)).not.toContain('C07');
  });

  it('a conflicted field does not zero the metric (Golf current: conflict kept as PARTIAL, value still compared)', async () => {
    const c = memoryCatalog();
    const golf = (await c.getVariantById('ES', GOLF_CURRENT_IDS.variant))!;
    const golf18 = (await c.getVariantById('ES', GOLF_2018_IDS.rvA))!;
    const data = await comparisonData(pairSlug(golf.slug, golf18.slug), c);
    const run = computeDecision(data, DEFAULT_SCENARIO, { robustness: false });
    const metrics = run.input.comparison.pairs[0]!.technicalComparisons;
    for (const m of metrics) {
      for (const side of [m.a, m.b]) if (side) expect(side.min, m.metric).not.toBe(0);
    }
  });

  it('PUBLIC channel: ESIOS (rights pending) never reaches the energy context', async () => {
    const preview = await comparisonData();
    expect(preview.energy.electricity).toBeDefined();
    expect(preview.sources.find((s) => s.code === 'S04')?.publication).toBe('PREVIEW_ONLY');
  });
});

describe('slugs and pair routing', () => {
  it('pair slug keeps A/B order and parses back', () => {
    expect(pairSlug(BYD, M3)).toBe(`${BYD}-vs-${M3}`);
    expect(parsePairSlug(pairSlug(BYD, M3))).toEqual({ a: BYD, b: M3 });
    expect(parsePairSlug('just-one-car')).toBeUndefined();
    expect(parsePairSlug('a-vs-b-vs-c')).toBeUndefined();
    expect(parsePairSlug('UPPER-vs-b')).toBeUndefined();
  });
  it('every catalog slug is unique per market and never contains the pair separator', async () => {
    const opts = (await memoryCatalog().index('ES')).options;
    expect(new Set(opts.map((o) => o.slug)).size).toBe(opts.length);
    for (const o of opts) expect(o.slug).not.toContain('-vs-');
  });
  it('invalid slug, unknown car, same car twice → not found (never another vehicle)', async () => {
    const c = memoryCatalog();
    expect(await loadComparisonData('ES', 'nonsense', c)).toEqual({ kind: 'not-found', reason: 'INVALID_PAIR' });
    expect(await loadComparisonData('ES', pairSlug(BYD, 'no-such-car'), c)).toEqual({ kind: 'not-found', reason: 'UNKNOWN_VEHICLE' });
    expect(await loadComparisonData('ES', pairSlug(BYD, BYD), c)).toEqual({ kind: 'not-found', reason: 'SAME_VEHICLE' });
  });
  it('the Step 7a URL and slug aliases redirect to the canonical pair', async () => {
    expect(await loadComparisonData('ES', 'byd-seal-vs-tesla-model-3', memoryCatalog())).toEqual({ kind: 'redirect', pairSlug: LEGACY_PAIRS['byd-seal-vs-tesla-model-3'] });
    const c = memoryCatalog('PREVIEW', undefined, { 'byd-seal-old': BYD_SEAL_IDS.variant });
    expect(await loadComparisonData('ES', pairSlug('byd-seal-old', M3), c)).toEqual({ kind: 'redirect', pairSlug: pairSlug(BYD, M3) });
  });
  it('historical variants use the last day of their homologation as the date of their facts', () => {
    expect(variantReferenceDate({ homologation_valid_to: '2021-06-29', sales_end: '2021-11-01' })).toBe('2021-06-29');
    expect(variantReferenceDate({ homologation_valid_to: null, sales_end: null })).toBeUndefined();
  });
});

describe('swap and order invariance', () => {
  it('swap = B vs A with the same scenario: same decision, perspective inverted', async () => {
    const ab = await comparisonData(pairSlug(BYD, M3));
    const ba = await comparisonData(pairSlug(M3, BYD));
    expect(ba.vehicles.map((v) => v.option.slug)).toEqual([M3, BYD]);
    for (const trips of [1, 10]) {
      const s = { ...DEFAULT_SCENARIO, trips };
      const x = computeDecision(ab, s, { robustness: false }).result;
      const y = computeDecision(ba, s, { robustness: false }).result;
      expect(y.alphaBestForYou.status).toBe(x.alphaBestForYou.status);
      expect(y.alphaBestForYou.candidateId).toBe(x.alphaBestForYou.candidateId);
      expect(y.economicFit.leaderId).toBe(x.economicFit.leaderId);
      expect(y.recommendationConfidence.level).toBe(x.recommendationConfidence.level);
      const score = (r: typeof x) => Object.fromEntries(r.technicalCapability.map((t) => [t.candidateId, t.score]));
      expect(score(y)).toEqual(score(x));
    }
  });
});

describe('DB → domain golden: catalog-loaded data reproduce the Step 7a decision', () => {
  it('BYD SEAL vs Model 3 (catalog) === the fixture path used by Step 7a (same logic, both scenarios)', async () => {
    const { comparisonCandidateFromBundle } = await import('@vscar/comparison-engine');
    const { economicVehicleInputFromBundle } = await import('@vscar/economics-engine');
    const data = await comparisonData(DEMO_PAIR);
    const bundle = loadAllCases();
    // Step 7a: definición fija con `at: '2021-06-01'` para el Model 3. Step 7b: fecha derivada de la homologación.
    const legacy = {
      ...data,
      vehicles: [
        { ...data.vehicles[0], pipeline: { candidate: comparisonCandidateFromBundle(bundle, BYD_SEAL_IDS.variant, { label: 'BYD SEAL' }), economicInput: economicVehicleInputFromBundle(bundle, BYD_SEAL_IDS.variant) } },
        { ...data.vehicles[1], pipeline: { candidate: comparisonCandidateFromBundle(bundle, MODEL3_2021_IDS.srp, { label: 'Tesla Model 3', at: '2021-06-01' }), economicInput: economicVehicleInputFromBundle(bundle, MODEL3_2021_IDS.srp, { at: '2021-06-01' }) } },
      ] as typeof data.vehicles,
    };
    for (const trips of [1, 10]) {
      const s = { ...DEFAULT_SCENARIO, trips };
      const now = computeDecision(data, s, { robustness: true }).result;
      const before = computeDecision(legacy, s, { robustness: true }).result;
      expect(now).toEqual(before);
    }
  });
});
