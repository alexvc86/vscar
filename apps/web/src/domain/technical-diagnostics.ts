import type { CuratedAttribute, CuratedObservation, CuratedTechnicalVehicle, Source } from '@vscar/vehicle-schema';

/**
 * Step D1.6 — vista de DIAGNÓSTICO de la capa de curación técnica (ruta interna protegida, nunca indexable).
 * Muestra lo que hay y lo que falta de cada vehículo real, con procedencia, derechos, calidad y conflictos.
 * Un vehículo curado NO es comparable aquí: no está en el catálogo seleccionable y nunca alimenta los motores.
 */

export interface DiagnosticObservation {
  specKey: string;
  value: string;
  unit: string | null;
  source: string;
  sourceName: string;
  record: string;
  rights: CuratedObservation['rights_status'];
  quality: CuratedObservation['quality_status'];
  reasons: string[];
  conflict: CuratedObservation['conflict_status'];
  cycle?: string;
}

export interface DiagnosticVehicle {
  id: string;
  name: string;
  technicalIdentity: { tan: string; variant: string; version: string; confidence: 'EXACT' };
  registration: string;
  productClass: string;
  curationStatus: CuratedTechnicalVehicle['curation_status'];
  commercialStatus: CuratedTechnicalVehicle['commercial_identity_status'];
  commercial: { generation: string | null; modelYear: string | null; trim: string | null; designation: string | null };
  technicalAttributes: { attribute: string; value: string; source: string; rights: string }[];
  observations: DiagnosticObservation[];
  missing: string[];
  blockers: string[];
  sources: { code: string; rights: string[] }[];
  quality: { usable: number; notUsable: number; inConflict: number };
  comparison: { available: false; reason: 'NOT_IN_SELECTABLE_CATALOG' };
}

const fmtValue = (o: CuratedObservation) => {
  const v = o.value;
  if (v.value !== undefined) return String(v.value);
  return `${v.value_min}–${v.value_max}`;
};

export function diagnosticVehicle(input: { vehicle: CuratedTechnicalVehicle; attributes: readonly CuratedAttribute[]; observations: readonly CuratedObservation[]; sources: readonly Source[] }): DiagnosticVehicle {
  const { vehicle: v, attributes, observations, sources } = input;
  const commercial = (a: CuratedAttribute['attribute']) => attributes.find((x) => x.kind === 'COMMERCIAL' && x.attribute === a && x.status === 'EXACT')?.value ?? null;
  const designation = attributes.find((x) => x.attribute === 'commercial_designation');
  const reg = v.registration_period;
  const obs = observations.map((o) => ({
    specKey: o.value.spec_key,
    value: fmtValue(o),
    unit: o.value.unit,
    source: o.source_code,
    sourceName: sources.find((s) => s.id === o.value.source_id)?.name ?? o.source_code,
    record: o.source_record,
    rights: o.rights_status,
    quality: o.quality_status,
    reasons: o.quality_reasons,
    conflict: o.conflict_status,
    ...(o.value.test_cycle ? { cycle: o.value.test_cycle === 'UNDECLARED' && o.value.test_cycle_inferred ? `UNDECLARED (≈${o.value.test_cycle_inferred})` : o.value.test_cycle } : {}),
  }));
  const codes = [...new Set([...observations.map((o) => o.source_code), ...attributes.map((a) => a.source_code)])].sort();
  return {
    id: v.id,
    name: `${v.brand} ${v.model}`,
    technicalIdentity: { tan: v.technical_identity.type_approval_number, variant: v.technical_identity.variant_code, version: v.technical_identity.version_code, confidence: 'EXACT' },
    registration: reg.first_observed_year === null ? '—' : reg.first_observed_year === reg.last_observed_year ? String(reg.first_observed_year) : `${reg.first_observed_year}–${reg.last_observed_year}`,
    productClass: v.product_class,
    curationStatus: v.curation_status,
    commercialStatus: v.commercial_identity_status,
    // Generación y año-modelo: solo con evidencia EXACTA (hoy ninguna fuente) → null, nunca inventados.
    commercial: { generation: commercial('generation'), modelYear: commercial('model_year'), trim: commercial('trim'), designation: designation?.value ?? null },
    technicalAttributes: attributes.filter((a) => a.kind === 'TECHNICAL').map((a) => ({ attribute: a.attribute, value: a.value, source: a.source_code, rights: a.rights_status })),
    observations: [...obs].sort((a, b) => a.specKey.localeCompare(b.specKey) || a.source.localeCompare(b.source)),
    missing: v.blockers.filter((b) => b.startsWith('critical key missing: ')).map((b) => b.slice('critical key missing: '.length)),
    blockers: v.blockers,
    sources: codes.map((code) => ({ code, rights: [...new Set([...observations.filter((o) => o.source_code === code).map((o) => o.rights_status), ...attributes.filter((a) => a.source_code === code).map((a) => a.rights_status)])] })),
    quality: { usable: observations.filter((o) => o.quality_status === 'USABLE').length, notUsable: observations.filter((o) => o.quality_status !== 'USABLE').length, inConflict: observations.filter((o) => o.conflict_status === 'IN_CONFLICT').length },
    comparison: { available: false, reason: 'NOT_IN_SELECTABLE_CATALOG' },
  };
}
