import type { CatalogReader, CatalogRow } from '@vscar/db';
import { loadAllCases } from '@vscar/fixtures';
import type { DatasetBundle, VehicleModelMedia } from '@vscar/vehicle-schema';
import { LEGACY_PAIRS, normalizeSearch } from '../../src/domain/catalog.ts';
import type { ComparisonData } from '../../src/domain/comparison-data.ts';
import { createVehicleCatalogService, type VehicleCatalogService } from '../../src/server/catalog-service.ts';
import { loadComparisonData } from '../../src/server/comparison-loader.ts';
import { ALL_NEW, type PairConditions } from '../../src/domain/used-params.ts';

/**
 * CatalogReader EN MEMORIA sobre un DatasetBundle, con el mismo contrato que el lector MySQL de @vscar/db
 * (búsqueda AND de términos sin acentos ni mayúsculas, slugs por mercado, alias). Permite ejecutar el servicio y
 * el orquestador reales sin base de datos; la suite `catalog-mysql.test.ts` prueba lo mismo contra MySQL.
 */
export function memoryCatalogReader(bundle: DatasetBundle = loadAllCases(), aliases: Record<string, string> = {}, media: readonly VehicleModelMedia[] = []): CatalogReader {
  const rows: CatalogRow[] = bundle.variants.map((v) => {
    const h = bundle.homologations.find((x) => x.id === v.homologation_id)!;
    return {
      id: v.id,
      market_code: v.market_code,
      slug: v.slug,
      commercial_group_key: v.commercial_group_key,
      manufacturer: v.commercial.manufacturer,
      model: v.commercial.model,
      generation_code: v.commercial.generation_code,
      facelift: v.commercial.facelift ?? null,
      trim_name: v.commercial.trim_name,
      commercial_name: v.commercial.commercial_name,
      model_year: v.commercial.model_year,
      body_type: v.commercial.body_type,
      powertrain_type: v.technical.powertrain_type,
      drivetrain: v.technical.drivetrain,
      transmission: v.technical.transmission,
      sales_start: v.commercial.sales_start ?? null,
      sales_end: v.commercial.sales_end ?? null,
      status: v.status,
      homologation_valid_from: h.valid_from,
      homologation_valid_to: h.valid_to ?? null,
      homologation_test_cycle: h.test_cycle,
      identification_confidence: h.identification_confidence,
      type_approval_number: h.type_approval_number ?? null,
      variant_code: h.variant_code ?? null,
      version_code: h.version_code ?? null,
    };
  });
  const order = (xs: CatalogRow[]) => [...xs].sort((a, b) => a.manufacturer.localeCompare(b.manufacturer) || a.model.localeCompare(b.model) || a.model_year - b.model_year || a.slug.localeCompare(b.slug));
  const text = (r: CatalogRow) => normalizeSearch([r.manufacturer, r.model, r.commercial_name, r.trim_name, r.generation_code, r.facelift, r.model_year, r.powertrain_type].filter(Boolean).join(' '));
  // Mismo contrato que `loadBundleFrom` (@vscar/db): colecciones ordenadas por id.
  const byId = <T extends { id: string }>(xs: T[]) => [...xs].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const pick = (ids: readonly string[]): DatasetBundle => {
    const set = new Set(ids);
    const variants = bundle.variants.filter((v) => set.has(v.id));
    const hs = new Set(variants.map((v) => v.homologation_id));
    const homologations = bundle.homologations.filter((h) => hs.has(h.id));
    const values = bundle.spec_values.filter((v) => set.has(v.variant_id));
    const prices = bundle.prices.filter((p) => set.has(p.variant_id));
    const safety = bundle.safety_ratings.filter((s) => set.has(s.variant_id));
    const sourceIds = new Set([...homologations, ...values, ...prices, ...safety].map((r) => r.source_id));
    return { sources: byId(bundle.sources.filter((s) => sourceIds.has(s.id))), variants: byId(variants), homologations: byId(homologations), spec_values: byId(values), prices: byId(prices), safety_ratings: byId(safety), incentives: [] };
  };
  const reader = {
    listVariants: async (market: string) => order(rows.filter((r) => r.market_code === market)),
    getVariantsByIds: async (market: string, ids: readonly string[]) => rows.filter((r) => r.market_code === market && ids.includes(r.id)),
    searchVariantIds: async (market: string, query: string) => {
      const tokens = normalizeSearch(query).split(' ').filter(Boolean);
      return order(rows.filter((r) => r.market_code === market && tokens.every((t) => text(r).includes(t)))).map((r) => r.id);
    },
    resolveSlug: async (market: string, slug: string) => {
      const direct = rows.find((r) => r.market_code === market && r.slug === slug);
      if (direct) return { variantId: direct.id, canonicalSlug: direct.slug, viaAlias: false };
      const target = aliases[slug] && rows.find((r) => r.market_code === market && r.id === aliases[slug]);
      return target ? { variantId: target.id, canonicalSlug: target.slug, viaAlias: true } : undefined;
    },
    loadBundle: async (market: string, ids: readonly string[]) => pick(ids.filter((id) => rows.some((r) => r.id === id && r.market_code === market))),
    listModelMedia: async (brands?: readonly string[]) => media.filter((m) => !brands?.length || brands.includes(m.brand)),
    catalogVersion: async (market: string) => ({ variants: rows.filter((r) => r.market_code === market).length, values: bundle.spec_values.length, prices: bundle.prices.length, media: media.length, lastChange: 'memory' }),
  };
  return reader as unknown as CatalogReader;
}

export function memoryCatalog(channel: 'PUBLIC' | 'PREVIEW' = 'PREVIEW', bundle?: DatasetBundle, aliases?: Record<string, string>, media?: readonly VehicleModelMedia[]): VehicleCatalogService {
  const reader = memoryCatalogReader(bundle, aliases, media);
  return createVehicleCatalogService({ reader: () => reader, channel });
}

/** Par de la Step 7a (BYD SEAL vs Model 3 2021), ahora resuelto como dos ReferenceVariants del catálogo. */
export const DEMO_PAIR = LEGACY_PAIRS['byd-seal-vs-tesla-model-3']!;

export async function comparisonData(slug = DEMO_PAIR, catalog: VehicleCatalogService = memoryCatalog(), conditions: PairConditions = ALL_NEW): Promise<ComparisonData> {
  const load = await loadComparisonData('ES', slug, catalog, conditions);
  if (load.kind !== 'ok') throw new Error(`could not load ${slug}: ${JSON.stringify(load)}`);
  return load.data;
}
