import { createHash } from 'node:crypto';
import { TRAFICOM_DATASET, traficomBody, traficomTransmission, type RdwObservation, type TraficomAggregate } from '@vscar/data-connectors';
import { detectConflicts, engineUsability } from '@vscar/quality';
import {
  CuratedAttribute,
  CuratedObservation,
  CuratedTechnicalVehicle,
  Source,
  SpecValue,
  technicalKeyOf,
  type CuratedRightsStatus,
  type SpecValueInput,
} from '@vscar/vehicle-schema';
import { d1Coverage, productPowertrain, rightsDecision } from './assess.ts';
import { RDW_SOURCE_RECORD, rdwSpecValues } from './rdw-spec-values.ts';
import type { CommercialIdentityEntry } from './commercial.ts';
import type { CurationCandidate } from './schema.ts';

/**
 * Step D1.6 — plan de importación de la capa de CURACIÓN TÉCNICA (ADR-019 B). Puro y determinista: mismas entradas →
 * mismas filas e ids. Solo fuentes oficiales con clave exacta (EEA S01, RDW S11, Traficom S13) y la identidad
 * comercial ya curada en D1.2. Las fuentes de investigación (S14–S19) nunca entran aquí.
 * Reutiliza el modelo `SpecValue`, `engineUsability` y el Conflict Engine; no hay un segundo motor de calidad.
 */

export const CURATION_MARKET = 'ES' as const;

/** UUID determinista (formato v5) para filas de curación. */
export function curationUuid(name: string): string {
  const h = createHash('sha256').update(`vscar-curation:${name}`).digest('hex');
  const variant = ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(18, 20)}-${h.slice(20, 32)}`;
}
export const curatedVehicleId = (technicalKey: string) => curationUuid(`vehicle:${CURATION_MARKET}:${technicalKey}`);

/** Fuentes oficiales de la capa técnica (ids estables; S01 coincide con el registro de los fixtures). */
const fixtureUid = (name: string) => {
  const h = createHash('sha1').update(`vscar-fixture:${name}`).digest('hex');
  const variant = ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(18, 20)}-${h.slice(20, 32)}`;
};
export const EEA_SOURCE_RECORD: Source = Source.parse({ id: fixtureUid('source:eea'), code: 'S01', name: 'EEA — CO2 emissions from new passenger cars (discodata)', source_authority: 'OFFICIAL_AUTHORITY', market_code: 'EU', base_url: 'https://discodata.eea.europa.eu/' });
export const TRAFICOM_SOURCE_RECORD: Source = Source.parse({ id: curationUuid('source:S13:traficom'), code: 'S13', name: TRAFICOM_DATASET.name, source_authority: 'OFFICIAL_AUTHORITY', market_code: 'FI', base_url: TRAFICOM_DATASET.catalog_url, notes: `${TRAFICOM_DATASET.license}; ${TRAFICOM_DATASET.attribution}` });
export const IDAE_SOURCE_CODE = 'S02';
export const TECHNICAL_SOURCES: readonly Source[] = [EEA_SOURCE_RECORD, RDW_SOURCE_RECORD, TRAFICOM_SOURCE_RECORD];
const EEA_URL = 'https://discodata.eea.europa.eu/';

/** Derechos tal como están en el registro (SOURCE_RIGHTS): nunca se aprueban aquí. */
export function curatedRights(code: string): CuratedRightsStatus {
  const d = rightsDecision(code);
  return d === 'VERIFIED_PUBLIC_USE' ? 'APPROVED' : d === 'CONDITIONAL' ? 'CONDITIONAL' : d === 'PENDING_REVIEW' ? 'PENDING' : 'DENIED';
}

export interface TechnicalPlanInput {
  candidate: CurationCandidate;
  rdw: { level: string; observations: readonly RdwObservation[]; retrievedAt: string };
  traficom?: TraficomAggregate;
  traficomRetrievedAt: string;
  commercial?: CommercialIdentityEntry;
  /** Solapamiento con el catálogo existente (D1.2): DUPLICATE / PROBABLE_DUPLICATE_* → no se cura como nuevo. */
  catalogOverlap: readonly string[];
}

export interface TechnicalPlanResult {
  technicalKey: string;
  eligible: boolean;
  exclusion?: string;
  item?: { vehicle: CuratedTechnicalVehicle; attributes: CuratedAttribute[]; observations: CuratedObservation[] };
  invalid: string[];
  criticalCompleteness: number;
  missingCritical: string[];
}

/** Valor resumido de la EEA (candidata D1) → `SpecValue` real. Los rangos se conservan (nunca un promedio). */
export function eeaCuratedSpecValues(c: CurationCandidate, vehicleId: string): { values: SpecValue[]; invalid: string[] } {
  const values: SpecValue[] = [];
  const invalid: string[] = [];
  for (const v of c.specValues) {
    const input: SpecValueInput = {
      id: curationUuid(`eea:${vehicleId}:${v.specKey}:${v.externalField}:${v.year}:${v.status}`),
      variant_id: vehicleId,
      spec_key: v.specKey,
      ...(v.value !== undefined ? { value: v.value } : { value_min: v.min!, value_max: v.max!, range_basis: 'UNSPECIFIED' }),
      unit: v.unit,
      source_id: EEA_SOURCE_RECORD.id,
      source_url: EEA_URL,
      source_market: 'ES',
      reference_market: 'ES',
      source_authority: 'OFFICIAL_AUTHORITY',
      mapping_confidence: 'EXACT',
      homologation_match: 'NOT_APPLICABLE',
      retrieved_at: '2026-10-16',
      ...(v.testCycle ? { test_cycle: v.testCycle } : {}),
      ...(v.testCycleInferred ? { test_cycle_inferred: v.testCycleInferred, cycle_evidence: v.notes ?? `EEA ${v.year} ${v.status}: ${v.externalField} reported for the exact key` } : {}),
      status: 'DRAFT',
      provisional: v.status === 'P',
      ...(v.measurementBasis ? { measurement_basis: v.measurementBasis as SpecValueInput['measurement_basis'] } : {}),
      external_field: v.externalField,
      transformation: v.externalField.startsWith('Z (Wh/km)') ? 'unit_conversion' : 'identity',
      transformation_version: 1,
      notes: [`EEA ${v.year} ${v.status === 'F' ? 'final' : 'provisional'}`, v.distribution ? `distribution ${v.distribution.map(([x, n]) => `${x}×${n}`).join(', ')}` : undefined, v.notes].filter(Boolean).join(' · '),
    };
    const p = SpecValue.safeParse(input);
    if (p.success) values.push(p.data);
    else invalid.push(`${v.specKey} (${v.externalField} ${v.year}): ${p.error.issues.map((i) => i.message).join('; ')}`);
  }
  return { values, invalid };
}

const BEV_GEARS = 'single_speed';

export function buildTechnicalPlan(input: TechnicalPlanInput): TechnicalPlanResult {
  const c = input.candidate;
  const t = c.technicalIdentity;
  const identity = { type_approval_number: t.typeApprovalNumber.toUpperCase(), variant_code: t.variant, version_code: t.version, confidence: 'EXACT' as const };
  const technicalKey = technicalKeyOf(identity);
  const base = { technicalKey, invalid: [] as string[], criticalCompleteness: 0, missingCritical: [] as string[] };
  if (c.identityStatus === 'CONFLICTED' || !t.typeApprovalNumber) return { ...base, eligible: false, exclusion: 'technical identity not exact' };
  if (input.rdw.level !== 'EXACT') return { ...base, eligible: false, exclusion: `RDW does not corroborate the exact key (${input.rdw.level})` };
  const dup = input.catalogOverlap.find((k) => k === 'DUPLICATE' || k.startsWith('PROBABLE_DUPLICATE'));
  if (dup) return { ...base, eligible: false, exclusion: `${dup} of an existing catalogue variant: reconcile, do not insert` };

  const id = curatedVehicleId(technicalKey);
  const eea = eeaCuratedSpecValues(c, id);
  const rdw = rdwSpecValues(input.rdw.observations, { id, market_code: 'ES' }, input.rdw.retrievedAt);
  const all = [...eea.values, ...rdw.values];

  /* Calidad con el motor existente: usabilidad por valor + conflictos entre TODOS los valores (también los de otra fuente). */
  const conflicts = detectConflicts(all);
  const groupOf = new Map<string, string>();
  for (const k of conflicts) {
    const g = `${k.spec_key}:${createHash('sha256').update([...k.value_ids].sort().join(',')).digest('hex').slice(0, 12)}`;
    for (const vid of k.value_ids) groupOf.set(vid, g);
  }
  const sourceCode = (v: SpecValue) => (v.source_id === EEA_SOURCE_RECORD.id ? 'S01' : 'S11');
  const record = (v: SpecValue) => (v.source_id === EEA_SOURCE_RECORD.id ? `S01:${technicalKey}:${v.external_field}:${v.notes?.split(' · ')[0] ?? ''}` : `S11:${v.notes?.split(' · ')[0]?.replace(/^RDW /, '') ?? technicalKey}`);
  const observations = all
    .map((v) => {
      const usability = engineUsability(v);
      const group = groupOf.get(v.id);
      return CuratedObservation.parse({
        value: group ? { ...v, status: 'CONFLICT' } : v,
        source_code: sourceCode(v),
        source_record: record(v).slice(0, 512),
        identity_match: 'EXACT_TAN_VA_VE',
        rights_status: curatedRights(sourceCode(v)),
        quality_status: usability.usable && !group ? 'USABLE' : 'NOT_USABLE',
        quality_reasons: [...usability.reasons, ...(group ? ['value in unresolved CONFLICT (kept, never averaged)'] : [])],
        conflict_status: group ? 'IN_CONFLICT' : 'NONE',
        ...(group ? { conflict_group: group } : {}),
      });
    })
    .sort((a, b) => a.value.id.localeCompare(b.value.id));

  /* Atributos estructurales observados con clave exacta. */
  const attributes: CuratedAttribute[] = [];
  const attr = (kind: 'TECHNICAL' | 'COMMERCIAL', attribute: CuratedAttribute['attribute'], value: string | number, status: CuratedAttribute['status'], source_code: string, source_record: string, retrieved_at: string, evidence: string) =>
    attributes.push(CuratedAttribute.parse({ id: curationUuid(`attr:${id}:${attribute}:${source_code}:${value}`), vehicle_id: id, kind, attribute, value: String(value), status, source_code, source_record: source_record.slice(0, 512), retrieved_at, rights_status: curatedRights(source_code), evidence }));
  const structural = (key: string) => input.rdw.observations.find((o) => o.target === 'structural' && o.key === key && o.mappingConfidence === 'CROSS_MARKET_EXACT_HOMOLOGATION');
  const rdwRec = (o: RdwObservation) => `S11:${o.sourceRecordIds.join(';')}`;
  for (const k of ['seats', 'doors', 'gears', 'drivetrain', 'body_type'] as const) {
    const o = structural(k);
    if (o && o.value !== undefined) attr('TECHNICAL', k, o.value as string | number, 'OBSERVED', 'S11', rdwRec(o), input.rdw.retrievedAt, `RDW ${o.dataset} ${o.externalField} for the exact TAN+Va+Ve`);
  }
  if (c.powertrain.productClass === 'BEV' && structural('gears')?.value === 1) attr('TECHNICAL', 'transmission', BEV_GEARS, 'OBSERVED', 'S11', rdwRec(structural('gears')!), input.rdw.retrievedAt, 'BEV with 1 gear in RDW (D1.1/D1.3 rule)');
  else {
    const tx = traficomTransmission(input.traficom);
    if (tx.value) attr('TECHNICAL', 'transmission', tx.value, 'OBSERVED', 'S13', `S13:${input.traficom!.key}`, input.traficomRetrievedAt, `${tx.reason}; share ${Math.round((tx.share ?? 0) * 1000) / 10} % of ${input.traficom!.vehicles} FI vehicles`);
  }
  if (!structural('body_type')) {
    const b = traficomBody(input.traficom);
    if (b.value) attr('TECHNICAL', 'body_type', b.value, 'OBSERVED', 'S13', `S13:${input.traficom!.key}`, input.traficomRetrievedAt, `${b.reason}; ${input.traficom!.vehicles} FI vehicles`);
  }

  /* Identidad comercial: solo lo ya curado en D1.2. Generación y año-modelo: ninguna fuente → sin fila (nunca inventados). */
  const ce = input.commercial;
  if (ce) {
    const designation = ce.evidence.find((e) => e.sourceId === 'S01' && e.field === 'Cn' && e.share === 1 && e.text);
    if (designation) attr('COMMERCIAL', 'commercial_designation', designation.text!, ce.identityConfidence === 'EXACT' ? 'EXACT' : 'PARTIAL', 'S01', `S01:${designation.record}`, '2026-10-16', `official ES registration designation (EEA Cn), ${designation.registrations} registrations, share 1`);
    if (ce.commercialTrim && ce.identityConfidence === 'EXACT') {
      const trimSource = ce.evidence.some((e) => e.sourceId === 'S02') && !designation?.text?.toUpperCase().includes(ce.commercialTrim.toUpperCase()) ? IDAE_SOURCE_CODE : 'S01';
      attr('COMMERCIAL', 'trim', ce.commercialTrim, 'EXACT', trimSource, `D1.2 commercial-identity-v1:${ce.rank}`, '2026-10-16', `D1.2 curated trim (literal in the cited ${trimSource === 'S01' ? 'EEA designation' : 'IDAE record'})`);
    }
  }
  attributes.sort((a, b) => a.id.localeCompare(b.id));

  /* Completitud crítica con la función existente (D1/D1.1). */
  const pt = productPowertrain(c.powertrain.productClass);
  const keys = new Set([...all.map((v) => v.spec_key), ...attributes.filter((a) => a.attribute === 'seats').map(() => 'seats')]);
  const cov = d1Coverage(pt, keys, new Set());

  const sourceCodes = [...new Set([...observations.map((o) => o.source_code), ...attributes.map((a) => a.source_code)])].sort();
  const commercialStatus = ce?.identityConfidence === 'EXACT' ? 'EXACT' : ce?.identityConfidence === 'PARTIAL' ? 'PARTIAL' : 'UNCONFIRMED';
  const blockers = [
    'generation not verified (no source)',
    'model_year not verified (no source)',
    ...(commercialStatus === 'EXACT' ? [] : ['trim not confirmed']),
    ...cov.missingCritical.map((k) => `critical key missing: ${k}`),
    ...[...new Set(observations.concat().filter((o) => o.rights_status === 'PENDING').map((o) => o.source_code))].map((s) => `${s} rights pending human approval`),
    ...(observations.some((o) => o.conflict_status === 'IN_CONFLICT') ? ['open value conflict (kept, needs review)'] : []),
  ];
  const vehicle = CuratedTechnicalVehicle.parse({
    id,
    market_code: CURATION_MARKET,
    technical_key: technicalKey,
    brand: c.commercialIdentity.make,
    model: c.commercialIdentity.family.replace(new RegExp(`^${c.commercialIdentity.make}\\s+`), ''),
    technical_identity: identity,
    homologation_powertrain: t.homologationPowertrain,
    product_class: c.powertrain.productClass,
    ...(t.fuel ? { fuel_type: t.fuel } : {}),
    registration_period: { first_observed_year: Math.min(...c.modelYear.eeaYears), last_observed_year: Math.max(...c.modelYear.eeaYears) },
    commercial_identity_status: commercialStatus,
    curation_status: eea.values.length && rdw.values.length ? 'CURATED' : 'PENDING_EVIDENCE',
    source_codes: sourceCodes,
    d1_candidate_id: c.candidateId,
    ...(c.rank ? { d1_rank: c.rank } : {}),
    blockers,
    notes: 'Step D1.6 technical curation (ADR-019 B). Not selectable: promotion to the reference catalogue is explicit and channel-gated.',
  });
  return { technicalKey, eligible: true, item: { vehicle, attributes, observations }, invalid: [...eea.invalid, ...rdw.invalid], criticalCompleteness: cov.criticalCompleteness, missingCritical: cov.missingCritical };
}

