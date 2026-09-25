import type { HomologationPowertrain } from '@vscar/vehicle-schema';
import { EeaAggregatedRow } from './fields.ts';

/**
 * Normalización de filas EEA → observaciones por homologación (TAN/Va/Ve).
 * Problemas reales observados y tratados aquí (2026-09-24):
 * - `[latest].[co2cars]` devuelve filas provisionales (P) y finales (F) del mismo año → se usan F si existen.
 * - Mayúsculas inconsistentes en TAN/Ft ("E1*"/"e1*", "PETROL"/"Petrol").
 * - Varios valores de un mismo campo dentro de una homologación (equipamiento) → distribución, nunca un promedio.
 */
export type EeaNumericField = 'Ec (cm3)' | 'Ep (KW)' | 'M (kg)' | 'Mt' | 'Enedc (g/km)' | 'Ewltp (g/km)' | 'Z (Wh/km)' | 'Zr' | 'Fc' | 'W (mm)';
export const EEA_NUMERIC_FIELDS: readonly EeaNumericField[] = ['Ec (cm3)', 'Ep (KW)', 'M (kg)', 'Mt', 'Enedc (g/km)', 'Ewltp (g/km)', 'Z (Wh/km)', 'Zr', 'Fc', 'W (mm)'];

/** Distribución valor → matriculaciones. */
export type Distribution = ReadonlyMap<number, number>;

export interface EeaObservation {
  member_state: string;
  year: number;
  status: 'F' | 'P';
  /** Normalizado para matching (mayúsculas, sin espacios). */
  type_approval_number: string;
  /** Valores tal como vienen de la fuente (casing original conservado para procedencia). */
  type_approval_number_raw: string[];
  variant_code: string;
  version_code: string;
  make: string;
  commercial_names: string[];
  fuel_types: string[];
  fuel_types_raw: string[];
  fuel_modes: string[];
  registrations: number;
  registration_period?: { from: string; to: string };
  fields: Partial<Record<EeaNumericField, Distribution>>;
}

export interface NormalizationIssue {
  kind: 'INVALID_ROW' | 'MISSING_IDENTIFIERS' | 'MIXED_FUEL_MODE' | 'PROVISIONAL_ONLY';
  key?: string;
  detail: string;
}

export const normalizeTan = (tan: string) => tan.trim().toUpperCase().replace(/\s+/g, '');
const up = (s: string | null | undefined) => (s ?? '').trim().toUpperCase();

export function normalizeEeaRows(rawRows: readonly unknown[]): { observations: EeaObservation[]; issues: NormalizationIssue[] } {
  const issues: NormalizationIssue[] = [];
  const rows: EeaAggregatedRow[] = [];
  rawRows.forEach((r, i) => {
    const parsed = EeaAggregatedRow.safeParse(r);
    if (parsed.success) rows.push(parsed.data);
    else issues.push({ kind: 'INVALID_ROW', detail: `row ${i}: ${parsed.error.issues[0]?.message ?? 'invalid'}` });
  });

  // Agrupar por identidad técnica y estado.
  const groups = new Map<string, EeaAggregatedRow[]>();
  for (const r of rows) {
    if (!r.TAN || !r.Va || !r.Ve || !r.MS || !r.Year) {
      issues.push({ kind: 'MISSING_IDENTIFIERS', detail: `row without TAN/Va/Ve/MS/Year (${r.Cn ?? '?'})` });
      continue;
    }
    const key = [up(r.MS), r.Year, normalizeTan(r.TAN), up(r.Va), up(r.Ve)].join('|');
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  const observations: EeaObservation[] = [];
  for (const [key, all] of [...groups.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    // Nunca se agregan F y P del mismo año: si hay finales, se descartan las provisionales.
    const finals = all.filter((r) => up(r.Status) === 'F');
    const status: 'F' | 'P' = finals.length > 0 ? 'F' : 'P';
    const chosen = status === 'F' ? finals : all.filter((r) => up(r.Status) === 'P');
    if (status === 'P') issues.push({ kind: 'PROVISIONAL_ONLY', key, detail: 'only provisional (P) rows available' });

    const fields: Partial<Record<EeaNumericField, Map<number, number>>> = {};
    let registrations = 0;
    let from: string | undefined;
    let to: string | undefined;
    for (const r of chosen) {
      const n = r.R ?? 0;
      registrations += n;
      for (const f of EEA_NUMERIC_FIELDS) {
        const v = r[f];
        if (v === null || v === undefined) continue;
        const m = (fields[f] ??= new Map());
        m.set(v, (m.get(v) ?? 0) + n);
      }
      if (r.Dr_min && (!from || r.Dr_min < from)) from = r.Dr_min;
      if (r.Dr_max && (!to || r.Dr_max > to)) to = r.Dr_max;
    }
    const fuelModes = [...new Set(chosen.map((r) => up(r.Fm)).filter(Boolean))].sort();
    if (fuelModes.length > 1) issues.push({ kind: 'MIXED_FUEL_MODE', key, detail: `fuel modes ${fuelModes.join('/')}` });

    const first = chosen[0]!;
    observations.push({
      member_state: up(first.MS),
      year: first.Year!,
      status,
      type_approval_number: normalizeTan(first.TAN!),
      type_approval_number_raw: [...new Set(chosen.map((r) => r.TAN!).filter(Boolean))].sort(),
      variant_code: up(first.Va),
      version_code: up(first.Ve),
      make: up(first.Mk),
      commercial_names: [...new Set(chosen.map((r) => up(r.Cn)).filter(Boolean))].sort(),
      fuel_types: [...new Set(chosen.map((r) => up(r.Ft)).filter(Boolean))].sort(),
      fuel_types_raw: [...new Set(chosen.map((r) => r.Ft ?? '').filter(Boolean))].sort(),
      fuel_modes: fuelModes,
      registrations,
      ...(from && to ? { registration_period: { from, to } } : {}),
      fields,
    });
  }
  return { observations, issues };
}

/** Mapeo de `Fm`/`Ft` a `homologation_powertrain` (versión 1). `P` no figura en la tabla de definición: observado en datos. */
export function homologationPowertrainOf(obs: Pick<EeaObservation, 'fuel_modes' | 'fuel_types'>): HomologationPowertrain {
  if (obs.fuel_modes.length !== 1) return 'UNKNOWN';
  const fm = obs.fuel_modes[0];
  const electricFuel = obs.fuel_types.some((f) => f.includes('ELECTRIC'));
  switch (fm) {
    case 'E':
      return 'BEV';
    case 'P':
      return 'OVC_HEV';
    case 'H':
      return 'NOVC_HEV';
    case 'M':
    case 'B':
    case 'F':
      return electricFuel ? 'UNKNOWN' : 'ICE';
    default:
      return 'UNKNOWN';
  }
}

const FUEL_MAP: Record<string, string> = {
  PETROL: 'petrol',
  'PETROL/ELECTRIC': 'petrol',
  DIESEL: 'diesel',
  'DIESEL/ELECTRIC': 'diesel',
  LPG: 'lpg',
  NG: 'cng',
  'NG-BIOMETHANE': 'cng',
  E85: 'e85',
  HYDROGEN: 'hydrogen',
};
export function fuelTypeOf(obs: Pick<EeaObservation, 'fuel_types'>): string | undefined {
  const mapped = [...new Set(obs.fuel_types.map((f) => FUEL_MAP[f]).filter(Boolean))];
  return mapped.length === 1 ? mapped[0] : undefined;
}
