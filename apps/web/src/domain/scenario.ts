import type { DecisionScenarioIn } from '@vscar/decision-engine';
import type { EconomicScenarioIn } from '@vscar/economics-engine';
import { z } from 'zod';

/**
 * Escenario Alpha compartible. La URL es la fuente de verdad (Plan §34): un único parser y un único
 * serializador; ningún componente lee `searchParams` por su cuenta.
 */
const PRIORITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export const SCENARIO_LIMITS = {
  km: { min: 1_000, max: 80_000, step: 500 },
  daily: { min: 1, max: 300, step: 1 },
  trips: { min: 0, max: 52, step: 1 },
  years: { min: 1, max: 15, step: 1 },
  home: { min: 0, max: 100, step: 10 },
  priority: { min: 1, max: 3, step: 1 },
} as const;

/** Commuter de los Steps 6c–6e: 15.000 km/año, 35 km/día, carga en casa, 1 viaje largo/año, 5 años. */
export const DEFAULT_SCENARIO = { km: 15_000, daily: 35, trips: 1, years: 5, home: 100, cost: 2, space: 2, performance: 2 } as const;

const int = (k: keyof typeof SCENARIO_LIMITS) => z.number().int().min(SCENARIO_LIMITS[k].min).max(SCENARIO_LIMITS[k].max);

/**
 * Step 8b — requisitos del usuario para coches USADOS (Deal Breakers ya admitidos por los engines). Opcionales:
 * ausentes = sin requisito. Solo se evalúan en unidades usadas; desconocido → sin confirmar (nunca PASS).
 */
export const REQUIREMENT_LIMITS = {
  maxkm: { min: 1_000, max: 1_500_000, step: 5_000 },
  maxage: { min: 1, max: 40, step: 1 },
  minsoh: { min: 50, max: 100, step: 1 },
  minwarranty: { min: 1, max: 120, step: 1 },
  fullhistory: { min: 1, max: 1, step: 1 },
} as const;
const req = (k: keyof typeof REQUIREMENT_LIMITS) => z.number().int().min(REQUIREMENT_LIMITS[k].min).max(REQUIREMENT_LIMITS[k].max).optional();
export const REQUIREMENT_KEYS = ['maxkm', 'maxage', 'minsoh', 'minwarranty', 'fullhistory'] as const;
export type RequirementKey = (typeof REQUIREMENT_KEYS)[number];

/** Contrato validado (formulario y URL). */
export const Scenario = z
  .object({
    km: int('km'),
    daily: int('daily'),
    trips: int('trips'),
    years: int('years'),
    home: int('home'),
    cost: int('priority'),
    space: int('priority'),
    performance: int('priority'),
    maxkm: req('maxkm'),
    maxage: req('maxage'),
    minsoh: req('minsoh'),
    minwarranty: req('minwarranty'),
    fullhistory: req('fullhistory'),
  })
  .strict();
export type Scenario = z.infer<typeof Scenario>;

/** Orden fijo de serialización (determinista). */
export const SCENARIO_KEYS = ['km', 'daily', 'trips', 'years', 'home', 'cost', 'space', 'performance'] as const satisfies readonly (keyof Scenario)[];

type ParamsLike = URLSearchParams | Record<string, string | string[] | undefined>;

function read(params: ParamsLike, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

/**
 * URL → escenario. Cada campo inválido o ausente cae a su valor por defecto (nunca 400 por un parámetro roto);
 * `invalid` lista los descartados para poder avisar.
 */
export function parseScenarioFromSearchParams(params: ParamsLike): { scenario: Scenario; invalid: string[] } {
  const invalid: string[] = [];
  const out: Record<string, number> = {};
  for (const key of SCENARIO_KEYS) {
    const raw = read(params, key);
    const fallback = DEFAULT_SCENARIO[key];
    if (raw === undefined || raw === '') {
      out[key] = fallback;
      continue;
    }
    const parsed = Scenario.shape[key].safeParse(Number(raw));
    if (parsed.success && /^-?\d+$/.test(raw.trim())) out[key] = parsed.data;
    else {
      out[key] = fallback;
      invalid.push(key);
    }
  }
  // Requisitos de usado: ausentes = sin requisito; inválidos se descartan (y se informa).
  for (const key of REQUIREMENT_KEYS) {
    const raw = read(params, key);
    if (raw === undefined || raw === '') continue;
    const parsed = Scenario.shape[key].safeParse(Number(raw));
    if (parsed.success && parsed.data !== undefined && /^\d+$/.test(raw.trim())) out[key] = parsed.data;
    else invalid.push(key);
  }
  return { scenario: Scenario.parse(out), invalid };
}

/** Escenario → query. Determinista: orden fijo y solo los valores distintos del defecto (URL canónica corta). */
export function serializeScenario(s: Scenario): string {
  const q = new URLSearchParams();
  for (const key of SCENARIO_KEYS) if (s[key] !== DEFAULT_SCENARIO[key]) q.set(key, String(s[key]));
  for (const key of REQUIREMENT_KEYS) if (s[key] !== undefined) q.set(key, String(s[key]));
  const str = q.toString();
  return str ? `?${str}` : '';
}

export const priorityLevel = (n: number): PriorityLevel => PRIORITY_LEVELS[Math.min(2, Math.max(0, n - 1))]!;

/** Escenario de UI → contratos REALES de los engines (sin lógica de decisión aquí). */
export function toEngineScenarios(s: Scenario): { economicScenario: EconomicScenarioIn; decisionScenario: DecisionScenarioIn } {
  const homeShare = s.home / 100;
  return {
    economicScenario: { annualKm: s.km, horizonYears: s.years, energy: { homeChargingShare: homeShare } },
    decisionScenario: {
      horizonYears: s.years,
      comparison: { annualKm: s.km, dailyDistanceKm: s.daily, longTripsPerYear: s.trips, homeChargingAvailable: s.home > 0, homeChargingShare: homeShare, ...requirementsOf(s) },
      priorities: { COST: priorityLevel(s.cost), SPACE: priorityLevel(s.space), PERFORMANCE: priorityLevel(s.performance) },
    },
  };
}

/** Requisitos de usado → `ComparisonScenario.requirements` (solo los presentes: sin ellos, el escenario es el de antes). */
function requirementsOf(s: Scenario): { requirements?: NonNullable<DecisionScenarioIn['comparison']>['requirements'] } {
  const r = {
    ...(s.maxkm !== undefined ? { maxMileageKm: s.maxkm } : {}),
    ...(s.maxage !== undefined ? { maxAgeYears: s.maxage } : {}),
    ...(s.minsoh !== undefined ? { minBatteryHealthPct: s.minsoh } : {}),
    ...(s.minwarranty !== undefined ? { minWarrantyRemainingMonths: s.minwarranty } : {}),
    ...(s.fullhistory ? { mustHaveFullServiceHistory: true as const } : {}),
  };
  return Object.keys(r).length ? { requirements: r } : {};
}

export const hasRequirements = (s: Scenario) => REQUIREMENT_KEYS.some((k) => s[k] !== undefined);

export function scenarioKey(s: Scenario): string {
  const base = SCENARIO_KEYS.map((k) => s[k]).join('.');
  return hasRequirements(s) ? `${base}|${REQUIREMENT_KEYS.map((k) => s[k] ?? '').join('.')}` : base;
}
