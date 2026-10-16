/**
 * RDW (S11) — Registro de homologaciones de tipo de los Países Bajos (TGK, *typegoedkeuring*) en opendata.rdw.nl.
 * Verificado el 2026-10-16: metadatos de cada recurso en `opendata.rdw.nl/api/views/<id>.json` (licencia "Public Domain",
 * atribución "Team Open Data RDW") y catálogo nacional data.overheid.nl (CC-0 1.0 por distribución).
 * Glosario oficial: "Begrippenlijst typegoedkeuringsregister" (12-03-2024, recurso `gska-f75a`).
 *
 * Clave de una versión técnica: `typegoedkeuringsnummer` (TAN completo, con extensión) + `codevarianttgk` (Va)
 * + `codeuitvoeringtgk` (Ve) + `volgnummerrevisieuitvoering` (revisión interna de RDW de esa versión).
 * Estos conjuntos describen homologaciones, no matriculaciones: no contienen matrículas ni datos personales.
 * `Gekentekende_voertuigen` (`m9d7-ebf2`) sí contiene matrículas: no se usa en VScar.
 */
export const RDW_SOURCE = {
  source_code: 'S11',
  name: 'RDW — Open Data: typegoedkeuringsregister (TGK)',
  portal: 'https://opendata.rdw.nl/',
  api_base: 'https://opendata.rdw.nl/resource/',
  license: 'Public Domain (CC0 1.0)',
  license_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
  attribution: 'RDW (Dienst Wegverkeer) — Open Data RDW',
  glossary_url: 'https://opendata.rdw.nl/d/gska-f75a',
  source_market: 'NL',
} as const;

export interface RdwDataset {
  id: string;
  name: string;
  /** Campo del variant code (en `x5v3-sewk` se llama `codevariantgk`). */
  variantField: 'codevarianttgk' | 'codevariantgk';
  /** Campos numéricos que se piden (whitelist). */
  fields: readonly string[];
  role: 'technical' | 'identity' | 'validity';
}

const KEY = ['typegoedkeuringsnummer', 'codeuitvoeringtgk', 'volgnummerrevisieuitvoering'] as const;

export const RDW_DATASETS = {
  basis: {
    id: 'byxc-wwua',
    name: 'Open Data RDW: TGK Basis Uitvoering',
    variantField: 'codevarianttgk',
    role: 'technical',
    fields: [...KEY, 'codevarianttgk', 'begindatumrevisieuitvoering', 'einddatumrevisieuitvoering', 'voertuigcategorie', 'aantaldeurenondergrens', 'aantaldeurenbovengrens', 'lengteondergrens', 'lengtebovengrens', 'breedteondergrens', 'breedtebovengrens', 'hoogteondergrens', 'hoogtebovengrens', 'wielbasisondergrens', 'wielbasisbovengrens', 'aantalzitplaatsenondergrens', 'aantalzitplaatsenbovengrens', 'maximummassaondergrens', 'maximummassabovengrens', 'massarijklaarondergrens', 'massarijklaarbovengrens', 'maxconstructiesnelheidahwogr', 'maxconstructiesnelheidahwbgr'],
  },
  energiebron: {
    id: 'gr7t-qfnb',
    name: 'Open Data RDW: TGK Energiebron Uitvoering',
    variantField: 'codevarianttgk',
    role: 'technical',
    fields: [...KEY, 'codevarianttgk', 'volgnummeraandrijving', 'volgnummerenergiebron', 'codeenergiebron', 'maximumnettovermogenogr', 'maximumnettovermogenbgr', 'uitlaatemissieniveau', 'co2emisgecombineerdwltpogr', 'co2emisgecombineerdwltpbgr', 'co2emisgewogengecombwltpogr', 'co2emisgewogengecombwltpbgr', 'brandstofverbruikgecombwltpogr', 'brandstofverbruikgecombwltpbgr', 'brandstverbrgewogencombwltpogr', 'brandstverbrgewogencombwltpbgr', 'verbruikvolledigelekwltpogr', 'verbruikvolledigelekwltpbgr', 'elekverbrexternoplaadbwltpogr', 'elekverbrexternoplaadbwltpbgr', 'actieradiusvolledigelekwltpogr', 'actieradiusvolledigelekwltpbgr', 'actieradiusexternoplaadwltpogr', 'actieradiusexternoplaadwltpbgr', 'elektrischeactieradiusnedc', 'elekactieradiusextoplaadbnedc', 'verbruikgecombineerdnedclaag', 'verbruikgecombineerdnedchoog', 'elekverbruikgecombineerdnedc', 'co2emisgecombineerdnedclaag', 'co2emisgecombineerdnedchoog'],
  },
  aandrijving: {
    id: '4by9-ammk',
    name: 'Open Data RDW: TGK Aandrijving Uitvoering',
    variantField: 'codevarianttgk',
    role: 'technical',
    fields: [...KEY, 'codevarianttgk', 'volgnummeraandrijving', 'aantalcilinders', 'cilinderinhoud', 'codebrandstoftypemotor', 'elektromotorindicator', 'hybridemotorindicator', 'externoplaadbaarindicator'],
  },
  carrosserie: {
    id: 'ky2r-jqad',
    name: 'Open Data RDW: TGK Carrosserie Uitvoering',
    variantField: 'codevarianttgk',
    role: 'technical',
    fields: [...KEY, 'codevarianttgk', 'volgnummercarrosserietype', 'codecarrosserietype'],
  },
  versnelling: {
    id: '7rjk-eycs',
    name: 'Open Data RDW: TGK Versnelling Uitvoering',
    variantField: 'codevarianttgk',
    role: 'technical',
    fields: [...KEY, 'codevarianttgk', 'volgnummerversnelling', 'codetypeversnellingsbak', 'aantalversnellingenondergrens', 'aantalversnellingenbovengrens'],
  },
  as: {
    id: 'xhyb-w7xt',
    name: 'Open Data RDW: TGK As Uitvoering',
    variantField: 'codevarianttgk',
    role: 'technical',
    fields: [...KEY, 'codevarianttgk', 'volgnummeras', 'aangedrevenasindicator'],
  },
  handelsbenaming: {
    id: 'x5v3-sewk',
    name: 'Open Data RDW: TGK Handelsbenaming Fabrikant',
    variantField: 'codevariantgk',
    role: 'identity',
    fields: [...KEY, 'codevariantgk', 'volgnummerhandelsbenamingfabr', 'handelsbenamingfabrikant', 'typeaanduidingfabrikant'],
  },
} as const satisfies Record<string, RdwDataset>;
export type RdwDatasetName = keyof typeof RDW_DATASETS;

/** Retiradas de homologación (por TAN): validez de la homologación, no de la versión. */
export const RDW_WITHDRAWALS = { id: '9s6a-b42z', name: 'Open Data RDW: TGK Intrekking Typegoedkeuring', fields: ['typegoedkeuringsnummer', 'volgnummerintrekkingtgk', 'begindatumintrekkingtgk', 'einddatumintrekkingtgk'] } as const;

/**
 * Mapeo RDW → VScar v1 (RDW_EEA_IDENTITY_MATCH_V0_1 / D1_1_ENRICHMENT_PILOT_V0_1). Rangos = envolvente
 * ondergrens–bovengrens que publica RDW (para dimensiones: de TODAS las versiones de la variante → `HOMOLOGATION_FAMILY`).
 */
export type RdwTarget =
  | { kind: 'spec'; specKey: string }
  | { kind: 'structural'; field: 'seats' | 'doors' | 'drivetrain' | 'body_type' | 'transmission' | 'gears' | 'emissions_standard' | 'homologation_powertrain' }
  | { kind: 'identity' }
  | { kind: 'unmapped'; reason: string }
  | { kind: 'rejected'; reason: string };

export interface RdwMappingRule {
  dataset: RdwDatasetName | 'gekentekende_voertuigen';
  fields: readonly string[];
  target: RdwTarget;
  normalization: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  notes?: string;
}

export const RDW_MAPPING_VERSION = 1;

export const RDW_MAPPING: readonly RdwMappingRule[] = [
  { dataset: 'basis', fields: ['typegoedkeuringsnummer', 'codevarianttgk', 'codeuitvoeringtgk', 'volgnummerrevisieuitvoering'], target: { kind: 'identity' }, normalization: 'TAN en códigos en mayúsculas sin espacios; nunca se quita la extensión ni la revisión', confidence: 'HIGH' },
  { dataset: 'basis', fields: ['begindatumrevisieuitvoering', 'einddatumrevisieuitvoering'], target: { kind: 'identity' }, normalization: 'ISO → valid_from / valid_to', confidence: 'HIGH', notes: 'validez de la revisión de la versión en el registro RDW' },
  { dataset: 'basis', fields: ['lengteondergrens', 'lengtebovengrens'], target: { kind: 'spec', specKey: 'dim.length_mm' }, normalization: 'rango mm', confidence: 'MEDIUM', notes: 'envolvente de todas las versiones de la variante (glosario) → range_basis HOMOLOGATION_FAMILY' },
  { dataset: 'basis', fields: ['breedteondergrens', 'breedtebovengrens'], target: { kind: 'spec', specKey: 'dim.width_mm' }, normalization: 'rango mm', confidence: 'MEDIUM', notes: 'ídem; anchura sin retrovisores no declarada → dim.width_mm' },
  { dataset: 'basis', fields: ['hoogteondergrens', 'hoogtebovengrens'], target: { kind: 'spec', specKey: 'dim.height_mm' }, normalization: 'rango mm', confidence: 'MEDIUM', notes: 'ídem' },
  { dataset: 'basis', fields: ['wielbasisondergrens', 'wielbasisbovengrens'], target: { kind: 'spec', specKey: 'dim.wheelbase_mm' }, normalization: 'rango mm', confidence: 'HIGH' },
  { dataset: 'basis', fields: ['massarijklaarondergrens', 'massarijklaarbovengrens'], target: { kind: 'spec', specKey: 'dim.mass_kg' }, normalization: 'rango kg; mass_definition EU_RUNNING_ORDER', confidence: 'HIGH', notes: '"massa bedrijfsklare toestand" = masa en orden de marcha' },
  { dataset: 'basis', fields: ['maximummassaondergrens', 'maximummassabovengrens'], target: { kind: 'spec', specKey: 'dim.gross_weight_kg' }, normalization: 'rango kg; GROSS_VEHICLE', confidence: 'HIGH' },
  { dataset: 'basis', fields: ['maxconstructiesnelheidahwogr', 'maxconstructiesnelheidahwbgr'], target: { kind: 'spec', specKey: 'perf.top_speed_kmh' }, normalization: 'rango km/h, redondeo a entero', confidence: 'HIGH' },
  { dataset: 'basis', fields: ['aantalzitplaatsenondergrens', 'aantalzitplaatsenbovengrens'], target: { kind: 'structural', field: 'seats' }, normalization: 'entero; solo si ondergrens = bovengrens', confidence: 'HIGH' },
  { dataset: 'basis', fields: ['aantaldeurenondergrens', 'aantaldeurenbovengrens'], target: { kind: 'structural', field: 'doors' }, normalization: 'entero; solo si ondergrens = bovengrens', confidence: 'HIGH' },
  { dataset: 'basis', fields: ['massaledigondergrens', 'massaledigbovengrens', 'paramrijweerstandf0ondergrens', 'paramrijweerstandf1ondergrens', 'paramrijweerstandf2ondergrens', 'maxverticalebelastopkoppogr'], target: { kind: 'unmapped', reason: 'sin SpecKey equivalente (masa en vacío ≠ orden de marcha; coeficientes de resistencia)' }, normalization: '—', confidence: 'NONE' },
  { dataset: 'energiebron', fields: ['maximumnettovermogenogr', 'maximumnettovermogenbgr'], target: { kind: 'spec', specKey: 'perf.power_max_kw | perf.power_ice_kw | perf.power_electric_kw' }, normalization: 'kW; por fuente de energía: B/D → térmico (ICE_ONLY), E → eléctrico', confidence: 'HIGH', notes: 'nunca potencia de sistema en híbridos' },
  { dataset: 'energiebron', fields: ['uitlaatemissieniveau'], target: { kind: 'structural', field: 'emissions_standard' }, normalization: '"EURO 6 AG" → familia EURO_6 (raw conservado)', confidence: 'HIGH', notes: 'entrada de la regla dgt-label-v1 (sin cambiar la metodología)' },
  { dataset: 'energiebron', fields: ['co2emisgecombineerdwltpogr', 'co2emisgecombineerdwltpbgr'], target: { kind: 'spec', specKey: 'emi.co2_combined_gkm | emi.co2_charge_sustaining_gkm' }, normalization: 'g/km WLTP; en enchufables = CS (glosario)', confidence: 'HIGH' },
  { dataset: 'energiebron', fields: ['brandstofverbruikgecombwltpogr', 'brandstofverbruikgecombwltpbgr'], target: { kind: 'spec', specKey: 'nrg.fuel_combined_l100 | nrg.fuel_charge_sustaining_l100' }, normalization: 'L/100 km WLTP; en enchufables = CS ("gemeten onder bedrijfsomstandigheden met ladingbehoud")', confidence: 'HIGH', notes: 'cubre el hueco PHEV de D1 (consumo CS) con homologación EXACT' },
  { dataset: 'energiebron', fields: ['brandstverbrgewogencombwltpogr', 'brandstverbrgewogencombwltpbgr', 'co2emisgewogengecombwltpogr', 'co2emisgewogengecombwltpbgr'], target: { kind: 'spec', specKey: 'nrg.phev_weighted_fuel_l100' }, normalization: 'L/100 km ponderado (nunca para coste)', confidence: 'MEDIUM', notes: 'el glosario repite el texto CS en el campo ponderado (errata) → mapping_confidence INFERRED' },
  { dataset: 'energiebron', fields: ['verbruikvolledigelekwltpogr', 'verbruikvolledigelekwltpbgr'], target: { kind: 'spec', specKey: 'nrg.electric_combined_kwh100' }, normalization: 'Wh/km ÷ 10 → kWh/100 km; BEV COMBINED', confidence: 'HIGH' },
  { dataset: 'energiebron', fields: ['elekverbrexternoplaadbwltpogr', 'elekverbrexternoplaadbwltpbgr'], target: { kind: 'spec', specKey: 'nrg.electric_combined_kwh100' }, normalization: 'Wh/km ÷ 10; PHEV, base UNSPECIFIED', confidence: 'MEDIUM' },
  { dataset: 'energiebron', fields: ['actieradiusvolledigelekwltpogr', 'actieradiusvolledigelekwltpbgr'], target: { kind: 'spec', specKey: 'rng.electric_combined_km' }, normalization: 'km WLTP; BEV WLTP_COMBINED · PHEV AER', confidence: 'HIGH' },
  { dataset: 'energiebron', fields: ['actieradiusexternoplaadwltpogr', 'actieradiusexternoplaadwltpbgr'], target: { kind: 'spec', specKey: 'rng.electric_combined_km' }, normalization: 'km WLTP; PHEV EAER', confidence: 'MEDIUM' },
  { dataset: 'energiebron', fields: ['verbruikgecombineerdnedclaag', 'verbruikgecombineerdnedchoog', 'co2emisgecombineerdnedclaag', 'co2emisgecombineerdnedchoog', 'elekverbruikgecombineerdnedc', 'elektrischeactieradiusnedc'], target: { kind: 'spec', specKey: 'nrg.fuel_combined_l100 | emi.co2_combined_gkm | nrg.electric_combined_kwh100 | rng.electric_combined_km' }, normalization: 'ciclo NEDC declarado (laag–hoog = rango)', confidence: 'HIGH' },
  { dataset: 'energiebron', fields: ['codeenergiebron'], target: { kind: 'structural', field: 'homologation_powertrain' }, normalization: 'solo contraste con EEA (B, D, E según glosario "bijv. E voor elektrisch")', confidence: 'MEDIUM' },
  { dataset: 'aandrijving', fields: ['cilinderinhoud'], target: { kind: 'spec', specKey: 'pt.displacement_cc' }, normalization: 'cm³', confidence: 'HIGH' },
  { dataset: 'aandrijving', fields: ['aantalcilinders'], target: { kind: 'spec', specKey: 'pt.cylinders' }, normalization: 'entero', confidence: 'HIGH' },
  { dataset: 'aandrijving', fields: ['hybridemotorindicator', 'externoplaadbaarindicator', 'elektromotorindicator'], target: { kind: 'structural', field: 'homologation_powertrain' }, normalization: 'contraste con EEA `Fm`; no distingue MHEV', confidence: 'MEDIUM' },
  { dataset: 'carrosserie', fields: ['codecarrosserietype'], target: { kind: 'structural', field: 'body_type' }, normalization: 'código UE conservado; → body_type solo AA sedan · AD coupe · AE convertible (AB/AC/AF/AG no separan hatchback, familiar, SUV y monovolumen: el Golf 5p y los SUV RAV4/X3 son AC)', confidence: 'MEDIUM' },
  { dataset: 'versnelling', fields: ['codetypeversnellingsbak'], target: { kind: 'unmapped', reason: 'lista de códigos (M, A, C, G, F, W, O, D, H) no publicada en el glosario: se conserva el código bruto' }, normalization: '—', confidence: 'NONE' },
  { dataset: 'versnelling', fields: ['aantalversnellingenondergrens', 'aantalversnellingenbovengrens'], target: { kind: 'structural', field: 'gears' }, normalization: 'entero; solo si ondergrens = bovengrens', confidence: 'HIGH' },
  { dataset: 'as', fields: ['volgnummeras', 'aangedrevenasindicator'], target: { kind: 'structural', field: 'drivetrain' }, normalization: '2 ejes motrices → AWD; 1 eje: eje 1 → FWD, eje 2 → RWD (numeración CoC de delante a atrás)', confidence: 'MEDIUM', notes: 'la numeración delante→atrás es la convención del CoC; el glosario no la declara' },
  { dataset: 'handelsbenaming', fields: ['handelsbenamingfabrikant', 'typeaanduidingfabrikant'], target: { kind: 'identity' }, normalization: 'denominación de modelo (no trim) y tipo del fabricante → contraste con EEA `Cn`/`T`', confidence: 'MEDIUM', notes: 'no confirma la versión comercial: no eleva UNCONFIRMED a EXACT' },
  { dataset: 'gekentekende_voertuigen', fields: ['kenteken'], target: { kind: 'rejected', reason: 'matrícula individual: dato personal indirecto; nunca se consulta ni se almacena' }, normalization: '—', confidence: 'NONE' },
  { dataset: 'gekentekende_voertuigen', fields: ['catalogusprijs', 'bruto_bpm', 'eerste_kleur', 'handelsbenaming', 'datum_tenaamstelling'], target: { kind: 'rejected', reason: 'dato comercial o de matriculación del mercado neerlandés (precio, impuesto, color, denominación local): no se importa a España' }, normalization: '—', confidence: 'NONE' },
];
