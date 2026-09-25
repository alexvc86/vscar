import type { EsTariffZone } from '@vscar/vehicle-schema';
import { hoursInLocalDay, localMidnightUtc, localTimestamp } from '../time.ts';
import { EsiosRequestError, type EsiosPvpcRow } from './client.ts';
import { ESIOS_DATASET, ESIOS_ZONE_FIELDS } from './fields.ts';

/**
 * Normalización del PVPC: filas horarias del día local → precios horarios con instante UTC exacto →
 * estadísticas diarias por zona tarifaria. Los datos horarios quedan disponibles (y en el bruto), pero la salida
 * de producto es la media diaria.
 */
export interface PvpcHour {
  zone: EsTariffZone;
  /** Posición en el día (0 = primera hora local). */
  period_index: number;
  /** Etiqueta de la fuente (no fiable como hora de reloj en días de 25 h). */
  source_label: string;
  start_utc: string;
  /** Hora local de inicio `YYYY-MM-DDTHH:mm:ss` + desfase. */
  start_local: string;
  utc_offset: string;
  eur_per_kwh: number;
}

export interface PvpcDailyStats {
  zone: EsTariffZone;
  external_field: string;
  mean: number;
  min: number;
  max: number;
  n: number;
}

export interface EsiosNormalizationIssue {
  kind: 'UNPARSEABLE_PRICE';
  zone: EsTariffZone;
  detail: string;
}

/** "189,01" (€/MWh, 2 decimales) → céntimos de €/MWh enteros: evita errores de coma flotante al pasar a €/kWh. */
function parseCentsPerMwh(raw: string | undefined): number | undefined {
  const s = raw?.trim() ?? '';
  const m = /^(-?\d+)(?:,(\d{1,2}))?$/.exec(s);
  if (!m) return undefined;
  const sign = m[1]!.startsWith('-') ? -1 : 1;
  return sign * (Math.abs(Number(m[1])) * 100 + Number((m[2] ?? '0').padEnd(2, '0')));
}

/** céntimos de €/MWh → €/kWh (1 €/MWh = 0,001 €/kWh). */
const centsPerMwhToEurPerKwh = (c: number) => c / 100_000;
const round6 = (x: number) => Math.round(x * 1e6) / 1e6;

export function normalizePvpcDay(isoDate: string, rows: readonly EsiosPvpcRow[]) {
  if (rows.length > 0 && rows[0]!['PCB'] === undefined) {
    throw new EsiosRequestError(`ESIOS: PVPC file for ${isoDate} is not in the 2.0TD format (supported from ${ESIOS_DATASET.first_supported_date})`);
  }
  const expectedHours = hoursInLocalDay(isoDate);
  if (rows.length !== expectedHours) {
    throw new EsiosRequestError(`ESIOS: ${rows.length} hourly rows for ${isoDate}, expected ${expectedHours} (local day in Europe/Madrid)`);
  }
  const [y, m, d] = isoDate.split('-');
  const dia = `${d}/${m}/${y}`;
  const wrongDay = rows.filter((r) => r['Dia'] !== dia);
  if (wrongDay.length) throw new EsiosRequestError(`ESIOS: ${wrongDay.length} row(s) are not for ${dia}`);

  const midnight = localMidnightUtc(isoDate);
  const hours: PvpcHour[] = [];
  const daily: PvpcDailyStats[] = [];
  const issues: EsiosNormalizationIssue[] = [];

  for (const [zone, field] of Object.entries(ESIOS_ZONE_FIELDS) as [EsTariffZone, string][]) {
    const cents: number[] = [];
    rows.forEach((r, i) => {
      const c = parseCentsPerMwh(r[field]);
      if (c === undefined) {
        issues.push({ kind: 'UNPARSEABLE_PRICE', zone, detail: `${field} ${JSON.stringify(r[field])} at period ${i} (${r['Hora']})` });
        return;
      }
      cents.push(c);
      const startMs = midnight + i * 3_600_000;
      const local = localTimestamp(startMs);
      hours.push({ zone, period_index: i, source_label: String(r['Hora'] ?? ''), start_utc: new Date(startMs).toISOString(), start_local: local.local, utc_offset: local.offset, eur_per_kwh: centsPerMwhToEurPerKwh(c) });
    });
    // Un día incompleto no produce media diaria (nunca se promedia una parte del día).
    if (cents.length !== rows.length) continue;
    const total = cents.reduce((a, b) => a + b, 0);
    daily.push({
      zone,
      external_field: field,
      mean: round6(centsPerMwhToEurPerKwh(total / cents.length)),
      min: centsPerMwhToEurPerKwh(Math.min(...cents)),
      max: centsPerMwhToEurPerKwh(Math.max(...cents)),
      n: cents.length,
    });
  }
  return { expected_hours: expectedHours, hours, daily, issues };
}
