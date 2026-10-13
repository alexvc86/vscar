import 'server-only';
import type { CatalogReader, CatalogRow, CatalogVersion } from '@vscar/db';
import { availableIn, publicationInputFromBundle, variantAvailability, type PublicationChannel, type VariantAvailability } from '@vscar/quality';
import type { DatasetBundle } from '@vscar/vehicle-schema';
import { browseOrder, commercialVariant, EXAMPLE_PAIRS, normalizeSearch, rankSearchResults, SEARCH_LIMIT, SEARCH_MIN_CHARS, type VehicleOption } from '@/domain/catalog';
import type { MarketCode } from '@/i18n/locales';
import { CatalogUnavailableError } from './db';

/**
 * VehicleCatalogService (Step 7b): catálogo de ReferenceVariants SELECCIONABLES de un mercado y canal.
 *
 *   apps/web (route handler / RSC) → este servicio → CatalogReader (@vscar/db, solo lectura) → MySQL
 *
 * La elegibilidad no se inventa aquí: `variantAvailability` (@vscar/quality) combina derechos (DATA_RIGHTS_MATRIX),
 * identidad técnica, estado del registro y `vehicle_page_eligibility`. Caché por mercado, invalidada cuando cambia
 * la huella del catálogo en MySQL (`catalogVersion`); el canal es fijo por instancia, así nunca se mezclan.
 */

/** Fecha de referencia de los hechos: una variant histórica se evalúa en el último día de su homologación/venta. */
export function variantReferenceDate(row: Pick<CatalogRow, 'homologation_valid_to' | 'sales_end'>): string | undefined {
  return [row.homologation_valid_to, row.sales_end].filter((d): d is string => !!d).sort()[0];
}

export interface CatalogIndex {
  market: MarketCode;
  channel: PublicationChannel;
  version: string;
  /** Opciones seleccionables en orden de navegación. */
  options: VehicleOption[];
  byId: Map<string, VehicleOption>;
  rowById: Map<string, CatalogRow>;
  availability: Map<string, VariantAvailability>;
  /** Variants del mercado que existen pero no son seleccionables en el canal (para métricas/docs). */
  excluded: number;
}

const versionString = (v: CatalogVersion) => `${v.variants}.${v.values}.${v.prices}@${v.lastChange ?? '-'}`;

/** Índice puro a partir de filas + bundle: testable sin servidor. */
export function buildCatalogIndex(market: MarketCode, channel: PublicationChannel, version: string, rows: readonly CatalogRow[], bundle: DatasetBundle): CatalogIndex {
  const availability = new Map<string, VariantAvailability>();
  const selectable: CatalogRow[] = [];
  for (const row of rows) {
    const at = variantReferenceDate(row);
    const a = variantAvailability(publicationInputFromBundle(bundle, row.id, at)).availability;
    availability.set(row.id, a);
    if (availableIn(a, channel)) selectable.push(row);
  }
  const base = selectable.map((r): VehicleOption => ({
    id: r.id,
    slug: r.slug,
    brand: r.manufacturer,
    model: r.model,
    variant: commercialVariant(r.commercial_name, r.manufacturer, r.model, r.trim_name),
    year: r.model_year ?? null,
    powertrainType: r.powertrain_type,
    bodyType: r.body_type,
    ...(availability.get(r.id) === 'INTERNAL_AVAILABLE' ? { preview: true } : {}),
  }));
  // ADR-007: dos variants técnicas con el mismo nombre comercial, año y powertrain se distinguen por su periodo de
  // homologación (nunca por códigos TAN/Va/Ve en la UI).
  const groupKey = (o: VehicleOption) => normalizeSearch(`${o.brand}|${o.model}|${o.variant}|${o.year}|${o.powertrainType}`);
  const counts = new Map<string, number>();
  for (const o of base) counts.set(groupKey(o), (counts.get(groupKey(o)) ?? 0) + 1);
  const rowById = new Map(rows.map((r) => [r.id, r]));
  const options = browseOrder(
    base.map((o) => {
      if ((counts.get(groupKey(o)) ?? 0) < 2) return o;
      const r = rowById.get(o.id)!;
      return { ...o, period: { from: r.homologation_valid_from, ...(r.homologation_valid_to ? { to: r.homologation_valid_to } : {}) } };
    }),
  );
  return { market, channel, version, options, byId: new Map(options.map((o) => [o.id, o])), rowById, availability, excluded: rows.length - options.length };
}

export interface SearchResult {
  query: string;
  /** `browse` = sin texto suficiente: primeras opciones por marca/modelo/año. */
  mode: 'search' | 'browse';
  results: VehicleOption[];
}

export interface VehicleCatalogService {
  channel: PublicationChannel;
  index(market: MarketCode): Promise<CatalogIndex>;
  searchVehicles(market: MarketCode, query: string, limit?: number): Promise<SearchResult>;
  listBrands(market: MarketCode): Promise<{ brand: string; count: number }[]>;
  listModels(market: MarketCode, brand: string): Promise<{ model: string; count: number }[]>;
  getVariantBySlug(market: MarketCode, slug: string): Promise<{ option: VehicleOption; canonicalSlug: string; viaAlias: boolean } | undefined>;
  getVariantById(market: MarketCode, id: string): Promise<VehicleOption | undefined>;
  examples(market: MarketCode): Promise<{ a: VehicleOption; b: VehicleOption }[]>;
  loadBundle(market: MarketCode, ids: readonly string[]): Promise<DatasetBundle>;
}

export function createVehicleCatalogService(deps: { reader: () => CatalogReader; channel: PublicationChannel; ttlMs?: number; now?: () => number }): VehicleCatalogService {
  const ttl = deps.ttlMs ?? 30_000;
  const now = deps.now ?? Date.now;
  const indexes = new Map<MarketCode, { index: CatalogIndex; checkedAt: number }>();
  const building = new Map<MarketCode, Promise<CatalogIndex>>();
  const searchCache = new Map<string, VehicleOption[]>();
  const SEARCH_CACHE_MAX = 200;

  /** Cualquier fallo de la base de datos es un error CONTROLADO: la página decide qué mostrar. */
  const guarded = async <T>(f: () => Promise<T>): Promise<T> => {
    try {
      return await f();
    } catch (e) {
      throw e instanceof CatalogUnavailableError ? e : new CatalogUnavailableError(e);
    }
  };

  async function rebuild(market: MarketCode, version: string): Promise<CatalogIndex> {
    const reader = deps.reader();
    const rows = await reader.listVariants(market);
    const bundle = await reader.loadBundle(market, rows.map((r) => r.id));
    return buildCatalogIndex(market, deps.channel, version, rows, bundle);
  }

  async function index(market: MarketCode): Promise<CatalogIndex> {
    return guarded(async () => {
      const cur = indexes.get(market);
      if (cur && now() - cur.checkedAt < ttl) return cur.index;
      const version = versionString(await deps.reader().catalogVersion(market));
      if (cur && cur.index.version === version) {
        cur.checkedAt = now();
        return cur.index;
      }
      let pending = building.get(market);
      if (!pending) {
        pending = rebuild(market, version).finally(() => building.delete(market));
        building.set(market, pending);
      }
      const fresh = await pending;
      indexes.set(market, { index: fresh, checkedAt: now() });
      return fresh;
    });
  }

  return {
    channel: deps.channel,
    index,

    async searchVehicles(market, query, limit = SEARCH_LIMIT) {
      const idx = await index(market);
      const q = normalizeSearch(query);
      const n = Math.max(1, Math.min(limit, SEARCH_LIMIT));
      if (q.length < SEARCH_MIN_CHARS) return { query: q, mode: 'browse', results: idx.options.slice(0, n) };
      const key = `${market}|${idx.version}|${q}|${n}`;
      let results = searchCache.get(key);
      if (!results) {
        // Búsqueda en MySQL (parametrizada, sin acentos) ∩ variants seleccionables del canal → ranking del dominio.
        const ids = await guarded(() => deps.reader().searchVariantIds(market, q));
        results = rankSearchResults(ids.map((id) => idx.byId.get(id)).filter((o): o is VehicleOption => !!o), q).slice(0, n);
        searchCache.set(key, results);
        if (searchCache.size > SEARCH_CACHE_MAX) searchCache.delete(searchCache.keys().next().value!);
      }
      return { query: q, mode: 'search', results };
    },

    async listBrands(market) {
      const counts = new Map<string, number>();
      for (const o of (await index(market)).options) counts.set(o.brand, (counts.get(o.brand) ?? 0) + 1);
      return [...counts].map(([brand, count]) => ({ brand, count })).sort((a, b) => a.brand.localeCompare(b.brand));
    },

    async listModels(market, brand) {
      const counts = new Map<string, number>();
      for (const o of (await index(market)).options) if (normalizeSearch(o.brand) === normalizeSearch(brand)) counts.set(o.model, (counts.get(o.model) ?? 0) + 1);
      return [...counts].map(([model, count]) => ({ model, count })).sort((a, b) => a.model.localeCompare(b.model));
    },

    async getVariantBySlug(market, slug) {
      const idx = await index(market);
      const resolved = await guarded(() => deps.reader().resolveSlug(market, slug));
      const option = resolved && idx.byId.get(resolved.variantId);
      // Existe pero no es seleccionable en este canal (derechos, identidad, calidad) → como si no existiera.
      return option && resolved ? { option, canonicalSlug: resolved.canonicalSlug, viaAlias: resolved.viaAlias } : undefined;
    },

    async getVariantById(market, id) {
      return (await index(market)).byId.get(id);
    },

    async examples(market) {
      const idx = await index(market);
      const bySlug = new Map(idx.options.map((o) => [o.slug, o]));
      return EXAMPLE_PAIRS.flatMap(({ a, b }) => {
        const oa = bySlug.get(a);
        const ob = bySlug.get(b);
        return oa && ob ? [{ a: oa, b: ob }] : [];
      });
    },

    loadBundle(market, ids) {
      return guarded(() => deps.reader().loadBundle(market, ids));
    },
  };
}
