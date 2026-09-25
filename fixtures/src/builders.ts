import { createHash } from 'node:crypto';
import type { SpecValueInput } from '@vscar/vehicle-schema';

/** UUID determinista (formato v5) a partir de un nombre: fixtures reproducibles. */
export function uid(name: string): string {
  const h = createHash('sha1').update(`vscar-fixture:${name}`).digest('hex');
  const variant = ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(18, 20)}-${h.slice(20, 32)}`;
}

/** Fecha de consulta de las fuentes en Dataset Core v0.1. */
export const RETRIEVED = '2026-09-24';

type SpecDefaults = Pick<SpecValueInput, 'variant_id' | 'source_id' | 'source_url'> & Partial<SpecValueInput>;

/**
 * Constructor de SpecValues para un caso: aplica defaults del mercado ES y un id determinista.
 * `tag` distingue varios valores de la misma clave (ciclos, periodos, fuentes).
 */
export function specBuilder(caseName: string, defaults: SpecDefaults) {
  return (spec_key: string, fields: Partial<SpecValueInput> & Pick<SpecValueInput, 'unit'>, tag = 'main'): SpecValueInput => ({
    id: uid(`${caseName}:${spec_key}:${tag}`),
    spec_key,
    source_market: 'ES',
    reference_market: 'ES',
    source_authority: 'OFFICIAL_MANUFACTURER',
    mapping_confidence: 'EXACT',
    homologation_match: 'NOT_APPLICABLE',
    retrieved_at: RETRIEVED,
    ...defaults,
    ...fields,
  });
}
