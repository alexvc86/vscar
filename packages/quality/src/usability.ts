import type { SpecValue } from '@vscar/vehicle-schema';

export interface Usability {
  usable: boolean;
  reasons: string[];
}

/**
 * ¿Puede este valor alimentar engines públicos? (Catalog v0.2 §3, §4, §6b; ADR-009)
 * No decide si el valor es correcto: eso es plausibilidad + Conflict Engine + revisión humana.
 */
export function engineUsability(v: SpecValue): Usability {
  const reasons: string[] = [];
  if (v.source_authority === 'SECONDARY_REFERENCE') reasons.push('SECONDARY_REFERENCE is QA-only, never a primary value in Alpha');
  if (v.mapping_confidence === 'UNCONFIRMED') reasons.push('mapping_confidence UNCONFIRMED');
  if (v.homologation_match === 'UNCONFIRMED') reasons.push('cross-market value with homologation_match UNCONFIRMED is not used in calculations');
  if (v.homologation_match === 'PARTIAL' && v.status !== 'REVIEWED' && v.status !== 'PUBLISHED') {
    reasons.push('cross-market value with homologation_match PARTIAL needs human review');
  }
  if (v.status === 'REJECTED') reasons.push('value REJECTED in curation');
  if (v.status === 'CONFLICT') reasons.push('value in unresolved CONFLICT');
  return { usable: reasons.length === 0, reasons };
}
