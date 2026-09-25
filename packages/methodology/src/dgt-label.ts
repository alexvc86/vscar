import type { HomologationPowertrain, Homologation } from '@vscar/vehicle-schema';

/**
 * Regla de etiqueta ambiental DGT (ES), versionada (Catalog v0.2 §13). Resultado `CALCULATED`.
 * Pendiente de contrastar con la tabla oficial vigente (Catalog v0.2 Q4) antes de publicar.
 */
export const DGT_LABEL_RULE = {
  rule_version: 'dgt-label-v1',
  rule_source_url: 'https://www.dgt.es/nuestros-servicios/tu-vehiculo/tus-vehiculos/distintivo-ambiental/',
  min_electric_range_zero_km: 40,
} as const;

export type DgtLabel = '0' | 'ECO' | 'C' | 'B' | 'none';

export interface DgtLabelInput {
  homologation_powertrain: HomologationPowertrain;
  fuel_type?: string;
  emissions_standard_family: Homologation['emissions_standard_family'];
  /** Autonomía eléctrica homologada; puede ser un rango. */
  electric_range_km?: { min: number; max: number };
}

export interface DgtLabelResult {
  label?: DgtLabel;
  reason: string;
  rule_version: string;
  rule_source_url: string;
}

export function dgtLabel(input: DgtLabelInput): DgtLabelResult {
  const R = DGT_LABEL_RULE;
  const out = (label: DgtLabel | undefined, reason: string): DgtLabelResult => ({
    ...(label ? { label } : {}),
    reason,
    rule_version: R.rule_version,
    rule_source_url: R.rule_source_url,
  });

  switch (input.homologation_powertrain) {
    case 'BEV':
    case 'FCEV':
      return out('0', 'battery electric / fuel cell');
    case 'OVC_HEV': {
      const r = input.electric_range_km;
      if (!r) return out(undefined, 'plug-in hybrid without electric range: cannot decide between 0 and ECO');
      if (r.min >= R.min_electric_range_zero_km) return out('0', `plug-in hybrid, electric range ≥ ${R.min_electric_range_zero_km} km`);
      if (r.max < R.min_electric_range_zero_km) return out('ECO', `plug-in hybrid, electric range < ${R.min_electric_range_zero_km} km`);
      return out(undefined, 'electric range spans the 40 km threshold: depends on configuration');
    }
    case 'NOVC_HEV':
      return out('ECO', 'non-plug-in hybrid (NOVC-HEV homologation)');
    case 'UNKNOWN':
      return out(undefined, 'homologation powertrain unknown');
    case 'ICE':
      break;
  }

  const fuel = input.fuel_type;
  if (fuel === 'lpg' || fuel === 'cng') return out('ECO', 'gas-powered vehicle');
  const family = input.emissions_standard_family;
  if (family === 'UNKNOWN') return out(undefined, 'emissions standard unknown');
  if (fuel === 'petrol' || fuel === 'e85') {
    return family === 'EURO_5' || family === 'EURO_6' || family === 'EURO_7' ? out('C', 'petrol Euro 4/5/6+') : out(undefined, 'unsupported standard');
  }
  if (fuel === 'diesel') {
    if (family === 'EURO_6' || family === 'EURO_7') return out('C', 'diesel Euro 6+');
    if (family === 'EURO_5') return out('B', 'diesel Euro 4/5');
  }
  return out(undefined, 'fuel/standard combination not covered by rule v1');
}
