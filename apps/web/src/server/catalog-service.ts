import 'server-only';
import type { CatalogReader, CatalogRow, CatalogVersion } from '@vscar/db';
import {
  availableIn,
  detectConflicts,
  engineUsability,
  filterBundleForChannel,
  publicationInputFromBundle,
  selectModelMedia,
  variantAvailability,
  type PublicationChannel,
  type VariantAvailability,
} from '@vscar/quality';
import { isValidAt, type DatasetBundle, type MediaRole, type VehicleModelMedia } from '@vscar/vehicle-schema';
import {
  browseOrder,
  commercialVariant,
  EXAMPLE_PAIRS,
  normalizeSearch,
  rankSearchResults,
  SEARCH_LIMIT,
  SEARCH_MIN_CHARS,
  type BrandOption,
  type MediaView,
  type ModelCard,
  type VariantRow,
  type VehicleOption,
  type YearOption,
} from '@/domain/catalog';
import {
  collapsedOption,
  EQUIVALENCE_KEYS,
  groupEquivalent,
  representative,
  resolveSelection,
  yearAllowed,
  type EquivalenceKey,
  type FactValue,
  type Resolution,
  type ResolutionCandidate,
  type SelectionAvailability,
  type YearBasis,
} from '@/domain/model-selection';
import type { MarketCode } from '@/i18n/locales';
import type { DiscoveryEntry } from './catalog-discovery';
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
  /** Potencia máxima por variant (solo valores usables, publicables en el canal y sin conflicto). */
  powerById: Map<string, { min: number; max: number }>;
  /** Registros de media de las marcas del catálogo (sin filtrar: el canal se aplica al elegir). */
  media: VehicleModelMedia[];
  /** D1.8: datos para la resolución técnica interna (hechos usables, publicables en el canal y sin conflicto). */
  candidateById: Map<string, ResolutionCandidate>;
  /** D1.8: variant → representante de su grupo equivalente (ella misma si no está agrupada). */
  representativeById: Map<string, string>;
}

const versionString = (v: CatalogVersion) => `${v.variants}.${v.values}.${v.prices}.${v.media}@${v.lastChange ?? '-'}`;

/**
 * Potencia para la fila de versión: un dato de presentación, no de cálculo. Solo se muestra si es publicable en el
 * canal, usable por los engines, vigente en la fecha de referencia y sin conflicto (Golf eTSI: 110 vs 85 kW en
 * conflicto → no se muestra ninguno). Nunca se elige un valor en conflicto para la UI.
 */
function powerOf(visible: DatasetBundle, variantId: string, at: string | undefined): { min: number; max: number } | undefined {
  const values = visible.spec_values.filter((v) => v.variant_id === variantId && v.spec_key === 'perf.power_max_kw');
  const conflicted = new Set(detectConflicts(values).flatMap((c) => c.value_ids));
  const v = values.find((x) => !conflicted.has(x.id) && engineUsability(x).usable && isValidAt(x, at));
  if (!v) return undefined;
  if (typeof v.value === 'number') return { min: v.value, max: v.value };
  if (typeof v.value_min === 'number' && typeof v.value_max === 'number') return { min: v.value_min, max: v.value_max };
  return undefined;
}

/** Imagen autorizada para el canal → DTO del cliente. Solo assets locales en Alpha (las URL externas fallan cerrado). */
export function mediaView(records: readonly VehicleModelMedia[], q: { brand: string; model: string; generation?: string | null; modelYear?: number | null; role: MediaRole; channel: PublicationChannel }): MediaView | undefined {
  const c = selectModelMedia(records, q);
  const m = c.media;
  if (!m || c.match === 'FALLBACK' || !m.asset_path) return undefined;
  return { src: m.asset_path, width: m.width, height: m.height, alt: m.alt, match: c.match, ...(m.attribution ? { attribution: m.attribution } : {}), ...(c.previewOnly ? { preview: true } : {}) };
}

/** Índice puro a partir de filas + bundle: testable sin servidor. */
export function buildCatalogIndex(market: MarketCode, channel: PublicationChannel, version: string, rows: readonly CatalogRow[], bundle: DatasetBundle, media: readonly VehicleModelMedia[] = []): CatalogIndex {
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
  // Dentro de un grupo, cada distintivo solo se muestra si DIFIERE entre sus miembros: periodo y/o ciclo.
  const members = new Map<string, CatalogRow[]>();
  for (const o of base) members.set(groupKey(o), [...(members.get(groupKey(o)) ?? []), rowById.get(o.id)!]);
  const periodOf = (r: CatalogRow) => `${r.homologation_valid_from}|${r.homologation_valid_to ?? ''}`;
  const options = browseOrder(
    base.map((o) => {
      const group = members.get(groupKey(o)) ?? [];
      if (group.length < 2) return o;
      const r = rowById.get(o.id)!;
      const periods = new Set(group.map(periodOf)).size > 1;
      const cycles = new Set(group.map((x) => x.homologation_test_cycle)).size > 1;
      return {
        ...o,
        ...(periods || !cycles ? { period: { from: r.homologation_valid_from, ...(r.homologation_valid_to ? { to: r.homologation_valid_to } : {}) } } : {}),
        ...(cycles ? { cycle: r.homologation_test_cycle } : {}),
      };
    }),
  );
  const visible = filterBundleForChannel(bundle, channel);
  const powerById = new Map<string, { min: number; max: number }>();
  for (const o of options) {
    const pw = powerOf(visible, o.id, variantReferenceDate(rowById.get(o.id)!));
    if (pw) powerById.set(o.id, pw);
  }
  const candidateById = new Map<string, ResolutionCandidate>();
  for (const o of options) {
    const r = rowById.get(o.id)!;
    candidateById.set(o.id, {
      option: o,
      fuel: bundle.variants.find((v) => v.id === o.id)?.technical.fuel_type ?? null,
      transmission: r.transmission,
      drivetrain: r.drivetrain,
      homologationCycle: r.homologation_test_cycle,
      identityConfidence: r.identification_confidence,
      homologationFrom: r.homologation_valid_from,
      facts: factsOf(visible, o.id, variantReferenceDate(r)),
    });
  }
  // Grupos equivalentes por marca/modelo/año (misma regla que la resolución): la búsqueda directa muestra uno por grupo.
  const representativeById = new Map<string, string>();
  const byModelYear = new Map<string, ResolutionCandidate[]>();
  for (const c of candidateById.values()) {
    const k = normalizeSearch(`${c.option.brand}|${c.option.model}|${c.option.year}`);
    byModelYear.set(k, [...(byModelYear.get(k) ?? []), c]);
  }
  for (const cands of byModelYear.values()) for (const g of groupEquivalent(cands)) for (const m of g) representativeById.set(m.option.id, representative(g).option.id);
  return { market, channel, version, options, byId: new Map(options.map((o) => [o.id, o])), rowById, availability, excluded: rows.length - options.length, powerById, media: [...media], candidateById, representativeById };
}

/** Opciones para la búsqueda directa: una por grupo equivalente (su representante, sin ciclo ni periodo). */
export function searchableOptions(idx: CatalogIndex, options: readonly VehicleOption[]): VehicleOption[] {
  const seen = new Set<string>();
  const out: VehicleOption[] = [];
  for (const o of options) {
    const repId = idx.representativeById.get(o.id) ?? o.id;
    if (seen.has(repId)) continue;
    seen.add(repId);
    const rep = idx.byId.get(repId)!;
    const grouped = [...idx.representativeById.values()].filter((x) => x === repId).length > 1;
    out.push(grouped ? collapsedOption(rep) : rep);
  }
  return out;
}

/** Hechos de equivalencia de una variant: solo usables, publicables en el canal, vigentes y sin conflicto; por ciclo. */
function factsOf(visible: DatasetBundle, variantId: string, at: string | undefined): Partial<Record<EquivalenceKey, FactValue[]>> {
  const out: Partial<Record<EquivalenceKey, FactValue[]>> = {};
  for (const key of EQUIVALENCE_KEYS) {
    const values = visible.spec_values.filter((v) => v.variant_id === variantId && v.spec_key === key);
    const conflicted = new Set(detectConflicts(values).flatMap((c) => c.value_ids));
    const facts: FactValue[] = [];
    for (const v of values) {
      if (conflicted.has(v.id) || !engineUsability(v).usable || !isValidAt(v, at)) continue;
      const range = typeof v.value === 'number' ? { min: v.value, max: v.value } : typeof v.value_min === 'number' && typeof v.value_max === 'number' ? { min: v.value_min, max: v.value_max } : undefined;
      if (range && !facts.some((f) => f.cycle === (v.test_cycle ?? null) && f.min === range.min && f.max === range.max)) facts.push({ cycle: v.test_cycle ?? null, ...range });
    }
    if (facts.length) out[key] = facts;
  }
  return out;
}

const same = (a: string, b: string) => normalizeSearch(a) === normalizeSearch(b);
const uniq = <T,>(xs: T[]) => [...new Set(xs)];
/** Años modelo, más reciente primero; el desconocido (`null`) al final. */
const yearOrder = (a: number | null, b: number | null) => (a === null ? 1 : b === null ? -1 : b - a);

/** Descubrimiento (D1.8): homologaciones técnicas agregadas; vacío en PUBLIC. */
export interface Discovery {
  entries: readonly DiscoveryEntry[];
  currentYear: number;
}
const NO_DISCOVERY: Discovery = { entries: [], currentYear: 9999 };

/** Nombre a mostrar entre grafías equivalentes: la del catálogo seleccionable si existe; si no, la de la fuente. */
const displayName = (preferred: readonly string[], all: readonly string[]) => [...(preferred.length ? preferred : all)].sort((a, b) => a.localeCompare(b))[0]!;

export function brandsOf(idx: CatalogIndex, d: Discovery = NO_DISCOVERY): BrandOption[] {
  const brands = new Map<string, { names: Set<string>; selectableNames: Set<string>; models: Set<string>; comparable: boolean }>();
  const add = (brand: string, model: string, comparable: boolean) => {
    const k = normalizeSearch(brand);
    const cur = brands.get(k) ?? { names: new Set<string>(), selectableNames: new Set<string>(), models: new Set<string>(), comparable: false };
    cur.names.add(brand);
    if (comparable) cur.selectableNames.add(brand);
    cur.models.add(normalizeSearch(model));
    cur.comparable ||= comparable;
    brands.set(k, cur);
  };
  for (const o of idx.options) add(o.brand, o.model, true);
  for (const e of d.entries) add(e.brand, e.model, false);
  return [...brands.values()]
    .map((b) => ({ brand: displayName([...b.selectableNames], [...b.names]), models: b.models.size, availability: (b.comparable ? 'COMPARISON_ELIGIBLE' : 'CATALOG_DISCOVERABLE') as SelectionAvailability }))
    .sort((a, b) => a.brand.localeCompare(b.brand));
}

/** Una tarjeta por MODELO (nunca una por variant ni por homologación), con sus años y su imagen autorizada. */
export function modelsOf(idx: CatalogIndex, brand: string, d: Discovery = NO_DISCOVERY): ModelCard[] {
  const groups = new Map<string, VehicleOption[]>();
  for (const o of idx.options) if (same(o.brand, brand)) groups.set(normalizeSearch(o.model), [...(groups.get(normalizeSearch(o.model)) ?? []), o]);
  const technical = new Map<string, DiscoveryEntry[]>();
  for (const e of d.entries) if (same(e.brand, brand)) technical.set(normalizeSearch(e.model), [...(technical.get(normalizeSearch(e.model)) ?? []), e]);
  const cards: ModelCard[] = [...groups.values()].map((opts) => {
    const rows = opts.map((o) => idx.rowById.get(o.id)!);
    const generations = uniq(rows.map((r) => r.generation_code)).sort();
    const bodies = rows.map((r) => r.body_type);
    const bodyType = [...new Set(bodies)].sort((a, b) => bodies.filter((x) => x === b).length - bodies.filter((x) => x === a).length)[0]!;
    const model = opts[0]!.model;
    // Una sola generación → su imagen exacta; varias → imagen del modelo (o silueta), nunca la de una generación.
    const media = mediaView(idx.media, { brand: opts[0]!.brand, model, generation: generations.length === 1 ? generations[0] : null, role: 'SELECTOR', channel: idx.channel });
    return {
      brand: opts[0]!.brand,
      model,
      generations,
      years: yearsOf(idx, brand, model, d).map((y) => y.year),
      bodyType,
      ...(media ? { media } : {}),
      ...(opts.every((o) => o.preview) ? { preview: true } : {}),
      availability: 'COMPARISON_ELIGIBLE' as const,
    };
  });
  for (const [key, entries] of technical) {
    if (groups.has(key)) continue;
    const model = displayName([], entries.map((e) => e.model));
    const brandName = displayName([], entries.map((e) => e.brand));
    const media = mediaView(idx.media, { brand: brandName, model, generation: null, role: 'SELECTOR', channel: idx.channel });
    cards.push({ brand: brandName, model, generations: [], years: yearsOf(idx, brand, model, d).map((y) => y.year), bodyType: 'unknown', ...(media ? { media } : {}), preview: true, availability: 'CATALOG_DISCOVERABLE' });
  }
  return cards.sort((a, b) => a.model.localeCompare(b.model));
}

/**
 * Años del modelo (D1.8): año-modelo declarado de las variants seleccionables + matriculación observada de las
 * homologaciones técnicas, cada uno con su base; nunca años futuros sin respaldo (`yearAllowed`).
 */
export function yearsOf(idx: CatalogIndex, brand: string, model: string, d: Discovery = NO_DISCOVERY): YearOption[] {
  const byYear = new Map<number | null, { generations: string[]; basis: Set<YearBasis>; comparable: boolean }>();
  const at = (y: number | null) => byYear.get(y) ?? { generations: [], basis: new Set<YearBasis>(), comparable: false };
  for (const o of idx.options) {
    if (!same(o.brand, brand) || !same(o.model, model)) continue;
    if (o.year !== null && !yearAllowed(o.year, 'MODEL_YEAR', d.currentYear)) continue;
    const cur = at(o.year);
    byYear.set(o.year, { generations: uniq([...cur.generations, idx.rowById.get(o.id)!.generation_code]), basis: cur.basis.add('MODEL_YEAR'), comparable: true });
  }
  for (const e of d.entries) {
    if (!same(e.brand, brand) || !same(e.model, model)) continue;
    for (const y of e.years) {
      if (!yearAllowed(y, 'REGISTRATION_OBSERVED', d.currentYear)) continue;
      const cur = at(y);
      byYear.set(y, { ...cur, basis: cur.basis.add('REGISTRATION_OBSERVED') });
    }
  }
  return [...byYear]
    .map(([year, v]) => ({ year, generations: v.generations.sort(), basis: [...v.basis].sort(), availability: (v.comparable ? 'COMPARISON_ELIGIBLE' : 'CATALOG_DISCOVERABLE') as SelectionAvailability }))
    .sort((a, b) => yearOrder(a.year, b.year));
}

/** Resolución técnica interna de una marca + modelo + año (ADR-020): nunca elige una variante arbitraria. */
export function configurationsOf(idx: CatalogIndex, brand: string, model: string, year: number | null, d: Discovery = NO_DISCOVERY): Resolution {
  const cands = idx.options.filter((o) => same(o.brand, brand) && same(o.model, model) && o.year === year).map((o) => idx.candidateById.get(o.id)!);
  const technical = year === null ? [] : d.entries.filter((e) => same(e.brand, brand) && same(e.model, model) && e.years.includes(year)).map((e) => e.config);
  return resolveSelection(cands, technical);
}

/** Versiones de un modelo y año: cada fila apunta a UNA ReferenceVariant; nunca se fusionan identidades técnicas. */
export function variantsOf(idx: CatalogIndex, brand: string, model: string, year: number | null): VariantRow[] {
  return idx.options
    .filter((o) => same(o.brand, brand) && same(o.model, model) && o.year === year)
    .map((o): VariantRow => {
      const r = idx.rowById.get(o.id)!;
      const power = idx.powerById.get(o.id);
      const media = mediaView(idx.media, { brand: o.brand, model: o.model, generation: r.generation_code, modelYear: o.year, role: 'THUMBNAIL', channel: idx.channel });
      return {
        ...o,
        ...(power ? { powerKw: power } : {}),
        transmission: r.transmission,
        drivetrain: r.drivetrain,
        generation: r.generation_code,
        ...(media ? { media } : {}),
        // Detalle técnico SOLO en vista previa (metodología/depuración): nunca llega a un cliente PUBLIC.
        ...(idx.channel === 'PREVIEW'
          ? {
              identity: {
                referenceVariantId: o.id,
                status: r.identification_confidence,
                ...(r.type_approval_number ? { tan: r.type_approval_number } : {}),
                ...(r.variant_code ? { va: r.variant_code } : {}),
                ...(r.version_code ? { ve: r.version_code } : {}),
              },
            }
          : {}),
      };
    })
    .sort((a, b) => a.variant.localeCompare(b.variant) || (a.period?.from ?? '').localeCompare(b.period?.from ?? '') || a.slug.localeCompare(b.slug));
}

export interface SearchResult {
  query: string;
  /** `browse` = sin texto suficiente: primeras opciones por marca/modelo/año. */
  mode: 'search' | 'browse';
  /** Opción + miniatura ligera autorizada para el canal (nunca hero). */
  results: (VehicleOption & { media?: MediaView })[];
}

export interface VehicleCatalogService {
  channel: PublicationChannel;
  index(market: MarketCode): Promise<CatalogIndex>;
  searchVehicles(market: MarketCode, query: string, limit?: number): Promise<SearchResult>;
  listBrands(market: MarketCode): Promise<BrandOption[]>;
  listModels(market: MarketCode, brand: string): Promise<ModelCard[]>;
  listModelYears(market: MarketCode, brand: string, model: string): Promise<YearOption[]>;
  listVariants(market: MarketCode, brand: string, model: string, year: number | null): Promise<VariantRow[]>;
  /** D1.8: resolución técnica interna de marca + modelo + año (sin elegir nunca una variante arbitraria). */
  listConfigurations(market: MarketCode, brand: string, model: string, year: number | null): Promise<Resolution>;
  getVariantBySlug(market: MarketCode, slug: string): Promise<{ option: VehicleOption; canonicalSlug: string; viaAlias: boolean } | undefined>;
  getVariantById(market: MarketCode, id: string): Promise<VehicleOption | undefined>;
  examples(market: MarketCode): Promise<{ a: VehicleOption; b: VehicleOption }[]>;
  loadBundle(market: MarketCode, ids: readonly string[]): Promise<DatasetBundle>;
}

export function createVehicleCatalogService(deps: {
  reader: () => CatalogReader;
  channel: PublicationChannel;
  ttlMs?: number;
  now?: () => number;
  /** D1.8: homologaciones técnicas agregadas (solo se consultan en PREVIEW). */
  discovery?: (market: MarketCode, currentYear: number) => Promise<readonly DiscoveryEntry[]>;
}): VehicleCatalogService {
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
    const [bundle, media] = await Promise.all([reader.loadBundle(market, rows.map((r) => r.id)), reader.listModelMedia([...new Set(rows.map((r) => r.manufacturer))])]);
    return buildCatalogIndex(market, deps.channel, version, rows, bundle, media);
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

  /** Descubrimiento del canal: nunca en PUBLIC; si la capa técnica no responde, el selector sigue con lo seleccionable. */
  async function discovery(market: MarketCode): Promise<Discovery> {
    const currentYear = new Date(now()).getUTCFullYear();
    if (deps.channel !== 'PREVIEW' || !deps.discovery) return { entries: [], currentYear };
    try {
      return { entries: await deps.discovery(market, currentYear), currentYear };
    } catch (e) {
      console.error('[catalog] discovery unavailable:', e instanceof Error ? e.message : e);
      return { entries: [], currentYear };
    }
  }

  return {
    channel: deps.channel,
    index,

    async searchVehicles(market, query, limit = SEARCH_LIMIT) {
      const idx = await index(market);
      const q = normalizeSearch(query);
      const n = Math.max(1, Math.min(limit, SEARCH_LIMIT));
      const withThumb = (o: VehicleOption) => {
        const media = mediaView(idx.media, { brand: o.brand, model: o.model, generation: idx.rowById.get(o.id)?.generation_code ?? null, modelYear: o.year, role: 'THUMBNAIL', channel: idx.channel });
        return media ? { ...o, media } : o;
      };
      if (q.length < SEARCH_MIN_CHARS) return { query: q, mode: 'browse', results: searchableOptions(idx, idx.options).slice(0, n).map(withThumb) };
      const key = `${market}|${idx.version}|${q}|${n}`;
      let results = searchCache.get(key);
      if (!results) {
        // Búsqueda en MySQL (parametrizada, sin acentos) ∩ variants seleccionables del canal → ranking del dominio.
        const ids = await guarded(() => deps.reader().searchVariantIds(market, q));
        results = searchableOptions(idx, rankSearchResults(ids.map((id) => idx.byId.get(id)).filter((o): o is VehicleOption => !!o), q)).slice(0, n);
        searchCache.set(key, results);
        if (searchCache.size > SEARCH_CACHE_MAX) searchCache.delete(searchCache.keys().next().value!);
      }
      return { query: q, mode: 'search', results: results.map(withThumb) };
    },

    async listBrands(market) {
      return brandsOf(await index(market), await discovery(market));
    },

    async listModels(market, brand) {
      return modelsOf(await index(market), brand, await discovery(market));
    },

    async listModelYears(market, brand, model) {
      return yearsOf(await index(market), brand, model, await discovery(market));
    },

    async listConfigurations(market, brand, model, year) {
      return configurationsOf(await index(market), brand, model, year, await discovery(market));
    },

    async listVariants(market, brand, model, year) {
      return variantsOf(await index(market), brand, model, year);
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
