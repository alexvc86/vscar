import type { DatasetBundleInput } from '@vscar/vehicle-schema';
import { specBuilder, uid } from '../builders.ts';
import { SOURCES } from '../sources.ts';

/**
 * Caso 3 — Capacidad de batería sin tipo declarado (DC-08).
 * BYD SEAL Design RWD 82,5 kWh (fase 2026): BYD, IDAE y la nota de prensa dan "82,5 kWh" sin decir si es bruta o útil.
 * Se guarda con `battery_capacity_basis = UNSPECIFIED`; Range se activa por la autonomía oficial, no por la capacidad.
 * Incluye dos ventanas de carga DC y el conflicto interno de garantía de batería (250.000 vs 200.000 km).
 * Fuente: docs/data/dataset-core-v0.1/DC-08-byd-seal-current.md.
 */
const CASE = 'byd-seal';
const GROUP = 'es:byd:seal:gen1:fl2026:2026:bev:rwd-230kw-82.5kwh:design';
const WEB = 'https://www.byd.com/es-es/coches-electricos/seal';
const IDAE = 'https://coches.idae.es/base-datos/marca-y-modelo';
const NP = 'https://www.byd.com/es-es/news-list/byd-renueva-seal-mas-espacio-y-tecnologia';

export const BYD_SEAL_IDS = {
  homologation: uid(`${CASE}:homologation`),
  variant: uid(`${CASE}:variant`),
};

const s = specBuilder(CASE, { variant_id: BYD_SEAL_IDS.variant, source_id: SOURCES.bydEs.id, source_url: WEB, mapping_confidence: 'TRIM_LEVEL' });

export const bydSealBatteryUnspecified: DatasetBundleInput = {
  sources: [SOURCES.bydEs, SOURCES.idae],
  homologations: [
    {
      id: BYD_SEAL_IDS.homologation,
      market_code: 'ES',
      manufacturer_type_code: 'SE2R1C/2NTE5F002NL1',
      variant_code: 'SE2R1C',
      version_code: '2NTE5F002NL1',
      valid_from: '2026-04-01',
      test_cycle: 'WLTP',
      emissions_standard_family: 'UNKNOWN',
      homologation_powertrain: 'BEV',
      identification_confidence: 'EXACT',
      source_id: SOURCES.idae.id,
      source_url: IDAE,
      notes: 'IDAE (detalle 606454) "SE2R1C/2NTE5F002NL1" = EEA Va/Ve carácter a carácter (2024 F / 2025 P) bajo TAN E13*2018/858*00639 (revisiones *00/*03/*05). Revisión de TAN de la fase 2026 pendiente (EEA 2026 aún no publicado): el adapter no empareja sin TAN exacto. valid_from aproximado (nota de prensa abril 2026).',
    },
  ],
  variants: [
    {
      id: BYD_SEAL_IDS.variant,
      market_code: 'ES',
      commercial_group_key: GROUP,
      canonical_key: `${GROUP}:hse2r1c`,
      slug: 'byd-seal-2026-design-rwd-82-5-kwh',
      commercial: {
        manufacturer: 'BYD',
        model: 'SEAL',
        generation_code: 'gen1',
        facelift: '2026',
        trim_name: 'Design',
        commercial_name: 'BYD SEAL Design RWD 82,5 kWh',
        model_year: 2026,
        body_type: 'sedan',
      },
      technical: { powertrain_type: 'BEV', drivetrain: 'RWD', transmission: 'automatic', gears: 'not_applicable' },
      homologation_id: BYD_SEAL_IDS.homologation,
      status: 'test_fixture',
      notes: 'IDAE declara "Automático"; el catálogo no declara transmisión',
    },
  ],
  spec_values: [
    s('bat.capacity_kwh', {
      value: 82.5,
      unit: 'kWh',
      measurement_basis: { battery_capacity_basis: 'UNSPECIFIED' },
      notes: 'Catálogo, IDAE y nota de prensa: "82,5 kWh" sin tipo. No se asigna a bruta ni a útil sin fuente.',
    }),
    s('bat.chemistry', { value: 'LFP', unit: null, mapping_confidence: 'GENERATION_LEVEL', notes: 'BYD Blade Battery (LFP)' }),
    s('rng.electric_combined_km', { value: 570, unit: 'km', test_cycle: 'WLTP', measurement_basis: { range_type: 'WLTP_COMBINED' }, source_id: SOURCES.idae.id, source_url: IDAE, source_authority: 'OFFICIAL_AUTHORITY' }),
    s('nrg.electric_combined_kwh100', {
      value: 16.6,
      unit: 'kWh/100 km',
      test_cycle: 'WLTP',
      measurement_basis: { consumption_basis: 'COMBINED', charging_loss_basis: 'UNSPECIFIED' },
      notes: 'La fuente no declara si incluye pérdidas de carga',
    }),
    s('chg.ac_max_kw', { value: 11, unit: 'kW' }),
    s('chg.dc_max_kw', { value: 150, unit: 'kW' }),
    s('chg.dc_time_min', { value: 37, unit: 'min', measurement_basis: { soc_from_pct: 10, soc_to_pct: 80 }, notes: 'Requiere cargador CCS2 > 100 kW y > 500 V, a 25 °C' }, '10-80'),
    s('chg.dc_time_min', { value: 26, unit: 'min', measurement_basis: { soc_from_pct: 30, soc_to_pct: 80 }, notes: 'Cifra destacada por BYD (30→80 %)' }, '30-80'),
    s('bat.warranty_years', { value: 8, unit: 'years', mapping_confidence: 'POWERTRAIN_LEVEL' }),
    s('bat.warranty_km', { value: 250_000, unit: 'km', mapping_confidence: 'POWERTRAIN_LEVEL', notes: 'Texto legal y bloque principal de la web' }, 'legal'),
    s('bat.warranty_km', { value: 200_000, unit: 'km', mapping_confidence: 'POWERTRAIN_LEVEL', notes: 'FAQ de la misma web ("8 años o 200.000 km para el motor y la batería")' }, 'faq'),
  ],
  prices: [
    {
      id: uid(`${CASE}:price`),
      variant_id: BYD_SEAL_IDS.variant,
      price_type: 'current_new',
      price_basis: 'LIST',
      amount_minor: 4_949_000,
      currency: 'EUR',
      incl_taxes: 'UNKNOWN',
      region: 'ES-PENINSULA_BALEARES',
      source_id: SOURCES.bydEs.id,
      source_url: NP,
      source_authority: 'OFFICIAL_MANUFACTURER',
      notes: '"PVP recomendado" en la nota de prensa de abril de 2026, sin incentivos; inclusión de impuestos no declarada en la tabla',
    },
  ],
};
