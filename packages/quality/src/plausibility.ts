import type { Homologation, ReferenceVariant, SpecValue } from '@vscar/vehicle-schema';
import { PLAUSIBILITY_THRESHOLDS } from '@vscar/methodology';
import { engineUsability } from './usability.ts';

export { PLAUSIBILITY_THRESHOLDS };

export type PlausibilityStatus = 'PASS' | 'WARNING' | 'BLOCK';

export interface PlausibilityFinding {
  rule: string;
  status: Exclude<PlausibilityStatus, 'PASS'>;
  spec_value_ids: string[];
  message: string;
}

export interface PlausibilityInput {
  variant: ReferenceVariant;
  homologation: Homologation;
  values: readonly SpecValue[];
}

const HYBRID_POWERTRAINS = new Set(['HEV', 'PHEV']);

const point = (v: SpecValue): number | undefined => (typeof v.value === 'number' ? v.value : undefined);
const upper = (v: SpecValue): number | undefined => point(v) ?? v.value_max;
const lower = (v: SpecValue): number | undefined => point(v) ?? v.value_min;

/**
 * Reglas de plausibilidad P0 (Catalog v0.2 §14). Nunca autocorrigen: solo informan.
 * Las incompatibilidades entre valores de la misma clave son trabajo del Conflict Engine.
 */
export function checkPlausibility({ variant, homologation, values }: PlausibilityInput): PlausibilityFinding[] {
  const findings: PlausibilityFinding[] = [];
  const byKey = (key: string) => values.filter((v) => v.spec_key === key);

  for (const v of values) {
    if (v.value_min !== undefined && v.value_max !== undefined && v.value_min > v.value_max) {
      findings.push({ rule: 'RANGE_MIN_GT_MAX', status: 'BLOCK', spec_value_ids: [v.id], message: `${v.spec_key}: value_min > value_max` });
    }
    if (v.homologation_match === 'PARTIAL' && v.status !== 'REVIEWED' && v.status !== 'PUBLISHED') {
      findings.push({ rule: 'PARTIAL_MATCH_UNREVIEWED', status: 'BLOCK', spec_value_ids: [v.id], message: `${v.spec_key}: PARTIAL homologation match needs human review before feeding engines` });
    }
    if (v.provisional) {
      findings.push({ rule: 'PROVISIONAL_VALUE', status: 'WARNING', spec_value_ids: [v.id], message: `${v.spec_key}: provisional value (pending final homologation)` });
    }
  }

  // Batería: útil nunca mayor que bruta en la misma variant.
  const caps = byKey('bat.capacity_kwh');
  for (const usable of caps.filter((v) => v.measurement_basis?.battery_capacity_basis === 'USABLE')) {
    for (const gross of caps.filter((v) => v.measurement_basis?.battery_capacity_basis === 'GROSS')) {
      const u = lower(usable);
      const g = upper(gross);
      if (u !== undefined && g !== undefined && u > g) {
        findings.push({ rule: 'USABLE_GT_GROSS', status: 'BLOCK', spec_value_ids: [usable.id, gross.id], message: 'usable battery capacity > gross capacity' });
      }
    }
  }

  // Potencia de sistema en híbridos: la potencia térmica no puede ocupar su lugar.
  if (HYBRID_POWERTRAINS.has(variant.technical.powertrain_type) || homologation.homologation_powertrain === 'OVC_HEV') {
    for (const v of byKey('perf.power_max_kw').filter((x) => x.measurement_basis?.power_basis === 'ICE_ONLY')) {
      findings.push({
        rule: 'ICE_POWER_AS_SYSTEM',
        status: 'BLOCK',
        spec_value_ids: [v.id],
        message: 'perf.power_max_kw with power_basis ICE_ONLY on a hybrid: combustion power cannot stand in for system power (use perf.power_ice_kw)',
      });
    }
  }

  // Remolque con freno < sin freno.
  for (const braked of byKey('cap.towing_braked_kg')) {
    for (const unbraked of byKey('cap.towing_unbraked_kg')) {
      const b = upper(braked);
      const u = lower(unbraked);
      if (b !== undefined && u !== undefined && b < u) {
        findings.push({ rule: 'TOWING_BRAKED_LT_UNBRAKED', status: 'WARNING', spec_value_ids: [braked.id, unbraked.id], message: 'braked towing < unbraked towing (sources often swap them)' });
      }
    }
  }

  // Radio de giro sospechoso (probable diámetro).
  for (const v of byKey('dim.turning_m')) {
    const x = lower(v);
    if (v.measurement_basis?.turning_measure === 'RADIUS' && x !== undefined && x > PLAUSIBILITY_THRESHOLDS.maxPassengerCarTurningRadiusM) {
      findings.push({ rule: 'TURNING_RADIUS_SUSPECT', status: 'WARNING', spec_value_ids: [v.id], message: `turning radius ${x} m is implausible for a passenger car (likely a diameter)` });
    }
  }

  // Consumo urbano anormalmente inferior al extraurbano en ICE puro.
  if (variant.technical.powertrain_type === 'ICE') {
    for (const urban of byKey('nrg.fuel_urban_l100')) {
      for (const extra of byKey('nrg.fuel_extra_urban_l100').filter((e) => e.test_cycle === urban.test_cycle)) {
        const u = upper(urban);
        const e = lower(extra);
        if (u !== undefined && e !== undefined && u < e * PLAUSIBILITY_THRESHOLDS.urbanBelowExtraUrbanFactor) {
          findings.push({ rule: 'URBAN_BELOW_EXTRA_URBAN', status: 'WARNING', spec_value_ids: [urban.id, extra.id], message: 'ICE urban consumption abnormally below extra-urban' });
        }
      }
    }
  }

  // Valores que no pueden alimentar engines (secundarios, UNCONFIRMED…) se marcan como BLOCK para engines.
  for (const v of values) {
    const u = engineUsability(v);
    if (!u.usable && v.homologation_match !== 'PARTIAL') {
      findings.push({ rule: 'NOT_ENGINE_USABLE', status: 'BLOCK', spec_value_ids: [v.id], message: `${v.spec_key}: ${u.reasons.join('; ')}` });
    }
  }

  return findings;
}

export function overallStatus(findings: readonly PlausibilityFinding[]): PlausibilityStatus {
  if (findings.some((f) => f.status === 'BLOCK')) return 'BLOCK';
  if (findings.some((f) => f.status === 'WARNING')) return 'WARNING';
  return 'PASS';
}

/** Estado de plausibilidad de un valor concreto. */
export function valueStatus(findings: readonly PlausibilityFinding[], valueId: string): PlausibilityStatus {
  return overallStatus(findings.filter((f) => f.spec_value_ids.includes(valueId)));
}
