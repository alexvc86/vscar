import type { UsedVehicleInstanceInput } from '@vscar/vehicle-schema';
import { uid } from './builders.ts';
import { LEON_EHYBRID_IDS } from './cases/seat-leon-ehybrid-cross-market.ts';
import { MODEL3_2021_IDS } from './cases/tesla-model3-2021-intra-year.ts';
import { X3_2018_IDS } from './cases/bmw-x3-2018-range.ts';

/**
 * Unidades usadas de PRUEBA (Step 8a). Ficticias: precios, km y estado inventados para ejercitar las reglas;
 * no son anuncios reales ni datos privados. Apuntan a ReferenceVariants de los casos de validación, cuyas
 * specs NO se modifican para "hacer encajar" nada.
 */
export const USED_EVALUATION_DATE = '2026-10-14';

/** BEV con toda la información relevante declarada. */
export const USED_BEV_COMPLETE: UsedVehicleInstanceInput = {
  id: uid('used:bev-complete'),
  reference_variant_id: MODEL3_2021_IDS.srp,
  asking_price_minor: 2_450_000,
  currency: 'EUR',
  mileage_km: 62_000,
  registration_date: '2021-06-15',
  service_history: 'full',
  accident_history: 'none_declared',
  owners: 1,
  warranty_remaining_months: 0,
  inspection_status: 'valid',
  condition: 'good',
  battery_health_pct: 91,
  observed_at: '2026-10-10',
};

/** BEV con solo el precio pedido. */
export const USED_BEV_LOW_INFO: UsedVehicleInstanceInput = {
  id: uid('used:bev-low-info'),
  reference_variant_id: MODEL3_2021_IDS.srp,
  asking_price_minor: 2_290_000,
  currency: 'EUR',
};

/** ICE con kilometraje alto para su edad (≈ 25.000 km/año) e historial parcial. */
export const USED_ICE_HIGH_MILEAGE: UsedVehicleInstanceInput = {
  id: uid('used:ice-high-mileage'),
  reference_variant_id: X3_2018_IDS.variant,
  asking_price_minor: 1_890_000,
  currency: 'EUR',
  mileage_km: 210_000,
  registration_date: '2018-05-10',
  service_history: 'partial',
  accident_history: 'none_declared',
  owners: 2,
  warranty_remaining_months: 0,
  inspection_status: 'valid',
  condition: 'good',
};

/** PHEV con precio, km y matriculación, pero historial, batería y estado desconocidos. */
export const USED_PHEV_UNKNOWN_HISTORY: UsedVehicleInstanceInput = {
  id: uid('used:phev-unknown-history'),
  reference_variant_id: LEON_EHYBRID_IDS.variant,
  asking_price_minor: 3_190_000,
  currency: 'EUR',
  mileage_km: 18_000,
  registration_year: 2025,
};

export const USED_FIXTURES = { USED_BEV_COMPLETE, USED_BEV_LOW_INFO, USED_ICE_HIGH_MILEAGE, USED_PHEV_UNKNOWN_HISTORY } as const;
