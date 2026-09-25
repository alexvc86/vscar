import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runEeaImport, verifyRawIngest, type FetchLike } from '@vscar/data-connectors';
import { GOLF_2018_IDS, MODEL3_2021_IDS, SOURCES, loadCase } from '@vscar/fixtures';
import { detectConflicts } from '@vscar/quality';
import { Homologation } from '@vscar/vehicle-schema';
import { createCatalogRepository, type CatalogRepository, type DbHandle } from '../src/index.ts';
import { TEST_DATABASE_URL, freshTestDb } from './test-db.ts';

/**
 * Pipeline real de adquisición (Plan §33.2) sobre MySQL: Source → Raw ingest → Normalization → candidatos DRAFT
 * → persistencia append-only → recarga → Conflict detection. Respuestas EEA grabadas (deterministas).
 */
const recorded = (name: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../../data-connectors/test/fixtures/eea/${name}.json`, import.meta.url)), 'utf8'));
const fake = (body: unknown): FetchLike => async () => ({ ok: true, status: 200, json: async () => body });

describe.skipIf(!TEST_DATABASE_URL)('EEA import → MySQL', () => {
  let handle: DbHandle;
  let repo: CatalogRepository;
  const rawDir = mkdtempSync(join(tmpdir(), 'vscar-raw-'));

  beforeAll(async () => {
    handle = await freshTestDb(TEST_DATABASE_URL!);
    repo = createCatalogRepository(handle.db);
    await repo.saveBundle(loadCase('golf2018TwoHomologations'));
    await repo.saveBundle(loadCase('teslaModel3IntraYear'));
    await repo.saveBundle({ sources: [SOURCES.eea], homologations: [], variants: [], spec_values: [] });
  });

  afterAll(async () => {
    await handle?.close();
  });

  async function importFor(sample: string, year: number, filters: Parameters<typeof runEeaImport>[0]['filters'], variantId: string, homologation: Homologation) {
    const stored = await repo.loadBundle([variantId]);
    const result = await runEeaImport({
      year,
      filters,
      targets: [{ variant: stored.variants[0]!, homologation }],
      sourceId: SOURCES.eea.id,
      rawDir,
      retrievedAt: '2026-09-24',
      fetchImpl: fake(recorded(sample)),
    });
    await repo.saveRawIngest({ ...result.raw, source_id: SOURCES.eea.id });
    const candidates = result.targets[0]!.candidates.map((c) => ({ ...c, raw_ingest_id: result.raw.id }));
    const inserted = await repo.appendSpecValues(candidates);
    await repo.markRawIngest(result.raw.id, 'IMPORTED');
    return { result, candidates, inserted };
  }

  it('Golf 2018 (exact version): EEA values land as DRAFT, traceable to the raw file, with no conflicts', async () => {
    const stored = await repo.loadBundle([GOLF_2018_IDS.rvA]);
    const exact = Homologation.parse({ ...stored.homologations[0]!, version_code: 'FM6FM6AJ015N7MVON1ML79VR2N' });
    const { result, candidates } = await importFor(
      'golf-2018-es',
      2018,
      { memberState: 'ES', make: 'VOLKSWAGEN', commercialNamePrefix: 'GOLF', engineCapacityCm3: 1498, enginePowerKw: 96 },
      GOLF_2018_IDS.rvA,
      exact,
    );

    const raw = await repo.getRawIngest(result.raw.id);
    expect(raw).toMatchObject({
      import_status: 'IMPORTED',
      row_count: 137,
      payload_hash: result.raw.payload_hash,
      dataset_year: 2018,
      dataset_status: 'FINAL',
      source_table: '[CO2Emission].[latest].[co2cars]',
      query_hash: result.raw.query_hash,
      adapter_version: result.raw.adapter_version,
      transformation_version: result.raw.transformation_version,
    });
    expect(await verifyRawIngest(result.raw)).toBe(true);

    const loaded = await repo.loadBundle([GOLF_2018_IDS.rvA]);
    const fromEea = loaded.spec_values.filter((v) => v.raw_ingest_id === result.raw.id);
    expect(fromEea.map((v) => v.id).sort()).toEqual(candidates.map((c) => c.id).sort());
    expect(fromEea.every((v) => v.status === 'DRAFT' && v.external_field !== undefined)).toBe(true);
    // Los valores curados (DC-03) y los de la EEA coinciden: el pipeline confirma la curación.
    expect(detectConflicts(loaded.spec_values)).toEqual([]);
  });

  it('re-running the same import is idempotent (append-only, no duplicates)', async () => {
    const stored = await repo.loadBundle([GOLF_2018_IDS.rvA]);
    const before = stored.spec_values.length;
    const exact = Homologation.parse({ ...stored.homologations[0]!, version_code: 'FM6FM6AJ015N7MVON1ML79VR2N' });
    await importFor('golf-2018-es', 2018, { memberState: 'ES', make: 'VOLKSWAGEN', commercialNamePrefix: 'GOLF', engineCapacityCm3: 1498, enginePowerKw: 96 }, GOLF_2018_IDS.rvA, exact);
    expect((await repo.loadBundle([GOLF_2018_IDS.rvA])).spec_values).toHaveLength(before);
  });

  it('Model 3 2021: the EEA 440 km vs IDAE 448 km conflict survives persistence and goes to human review', async () => {
    const stored = await repo.loadBundle([MODEL3_2021_IDS.srp]);
    const h = Homologation.parse({
      ...stored.homologations[0]!,
      type_approval_number: 'e4*2007/46*1293*13',
      variant_code: 'E6R',
      version_code: 'PB1S5N',
      manufacturer_type_code: undefined,
      identification_confidence: 'EXACT',
    });
    await importFor('model3-2021-es', 2021, { memberState: 'ES', make: 'TESLA', enginePowerKw: 239 }, MODEL3_2021_IDS.srp, h);

    const loaded = await repo.loadBundle([MODEL3_2021_IDS.srp]);
    const conflicts = detectConflicts(loaded.spec_values.filter((v) => v.variant_id === MODEL3_2021_IDS.srp));
    const range = conflicts.find((c) => c.spec_key === 'rng.electric_combined_km');
    expect(range?.requires_human_review).toBe(true);
    // Ambos valores se conservan: nada se sobrescribe.
    const ranges = loaded.spec_values.filter((v) => v.spec_key === 'rng.electric_combined_km' && v.variant_id === MODEL3_2021_IDS.srp).map((v) => v.value);
    expect(ranges.sort()).toEqual([440, 448]);
  });
});
