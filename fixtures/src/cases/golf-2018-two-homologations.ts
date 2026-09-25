import type { DatasetBundleInput } from '@vscar/vehicle-schema';
import { specBuilder, uid } from '../builders.ts';
import { SOURCES } from '../sources.ts';

/**
 * Caso 1 — Una denominación comercial, dos homologaciones (DC-03, ADR-007).
 * "Golf Advance 1.5 TSI EVO 130 CV 2018" aparece en EEA 2018 (ES) con TAN *33 (NEDC puro) y *35 (WLTP + NEDC correlado).
 * Fuente: docs/data/dataset-core-v0.1/DC-03-volkswagen-golf-2018.md §2.1.
 */
const CASE = 'golf-2018';
const GROUP = 'es:volkswagen:golf:mk7:fl:2018:ice-petrol:1.5tsi-130-mt6:advance';
const EEA_URL = 'https://discodata.eea.europa.eu/sql';
const EEA_NOTE = "Consulta EEA 2018 final, MS=ES, Cn=GOLF, Ft=PETROL, Ec=1498, Ep=96, Va=GAC4DACAX0, cambio FM6";
const VW_CATALOG_2020 = 'https://www.volkswagen.es/idhub/content/dam/onehub_pkw/importers/es/modelos/catalogos/catalogo_golf.pdf';

export const GOLF_2018_IDS = {
  h33: uid(`${CASE}:homologation:33`),
  h35: uid(`${CASE}:homologation:35`),
  rvA: uid(`${CASE}:variant:h33`),
  rvB: uid(`${CASE}:variant:h35`),
};

const commercial = {
  manufacturer: 'Volkswagen',
  model: 'Golf',
  generation_code: 'Mk7',
  facelift: 'Mk7.5',
  trim_name: 'Advance',
  commercial_name: 'Golf Advance 1.5 TSI EVO 130 CV',
  model_year: 2018,
  body_type: 'hatchback',
} as const;

const technical = { powertrain_type: 'ICE', fuel_type: 'petrol', drivetrain: 'FWD', transmission: 'manual', gears: 6, doors: 5 } as const;

const eeaDefaults = (variant_id: string) => ({
  variant_id,
  source_id: SOURCES.eea.id,
  source_url: EEA_URL,
  source_authority: 'OFFICIAL_AUTHORITY' as const,
  transformation: 'identity' as const,
  transformation_version: 1,
});

const a = specBuilder(`${CASE}:A`, eeaDefaults(GOLF_2018_IDS.rvA));
const b = specBuilder(`${CASE}:B`, eeaDefaults(GOLF_2018_IDS.rvB));

const warranty = (variant_id: string, tag: string) =>
  specBuilder(`${CASE}:${tag}`, { variant_id, source_id: SOURCES.vwEs.id, source_url: VW_CATALOG_2020 })('war.years', {
    value: 2,
    unit: 'years',
    mapping_confidence: 'INFERRED',
    notes: 'Catálogo VW ES edición enero 2020 ("2 años de garantía, sin límite de km"); se asume vigente en 2018 sin fuente 2018 → revisar',
  });

export const golf2018TwoHomologations: DatasetBundleInput = {
  sources: [SOURCES.eea, SOURCES.vwEs],
  homologations: [
    {
      id: GOLF_2018_IDS.h33,
      market_code: 'ES',
      type_approval_number: 'e1*2007/46*0623*33',
      variant_code: 'GAC4DACAX0',
      version_code: 'FM6FM6AJ015N7MVON1ML79VR2N',
      valid_from: '2018-01-01',
      valid_to: '2018-12-31',
      test_cycle: 'NEDC',
      emissions_standard_family: 'UNKNOWN',
      homologation_powertrain: 'ICE',
      identification_confidence: 'EXACT',
      source_id: SOURCES.eea.id,
      source_url: EEA_URL,
      notes: `${EEA_NOTE}. Ve exacta de la fila EEA de la que DC-03 tomó sus valores (113 g/km, 1.301 kg; manual FM6). DSG (FD7) y ML69 (116 g/km) son otras variants técnicas. Validez acotada a las matriculaciones EEA 2018 (fechas exactas pendientes). Norma: solo fuente secundaria ("Euro 6"). Ver docs/data/HOMOLOGATION_MATCH_REPORT.md`,
    },
    {
      id: GOLF_2018_IDS.h35,
      market_code: 'ES',
      type_approval_number: 'e1*2007/46*0623*35',
      variant_code: 'GAC4DACAX0',
      version_code: 'FM6FM6AJ015N7CPON1ML1BVR2NA',
      valid_from: '2018-01-01',
      valid_to: '2018-12-31',
      test_cycle: 'WLTP',
      emissions_standard_family: 'UNKNOWN',
      homologation_powertrain: 'ICE',
      identification_confidence: 'EXACT',
      source_id: SOURCES.eea.id,
      source_url: EEA_URL,
      notes: `${EEA_NOTE}. Homologación WLTP (Ve exacta, manual FM6, 1.315 kg); su valor NEDC es NEDC-correlated. Ver docs/data/HOMOLOGATION_MATCH_REPORT.md`,
    },
  ],
  variants: [
    {
      id: GOLF_2018_IDS.rvA,
      market_code: 'ES',
      commercial_group_key: GROUP,
      canonical_key: `${GROUP}:h33`,
      slug: 'volkswagen-golf-2018-advance-1-5-tsi-130-h33',
      commercial,
      technical,
      homologation_id: GOLF_2018_IDS.h33,
      status: 'test_fixture',
      notes: 'Variant fijada en DC-03 (tarifa mayo 2018)',
    },
    {
      id: GOLF_2018_IDS.rvB,
      market_code: 'ES',
      commercial_group_key: GROUP,
      canonical_key: `${GROUP}:h35`,
      slug: 'volkswagen-golf-2018-advance-1-5-tsi-130-h35',
      commercial,
      technical,
      homologation_id: GOLF_2018_IDS.h35,
      status: 'test_fixture',
      notes: 'Variant hermana DC-03b (homologación WLTP)',
    },
  ],
  spec_values: [
    // RV-A — TAN *33 (NEDC puro)
    a('emi.co2_combined_gkm', { value: 113, unit: 'g/km', test_cycle: 'NEDC', external_field: 'Enedc', notes: 'Conflicto con prensa/km77 110 g/km (secundarias) pendiente de revisión humana' }),
    a('dim.mass_kg', { value: 1301, unit: 'kg', measurement_basis: { mass_definition: 'EU_RUNNING_ORDER' }, external_field: 'M (kg)', notes: 'Definición de `M` a confirmar contra la documentación EEA' }),
    a('perf.power_max_kw', { value: 96, unit: 'kW', measurement_basis: { power_basis: 'ICE_ONLY' }, external_field: 'Ep (KW)' }),
    a('pt.displacement_cc', { value: 1498, unit: 'cm³', external_field: 'Ec (cm3)' }),
    warranty(GOLF_2018_IDS.rvA, 'A'),

    // RV-B — TAN *35 (WLTP + NEDC correlado)
    b('emi.co2_combined_gkm', { value: 136, unit: 'g/km', test_cycle: 'WLTP', external_field: 'Ewltp' }, 'wltp'),
    b(
      'emi.co2_combined_gkm',
      {
        value: 113,
        unit: 'g/km',
        test_cycle: 'UNDECLARED',
        test_cycle_inferred: 'NEDC_CORRELATED',
        cycle_evidence: 'EEA no etiqueta el ciclo: `Enedc` coexiste con `Ewltp` en la homologación *35; VW ES declara que en vehículos WLTP los valores NEDC derivan de WLTP',
        external_field: 'Enedc',
      },
      'nedc',
    ),
    b('dim.mass_kg', { value: 1315, unit: 'kg', measurement_basis: { mass_definition: 'EU_RUNNING_ORDER' }, external_field: 'M (kg)', notes: 'Definición de `M` a confirmar contra la documentación EEA' }),
    b('perf.power_max_kw', { value: 96, unit: 'kW', measurement_basis: { power_basis: 'ICE_ONLY' }, external_field: 'Ep (KW)' }),
    b('pt.displacement_cc', { value: 1498, unit: 'cm³', external_field: 'Ec (cm3)' }),
    warranty(GOLF_2018_IDS.rvB, 'B'),
  ],
};
