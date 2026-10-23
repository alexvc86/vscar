import { describe, expect, it } from 'vitest';
import { BYD_SEAL_IDS, GOLF_2018_IDS, loadAllCases } from '@vscar/fixtures';
import { VehicleModelMedia, type VehicleModelMediaInput } from '@vscar/vehicle-schema';
import { optionText } from '../src/components/catalog/labels.ts';
import { comparisonData, memoryCatalog } from './support/catalog.ts';
import { pairSlug } from '../src/domain/catalog.ts';

/**
 * Step 7b.2 — navegación Marca → Modelo → Año → Versión y media de modelo, con el servicio REAL (lector en memoria con
 * el contrato del de MySQL). La suite `catalog-mysql.test.ts` repite lo esencial contra MySQL.
 */
const labels = { powertrain: { ICE: 'Combustión' }, periodRange: 'homologado {from}–{to}', periodFrom: 'homologado desde {from}', cycle: 'homologación {cycle}', formatLocale: 'es-ES' };

/** Registros de media SINTÉTICOS (solo tests): no apuntan a ningún asset real. */
const media = (over: Partial<VehicleModelMediaInput> & { id: string }): VehicleModelMedia =>
  VehicleModelMedia.parse({
    brand: 'Volkswagen',
    model: 'Golf',
    role: 'SELECTOR',
    media_type: 'IMAGE',
    asset_path: '/media/synthetic/golf.webp',
    width: 640,
    height: 360,
    origin: 'SELF_CREATED',
    rights_status: 'VERIFIED',
    license: 'VScar original (synthetic test)',
    verified_at: '2026-10-14',
    ...over,
  });
const ID = (n: number) => `00000000-0000-4000-8000-0000000001${String(n).padStart(2, '0')}`;

describe('browse: brand → model → year → version (Dataset Core, PREVIEW)', () => {
  const c = memoryCatalog();

  it('brands come from the catalog (not hardcoded)', async () => {
    // D1.8: cada marca declara si tiene algún modelo comparable (aquí todas: Dataset Core sin capa técnica).
    expect(await c.listBrands('ES')).toEqual([
      { brand: 'BMW', models: 1, availability: 'COMPARISON_ELIGIBLE' },
      { brand: 'BYD', models: 1, availability: 'COMPARISON_ELIGIBLE' },
      { brand: 'SEAT', models: 1, availability: 'COMPARISON_ELIGIBLE' },
      { brand: 'Tesla', models: 1, availability: 'COMPARISON_ELIGIBLE' },
      { brand: 'Volkswagen', models: 1, availability: 'COMPARISON_ELIGIBLE' },
    ]);
  });

  it('ONE model card per model (never one per variant), with its real years and generations', async () => {
    const [golf, ...rest] = await c.listModels('ES', 'Volkswagen');
    expect(rest).toEqual([]);
    expect(golf).toMatchObject({ brand: 'Volkswagen', model: 'Golf', years: [2027, 2018], generations: ['Mk7', 'Mk8'], bodyType: 'hatchback' });
    const [m3] = await c.listModels('ES', 'Tesla');
    expect(m3).toMatchObject({ model: 'Model 3', years: [2021], generations: ['pre-Highland'] });
    // Card payload: as much as brand, model, generations, years, body type, media.
    expect(Object.keys(golf!).sort()).toEqual(['availability', 'bodyType', 'brand', 'generations', 'model', 'preview', 'years']);
    expect(golf!.availability).toBe('COMPARISON_ELIGIBLE');
  });

  it('years: only those present, with their explicit generation', async () => {
    // D1.8: cada año declara su base (aquí año-modelo del catálogo seleccionable) y si es comparable.
    expect(await c.listModelYears('ES', 'Volkswagen', 'Golf')).toEqual([
      { year: 2027, generations: ['Mk8'], basis: ['MODEL_YEAR'], availability: 'COMPARISON_ELIGIBLE' },
      { year: 2018, generations: ['Mk7'], basis: ['MODEL_YEAR'], availability: 'COMPARISON_ELIGIBLE' },
    ]);
    expect(await c.listModelYears('ES', 'SEAT', 'León')).toEqual([{ year: 2026, generations: ['Mk4'], basis: ['MODEL_YEAR'], availability: 'COMPARISON_ELIGIBLE' }]);
  });

  it('Golf 2018 returns only 2018 variants; each row resolves an exact ReferenceVariant id', async () => {
    const rows = await c.listVariants('ES', 'Volkswagen', 'Golf', 2018);
    expect(rows.map((r) => r.id).sort()).toEqual([GOLF_2018_IDS.rvA, GOLF_2018_IDS.rvB].sort());
    expect(rows.every((r) => r.year === 2018)).toBe(true);
    const bundle = loadAllCases();
    for (const r of rows) expect(bundle.variants.find((v) => v.id === r.id)?.slug).toBe(r.slug);
  });

  it('same model, year and commercial trim but different technical identity: never merged, told apart by the homologation cycle', async () => {
    const rows = await c.listVariants('ES', 'Volkswagen', 'Golf', 2018);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.variant)).toEqual(['Advance 1.5 TSI EVO 130 CV', 'Advance 1.5 TSI EVO 130 CV']);
    expect(rows.map((r) => r.cycle).sort()).toEqual(['NEDC', 'WLTP']);
    const texts = rows.map((r) => optionText(r, labels).period);
    expect(new Set(texts).size).toBe(2);
    expect(texts.join(' ')).not.toMatch(/e1\*|GAC4/);
  });

  it('Tesla E6R / E6CR stay separate variants (distinguished by homologation period)', async () => {
    const rows = (await c.listVariants('ES', 'Tesla', 'Model 3', 2021)).filter((r) => r.slug.includes('standard-range-plus'));
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.period && !r.cycle)).toBe(true);
  });

  it('version rows: max 2–3 metadata (powertrain, power, gearbox); power only when usable and NOT in conflict', async () => {
    const [golf18] = await c.listVariants('ES', 'Volkswagen', 'Golf', 2018);
    expect(golf18).toMatchObject({ powertrainType: 'ICE', powerKw: { min: 96, max: 96 }, transmission: 'manual', drivetrain: 'FWD' });
    // Golf eTSI: 110 kW (fabricante) vs 85 kW (IDAE) en conflicto → no se muestra ninguno.
    const [etsi] = await c.listVariants('ES', 'Volkswagen', 'Golf', 2027);
    expect(etsi?.powerKw).toBeUndefined();
  });

  it('PREVIEW only: technical identity details (ReferenceVariant id, TAN, Va, Ve, status) for methodology/debug', async () => {
    const [golf18] = await c.listVariants('ES', 'Volkswagen', 'Golf', 2018);
    expect(golf18?.identity).toMatchObject({ referenceVariantId: golf18!.id, status: 'EXACT', tan: expect.stringMatching(/^e1\*/), va: 'GAC4DACAX0' });
    const [m3] = await c.listVariants('ES', 'Tesla', 'Model 3', 2021);
    expect(m3?.identity?.status).not.toBe('EXACT');
  });

  it('no versions for a year that does not exist (empty, not an error)', async () => {
    expect(await c.listVariants('ES', 'Volkswagen', 'Golf', 2019)).toEqual([]);
  });

  it('the chosen version compares like any other pair (selector does not change eligibility)', async () => {
    const [golf18] = await c.listVariants('ES', 'Volkswagen', 'Golf', 2018);
    const byd = (await c.getVariantById('ES', BYD_SEAL_IDS.variant))!;
    const data = await comparisonData(pairSlug(golf18!.slug, byd.slug), c);
    expect(data.vehicles.map((v) => v.option.id)).toEqual([golf18!.id, byd.id]);
  });
});

describe('PUBLIC channel: honest empty catalog, no technical details', () => {
  it('no brands today; the selector shows the "still verifying" state', async () => {
    const pub = memoryCatalog('PUBLIC');
    expect(await pub.listBrands('ES')).toEqual([]);
    expect(await pub.listModels('ES', 'Volkswagen')).toEqual([]);
  });
});

describe('model media: rights ≠ data rights, fallback order, server-side gating', () => {
  const golf = media({ id: ID(1) });
  const golfMk7 = media({ id: ID(2), generation_code: 'Mk7' });
  const pendingSeat = media({ id: ID(3), brand: 'SEAT', model: 'León', origin: 'MANUFACTURER_VERIFIED', rights_status: 'PENDING', license: undefined, verified_at: undefined });

  it('no media → no MediaView (the UI draws the body-type silhouette); the car is never hidden', async () => {
    const [card] = await memoryCatalog().listModels('ES', 'BYD');
    expect(card).toMatchObject({ model: 'SEAL', bodyType: 'sedan' });
    expect(card?.media).toBeUndefined();
  });

  it('a multi-generation model card uses the MODEL media, never one generation’s image', async () => {
    const [card] = await memoryCatalog('PREVIEW', undefined, undefined, [golfMk7]).listModels('ES', 'Volkswagen');
    expect(card?.media).toBeUndefined();
    const [withModel] = await memoryCatalog('PREVIEW', undefined, undefined, [golf, golfMk7]).listModels('ES', 'Volkswagen');
    expect(withModel?.media).toMatchObject({ src: '/media/synthetic/golf.webp', match: 'MODEL' });
  });

  it('a version row prefers its exact generation media over the model media', async () => {
    const c = memoryCatalog('PREVIEW', undefined, undefined, [golf, golfMk7]);
    const [row18] = await c.listVariants('ES', 'Volkswagen', 'Golf', 2018);
    expect(row18?.media?.match).toBe('GENERATION');
    const [row27] = await c.listVariants('ES', 'Volkswagen', 'Golf', 2027);
    expect(row27?.media?.match).toBe('MODEL');
  });

  it('PUBLIC never receives a PENDING image URL; PREVIEW receives it flagged', async () => {
    const pre = await memoryCatalog('PREVIEW', undefined, undefined, [pendingSeat]).listModels('ES', 'SEAT');
    expect(pre[0]?.media).toMatchObject({ src: '/media/synthetic/golf.webp', preview: true });
    const search = await memoryCatalog('PREVIEW', undefined, undefined, [pendingSeat]).searchVehicles('ES', 'leon');
    expect(search.results[0]?.media?.preview).toBe(true);
    // En PUBLIC no hay coches hoy; con un coche público, la imagen pendiente tampoco llegaría (regla en @vscar/quality).
    const pub = await memoryCatalog('PUBLIC', undefined, undefined, [pendingSeat]).listModels('ES', 'SEAT');
    expect(JSON.stringify(pub)).not.toContain('/media/');
  });

  it('external URLs fail closed in Alpha (no allow-listed licensed hosts yet)', async () => {
    const external = media({ id: ID(4), asset_path: undefined, external_url: 'https://media.example.com/golf.webp' });
    const [card] = await memoryCatalog('PREVIEW', undefined, undefined, [external]).listModels('ES', 'Volkswagen');
    expect(card?.media).toBeUndefined();
  });
});

describe('ES / EN: same models, years and ReferenceVariants (only UI text differs)', () => {
  it('the catalog service has no language input at all', async () => {
    const c = memoryCatalog();
    // Las firmas son (market, …): el idioma no puede cambiar qué existe.
    expect(c.listModels.length).toBe(2);
    expect(c.listVariants.length).toBe(4);
    const twice = await Promise.all([c.listVariants('ES', 'Volkswagen', 'Golf', 2018), c.listVariants('ES', 'Volkswagen', 'Golf', 2018)]);
    expect(twice[0]).toEqual(twice[1]);
  });
});
