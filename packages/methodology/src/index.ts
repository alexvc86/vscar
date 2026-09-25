import { DGT_LABEL_RULE } from './dgt-label.ts';
import { ENERGY_MARKET_RULES } from './energy-market.ts';
import { FOR_YOU_RULES } from './for-you.ts';
import { DIFFERENCE_THRESHOLDS } from './meaningful-difference.ts';
import {
  COMPLETENESS_WEIGHTS,
  MAPPING_FACTOR,
  PLAUSIBILITY_THRESHOLDS,
  PROVENANCE_FACTOR,
  RECOMMENDATION_CONFIDENCE_LEVELS,
  SEO_COMPLETENESS_MIN,
} from './quality-config.ts';
import { PURCHASE_PRESETS, SENSITIVITY_RANGES, USAGE_PRESETS } from './scenarios.ts';
import { USED_CONFIDENCE_THRESHOLDS, USED_CRITICAL_FIELDS, USED_INFORMATION_WEIGHTS } from './used-information.ts';
import { UTILITY_CURVES } from './utility.ts';

export * from './utility.ts';
export * from './meaningful-difference.ts';
export * from './for-you.ts';
export * from './used-information.ts';
export * from './ranges.ts';
export * from './scenarios.ts';
export * from './dgt-label.ts';
export * from './quality-config.ts';
export * from './energy-market.ts';

/**
 * methodologyVersion (Plan §13.8). Cualquier cambio en la configuración exige nueva versión.
 * 2026.2: + reglas de datos de mercado de energía (`energy-market-v1`: frescura, ventana, referencia por mercado).
 */
export const METHODOLOGY_VERSION = '2026.2';

/** Configuración metodológica completa y serializable (fila de `methodology_versions.config`). */
export const METHODOLOGY_CONFIG = {
  version: METHODOLOGY_VERSION,
  utility_curves: UTILITY_CURVES,
  difference_thresholds: DIFFERENCE_THRESHOLDS,
  for_you_rules: FOR_YOU_RULES,
  used_information: { weights: USED_INFORMATION_WEIGHTS, critical: USED_CRITICAL_FIELDS, thresholds: USED_CONFIDENCE_THRESHOLDS },
  usage_presets: USAGE_PRESETS,
  purchase_presets: PURCHASE_PRESETS,
  sensitivity_ranges: SENSITIVITY_RANGES,
  dgt_label_rule: DGT_LABEL_RULE,
  plausibility_thresholds: PLAUSIBILITY_THRESHOLDS,
  completeness: { weights: COMPLETENESS_WEIGHTS, provenance_factor: PROVENANCE_FACTOR, mapping_factor: MAPPING_FACTOR, seo_min: SEO_COMPLETENESS_MIN },
  recommendation_confidence_levels: RECOMMENDATION_CONFIDENCE_LEVELS,
  energy_market: ENERGY_MARKET_RULES,
} as const;

/** JSON canónico (claves ordenadas) para huella y almacenamiento. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * Huella FNV-1a de 64 bits de la configuración (sin dependencias de Node: se ejecuta también en navegador).
 * Detecta cambios de metodología no acompañados de nueva versión.
 */
export function methodologyFingerprint(config: unknown = METHODOLOGY_CONFIG): string {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (const byte of new TextEncoder().encode(canonicalJson(config))) {
    h ^= BigInt(byte);
    h = (h * prime) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, '0');
}
