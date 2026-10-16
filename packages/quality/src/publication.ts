import { ALPHA_CATEGORIES, type DatasetBundle, type RightsStatus, type Homologation, type ReferenceVariant, type SafetyRating, type Source, type SpecValue, type VehiclePrice } from '@vscar/vehicle-schema';
import { detectConflicts } from './conflicts.ts';
import { evaluateEligibility, vehiclePageEligible } from './eligibility.ts';

/**
 * Publicación (Step 7b): qué puede MOSTRARSE y en qué canal. Es una regla de DERECHOS, separada de la calidad:
 * un dato puede ser correcto y no publicable (derechos sin verificar) o publicable y no usable (conflicto).
 *
 * Fuente única: [DATA_RIGHTS_MATRIX v0.2](../../../docs/data/DATA_RIGHTS_MATRIX.md) §2 + ADR-009 §4, §6, §9.
 * Un test compara este registro con la tabla de la matriz: si la matriz cambia, este fichero debe cambiar.
 */

/** Estado de un derecho, tal como lo expresa la matriz: ✅ · ⚠️ · ❓ · ❌ (`RightsStatus` de vehicle-schema, compartido con la media). */
export type RightState = RightsStatus;

export interface SourceRights {
  store: RightState;
  republish: RightState;
  commercial: RightState;
  derive: RightState;
  /** Atribución obligatoria cuando el derecho es condicional (CC BY 4.0…). */
  attribution?: string;
}

export const RIGHTS_MATRIX_VERSION = '0.2';

const pending: SourceRights = { store: 'PENDING', republish: 'PENDING', commercial: 'PENDING', derive: 'PENDING' };
const denied: SourceRights = { store: 'DENIED', republish: 'DENIED', commercial: 'DENIED', derive: 'DENIED' };

/** Derechos por código de fuente de la matriz. Un código ausente se trata como DENIED (falla cerrado). */
export const SOURCE_RIGHTS: Readonly<Record<string, SourceRights>> = {
  S01: { store: 'CONDITIONAL', republish: 'CONDITIONAL', commercial: 'CONDITIONAL', derive: 'CONDITIONAL', attribution: 'European Environment Agency (EEA) — datos: DG CLIMA, CC BY 4.0' },
  S02: pending,
  S03: {
    store: 'CONDITIONAL',
    republish: 'CONDITIONAL',
    commercial: 'CONDITIONAL',
    derive: 'CONDITIONAL',
    attribution: 'Ministerio para la Transición Ecológica y el Reto Demográfico — Geoportal de gasolineras, CC BY 4.0',
  },
  // ESIOS: almacenamiento condicional; republicación, uso comercial y derivados sin verificar (riesgo ❌, ADR-009).
  S04: { store: 'CONDITIONAL', republish: 'PENDING', commercial: 'PENDING', derive: 'PENDING' },
  S05: pending,
  S06: pending,
  S07: pending,
  S08: pending,
  'S08-EU': pending,
  S09: pending,
  S10: pending,
  // Step D1.1: RDW (CC0 según evidencia) y GIAVEH registrados como pendientes: sin aprobación humana no son PUBLIC.
  S11: pending,
  S12: pending,
  S20: pending,
  S21: pending,
  S22: pending,
  S23: pending,
  // Proveedores comerciales: no contratados en Alpha (§2.4) → sin licencia.
  C01: denied,
  C02: denied,
  C03: denied,
  C04: denied,
  C05: denied,
  C06: denied,
  C07: denied,
  C08: denied,
};

/**
 * Canal de publicación.
 * - `PUBLIC`: web pública/indexable. Solo fuentes con TODOS los derechos verificados o condicionados (con atribución).
 * - `PREVIEW`: Alpha privada (noindex, local/staging). Admite derechos pendientes de verificar, nunca denegados.
 */
export type PublicationChannel = 'PUBLIC' | 'PREVIEW';
export const PUBLICATION_CHANNELS = ['PUBLIC', 'PREVIEW'] as const;

/** Qué permite una fuente: publicar, solo previsualizar, o nada. */
export type SourcePublication = 'PUBLISHABLE' | 'PREVIEW_ONLY' | 'BLOCKED';

export function sourcePublication(code: string | undefined, authority?: string): SourcePublication {
  // ADR-009 §4: las fuentes secundarias nunca son dato primario publicable, en ningún canal.
  if (authority === 'SECONDARY_REFERENCE') return 'BLOCKED';
  const rights = code ? SOURCE_RIGHTS[code] : undefined;
  if (!rights) return 'BLOCKED';
  const states = [rights.store, rights.republish, rights.commercial, rights.derive];
  if (states.includes('DENIED')) return 'BLOCKED';
  if (states.every((s) => s === 'VERIFIED' || s === 'CONDITIONAL')) return 'PUBLISHABLE';
  return 'PREVIEW_ONLY';
}

export function allowedIn(p: SourcePublication, channel: PublicationChannel): boolean {
  return p === 'PUBLISHABLE' || (p === 'PREVIEW_ONLY' && channel === 'PREVIEW');
}

/** Disponibilidad de una variant en el catálogo (Step 7b §16). */
export type VariantAvailability = 'PUBLIC_AVAILABLE' | 'INTERNAL_AVAILABLE' | 'NOT_AVAILABLE';

export type PublicationReason =
  /** `status` del registro no es publicable en el canal (`test_fixture`/`draft` solo en PREVIEW). */
  | 'RECORD_NOT_PUBLISHED'
  /** Identidad técnica insuficiente para el canal (PUBLIC exige EXACT; ADR-007, ADR-009 §6). */
  | 'IDENTITY_NOT_EXACT'
  /** La fuente de la identidad técnica (homologación) no es publicable en el canal: campo crítico. */
  | 'IDENTITY_SOURCE_NOT_ALLOWED'
  /** Tras ocultar los campos no publicables, ninguna categoría Alpha es comparable. */
  | 'NO_COMPARABLE_CATEGORY';

export interface PublicationInput {
  variant: ReferenceVariant;
  homologation: Homologation;
  values: readonly SpecValue[];
  prices: readonly VehiclePrice[];
  safety?: readonly SafetyRating[];
  sources: readonly Source[];
  /** Fecha de referencia de los hechos (variants históricas). */
  at?: string;
}

export interface ChannelPublication {
  channel: PublicationChannel;
  selectable: boolean;
  reasons: PublicationReason[];
  /** Campos ocultos por derechos (no se eliminan del catálogo interno; solo no se muestran ni calculan). */
  hidden: { values: string[]; prices: string[]; safety: string[] };
  /** Categorías Alpha comparables con los campos visibles. */
  comparableCategories: number;
  /** Fuentes visibles con derechos solo pendientes (PREVIEW): se señalan en la UI. */
  pendingSources: string[];
}

/**
 * Valores VISIBLES en un canal sin alterar las decisiones de calidad: los conflictos se detectan con TODOS los
 * valores (también los ocultos). Si un valor visible está en conflicto con uno oculto, sigue en `CONFLICT`
 * (pendiente de revisión humana): ocultar una fuente nunca "resuelve" un conflicto (ADR-009 §4: las secundarias
 * sirven precisamente para detectar conflictos).
 */
export function visibleValues(values: readonly SpecValue[], isAllowed: (v: SpecValue) => boolean): SpecValue[] {
  const hidden = new Set(values.filter((v) => !isAllowed(v)).map((v) => v.id));
  const byVariant = new Map<string, SpecValue[]>();
  for (const v of values) byVariant.set(v.variant_id, [...(byVariant.get(v.variant_id) ?? []), v]);
  const keepConflict = new Set<string>();
  for (const group of byVariant.values()) {
    for (const c of detectConflicts(group)) if (c.value_ids.some((id) => hidden.has(id))) for (const id of c.value_ids) keepConflict.add(id);
  }
  return values
    .filter((v) => !hidden.has(v.id))
    .map((v) => (keepConflict.has(v.id) && v.status !== 'REJECTED' && v.status !== 'CONFLICT' ? { ...v, status: 'CONFLICT' as const } : v));
}

const RECORD_STATUS_ALLOWED: Record<PublicationChannel, ReadonlySet<ReferenceVariant['status']>> = {
  PUBLIC: new Set(['published']),
  PREVIEW: new Set(['published', 'draft', 'test_fixture']),
};

/**
 * Publicación de UNA variant en un canal. Nivel de campo: un campo bloqueado se oculta; la variant solo desaparece
 * si falla un campo crítico (identidad) o si ya no queda ninguna categoría comparable (Step 7b §18).
 */
export function evaluatePublication(input: PublicationInput, channel: PublicationChannel): ChannelPublication {
  const sourceById = new Map(input.sources.map((s) => [s.id, s]));
  const pub = (sourceId: string, authority?: string) => {
    const s = sourceById.get(sourceId);
    return sourcePublication(s?.code, authority ?? s?.source_authority);
  };
  const allowed = (sourceId: string, authority?: string) => allowedIn(pub(sourceId, authority), channel);

  const reasons: PublicationReason[] = [];
  if (!RECORD_STATUS_ALLOWED[channel].has(input.variant.status)) reasons.push('RECORD_NOT_PUBLISHED');
  if (channel === 'PUBLIC' && input.homologation.identification_confidence !== 'EXACT') reasons.push('IDENTITY_NOT_EXACT');
  if (!allowed(input.homologation.source_id)) reasons.push('IDENTITY_SOURCE_NOT_ALLOWED');

  const shown = visibleValues(input.values, (v) => allowed(v.source_id, v.source_authority));
  const shownIds = new Set(shown.map((v) => v.id));
  const visiblePrices = input.prices.filter((p) => allowed(p.source_id, p.source_authority));
  const hidden = {
    values: input.values.filter((v) => !shownIds.has(v.id)).map((v) => v.id),
    prices: input.prices.filter((p) => !visiblePrices.includes(p)).map((p) => p.id),
    safety: (input.safety ?? []).filter((r) => !allowed(r.source_id)).map((r) => r.id),
  };

  // Regla existente, sin paralelo: `vehicle_page_eligibility` (Catalog v0.2 §8) evaluada SOLO con los campos visibles.
  const visible = { variant: input.variant, homologation: input.homologation, values: shown, prices: visiblePrices, ...(input.at ? { at: input.at } : {}) };
  const eligibility = evaluateEligibility(visible);
  const comparableCategories = ALPHA_CATEGORIES.filter((c) => eligibility[c].status !== 'NOT_AVAILABLE').length;
  if (!vehiclePageEligible(visible)) reasons.push('NO_COMPARABLE_CATEGORY');

  const usedSourceIds = new Set([input.homologation.source_id, ...shown.map((v) => v.source_id), ...visiblePrices.map((p) => p.source_id)]);
  const pendingSources = [...usedSourceIds]
    .filter((id) => pub(id) === 'PREVIEW_ONLY')
    .map((id) => sourceById.get(id)?.code ?? id)
    .filter((c, i, xs) => xs.indexOf(c) === i)
    .sort();

  return { channel, selectable: reasons.length === 0, reasons, hidden, comparableCategories, pendingSources: channel === 'PREVIEW' ? pendingSources : [] };
}

export interface VariantPublication {
  availability: VariantAvailability;
  public: ChannelPublication;
  preview: ChannelPublication;
}

export function variantAvailability(input: PublicationInput): VariantPublication {
  const pub = evaluatePublication(input, 'PUBLIC');
  const preview = evaluatePublication(input, 'PREVIEW');
  const availability: VariantAvailability = pub.selectable ? 'PUBLIC_AVAILABLE' : preview.selectable ? 'INTERNAL_AVAILABLE' : 'NOT_AVAILABLE';
  return { availability, public: pub, preview };
}

/** ¿La variant es seleccionable en el canal? PUBLIC_AVAILABLE vale en ambos; INTERNAL_AVAILABLE solo en PREVIEW. */
export function availableIn(a: VariantAvailability, channel: PublicationChannel): boolean {
  return a === 'PUBLIC_AVAILABLE' || (a === 'INTERNAL_AVAILABLE' && channel === 'PREVIEW');
}

/** Entrada de publicación de una variant a partir de un bundle (helper para el orquestador). */
export function publicationInputFromBundle(bundle: DatasetBundle, variantId: string, at?: string): PublicationInput {
  const variant = bundle.variants.find((v) => v.id === variantId);
  if (!variant) throw new Error(`unknown variant ${variantId}`);
  const homologation = bundle.homologations.find((h) => h.id === variant.homologation_id);
  if (!homologation) throw new Error(`unknown homologation for ${variantId}`);
  return {
    variant,
    homologation,
    values: bundle.spec_values.filter((v) => v.variant_id === variantId),
    prices: bundle.prices.filter((p) => p.variant_id === variantId),
    safety: bundle.safety_ratings.filter((r) => r.variant_id === variantId),
    sources: bundle.sources,
    ...(at ? { at } : {}),
  };
}

/**
 * Bundle con los campos no publicables en el canal ELIMINADOS (publicación por campo). Es lo que reciben los
 * adapters de engines: un dato bloqueado ni se muestra ni se calcula. Variants y homologaciones se conservan.
 */
export function filterBundleForChannel(bundle: DatasetBundle, channel: PublicationChannel): DatasetBundle {
  const sourceById = new Map(bundle.sources.map((s) => [s.id, s]));
  const ok = (sourceId: string, authority?: string) => {
    const s = sourceById.get(sourceId);
    return allowedIn(sourcePublication(s?.code, authority ?? s?.source_authority), channel);
  };
  return {
    ...bundle,
    spec_values: visibleValues(bundle.spec_values, (v) => ok(v.source_id, v.source_authority)),
    prices: bundle.prices.filter((p) => ok(p.source_id, p.source_authority)),
    safety_ratings: bundle.safety_ratings.filter((r) => ok(r.source_id)),
    incentives: bundle.incentives.filter((i) => ok(i.source_id)),
  };
}
