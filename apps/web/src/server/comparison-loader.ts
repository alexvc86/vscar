import 'server-only';
import { comparisonCandidateFromBundle } from '@vscar/comparison-engine';
import { economicVehicleInputFromBundle } from '@vscar/economics-engine';
import { filterBundleForChannel, RIGHTS_MATRIX_VERSION, SOURCE_RIGHTS, sourcePublication } from '@vscar/quality';
import { distinctShortNames, LEGACY_PAIRS, pairSlug, parsePairSlug, type VehicleOption } from '@/domain/catalog';
import type { ComparisonData, ComparisonVehicle, SourceInfo } from '@/domain/comparison-data';
import { computeDecision } from '@/domain/decision';
import type { Scenario } from '@/domain/scenario';
import { ALL_NEW, hasUsed, pairConditionsKey, sohApplies, type PairConditions, type SideCondition } from '@/domain/used-params';
import { toUsedInstance, usedSubjectId } from '@/domain/used-subject';
import type { DecisionView } from '@/domain/view-model';
import type { MarketCode } from '@/i18n/locales';
import { vehicleCatalog } from './catalog';
import { variantReferenceDate, type VehicleCatalogService } from './catalog-service';
import { marketEnergy } from './energy';
import { serverDecisionView } from './server-decision';

/**
 * Orquestación de una comparación (Step 7b §47): par de slugs → dos ReferenceVariants SELECCIONABLES del mercado
 * → bundle desde MySQL → campos no publicables eliminados (canal) → adapters existentes de los engines
 * (`comparisonCandidateFromBundle`, `economicVehicleInputFromBundle`) → `ComparisonData` serializable.
 * Nunca hay fallback silencioso a otro vehículo: slug inválido, variant no seleccionable u otro mercado → 404.
 */
export type ComparisonLoad =
  | { kind: 'ok'; data: ComparisonData; ms: number; timings: LoadTimings }
  | { kind: 'redirect'; pairSlug: string }
  | { kind: 'not-found'; reason: 'INVALID_PAIR' | 'UNKNOWN_VEHICLE' | 'SAME_VEHICLE' };

/** Desglose del coste de carga (Step 7b §122). `cached` = datos del par ya resueltos con el mismo snapshot. */
export interface LoadTimings {
  lookupMs: number;
  bundleMs: number;
  adaptMs: number;
  cached: boolean;
}

const MAX = 100;
const cache = new Map<string, ComparisonData>();

export async function loadComparisonData(market: MarketCode, slug: string, catalog: VehicleCatalogService = vehicleCatalog(), conditions: PairConditions = ALL_NEW): Promise<ComparisonLoad> {
  const t0 = performance.now();
  const legacy = LEGACY_PAIRS[slug];
  if (legacy) return { kind: 'redirect', pairSlug: legacy };
  const pair = parsePairSlug(slug);
  if (!pair) return { kind: 'not-found', reason: 'INVALID_PAIR' };
  const [ra, rb] = await Promise.all([catalog.getVariantBySlug(market, pair.a), catalog.getVariantBySlug(market, pair.b)]);
  const tLookup = performance.now();
  if (!ra || !rb) return { kind: 'not-found', reason: 'UNKNOWN_VEHICLE' };
  // Step 8b: la misma ReferenceVariant en los dos lados solo tiene sentido si al menos uno es una unidad usada
  // (Golf nuevo vs Golf usado, o dos unidades usadas): son participantes distintos.
  if (ra.option.id === rb.option.id && !hasUsed(conditions)) return { kind: 'not-found', reason: 'SAME_VEHICLE' };
  if (ra.viaAlias || rb.viaAlias) return { kind: 'redirect', pairSlug: pairSlug(ra.canonicalSlug, rb.canonicalSlug) };

  const idx = await catalog.index(market);
  const key = `${market}|${catalog.channel}|${slug}|${idx.version}|${pairConditionsKey(conditions)}`;
  const hit = cache.get(key);
  if (hit) return { kind: 'ok', data: hit, ms: performance.now() - t0, timings: { lookupMs: tLookup - t0, bundleMs: 0, adaptMs: 0, cached: true } };

  const tBundle0 = performance.now();
  const raw = await catalog.loadBundle(market, [ra.option.id, rb.option.id]);
  const tBundle = performance.now();
  // Publicación por campo: lo que no se puede publicar en el canal ni se muestra ni se calcula.
  const bundle = filterBundleForChannel(raw, catalog.channel);
  // Misma variant en los dos lados: nombre corto + lado (neutro respecto al idioma; la UI añade Nuevo/Usado).
  const [labelA, labelB] = ra.option.id === rb.option.id ? [`${ra.option.brand} ${ra.option.model} A`, `${rb.option.brand} ${rb.option.model} B`] : distinctShortNames(ra.option, rb.option);
  const evaluationDate = conditions.evaluationDate;
  const subjectIds: Partial<Record<'a' | 'b', string>> = {};
  const vehicle = (side: 'a' | 'b', option: VehicleOption, label: string, cond: SideCondition): ComparisonVehicle => {
    const at = variantReferenceDate(idx.rowById.get(option.id)!);
    const opts = at ? { at } : {};
    const base = { candidate: comparisonCandidateFromBundle(bundle, option.id, { label, ...opts }), economicInput: economicVehicleInputFromBundle(bundle, option.id, opts) };
    if (cond.condition === 'new' || !evaluationDate) {
      subjectIds[side] = option.id;
      // Step D1.6: precio de compra del USUARIO para un coche nuevo → override de compra (USER_PROVIDED); nunca precio oficial.
      const price = cond.condition === 'new' ? cond.price : undefined;
      const pipeline = price !== undefined ? { ...base, overrides: { purchasePriceOverride: { amount_minor: price * 100, currency: 'EUR' as const } } } : base;
      return { side, option, label, ...opts, subjectId: option.id, condition: 'new', pipeline };
    }
    // La salud de batería solo aplica a BEV/PHEV/EREV: en otro powertrain se ignora (nunca penaliza).
    const ignored = cond.facts.soh !== undefined && !sohApplies(option.powertrainType) ? [`${side}_soh`] : [];
    const facts = ignored.length ? (({ soh: _s, ...rest }) => rest)(cond.facts) : cond.facts;
    // Dos unidades idénticas de la misma variant siguen siendo dos participantes.
    let id = usedSubjectId(option.id, facts);
    if (side === 'b' && subjectIds.a === id) id = usedSubjectId(option.id, facts, 'b');
    subjectIds[side] = id;
    return { side, option, label, ...opts, subjectId: id, condition: 'used', used: facts, ...(ignored.length ? { ignored } : {}), pipeline: { ...base, usedInstance: toUsedInstance(facts, option.id, id, evaluationDate) } };
  };
  const energy = marketEnergy(market, catalog.channel);

  // Fuentes de los dos vehículos (identidad, valores, precios) con su estado de derechos.
  const ids = new Set([ra.option.id, rb.option.id]);
  const used = new Set([
    ...bundle.variants.filter((v) => ids.has(v.id)).map((v) => bundle.homologations.find((h) => h.id === v.homologation_id)!.source_id),
    ...bundle.spec_values.filter((v) => ids.has(v.variant_id)).map((v) => v.source_id),
    ...bundle.prices.filter((p) => ids.has(p.variant_id)).map((p) => p.source_id),
  ]);
  const vehicleSources = bundle.sources
    .filter((s) => used.has(s.id))
    .map((s): SourceInfo => {
      const attribution = SOURCE_RIGHTS[s.code]?.attribution;
      const publication = sourcePublication(s.code, s.source_authority) === 'PUBLISHABLE' ? 'PUBLISHABLE' : 'PREVIEW_ONLY';
      return { id: s.id, code: s.code, name: s.name, ...(s.base_url ? { url: s.base_url } : {}), publication, ...(attribution ? { attribution } : {}) };
    });

  const data: ComparisonData = {
    key,
    market,
    pairSlug: slug,
    channel: catalog.channel,
    vehicles: [vehicle('a', ra.option, labelA, conditions.a), vehicle('b', rb.option, labelB, conditions.b)],
    energy: energy.context,
    sources: [...vehicleSources, ...energy.sources],
    dataSnapshot: { vehicles: idx.version, energy: energy.version, rights: `DATA_RIGHTS_MATRIX v${RIGHTS_MATRIX_VERSION}` },
    conditions,
    ...(evaluationDate && hasUsed(conditions) ? { evaluationDate } : {}),
  };
  cache.set(key, data);
  if (cache.size > MAX) cache.delete(cache.keys().next().value!);
  const end = performance.now();
  return { kind: 'ok', data, ms: end - t0, timings: { lookupMs: tLookup - t0, bundleMs: tBundle - tBundle0, adaptMs: end - tBundle, cached: false } };
}

export type ComparisonPage =
  | { kind: 'ok'; data: ComparisonData; view: DecisionView; timings: LoadTimings & { loadMs: number; decisionMs: number; decisionCached: boolean } }
  | Exclude<ComparisonLoad, { kind: 'ok' }>;

/** Datos + decisión inicial (con robustez) para el RSC. */
export async function loadComparisonPageData({ market, slug, scenario, conditions = ALL_NEW }: { market: MarketCode; slug: string; scenario: Scenario; conditions?: PairConditions }): Promise<ComparisonPage> {
  const load = await loadComparisonData(market, slug, vehicleCatalog(), conditions);
  if (load.kind !== 'ok') return load;
  const { view, ms, cached } = serverDecisionView(load.data, scenario);
  const timings = { ...load.timings, loadMs: load.ms, decisionMs: ms, decisionCached: cached };
  // Medición opt-in (VSCAR_TIMINGS=1): desglose del SSR en el log del servidor; la decisión sin robustez se mide aparte.
  if (process.env.VSCAR_TIMINGS === '1') {
    const pipelineMs = computeDecision(load.data, scenario, { robustness: false }).ms;
    console.info(`[vscar:ssr] ${JSON.stringify({ slug, ...timings, pipelineMs: +pipelineMs.toFixed(1) })}`);
  }
  return { kind: 'ok', data: load.data, view, timings };
}
