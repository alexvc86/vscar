import type { DatasetBundleInput } from '@vscar/vehicle-schema';
import { specBuilder, uid } from '../builders.ts';
import { SOURCES } from '../sources.ts';

/**
 * Caso 6 — Conflicto entre dos fuentes oficiales (DC-04).
 * VW Golf Style 1.5 eTSI 110 kW (150 CV) DSG (Mk8.5): el configurador VW ES da 110 kW (potencia de sistema);
 * la ficha IDAE 607306 del mismo nombre da 85,0 kW. OFFICIAL_AUTHORITY vs OFFICIAL_MANUFACTURER: no se resuelve por jerarquía.
 * La EEA (Ep = 110) se mapea a `perf.power_ice_kw`, no a la potencia de sistema.
 * Fuente: docs/data/dataset-core-v0.1/DC-04-volkswagen-golf-current.md.
 */
const CASE = 'golf-current';
const GROUP = 'es:volkswagen:golf:mk8:fl:2027:mhev-petrol:1.5etsi-150-dsg7:style';
const CFG = 'https://cdn.oneapi.volkswagen.com/viso/catalogue/models?tenant=ihdcc-vw-es-es&salesgroupKey=36279&carlineKey=30602&modelFilters=EquipmentLine%3AStyle&fetchPrices=true&fetchTechnical=true&fetchWltp=true';
const PRICE = 'https://cdn.oneapi.volkswagen.com/vcso/configPrices/8856f53ba396eca9effb63f60f8b44a3?tenant=ihdcc-vw-es-es';
const IDAE = 'https://coches.idae.es/base-datos/marca-y-modelo';
const EEA = 'https://discodata.eea.europa.eu/sql';

export const GOLF_CURRENT_IDS = {
  homologation: uid(`${CASE}:homologation`),
  variant: uid(`${CASE}:variant`),
  powerVw: uid(`${CASE}:perf.power_max_kw:vw`),
  powerIdae: uid(`${CASE}:perf.power_max_kw:idae`),
};

const s = specBuilder(CASE, { variant_id: GOLF_CURRENT_IDS.variant, source_id: SOURCES.vwEs.id, source_url: CFG });

export const golfCurrentOfficialConflict: DatasetBundleInput = {
  sources: [SOURCES.vwEs, SOURCES.idae, SOURCES.eea],
  homologations: [
    {
      id: GOLF_CURRENT_IDS.homologation,
      market_code: 'ES',
      valid_from: '2024-06-01',
      test_cycle: 'WLTP',
      emissions_standard_family: 'EURO_6',
      emissions_standard_level: 'UNSPECIFIED',
      homologation_powertrain: 'NOVC_HEV',
      identification_confidence: 'UNCONFIRMED',
      source_id: SOURCES.eea.id,
      source_url: EEA,
      notes: 'EEA 2025 provisional registra `Fm`=H (NOVC-HEV); TAN/Va/Ve pendientes. valid_from aproximado: lanzamiento Mk8.5 en ES (junio 2024).',
    },
  ],
  variants: [
    {
      id: GOLF_CURRENT_IDS.variant,
      market_code: 'ES',
      commercial_group_key: GROUP,
      canonical_key: `${GROUP}:hpending`,
      slug: 'volkswagen-golf-style-1-5-etsi-150-dsg',
      commercial: {
        manufacturer: 'Volkswagen',
        model: 'Golf',
        generation_code: 'Mk8',
        facelift: 'Mk8.5',
        trim_name: 'Style',
        commercial_name: 'Golf Style 1.5 eTSI 110 kW (150 CV) DSG 7',
        model_year: 2027,
        body_type: 'hatchback',
        price_list_date: '2026-09-24',
      },
      technical: { powertrain_type: 'MHEV', fuel_type: 'petrol', drivetrain: 'FWD', transmission: 'dct', gears: 7, seats: 5 },
      homologation_id: GOLF_CURRENT_IDS.homologation,
      status: 'test_fixture',
      notes: 'model_year 2027 según el configurador; IDAE lista MY25 y MY26 a la vez',
    },
  ],
  spec_values: [
    {
      ...s('perf.power_max_kw', { value: 110, unit: 'kW', measurement_basis: { power_basis: 'SYSTEM' }, notes: 'Configurador: "Rendimiento = 110 kW / 150 PS"' }, 'vw'),
      id: GOLF_CURRENT_IDS.powerVw,
    },
    {
      ...s(
        'perf.power_max_kw',
        {
          value: 85,
          unit: 'kW',
          measurement_basis: { power_basis: 'UNSPECIFIED' },
          source_id: SOURCES.idae.id,
          source_url: IDAE,
          source_authority: 'OFFICIAL_AUTHORITY',
          mapping_confidence: 'TRIM_LEVEL',
          notes: 'Ficha IDAE 607306 "Golf 8 PA MY26 Golf Style 1.5 eTSI 110 kW (150 CV)": 85,0 kW / 115,6 cv',
        },
        'idae',
      ),
      id: GOLF_CURRENT_IDS.powerIdae,
    },
    s('perf.power_ice_kw', {
      value: 110,
      unit: 'kW',
      source_id: SOURCES.eea.id,
      source_url: EEA,
      source_authority: 'OFFICIAL_AUTHORITY',
      mapping_confidence: 'POWERTRAIN_LEVEL',
      provisional: true,
      external_field: 'Ep (KW)',
      transformation: 'identity',
      transformation_version: 1,
      notes: 'EEA 2025 provisional (co2cars_2025Pv31)',
    }),
    s('dim.length_mm', { value_min: 4282, value_max: 4289, range_basis: 'EQUIPMENT', unit: 'mm', notes: 'Configurador: "Longitud mín./máx. 4.282 / 4.289 mm"' }),
    s('nrg.fuel_combined_l100', { value: 5.2, unit: 'L/100 km', test_cycle: 'WLTP' }),
    s('emi.co2_combined_gkm', { value: 119, unit: 'g/km', test_cycle: 'WLTP' }),
    s('war.years', { value: 3, unit: 'years', mapping_confidence: 'POWERTRAIN_LEVEL' }),
  ],
  prices: [
    {
      id: uid(`${CASE}:price`),
      variant_id: GOLF_CURRENT_IDS.variant,
      price_type: 'current_new',
      price_basis: 'LIST',
      amount_minor: 3_885_000,
      currency: 'EUR',
      incl_taxes: 'YES',
      region: 'ES-PENINSULA_BALEARES',
      valid_from: '2026-09-24',
      source_id: SOURCES.vwEs.id,
      source_url: PRICE,
      source_authority: 'OFFICIAL_MANUFACTURER',
      notes: 'IVA 21 % + IEDMT 0 €; promociones excluidas; transporte no desglosado',
    },
  ],
};
