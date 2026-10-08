import type { CandidateSide } from '@vscar/ui/tokens';
import type { MarketCode } from '@/i18n/locales';

/**
 * Comparaciones disponibles en Step 7a (conjunto controlado de Dataset Core; el selector real es Step 7b).
 * `at` fija la fecha de validez de los hechos de cada variante (Model 3 2021).
 */
export interface ComparisonVehicle {
  /** Clave del snapshot (`ids.{key}`). */
  key: 'byd' | 'model3';
  side: CandidateSide;
  name: string;
  year: number;
  powertrain: 'BEV' | 'PHEV' | 'HEV' | 'ICE';
  body: 'sedan';
  at?: string;
}

export interface ComparisonDefinition {
  slug: string;
  market: MarketCode;
  vehicles: readonly [ComparisonVehicle, ComparisonVehicle];
}

export const COMPARISONS: Readonly<Record<string, ComparisonDefinition>> = {
  'byd-seal-vs-tesla-model-3': {
    slug: 'byd-seal-vs-tesla-model-3',
    market: 'ES',
    vehicles: [
      { key: 'byd', side: 'a', name: 'BYD SEAL', year: 2026, powertrain: 'BEV', body: 'sedan' },
      { key: 'model3', side: 'b', name: 'Tesla Model 3', year: 2021, powertrain: 'BEV', body: 'sedan', at: '2021-06-01' },
    ],
  },
};

export const DEMO_SLUG = 'byd-seal-vs-tesla-model-3';

export function comparisonFor(slug: string, market: MarketCode): ComparisonDefinition | undefined {
  const c = COMPARISONS[slug];
  return c && c.market === market ? c : undefined;
}
