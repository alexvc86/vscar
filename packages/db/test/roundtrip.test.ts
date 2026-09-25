import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SCHEMA_VALIDATION_CASES, loadCase, type CaseName } from '@vscar/fixtures';
import { checkPlausibility, detectConflicts, evaluateEligibility } from '@vscar/quality';
import type { DatasetBundle } from '@vscar/vehicle-schema';
import { createCatalogRepository, tables, type DbHandle } from '../src/index.ts';
import { freshTestDb } from './test-db.ts';

/**
 * Round-trip de los seis casos de validación técnica del schema v0.2 contra MySQL real.
 * Requiere VSCAR_TEST_DATABASE_URL apuntando a una base cuyo nombre termine en `_test`
 * (el test borra y recrea sus tablas). Sin la variable, el test se omite.
 */
const url = process.env.VSCAR_TEST_DATABASE_URL;

const sortById = <T extends { id: string }>(xs: readonly T[]) => [...xs].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
const normalize = (b: DatasetBundle): DatasetBundle => ({
  sources: sortById(b.sources),
  homologations: sortById(b.homologations),
  variants: sortById(b.variants),
  spec_values: sortById(b.spec_values),
  prices: sortById(b.prices),
  incentives: sortById(b.incentives),
  safety_ratings: sortById(b.safety_ratings),
});

/** Resumen de calidad por variant: debe ser idéntico antes y después de pasar por MySQL. */
function qualitySnapshot(b: DatasetBundle) {
  return sortById(b.variants).map((variant) => {
    const homologation = b.homologations.find((h) => h.id === variant.homologation_id)!;
    const values = sortById(b.spec_values.filter((v) => v.variant_id === variant.id));
    const prices = sortById(b.prices.filter((p) => p.variant_id === variant.id));
    return {
      variant: variant.id,
      plausibility: checkPlausibility({ variant, homologation, values }),
      conflicts: detectConflicts(values),
      eligibility: evaluateEligibility({ variant, homologation, values, prices }),
    };
  });
}

describe.skipIf(!url)('MySQL round-trip of the six schema validation cases', () => {
  let handle: DbHandle;

  beforeAll(async () => {
    handle = await freshTestDb(url!);
  });

  afterAll(async () => {
    await handle?.close();
  });

  for (const name of Object.keys(SCHEMA_VALIDATION_CASES) as CaseName[]) {
    it(`${name}: saves and loads without losing provenance or ambiguity`, async () => {
      const repo = createCatalogRepository(handle.db);
      const original = loadCase(name);
      await repo.saveBundle(original);

      const loaded = await repo.loadBundle(original.variants.map((v) => v.id));
      expect(normalize(loaded)).toEqual(normalize(original));
      expect(qualitySnapshot(loaded)).toEqual(qualitySnapshot(original));
    });
  }

  it('Golf 2018: both technical variants are found through their commercial group', async () => {
    const repo = createCatalogRepository(handle.db);
    const golf = loadCase('golf2018TwoHomologations');
    const ids = await repo.variantIdsByCommercialGroup(golf.variants[0]!.commercial_group_key);
    expect(ids).toEqual(golf.variants.map((v) => v.id).sort());
  });

  it('MySQL enforces one technical variant per homologation (ADR-007)', async () => {
    const [first] = loadCase('golf2018TwoHomologations').variants;
    const c = first!.commercial;
    const x = first!.technical;
    await expect(
      handle.db.insert(tables.referenceVariants).values({
        id: '11111111-1111-4111-8111-111111111111',
        market_code: first!.market_code,
        commercial_group_key: first!.commercial_group_key,
        canonical_key: `${first!.commercial_group_key}:hdup`,
        slug: 'dup',
        manufacturer: c.manufacturer,
        model: c.model,
        generation_code: c.generation_code,
        trim_name: c.trim_name,
        commercial_name: c.commercial_name,
        model_year: c.model_year,
        body_type: c.body_type,
        powertrain_type: x.powertrain_type,
        drivetrain: x.drivetrain,
        transmission: x.transmission,
        homologation_id: first!.homologation_id,
        status: 'draft',
      }),
    ).rejects.toThrow();
  });
});
