import { and, count, eq, inArray, max, sql, type SQL } from 'drizzle-orm';
import { VehicleModelMedia, type DatasetBundle } from '@vscar/vehicle-schema';
import type { VscarDb } from './client.ts';
import { loadBundleFrom } from './repository.ts';
import * as t from './schema.ts';

/**
 * Lector del catálogo para la web (Step 7b). SOLO lectura: no hay ninguna operación de escritura en este puerto,
 * así el selector nunca puede editar el catálogo. Todas las consultas reciben el mercado explícitamente.
 * La elegibilidad pública (derechos, identidad, calidad) NO se decide aquí: es dominio (`@vscar/quality`).
 */

/** Fila ligera para índice y búsqueda: identidad comercial + lo mínimo de la técnica. Sin specs. */
export interface CatalogRow {
  id: string;
  market_code: string;
  slug: string;
  commercial_group_key: string;
  manufacturer: string;
  model: string;
  generation_code: string;
  facelift: string | null;
  trim_name: string;
  commercial_name: string;
  model_year: number;
  body_type: string;
  powertrain_type: string;
  drivetrain: string;
  transmission: string;
  sales_start: string | null;
  sales_end: string | null;
  status: string;
  homologation_valid_from: string;
  homologation_valid_to: string | null;
  /** Ciclo de homologación (NEDC, WLTP…): distingue variants técnicas con el mismo nombre comercial (ADR-007). */
  homologation_test_cycle: string;
  /** Identidad técnica (ADR-007): solo para el detalle técnico de vista previa/metodología, nunca para el usuario. */
  identification_confidence: string;
  type_approval_number: string | null;
  variant_code: string | null;
  version_code: string | null;
}

export interface SlugResolution {
  variantId: string;
  /** Slug canónico actual de la variant. */
  canonicalSlug: string;
  /** true si se resolvió por un alias (la web debe redirigir al canónico). */
  viaAlias: boolean;
}

/** Huella del catálogo de un mercado: cambia si cambia cualquier fila (datos append-only). Clave de caché. */
export interface CatalogVersion {
  variants: number;
  values: number;
  prices: number;
  media: number;
  lastChange: string | null;
}

export const SEARCH_MAX_QUERY = 100;
export const SEARCH_MAX_TOKENS = 6;

/** Escapa los comodines de LIKE: la consulta del usuario es texto literal, nunca un patrón. */
const likeLiteral = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Campos buscables (Step 7b §34): sin códigos de homologación. Comparación sin acentos ni mayúsculas. */
const SEARCH_TEXT = sql`CONCAT_WS(' ', ${t.referenceVariants.manufacturer}, ${t.referenceVariants.model}, ${t.referenceVariants.commercial_name}, ${t.referenceVariants.trim_name}, ${t.referenceVariants.generation_code}, ${t.referenceVariants.facelift}, ${t.referenceVariants.model_year}, ${t.referenceVariants.powertrain_type}) COLLATE utf8mb4_0900_ai_ci`;

export function createCatalogReader(db: VscarDb) {
  const rv = t.referenceVariants;
  const columns = {
    id: rv.id,
    market_code: rv.market_code,
    slug: rv.slug,
    commercial_group_key: rv.commercial_group_key,
    manufacturer: rv.manufacturer,
    model: rv.model,
    generation_code: rv.generation_code,
    facelift: rv.facelift,
    trim_name: rv.trim_name,
    commercial_name: rv.commercial_name,
    model_year: rv.model_year,
    body_type: rv.body_type,
    powertrain_type: rv.powertrain_type,
    drivetrain: rv.drivetrain,
    transmission: rv.transmission,
    sales_start: rv.sales_start,
    sales_end: rv.sales_end,
    status: rv.status,
    homologation_valid_from: t.homologations.valid_from,
    homologation_valid_to: t.homologations.valid_to,
    homologation_test_cycle: t.homologations.test_cycle,
    identification_confidence: t.homologations.identification_confidence,
    type_approval_number: t.homologations.type_approval_number,
    variant_code: t.homologations.variant_code,
    version_code: t.homologations.version_code,
  };
  const base = () => db.select(columns).from(rv).innerJoin(t.homologations, eq(t.homologations.id, rv.homologation_id));

  return {
    /** Todas las variants del mercado (ligeras), ordenadas de forma estable. */
    async listVariants(market: string): Promise<CatalogRow[]> {
      return base().where(eq(rv.market_code, market)).orderBy(rv.manufacturer, rv.model, rv.model_year, rv.slug);
    },

    async getVariantsByIds(market: string, ids: readonly string[]): Promise<CatalogRow[]> {
      if (ids.length === 0) return [];
      return base().where(and(eq(rv.market_code, market), inArray(rv.id, [...ids])));
    },

    /**
     * Ids cuyo texto contiene TODOS los términos (AND), sin acentos ni mayúsculas. Parametrizado: cada término
     * es un parámetro de LIKE con comodines escapados. El ranking y la elegibilidad se aplican fuera (dominio).
     */
    async searchVariantIds(market: string, query: string, limit = 200): Promise<string[]> {
      const tokens = query.slice(0, SEARCH_MAX_QUERY).trim().split(/\s+/).filter(Boolean).slice(0, SEARCH_MAX_TOKENS);
      const conditions: SQL[] = [eq(rv.market_code, market), ...tokens.map((tok) => sql`${SEARCH_TEXT} LIKE ${`%${likeLiteral(tok)}%`}`)];
      const rows = await db
        .select({ id: rv.id })
        .from(rv)
        .where(and(...conditions))
        .orderBy(rv.manufacturer, rv.model, rv.model_year, rv.slug)
        .limit(limit);
      return rows.map((r) => r.id);
    },

    /** Resuelve un slug del mercado: canónico o alias. Un slug de otro mercado no existe aquí. */
    async resolveSlug(market: string, slug: string): Promise<SlugResolution | undefined> {
      const [direct] = await db.select({ id: rv.id, slug: rv.slug }).from(rv).where(and(eq(rv.market_code, market), eq(rv.slug, slug)));
      if (direct) return { variantId: direct.id, canonicalSlug: direct.slug, viaAlias: false };
      const [alias] = await db
        .select({ id: rv.id, slug: rv.slug })
        .from(t.variantSlugAliases)
        .innerJoin(rv, eq(rv.id, t.variantSlugAliases.variant_id))
        .where(and(eq(t.variantSlugAliases.market_code, market), eq(t.variantSlugAliases.slug, slug), eq(rv.market_code, market)));
      return alias ? { variantId: alias.id, canonicalSlug: alias.slug, viaAlias: true } : undefined;
    },

    /** Bundle completo (specs, precios, seguridad, fuentes) de las variants pedidas del mercado. */
    async loadBundle(market: string, ids: readonly string[]): Promise<DatasetBundle> {
      const inMarket = ids.length ? (await db.select({ id: rv.id }).from(rv).where(and(eq(rv.market_code, market), inArray(rv.id, [...ids])))).map((r) => r.id) : [];
      return loadBundleFrom(db, inMarket);
    },

    /**
     * Media de modelo (Step 7b.2). Devuelve TODOS los registros válidos de las marcas pedidas; qué se puede mostrar en
     * cada canal lo decide el dominio (`selectModelMedia`), nunca la consulta. Registros inválidos se descartan.
     */
    async listModelMedia(brands?: readonly string[]): Promise<VehicleModelMedia[]> {
      const m = t.vehicleModelMedia;
      const rows = await db
        .select()
        .from(m)
        .where(brands?.length ? inArray(m.brand, [...brands]) : undefined)
        .orderBy(m.brand, m.model, m.id);
      return rows.flatMap((r) => {
        const parsed = VehicleModelMedia.safeParse(
          Object.fromEntries(Object.entries(r).filter(([k, v]) => v !== null && k !== 'created_at' && k !== 'updated_at')),
        );
        return parsed.success ? [parsed.data] : [];
      });
    },

    async catalogVersion(market: string): Promise<CatalogVersion> {
      const [v] = await db.select({ n: count(), last: max(rv.created_at) }).from(rv).where(eq(rv.market_code, market));
      const [sv] = await db.select({ n: count(), last: max(t.specValues.created_at) }).from(t.specValues).innerJoin(rv, eq(rv.id, t.specValues.variant_id)).where(eq(rv.market_code, market));
      const [p] = await db.select({ n: count(), last: max(t.vehiclePrices.created_at) }).from(t.vehiclePrices).innerJoin(rv, eq(rv.id, t.vehiclePrices.variant_id)).where(eq(rv.market_code, market));
      const [md] = await db.select({ n: count(), last: max(t.vehicleModelMedia.updated_at) }).from(t.vehicleModelMedia);
      const lasts = [v?.last, sv?.last, p?.last, md?.last].filter((x): x is string => typeof x === 'string').sort();
      return { variants: v?.n ?? 0, values: sv?.n ?? 0, prices: p?.n ?? 0, media: md?.n ?? 0, lastChange: lasts.at(-1) ?? null };
    },
  };
}

export type CatalogReader = ReturnType<typeof createCatalogReader>;
