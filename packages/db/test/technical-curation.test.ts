import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadAllCases } from '@vscar/fixtures';
import { Source, SpecValue, technicalKeyOf, type CuratedAttribute, type CuratedObservation } from '@vscar/vehicle-schema';
import { eq } from 'drizzle-orm';
import type { RowDataPacket } from 'mysql2/promise';
import { ConcurrentImportError, DuplicateTechnicalIdentityError, createCatalogReader, createCatalogRepository, createDb, createTechnicalCurationRepository, tables, type DbHandle, type TechnicalImportPlanItem } from '../src/index.ts';
import { applyMigrations } from '../src/migrations.ts';
import { freshTestDb } from './test-db.ts';

/**
 * Step D1.6 — capa de curación técnica contra MySQL real: round-trip, idempotencia, fallo a mitad de lote,
 * reanudación, rechazo de duplicados y catálogo existente intacto. Requiere VSCAR_TEST_DATABASE_URL (`*_test`).
 */
const url = process.env.VSCAR_TEST_DATABASE_URL;

const SOURCE = Source.parse({ id: 'a0000000-0000-5000-8000-000000000001', code: 'S01', name: 'EEA (test)', source_authority: 'OFFICIAL_AUTHORITY', market_code: 'EU', base_url: 'https://discodata.eea.europa.eu/' });
const hex = (n: number, len = 12) => n.toString(16).padStart(len, '0');
const vid = (n: number) => `b0000000-0000-5000-8000-${hex(n)}`;

function item(n: number, mass = 1300): TechnicalImportPlanItem {
  const identity = { type_approval_number: `E1*2007/46*0623*${n}`, variant_code: `VA${n}`, version_code: `VE${n}`, confidence: 'EXACT' as const };
  const id = vid(n);
  const value = SpecValue.parse({ id: `c0000000-0000-5000-8000-${hex(n)}`, variant_id: id, spec_key: 'dim.mass_kg', value: mass, unit: 'kg', source_id: SOURCE.id, source_url: 'https://discodata.eea.europa.eu/', source_market: 'ES', reference_market: 'ES', source_authority: 'OFFICIAL_AUTHORITY', mapping_confidence: 'EXACT', homologation_match: 'NOT_APPLICABLE', retrieved_at: '2026-10-16', measurement_basis: { mass_definition: 'EU_RUNNING_ORDER' }, transformation: 'identity', transformation_version: 1 });
  const obs: CuratedObservation = { value, source_code: 'S01', source_record: `S01:test:${n}`, identity_match: 'EXACT_TAN_VA_VE', rights_status: 'CONDITIONAL', quality_status: 'USABLE', quality_reasons: [], conflict_status: 'NONE' };
  const attr: CuratedAttribute = { id: `d0000000-0000-5000-8000-${hex(n)}`, vehicle_id: id, kind: 'TECHNICAL', attribute: 'seats', value: '5', status: 'OBSERVED', source_code: 'S01', source_record: `S01:test:${n}`, retrieved_at: '2026-10-16', rights_status: 'CONDITIONAL', evidence: 'test' };
  return {
    vehicle: { id, market_code: 'ES', technical_key: technicalKeyOf(identity), brand: 'Test', model: `Model ${n}`, technical_identity: identity, homologation_powertrain: 'ICE', product_class: 'ICE_OR_MHEV', registration_period: { first_observed_year: 2018, last_observed_year: 2020 }, commercial_identity_status: 'UNCONFIRMED', curation_status: 'CURATED', source_codes: ['S01'], blockers: ['generation not verified (no source)'] },
    attributes: [attr],
    observations: [obs],
  };
}

/** Fila de vehículo tal como la escribe el repositorio (para probar las restricciones de MySQL directamente). */
const rowOf = (it: TechnicalImportPlanItem) => {
  const v = it.vehicle;
  return { id: v.id, market_code: v.market_code, technical_key: v.technical_key, brand: v.brand, model: v.model, type_approval_number: v.technical_identity.type_approval_number, variant_code: v.technical_identity.variant_code, version_code: v.technical_identity.version_code, identity_confidence: 'EXACT', homologation_powertrain: v.homologation_powertrain, product_class: v.product_class, commercial_identity_status: v.commercial_identity_status, curation_status: v.curation_status, source_codes: v.source_codes, blockers: v.blockers };
};

describe.skipIf(!url)('technical curation layer (MySQL)', () => {
  let handle: DbHandle;
  let catalogBefore: string;
  const fingerprint = async () => JSON.stringify(await Promise.all([handle.db.select().from(tables.referenceVariants), handle.db.select().from(tables.specValues), handle.db.select().from(tables.vehiclePrices)]).then((xs) => xs.map((rows) => [...rows].sort((a, b) => String(a.id).localeCompare(String(b.id))))));

  beforeAll(async () => {
    handle = await freshTestDb(url!);
    await createCatalogRepository(handle.db).saveBundle(loadAllCases());
    catalogBefore = await fingerprint();
  });
  afterAll(async () => handle?.close());

  it('round-trip: what is written is read back identically (validated with the domain schema)', async () => {
    const repo = createTechnicalCurationRepository(handle.db);
    const plan = [item(1)];
    const r = await repo.importBatch('rt', plan, [SOURCE]);
    expect(r.status).toBe('COMPLETED');
    const [d] = await repo.loadVehicles([vid(1)]);
    expect(d!.vehicle).toEqual(plan[0]!.vehicle);
    expect(d!.attributes).toEqual(plan[0]!.attributes);
    expect(d!.observations).toEqual(plan[0]!.observations);
    expect(d!.vehicle).not.toHaveProperty('model_year');
  });

  it('second run is idempotent: nothing rewritten, counts unchanged', async () => {
    const repo = createTechnicalCurationRepository(handle.db);
    const plan = [item(2), item(3)];
    await repo.importBatch('idem', plan, [SOURCE]);
    const before = await repo.counts();
    const again = await repo.importBatch('idem', plan, [SOURCE]);
    expect(again.counts).toMatchObject({ imported: 0, skippedUnchanged: 2, failed: 0 });
    expect(await repo.counts()).toEqual(before);
  });

  it('failure mid-batch keeps earlier vehicles, marks the run FAILED, and a rerun resumes', async () => {
    const repo = createTechnicalCurationRepository(handle.db);
    const plan = [item(4), item(5), item(6)];
    const failed = await repo.importBatch('resume', plan, [SOURCE], {
      beforeItem: (_k, i) => {
        if (i === 1) throw new Error('simulated crash');
      },
    });
    expect(failed.status).toBe('FAILED');
    expect(failed.counts).toMatchObject({ imported: 1, failed: 1 });
    expect((await repo.loadVehicles([vid(4), vid(5), vid(6)])).map((d) => d.vehicle.id)).toEqual([vid(4)]);
    const resumed = await repo.importBatch('resume', plan, [SOURCE]);
    expect(resumed.status).toBe('COMPLETED');
    expect(resumed.counts).toMatchObject({ imported: 2, skippedUnchanged: 1 });
  });

  it('a changed plan item is never overwritten silently: it fails without allowUpdates and nothing changes', async () => {
    const repo = createTechnicalCurationRepository(handle.db);
    const r = await repo.importBatch('idem', [item(2, 1310), item(3)], [SOURCE]);
    expect(r).toMatchObject({ status: 'FAILED', error: expect.stringMatching(/refusing to overwrite without allowUpdates/) });
    expect(r.counts).toMatchObject({ imported: 0, failed: 1 });
    const [d] = await repo.loadVehicles([vid(2)]);
    expect(d!.observations[0]!.value.value).toBe(1300);
  });

  it('with allowUpdates a changed item rewrites only that vehicle (no duplicates, old rows replaced) and is counted as updated', async () => {
    const repo = createTechnicalCurationRepository(handle.db);
    const r = await repo.importBatch('idem', [item(2, 1310), item(3)], [SOURCE], { allowUpdates: true });
    expect(r.counts).toMatchObject({ imported: 1, updated: 1, inserted: 0, skippedUnchanged: 1 });
    const [d] = await repo.loadVehicles([vid(2)]);
    expect(d!.observations).toHaveLength(1);
    expect(d!.observations[0]!.value.value).toBe(1310);
  });

  it('dry-run (planImport) classifies INSERT / SKIP / UPDATE / REJECT and writes nothing', async () => {
    const repo = createTechnicalCurationRepository(handle.db);
    const snapshot = async () => JSON.stringify(await Promise.all([tables.curatedTechnicalVehicles, tables.curatedAttributes, tables.curatedSpecValues, tables.curatedImportRuns, tables.curatedImportItems, tables.sources].map((tb) => handle.db.select().from(tb))));
    const [[migrationsBefore]] = await handle.pool.query<RowDataPacket[]>('SELECT COUNT(*) AS n FROM __drizzle_migrations');
    const before = await snapshot();
    const dup = item(1);
    const conflicting = item(40);
    conflicting.observations = conflicting.observations.map((o) => ({ ...o, conflict_status: 'IN_CONFLICT', conflict_group: 'dim.mass_kg' }));
    const preview = await repo.planImport([item(3), item(2, 1320), { ...dup, vehicle: { ...dup.vehicle, id: vid(98) }, attributes: [], observations: [] }, conflicting]);
    expect(preview.entries.map((e) => e.action)).toEqual(['SKIP', 'UPDATE', 'REJECT', 'INSERT']);
    expect(preview.counts).toMatchObject({ planned: 4, insert: 1, skip: 1, update: 1, reject: 1, withConflicts: 1, conflictingValues: 1 });
    expect(await snapshot()).toBe(before);
    const [[migrationsAfter]] = await handle.pool.query<RowDataPacket[]>('SELECT COUNT(*) AS n FROM __drizzle_migrations');
    expect(migrationsAfter!.n).toBe(migrationsBefore!.n);
  });

  it('an item already imported under another batch key is skipped (idempotent across batches)', async () => {
    const repo = createTechnicalCurationRepository(handle.db);
    const r = await repo.importBatch('another-batch', [item(3)], [SOURCE]);
    expect(r.counts).toMatchObject({ imported: 0, skippedUnchanged: 1, failed: 0 });
  });

  it('two simultaneous imports: the second is refused (MySQL lock) and the first completes intact', async () => {
    const repo = createTechnicalCurationRepository(handle.db);
    let started!: () => void;
    let release!: () => void;
    const isStarted = new Promise<void>((res) => (started = res));
    const gate = new Promise<void>((res) => (release = res));
    const first = repo.importBatch('concurrent', [item(10), item(11)], [SOURCE], {
      beforeItem: async (_k, i) => {
        if (i === 0) {
          started();
          await gate;
        }
      },
    });
    await isStarted;
    await expect(repo.importBatch('concurrent', [item(10), item(11)], [SOURCE])).rejects.toBeInstanceOf(ConcurrentImportError);
    release();
    const r = await first;
    expect(r).toMatchObject({ status: 'COMPLETED', counts: { inserted: 2 } });
    expect((await repo.loadVehicles([vid(10), vid(11)])).map((d) => d.observations.length)).toEqual([1, 1]);
    // El bloqueo se libera: una tercera ejecución entra (y no reescribe nada).
    expect((await repo.importBatch('concurrent', [item(10), item(11)], [SOURCE])).counts).toMatchObject({ skippedUnchanged: 2 });
  });

  it('connection lost mid-batch: committed vehicles stay, no partial vehicle, the stale run is marked ABANDONED and a new connection resumes', async () => {
    const lost = createDb(url!);
    const repo = createTechnicalCurationRepository(lost.db);
    await expect(
      repo.importBatch('conn-loss', [item(20), item(21), item(22)], [SOURCE], {
        beforeItem: async (_k, i) => {
          if (i === 1) await lost.pool.end();
        },
      }),
    ).rejects.toThrow();
    const fresh = createTechnicalCurationRepository(handle.db);
    expect((await fresh.loadVehicles([vid(20), vid(21), vid(22)])).map((d) => d.vehicle.id)).toEqual([vid(20)]);
    const resumed = await fresh.importBatch('conn-loss', [item(20), item(21), item(22)], [SOURCE]);
    expect(resumed).toMatchObject({ status: 'COMPLETED', counts: { inserted: 2, skippedUnchanged: 1 } });
    const runs = await handle.db.select().from(tables.curatedImportRuns).where(eq(tables.curatedImportRuns.batch_key, 'conn-loss'));
    expect(runs.map((x) => x.status).sort()).toEqual(['ABANDONED', 'COMPLETED']);
  });

  it('MySQL itself enforces the identity and curation rules (not only TypeScript)', async () => {
    const base = item(30);
    await createTechnicalCurationRepository(handle.db).ensureSources([SOURCE]);
    await createTechnicalCurationRepository(handle.db).writeItem(base);
    const attr = base.attributes[0]!;
    const rejects = async (q: Promise<unknown>, why: RegExp) => {
      const e = await q.then(
        () => undefined,
        (x: unknown) => x as Error & { cause?: Error },
      );
      expect(e, 'MySQL accepted a row that violates the rule').toBeDefined();
      expect(String(e!.cause?.message ?? e!.message)).toMatch(why);
    };
    // TAN|Va|Ve en columnas: otro id y otra clave derivada con la misma identidad.
    await rejects(handle.db.insert(tables.curatedTechnicalVehicles).values({ ...rowOf(base), id: vid(31), technical_key: `${base.vehicle.technical_key}|x` }), /Duplicate entry .*curated_technical_vehicles_identity/);
    // Atributo comercial "observado" (generación inventada como hecho) y técnico sin observar.
    await rejects(handle.db.insert(tables.curatedAttributes).values({ ...attr, id: vid(500), kind: 'COMMERCIAL', attribute: 'generation', status: 'OBSERVED' }), /curated_attributes_kind_status/);
    await rejects(handle.db.insert(tables.curatedAttributes).values({ ...attr, id: vid(501), status: 'EXACT' }), /curated_attributes_kind_status/);
    await rejects(handle.db.insert(tables.curatedAttributes).values({ ...attr, id: vid(502), rights_status: 'DENIED' }), /curated_attributes_rights/);
    const [specRow] = await handle.db.select().from(tables.curatedSpecValues).where(eq(tables.curatedSpecValues.vehicle_id, vid(30)));
    await rejects(handle.db.insert(tables.curatedSpecValues).values({ ...specRow!, id: vid(503), rights_status: 'DENIED' }), /curated_spec_values_rights/);
    await rejects(handle.db.insert(tables.curatedSpecValues).values({ ...specRow!, id: vid(504), conflict_status: 'IN_CONFLICT', conflict_group: null }), /curated_spec_values_conflict/);
    await rejects(handle.db.insert(tables.curatedSpecValues).values({ ...specRow!, id: vid(505), source_authority: 'SECONDARY_REFERENCE' }), /curated_spec_values_authority/);
    await rejects(handle.db.insert(tables.curatedSpecValues).values({ ...specRow!, id: vid(506), identity_match: 'MODEL_YEAR' }), /curated_spec_values_identity/);
    // curated_import_items: clave primaria (batch, clave técnica) y run existente.
    await rejects(handle.db.insert(tables.curatedImportItems).values({ batch_key: 'x', technical_key: 'k', vehicle_id: vid(30), item_hash: 'h'.repeat(64), status: 'IMPORTED', run_id: vid(777), updated_at: '2026-10-21 00:00:00' }), /foreign key constraint fails.*curated_import_runs/);
    const [[pk]] = await handle.pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'curated_import_items' AND CONSTRAINT_TYPE = 'PRIMARY KEY'");
    expect(pk!.n).toBe(1);
  });

  it('re-applying the migrations is a no-op (no duplicated structures, no data loss)', async () => {
    const shape = async () => JSON.stringify((await handle.pool.query<RowDataPacket[]>("SELECT TABLE_NAME, CONSTRAINT_NAME, CONSTRAINT_TYPE FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'curated%' ORDER BY 1, 2"))[0]);
    const before = [await shape(), JSON.stringify(await createTechnicalCurationRepository(handle.db).counts())];
    await applyMigrations(handle.db);
    expect([await shape(), JSON.stringify(await createTechnicalCurationRepository(handle.db).counts())]).toEqual(before);
  });

  it('rejects a second vehicle with the same TAN|Va|Ve under another id', async () => {
    const repo = createTechnicalCurationRepository(handle.db);
    const dup = item(1);
    const other = { ...dup, vehicle: { ...dup.vehicle, id: vid(99) }, attributes: [], observations: [] };
    await expect(repo.writeItem(other)).rejects.toBeInstanceOf(DuplicateTechnicalIdentityError);
    const r = await repo.importBatch('dup', [other], [SOURCE]);
    expect(r).toMatchObject({ status: 'FAILED', error: expect.stringMatching(/refusing to duplicate/) });
  });

  it('existing selectable catalogue is untouched and curated vehicles are not reference variants', async () => {
    expect(await fingerprint()).toBe(catalogBefore);
    const rv = await handle.db.select({ id: tables.referenceVariants.id }).from(tables.referenceVariants);
    const curated = await createTechnicalCurationRepository(handle.db).listVehicles('ES');
    expect(curated.length).toBeGreaterThan(0);
    expect(rv.some((r) => curated.some((c) => c.id === r.id))).toBe(false);
  });

  it('the selector reader (PUBLIC and PREVIEW) never sees curated vehicles', async () => {
    const reader = createCatalogReader(handle.db);
    const all = await reader.listVariants('ES');
    expect(all.some((r) => r.id === vid(1) || String(r.manufacturer) === 'Test')).toBe(false);
    expect(await reader.searchVariantIds('ES', 'Test Model')).toEqual([]);
  });

  it('an existing source row is never modified by ensureSources', async () => {
    const repo = createTechnicalCurationRepository(handle.db);
    const changed = { ...SOURCE, name: 'renamed' };
    expect(await repo.ensureSources([changed])).toBe(0);
    const rows = await handle.db.select().from(tables.sources);
    expect(rows.find((r) => r.id === SOURCE.id)!.name).toBe('EEA (test)');
  });
});
