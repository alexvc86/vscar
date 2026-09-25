import type { DatasetBundleInput } from '@vscar/vehicle-schema';
import { specBuilder, uid } from '../builders.ts';
import { SOURCES } from '../sources.ts';

/**
 * Caso 4 — PHEV con dato técnico cross-market (DC-10, D1).
 * SEAT León e-HYBRID 204 CV Style (Mk4 FL): España no publica el consumo con batería descargada; SEAT Alemania sí.
 * La equivalencia de homologación ES↔DE NO está verificada → `homologation_match = UNCONFIRMED` → no alimenta cálculos.
 * Fuente: docs/data/dataset-core-v0.1/DC-10-seat-leon-e-hybrid-current.md.
 */
const CASE = 'leon-ehybrid';
const GROUP = 'es:seat:leon:mk4:fl:2026:phev-petrol:1.5-ehybrid-204:style';
const SEAT_DE = 'https://www.seat.de/modelle/seat-leon/varianten-und-technische-details';
const SEAT_ES = 'https://www.seat.es/coches/leon-5-puertas';
const T3 = 'https://www.seat-cupra-mediacenter.es/content/dam/seat-media-center/models-all-brands/seat-models/seat-leon/technical-data/Ficha%20t%C3%A9cnica%20SEAT%20Le%C3%B3n%205%20puertas.pdf';
const T4 = 'https://www.seat-cupra-mediacenter.es/SEAT-Brand/presskits/seat-leon-e-hybrid/ficha-tecnica-resumida';
const NEWS = 'https://www.seat.es/sobre-seat/noticias/coches/nuevo-seat-leon-y-leon-sportstourer-style-e-hybrid';
const WARRANTY = 'https://www.seat.es/preguntas-frecuentes/clientes-posventa/mantenimiento-y-garantia';
const PRICE_LIST = 'https://www.seat-cupra-mediacenter.es/';

export const LEON_EHYBRID_IDS = {
  homologation: uid(`${CASE}:homologation`),
  variant: uid(`${CASE}:variant`),
};

const es = specBuilder(`${CASE}:es`, { variant_id: LEON_EHYBRID_IDS.variant, source_id: SOURCES.seatEs.id, source_url: SEAT_ES, mapping_confidence: 'POWERTRAIN_LEVEL' });
const de = specBuilder(`${CASE}:de`, {
  variant_id: LEON_EHYBRID_IDS.variant,
  source_id: SOURCES.seatDe.id,
  source_url: SEAT_DE,
  source_market: 'DE',
  homologation_match: 'UNCONFIRMED',
  mapping_confidence: 'POWERTRAIN_LEVEL',
});

export const seatLeonEhybridCrossMarket: DatasetBundleInput = {
  sources: [SOURCES.seatEs, SOURCES.seatDe],
  homologations: [
    {
      id: LEON_EHYBRID_IDS.homologation,
      market_code: 'ES',
      valid_from: '2026-05-07',
      test_cycle: 'WLTP',
      emissions_standard_family: 'EURO_6',
      emissions_standard_level: 'UNSPECIFIED',
      homologation_powertrain: 'OVC_HEV',
      identification_confidence: 'UNCONFIRMED',
      source_id: SOURCES.seatEs.id,
      source_url: SEAT_ES,
      notes: 'Dos juegos de valores oficiales (ficha 11/2024 vs versión actual); TAN/Va/Ve pendientes. Posible re-homologación Euro 6e-bis no confirmada.',
    },
  ],
  variants: [
    {
      id: LEON_EHYBRID_IDS.variant,
      market_code: 'ES',
      commercial_group_key: GROUP,
      canonical_key: `${GROUP}:hmy26-5`,
      slug: 'seat-leon-2026-style-e-hybrid-204',
      commercial: {
        manufacturer: 'SEAT',
        model: 'León',
        generation_code: 'Mk4',
        facelift: 'Mk4 FL',
        trim_name: 'Style',
        commercial_name: 'León 5P Style 1.5 e-HYBRID 204 CV',
        model_year: 2026,
        body_type: 'hatchback',
        price_list_date: '2026-05-07',
      },
      technical: { powertrain_type: 'PHEV', fuel_type: 'petrol', drivetrain: 'FWD', transmission: 'dct' },
      homologation_id: LEON_EHYBRID_IDS.homologation,
      status: 'test_fixture',
      notes: 'Plazas no declaradas en ninguna ficha oficial española',
    },
  ],
  spec_values: [
    // Dato clave del PHEV, solo publicado en DE
    de('nrg.fuel_charge_sustaining_l100', {
      value_min: 5.0,
      value_max: 5.3,
      range_basis: 'HOMOLOGATION_FAMILY',
      unit: 'L/100 km',
      test_cycle: 'WLTP',
      transformation: 'manual',
      notes: 'seat.de: "Kraftstoffverbrauch (bei entladener Batterie): 5,0-5,3 l/km" (errata l/km por l/100 km)',
    }),
    de('emi.co2_combined_gkm', { value_min: 27, value_max: 31, range_basis: 'HOMOLOGATION_FAMILY', unit: 'g/km', test_cycle: 'WLTP', transformation: 'manual' }),

    // Mercado ES
    es('rng.electric_combined_km', {
      value_min: 126,
      value_max: 134,
      range_basis: 'HOMOLOGATION_FAMILY',
      unit: 'km',
      test_cycle: 'WLTP',
      measurement_basis: { range_type: 'UNSPECIFIED' },
      notes: 'EAER vs AER no declarado',
    }),
    es('nrg.electric_combined_kwh100', {
      value_min: 15.5,
      value_max: 16.3,
      range_basis: 'HOMOLOGATION_FAMILY',
      unit: 'kWh/100 km',
      test_cycle: 'WLTP',
      measurement_basis: { consumption_basis: 'UNSPECIFIED', charging_loss_basis: 'UNSPECIFIED' },
      source_url: T3,
      valid_from: '2024-11-15',
      notes: 'Ficha 11/2024: "Ponderado (kWh/100 Km) [WLTP]"; ponderado vs charge-depleting no claro; valor MY26.5 ES no encontrado',
    }),
    es('nrg.phev_weighted_fuel_l100', { value: 0.4, unit: 'L/100 km', test_cycle: 'WLTP', source_url: T3, valid_from: '2024-11-15', notes: 'Nunca se usa para coste' }),
    es('pt.fuel_tank_l', { value: 40, unit: 'L', source_url: T4 }),
    es('bat.capacity_kwh', { value: 19.7, unit: 'kWh', measurement_basis: { battery_capacity_basis: 'USABLE' }, source_url: T4 }, 'usable'),
    es('bat.capacity_kwh', { value: 25.8, unit: 'kWh', measurement_basis: { battery_capacity_basis: 'GROSS' }, source_url: T3 }, 'gross-t3'),
    es('bat.capacity_kwh', { value: 26.8, unit: 'kWh', measurement_basis: { battery_capacity_basis: 'GROSS' }, source_url: T4, notes: 'Contradice a la ficha técnica (25,8 kWh)' }, 'gross-t4'),
    es('chg.ac_max_kw', { value: 11, unit: 'kW', source_url: T4 }),
    es('chg.dc_max_kw', { value: 50, unit: 'kW', source_url: T4 }),
    es('emi.dgt_label_es', { value: '0', unit: null, source_url: NEWS, notes: 'Declarada por el fabricante; contrastar con regla DGT (autonomía eléctrica ≥ 40 km)' }),
    es('war.years', { value: 3, unit: 'years', source_url: WARRANTY, mapping_confidence: 'GENERATION_LEVEL' }),
  ],
  prices: [
    {
      id: uid(`${CASE}:price`),
      variant_id: LEON_EHYBRID_IDS.variant,
      price_type: 'current_new',
      price_basis: 'LIST',
      amount_minor: 4_044_000,
      currency: 'EUR',
      incl_taxes: 'UNKNOWN',
      region: 'ES-PENINSULA_BALEARES',
      valid_from: '2026-05-07',
      price_list_date: '2026-05-07',
      source_id: SOURCES.seatEs.id,
      source_url: PRICE_LIST,
      source_authority: 'OFFICIAL_MANUFACTURER',
      notes: 'Lista de precios Gama SEAT León MY26 ver.9 ("En vigor 07/05/2026"), P.V.P recomendado; IVA no declarado en el texto extraído',
    },
  ],
};
