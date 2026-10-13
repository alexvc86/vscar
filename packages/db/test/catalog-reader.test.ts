import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BYD_SEAL_IDS, LEON_EHYBRID_IDS, MODEL3_2021_IDS, loadAllCases } from '@vscar/fixtures';
import { createCatalogReader, createCatalogRepository, type DbHandle } from '../src/index.ts';
import { freshTestDb, TEST_DATABASE_URL as url } from './test-db.ts';

/** Step 7b: lector de catálogo de la web contra MySQL real (Dataset Core v0.1). */
describe.skipIf(!url)('catalog reader (MySQL)', () => {
  let handle: DbHandle;
  let reader: ReturnType<typeof createCatalogReader>;
  const bundle = loadAllCases();

  beforeAll(async () => {
    handle = await freshTestDb(url!);
    await createCatalogRepository(handle.db).saveBundle(bundle);
    reader = createCatalogReader(handle.db);
  });
  afterAll(async () => {
    await handle?.close();
  });

  const slugsOf = async (ids: string[]) => (await reader.getVariantsByIds('ES', ids)).map((r) => r.slug).sort();

  it('is read-only: the port exposes no write operation', () => {
    expect(Object.keys(reader).filter((k) => /save|insert|update|delete|append|add|mark/i.test(k))).toEqual([]);
  });

  it('market-aware: every query takes the market; ES has the catalog, US has nothing', async () => {
    expect((await reader.listVariants('ES')).length).toBe(bundle.variants.length);
    expect(await reader.listVariants('US')).toEqual([]);
    expect(await reader.searchVariantIds('US', 'seal')).toEqual([]);
    expect(await reader.resolveSlug('US', 'byd-seal-2026-design-rwd-82-5-kwh')).toBeUndefined();
  });

  it('rows are light: commercial identity + powertrain, no specs', async () => {
    const [row] = await reader.getVariantsByIds('ES', [BYD_SEAL_IDS.variant]);
    expect(row).toMatchObject({ manufacturer: 'BYD', model: 'SEAL', model_year: 2026, powertrain_type: 'BEV', slug: 'byd-seal-2026-design-rwd-82-5-kwh' });
    expect(Object.keys(row!)).not.toContain('spec_values');
  });

  it('search: exact model, partial, case- and accent-insensitive', async () => {
    expect(await reader.searchVariantIds('ES', 'seal')).toEqual([BYD_SEAL_IDS.variant]);
    const leon = await reader.searchVariantIds('ES', 'León');
    expect(leon).toEqual([LEON_EHYBRID_IDS.variant]);
    expect(await reader.searchVariantIds('ES', 'leon')).toEqual(leon);
    expect(await reader.searchVariantIds('ES', 'LEON')).toEqual(leon);
    const model3 = await slugsOf(await reader.searchVariantIds('ES', 'mode'));
    expect(model3.every((s) => s.startsWith('tesla-model-3'))).toBe(true);
    expect(model3.length).toBe(3);
  });

  it('search: several terms are ANDed (brand + model + variant, year, powertrain)', async () => {
    expect(await slugsOf(await reader.searchVariantIds('ES', 'golf etsi'))).toEqual(['volkswagen-golf-style-1-5-etsi-150-dsg']);
    expect(await slugsOf(await reader.searchVariantIds('ES', 'golf 2018'))).toEqual(['volkswagen-golf-2018-advance-1-5-tsi-130-h33', 'volkswagen-golf-2018-advance-1-5-tsi-130-h35']);
    expect((await reader.searchVariantIds('ES', 'bev')).length).toBe(4);
  });

  it('search never matches homologation codes (not a user field)', async () => {
    expect(await reader.searchVariantIds('ES', 'E6R')).toEqual([]);
    expect(await reader.searchVariantIds('ES', '2018/858')).toEqual([]);
  });

  it('user input is a literal: LIKE wildcards are escaped and SQL is parametrized', async () => {
    expect(await reader.searchVariantIds('ES', '%')).toEqual([]);
    expect(await reader.searchVariantIds('ES', '_')).toEqual([]);
    expect(await reader.searchVariantIds('ES', "' OR 1=1 --")).toEqual([]);
    expect((await reader.listVariants('ES')).length).toBe(bundle.variants.length);
  });

  it('slug resolution: canonical, alias (redirect), unknown', async () => {
    expect(await reader.resolveSlug('ES', 'byd-seal-2026-design-rwd-82-5-kwh')).toEqual({ variantId: BYD_SEAL_IDS.variant, canonicalSlug: 'byd-seal-2026-design-rwd-82-5-kwh', viaAlias: false });
    await createCatalogRepository(handle.db).addSlugAlias({ market_code: 'ES', slug: 'byd-seal-design-old', variant_id: BYD_SEAL_IDS.variant, reason: 'test' });
    expect(await reader.resolveSlug('ES', 'byd-seal-design-old')).toEqual({ variantId: BYD_SEAL_IDS.variant, canonicalSlug: 'byd-seal-2026-design-rwd-82-5-kwh', viaAlias: true });
    expect(await reader.resolveSlug('ES', 'no-such-car')).toBeUndefined();
  });

  it('slugs are unique per market (routing key) — the database enforces it', async () => {
    const rows = await reader.listVariants('ES');
    expect(new Set(rows.map((r) => r.slug)).size).toBe(rows.length);
    await expect(handle.pool.query('UPDATE reference_variants SET slug = ? WHERE id = ?', [rows[0]!.slug, MODEL3_2021_IDS.srp])).rejects.toThrow(/Duplicate/);
  });

  it('loadBundle only returns variants of the requested market', async () => {
    const es = await reader.loadBundle('ES', [BYD_SEAL_IDS.variant]);
    expect(es.variants.map((v) => v.id)).toEqual([BYD_SEAL_IDS.variant]);
    expect((await reader.loadBundle('US', [BYD_SEAL_IDS.variant])).variants).toEqual([]);
  });

  it('catalogVersion changes when the catalog changes (cache key)', async () => {
    const before = await reader.catalogVersion('ES');
    expect(before.variants).toBe(bundle.variants.length);
    const value = bundle.spec_values.find((v) => v.variant_id === BYD_SEAL_IDS.variant)!;
    await createCatalogRepository(handle.db).appendSpecValues([{ ...value, id: '00000000-0000-4000-8000-00000000ab01' }]);
    const after = await reader.catalogVersion('ES');
    expect(after.values).toBe(before.values + 1);
    expect(after).not.toEqual(before);
  });
});
