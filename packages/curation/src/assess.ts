import { CATEGORY_REQUIREMENTS, type AlphaCategory, type PowertrainType, type Requirement } from '@vscar/vehicle-schema';
import { SOURCE_RIGHTS, sourcePublication } from '@vscar/quality';
import type { IdaeRecord, SurveyValueField } from '@vscar/data-connectors';
import type { CurationCluster } from './clusters.ts';
import type { IdaeLink } from './link.ts';
import type { CandidateSpecValue, CurationStatus, IdentityStatus, RightsDecision } from './schema.ts';

/* ───────────────────────── Identidad (Step D1 §10) ───────────────────────── */

export interface IdentityAssessment {
  status: IdentityStatus;
  evidence: string[];
}

/** Identidades EXACT ya curadas en el catálogo (Step 4c): `TAN|Va|Ve`. */
export type CuratedExact = ReadonlyMap<string, string>;

/**
 * Reglas (HOMOLOGATION_MATCH_REPORT, sin cambios): EXACT exige que una fuente oficial enlace la versión comercial
 * con TAN/Va/Ve (código IDAE = Va/Ve) o una curación EXACT existente. Coincidir en valores nunca pasa de UNCONFIRMED.
 * AMBIGUOUS y CONFLICTED son subtipos de "no usable" que D1 separa para dirigir la revisión humana.
 */
export function assessIdentity(cluster: CurationCluster, link: IdaeLink, twins: number, curated: CuratedExact): IdentityAssessment {
  const rep = cluster.representative;
  const ev: string[] = [`technical group TAN ${rep.byYear[0]!.tan} / Va ${rep.byYear[0]!.variant} / Ve ${rep.byYear[0]!.version} (${rep.registrations} ES registrations)`];
  const conflicts = [...rep.byYear.flatMap((g) => g.conflicts), ...link.conflicts];
  const curatedNote = curated.get(rep.id);
  if (conflicts.length) return { status: 'CONFLICTED', evidence: [...ev, ...conflicts.map((c) => `conflict: ${c}`)] };
  if (curatedNote) return { status: 'EXACT', evidence: [...ev, `curated EXACT identity: ${curatedNote}`] };
  if (link.method === 'OFFICIAL_CODE') return { status: 'EXACT', evidence: [...ev, ...link.checks] };
  if (link.variantOnlyCode) return { status: 'PARTIAL', evidence: [...ev, `IDAE code ${link.variantOnlyCode} matches Va but not this Ve (TAN+Va evidence, no Ve)`] };
  if (rep.familyAmbiguity.length) return { status: 'AMBIGUOUS', evidence: [...ev, `commercial name also claimed by ${rep.familyAmbiguity.join(', ')}`] };
  if (link.method === 'VALUES' && (twins > 0 || link.distinctPowersKw.length > 1)) {
    return {
      status: 'AMBIGUOUS',
      evidence: [...ev, ...link.checks, ...(twins ? [`${twins} other technical group(s) of the family share powertrain/fuel/capacity/power: values cannot tell which one is the commercial version`] : []), ...(link.distinctPowersKw.length > 1 ? [`linked IDAE versions declare different powers ${link.distinctPowersKw.join('/')} kW`] : [])],
    };
  }
  if (link.method === 'VALUES') return { status: 'UNCONFIRMED', evidence: [...ev, ...link.checks, 'value-based link only (no official identifier): UNCONFIRMED by rule'] };
  return { status: 'UNCONFIRMED', evidence: [...ev, link.rejected ?? 'no official commercial version linked (IDAE)'] };
}

/* ───────────────────────── Valores EEA (mapeo v2 + `E (g/km)`) ───────────────────────── */

/** SpecValues propuestos desde la EEA para el representante (año más reciente; nunca se mezclan años ni ciclos). */
export function eeaSpecValues(cluster: CurationCluster): CandidateSpecValue[] {
  const rep = cluster.representative;
  const g = rep.byYear[rep.byYear.length - 1]!;
  const hp = cluster.homologationPowertrain;
  const out: CandidateSpecValue[] = [];
  const hasWltp = (g.distributions['Ewltp (g/km)'] ?? []).length > 0;
  const push = (specKey: string, field: SurveyValueField, unit: string, extra: Partial<CandidateSpecValue> = {}, convert = (x: number) => x) => {
    const d = g.distributions[field];
    if (!d || d.length === 0) return;
    const vals = d.map(([v]) => convert(v));
    const lo = Math.min(...vals), hi = Math.max(...vals);
    out.push({ specKey, sourceId: 'S01', externalField: field, unit, ...(lo === hi ? { value: lo } : { min: lo, max: hi }), distribution: d.map(([v, n]) => [convert(v), n]), year: g.year, status: g.status, ...extra });
  };
  push('emi.co2_combined_gkm', 'Ewltp (g/km)', 'g/km', { testCycle: 'WLTP' });
  if (hp !== 'BEV' && (g.distributions['Enedc (g/km)'] ?? []).length) {
    push('emi.co2_combined_gkm', 'Enedc (g/km)', 'g/km', hasWltp ? { testCycle: 'UNDECLARED', testCycleInferred: 'NEDC_CORRELATED', notes: 'NEDC reported together with WLTP (correlated)' } : { testCycle: 'NEDC' });
  } else if (hp !== 'BEV' && !hasWltp) {
    push('emi.co2_combined_gkm', 'E (g/km)', 'g/km', { testCycle: 'NEDC', notes: 'pre-2017 field `E (g/km)`: mapping v3 proposal (not in adapter v0.2)' });
  }
  if (hp === 'ICE') push('perf.power_max_kw', 'Ep (KW)', 'kW', { measurementBasis: { power_basis: 'ICE_ONLY' } });
  if (hp === 'NOVC_HEV' || hp === 'OVC_HEV') push('perf.power_ice_kw', 'Ep (KW)', 'kW');
  if (hp === 'BEV') push('perf.power_electric_kw', 'Ep (KW)', 'kW');
  if (hp !== 'BEV') push('pt.displacement_cc', 'Ec (cm3)', 'cm³');
  if (hp === 'ICE' || hp === 'NOVC_HEV') push('nrg.fuel_combined_l100', 'Fc', 'L/100 km', { testCycle: 'UNDECLARED', ...(hasWltp ? { testCycleInferred: 'WLTP' as const } : {}) });
  if (hp === 'OVC_HEV') push('nrg.phev_weighted_fuel_l100', 'Fc', 'L/100 km', { testCycle: 'UNDECLARED', notes: 'assumed weighted PHEV consumption; never used for cost' });
  if (hp === 'BEV' || hp === 'OVC_HEV') {
    push('nrg.electric_combined_kwh100', 'Z (Wh/km)', 'kWh/100 km', { testCycle: 'UNDECLARED', ...(hasWltp ? { testCycleInferred: 'WLTP' as const } : {}), measurementBasis: { consumption_basis: hp === 'BEV' ? 'COMBINED' : 'UNSPECIFIED', charging_loss_basis: 'UNSPECIFIED' } }, (x) => Math.round(x) / 10);
    push('rng.electric_combined_km', 'Zr', 'km', { testCycle: 'UNDECLARED', measurementBasis: { range_type: 'UNSPECIFIED' } });
  }
  const span = (r: { min: number; max: number } | undefined, specKey: string, field: string, unit: string, basis?: Record<string, string>) => {
    if (!r) return;
    out.push({ specKey, sourceId: 'S01', externalField: field, unit, ...(r.min === r.max ? { value: r.min } : { min: r.min, max: r.max }), year: g.year, status: g.status, ...(basis ? { measurementBasis: basis } : {}) });
  };
  span(g.massKg, 'dim.mass_kg', 'M (kg)', 'kg', { mass_definition: 'EU_RUNNING_ORDER' });
  span(g.wheelbaseMm, 'dim.wheelbase_mm', 'W (mm)', 'mm');
  return out;
}

/** Campos IDAE presentes en las filas enlazadas (solo presencia: los valores no se redistribuyen). */
export function idaeFieldsPresent(records: readonly IdaeRecord[]): string[] {
  const keys = new Set<string>();
  for (const r of records) {
    if (r.values.fuelWltpMin !== undefined && r.values.fuelWltpMax !== undefined) keys.add(r.powertrain === 'PHEV' ? 'nrg.phev_weighted_fuel_l100' : 'nrg.fuel_combined_l100');
    if (r.values.electricKwh100 !== undefined) keys.add('nrg.electric_combined_kwh100');
    if (r.values.electricRangeKm !== undefined) keys.add('rng.electric_combined_km');
    if (r.values.gvwKg !== undefined) keys.add('dim.mass_kg (GROSS_VEHICLE)');
  }
  return [...keys].sort();
}

/* ───────────────────────── Producto ───────────────────────── */

const MILD = /\b(MHEV|mild[- ]?hybrid|micro[- ]?h[ií]brido|48\s?V|eTSI|e-TSI|EQ\s?Boost|SHVS|Smart\s?Hybrid)\b/i;

export function productClass(cluster: CurationCluster, linked: readonly IdaeRecord[]): { productClass: 'ICE' | 'MHEV' | 'HEV' | 'PHEV' | 'BEV' | 'FCEV' | 'EREV' | 'ICE_OR_MHEV' | 'HEV_OR_MHEV'; note?: string } {
  switch (cluster.homologationPowertrain) {
    case 'BEV':
      return { productClass: 'BEV' };
    case 'OVC_HEV':
      return { productClass: 'PHEV' };
    case 'FCEV':
      return { productClass: 'FCEV' };
    case 'NOVC_HEV':
      return linked.length > 0 && linked.every((r) => MILD.test(r.version))
        ? { productClass: 'MHEV', note: 'homologated NOVC_HEV but the linked IDAE version text names a mild-hybrid system (e.g. Golf eTSI, ADR-007): MHEV pending S08 confirmation' }
        : {
            productClass: 'HEV_OR_MHEV',
            note: 'NOVC_HEV covers full hybrids and some 48 V mild hybrids (e.g. Golf eTSI, BMW sDrive18d); neither EEA nor IDAE separates them → S08',
          };
    case 'ICE':
      return linked.length > 0 && linked.every((r) => MILD.test(r.version))
        ? { productClass: 'MHEV', note: 'homologated as ICE; linked IDAE version text names a mild-hybrid system → MHEV pending S08 confirmation' }
        : { productClass: 'ICE_OR_MHEV', note: 'EEA and IDAE cannot distinguish MHEV from ICE (no field)' };
    default:
      return { productClass: 'ICE_OR_MHEV', note: `homologation powertrain ${cluster.homologationPowertrain}` };
  }
}

/* ───────────────────────── Cobertura (Step D1 §15) ───────────────────────── */

export type CategoryD1 = 'AVAILABLE_FROM_D1' | 'PARTIAL_FROM_D1' | 'NEEDS_S08' | 'NOT_APPLICABLE';

const reqLabel = (r: Requirement) => (r.kind === 'spec' ? r.key : r.kind);

/**
 * Qué categorías Alpha podrían activarse SOLO con lo que D1 ha encontrado (EEA + presencia IDAE), usando las
 * claves críticas existentes (Catalog v0.2 §8.1, `CATEGORY_REQUIREMENTS`) — no hay fórmula nueva. Precio, plazas,
 * maletero, dimensiones, 0–100, garantía, depósito y carga no existen en EEA/IDAE → `NEEDS_S08`.
 * `PARTIAL_FROM_D1`: la clave existe pero con base/ciclo sin declarar (lo que la elegibilidad trata como PARTIAL).
 */
export function d1Coverage(pt: PowertrainType, available: ReadonlySet<string>, partialKeys: ReadonlySet<string>): { categories: Record<AlphaCategory, CategoryD1>; criticalCompleteness: number; missingCritical: string[] } {
  const reqs = CATEGORY_REQUIREMENTS[pt];
  const categories = {} as Record<AlphaCategory, CategoryD1>;
  const critical = new Set<string>();
  const present = new Set<string>();
  for (const [cat, alts] of Object.entries(reqs) as Array<[AlphaCategory, (typeof reqs)[AlphaCategory]]>) {
    const esAlts = alts.filter((a) => !a.market || a.market === 'ES');
    if (esAlts.length === 0) {
      categories[cat] = 'NOT_APPLICABLE';
      continue;
    }
    // `available` contiene SpecKeys y, si una fuente los aporta, requisitos estructurales (`seats`, `price`).
    const ok = esAlts.find((a) => a.all.every((r) => available.has(reqLabel(r))));
    if (ok) categories[cat] = ok.all.some((r) => r.kind === 'spec' && partialKeys.has(r.key)) ? 'PARTIAL_FROM_D1' : 'AVAILABLE_FROM_D1';
    else categories[cat] = 'NEEDS_S08';
    // Requisitos críticos: los de la primera alternativa ES (o la que se cumple).
    for (const r of (ok ?? esAlts[0]!).all) {
      const k = reqLabel(r);
      critical.add(k);
      if (available.has(k)) present.add(k);
    }
  }
  const missingCritical = [...critical].filter((k) => !present.has(k)).sort();
  return { categories, criticalCompleteness: critical.size ? present.size / critical.size : 0, missingCritical };
}

export function productPowertrain(pc: string): PowertrainType {
  return pc === 'ICE_OR_MHEV' ? 'ICE' : pc === 'HEV_OR_MHEV' ? 'HEV' : (pc as PowertrainType);
}

/* ───────────────────────── Derechos (Step D1 §6, §17) ───────────────────────── */

/** Traducción del registro de derechos existente (DATA_RIGHTS_MATRIX v0.2 → SOURCE_RIGHTS) a la escala de D1. No cambia ningún estado. */
export function rightsDecision(code: string): RightsDecision {
  const r = SOURCE_RIGHTS[code];
  if (!r) return 'PROHIBITED';
  const p = sourcePublication(code);
  if (p === 'BLOCKED') return 'PROHIBITED';
  const states = [r.store, r.republish, r.commercial, r.derive];
  if (states.every((s) => s === 'VERIFIED')) return 'VERIFIED_PUBLIC_USE';
  if (p === 'PUBLISHABLE') return 'CONDITIONAL';
  return 'PENDING_REVIEW';
}

/* ───────────────────────── Prioridad editorial (Step D1 §14) ───────────────────────── */

/**
 * Prioridad de CURACIÓN (interna), separada de cualquier score de comprador. Sin popularidad inventada:
 * "presencia en el mercado" = matriculaciones nuevas en ES según la EEA (S01, CC BY 4.0) en los años encuestados.
 */
export const PRIORITY_WEIGHTS = { identity: 30, coverage: 20, marketPresence: 20, sourceQuality: 10, crossSource: 10, rights: 10 } as const;

const IDENTITY_POINTS: Record<IdentityStatus, number> = { EXACT: 1, PARTIAL: 0.6, UNCONFIRMED: 0.35, AMBIGUOUS: 0.15, CONFLICTED: 0 };

export function priority(input: { identity: IdentityStatus; linked: boolean; criticalCompleteness: number; registrations: number; finalData: boolean; crossChecks: number; conflicts: number; rights: Record<string, RightsDecision> }) {
  const c = {
    identity: PRIORITY_WEIGHTS.identity * (IDENTITY_POINTS[input.identity] + (input.identity === 'UNCONFIRMED' && input.linked ? 0.1 : 0)),
    coverage: PRIORITY_WEIGHTS.coverage * input.criticalCompleteness,
    // log10(10) = 0 … log10(100.000) = 1
    marketPresence: PRIORITY_WEIGHTS.marketPresence * Math.max(0, Math.min(1, (Math.log10(Math.max(1, input.registrations)) - 1) / 4)),
    sourceQuality: PRIORITY_WEIGHTS.sourceQuality * (input.finalData ? 1 : 0.6),
    crossSource: PRIORITY_WEIGHTS.crossSource * (input.conflicts ? 0 : Math.min(1, input.crossChecks / 2)),
    rights: PRIORITY_WEIGHTS.rights * (Object.values(input.rights).filter((r) => r === 'CONDITIONAL' || r === 'VERIFIED_PUBLIC_USE').length / Math.max(1, Object.keys(input.rights).length)),
  };
  const score = Math.round(Object.values(c).reduce((a, b) => a + b, 0) * 10) / 10;
  return { score, components: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.round(v * 10) / 10])) };
}

/* ───────────────────────── Estado final (Step D1 §17) ───────────────────────── */

export function curationStatus(input: { identity: IdentityStatus; missingCritical: string[]; rights: Record<string, RightsDecision>; blockedReason?: string }): { status: CurationStatus; blockers: { identity: string[]; data: string[]; rights: string[] } } {
  const blockers = {
    identity: input.identity === 'EXACT' ? [] : [`identity ${input.identity}: an official document (CoC / ficha técnica / IDAE code / manufacturer sheet) must link the commercial version to TAN+Va+Ve`],
    data: input.missingCritical.length ? [`missing critical keys: ${input.missingCritical.join(', ')}`] : [],
    rights: Object.entries(input.rights)
      .filter(([, d]) => d !== 'VERIFIED_PUBLIC_USE' && d !== 'CONDITIONAL')
      .map(([s, d]) => `${s} ${d}`),
  };
  if (input.blockedReason || Object.values(input.rights).includes('PROHIBITED')) return { status: 'BLOCKED', blockers: { ...blockers, rights: [...blockers.rights, ...(input.blockedReason ? [input.blockedReason] : [])] } };
  if (blockers.identity.length) return { status: 'NEEDS_IDENTITY_REVIEW', blockers };
  if (blockers.data.length) return { status: 'NEEDS_DATA_COMPLETION', blockers };
  if (blockers.rights.length) return { status: 'NEEDS_RIGHTS_REVIEW', blockers };
  return { status: 'READY_FOR_CURATED_IMPORT', blockers };
}
