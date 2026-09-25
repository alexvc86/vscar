import type { Homologation, HomologationMatch, MappingConfidence } from '@vscar/vehicle-schema';
import { normalizeTan, type EeaObservation } from './normalize.ts';

/**
 * Emparejamiento observación EEA ↔ Homologation VScar (ADR-007, D1).
 * Nunca se empareja por nombre comercial: solo por identificadores de homologación.
 */
export type MatchLevel = 'TAN_VA_VE' | 'TAN_VA' | 'NONE';

export interface HomologationMatchResult {
  level: MatchLevel;
  /** Observaciones emparejadas (varias si la homologación VScar no fija `Ve`). */
  observations: EeaObservation[];
  cross_market: boolean;
  homologation_match: HomologationMatch;
  mapping_confidence: MappingConfidence;
  notes: string[];
}

const up = (s: string | undefined) => (s ?? '').trim().toUpperCase();

export function matchObservations(homologation: Homologation, observations: readonly EeaObservation[], referenceMarket: string): HomologationMatchResult {
  const tan = homologation.type_approval_number ? normalizeTan(homologation.type_approval_number) : undefined;
  const va = up(homologation.variant_code);
  const ve = up(homologation.version_code);
  const notes: string[] = [];
  const none = (reason: string): HomologationMatchResult => ({
    level: 'NONE',
    observations: [],
    cross_market: false,
    homologation_match: 'UNCONFIRMED',
    mapping_confidence: 'UNCONFIRMED',
    notes: [reason],
  });

  if (!tan || !va) return none('homologation lacks TAN and/or variant code: EEA data cannot be matched (no guessing by commercial name)');

  const byTanVa = observations.filter((o) => o.type_approval_number === tan && o.variant_code === va);
  if (byTanVa.length === 0) return none(`no EEA observation for TAN ${tan} / Va ${va}`);

  const markets = [...new Set(byTanVa.map((o) => o.member_state))];
  if (markets.length > 1) return none(`observations from several member states (${markets.join(', ')}): query one market at a time`);
  const crossMarket = markets[0] !== referenceMarket;

  if (ve) {
    const exact = byTanVa.filter((o) => o.version_code === ve);
    if (exact.length === 0) return none(`TAN/Va found but no EEA observation for version ${ve}`);
    return {
      level: 'TAN_VA_VE',
      observations: exact,
      cross_market: crossMarket,
      homologation_match: crossMarket ? 'EXACT' : 'NOT_APPLICABLE',
      mapping_confidence: crossMarket ? 'CROSS_MARKET_EXACT_HOMOLOGATION' : 'EXACT',
      notes,
    };
  }

  // PARTIAL: TAN + Va sin Ve. Aunque solo aparezca una versión, no se infiere: requiere revisión humana.
  const versions = [...new Set(byTanVa.map((o) => o.version_code))];
  notes.push(`PARTIAL identity (TAN+Va, no version_code): ${versions.length} EEA version(s) (${versions.join(', ')}); human review required — add version_code to reach EXACT`);
  return {
    level: 'TAN_VA',
    observations: byTanVa,
    cross_market: crossMarket,
    homologation_match: crossMarket ? 'PARTIAL' : 'NOT_APPLICABLE',
    // Mismo mercado: sin campo PARTIAL en homologation_match, se bloquea vía mapping_confidence.
    mapping_confidence: crossMarket ? 'INFERRED' : 'UNCONFIRMED',
    notes,
  };
}
