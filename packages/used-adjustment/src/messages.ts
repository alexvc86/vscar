import { createMessageFactory, fallbackEurRange, fallbackNumber, type MessageParams } from '@vscar/methodology';

/**
 * Mensajes del Used Adjustment (Step 8a, contrato 7a.1). Espacio `used.*`. Params = DATOS crudos (km, meses,
 * %, céntimos, códigos); nunca texto formateado. `text` es solo respaldo inglés para debug: la UI traduce
 * por clave (`engine.used.*` en la web) y formatea con su locale.
 */
const range = (p: MessageParams, base: string, unit: string) => {
  const lo = p[`${base}Min`];
  const hi = p[`${base}Max`];
  if (lo === undefined) return '?';
  return `${lo === hi ? fallbackNumber(lo, 0) : `${fallbackNumber(lo, 0)}–${fallbackNumber(hi, 0)}`} ${unit}`;
};
const lower = (x: unknown) => String(x).toLowerCase().replace(/_/g, ' ');

const FIELD_LABEL: Readonly<Record<string, string>> = {
  asking_price: 'asking price',
  mileage: 'mileage',
  registration_year: 'registration date or year',
  service_history: 'service history',
  accident_history: 'accident history',
  owners: 'number of owners',
  warranty_remaining: 'remaining warranty',
  inspection_status: 'inspection (ITV) status',
  condition: 'condition',
  battery_health: 'battery health',
};
const missing = (p: MessageParams) => `${FIELD_LABEL[String(p.field)] ?? p.field} is not known${p.critical ? ' (critical)' : ''}`;

export const USED_MESSAGE_TEMPLATES: Readonly<Record<string, (p: MessageParams) => string>> = {
  // ---------------------------------------------------------------- economía (override del precio)
  'used.economic.asking_price_used': (p) => `The calculation uses the asking price of this unit: ${fallbackEurRange(p)} (user provided), not the original list price`,
  'used.economic.asking_price_missing': () => 'No asking price for this used vehicle: its purchase cost is not calculated (the original list price is never used instead)',
  // ---------------------------------------------------------------- ownership signals
  'used.ownership.high_mileage_for_age': (p) =>
    `High mileage for its age: ${fallbackNumber(p.mileageKm, 0)} km in ${range(p, 'ageMonths', 'months')} ≈ ${range(p, 'annualKm', 'km/year')} (reference ${fallbackNumber(p.referenceAnnualKm, 0)} km/year)`,
  'used.ownership.low_mileage_for_age': (p) =>
    `Low mileage for its age: ${fallbackNumber(p.mileageKm, 0)} km in ${range(p, 'ageMonths', 'months')} ≈ ${range(p, 'annualKm', 'km/year')} (reference ${fallbackNumber(p.referenceAnnualKm, 0)} km/year)`,
  'used.ownership.mileage_unknown': () => 'Mileage not provided',
  'used.ownership.no_remaining_warranty': (p) => `No manufacturer warranty left${p.basis === 'CALCULATED' ? ' (calculated from the original warranty)' : ''}`,
  'used.ownership.limited_warranty': (p) =>
    `Limited warranty left: ${range(p, 'warrantyRemainingMonths', 'months')}${p.basis === 'CALCULATED' ? ' (calculated from the original warranty)' : ''}, less than ${fallbackNumber(p.limitMonths, 0)} months`,
  'used.ownership.service_history_unknown': () => 'Service history unknown',
  'used.ownership.service_history_incomplete': (p) => `Service history ${p.history === 'NONE' ? 'not available' : 'partial'}`,
  'used.ownership.battery_health_unknown': () => 'Battery health (state of health) unknown',
  'used.ownership.battery_health_low': (p) => `Declared battery health ${fallbackNumber(p.batteryHealthPct, 0)} % is below ${fallbackNumber(p.thresholdPct, 0)} %${p.thresholdBasis === 'VARIANT_WARRANTY' ? ' (warranted minimum for this vehicle)' : ''}`,
  'used.ownership.battery_health_reported': (p) => `Declared battery health: ${fallbackNumber(p.batteryHealthPct, 0)} % (user provided; not converted into range)`,
  'used.ownership.accident_damage_declared': () => 'Accident damage declared',
  'used.ownership.condition_issues_declared': (p) =>
    `Condition issues declared${p.inspectionStatus === 'EXPIRED' ? ' (inspection expired)' : ''}${p.condition && p.condition !== 'UNKNOWN' ? ` (condition: ${lower(p.condition)})` : ''}`,
  'used.ownership.condition_unconfirmed': () => 'Condition and inspection status not confirmed',
  'used.ownership.asking_price_missing': () => 'Asking price not provided',
  // ---------------------------------------------------------------- information confidence
  'used.information_confidence.summary': (p) => `Used-vehicle information confidence: ${lower(p.level)} (${p.knownCount} of ${p.relevantCount} relevant facts known)`,
  'used.information_confidence.complete': () => 'All relevant facts about this unit are known',
  'used.information_confidence.capped': (p) => `${FIELD_LABEL[String(p.field)] ?? p.field} unknown: for a ${p.powertrain}, information confidence is at most ${lower(p.level)}`,
  'used.information_confidence.missing_asking_price': missing,
  'used.information_confidence.missing_mileage': missing,
  'used.information_confidence.missing_registration': missing,
  'used.information_confidence.missing_service_history': missing,
  'used.information_confidence.missing_accident_history': missing,
  'used.information_confidence.missing_owners': missing,
  'used.information_confidence.missing_warranty': missing,
  'used.information_confidence.missing_inspection': missing,
  'used.information_confidence.missing_condition': missing,
  'used.information_confidence.missing_battery_health': missing,
  // ---------------------------------------------------------------- verification
  'used.verification.provide_asking_price': () => 'Enter the asking price to compare purchase costs',
  'used.verification.check_mileage': () => 'Check the odometer reading (and its records) before deciding',
  'used.verification.check_service_history': (p) => (p.history === 'UNKNOWN' ? 'Ask for the service history before deciding' : 'Ask for the available service records before deciding'),
  'used.verification.check_battery_health': (p) => (p.cause === 'LOW' ? 'Get an independent battery health report before deciding' : 'Verify battery health (state of health report) before deciding'),
  'used.verification.check_warranty': (p) =>
    p.basis === 'CALCULATED'
      ? `Confirm the remaining warranty (${range(p, 'warrantyRemainingMonths', 'months')} by calculation) and its conditions for this unit`
      : 'Confirm whether any manufacturer warranty remains',
  'used.verification.check_damage_repair': () => 'Ask how the declared damage was repaired and get it inspected',
  'used.verification.check_condition': (p) => (p.cause === 'ISSUES' ? 'Have the declared issues inspected before deciding' : 'Check the condition and the inspection (ITV) status before deciding'),
  // ---------------------------------------------------------------- warnings
  'used.warning.registration_after_evaluation': (p) => `Registration ${p.registration} is after the evaluation date ${p.evaluationDate}: age not used`,
  'used.warning.assumed_registration_not_used': (p) => `Assumed registration year ${p.registrationYearAssumed} is an estimate: it is not used to calculate age`,
  'used.warning.battery_health_not_applicable': (p) => `Battery health does not apply to a ${p.powertrain}: the value is ignored`,
  'used.warning.currency_mismatch': (p) => `Asking price in ${p.currency}, but this market uses ${p.marketCurrency}: it is not used`,
  'used.warning.observed_after_evaluation': (p) => `Unit facts observed on ${p.observedAt}, after the evaluation date ${p.evaluationDate}`,
};

/** Params REQUERIDOS por clave (contrato verificado por test). Rangos por su base: `ageMonths` → `ageMonthsMin`/`ageMonthsMax`. */
const MISSING_PARAMS = ['field', 'critical', 'relevance'] as const;
export const USED_MESSAGE_PARAM_SCHEMA: Readonly<Record<string, readonly string[]>> = {
  'used.economic.asking_price_used': ['amountMinMinor', 'amountMaxMinor', 'currency'],
  'used.economic.asking_price_missing': [],
  'used.ownership.high_mileage_for_age': ['mileageKm', 'ageMonthsMin', 'ageMonthsMax', 'annualKmMin', 'annualKmMax', 'referenceAnnualKm', 'thresholdAnnualKm'],
  'used.ownership.low_mileage_for_age': ['mileageKm', 'ageMonthsMin', 'ageMonthsMax', 'annualKmMin', 'annualKmMax', 'referenceAnnualKm', 'thresholdAnnualKm'],
  'used.ownership.mileage_unknown': [],
  'used.ownership.no_remaining_warranty': ['basis'],
  'used.ownership.limited_warranty': ['warrantyRemainingMonthsMin', 'warrantyRemainingMonthsMax', 'limitMonths', 'basis'],
  'used.ownership.service_history_unknown': [],
  'used.ownership.service_history_incomplete': ['history'],
  'used.ownership.battery_health_unknown': ['powertrain'],
  'used.ownership.battery_health_low': ['batteryHealthPct', 'thresholdPct', 'thresholdBasis'],
  'used.ownership.battery_health_reported': ['batteryHealthPct'],
  'used.ownership.accident_damage_declared': [],
  'used.ownership.condition_issues_declared': ['condition', 'inspectionStatus'],
  'used.ownership.condition_unconfirmed': [],
  'used.ownership.asking_price_missing': [],
  'used.information_confidence.summary': ['level', 'knownCount', 'relevantCount', 'notApplicableCount'],
  'used.information_confidence.complete': [],
  'used.information_confidence.capped': ['field', 'level', 'powertrain'],
  'used.information_confidence.missing_asking_price': MISSING_PARAMS,
  'used.information_confidence.missing_mileage': MISSING_PARAMS,
  'used.information_confidence.missing_registration': MISSING_PARAMS,
  'used.information_confidence.missing_service_history': MISSING_PARAMS,
  'used.information_confidence.missing_accident_history': MISSING_PARAMS,
  'used.information_confidence.missing_owners': MISSING_PARAMS,
  'used.information_confidence.missing_warranty': MISSING_PARAMS,
  'used.information_confidence.missing_inspection': MISSING_PARAMS,
  'used.information_confidence.missing_condition': MISSING_PARAMS,
  'used.information_confidence.missing_battery_health': MISSING_PARAMS,
  'used.verification.provide_asking_price': [],
  'used.verification.check_mileage': [],
  'used.verification.check_service_history': ['history'],
  'used.verification.check_battery_health': ['cause'],
  'used.verification.check_warranty': ['basis'],
  'used.verification.check_damage_repair': [],
  'used.verification.check_condition': ['cause'],
  'used.warning.registration_after_evaluation': ['registration', 'evaluationDate'],
  'used.warning.assumed_registration_not_used': ['registrationYearAssumed'],
  'used.warning.battery_health_not_applicable': ['powertrain'],
  'used.warning.currency_mismatch': ['currency', 'marketCurrency'],
  'used.warning.observed_after_evaluation': ['observedAt', 'evaluationDate'],
};

/** Clave de "falta" por campo de información (estable; no depende del texto). */
export const MISSING_KEY: Readonly<Record<string, string>> = {
  asking_price: 'used.information_confidence.missing_asking_price',
  mileage: 'used.information_confidence.missing_mileage',
  registration_year: 'used.information_confidence.missing_registration',
  service_history: 'used.information_confidence.missing_service_history',
  accident_history: 'used.information_confidence.missing_accident_history',
  owners: 'used.information_confidence.missing_owners',
  warranty_remaining: 'used.information_confidence.missing_warranty',
  inspection_status: 'used.information_confidence.missing_inspection',
  condition: 'used.information_confidence.missing_condition',
  battery_health: 'used.information_confidence.missing_battery_health',
};

export const umessage = createMessageFactory(USED_MESSAGE_TEMPLATES);
