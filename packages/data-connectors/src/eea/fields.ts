import { z } from 'zod';

/**
 * Campos del dataset EEA "Monitoring of CO2 emissions from passenger cars" (Reglamento (UE) 2019/631).
 * Definiciones confirmadas contra la definición de tabla oficial (Table-definition-CO2-emissions-from-cars, datos 2022)
 * y contra respuestas reales de discodata (2026-09-24). Licencia CC BY 4.0, titular DG CLIMA.
 */
export const EEA_DATASET = {
  source_code: 'S01',
  name: 'EEA — Monitoring of CO2 emissions from passenger cars (Regulation (EU) 2019/631)',
  endpoint: 'https://discodata.eea.europa.eu/sql',
  default_table: '[CO2Emission].[latest].[co2cars]',
  license: 'CC BY 4.0',
  attribution: 'European Environment Agency (EEA) — data: Directorate-General for Climate Action (DG CLIMA)',
  table_definition_url:
    'https://sdi.eea.europa.eu/catalogue/srv/api/records/992616f8-158f-4ecc-b978-814b81629db6/attachments/Table-definition-CO2-emissions-from-cars2024.xlsx',
  metadata_url: 'https://sdi.eea.europa.eu/catalogue/srv/api/records/992616f8-158f-4ecc-b978-814b81629db6?language=eng',
} as const;

/** Definiciones oficiales (literales de la tabla de definición). */
export const EEA_FIELD_DEFINITIONS = {
  MS: 'Member state',
  TAN: 'Type approval number',
  Va: 'Variant',
  Ve: 'Version',
  Mk: 'Make',
  Cn: 'Commercial name',
  'M (kg)': 'Mass in running order Completed/complete vehicle',
  Mt: 'WLTP test mass',
  'Enedc (g/km)': 'Specific CO2 emissions (NEDC) — present in data up to 2020, absent from the 2022 table definition',
  'Ewltp (g/km)': 'Specific CO2 Emissions (WLTP)',
  'W (mm)': 'Wheel Base',
  Ft: 'Fuel type',
  Fm: 'Fuel mode',
  'Ec (cm3)': 'Engine capacity',
  'Ep (KW)': 'Engine power',
  'Z (Wh/km)': 'Electric energy consumption',
  Zr: 'Electric range',
  Fc: 'Fuel consumption',
  R: 'Total new registrations',
  Year: 'Reporting year',
  Status: 'P = Provisional data, F = Final data',
  Dr: 'Registration date',
} as const;

/** Columnas pedidas en la consulta agregada (whitelist: la consulta nunca usa nombres arbitrarios). */
export const EEA_GROUP_COLUMNS = [
  'MS',
  'Year',
  'Status',
  'TAN',
  'Va',
  'Ve',
  'Mk',
  'Cn',
  'Ft',
  'Fm',
  'Ec (cm3)',
  'Ep (KW)',
  'M (kg)',
  'Mt',
  'Enedc (g/km)',
  'Ewltp (g/km)',
  'Z (Wh/km)',
  'Zr',
  'Fc',
  'W (mm)',
] as const;
export type EeaGroupColumn = (typeof EEA_GROUP_COLUMNS)[number];

const num = z.number().nullable().optional();
const str = z.string().nullable().optional();

/** Fila de la consulta agregada (SUM(R), MIN/MAX(Dr)). Todo nullable: la EEA no garantiza ningún campo. */
export const EeaAggregatedRow = z
  .object({
    MS: str,
    Year: num,
    Status: str,
    TAN: str,
    Va: str,
    Ve: str,
    Mk: str,
    Cn: str,
    Ft: str,
    Fm: str,
    'Ec (cm3)': num,
    'Ep (KW)': num,
    'M (kg)': num,
    Mt: num,
    'Enedc (g/km)': num,
    'Ewltp (g/km)': num,
    'Z (Wh/km)': num,
    Zr: num,
    Fc: num,
    'W (mm)': num,
    R: num,
    Dr_min: str,
    Dr_max: str,
  })
  .passthrough();
export type EeaAggregatedRow = z.infer<typeof EeaAggregatedRow>;
