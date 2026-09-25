import { z } from 'zod';
import {
  BatteryCapacityBasis,
  BootMethod,
  ChargingLossBasis,
  ConsumptionBasis,
  MassDefinition,
  PowerBasis,
  RangeType,
  TurningMeasure,
} from './enums.ts';

/**
 * Bases de medida tipadas (Catalog v0.2 §5). Cada SpecKey declara cuáles exige;
 * valores con bases distintas no se comparan como equivalentes.
 */
export const MeasurementBasis = z
  .object({
    power_basis: PowerBasis.optional(),
    battery_capacity_basis: BatteryCapacityBasis.optional(),
    mass_definition: MassDefinition.optional(),
    boot_method: BootMethod.optional(),
    turning_measure: TurningMeasure.optional(),
    towing_gradient_pct: z.union([z.number().positive(), z.literal('UNSPECIFIED')]).optional(),
    range_type: RangeType.optional(),
    consumption_basis: ConsumptionBasis.optional(),
    charging_loss_basis: ChargingLossBasis.optional(),
    soc_from_pct: z.number().min(0).max(100).optional(),
    soc_to_pct: z.number().min(0).max(100).optional(),
  })
  .strict();

export type MeasurementBasis = z.infer<typeof MeasurementBasis>;
export type MeasurementBasisField = keyof MeasurementBasis;

/** Valor de base que significa "la fuente no lo declara". */
export function isUnspecifiedBasis(value: unknown): boolean {
  return value === undefined || value === 'UNSPECIFIED';
}
