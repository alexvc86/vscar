import { z } from 'zod';

/**
 * Formato intermedio de curación (Step D1 §18) — `curation_candidates.jsonl`. NO es un seed de producción:
 * D2 lo lee, un curador confirma identidad/datos/derechos, y solo entonces se crean ReferenceVariants.
 *
 * Reglas de contenido (derechos):
 * - Valores EEA (CC BY 4.0, atribución obligatoria): se incluyen con su campo externo y distribución.
 * - IDAE (derechos sin verificar; aviso legal restrictivo): solo REFERENCIAS a filas (línea + SHA-256 del bruto) y
 *   presencia de campos; nunca los valores ni los textos. El fichero en Git es así redistribuible.
 */
export const IdentityStatus = z.enum(['EXACT', 'PARTIAL', 'AMBIGUOUS', 'UNCONFIRMED', 'CONFLICTED']);
export type IdentityStatus = z.infer<typeof IdentityStatus>;

export const CurationStatus = z.enum(['READY_FOR_CURATED_IMPORT', 'NEEDS_IDENTITY_REVIEW', 'NEEDS_DATA_COMPLETION', 'NEEDS_RIGHTS_REVIEW', 'BLOCKED']);
export type CurationStatus = z.infer<typeof CurationStatus>;

export const RightsDecision = z.enum(['VERIFIED_PUBLIC_USE', 'CONDITIONAL', 'PENDING_REVIEW', 'RESTRICTED', 'PROHIBITED']);
export type RightsDecision = z.infer<typeof RightsDecision>;



export const CandidateSpecValue = z
  .object({
    specKey: z.string().min(1),
    sourceId: z.literal('S01'),
    externalField: z.string().min(1),
    unit: z.string(),
    value: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    /** valor → matriculaciones (nunca un promedio). */
    distribution: z.array(z.tuple([z.number(), z.number()])).optional(),
    testCycle: z.enum(['NEDC', 'WLTP', 'UNDECLARED']).optional(),
    testCycleInferred: z.enum(['NEDC_CORRELATED', 'WLTP']).optional(),
    measurementBasis: z.record(z.string()).optional(),
    year: z.number().int(),
    status: z.enum(['F', 'P']),
    notes: z.string().optional(),
  })
  .strict();
export type CandidateSpecValue = z.infer<typeof CandidateSpecValue>;

export const CurationCandidate = z
  .object({
    formatVersion: z.literal(1),
    candidateId: z.string().uuid(),
    rank: z.number().int().positive().optional(),
    shortlisted: z.boolean(),
    pilot: z.boolean(),
    familyId: z.string(),
    sourceRefs: z.array(
      z
        .object({
          sourceId: z.string(),
          /** SHA-256 del bruto (manifiesto). */
          rawSha256: z.array(z.string().regex(/^[0-9a-f]{64}$/)),
          /** EEA: `<año><F|P>:<TAN>|<Va>|<Ve>`; IDAE: `S02:<sha12>:L<línea>`. */
          records: z.array(z.string()),
        })
        .strict(),
    ),
    commercialIdentity: z
      .object({
        make: z.string(),
        family: z.string(),
        /** `Cn` observados en la EEA (texto oficial de matriculación, no la versión comercial). */
        eeaCommercialNames: z.array(z.string()),
        /** Número de versiones comerciales IDAE enlazadas por valores (los textos no se redistribuyen). */
        idaeLinkedVersions: z.number().int().nonnegative(),
        trim: z.literal('UNRESOLVED'),
        generation: z.literal('UNRESOLVED'),
      })
      .strict(),
    technicalIdentity: z
      .object({
        typeApprovalNumber: z.string(),
        typeApprovalBase: z.string(),
        types: z.array(z.string()),
        variant: z.string(),
        version: z.string(),
        siblingVersions: z.number().int().nonnegative(),
        homologationPowertrain: z.string(),
        fuel: z.string().optional(),
        engineCapacityCc: z.number().optional(),
        enginePowerKw: z.number().optional(),
      })
      .strict(),
    modelYear: z
      .object({
        eeaYears: z.array(z.number().int()),
        firstRegistration: z.string().optional(),
        lastRegistration: z.string().optional(),
        period: z.string(),
        /** `model_year` comercial no se deduce de la EEA (Dr = fecha de matriculación). */
        declared: z.literal('UNRESOLVED'),
      })
      .strict(),
    powertrain: z
      .object({
        homologation: z.string(),
        productClass: z.enum(['ICE', 'MHEV', 'HEV', 'PHEV', 'BEV', 'FCEV', 'EREV', 'ICE_OR_MHEV', 'HEV_OR_MHEV']),
        note: z.string().optional(),
      })
      .strict(),
    specValues: z.array(CandidateSpecValue),
    idaeFieldsPresent: z.array(z.string()),
    registrationsEs: z.object({ total: z.number().int().nonnegative(), byYear: z.record(z.number().int().nonnegative()) }).strict(),
    identityStatus: IdentityStatus,
    identityEvidence: z.array(z.string()),
    qualitySummary: z
      .object({
        categories: z.record(z.enum(['AVAILABLE_FROM_D1', 'PARTIAL_FROM_D1', 'NEEDS_S08', 'NOT_APPLICABLE'])),
        criticalCompleteness: z.number().min(0).max(1),
        missingCritical: z.array(z.string()),
        conflicts: z.array(z.string()),
        crossChecks: z.array(z.string()),
      })
      .strict(),
    rightsSummary: z
      .object({
        bySource: z.record(RightsDecision),
        attribution: z.array(z.string()),
        humanApproval: z.literal('PENDING'),
        publicEligible: z.boolean(),
        previewEligible: z.boolean(),
      })
      .strict(),
    curationStatus: CurationStatus,
    blockers: z.object({ identity: z.array(z.string()), data: z.array(z.string()), rights: z.array(z.string()) }).strict(),
    priority: z.object({ score: z.number().min(0).max(100), components: z.record(z.number()) }).strict(),
    existingCatalogOverlap: z.string().optional(),
  })
  .strict();
export type CurationCandidate = z.infer<typeof CurationCandidate>;


