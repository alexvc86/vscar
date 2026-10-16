import { z } from 'zod';

/**
 * Step D1.3 — referencias a catálogos históricos (coches.net, km77, JATO) cuyo uso NO está autorizado.
 * Se guarda solo la referencia (URL, fecha, qué campos existen) y el estado de correspondencia con la clave técnica;
 * **nunca valores**. Estados (alineados con `IdentityStatus`):
 * - `MATCH_CONFIRMED` (≈ EXACT): exige un identificador técnico en la ficha (TAN/Va/Ve). Ninguna ficha lo publica.
 * - `MATCH_COMPATIBLE_UNCONFIRMED` (≈ UNCONFIRMED): motor, potencia, combustible, carrocería y periodo compatibles.
 * - `MATCH_AMBIGUOUS` (≈ AMBIGUOUS): varias fichas compatibles con la misma clave (acabados, periodos).
 * - `MATCH_REJECTED`: un dato de la ficha contradice la identidad técnica (p. ej. tracción, potencia).
 */
export const CatalogMatchStatus = z.enum(['MATCH_CONFIRMED', 'MATCH_COMPATIBLE_UNCONFIRMED', 'MATCH_AMBIGUOUS', 'MATCH_REJECTED']);
export type CatalogMatchStatus = z.infer<typeof CatalogMatchStatus>;

export const CATALOG_FIELDS = ['brand_model', 'generation', 'period_or_model_year', 'trim', 'body', 'engine', 'power', 'transmission', 'homologated_consumption', 'dimensions', 'boot', 'accel_0_100', 'battery', 'ac_dc_charging', 'historical_price', 'warranty', 'equipment', 'type_approval_ids'] as const;

export const CatalogReference = z
  .object({
    rank: z.number().int().positive(),
    candidateId: z.string().uuid(),
    site: z.enum(['coches.net', 'km77', 'JATO']),
    url: z.string().url(),
    consultedAt: z.string(),
    /** Cómo se encontró: buscador o vista manual de la página (sin extracción). */
    method: z.enum(['SEARCH_ENGINE', 'PAGE_VIEW']),
    pageLabel: z.string(),
    fieldsLocated: z.array(z.enum(CATALOG_FIELDS)),
    attribution: z.string().optional(),
    matchStatus: CatalogMatchStatus,
    matchBasis: z.array(z.string()).min(1),
    rightsStatus: z.literal('RESTRICTED'),
    /** Los valores nunca se guardan: el campo está localizado, su reutilización pendiente. */
    valuesStored: z.literal(false),
  })
  .strict();
export type CatalogReference = z.infer<typeof CatalogReference>;

export const CatalogReferenceArtifact = z
  .object({ artifactVersion: z.literal(1), step: z.literal('D1.3'), rules: z.array(z.string()), references: z.array(CatalogReference) })
  .strict();

export function validateCatalogReference(r: CatalogReference): string[] {
  const issues: string[] = [];
  if (r.matchStatus === 'MATCH_CONFIRMED' && !r.fieldsLocated.includes('type_approval_ids')) issues.push('MATCH_CONFIRMED requires type-approval identifiers on the catalogue page');
  if (r.matchStatus === 'MATCH_CONFIRMED' && !r.matchBasis.some((b) => /TAN|type[- ]approval/i.test(b))) issues.push('MATCH_CONFIRMED requires a TAN/Va/Ve basis');
  if (r.matchStatus === 'MATCH_REJECTED' && !r.matchBasis.some((b) => /contradict/i.test(b))) issues.push('MATCH_REJECTED must state the contradicting fact');
  return issues;
}
