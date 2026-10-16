/**
 * IDAE (S02) — "Histórico de base de datos (CSV)" de la Guía de consumo y emisiones de coches (coches.idae.es).
 * Columnas verificadas el 2026-10-16 contra el fichero real `idae-historico-202609.csv` (106.623 filas, UTF-8,
 * coma como separador, punto decimal, fechas dd/mm/aaaa). Nombres literales, incluida la errata `Emisionies`.
 *
 * Derechos: NO verificados. El aviso legal de idae.es limita el uso a "uso privado y personal" y prohíbe el uso
 * comercial sin consentimiento escrito; coches.idae.es no publica licencia propia → S02 queda ❓ con riesgo de ❌
 * (ver SPAIN_DATA_RIGHTS_AUDIT_V0_1). Este módulo lee el fichero para curación interna; no decide derechos.
 */
export const IDAE_DATASET = {
  source_code: 'S02',
  name: 'IDAE — Guía de consumo de combustible y emisiones de CO2 de turismos: histórico de base de datos (CSV)',
  landing_url: 'https://coches.idae.es/guia-emisiones-consumos',
  /** El nombre del fichero cambia con cada edición (AAAAMM). */
  download_url_pattern: 'https://coches.idae.es/storage/csv/idae-historico-{YYYYMM}.csv',
  legal_notice_url: 'https://www.idae.es/aviso-legal',
  license: 'NONE_DECLARED',
} as const;

export const IDAE_SCHEMA_VERSION = 'idae-historico-csv-2026-09';

/** Cabecera exacta de la edición 2026-09 (orden incluido). */
export const IDAE_EXPECTED_HEADER = [
  'Fecha_alta',
  'Fecha_actualizacion',
  'Fecha_comercializacion',
  'Marca',
  'Modelo',
  'Vehiculo',
  'Segmento',
  'Motorizacion',
  'Categoria',
  'MTMA',
  'Consumo_NEDC',
  'Emisiones_NEDC',
  'Consumo_Mixto_WLTP_Min',
  'Consumo_Mixto_WLTP_Max',
  'Consumo_Mixto_WLTP',
  'Emisionies_CO2_Mixto_WLTP_Min',
  'Emisionies_CO2_Mixto_WLTP_Max',
  'Autonomia_electrica',
  'Consumo_Electrico',
  'Observaciones',
] as const;
export type IdaeColumn = (typeof IDAE_EXPECTED_HEADER)[number];

export interface IdaeSchemaCheck {
  schemaVersion: string;
  compatible: boolean;
  missing: string[];
  unexpected: string[];
  reordered: boolean;
}

/** Detección de schema drift: una cabecera distinta nunca se "adapta" en silencio. */
export function checkIdaeHeader(header: readonly string[]): IdaeSchemaCheck {
  const expected = IDAE_EXPECTED_HEADER as readonly string[];
  const clean = header.map((h) => h.trim());
  const missing = expected.filter((c) => !clean.includes(c));
  const unexpected = clean.filter((c) => !expected.includes(c));
  const reordered = missing.length === 0 && unexpected.length === 0 && clean.some((c, i) => c !== expected[i]);
  const exact = missing.length === 0 && unexpected.length === 0 && !reordered;
  return { schemaVersion: exact ? IDAE_SCHEMA_VERSION : 'UNKNOWN', compatible: missing.length === 0, missing, unexpected, reordered };
}

/**
 * Motorización IDAE → clasificación de producto. MHEV no existe en IDAE (va dentro de Gasolina/Gasóleo o de
 * "Híbridos"): nunca se infiere MHEV desde IDAE.
 */
export const IDAE_POWERTRAIN: Readonly<Record<string, { powertrain: 'ICE' | 'HEV' | 'PHEV' | 'BEV' | 'FCEV' | 'EREV'; fuel?: 'petrol' | 'diesel' | 'lpg' | 'cng' | 'hydrogen' }>> = {
  Gasolina: { powertrain: 'ICE', fuel: 'petrol' },
  Gasóleo: { powertrain: 'ICE', fuel: 'diesel' },
  'Gases licuados del petróleo (GLP)': { powertrain: 'ICE', fuel: 'lpg' },
  'Gas natural': { powertrain: 'ICE', fuel: 'cng' },
  'Híbridos de gasolina': { powertrain: 'HEV', fuel: 'petrol' },
  'Híbridos de gasóleo': { powertrain: 'HEV', fuel: 'diesel' },
  'Híbridos enchufables': { powertrain: 'PHEV' },
  'Eléctricos puros': { powertrain: 'BEV' },
  'Pila de combustible': { powertrain: 'FCEV', fuel: 'hydrogen' },
  'Autonomía extendida': { powertrain: 'EREV' },
  'Autonomía extendida gasolina': { powertrain: 'EREV', fuel: 'petrol' },
};

/**
 * Mapeo IDAE → SpecKey v1 (EEA_IDAE_SCHEMA_MAPPING_V0_1). Solo se mapea lo que no es ambiguo.
 * Hallazgos verificados sobre el fichero completo (categoría M1, 62.394 filas):
 * - `Consumo_Mixto_WLTP` = (Min + Max) / 2 en el 100 % de las filas con dato (33.238/33.238) → valor DERIVADO por IDAE.
 * - `Consumo_NEDC` = `Consumo_Mixto_WLTP` en el 100 % de esas filas → la etiqueta NEDC es incorrecta.
 * - `Emisiones_NEDC` ≈ 23,4 × consumo WLTP medio en gasolina (15.287/17.457) → coherente con WLTP, no con NEDC.
 * - `Emisionies_CO2_Mixto_WLTP_Min/Max`: en registros de 2012 (anteriores al WLTP) contienen el CO₂ → no son WLTP.
 * - 0 significa "no aplica / no informado" (BEV con consumo de combustible 0, ICE con autonomía 0): nunca un valor.
 */
export type IdaeMappingStatus = 'MAPPED' | 'IDENTITY' | 'METADATA' | 'UNMAPPED';

export interface IdaeMappingRule {
  column: IdaeColumn;
  status: IdaeMappingStatus;
  specKey?: string;
  unit?: string;
  normalization: string;
  appliesTo?: readonly string[];
  cycle?: 'WLTP_LABELLED' | 'UNDECLARED';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  notes: string;
}

export const IDAE_MAPPING_VERSION = 1;

export const IDAE_MAPPING: readonly IdaeMappingRule[] = [
  { column: 'Fecha_alta', status: 'METADATA', normalization: 'dd/mm/aaaa → ISO; años > año de la edición = issue', confidence: 'HIGH', notes: 'alta del registro en la base IDAE; no es fecha de homologación ni de comercialización' },
  { column: 'Fecha_actualizacion', status: 'METADATA', normalization: 'dd/mm/aaaa → ISO', confidence: 'HIGH', notes: 'edición del registro; 3 filas con años futuros (2027–2029) → issue, nunca se corrigen' },
  { column: 'Fecha_comercializacion', status: 'METADATA', normalization: 'dd/mm/aaaa → ISO; vacío = desconocido', confidence: 'MEDIUM', notes: 'vacía en ~89 %; hay años 1970 y 2054 → issue' },
  { column: 'Marca', status: 'IDENTITY', normalization: 'alias de distribuidor → marca (p. ej. "Volkswagen Turismos"); "* Canarias" → ámbito CANARIAS', confidence: 'HIGH', notes: 'la marca incluye el distribuidor; Canarias y comerciales separados' },
  { column: 'Modelo', status: 'IDENTITY', normalization: 'texto libre; puede incluir códigos de año-modelo (p. ej. "3008 AM D0/D1/E0")', confidence: 'MEDIUM', notes: 'no es identidad técnica' },
  { column: 'Vehiculo', status: 'IDENTITY', normalization: 'versión comercial (texto libre); se extraen pistas kW/CV y, si aparece, un código "(Va/Ve)"', confidence: 'MEDIUM', notes: 'el código solo es evidencia si coincide carácter a carácter con Va/Ve de la EEA (BYD; Step 4c)' },
  { column: 'Segmento', status: 'METADATA', normalization: 'identidad', confidence: 'HIGH', notes: 'segmento IDAE; no es body_type de VScar' },
  { column: 'Motorizacion', status: 'IDENTITY', normalization: 'IDAE_POWERTRAIN', confidence: 'HIGH', notes: 'MHEV no distinguible' },
  { column: 'Categoria', status: 'METADATA', normalization: 'filtro: solo M1', confidence: 'HIGH', notes: 'incluye N1/N2/N3/L*: fuera del catálogo' },
  {
    column: 'MTMA',
    status: 'MAPPED',
    specKey: 'dim.mass_kg',
    unit: 'kg',
    normalization: 'identidad; 0 = no informado',
    confidence: 'MEDIUM',
    notes: 'Masa Técnica Máxima Admisible → mass_definition GROSS_VEHICLE; nunca masa en orden de marcha',
  },
  { column: 'Consumo_NEDC', status: 'UNMAPPED', normalization: '—', confidence: 'NONE', notes: 'idéntico a Consumo_Mixto_WLTP en el 100 % de filas con dato: etiqueta contradictoria' },
  { column: 'Emisiones_NEDC', status: 'UNMAPPED', normalization: '—', confidence: 'NONE', notes: 'coherente con el consumo WLTP medio, no con NEDC; pendiente de contraste EEA por registro' },
  {
    column: 'Consumo_Mixto_WLTP_Min',
    status: 'MAPPED',
    specKey: 'nrg.fuel_combined_l100',
    unit: 'L/100 km',
    normalization: 'Min/Max → rango (range_basis UNSPECIFIED); 0 = no informado',
    appliesTo: ['ICE', 'HEV'],
    cycle: 'WLTP_LABELLED',
    confidence: 'MEDIUM',
    notes: 'PHEV → nrg.phev_weighted_fuel_l100 (nunca coste). Ciclo según la etiqueta; se guarda UNDECLARED + inferido WLTP',
  },
  { column: 'Consumo_Mixto_WLTP_Max', status: 'MAPPED', specKey: 'nrg.fuel_combined_l100', unit: 'L/100 km', normalization: 'ver _Min', appliesTo: ['ICE', 'HEV'], cycle: 'WLTP_LABELLED', confidence: 'MEDIUM', notes: 'ver _Min' },
  { column: 'Consumo_Mixto_WLTP', status: 'UNMAPPED', normalization: '—', confidence: 'NONE', notes: 'punto medio calculado por IDAE ((Min+Max)/2 en el 100 %): no es un valor homologado' },
  { column: 'Emisionies_CO2_Mixto_WLTP_Min', status: 'UNMAPPED', normalization: '—', confidence: 'NONE', notes: 'en registros de 2012 (antes del WLTP) contiene el CO₂: ciclo no determinable por columna' },
  { column: 'Emisionies_CO2_Mixto_WLTP_Max', status: 'UNMAPPED', normalization: '—', confidence: 'NONE', notes: 'ver _Min' },
  {
    column: 'Autonomia_electrica',
    status: 'MAPPED',
    specKey: 'rng.electric_combined_km',
    unit: 'km',
    normalization: 'identidad; 0 = no informado',
    appliesTo: ['BEV', 'PHEV', 'EREV'],
    cycle: 'UNDECLARED',
    confidence: 'MEDIUM',
    notes: 'range_type UNSPECIFIED; algunas filas declaran "autonomía máxima informada" en Observaciones',
  },
  {
    column: 'Consumo_Electrico',
    status: 'MAPPED',
    specKey: 'nrg.electric_combined_kwh100',
    unit: 'kWh/100 km',
    normalization: 'identidad (valores 10–30 compatibles con kWh/100 km); 0 = no informado',
    appliesTo: ['BEV', 'PHEV', 'EREV'],
    cycle: 'UNDECLARED',
    confidence: 'MEDIUM',
    notes: 'unidad no declarada en la cabecera; BEV COMBINED, PHEV UNSPECIFIED; pérdidas de carga UNSPECIFIED',
  },
  { column: 'Observaciones', status: 'METADATA', normalization: 'texto; "0" = vacío', confidence: 'LOW', notes: 'pistas: potencia del motor eléctrico, norma Euro, "rango máximo"' },
];
