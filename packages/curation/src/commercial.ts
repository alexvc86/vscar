import { z } from 'zod';
import { normalizeTan, tanBaseOf, type IdaeRecord } from '@vscar/data-connectors';
import { familyOfIdaeRecord, FAMILIES } from './families.ts';
import { IdentityStatus, type CurationCandidate } from './schema.ts';

/**
 * Step D1.2 — identidad comercial, separada de la técnica (ADR-007). Reutiliza `IdentityStatus` (sin enums nuevos):
 * - EXACT: un texto oficial ligado a la clave técnica exacta nombra modelo + acabado de forma única.
 * - PARTIAL: hay evidencia oficial del modelo (y quizá motor/caja/carrocería o un conjunto de acabados), no del acabado único.
 * - UNCONFIRMED: no hay denominación oficial para la clave exacta.
 * - CONFLICTED: los textos oficiales de la clave exacta nombran modelos distintos.
 * Regla anti-invención: cada valor curado debe aparecer LITERALMENTE en un texto de evidencia citado.
 */

/* ───────── Evidencia automática ───────── */

export interface DesignationShare {
  name: string;
  registrations: number;
  share: number;
}

export interface CommercialEvidenceSummary {
  /** Denominaciones EEA (`Cn`, matriculaciones en ES) de la clave exacta, todos los años. */
  eeaDesignations: DesignationShare[];
  /** Filas IDAE cuyo código impreso = Va/Ve de la clave (no hay TAN en IDAE). */
  idaeCoded: Array<{ line: number; sameFamily: boolean; hasVersionText: boolean }>;
  /** El código Va/Ve aparece en filas IDAE de OTRO modelo (no es único entre modelos). */
  idaeCodeCollision: boolean;
  level: 'CODE_VERSION_TEXT' | 'DESIGNATION_UNIQUE_DETAILED' | 'DESIGNATION_MULTIPLE_DETAILED' | 'MODEL_ONLY' | 'NONE';
  /** Estado orientativo (los EXACT solo los da la curación validada). */
  indicative: IdentityStatus;
}

const words = (s: string) => s.toUpperCase().replace(/[^A-Z0-9&]+/g, ' ').trim().split(' ').filter(Boolean);

/** ¿La denominación aporta algo más que marca + nombre de modelo? (p. ej. "308 5P ALLURE BLUEHDI 130 S&S EAT8"). */
export function isDetailedDesignation(name: string, brand: string, familyLabel: string): boolean {
  const base = new Set([...words(brand), ...words(familyLabel), ...words(familyLabel.replace(/^\S+\s/, ''))]);
  return words(name).filter((w) => !base.has(w)).length >= 2;
}

export function summarizeCommercialEvidence(c: CurationCandidate, designations: ReadonlyMap<string, number>, idae: readonly IdaeRecord[]): CommercialEvidenceSummary {
  const family = FAMILIES.find((f) => f.id === c.familyId)!;
  const total = [...designations.values()].reduce((a, b) => a + b, 0);
  const eeaDesignations = [...designations.entries()]
    .map(([name, registrations]) => ({ name, registrations, share: total ? registrations / total : 0 }))
    .sort((a, b) => b.registrations - a.registrations || a.name.localeCompare(b.name));
  const { variant, version } = c.technicalIdentity;
  const coded = idae.filter((r) => r.scope === 'MAINLAND' && r.hints.codeCandidate?.variant.toUpperCase() === variant && r.hints.codeCandidate.version.toUpperCase() === version);
  const idaeCoded = coded.map((r) => ({ line: r.line, sameFamily: familyOfIdaeRecord(family, r.make, r.model), hasVersionText: r.version.replace(/\(?[A-Z0-9]+\/[A-Z0-9]+\)?/i, '').trim().length > 0 }));
  const idaeCodeCollision = idaeCoded.some((x) => !x.sameFamily) && idaeCoded.some((x) => x.sameFamily);
  const detailed = eeaDesignations.filter((d) => isDetailedDesignation(d.name, family.brand, family.label));
  const dominant = eeaDesignations[0];
  const level: CommercialEvidenceSummary['level'] = idaeCoded.some((x) => x.sameFamily && x.hasVersionText)
    ? 'CODE_VERSION_TEXT'
    : dominant && dominant.share >= 0.95 && isDetailedDesignation(dominant.name, family.brand, family.label)
      ? 'DESIGNATION_UNIQUE_DETAILED'
      : detailed.length > 1
        ? 'DESIGNATION_MULTIPLE_DETAILED'
        : eeaDesignations.length
          ? 'MODEL_ONLY'
          : 'NONE';
  return { eeaDesignations, idaeCoded, idaeCodeCollision, level, indicative: level === 'NONE' ? 'UNCONFIRMED' : 'PARTIAL' };
}

/* ───────── Correspondencias curadas (artefacto versionado) ───────── */

export const CommercialEvidenceRef = z
  .object({
    sourceId: z.enum(['S01', 'S02', 'S11']),
    /** S01: `<año><F|P>:<TAN>|<Va>|<Ve>` · S02: `S02:<sha12>:L<línea>` · S11: `S11:x5v3-sewk:<TAN>|<Va>|<Ve>`. */
    record: z.string().min(1),
    field: z.string().min(1),
    /** Texto literal (solo fuentes redistribuibles: S01 CC BY, S11 CC0). Para S02 se resuelve del bruto local. */
    text: z.string().optional(),
    registrations: z.number().int().nonnegative().optional(),
    share: z.number().min(0).max(1).optional(),
  })
  .strict();
export type CommercialEvidenceRef = z.infer<typeof CommercialEvidenceRef>;

export const CommercialIdentityEntry = z
  .object({
    candidateId: z.string().uuid(),
    rank: z.number().int().positive(),
    technicalIdentityKey: z.string(),
    commercialBrand: z.string(),
    commercialModel: z.string().optional(),
    commercialGeneration: z.null(),
    commercialEngine: z.string().optional(),
    commercialTransmission: z.string().optional(),
    commercialBody: z.string().optional(),
    /** Acabado único; o `commercialTrimSet` si la misma versión técnica se vende con varios. */
    commercialTrim: z.string().optional(),
    commercialTrimSet: z.array(z.string()).optional(),
    commercialModelYear: z.null(),
    market: z.literal('ES'),
    evidence: z.array(CommercialEvidenceRef).min(1),
    identityConfidence: IdentityStatus,
    /** Derechos de la evidencia que sostiene el acabado (no del dato técnico). */
    evidenceRights: z.enum(['CONDITIONAL', 'PENDING_REVIEW']),
    notes: z.array(z.string()),
  })
  .strict();
export type CommercialIdentityEntry = z.infer<typeof CommercialIdentityEntry>;

export const CommercialIdentityArtifact = z
  .object({
    artifactVersion: z.literal(1),
    step: z.literal('D1.2'),
    curatedAt: z.string(),
    curator: z.string(),
    rules: z.array(z.string()),
    entries: z.array(CommercialIdentityEntry),
  })
  .strict();
export type CommercialIdentityArtifact = z.infer<typeof CommercialIdentityArtifact>;

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9&]+/g, ' ').trim();

/**
 * Validación anti-invención: cada valor curado aparece literalmente (normalizado) en algún texto de evidencia;
 * EXACT exige acabado único; un acabado de denominación EEA exige cuota ≥ 95 % de las matriculaciones.
 * `resolveText` obtiene el texto de evidencias no redistribuibles (S02) desde el bruto local.
 */
export function validateCommercialEntry(e: CommercialIdentityEntry, resolveText: (ref: CommercialEvidenceRef) => string | undefined = (r) => r.text): string[] {
  const issues: string[] = [];
  const texts = e.evidence.map((r) => resolveText(r)).filter((t): t is string => !!t).map(norm);
  if (!texts.length) issues.push('no resolvable evidence text');
  const values: Array<[string, string | undefined]> = [
    ['commercialModel', e.commercialModel],
    ['commercialEngine', e.commercialEngine],
    ['commercialTransmission', e.commercialTransmission],
    ['commercialBody', e.commercialBody],
    ['commercialTrim', e.commercialTrim],
    ...(e.commercialTrimSet ?? []).map((t): [string, string] => ['commercialTrimSet', t]),
  ];
  for (const [field, v] of values) {
    if (v !== undefined && !texts.some((t) => ` ${t} `.includes(` ${norm(v)} `))) issues.push(`${field} "${v}" does not appear literally in the cited evidence`);
  }
  if (e.identityConfidence === 'EXACT') {
    if (!e.commercialTrim) issues.push('EXACT requires a single evidenced trim');
    if (e.commercialTrimSet?.length) issues.push('EXACT cannot carry a trim set');
    const trimRefs = e.evidence.filter((r) => e.commercialTrim && (resolveText(r) ?? '').toUpperCase().includes(e.commercialTrim.toUpperCase()));
    if (trimRefs.length && trimRefs.every((r) => r.sourceId === 'S01' && (r.share ?? 0) < 0.95)) issues.push('trim from an EEA designation requires ≥ 95 % of the exact key registrations');
  }
  if (e.identityConfidence === 'PARTIAL' && e.commercialTrim) issues.push('PARTIAL cannot carry a single trim (use commercialTrimSet)');
  if (e.evidence.some((r) => r.sourceId === 'S11') && e.identityConfidence === 'EXACT' && e.evidence.every((r) => r.sourceId === 'S11')) issues.push('RDW handelsbenaming lists every permitted name of the approval: never sole evidence of commercial identity');
  return issues;
}

/* ───────── Duplicados con el catálogo existente (estrategia canónica) ───────── */

/**
 * Clave canónica = TAN COMPLETO (con extensión) + Va + Ve. Las coincidencias parciales nunca fusionan:
 * - `DUPLICATE`: misma clave completa → ya está en el catálogo.
 * - `PROBABLE_DUPLICATE_TAN_INCOMPLETE`: misma Va/Ve y el catálogo NO guarda el TAN completo (sin TAN, como DC-08,
 *   o solo el TAN base sin extensión) → revisión humana; nunca fusión automática (Va/Ve se repite entre modelos:
 *   BYD SEAL y BYD HAN comparten `SE2D1C/1NXE5E001NL1` en IDAE).
 * - `RELATED_OTHER_EXTENSION`: misma Va/Ve con otra extensión completa → otra revisión, no duplicado.
 * - `CATALOG_PARTIAL_IDENTITY`: el catálogo tiene TAN + Va sin Ve → no comparable con certeza.
 */
export type CatalogOverlapKind = 'DUPLICATE' | 'PROBABLE_DUPLICATE_TAN_INCOMPLETE' | 'RELATED_OTHER_EXTENSION' | 'CATALOG_PARTIAL_IDENTITY' | 'NONE';

export interface CatalogHomologationRef {
  variantSlug: string;
  tan?: string;
  variant?: string;
  version?: string;
}

const hasExtension = (tan: string) => normalizeTan(tan).split('*').length >= 4;

export function catalogOverlap(key: { tan: string; variant: string; version: string }, catalog: readonly CatalogHomologationRef[]): Array<{ kind: Exclude<CatalogOverlapKind, 'NONE'>; variantSlug: string; catalogTan: string }> {
  const tan = normalizeTan(key.tan);
  const va = key.variant.toUpperCase();
  const ve = key.version.toUpperCase();
  const out: Array<{ kind: Exclude<CatalogOverlapKind, 'NONE'>; variantSlug: string; catalogTan: string }> = [];
  for (const h of catalog) {
    if (!h.variant || h.variant.toUpperCase() !== va) continue;
    if (!h.tan) {
      if (h.version?.toUpperCase() === ve) out.push({ kind: 'PROBABLE_DUPLICATE_TAN_INCOMPLETE', variantSlug: h.variantSlug, catalogTan: '(none)' });
      continue;
    }
    const ctan = normalizeTan(h.tan);
    if (!h.version) {
      if (tanBaseOf(ctan) === tanBaseOf(tan)) out.push({ kind: 'CATALOG_PARTIAL_IDENTITY', variantSlug: h.variantSlug, catalogTan: h.tan });
      continue;
    }
    if (h.version.toUpperCase() !== ve) continue;
    if (ctan === tan) out.push({ kind: 'DUPLICATE', variantSlug: h.variantSlug, catalogTan: h.tan });
    else if (!hasExtension(ctan) && ctan === tanBaseOf(tan)) out.push({ kind: 'PROBABLE_DUPLICATE_TAN_INCOMPLETE', variantSlug: h.variantSlug, catalogTan: h.tan });
    else if (tanBaseOf(ctan) === tanBaseOf(tan)) out.push({ kind: 'RELATED_OTHER_EXTENSION', variantSlug: h.variantSlug, catalogTan: h.tan });
  }
  return out;
}
