/**
 * Step D1.8 (ADR-020) — selección simplificada Marca → Modelo → Año y resolución técnica INTERNA.
 * Módulo PURO y apto para cliente: tipos del contrato servidor → selector y la regla de resolución, sin DB ni engines.
 *
 * Principios:
 * - Una opción de marca/modelo/año NO es un coche comparable: lo es solo una configuración resuelta a UNA
 *   ReferenceVariant seleccionable.
 * - Nunca se elige una variante arbitraria. Están prohibidos: primera, más barata, menor consumo, mayor potencia,
 *   aleatoria y promedios.
 * - Homologaciones equivalentes (misma configuración y ningún dato relevante contradictorio en el mismo ciclo) se
 *   agrupan en UNA opción; el miembro que se compara sigue una precedencia documentada y metodológica (ADR-020 §4).
 * - Configuraciones distintas → aclaración contextual (`NEEDS_CONFIGURATION`); identidad insuficiente → `UNRESOLVED`.
 */
import { normalizeSearch, type VehicleOption } from './catalog';

/** Estado de una marca/modelo/año/configuración en el selector (no confundir con la publicación por campo). */
export type SelectionAvailability = 'COMPARISON_ELIGIBLE' | 'CATALOG_DISCOVERABLE' | 'NOT_COMPARABLE';

/** Base de un año del selector. Nunca se convierte una en otra. */
export type YearBasis = 'MODEL_YEAR' | 'REGISTRATION_OBSERVED';

export type ResolutionStatus = 'AUTO_RESOLVED' | 'EQUIVALENT_GROUP' | 'NEEDS_CONFIGURATION' | 'UNRESOLVED';

/** Por qué una configuración no es comparable (claves i18n `catalog.picker.reasons.*`). */
export type NotComparableReason = 'COMMERCIAL_IDENTITY_UNCONFIRMED' | 'GENERATION_NOT_VERIFIED' | 'MODEL_YEAR_NOT_VERIFIED' | 'TRIM_NOT_CONFIRMED' | 'NOT_PROMOTED';

/** Claves cuyos valores deciden si dos homologaciones de la misma configuración son equivalentes. */
export const EQUIVALENCE_KEYS = ['perf.power_max_kw', 'nrg.fuel_combined_l100', 'nrg.fuel_charge_sustaining_l100', 'nrg.electric_combined_kwh100', 'rng.electric_combined_km', 'bat.capacity_kwh'] as const;
export type EquivalenceKey = (typeof EQUIVALENCE_KEYS)[number];

/** Un hecho de una variante: valor (o rango) con su ciclo. Solo valores usables, publicables en el canal y sin conflicto. */
export interface FactValue {
  cycle: string | null;
  min: number;
  max: number;
}

/** Entrada de la resolución: una ReferenceVariant seleccionable de la marca/modelo/año. */
export interface ResolutionCandidate {
  option: VehicleOption;
  fuel: string | null;
  transmission: string;
  drivetrain: string;
  /** Ciclo de la homologación (WLTP, NEDC…). */
  homologationCycle: string;
  identityConfidence: string;
  homologationFrom: string;
  facts: Partial<Record<EquivalenceKey, FactValue[]>>;
}

/** Opción que ve el usuario en la aclaración contextual (o la única, si se resuelve sola). */
export interface ConfigurationChoice {
  /** Clave opaca y estable (no contiene ids internos). */
  key: string;
  availability: SelectionAvailability;
  powertrainType: string;
  fuel?: string;
  transmission?: string;
  drivetrain?: string;
  /** Potencia en kW si es un hecho usable, publicable y sin conflicto. */
  powerKw?: { min: number; max: number };
  /** Versión comercial (solo variantes seleccionables; nunca un código). */
  name?: string;
  /** Autonomía eléctrica (BEV/PHEV) si distingue configuraciones. */
  rangeKm?: { min: number; max: number };
  /** Homologaciones que representa (equivalentes). */
  members: number;
  /** Ciclos de homologación de los miembros (procedencia; nunca se mezclan en un cálculo). */
  cycles: string[];
  /** ReferenceVariant que se compara. Solo si `availability = COMPARISON_ELIGIBLE`. */
  option?: VehicleOption;
  reasons?: NotComparableReason[];
}

export interface Resolution {
  status: ResolutionStatus;
  configurations: ConfigurationChoice[];
  /** Homologaciones técnicas curadas del mismo modelo/año que no son seleccionables (solo informativo). */
  technicalOnly: number;
}

// ------------------------------------------------------------------------------------------------- equivalencia

const signature = (c: ResolutionCandidate) => normalizeSearch([c.option.powertrainType, c.fuel ?? '-', c.transmission, c.drivetrain, c.option.variant].join('|'));

/** ¿Dos variantes contradicen algún hecho relevante en el MISMO ciclo? (un hecho ausente no contradice). */
function contradicts(a: ResolutionCandidate, b: ResolutionCandidate): boolean {
  for (const k of EQUIVALENCE_KEYS) {
    for (const fa of a.facts[k] ?? []) {
      for (const fb of b.facts[k] ?? []) {
        if (fa.cycle !== fb.cycle) continue;
        if (fa.min !== fb.min || fa.max !== fb.max) return true;
      }
    }
  }
  return false;
}

const factCount = (c: ResolutionCandidate) => EQUIVALENCE_KEYS.reduce((n, k) => n + (c.facts[k]?.length ? 1 : 0), 0);
const CONFIDENCE_RANK: Record<string, number> = { EXACT: 3, PARTIAL: 2, UNCONFIRMED: 1 };

/**
 * Miembro que se compara dentro de un grupo equivalente (ADR-020 §4), por precedencia, sin mirar ningún valor:
 * 1. homologación WLTP: es el ciclo de referencia actual, y NEDC no es directamente comparable;
 * 2. mayor confianza de identidad;
 * 3. más hechos relevantes disponibles. Los miembros no se contradicen, así que esto solo evita un hueco, nunca cambia un valor;
 * 4. revisión de homologación más reciente;
 * 5. slug (desempate determinista).
 * Ningún criterio depende del valor (ni consumo, ni potencia, ni precio).
 */
export function representative(group: readonly ResolutionCandidate[]): ResolutionCandidate {
  return [...group].sort(
    (a, b) =>
      Number(b.homologationCycle === 'WLTP') - Number(a.homologationCycle === 'WLTP') ||
      (CONFIDENCE_RANK[b.identityConfidence] ?? 0) - (CONFIDENCE_RANK[a.identityConfidence] ?? 0) ||
      factCount(b) - factCount(a) ||
      b.homologationFrom.localeCompare(a.homologationFrom) ||
      a.option.slug.localeCompare(b.option.slug),
  )[0]!;
}

/** Agrupa variantes en configuraciones: misma firma y sin contradicciones → un grupo. Determinista. */
export function groupEquivalent(cands: readonly ResolutionCandidate[]): ResolutionCandidate[][] {
  const sorted = [...cands].sort((a, b) => signature(a).localeCompare(signature(b)) || a.option.slug.localeCompare(b.option.slug));
  const groups: ResolutionCandidate[][] = [];
  for (const c of sorted) {
    const g = groups.find((x) => signature(x[0]!) === signature(c) && x.every((m) => !contradicts(m, c)));
    if (g) g.push(c);
    else groups.push([c]);
  }
  return groups;
}

const span = (vs: readonly FactValue[] | undefined) => (vs?.length ? { min: Math.min(...vs.map((v) => v.min)), max: Math.max(...vs.map((v) => v.max)) } : undefined);
const keyOf = (parts: readonly string[]) => {
  // FNV-1a 32 sobre la firma: clave opaca y estable, sin ids ni códigos de homologación.
  let h = 0x811c9dc5;
  for (const ch of parts.join('|')) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  return `c${h.toString(36)}`;
};

/**
 * Opción tal como la ve el usuario cuando representa a un grupo equivalente: sin el periodo ni el ciclo que solo
 * distinguían homologaciones del mismo coche (la procedencia se conserva en el servidor y en la comparación).
 */
export function collapsedOption(o: VehicleOption): VehicleOption {
  const { period: _p, cycle: _c, ...rest } = o;
  return rest;
}

/** Configuración seleccionable (un grupo equivalente) → opción del selector. */
export function choiceFromGroup(group: readonly ResolutionCandidate[]): ConfigurationChoice {
  const rep = representative(group);
  const power = span(group.flatMap((g) => g.facts['perf.power_max_kw'] ?? []));
  const range = span(group.flatMap((g) => (g.facts['rng.electric_combined_km'] ?? []).filter((f) => f.cycle === 'WLTP')));
  return {
    key: keyOf(['rv', signature(rep)]),
    availability: 'COMPARISON_ELIGIBLE',
    powertrainType: rep.option.powertrainType,
    ...(rep.fuel ? { fuel: rep.fuel } : {}),
    transmission: rep.transmission,
    drivetrain: rep.drivetrain,
    ...(power ? { powerKw: power } : {}),
    ...(range ? { rangeKm: range } : {}),
    name: rep.option.variant,
    members: group.length,
    cycles: [...new Set(group.map((g) => g.homologationCycle))].sort(),
    option: group.length > 1 ? collapsedOption(rep.option) : rep.option,
  };
}

/** Configuración técnica curada (no seleccionable): solo informativa, nunca comparable. */
export interface TechnicalConfiguration {
  powertrainType: string;
  fuel?: string;
  transmission?: string;
  powerKw?: { min: number; max: number };
  reasons: NotComparableReason[];
}

export function technicalChoice(t: TechnicalConfiguration, members: number): ConfigurationChoice {
  return {
    key: keyOf(['tech', t.powertrainType, t.fuel ?? '-', t.transmission ?? '-', t.powerKw ? `${t.powerKw.min}-${t.powerKw.max}` : '-']),
    availability: 'NOT_COMPARABLE',
    powertrainType: t.powertrainType,
    ...(t.fuel ? { fuel: t.fuel } : {}),
    ...(t.transmission ? { transmission: t.transmission } : {}),
    ...(t.powerKw ? { powerKw: t.powerKw } : {}),
    members,
    cycles: [],
    reasons: t.reasons,
  };
}

/**
 * Resolución de una marca + modelo + año:
 * - Configuraciones seleccionables: una sola → AUTO_RESOLVED (o EQUIVALENT_GROUP si agrupa varias homologaciones);
 *   varias → NEEDS_CONFIGURATION.
 * - Sin ninguna seleccionable → UNRESOLVED con las configuraciones técnicas (agregadas, sin duplicados) como
 *   información. No hay comparación numérica.
 */
export function resolveSelection(cands: readonly ResolutionCandidate[], technical: readonly TechnicalConfiguration[] = []): Resolution {
  const groups = groupEquivalent(cands);
  if (groups.length) {
    const configurations = groups.map(choiceFromGroup).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '') || a.key.localeCompare(b.key));
    const status: ResolutionStatus = groups.length > 1 ? 'NEEDS_CONFIGURATION' : groups[0]!.length > 1 ? 'EQUIVALENT_GROUP' : 'AUTO_RESOLVED';
    return { status, configurations, technicalOnly: technical.length };
  }
  const merged = new Map<string, { t: TechnicalConfiguration; n: number }>();
  for (const t of technical) {
    const k = technicalChoice(t, 1).key;
    const cur = merged.get(k);
    if (cur) cur.n++;
    else merged.set(k, { t, n: 1 });
  }
  const configurations = [...merged.values()].map(({ t, n }) => technicalChoice(t, n)).sort((a, b) => a.powertrainType.localeCompare(b.powertrainType) || (a.powerKw?.min ?? 0) - (b.powerKw?.min ?? 0) || a.key.localeCompare(b.key));
  return { status: 'UNRESOLVED', configurations, technicalOnly: technical.length };
}

// ------------------------------------------------------------------------------------------------------ años

/**
 * Regla de años (D1.8, ADR-020 §3):
 * - MODEL_YEAR solo si lo declara la fuente del catálogo seleccionable.
 * - REGISTRATION_OBSERVED es el periodo de matriculación observado de una homologación técnica; nunca es año-modelo.
 * - Nunca se aceptan años futuros sin respaldo: un año-modelo puede ir como mucho un año por delante del año en curso
 *   (práctica comercial MY+1, documentada por el fabricante), y una matriculación observada nunca supera el año en curso.
 */
export function yearAllowed(year: number, basis: YearBasis, currentYear: number): boolean {
  return basis === 'MODEL_YEAR' ? year <= currentYear + 1 : year <= currentYear;
}

/** Años del periodo de matriculación observado (primer → último año observado). */
export function registrationYears(first: number | null | undefined, last: number | null | undefined, currentYear: number): number[] {
  if (first == null) return [];
  const to = Math.min(last ?? first, currentYear);
  const out: number[] = [];
  for (let y = first; y <= to; y++) out.push(y);
  return out;
}
