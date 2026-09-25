import { z } from 'zod';
import {
  EEA_DATASET,
  ESIOS_DATASET,
  MITECO_DATASET,
  eeaImportKey,
  esiosImportKey,
  mitecoImportKey,
  mitecoLatestAvailableDate,
  runEeaImport,
  runEsiosImport,
  runMitecoImport,
  type FetchLike,
} from '@vscar/data-connectors';
import { createCatalogRepository, createMarketDataRepository, type VscarDb } from '@vscar/db';
import { checkPlausibility, detectConflicts, evaluateEligibility, overallStatus } from '@vscar/quality';
import type { DatasetBundle } from '@vscar/vehicle-schema';
import { NonRetryableError } from './errors.ts';
import type { Logger } from './logger.ts';

/** Tipos de job (4d: EEA/QUALITY/CONFLICT; 4e: MITECO; 4f: ESIOS). Nuevos tipos solo cuando exista su adapter/engine. */
export const JOB_TYPES = ['EEA_IMPORT', 'QUALITY_CHECK', 'CONFLICT_SCAN', 'MITECO_IMPORT', 'ESIOS_IMPORT'] as const;
export type JobType = (typeof JOB_TYPES)[number];

export interface HandlerContext {
  db: VscarDb;
  logger: Logger;
  rawDir: string;
  eea: { baseUrl: string; timeoutMs: number };
  /** Opcional: sin él se usan los valores por defecto del adapter. */
  miteco?: { baseUrl: string; timeoutMs: number };
  /** Opcional; `token` es secreto (solo cabecera HTTP). */
  esios?: { baseUrl: string; timeoutMs: number; token?: string };
  fetchImpl?: FetchLike;
  now?: () => Date;
  /** Latido para jobs largos. */
  heartbeat: () => Promise<void>;
}

export type Handler = (payload: unknown, ctx: HandlerContext) => Promise<unknown>;

const VariantIds = z.array(z.string().uuid()).min(1).max(500);

export const EeaImportPayload = z
  .object({
    year: z.number().int().min(2010).max(2100),
    status_preference: z.enum(['FINAL_ONLY', 'FINAL_OR_PROVISIONAL', 'PROVISIONAL_ONLY']).default('FINAL_OR_PROVISIONAL'),
    filters: z
      .object({
        memberState: z.string().regex(/^[A-Z]{2}$/),
        make: z.string().min(1).max(64),
        commercialNamePrefix: z.string().max(64).optional(),
        commercialNames: z.array(z.string().max(64)).max(20).optional(),
        engineCapacityCm3: z.number().int().positive().optional(),
        enginePowerKw: z.number().int().positive().optional(),
        fuelMode: z.string().length(1).optional(),
        typeApprovalNumberPrefix: z.string().max(64).optional(),
      })
      .strict(),
    variant_ids: z.array(z.string().uuid()).max(500).default([]),
  })
  .strict();
export type EeaImportPayload = z.infer<typeof EeaImportPayload>;

export const VariantScanPayload = z.object({ variant_ids: VariantIds }).strict();

export const MitecoImportPayload = z
  .object({
    /** Día (hora peninsular) cuyos precios en vigor a las 0:00 se importan. Lo fija quien encola (clave estable). */
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** Subconjunto de provincias INE (solo agregados PROVINCE). Vacío = nacional. */
    provinces: z.array(z.string().regex(/^\d{2}$/)).max(52).default([]),
  })
  .strict();
export type MitecoImportPayload = z.infer<typeof MitecoImportPayload>;

export const mitecoImportIdempotencyKey = (p: MitecoImportPayload): string => mitecoImportKey(p.date, p.provinces);

/** Un día local (Europe/Madrid) por job: la clave es estable y los rangos se encolan como días sueltos. */
export const EsiosImportPayload = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).strict();
export type EsiosImportPayload = z.infer<typeof EsiosImportPayload>;
export const esiosImportIdempotencyKey = (p: EsiosImportPayload): string => esiosImportKey(p.date);

/** Clave de idempotencia de un EEA_IMPORT: eea:<year>:<status>:<query_hash>[:<targets>]. */
export function eeaImportIdempotencyKey(p: EeaImportPayload): string {
  const base = eeaImportKey(p.year, p.status_preference, p.filters);
  if (p.variant_ids.length === 0) return base;
  const targets = [...p.variant_ids].sort().join(',');
  let h = 0;
  for (const ch of targets) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `${base}:t${h.toString(16).padStart(8, '0')}`;
}

function summarize(bundle: DatasetBundle) {
  return bundle.variants.map((variant) => {
    const homologation = bundle.homologations.find((h) => h.id === variant.homologation_id)!;
    const values = bundle.spec_values.filter((v) => v.variant_id === variant.id);
    const prices = bundle.prices.filter((p) => p.variant_id === variant.id);
    const findings = checkPlausibility({ variant, homologation, values });
    const eligibility = evaluateEligibility({ variant, homologation, values, prices });
    const conflicts = detectConflicts(values);
    return { variant, findings, eligibility, conflicts };
  });
}

/** EEA_IMPORT: Worker → adapter → raw_ingest → candidatos DRAFT → quality → conflictos. Sin lógica EEA aquí. */
const eeaImport: Handler = async (payload, ctx) => {
  const p = EeaImportPayload.parse(payload);
  const repo = createCatalogRepository(ctx.db);
  // La fuente S01 la registra la curación; el worker nunca la inventa.
  const source = await repo.findSourceByCode(EEA_DATASET.source_code);
  if (!source) throw new NonRetryableError(`source ${EEA_DATASET.source_code} (EEA) is not registered in sources`);
  const targets = p.variant_ids.length ? await repo.loadBundle(p.variant_ids) : undefined;
  if (targets && targets.variants.length !== p.variant_ids.length) throw new NonRetryableError('some target variants do not exist');

  const result = await runEeaImport({
    year: p.year,
    statusPreference: p.status_preference,
    filters: p.filters,
    targets: (targets?.variants ?? []).map((variant) => ({ variant, homologation: targets!.homologations.find((h) => h.id === variant.homologation_id)! })),
    sourceId: source.id,
    rawDir: ctx.rawDir,
    retrievedAt: (ctx.now?.() ?? new Date()).toISOString().slice(0, 10),
    baseUrl: ctx.eea.baseUrl,
    timeoutMs: ctx.eea.timeoutMs,
    ...(ctx.fetchImpl ? { fetchImpl: ctx.fetchImpl } : {}),
    logger: (event, data) => ctx.logger.log('eea', event, data),
  });
  await ctx.heartbeat();

  await repo.saveRawIngest({ ...result.raw, source_id: source.id });
  const candidates = result.targets.flatMap((t) => t.candidates);
  const inserted = await repo.appendSpecValues(candidates);
  await repo.markRawIngest(result.raw.id, 'IMPORTED');

  const review = targets ? summarize(await repo.loadBundle(p.variant_ids)) : [];
  return {
    dataset: { year: result.dataset.year, status: result.dataset.status, table: result.dataset.table },
    raw_ingest_id: result.raw.id,
    raw_deduplicated: result.raw.deduplicated,
    rows: result.raw.row_count,
    observations: result.observations.length,
    normalization_issues: result.normalization_issues.length,
    targets: result.targets.map((t) => ({ variant_id: t.variant_id, match: t.match.level, candidates: t.candidates.length, issues: t.issues })),
    inserted_values: inserted,
    conflicts: review.map((r) => ({ variant_id: r.variant.id, conflicts: r.conflicts.length, review_required: r.conflicts.some((c) => c.requires_human_review) })),
  };
};

/**
 * MITECO_IMPORT: Worker → adapter MITECO → raw_ingest (.json.gz) → energy_prices (append-only).
 * Una fecha aún no publicada es un error no reintentable (se encola la fecha correcta, no se espera).
 */
const mitecoImport: Handler = async (payload, ctx) => {
  const p = MitecoImportPayload.parse(payload);
  const latest = mitecoLatestAvailableDate(ctx.now?.() ?? new Date());
  if (p.date > latest) throw new NonRetryableError(`MITECO history for ${p.date} is not published yet (latest: ${latest})`);
  if (p.date < MITECO_DATASET.first_history_date) throw new NonRetryableError(`MITECO history starts on ${MITECO_DATASET.first_history_date}`);
  const catalog = createCatalogRepository(ctx.db);
  const source = await catalog.findSourceByCode(MITECO_DATASET.source_code);
  if (!source) throw new NonRetryableError(`source ${MITECO_DATASET.source_code} (MITECO) is not registered in sources`);

  const result = await runMitecoImport({
    date: p.date,
    ...(p.provinces.length ? { provinces: p.provinces } : {}),
    sourceId: source.id,
    rawDir: ctx.rawDir,
    retrievedAt: (ctx.now?.() ?? new Date()).toISOString().slice(0, 10),
    ...(ctx.miteco ? { baseUrl: ctx.miteco.baseUrl, timeoutMs: ctx.miteco.timeoutMs } : {}),
    ...(ctx.fetchImpl ? { fetchImpl: ctx.fetchImpl } : {}),
    logger: (event, data) => ctx.logger.log('miteco', event, data),
  });
  await ctx.heartbeat();
  if (result.invalid.length) throw new NonRetryableError(`MITECO: ${result.invalid.length} aggregate(s) failed schema validation: ${result.invalid.slice(0, 3).join(' | ')}`);

  await catalog.saveRawIngest({ ...result.raw, source_id: source.id });
  const inserted = await createMarketDataRepository(ctx.db).appendEnergyPrices(result.observations);
  await catalog.markRawIngest(result.raw.id, 'IMPORTED');
  const issues = result.normalization_issues.reduce<Record<string, number>>((acc, i) => ((acc[i.kind] = (acc[i.kind] ?? 0) + 1), acc), {});
  return {
    date: p.date,
    observed_at: result.observed_at,
    raw_ingest_id: result.raw.id,
    raw_deduplicated: result.raw.deduplicated,
    stations_total: result.stations_total,
    stations_public: result.stations_public,
    observations: result.observations.length,
    inserted_prices: inserted,
    normalization_issues: issues,
  };
};

/**
 * ESIOS_IMPORT: Worker → adapter ESIOS → raw_ingest → energy_prices (append-only).
 * Día aún no publicado → `NOT_AVAILABLE_YET`, no reintentable (DEAD, igual que MITECO): se vuelve a encolar el día.
 */
const esiosImport: Handler = async (payload, ctx) => {
  const p = EsiosImportPayload.parse(payload);
  const catalog = createCatalogRepository(ctx.db);
  const source = await catalog.findSourceByCode(ESIOS_DATASET.source_code);
  if (!source) throw new NonRetryableError(`source ${ESIOS_DATASET.source_code} (ESIOS) is not registered in sources`);

  const result = await runEsiosImport({
    date: p.date,
    sourceId: source.id,
    rawDir: ctx.rawDir,
    retrievedAt: (ctx.now?.() ?? new Date()).toISOString().slice(0, 10),
    now: ctx.now?.() ?? new Date(),
    ...(ctx.esios ? { baseUrl: ctx.esios.baseUrl, timeoutMs: ctx.esios.timeoutMs, ...(ctx.esios.token ? { token: ctx.esios.token } : {}) } : {}),
    ...(ctx.fetchImpl ? { fetchImpl: ctx.fetchImpl } : {}),
    logger: (event, data) => ctx.logger.log('esios', event, data),
  });
  await ctx.heartbeat();
  if (result.invalid.length) throw new NonRetryableError(`ESIOS: ${result.invalid.length} observation(s) failed schema validation: ${result.invalid.join(' | ')}`);

  await catalog.saveRawIngest({ ...result.raw, source_id: source.id });
  const inserted = await createMarketDataRepository(ctx.db).appendEnergyPrices(result.observations);
  await catalog.markRawIngest(result.raw.id, 'IMPORTED');
  return {
    date: p.date,
    raw_ingest_id: result.raw.id,
    raw_deduplicated: result.raw.deduplicated,
    hours: result.expected_hours,
    daily: result.observations.map((o) => ({ zone: o.scope_code, mean_eur_per_kwh: o.value, min: o.distribution.min, max: o.distribution.max, n: o.distribution.n })),
    inserted_prices: inserted,
    normalization_issues: result.normalization_issues.length,
  };
};

/** QUALITY_CHECK: plausibilidad + elegibilidad. Nunca autocorrige. */
const qualityCheck: Handler = async (payload, ctx) => {
  const p = VariantScanPayload.parse(payload);
  const bundle = await createCatalogRepository(ctx.db).loadBundle(p.variant_ids);
  return {
    variants: summarize(bundle).map((r) => ({
      variant_id: r.variant.id,
      plausibility: overallStatus(r.findings),
      warnings: r.findings.filter((f) => f.status === 'WARNING').length,
      blocks: r.findings.filter((f) => f.status === 'BLOCK').length,
      eligibility: Object.fromEntries(Object.entries(r.eligibility).map(([k, v]) => [k, v.status])),
    })),
  };
};

/** CONFLICT_SCAN: NO_CONFLICT | REVIEW_REQUIRED. No resuelve conflictos oficial vs oficial. */
const conflictScan: Handler = async (payload, ctx) => {
  const p = VariantScanPayload.parse(payload);
  const bundle = await createCatalogRepository(ctx.db).loadBundle(p.variant_ids);
  const rows = summarize(bundle).map((r) => ({
    variant_id: r.variant.id,
    result: r.conflicts.length === 0 ? ('NO_CONFLICT' as const) : ('REVIEW_REQUIRED' as const),
    conflicts: r.conflicts.map((c) => ({ spec_key: c.spec_key, value_ids: c.value_ids, requires_human_review: c.requires_human_review, proposed_value_id: c.proposed_value_id ?? null })),
  }));
  return { result: rows.some((r) => r.result === 'REVIEW_REQUIRED') ? 'REVIEW_REQUIRED' : 'NO_CONFLICT', variants: rows };
};

export const HANDLERS: Readonly<Record<JobType, Handler>> = {
  EEA_IMPORT: eeaImport,
  QUALITY_CHECK: qualityCheck,
  CONFLICT_SCAN: conflictScan,
  MITECO_IMPORT: mitecoImport,
  ESIOS_IMPORT: esiosImport,
};
