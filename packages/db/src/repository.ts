import { eq, inArray, sql } from 'drizzle-orm';
import { DatasetBundle, SpecValue, type DatasetBundleInput, type SpecValueInput } from '@vscar/vehicle-schema';
import type { VscarDb } from './client.ts';
import * as m from './mappers.ts';
import * as t from './schema.ts';

/** Metadatos de un fichero bruto (forma compatible con `RawIngestRecord` de @vscar/data-connectors). */
export interface RawIngestInput {
  id: string;
  source_id: string;
  source_code: string;
  external_id: string;
  query_hash?: string;
  dataset_year?: number;
  dataset_status?: string;
  source_table?: string;
  registry_version?: string;
  adapter_version?: string;
  transformation_version?: number;
  original_filename: string;
  file_path: string;
  payload_hash: string;
  row_count: number;
  request: unknown;
  import_status: 'FETCHED' | 'NORMALIZED' | 'IMPORTED' | 'FAILED';
  retrieved_at: string;
}

/**
 * Repositorio de catálogo. Es la frontera entre MySQL y el dominio:
 * los engines reciben DatasetBundle ya validado y nunca consultan la base de datos (plan §33, ADR-002).
 */
export function createCatalogRepository(db: VscarDb) {
  return {
    /**
     * Guarda un bundle en una transacción. Append-only: los valores con id existente no se sobrescriben
     * (las fuentes compartidas se reutilizan).
     */
    async saveBundle(input: DatasetBundleInput): Promise<void> {
      const bundle = DatasetBundle.parse(input);
      await db.transaction(async (tx) => {
        if (bundle.sources.length) {
          await tx.insert(t.sources).values(bundle.sources.map(m.sourceToRow)).onDuplicateKeyUpdate({ set: { id: sql`id` } });
        }
        if (bundle.homologations.length) await tx.insert(t.homologations).values(bundle.homologations.map(m.homologationToRow));
        if (bundle.variants.length) await tx.insert(t.referenceVariants).values(bundle.variants.map(m.variantToRow));
        if (bundle.spec_values.length) await tx.insert(t.specValues).values(bundle.spec_values.map(m.specValueToRow));
        if (bundle.prices.length) await tx.insert(t.vehiclePrices).values(bundle.prices.map(m.priceToRow));
        if (bundle.incentives.length) await tx.insert(t.incentives).values(bundle.incentives.map(m.incentiveToRow));
        if (bundle.safety_ratings.length) await tx.insert(t.safetyRatings).values(bundle.safety_ratings.map(m.safetyToRow));
      });
    },

    /** Carga las variants indicadas con todo lo que cuelga de ellas y lo valida con el schema v0.2. */
    async loadBundle(variantIds: readonly string[]): Promise<DatasetBundle> {
      if (variantIds.length === 0) return DatasetBundle.parse({ sources: [], homologations: [], variants: [], spec_values: [] });
      const ids = [...variantIds];

      const variants = await db.select().from(t.referenceVariants).where(inArray(t.referenceVariants.id, ids));
      const homologationIds = variants.map((v) => v.homologation_id);
      const [homologations, values, prices, safety] = await Promise.all([
        db.select().from(t.homologations).where(inArray(t.homologations.id, homologationIds)),
        db.select().from(t.specValues).where(inArray(t.specValues.variant_id, ids)),
        db.select().from(t.vehiclePrices).where(inArray(t.vehiclePrices.variant_id, ids)),
        db.select().from(t.safetyRatings).where(inArray(t.safetyRatings.variant_id, ids)),
      ]);
      const sourceIds = [
        ...new Set([...homologations, ...values, ...prices, ...safety].map((r) => r.source_id)),
      ];
      const sources = sourceIds.length ? await db.select().from(t.sources).where(inArray(t.sources.id, sourceIds)) : [];

      const byId = <T extends { id: string }>(xs: T[]) => [...xs].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      return DatasetBundle.parse({
        sources: byId(sources).map(m.sourceFromRow),
        homologations: byId(homologations).map(m.homologationFromRow),
        variants: byId(variants).map(m.variantFromRow),
        spec_values: byId(values).map(m.specValueFromRow),
        prices: byId(prices).map(m.priceFromRow),
        incentives: [],
        safety_ratings: byId(safety).map(m.safetyFromRow),
      });
    },

    /** Registra los metadatos de un fichero bruto (idempotente por hash del contenido). */
    async saveRawIngest(record: RawIngestInput): Promise<void> {
      await db
        .insert(t.rawIngest)
        .values({
          id: record.id,
          source_id: record.source_id,
          source_code: record.source_code,
          external_id: record.external_id,
          query_hash: record.query_hash ?? null,
          dataset_year: record.dataset_year ?? null,
          dataset_status: record.dataset_status ?? null,
          source_table: record.source_table ?? null,
          registry_version: record.registry_version ?? null,
          adapter_version: record.adapter_version ?? null,
          transformation_version: record.transformation_version ?? null,
          original_filename: record.original_filename,
          file_path: record.file_path,
          payload_hash: record.payload_hash,
          row_count: record.row_count,
          request: record.request,
          import_status: record.import_status,
          retrieved_at: record.retrieved_at,
        })
        .onDuplicateKeyUpdate({ set: { id: sql`id` } });
    },

    async markRawIngest(id: string, status: RawIngestInput['import_status'], error?: string): Promise<void> {
      await db
        .update(t.rawIngest)
        .set({ import_status: status, error: error ?? null, ...(status === 'IMPORTED' ? { imported_at: sql`CURRENT_TIMESTAMP` } : {}) })
        .where(eq(t.rawIngest.id, id));
    },

    async getRawIngest(id: string) {
      const [row] = await db.select().from(t.rawIngest).where(eq(t.rawIngest.id, id));
      return row;
    },

    /**
     * Añade valores (p. ej. candidatos DRAFT de un adapter) a variants existentes. Append-only e idempotente:
     * un id ya existente no se sobrescribe. Cada valor se valida contra el schema v0.2.
     */
    async appendSpecValues(values: readonly SpecValueInput[]): Promise<number> {
      const parsed = values.map((v) => SpecValue.parse(v));
      if (parsed.length === 0) return 0;
      // Solo se insertan ids nuevos: un valor existente nunca se sobrescribe (y el recuento es real).
      const existing = new Set(
        (await db.select({ id: t.specValues.id }).from(t.specValues).where(inArray(t.specValues.id, parsed.map((v) => v.id)))).map((r) => r.id),
      );
      const fresh = parsed.filter((v) => !existing.has(v.id));
      if (fresh.length === 0) return 0;
      await db.insert(t.specValues).values(fresh.map(m.specValueToRow)).onDuplicateKeyUpdate({ set: { id: sql`id` } });
      return fresh.length;
    },

    /** Fuente registrada por código de la DATA_RIGHTS_MATRIX (p. ej. 'S01' = EEA). */
    async findSourceByCode(code: string) {
      const rows = await db.select().from(t.sources).where(eq(t.sources.code, code));
      return rows.sort((a, b) => (a.id < b.id ? -1 : 1))[0];
    },

    /** Variants técnicas que comparten denominación comercial (ADR-007). */
    async variantIdsByCommercialGroup(groupKey: string): Promise<string[]> {
      const rows = await db
        .select({ id: t.referenceVariants.id })
        .from(t.referenceVariants)
        .where(sql`${t.referenceVariants.commercial_group_key} = ${groupKey}`);
      return rows.map((r) => r.id).sort();
    },
  };
}

export type CatalogRepository = ReturnType<typeof createCatalogRepository>;
