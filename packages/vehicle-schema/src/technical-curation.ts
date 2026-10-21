import { z } from 'zod';
import { FuelType, HomologationPowertrain, IsoDate, ReferenceMarket, Uuid } from './enums.ts';
import { SpecValue } from './sourced-value.ts';

/**
 * Step D1.6 — capa de CURACIÓN TÉCNICA (ADR-019 variante B, ACCEPTED 2026-10-21).
 *
 *   RESEARCH DATASET  →  CURATED TECHNICAL DATASET  →  SELECTABLE REFERENCE CATALOG
 *
 * Un `CuratedTechnicalVehicle` es un vehículo real identificado por su homologación EXACTA (TAN completo con extensión
 * + variante + versión). Puede existir aunque se desconozcan generación, año-modelo y acabado: esos datos NUNCA se
 * inventan ni se derivan del año de matriculación. No es una `ReferenceVariant`: no aparece en el selector ni alimenta
 * los motores. Pasar al catálogo seleccionable exige una promoción explícita con las reglas del canal (ADR-013).
 */

/** TAN completo con extensión: `E13*2018/858*00639*03` (insensible a mayúsculas; se normaliza). */
export const FULL_TAN = /^E\d{1,2}\*\d{4}\/\d{1,4}\*\d{1,5}\*\d{1,3}$/i;

export const TechnicalIdentity = z
  .object({
    type_approval_number: z.string().regex(FULL_TAN, 'full type-approval number with extension required (e.g. E1*2007/46*0623*35)'),
    variant_code: z.string().min(1),
    version_code: z.string().min(1),
    /** Solo se cura con identidad técnica EXACTA (EEA, corroborada por RDW). */
    confidence: z.literal('EXACT'),
  })
  .strict();
export type TechnicalIdentity = z.infer<typeof TechnicalIdentity>;

const norm = (s: string) => s.trim().toUpperCase().replace(/\s+/g, '');
/** Clave canónica técnica (única por mercado): `TAN|Va|Ve` normalizados. Nunca marca+modelo(+año). */
export const technicalKeyOf = (t: Pick<TechnicalIdentity, 'type_approval_number' | 'variant_code' | 'version_code'>) => `${norm(t.type_approval_number)}|${norm(t.variant_code)}|${norm(t.version_code)}`;

export const CommercialIdentityStatus = z.enum(['UNCONFIRMED', 'PARTIAL', 'EXACT']);
export type CommercialIdentityStatus = z.infer<typeof CommercialIdentityStatus>;

/** CURATED: observaciones oficiales asociadas · PENDING_EVIDENCE: identidad exacta pero falta evidencia mínima · BLOCKED: no se puede curar. */
export const TechnicalCurationStatus = z.enum(['CURATED', 'PENDING_EVIDENCE', 'BLOCKED']);
export type TechnicalCurationStatus = z.infer<typeof TechnicalCurationStatus>;

export const CuratedTechnicalVehicle = z
  .object({
    id: Uuid,
    market_code: ReferenceMarket,
    technical_key: z.string().min(5),
    /** Nombres tal como los registra la fuente oficial (familia), sin acabado inventado. */
    brand: z.string().min(1),
    model: z.string().min(1),
    technical_identity: TechnicalIdentity,
    homologation_powertrain: HomologationPowertrain,
    /** Clase de producto D1 (ICE_OR_MHEV, HEV_OR_MHEV, MHEV, PHEV, BEV): la EEA no separa MHEV de ICE. */
    product_class: z.string().min(1),
    fuel_type: FuelType.optional(),
    /** Años de MATRICULACIÓN observados en la EEA (España). ≠ año-modelo, ≠ periodo de producción. */
    registration_period: z.object({ first_observed_year: z.number().int().nullable(), last_observed_year: z.number().int().nullable() }).strict(),
    commercial_identity_status: CommercialIdentityStatus,
    curation_status: TechnicalCurationStatus,
    /** Códigos de fuente (DATA_RIGHTS_MATRIX) con observaciones asociadas. */
    source_codes: z.array(z.string().min(1)),
    /** Trazabilidad con la candidata D1 (curation_candidates.jsonl). */
    d1_candidate_id: Uuid.optional(),
    d1_rank: z.number().int().positive().optional(),
    blockers: z.array(z.string()),
    notes: z.string().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (technicalKeyOf(v.technical_identity) !== v.technical_key) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['technical_key'], message: 'technical_key must equal TAN|Va|Ve of technical_identity' });
    const r = v.registration_period;
    if (r.first_observed_year !== null && r.last_observed_year !== null && r.first_observed_year > r.last_observed_year) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['registration_period'], message: 'first_observed_year must be <= last_observed_year' });
  });
export type CuratedTechnicalVehicle = z.infer<typeof CuratedTechnicalVehicle>;
export type CuratedTechnicalVehicleInput = z.input<typeof CuratedTechnicalVehicle>;

/**
 * Atributos estructurales (TECHNICAL) y candidatos comerciales (COMMERCIAL) con su estado. Separaciones obligatorias:
 * `registration_year ≠ model_year`, `production_period ≠ model_year`, `generation_candidate ≠ generation_verified`,
 * `commercial_trim ≠ technical_homologation`.
 */
export const TECHNICAL_ATTRIBUTES = ['transmission', 'body_type', 'drivetrain', 'seats', 'doors', 'gears'] as const;
export const COMMERCIAL_ATTRIBUTES = ['generation', 'model_year', 'trim', 'commercial_designation'] as const;
export const CuratedAttributeName = z.enum([...TECHNICAL_ATTRIBUTES, ...COMMERCIAL_ATTRIBUTES]);
export type CuratedAttributeName = z.infer<typeof CuratedAttributeName>;

/** OBSERVED = hecho técnico de fuente oficial con clave exacta · UNCONFIRMED/PARTIAL/EXACT = candidato comercial. */
export const CuratedAttributeStatus = z.enum(['OBSERVED', 'UNCONFIRMED', 'PARTIAL', 'EXACT']);
export type CuratedAttributeStatus = z.infer<typeof CuratedAttributeStatus>;

/** Estado de derechos de la fuente en el momento de curar (traducción del registro SOURCE_RIGHTS; nunca se aprueba aquí). */
export const CuratedRightsStatus = z.enum(['APPROVED', 'CONDITIONAL', 'PENDING', 'DENIED']);
export type CuratedRightsStatus = z.infer<typeof CuratedRightsStatus>;

export const CuratedAttribute = z
  .object({
    id: Uuid,
    vehicle_id: Uuid,
    kind: z.enum(['TECHNICAL', 'COMMERCIAL']),
    attribute: CuratedAttributeName,
    value: z.string().min(1),
    status: CuratedAttributeStatus,
    source_code: z.string().min(1),
    source_record: z.string().min(1),
    retrieved_at: IsoDate,
    rights_status: CuratedRightsStatus,
    evidence: z.string().min(1),
  })
  .strict()
  .superRefine((a, ctx) => {
    const technical = (TECHNICAL_ATTRIBUTES as readonly string[]).includes(a.attribute);
    if (technical !== (a.kind === 'TECHNICAL')) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['kind'], message: `${a.attribute} is a ${technical ? 'TECHNICAL' : 'COMMERCIAL'} attribute` });
    if (a.kind === 'TECHNICAL' && a.status !== 'OBSERVED') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['status'], message: 'technical attributes are OBSERVED facts from an exact-key source' });
    if (a.kind === 'COMMERCIAL' && a.status === 'OBSERVED') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['status'], message: 'commercial attributes carry UNCONFIRMED/PARTIAL/EXACT' });
    // Año-modelo: nunca a partir del año de matriculación ni del periodo de producción.
    if (a.attribute === 'model_year' && /registr|matricul|production|producci/i.test(a.evidence)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['evidence'], message: 'model_year cannot be derived from registration or production years' });
  });
export type CuratedAttribute = z.infer<typeof CuratedAttribute>;

/** Calidad por observación con el motor existente (`engineUsability` + Conflict Engine); sin segundo motor. */
export const CuratedQualityStatus = z.enum(['USABLE', 'NOT_USABLE']);
export const CuratedConflictStatus = z.enum(['NONE', 'IN_CONFLICT']);

/**
 * Observación técnica = `SpecValue` real (mismo schema y validación por SpecKey; `variant_id` = id del vehículo
 * curado) + metadatos de curación por campo. Los valores contradictorios se conservan todos (nunca un promedio).
 */
export const CuratedObservation = z
  .object({
    value: SpecValue,
    source_code: z.string().min(1),
    /** Registro de origen (fila EEA / recurso y revisión RDW). */
    source_record: z.string().min(1),
    identity_match: z.literal('EXACT_TAN_VA_VE'),
    rights_status: CuratedRightsStatus,
    quality_status: CuratedQualityStatus,
    quality_reasons: z.array(z.string()),
    conflict_status: CuratedConflictStatus,
    conflict_group: z.string().optional(),
  })
  .strict()
  .superRefine((o, ctx) => {
    if (o.rights_status === 'DENIED') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rights_status'], message: 'observations from DENIED sources are never persisted' });
    if (o.value.source_authority === 'SECONDARY_REFERENCE') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value', 'source_authority'], message: 'research/secondary data stays in the research dataset' });
    if (o.conflict_status === 'IN_CONFLICT' && !o.conflict_group) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['conflict_group'], message: 'conflicting observations need a conflict_group' });
  });
export type CuratedObservation = z.infer<typeof CuratedObservation>;
