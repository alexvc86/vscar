import type { DatasetBundleInput } from '@vscar/vehicle-schema';
import { specBuilder, uid } from '../builders.ts';
import { SOURCES } from '../sources.ts';

/**
 * Caso 2 — Valores homologados publicados como rango (DC-05, D4).
 * BMW X3 xDrive20d 2018 (G01), especificación de lanzamiento vigente hasta 08/2018 (NEDC, "EU6").
 * La especificación desde 09/2018 (NEDC-correlated, EU6d-TEMP, depósito 68 L) es otra homologación → otra ReferenceVariant (no incluida).
 * Fuente: docs/data/dataset-core-v0.1/DC-05-bmw-x3-2018.md.
 */
const CASE = 'x3-2018';
const GROUP = 'es:bmw:x3:g01:2018:ice-diesel:xdrive20d-190-at:base';
const S1 = 'https://www.press.bmwgroup.com/spain/article/attachment/T0272101ES/389288';
const S4 = 'https://www.press.bmwgroup.com/spain/article/detail/T0273178ES/actualizaci%C3%B3n-de-precios-de-bmw-x3-con-nuevas-motorizaciones?language=es';
const S7 = 'https://www.press.bmwgroup.com/spain/article/detail/T0258606ES/bmw-ahora-con-tres-a%C3%B1os-de-garant%C3%ADa-en-toda-la-gama?language=es';
const S8 = 'https://www.euroncap.com/en/results/bmw/x3/29154';
const DGT = 'https://www.dgt.es/nuestros-servicios/tu-vehiculo/tus-vehiculos/distintivo-ambiental/';

export const X3_2018_IDS = {
  homologation: uid(`${CASE}:homologation:launch`),
  variant: uid(`${CASE}:variant:launch`),
};

const s = specBuilder(CASE, { variant_id: X3_2018_IDS.variant, source_id: SOURCES.bmwEs.id, source_url: S1, mapping_confidence: 'POWERTRAIN_LEVEL' });

export const bmwX3Range: DatasetBundleInput = {
  sources: [SOURCES.bmwEs, SOURCES.euroNcap, SOURCES.dgt],
  homologations: [
    {
      id: X3_2018_IDS.homologation,
      market_code: 'ES',
      valid_from: '2017-06-01',
      valid_to: '2018-08-31',
      test_cycle: 'NEDC',
      emissions_standard_family: 'EURO_6',
      emissions_standard_level: 'UNSPECIFIED',
      emissions_standard_raw: 'EU6',
      homologation_powertrain: 'ICE',
      identification_confidence: 'UNCONFIRMED',
      source_id: SOURCES.bmwEs.id,
      source_url: S1,
      notes: 'TAN/Va/Ve no identificados todavía (pendiente EEA). Validez: especificación 06/2017 hasta el cambio de 09/2018.',
    },
  ],
  variants: [
    {
      id: X3_2018_IDS.variant,
      market_code: 'ES',
      commercial_group_key: GROUP,
      canonical_key: `${GROUP}:hlaunch`,
      slug: 'bmw-x3-2018-xdrive20d',
      commercial: {
        manufacturer: 'BMW',
        model: 'X3',
        generation_code: 'G01',
        trim_name: 'Base (sin línea)',
        commercial_name: 'BMW X3 xDrive20d Steptronic',
        model_year: 2018,
        body_type: 'suv',
        price_list_date: '2018-01-22',
      },
      technical: { powertrain_type: 'ICE', fuel_type: 'diesel', drivetrain: 'AWD', transmission: 'automatic', seats: 5 },
      homologation_id: X3_2018_IDS.homologation,
      status: 'test_fixture',
    },
  ],
  spec_values: [
    s('nrg.fuel_combined_l100', {
      value_min: 5.0,
      value_max: 5.4,
      range_basis: 'WHEEL_SIZE',
      unit: 'L/100 km',
      test_cycle: 'NEDC',
      transformation: 'manual',
      notes: 'S1 "Total 5,4–5,0"; el rango depende de los neumáticos',
    }),
    s('emi.co2_combined_gkm', { value_min: 132, value_max: 142, range_basis: 'WHEEL_SIZE', unit: 'g/km', test_cycle: 'NEDC', transformation: 'manual' }),
    s('pt.fuel_tank_l', {
      value: 60,
      unit: 'L',
      transformation: 'manual',
      notes: 'S1 "aprox. 60"; el documento "valid from 09/2018" da 68 L: pertenece a la homologación posterior (otra variant)',
    }),
    s('war.years', { value: 3, unit: 'years', source_url: S7, mapping_confidence: 'INFERRED', notes: 'Garantía de 3 años en toda la gama desde 03/2016 (nota de marca)' }),
    s('emi.dgt_label_es', {
      value: 'C',
      unit: null,
      source_id: SOURCES.dgt.id,
      source_url: DGT,
      source_authority: 'CALCULATED',
      transformation: 'derived',
      transformation_version: 1,
      notes: 'rule_version=dgt-label-v1; regla DGT: diésel Euro 6 → C',
    }),
  ],
  prices: [
    {
      id: uid(`${CASE}:price:2018-01-22`),
      variant_id: X3_2018_IDS.variant,
      price_type: 'original_list',
      price_basis: 'LIST',
      amount_minor: 5_105_000,
      currency: 'EUR',
      incl_taxes: 'UNKNOWN',
      region: 'UNSPECIFIED',
      price_list_date: '2018-01-22',
      source_id: SOURCES.bmwEs.id,
      source_url: S4,
      source_authority: 'OFFICIAL_MANUFACTURER',
      notes: 'La nota no dice si incluye IVA ni impuesto de matriculación',
    },
  ],
  safety_ratings: [
    {
      id: uid(`${CASE}:ncap`),
      variant_id: X3_2018_IDS.variant,
      authority: 'EuroNCAP',
      rating_status: 'EXPIRED',
      stars: 5,
      adult_pct: 93,
      child_pct: 84,
      vru_pct: 70,
      assist_pct: 58,
      protocol_version: 'Euro NCAP 2017',
      tested_year: 2017,
      tested_powertrain: 'BMW X3 2.0d, LHD',
      tested_variant_note: 'Ensayado BMW X3 2.0d LHD (1.825 kg); se aplica a la generación G01',
      mapping_confidence: 'POWERTRAIN_LEVEL',
      source_id: SOURCES.euroNcap.id,
      source_url: S8,
    },
  ],
};
