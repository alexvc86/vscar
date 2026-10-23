import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadAllCases } from '@vscar/fixtures';
import { Source, SpecValue, technicalKeyOf, type CuratedObservation } from '@vscar/vehicle-schema';
import { createCatalogReader, createCatalogRepository, createTechnicalCurationRepository, tables, type DbHandle, type TechnicalImportPlanItem } from '../src/index.ts';
import { freshTestDb } from './test-db.ts';

/**
 * Step D1.7 — ampliación por lotes contra MySQL real, con el mismo procedimiento que en `vscar_dev`:
 * - lotes secuenciales;
 * - reejecución sin cambios y omisión entre lotes;
 * - duplicado entre lotes rechazado;
 * - fallo a mitad de un lote y reanudación;
 * - conflictos conservados;
 * - catálogo seleccionable intacto y selector sin vehículos curados.
 * Requiere VSCAR_TEST_DATABASE_URL (`*_test`).
 */
const url = process.env.VSCAR_TEST_DATABASE_URL;
const EEA = Source.parse({ id: 'a0000000-0000-5000-8000-0000000000e1', code: 'S01', name: 'EEA (test)', source_authority: 'OFFICIAL_AUTHORITY', market_code: 'EU', base_url: 'https://discodata.eea.europa.eu/' });
const RDW = Source.parse({ id: 'a0000000-0000-5000-8000-0000000000e2', code: 'S11', name: 'RDW (test)', source_authority: 'OFFICIAL_AUTHORITY', market_code: 'NL', base_url: 'https://opendata.rdw.nl/' });
const hex = (n: number) => n.toString(16).padStart(12, '0');
const vid = (n: number) => `b1700000-0000-5000-8000-${hex(n)}`;

/** Vehículo con una masa EEA y otra RDW; `conflict` las marca IN_CONFLICT (como el Conflict Engine en D1.6). */
function vehicle(n: number, opts: { id?: string; conflict?: boolean } = {}): TechnicalImportPlanItem {
  const identity = { type_approval_number: `E9*2007/46*1700*${n}`, variant_code: `A${n}`, version_code: `V${n}`, confidence: 'EXACT' as const };
  const id = opts.id ?? vid(n);
  const key = technicalKeyOf(identity);
  const obs = (src: Source, k: number, mass: number): CuratedObservation => ({
    value: SpecValue.parse({ id: `c1700000-0000-5000-8000-${hex(n * 10 + k)}`, variant_id: id, spec_key: 'dim.mass_kg', value: mass, unit: 'kg', source_id: src.id, source_url: src.base_url, source_market: 'ES', reference_market: 'ES', source_authority: 'OFFICIAL_AUTHORITY', mapping_confidence: 'EXACT', homologation_match: 'NOT_APPLICABLE', retrieved_at: '2026-10-16', measurement_basis: { mass_definition: 'EU_RUNNING_ORDER' } }),
    source_code: src.code,
    source_record: `${src.code}:${key}`,
    identity_match: 'EXACT_TAN_VA_VE',
    rights_status: src.code === 'S01' ? 'CONDITIONAL' : 'PENDING',
    quality_status: opts.conflict ? 'NOT_USABLE' : 'USABLE',
    quality_reasons: opts.conflict ? ['conflict'] : [],
    conflict_status: opts.conflict ? 'IN_CONFLICT' : 'NONE',
    ...(opts.conflict ? { conflict_group: 'dim.mass_kg' } : {}),
  });
  return {
    vehicle: { id, market_code: 'ES', technical_key: key, brand: 'Expansion', model: `M${n}`, technical_identity: identity, homologation_powertrain: 'ICE', product_class: 'ICE_OR_MHEV', registration_period: { first_observed_year: 2020, last_observed_year: 2021 }, commercial_identity_status: 'UNCONFIRMED', curation_status: 'CURATED', source_codes: ['S01', 'S11'], d1_rank: n, blockers: ['generation not verified (no source)'] },
    attributes: [],
    observations: [obs(EEA, 1, 1300 + n), obs(RDW, 2, opts.conflict ? 1400 + n : 1300 + n)],
  };
}

describe.skipIf(!url)('technical catalogue expansion by batches (MySQL)', () => {
  let handle: DbHandle;
  let catalogBefore: string;
  const catalogFingerprint = async () => JSON.stringify(await Promise.all([tables.referenceVariants, tables.homologations, tables.specValues, tables.vehiclePrices, tables.safetyRatings].map((t) => handle.db.select().from(t))));
  const A = [1, 2, 3].map((n) => vehicle(n));
  const B = [4, 5].map((n) => vehicle(n)).concat(vehicle(6, { conflict: true }));
  const C = [7, 8, 9].map((n) => vehicle(n));

  beforeAll(async () => {
    handle = await freshTestDb(url!);
    await createCatalogRepository(handle.db).saveBundle(loadAllCases());
    catalogBefore = await catalogFingerprint();
    // Estado inicial "D1.6": un lote ya curado.
    await createTechnicalCurationRepository(handle.db).importBatch('first', [vehicle(100)], [EEA, RDW]);
  });
  afterAll(async () => handle?.close());

  it('A → B → C in sequence: each batch inserts only its own vehicles; totals add up', async () => {
    const repo = createTechnicalCurationRepository(handle.db);
    const totals: number[] = [];
    for (const [key, plan] of [['A', A], ['B', B], ['C', C]] as const) {
      const preview = await repo.planImport(plan);
      expect(preview.counts).toMatchObject({ insert: 3, skip: 0, update: 0, reject: 0 });
      const r = await repo.importBatch(`batch-${key}`, plan, [EEA, RDW]);
      expect(r).toMatchObject({ status: 'COMPLETED', counts: { inserted: 3, updated: 0, failed: 0 } });
      totals.push((await repo.counts()).vehicles);
    }
    expect(totals).toEqual([4, 7, 10]);
  });

  it('re-running every batch inserts and updates nothing (all skipped)', async () => {
    const repo = createTechnicalCurationRepository(handle.db);
    const before = await repo.counts();
    for (const [key, plan] of [['first', [vehicle(100)]], ['A', A], ['B', B], ['C', C]] as const) {
      const r = await repo.importBatch(key === 'first' ? 'first' : `batch-${key}`, plan, [EEA, RDW]);
      expect(r.counts).toMatchObject({ imported: 0, updated: 0, failed: 0, skippedUnchanged: plan.length });
    }
    expect(await repo.counts()).toEqual(before);
  });

  it('conflicting values survive the import untouched (both kept, NOT_USABLE, grouped)', async () => {
    const [d] = await createTechnicalCurationRepository(handle.db).loadVehicles([vid(6)]);
    expect(d!.observations.map((o) => [o.source_code, o.value.value, o.conflict_status, o.conflict_group, o.quality_status])).toEqual([
      ['S01', 1306, 'IN_CONFLICT', 'dim.mass_kg', 'NOT_USABLE'],
      ['S11', 1406, 'IN_CONFLICT', 'dim.mass_kg', 'NOT_USABLE'],
    ]);
  });

  it('a later batch cannot duplicate an identity curated by an earlier one (other id, same TAN|Va|Ve) nor overwrite it', async () => {
    const repo = createTechnicalCurationRepository(handle.db);
    const dupe = vehicle(2, { id: vid(902) });
    const preview = await repo.planImport([vehicle(10), dupe]);
    expect(preview.entries.map((e) => e.action)).toEqual(['INSERT', 'REJECT']);
    const r = await repo.importBatch('batch-D', [vehicle(10), dupe], [EEA, RDW]);
    expect(r).toMatchObject({ status: 'FAILED', counts: { inserted: 1, failed: 1 }, error: expect.stringMatching(/refusing to duplicate/) });
    // El mismo id con otro contenido tampoco se reescribe sin --allow-update.
    const changed = vehicle(3);
    changed.observations = changed.observations.map((o) => ({ ...o, value: { ...o.value, value: 9999 } }));
    const u = await repo.importBatch('batch-E', [changed], [EEA, RDW]);
    expect(u).toMatchObject({ status: 'FAILED', counts: { updated: 0, failed: 1 } });
    const [d] = await repo.loadVehicles([vid(3)]);
    expect(d!.observations.map((o) => o.value.value)).toEqual([1303, 1303]);
  });

  it('a failure in the middle of a batch is resumed by the next run without touching earlier batches', async () => {
    const repo = createTechnicalCurationRepository(handle.db);
    const plan = [11, 12, 13].map((n) => vehicle(n));
    const failed = await repo.importBatch('batch-F', plan, [EEA, RDW], { beforeItem: (_k, i) => (i === 2 ? Promise.reject(new Error('simulated crash')) : undefined) });
    expect(failed).toMatchObject({ status: 'FAILED', counts: { inserted: 2, failed: 1 } });
    const resumed = await repo.importBatch('batch-F', plan, [EEA, RDW]);
    expect(resumed).toMatchObject({ status: 'COMPLETED', counts: { inserted: 1, skippedUnchanged: 2 } });
    expect((await repo.counts()).vehicles).toBe(14);
  });

  it('the selectable catalogue is byte-identical and the selector never lists curated vehicles', async () => {
    expect(await catalogFingerprint()).toBe(catalogBefore);
    const reader = createCatalogReader(handle.db);
    const listed = await reader.listVariants('ES');
    expect(listed.length).toBe(loadAllCases().variants.filter((v) => v.market_code === 'ES').length);
    expect(listed.some((v) => String(v.manufacturer) === 'Expansion')).toBe(false);
    expect(await reader.searchVariantIds('ES', 'Expansion')).toEqual([]);
  });
});
