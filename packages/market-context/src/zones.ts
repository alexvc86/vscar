import type { EsTariffZone, EsTaxZone } from '@vscar/vehicle-schema';

/**
 * Región (ISO 3166-2, comunidad o ciudad autónoma) → zonas de precio de energía en España.
 * Carburantes: la zona fiscal separa Canarias, Ceuta y Melilla. Electricidad (PVPC): Canarias va con la península
 * (PCB); Ceuta y Melilla forman su propia zona (CYM). Las dos divisiones no coinciden.
 */
const ES_REGIONS = ['AN', 'AR', 'AS', 'IB', 'CN', 'CB', 'CM', 'CL', 'CT', 'VC', 'EX', 'GA', 'MD', 'MC', 'NC', 'PV', 'RI', 'CE', 'ML'] as const;

export interface EnergyZones {
  fuel: EsTaxZone;
  electricity: EsTariffZone;
}

export function isKnownRegion(market: string, region: string): boolean {
  return market === 'ES' && (ES_REGIONS as readonly string[]).includes(region.replace(/^ES-/, '')) && region.startsWith('ES-');
}

export function energyZonesForRegion(region: string): EnergyZones {
  switch (region) {
    case 'ES-CN':
      return { fuel: 'CANARIAS', electricity: 'PENINSULA_CANARIAS_BALEARES' };
    case 'ES-CE':
      return { fuel: 'CEUTA', electricity: 'CEUTA_MELILLA' };
    case 'ES-ML':
      return { fuel: 'MELILLA', electricity: 'CEUTA_MELILLA' };
    default:
      return { fuel: 'PENINSULA_BALEARES', electricity: 'PENINSULA_CANARIAS_BALEARES' };
  }
}
