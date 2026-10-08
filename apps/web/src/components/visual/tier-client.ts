'use client';
import { readTierSignals, resolveVisualTier, tierOverrideFrom, type TierDecision } from '@vscar/ui/visual-tier';

/** Tier del dispositivo actual. El override `?tier=` solo existe fuera de producción. */
export function currentTier(): TierDecision {
  const override = tierOverrideFrom(new URLSearchParams(location.search).get('tier'), process.env.NODE_ENV !== 'production');
  return resolveVisualTier(readTierSignals(), override);
}
