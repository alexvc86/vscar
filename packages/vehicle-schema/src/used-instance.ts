import { z } from 'zod';
import { IsoDate, Uuid } from './enums.ts';

/**
 * Used Vehicle Instance (Catalog v0.2 §16, ADR-007): una unidad concreta en venta.
 * En Alpha es efímera (vive en `comparison.inputs`) y todo es USER_PROVIDED.
 * Lo desconocido se representa como `'unknown'` explícito, nunca como un supuesto.
 */
export const UsedVehicleInstance = z
  .object({
    id: Uuid,
    reference_variant_id: Uuid,
    asking_price_minor: z.number().int().nonnegative().optional(),
    currency: z.string().regex(/^[A-Z]{3}$/).optional(),
    mileage_km: z.number().int().nonnegative().optional(),
    /** Si el usuario no lo indica: ausente + `registration_year_assumed` (ESTIMATED), nunca como dato conocido. */
    registration_year: z.number().int().min(1990).max(2100).optional(),
    registration_year_assumed: z.number().int().min(1990).max(2100).optional(),
    service_history: z.enum(['full', 'partial', 'none', 'unknown']).default('unknown'),
    accident_history: z.enum(['none_declared', 'declared', 'unknown']).default('unknown'),
    owners: z.union([z.number().int().positive(), z.literal('unknown')]).default('unknown'),
    warranty_remaining_months: z.union([z.number().int().nonnegative(), z.literal('unknown')]).default('unknown'),
    inspection_status: z.enum(['valid', 'expired', 'unknown']).default('unknown'),
    condition: z.enum(['excellent', 'good', 'fair', 'poor', 'unknown']).default('unknown'),
    battery_health_pct: z.union([z.number().min(0).max(100), z.literal('unknown')]).default('unknown'),
    observed_at: IsoDate.optional(),
  })
  .strict()
  .superRefine((u, ctx) => {
    if (u.asking_price_minor !== undefined && u.currency === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['currency'], message: 'asking price needs a currency' });
    }
    if (u.registration_year !== undefined && u.registration_year_assumed !== undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['registration_year_assumed'], message: 'an assumption is only allowed when the real value is unknown' });
    }
  });

export type UsedVehicleInstance = z.infer<typeof UsedVehicleInstance>;
export type UsedVehicleInstanceInput = z.input<typeof UsedVehicleInstance>;

/** Campos de información de la unidad y si son conocidos (base de `used_instance_completeness`). */
export const USED_INFORMATION_FIELDS = [
  'asking_price',
  'mileage',
  'registration_year',
  'service_history',
  'accident_history',
  'owners',
  'warranty_remaining',
  'inspection_status',
  'condition',
  'battery_health',
] as const;
export type UsedInformationField = (typeof USED_INFORMATION_FIELDS)[number];

export function knownUsedFields(u: UsedVehicleInstance): Record<UsedInformationField, boolean> {
  return {
    asking_price: u.asking_price_minor !== undefined,
    mileage: u.mileage_km !== undefined,
    registration_year: u.registration_year !== undefined,
    service_history: u.service_history !== 'unknown',
    accident_history: u.accident_history !== 'unknown',
    owners: u.owners !== 'unknown',
    warranty_remaining: u.warranty_remaining_months !== 'unknown',
    inspection_status: u.inspection_status !== 'unknown',
    condition: u.condition !== 'unknown',
    battery_health: u.battery_health_pct !== 'unknown',
  };
}
