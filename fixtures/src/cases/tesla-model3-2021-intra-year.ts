import type { DatasetBundleInput } from '@vscar/vehicle-schema';
import { specBuilder, uid } from '../builders.ts';
import { SOURCES } from '../sources.ts';

/**
 * Caso 5 — Cambios dentro del mismo año (DC-07).
 * Tesla Model 3 2021: la versión "Autonomía estándar plus" (448 km) cambia de precio tres veces en 2021 y en
 * diciembre la sustituye "Tracción trasera" (491 km, 6,1 s, código EEA E6LR) → otra ReferenceVariant técnica.
 * AC/DC y batería útil solo existen en fuentes secundarias → no alimentan engines.
 * Fuente: docs/data/dataset-core-v0.1/DC-07-tesla-model-3-2021.md.
 */
const CASE = 'model3-2021';
const GROUP_SRP = 'es:tesla:model-3:pre-highland:2021:bev:rwd-sr-plus:standard-range-plus';
const GROUP_RWD = 'es:tesla:model-3:pre-highland:2021:bev:rwd:traccion-trasera';
const IDAE = 'https://coches.idae.es/base-datos/marca-y-modelo';
const EEA = 'https://discodata.eea.europa.eu/sql';
const WEB = 'https://www.tesla.com/es_es/model3';
const CFG = 'https://www.tesla.com/es_ES/model3/design';
const MANUAL = 'https://www.tesla.com/sites/default/files/model_3_owners_manual_europe_es.pdf';
const EVDB = 'https://ev-database.org/';
const wayback = (stamp: string, url: string) => `https://web.archive.org/web/${stamp}/${url}`;

export const MODEL3_2021_IDS = {
  hSrp: uid(`${CASE}:homologation:srp`),
  hSrpE6cr: uid(`${CASE}:homologation:srp-e6cr`),
  hRwd: uid(`${CASE}:homologation:rwd`),
  /** SR+ con código EEA E6R (enero–junio 2021). */
  srp: uid(`${CASE}:variant:srp`),
  /** SR+ con código EEA E6CR (agosto–noviembre 2021): otra variant técnica (no demostrada idéntica a E6R). */
  srpE6cr: uid(`${CASE}:variant:srp-e6cr`),
  rwd: uid(`${CASE}:variant:rwd`),
};

const srp = specBuilder(`${CASE}:srp`, { variant_id: MODEL3_2021_IDS.srp, source_id: SOURCES.idae.id, source_url: IDAE, source_authority: 'OFFICIAL_AUTHORITY', mapping_confidence: 'TRIM_LEVEL' });
// IDAE 562352 describe la denominación comercial (448 km) sin código de tipo: aplica a E6R y E6CR solo a nivel de motorización.
const srpE6cr = specBuilder(`${CASE}:srp-e6cr`, { variant_id: MODEL3_2021_IDS.srpE6cr, source_id: SOURCES.idae.id, source_url: IDAE, source_authority: 'OFFICIAL_AUTHORITY', mapping_confidence: 'POWERTRAIN_LEVEL' });
const rwd = specBuilder(`${CASE}:rwd`, { variant_id: MODEL3_2021_IDS.rwd, source_id: SOURCES.teslaEs.id, source_url: wayback('20211203021509', WEB), archived: true, archive_url: wayback('20211203021509', WEB), original_url: WEB });
const archived = (stamp: string, url: string) => ({ source_id: SOURCES.teslaEs.id, source_url: wayback(stamp, url), source_authority: 'OFFICIAL_MANUFACTURER' as const, archived: true, archive_url: wayback(stamp, url), original_url: url });
const secondary = { source_id: SOURCES.evDatabase.id, source_url: EVDB, source_authority: 'SECONDARY_REFERENCE' as const, mapping_confidence: 'INFERRED' as const };

const commercial = (trim: string, name: string) =>
  ({ manufacturer: 'Tesla', model: 'Model 3', generation_code: 'pre-Highland', trim_name: trim, commercial_name: name, model_year: 2021, body_type: 'sedan' }) as const;

const price = (tag: string, amountEur: number, from: string, to: string | undefined, stamp: string) => ({
  id: uid(`${CASE}:price:${tag}`),
  variant_id: MODEL3_2021_IDS.srp,
  price_type: 'original_list' as const,
  price_basis: 'LIST' as const,
  amount_minor: amountEur * 100,
  currency: 'EUR',
  incl_taxes: 'YES' as const,
  region: 'ES-PENINSULA_BALEARES',
  valid_from: from,
  ...(to ? { valid_to: to } : {}),
  ...archived(stamp, CFG),
  notes: 'Configurador ES archivado (vat_percent 21, included); sin tasa de 980 € ni MOVES. Límites de validez según snapshots.',
});

export const teslaModel3IntraYear: DatasetBundleInput = {
  sources: [SOURCES.idae, SOURCES.eea, SOURCES.teslaEs, SOURCES.evDatabase],
  homologations: [
    {
      id: MODEL3_2021_IDS.hSrp,
      market_code: 'ES',
      type_approval_number: 'e4*2007/46*1293',
      variant_code: 'E6R',
      valid_from: '2021-01-04',
      valid_to: '2021-06-29',
      test_cycle: 'WLTP',
      emissions_standard_family: 'UNKNOWN',
      homologation_powertrain: 'BEV',
      identification_confidence: 'UNCONFIRMED',
      source_id: SOURCES.eea.id,
      source_url: EEA,
      notes: 'EEA 2021 ES: Va E6R bajo TAN *13/*15 (revisión no fijada), matriculaciones 2021-01-04→06-29. Enlace denominación comercial ↔ Va solo por valores: UNCONFIRMED. Ver HOMOLOGATION_MATCH_REPORT.',
    },
    {
      id: MODEL3_2021_IDS.hSrpE6cr,
      market_code: 'ES',
      type_approval_number: 'e4*2007/46*1293',
      variant_code: 'E6CR',
      valid_from: '2021-08-03',
      valid_to: '2021-11-22',
      test_cycle: 'WLTP',
      emissions_standard_family: 'UNKNOWN',
      homologation_powertrain: 'BEV',
      identification_confidence: 'UNCONFIRMED',
      source_id: SOURCES.eea.id,
      source_url: EEA,
      notes: 'EEA 2021 ES: Va E6CR bajo TAN *17/*18/*19, matriculaciones 2021-08-03→11-22, Ve adicional PQB1S5N. Mismos valores publicados que E6R pero sin prueba de identidad técnica: variant separada (no se fusiona por igualdad de valores).',
    },
    {
      id: MODEL3_2021_IDS.hRwd,
      market_code: 'ES',
      type_approval_number: 'e4*2007/46*1293',
      variant_code: 'E6LR',
      valid_from: '2021-12-03',
      test_cycle: 'WLTP',
      emissions_standard_family: 'UNKNOWN',
      homologation_powertrain: 'BEV',
      identification_confidence: 'PARTIAL',
      source_id: SOURCES.eea.id,
      source_url: EEA,
      notes: 'Variante de diciembre de 2021 ("Tracción trasera", 491 km); valid_from según snapshot de la web',
    },
  ],
  variants: [
    {
      id: MODEL3_2021_IDS.srp,
      market_code: 'ES',
      commercial_group_key: GROUP_SRP,
      canonical_key: `${GROUP_SRP}:he6r`,
      slug: 'tesla-model-3-2021-standard-range-plus-e6r',
      commercial: { ...commercial('Autonomía estándar plus', 'Model 3 Autonomía estándar plus, tracción trasera'), sales_start: '2021-01-28', sales_end: '2021-11-01' },
      technical: { powertrain_type: 'BEV', drivetrain: 'RWD', transmission: 'single_speed', gears: 'not_applicable', seats: 5 },
      homologation_id: MODEL3_2021_IDS.hSrp,
      status: 'test_fixture',
    },
    {
      id: MODEL3_2021_IDS.srpE6cr,
      market_code: 'ES',
      commercial_group_key: GROUP_SRP,
      canonical_key: `${GROUP_SRP}:he6cr`,
      slug: 'tesla-model-3-2021-standard-range-plus-e6cr',
      commercial: { ...commercial('Autonomía estándar plus', 'Model 3 Autonomía estándar plus, tracción trasera'), sales_start: '2021-01-28', sales_end: '2021-11-01' },
      technical: { powertrain_type: 'BEV', drivetrain: 'RWD', transmission: 'single_speed', gears: 'not_applicable', seats: 5 },
      homologation_id: MODEL3_2021_IDS.hSrpE6cr,
      status: 'test_fixture',
      notes: 'Misma denominación comercial que la variant E6R; identidad técnica distinta hasta que se demuestre lo contrario',
    },
    {
      id: MODEL3_2021_IDS.rwd,
      market_code: 'ES',
      commercial_group_key: GROUP_RWD,
      canonical_key: `${GROUP_RWD}:he6lr`,
      slug: 'tesla-model-3-2021-traccion-trasera',
      commercial: { ...commercial('Tracción trasera', 'Model 3 Tracción trasera'), sales_start: '2021-12-03' },
      technical: { powertrain_type: 'BEV', drivetrain: 'RWD', transmission: 'single_speed', gears: 'not_applicable', seats: 5 },
      homologation_id: MODEL3_2021_IDS.hRwd,
      status: 'test_fixture',
    },
  ],
  spec_values: [
    // Standard Range Plus (448 km)
    srp('rng.electric_combined_km', { value: 448, unit: 'km', test_cycle: 'WLTP', measurement_basis: { range_type: 'WLTP_COMBINED' }, notes: 'IDAE "Autonomía eléctrica 448,0 km"; la web de enero 2021 lo rotula "(est.)" sin ciclo' }),
    srp('nrg.electric_combined_kwh100', { value: 14.2, unit: 'kWh/100 km', test_cycle: 'WLTP', measurement_basis: { consumption_basis: 'COMBINED', charging_loss_basis: 'UNSPECIFIED' } }),
    srp(
      'nrg.electric_combined_kwh100',
      {
        value: 14.2,
        unit: 'kWh/100 km',
        test_cycle: 'WLTP',
        measurement_basis: { consumption_basis: 'COMBINED', charging_loss_basis: 'UNSPECIFIED' },
        source_id: SOURCES.eea.id,
        source_url: EEA,
        mapping_confidence: 'EXACT',
        external_field: 'consumo eléctrico Wh/km (nombre de campo sin verificar)',
        transformation: 'unit_conversion',
        transformation_version: 1,
        notes: 'Cross-check EEA: 142 Wh/km → 14,2 kWh/100 km',
      },
      'eea',
    ),
    srp('perf.power_max_kw', { value: 239, unit: 'kW', measurement_basis: { power_basis: 'SYSTEM' } }),
    srp('perf.accel_0_100_s', { value: 5.6, unit: 's', mapping_confidence: 'EXACT', ...archived('20210606034750', WEB) }),
    srp('bat.capacity_kwh', { value: 50, unit: 'kWh', measurement_basis: { battery_capacity_basis: 'UNSPECIFIED' }, notes: 'IDAE "50 kWh" sin tipo' }, 'idae'),
    srp('bat.capacity_kwh', { value: 52.5, unit: 'kWh', measurement_basis: { battery_capacity_basis: 'USABLE' }, ...secondary }, 'evdb'),
    srp('chg.ac_max_kw', { value: 11, unit: 'kW', ...secondary }),
    srp('chg.dc_max_kw', { value: 170, unit: 'kW', ...secondary }),
    srp('cap.boot_l', {
      value: 561,
      unit: 'L',
      measurement_basis: { boot_method: 'UNSPECIFIED' },
      mapping_confidence: 'GENERATION_LEVEL',
      ...archived('20211104133348', MANUAL),
      notes: 'Manual: "Detrás de la segunda fila 19,8 pies cúbicos (561 L)"; la web publica 542 L (hasta 06/2021) y 649 L (total con frunk, desde 09/2021)',
    }),
    srp('war.years', { value: 4, unit: 'years', mapping_confidence: 'EXACT', ...archived('20210606034750', WEB) }),

    // Standard Range Plus — código E6CR (valores de la denominación comercial, nivel motorización)
    srpE6cr('rng.electric_combined_km', { value: 448, unit: 'km', test_cycle: 'WLTP', measurement_basis: { range_type: 'WLTP_COMBINED' } }),
    srpE6cr('nrg.electric_combined_kwh100', { value: 14.2, unit: 'kWh/100 km', test_cycle: 'WLTP', measurement_basis: { consumption_basis: 'COMBINED', charging_loss_basis: 'UNSPECIFIED' } }),
    srpE6cr('perf.power_max_kw', { value: 239, unit: 'kW', measurement_basis: { power_basis: 'SYSTEM' } }),

    // Tracción trasera (diciembre 2021)
    rwd('rng.electric_combined_km', { value: 491, unit: 'km', test_cycle: 'WLTP', measurement_basis: { range_type: 'WLTP_COMBINED' } }),
    rwd('perf.accel_0_100_s', { value: 6.1, unit: 's' }),
  ],
  prices: [
    price('2021-02', 49_000, '2021-02-04', '2021-05-21', '20210204034703'),
    price('2021-05', 45_990, '2021-05-22', '2021-11-02', '20210522230035'),
    price('2021-11', 46_990, '2021-11-03', undefined, '20211103120034'),
  ],
};
