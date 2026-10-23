import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GOLF_2018_IDS } from '@vscar/fixtures';
import type { CuratedVehicleDetail } from '@vscar/db';
import { SpecValue } from '@vscar/vehicle-schema';
import { selectorLabels } from '../src/components/catalog/labels.ts';
import { configurationText } from '../src/components/catalog/VehiclePicker.tsx';
import type { VehicleOption } from '../src/domain/catalog.ts';
import { registrationYears, representative, resolveSelection, yearAllowed, type ResolutionCandidate, type TechnicalConfiguration } from '../src/domain/model-selection.ts';
import { discoveryEntry, type DiscoveryEntry } from '../src/server/catalog-discovery.ts';
import { createVehicleCatalogService } from '../src/server/catalog-service.ts';
import en from '../messages/en.json' with { type: 'json' };
import es from '../messages/es.json' with { type: 'json' };
import { memoryCatalog, memoryCatalogReader } from './support/catalog.ts';

/** Step D1.8 (ADR-020) — selección Marca → Modelo → Año, resolución técnica interna y descubrimiento. */

const opt = (slug: string, over: Partial<VehicleOption> = {}): VehicleOption => ({ id: `id-${slug}`, slug, brand: 'Volkswagen', model: 'Golf', variant: 'Advance 1.5 TSI 130', year: 2018, powertrainType: 'ICE', bodyType: 'hatchback', ...over });
const cand = (slug: string, over: Partial<ResolutionCandidate> = {}, o: Partial<VehicleOption> = {}): ResolutionCandidate => ({
  option: opt(slug, o),
  fuel: 'petrol',
  transmission: 'manual',
  drivetrain: 'FWD',
  homologationCycle: 'WLTP',
  identityConfidence: 'EXACT',
  homologationFrom: '2018-01-01',
  facts: { 'perf.power_max_kw': [{ cycle: null, min: 96, max: 96 }] },
  ...over,
});
const TECH: TechnicalConfiguration = { powertrainType: 'HEV', fuel: 'petrol', reasons: ['GENERATION_NOT_VERIFIED', 'MODEL_YEAR_NOT_VERIFIED', 'TRIM_NOT_CONFIRMED', 'NOT_PROMOTED'] };

describe('technical resolution (pure)', () => {
  it('one configuration → AUTO_RESOLVED to that exact ReferenceVariant', () => {
    const r = resolveSelection([cand('a')]);
    expect(r.status).toBe('AUTO_RESOLVED');
    expect(r.configurations).toHaveLength(1);
    expect(r.configurations[0]!.option!.slug).toBe('a');
  });

  it('NEDC + WLTP homologations of the same configuration → ONE option (EQUIVALENT_GROUP), compared on the WLTP member, without the cycle label', () => {
    const nedc = cand('h33', { homologationCycle: 'NEDC', facts: { 'perf.power_max_kw': [{ cycle: null, min: 96, max: 96 }], 'nrg.fuel_combined_l100': [{ cycle: 'NEDC', min: 4.8, max: 4.8 }] } }, { cycle: 'NEDC' });
    const wltp = cand('h35', { facts: { 'perf.power_max_kw': [{ cycle: null, min: 96, max: 96 }], 'nrg.fuel_combined_l100': [{ cycle: 'WLTP', min: 5.9, max: 5.9 }] } }, { cycle: 'WLTP' });
    for (const order of [[nedc, wltp], [wltp, nedc]]) {
      const r = resolveSelection(order);
      expect(r.status).toBe('EQUIVALENT_GROUP');
      expect(r.configurations).toHaveLength(1);
      expect(r.configurations[0]!.option!.slug).toBe('h35');
      expect(r.configurations[0]!.option!.cycle).toBeUndefined();
      expect(r.configurations[0]!.cycles).toEqual(['NEDC', 'WLTP']);
      expect(r.configurations[0]!.members).toBe(2);
    }
  });

  it('never chosen by value: the NEDC member with LOWER consumption is not picked; changing values never changes the representative', () => {
    const nedc = cand('h33', { homologationCycle: 'NEDC', facts: { 'nrg.fuel_combined_l100': [{ cycle: 'NEDC', min: 3, max: 3 }] } });
    const wltp = cand('h35', { facts: { 'nrg.fuel_combined_l100': [{ cycle: 'WLTP', min: 9, max: 9 }] } });
    expect(representative([nedc, wltp]).option.slug).toBe('h35');
    const a = cand('x', { homologationFrom: '2021-01-01', facts: { 'perf.power_max_kw': [{ cycle: null, min: 239, max: 239 }] } });
    const b = cand('y', { homologationFrom: '2021-08-01', facts: { 'perf.power_max_kw': [{ cycle: null, min: 239, max: 239 }] } });
    const pick = representative([a, b]).option.slug;
    for (const v of [100, 239, 500]) {
      const a2 = { ...a, facts: { 'perf.power_max_kw': [{ cycle: null, min: v, max: v }] } };
      const b2 = { ...b, facts: { 'perf.power_max_kw': [{ cycle: null, min: v, max: v }] } };
      expect(representative([b2, a2]).option.slug).toBe(pick);
    }
  });

  it('different engines (power) or fuels → NEEDS_CONFIGURATION with both real options, never one of them', () => {
    const petrol = cand('petrol-130', { facts: { 'perf.power_max_kw': [{ cycle: null, min: 96, max: 96 }] } }, { variant: '1.5 TSI 130' });
    const diesel = cand('diesel-150', { fuel: 'diesel', facts: { 'perf.power_max_kw': [{ cycle: null, min: 110, max: 110 }] } }, { variant: '2.0 TDI 150' });
    const r = resolveSelection([petrol, diesel]);
    expect(r.status).toBe('NEEDS_CONFIGURATION');
    expect(r.configurations.map((c) => c.option!.slug).sort()).toEqual(['diesel-150', 'petrol-130']);
    // Mismo nombre y firma pero potencias distintas en el mismo dato: tampoco se fusionan.
    const p1 = cand('p1', { facts: { 'perf.power_max_kw': [{ cycle: null, min: 96, max: 96 }] } });
    const p2 = cand('p2', { facts: { 'perf.power_max_kw': [{ cycle: null, min: 110, max: 110 }] } });
    expect(resolveSelection([p1, p2]).status).toBe('NEEDS_CONFIGURATION');
  });

  it('same configuration but contradictory WLTP values → two options (never averaged)', () => {
    const a = cand('a', { facts: { 'nrg.fuel_combined_l100': [{ cycle: 'WLTP', min: 5.2, max: 5.2 }] } });
    const b = cand('b', { facts: { 'nrg.fuel_combined_l100': [{ cycle: 'WLTP', min: 6.1, max: 6.1 }] } });
    const r = resolveSelection([a, b]);
    expect(r.status).toBe('NEEDS_CONFIGURATION');
    expect(r.configurations).toHaveLength(2);
  });

  it('only technical homologations (or nothing) → UNRESOLVED: information only, no option to compare, duplicates merged', () => {
    const r = resolveSelection([], [TECH, TECH, { ...TECH, powertrainType: 'ICE', powerKw: { min: 96, max: 96 } }]);
    expect(r.status).toBe('UNRESOLVED');
    expect(r.configurations.map((c) => [c.powertrainType, c.members, c.availability])).toEqual([
      ['HEV', 2, 'NOT_COMPARABLE'],
      ['ICE', 1, 'NOT_COMPARABLE'],
    ]);
    expect(r.configurations.every((c) => c.option === undefined)).toBe(true);
    expect(resolveSelection([], [])).toEqual({ status: 'UNRESOLVED', configurations: [], technicalOnly: 0 });
  });
});

describe('year rules', () => {
  it('model year at most current+1 (manufacturer MY); observed registration never in the future', () => {
    expect(yearAllowed(2027, 'MODEL_YEAR', 2026)).toBe(true);
    expect(yearAllowed(2028, 'MODEL_YEAR', 2026)).toBe(false);
    expect(yearAllowed(2026, 'REGISTRATION_OBSERVED', 2026)).toBe(true);
    expect(yearAllowed(2027, 'REGISTRATION_OBSERVED', 2026)).toBe(false);
    expect(registrationYears(2022, 2024, 2026)).toEqual([2022, 2023, 2024]);
    expect(registrationYears(2025, 2028, 2026)).toEqual([2025, 2026]);
    expect(registrationYears(null, null, 2026)).toEqual([]);
  });
});

/** Homologación curada sintética mínima para `discoveryEntry` (sin MySQL). */
function curated(over: { brand?: string; model?: string; product_class?: string; first?: number; last?: number; commercial?: 'UNCONFIRMED' | 'PARTIAL' | 'EXACT'; power?: { key: string; basis: string; value: number } } = {}): CuratedVehicleDetail {
  const id = '55555555-5555-5555-8555-555555555555';
  const p = over.power;
  return {
    vehicle: {
      id,
      market_code: 'ES',
      technical_key: 'E9*2007/46*0001*01|A|B',
      brand: over.brand ?? 'Toyota',
      model: over.model ?? 'Corolla',
      technical_identity: { type_approval_number: 'E9*2007/46*0001*01', variant_code: 'A', version_code: 'B', confidence: 'EXACT' },
      homologation_powertrain: 'NOVC_HEV',
      product_class: (over.product_class ?? 'HEV_OR_MHEV') as CuratedVehicleDetail['vehicle']['product_class'],
      fuel_type: 'petrol',
      registration_period: { first_observed_year: over.first ?? 2022, last_observed_year: over.last ?? 2022 },
      commercial_identity_status: over.commercial ?? 'UNCONFIRMED',
      curation_status: 'CURATED',
      source_codes: ['S01'],
      blockers: [],
    },
    attributes: [{ id: '66666666-6666-5666-8666-666666666666', vehicle_id: id, kind: 'TECHNICAL', attribute: 'transmission', value: 'automatic', status: 'OBSERVED', source_code: 'S13', source_record: 'S13:x', retrieved_at: '2026-10-16', rights_status: 'PENDING', evidence: 'x' }],
    observations: p
      ? [
          {
            value: SpecValue.parse({ id: '77777777-7777-5777-8777-777777777777', variant_id: id, spec_key: p.key, value: p.value, unit: 'kW', source_id: '00000000-0000-4000-8000-00000000c001', source_url: 'https://discodata.eea.europa.eu/', source_market: 'ES', reference_market: 'ES', source_authority: 'OFFICIAL_AUTHORITY', mapping_confidence: 'EXACT', homologation_match: 'NOT_APPLICABLE', retrieved_at: '2026-10-16', measurement_basis: { power_basis: p.basis } }),
            source_code: 'S01',
            source_record: 'S01:x',
            identity_match: 'EXACT_TAN_VA_VE',
            rights_status: 'CONDITIONAL',
            quality_status: 'USABLE',
            quality_reasons: [],
            conflict_status: 'NONE',
          },
        ]
      : [],
    sources: [],
  } as CuratedVehicleDetail;
}

describe('discovery from curated homologations (aggregate only)', () => {
  it('only brand, model, observed registration years and a configuration summary reach the client — no ids, TAN, values or rights', () => {
    const e = discoveryEntry(curated(), 2026)!;
    expect(Object.keys(e).sort()).toEqual(['brand', 'config', 'model', 'years']);
    expect(e.years).toEqual([2022]);
    const json = JSON.stringify(e);
    for (const leak of ['555555', 'E9*', 'technical_key', 'source', 'rights', 'S01', 'S13']) expect(json).not.toContain(leak);
    expect(e.config.reasons).toEqual(['COMMERCIAL_IDENTITY_UNCONFIRMED', 'GENERATION_NOT_VERIFIED', 'MODEL_YEAR_NOT_VERIFIED', 'TRIM_NOT_CONFIRMED', 'NOT_PROMOTED']);
  });

  it('power only when it means the same to the user: ICE engine power yes; HEV/PHEV combustion-only power never shown as system power', () => {
    expect(discoveryEntry(curated({ product_class: 'ICE_OR_MHEV', power: { key: 'perf.power_max_kw', basis: 'ICE_ONLY', value: 96 } }), 2026)!.config.powerKw).toEqual({ min: 96, max: 96 });
    expect(discoveryEntry(curated({ product_class: 'HEV_OR_MHEV', power: { key: 'perf.power_max_kw', basis: 'ICE_ONLY', value: 72 } }), 2026)!.config.powerKw).toBeUndefined();
    expect(discoveryEntry(curated({ product_class: 'PHEV', power: { key: 'perf.power_max_kw', basis: 'ICE_ONLY', value: 72 } }), 2026)!.config.powerKw).toBeUndefined();
  });

  it('registration years are clamped to the present and never become a model year', () => {
    const e = discoveryEntry(curated({ first: 2025, last: 2030 }), 2026)!;
    expect(e.years).toEqual([2025, 2026]);
    expect(e.config.reasons).toContain('MODEL_YEAR_NOT_VERIFIED');
  });
});

describe('catalog service with discovery (Dataset Core + synthetic technical entries)', () => {
  const entries: DiscoveryEntry[] = [
    { brand: 'Toyota', model: 'Corolla', years: [2022, 2023], config: TECH },
    { brand: 'Toyota', model: 'Corolla', years: [2022], config: TECH },
    // Grafía distinta del mismo modelo seleccionable: se normaliza, no duplica marca ni modelo.
    { brand: 'VOLKSWAGEN', model: 'golf ', years: [2024], config: { ...TECH, powertrainType: 'ICE', powerKw: { min: 180, max: 180 } } },
  ];
  const service = (channel: 'PUBLIC' | 'PREVIEW', discovery: () => Promise<readonly DiscoveryEntry[]> = async () => entries) => createVehicleCatalogService({ reader: () => memoryCatalogReader(), channel, discovery, now: () => Date.parse('2026-10-22T12:00:00Z') });

  it('PREVIEW: brands and models from the catalog AND the technical layer, normalized, each with its availability', async () => {
    const c = service('PREVIEW');
    const brands = await c.listBrands('ES');
    expect(brands.map((b) => [b.brand, b.models, b.availability])).toEqual([
      ['BMW', 1, 'COMPARISON_ELIGIBLE'],
      ['BYD', 1, 'COMPARISON_ELIGIBLE'],
      ['SEAT', 1, 'COMPARISON_ELIGIBLE'],
      ['Tesla', 1, 'COMPARISON_ELIGIBLE'],
      ['Toyota', 1, 'CATALOG_DISCOVERABLE'],
      ['Volkswagen', 1, 'COMPARISON_ELIGIBLE'],
    ]);
    const [corolla] = await c.listModels('ES', 'Toyota');
    expect(corolla).toMatchObject({ model: 'Corolla', availability: 'CATALOG_DISCOVERABLE', years: [2023, 2022], generations: [] });
    const golfYears = await c.listModelYears('ES', 'Volkswagen', 'Golf');
    expect(golfYears.map((y) => [y.year, y.basis, y.availability])).toEqual([
      [2027, ['MODEL_YEAR'], 'COMPARISON_ELIGIBLE'],
      [2024, ['REGISTRATION_OBSERVED'], 'CATALOG_DISCOVERABLE'],
      [2018, ['MODEL_YEAR'], 'COMPARISON_ELIGIBLE'],
    ]);
  });

  it('PUBLIC: the technical layer is never consulted (gate unchanged)', async () => {
    let called = false;
    const c = service('PUBLIC', async () => ((called = true), entries));
    await c.listBrands('ES');
    await c.listConfigurations('ES', 'Toyota', 'Corolla', 2022);
    expect(called).toBe(false);
    expect(await memoryCatalog('PUBLIC').listBrands('ES')).toEqual(await c.listBrands('ES'));
  });

  it('a technical-layer failure never breaks the selector', async () => {
    const c = service('PREVIEW', () => Promise.reject(new Error('db down')));
    expect((await c.listBrands('ES')).length).toBe(5);
  });

  it('Golf 2018 → one option (WLTP member h35), Corolla 2022 → UNRESOLVED information, Model 3 2021 → clarification', async () => {
    const c = service('PREVIEW');
    const golf = await c.listConfigurations('ES', 'Volkswagen', 'Golf', 2018);
    expect(golf.status).toBe('EQUIVALENT_GROUP');
    expect(golf.configurations.map((x) => x.option?.id)).toEqual([GOLF_2018_IDS.rvB]);
    const corolla = await c.listConfigurations('ES', 'Toyota', 'Corolla', 2022);
    expect(corolla.status).toBe('UNRESOLVED');
    expect(corolla.configurations).toHaveLength(1);
    expect(corolla.configurations[0]!.members).toBe(2);
    const m3 = await c.listConfigurations('ES', 'Tesla', 'Model 3', 2021);
    expect(m3.status).toBe('NEEDS_CONFIGURATION');
    expect(m3.configurations.map((x) => x.members).sort()).toEqual([1, 2]);
  });

  it('direct search shows one option per equivalent group (no two "Golf 2018" cards that only differ by NEDC/WLTP)', async () => {
    const r = await service('PREVIEW').searchVehicles('ES', 'golf');
    const golf2018 = r.results.filter((o) => o.year === 2018);
    expect(golf2018.map((o) => o.id)).toEqual([GOLF_2018_IDS.rvB]);
    expect(golf2018[0]!.cycle).toBeUndefined();
  });
});

describe('selector UI contract', () => {
  const SRC = join(import.meta.dirname, '..', 'src', 'components', 'catalog', 'VehiclePicker.tsx');
  const src = readFileSync(SRC, 'utf8');

  it('three main steps (brand, model, year); the mandatory version step is gone', () => {
    expect(src).toMatch(/const STEPS = \['brand', 'model', 'year'\] as const;/);
    expect(src).not.toMatch(/step-version|'version'\]/);
    expect(src).toContain('{stepIndex} / 3');
  });

  it('every new selector text exists in ES and EN', () => {
    const keys = ['configurationQuestion', 'dontKnow', 'dontKnowNote', 'unavailableTitle', 'insufficientData', 'trimNotConfirmed', 'comparisonUnavailable', 'technicalOnly', 'powertrainLabel', 'brand', 'model', 'year'];
    for (const m of [es, en]) for (const k of keys) expect((m as { catalog: { picker: Record<string, unknown> } }).catalog.picker[k], k).toBeTruthy();
    expect(es.catalog.picker.powertrainLabel).toBe('Motorización');
    expect(en.catalog.picker.comparisonUnavailable).toBe('Comparison unavailable');
  });

  it('configuration text uses understandable facts only (no TAN, no cycle names)', () => {
    const t = (k: string, v?: Record<string, unknown>) => {
      const path = k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown>)?.[p], es);
      return typeof path === 'string' ? path.replace('{count, plural, one {# modelo} other {# modelos}}', `${v?.count ?? ''} modelos`) : k;
    };
    t.raw = (k: string) => k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown>)?.[p], es);
    const labels = selectorLabels({ t: t as never, locale: { formatLocale: 'es-ES' } as never });
    const text = configurationText({ key: 'x', availability: 'COMPARISON_ELIGIBLE', powertrainType: 'ICE', fuel: 'diesel', transmission: 'manual', powerKw: { min: 110, max: 110 }, members: 2, cycles: ['NEDC', 'WLTP'] }, labels);
    expect(text).toContain('Diésel');
    expect(text).toContain('110 kW');
    expect(text).not.toMatch(/NEDC|WLTP|E\d+\*/);
    // Números con el formato del idioma (110,1 kW en español, nunca 110.1).
    expect(configurationText({ key: 'y', availability: 'NOT_COMPARABLE', powertrainType: 'ICE', powerKw: { min: 110.1, max: 110.1 }, members: 1, cycles: [] }, labels)).toContain('110,1 kW');
  });
});

describe('equivalence confirmed by the real engines (Economic Fit unchanged)', async () => {
  const { pairSlug } = await import('../src/domain/catalog.ts');
  const { DEFAULT_SCENARIO } = await import('../src/domain/scenario.ts');
  const { serverDecisionView } = await import('../src/server/server-decision.ts');
  const { comparisonData } = await import('./support/catalog.ts');
  const BYD = 'byd-seal-2026-design-rwd-82-5-kwh';
  const econ = async (slug: string) => serverDecisionView(await comparisonData(pairSlug(slug, BYD), memoryCatalog()), DEFAULT_SCENARIO).view.economics;

  it('E6R and E6CR (one option in the selector) give the same running cost against the same rival', async () => {
    const [r, cr] = await Promise.all([econ('tesla-model-3-2021-standard-range-plus-e6r'), econ('tesla-model-3-2021-standard-range-plus-e6cr')]);
    expect(cr.perSide.a.annual).toEqual(r.perSide.a.annual);
    expect(cr.status).toBe(r.status);
  });

  it('Golf 2018 *33/*35: neither has consumption data, so Economy stays unavailable whichever homologation is compared; PHEV without charge-sustaining stays unavailable', async () => {
    for (const s of ['volkswagen-golf-2018-advance-1-5-tsi-130-h33', 'volkswagen-golf-2018-advance-1-5-tsi-130-h35', 'seat-leon-2026-style-e-hybrid-204']) {
      const e = await econ(s);
      expect(e.perSide.a.annual, s).toBeUndefined();
    }
  });
});
