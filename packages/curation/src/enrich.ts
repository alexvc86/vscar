import { dgtLabel } from '@vscar/methodology';
import type { HomologationPowertrain } from '@vscar/vehicle-schema';
import { giavehLookup, type GiavehRecord, type RdwMappingResult, type RdwMatch, type RdwObservation } from '@vscar/data-connectors';
import { d1Coverage, productPowertrain, rightsDecision } from './assess.ts';
import type { CandidateSpecValue, CurationCandidate, RightsDecision } from './schema.ts';

/**
 * Step D1.1 — enriquecimiento de un candidato D1 con RDW (S11) y GIAVEH (S12), sin cambiar reglas:
 * - Solo se usan observaciones RDW de una coincidencia EXACT (TAN completo + Va + Ve).
 * - EEA ↔ RDW: los valores comparables se contrastan; una discrepancia se CONSERVA como conflicto (no se elige valor).
 * - La etiqueta DGT se calcula con la regla existente (`dgt-label-v1`), separando qué fuente aportó cada entrada.
 * - Cobertura antes/después con la MISMA función de D1 (`d1Coverage`, claves críticas de Catalog v0.2 §8.1).
 * - La identidad comercial (trim) no cambia: RDW solo da la denominación de modelo.
 */
export interface Conflict {
  key: string;
  eea: string;
  rdw: string;
  note: string;
}

export interface EnrichmentResult {
  candidateId: string;
  label: string;
  identityBefore: string;
  identityAfter: string;
  technicalMatch: RdwMatch['level'];
  giaveh: ReturnType<typeof giavehLookup>['status'];
  coverageBefore: ReturnType<typeof d1Coverage>;
  coverageAfterEeaRule: ReturnType<typeof d1Coverage>;
  coverageAfter: ReturnType<typeof d1Coverage>;
  /** SpecKeys o requisitos que RDW añade (no estaban en EEA/IDAE). */
  fieldsAdded: string[];
  /** Estructurales aportados por RDW (plazas, puertas, carrocería, tracción, marchas, norma Euro). */
  structuralAdded: string[];
  /** Mismos datos que EEA y coherentes: corroboración, no campo nuevo. */
  corroborated: string[];
  /** Observaciones RDW no utilizadas (identidad no EXACT, anomalías NEDC, códigos sin mapear, límites únicos). */
  rejected: string[];
  conflicts: Conflict[];
  revisionConflicts: string[];
  dgt: { before?: string; afterEeaRule?: string; after?: string; source: 'NONE' | 'EEA+RULE' | 'EEA+RDW+RULE'; reason: string };
  rights: { reusableFields: string[]; pendingFields: string[]; bySource: Record<string, RightsDecision | 'PENDING_REVIEW (CC0 evidence)' | 'CONDITIONAL (Ley 37/2007 art. 8)'> };
  publicEligible: false;
}

const D1_PARTIAL = new Set(['rng.electric_combined_km', 'nrg.electric_combined_kwh100', 'nrg.fuel_combined_l100']);

function eeaRange(c: CurationCandidate, key: string, field?: string): { min: number; max: number } | undefined {
  const vals = c.specValues.filter((v) => v.specKey === key && (!field || v.externalField === field));
  const nums = vals.flatMap((v: CandidateSpecValue) => (v.value !== undefined ? [v.value] : [v.min!, v.max!]));
  return nums.length ? { min: Math.min(...nums), max: Math.max(...nums) } : undefined;
}
const obsRange = (o: RdwObservation) => (typeof o.value === 'number' ? { min: o.value, max: o.value } : o.min !== undefined ? { min: o.min, max: o.max! } : undefined);
const fmt = (r: { min: number; max: number }) => (r.min === r.max ? `${r.min}` : `${r.min}–${r.max}`);
const overlaps = (a: { min: number; max: number }, b: { min: number; max: number }, tol: number) => a.min - tol <= b.max && b.min - tol <= a.max;

export function enrichCandidate(input: {
  candidate: CurationCandidate;
  label: string;
  match: RdwMatch;
  mapping: RdwMappingResult;
  giavehIndex: ReadonlyMap<string, GiavehRecord[]>;
}): EnrichmentResult {
  const { candidate: c, match, mapping } = input;
  const hp = c.technicalIdentity.homologationPowertrain as HomologationPowertrain;
  const pt = productPowertrain(c.powertrain.productClass);
  const exact = match.level === 'EXACT';
  const obs = exact ? mapping.observations : [];

  // Antes (D1): claves EEA + presencia IDAE.
  const before = new Set([...c.specValues.map((v) => v.specKey), ...c.idaeFieldsPresent.map((f) => f.split(' ')[0]!)]);
  const coverageBefore = d1Coverage(pt, before, D1_PARTIAL);

  // DGT con la regla existente: primero solo con entradas EEA; después con la norma Euro de RDW.
  const eeaRangeKm = eeaRange(c, 'rng.electric_combined_km');
  const rdwRangeObs = obs.find((o) => o.key === 'rng.electric_combined_km' && o.measurementBasis?.range_type !== 'EAER');
  const euro = obs.find((o) => o.key === 'emissions_standard_family')?.value as 'EURO_5' | 'EURO_6' | 'EURO_7' | undefined;
  const dgtIn = (family: 'EURO_5' | 'EURO_6' | 'EURO_7' | 'UNKNOWN', range?: { min: number; max: number }) =>
    dgtLabel({ homologation_powertrain: hp, ...(c.technicalIdentity.fuel ? { fuel_type: c.technicalIdentity.fuel } : {}), emissions_standard_family: family, ...(range ? { electric_range_km: range } : {}) });
  const dgtEea = dgtIn('UNKNOWN', eeaRangeKm);
  const dgtAll = dgtIn(euro ?? 'UNKNOWN', eeaRangeKm ?? (rdwRangeObs ? obsRange(rdwRangeObs) : undefined));
  const afterEeaRule = new Set(before);
  if (dgtEea.label) afterEeaRule.add('emi.dgt_label_es');
  const coverageAfterEeaRule = d1Coverage(pt, afterEeaRule, D1_PARTIAL);

  // Después: + RDW (solo EXACT).
  const after = new Set(afterEeaRule);
  const partialAfter = new Set(D1_PARTIAL);
  const fieldsAdded: string[] = [];
  const corroborated: string[] = [];
  const structuralAdded: string[] = [];
  for (const o of obs) {
    if (o.target === 'structural') {
      if (o.key === 'seats') after.add('seats');
      if (!['emissions_standard_raw', 'commercial_name', 'manufacturer_type', 'homologation_powertrain', 'gearbox_code', 'body_code_eu'].includes(o.key)) structuralAdded.push(`${o.key}=${o.value}`);
      continue;
    }
    if (before.has(o.key)) corroborated.push(o.key);
    else fieldsAdded.push(o.key);
    after.add(o.key);
    if (o.min !== undefined || o.mappingConfidence === 'INFERRED') partialAfter.add(o.key);
  }
  if (!before.has('seats') && after.has('seats')) fieldsAdded.push('seats');
  if (dgtAll.label) after.add('emi.dgt_label_es');
  // La etiqueta cuenta como campo de RDW solo si la regla necesitó su norma Euro (si no, ya la daban EEA + regla).
  if (dgtAll.label && !dgtEea.label) fieldsAdded.push('emi.dgt_label_es');
  const coverageAfter = d1Coverage(pt, after, partialAfter);

  // Contraste EEA ↔ RDW (conservar, no resolver).
  const conflicts: Conflict[] = [];
  const check = (key: string, eea: { min: number; max: number } | undefined, o: RdwObservation | undefined, tol: number, note = '') => {
    const r = o && obsRange(o);
    if (!eea || !r) return;
    if (!overlaps(eea, r, tol)) conflicts.push({ key, eea: fmt(eea), rdw: fmt(r), note: note || `EEA and RDW disagree beyond ±${tol} for the same exact homologation` });
  };
  const first = (key: string, pred: (o: RdwObservation) => boolean = () => true) => obs.find((o) => o.key === key && pred(o));
  const power = hp === 'ICE' ? 'perf.power_max_kw' : hp === 'BEV' ? 'perf.power_electric_kw' : 'perf.power_ice_kw';
  const ep = c.technicalIdentity.enginePowerKw;
  check(power, ep !== undefined ? { min: ep, max: ep } : undefined, first(power), 1);
  check('pt.displacement_cc', c.technicalIdentity.engineCapacityCc !== undefined ? { min: c.technicalIdentity.engineCapacityCc, max: c.technicalIdentity.engineCapacityCc } : undefined, first('pt.displacement_cc'), 5);
  check('dim.mass_kg', eeaRange(c, 'dim.mass_kg'), first('dim.mass_kg'), 10, 'running-order mass: EEA per registration vs RDW per version');
  check('emi.co2_combined_gkm (WLTP)', eeaRange(c, 'emi.co2_combined_gkm', 'Ewltp (g/km)'), first('emi.co2_combined_gkm', (o) => o.testCycle === 'WLTP'), 2);
  check('nrg.electric_combined_kwh100', eeaRange(c, 'nrg.electric_combined_kwh100'), first('nrg.electric_combined_kwh100'), 0.3);
  check('rng.electric_combined_km', eeaRangeKm, rdwRangeObs, 5);
  check('dim.wheelbase_mm', eeaRange(c, 'dim.wheelbase_mm'), first('dim.wheelbase_mm'), 5);
  const rdwHp = first('homologation_powertrain')?.value;
  if (rdwHp && rdwHp !== hp) conflicts.push({ key: 'homologation_powertrain', eea: hp, rdw: String(rdwHp), note: 'RDW drive indicators disagree with EEA fuel mode' });

  const rejected = [
    ...(exact ? [] : match.nearMisses.map((n) => `${n.level}: ${n.tan} ${n.variant} (values not used)`)),
    ...(exact ? mapping.anomalies : []),
    ...obs.filter((o) => o.key === 'gearbox_code').map((o) => `gearbox code ${o.value} (no published code list)`),
  ];
  const giaveh = giavehLookup(input.giavehIndex, c.technicalIdentity.typeApprovalNumber, c.technicalIdentity.types);

  const eeaRights = rightsDecision('S01');
  const reusable = [...before].filter((k) => c.specValues.some((v) => v.specKey === k)).sort();
  const pending = [...new Set([...fieldsAdded, ...corroborated.map((k) => `${k} (RDW corroboration)`), ...c.idaeFieldsPresent])].sort();
  return {
    candidateId: c.candidateId,
    label: input.label,
    identityBefore: c.identityStatus,
    // La identidad comercial no cambia con RDW (solo modelo): ver documentación. La técnica EEA↔RDW es `technicalMatch`.
    identityAfter: c.identityStatus,
    technicalMatch: match.level,
    giaveh: giaveh.status,
    coverageBefore,
    coverageAfterEeaRule,
    coverageAfter,
    fieldsAdded: [...new Set(fieldsAdded)].sort(),
    structuralAdded: [...new Set(structuralAdded)].sort(),
    corroborated: [...new Set(corroborated)].sort().filter((k) => !conflicts.some((x) => x.key.startsWith(k))),
    rejected,
    conflicts,
    revisionConflicts: exact ? mapping.revisionConflicts : [],
    dgt: {
      ...(c.qualitySummary.categories.Eco === 'AVAILABLE_FROM_D1' ? { before: 'present' } : {}),
      ...(dgtEea.label ? { afterEeaRule: dgtEea.label } : {}),
      ...(dgtAll.label ? { after: dgtAll.label } : {}),
      source: dgtEea.label ? 'EEA+RULE' : dgtAll.label ? 'EEA+RDW+RULE' : 'NONE',
      reason: (dgtAll.label ? dgtAll : dgtEea).reason,
    },
    rights: {
      reusableFields: eeaRights === 'CONDITIONAL' ? reusable : [],
      pendingFields: pending,
      bySource: { S01: eeaRights, ...(exact ? { S11: 'PENDING_REVIEW (CC0 evidence)' as const } : {}), S12: 'CONDITIONAL (Ley 37/2007 art. 8)' as const, ...(c.idaeFieldsPresent.length ? { S02: rightsDecision('S02') } : {}) },
    },
    publicEligible: false,
  };
}
