import { ROBUSTNESS_RULES, type ConfidenceLevel, type PriorityLevel } from '@vscar/methodology';
import type { AlphaDecisionResult, SimplePriorities } from './contracts.ts';
import { message, type Message } from './messages.ts';

/**
 * Result Robustness (Step 6c): ¿qué tan estable es el resultado si cambian supuestos razonables del escenario?
 * No es calidad de datos. Búsqueda determinista y acotada (rejilla + bisección) dentro de los rangos plausibles de
 * methodology; nunca fuera. El escenario se re-evalúa con un `RobustnessProbe` que ORQUESTA los engines existentes
 * (Economics → Comparison → Decision): aquí no se calcula ningún coste ni comparación.
 */
export type RobustnessVariable = keyof typeof ROBUSTNESS_RULES.variables;
export type VariableStatus = 'STABLE' | 'SENSITIVE' | 'VERY_SENSITIVE' | 'NO_SWITCH_IN_RANGE' | 'NOT_APPLICABLE' | 'UNKNOWN';

export interface ProbeVariable {
  variable: RobustnessVariable;
  current: number;
  min: number;
  max: number;
  applicable: boolean;
  reason?: string;
}

export interface RobustnessProbe {
  variables: readonly ProbeVariable[];
  /** Re-evalúa la cadena completa con una variable cambiada (el resto igual). */
  evaluate(variable: RobustnessVariable, value: number): AlphaDecisionResult;
  /** Re-evalúa con otras prioridades simples. */
  evaluatePriorities(priorities: SimplePriorities): AlphaDecisionResult;
}

export interface VariableRobustness {
  variable: RobustnessVariable;
  currentValue: number;
  range: { min: number; max: number };
  status: VariableStatus;
  switchValue?: number;
  direction?: 'BELOW' | 'ABOVE';
  distanceNormalized?: number;
  /** Resultado al otro lado del punto de cambio. */
  resultAfterSwitch?: string;
  evaluations: number;
}

export interface TargetRobustness {
  target: 'ALPHA_BEST_FOR_YOU' | 'ECONOMIC_FIT';
  baseResult: string;
  variables: VariableRobustness[];
}

export interface PriorityRobustness {
  priority: 'COST' | 'SPACE' | 'PERFORMANCE';
  current: PriorityLevel;
  changesWith: PriorityLevel[];
}

export interface ResultRobustness {
  status: 'STABLE' | 'SENSITIVE' | 'VERY_SENSITIVE' | 'TIE' | 'RANGE_DEPENDENT' | 'NO_RECOMMENDATION' | 'UNKNOWN';
  level: ConfidenceLevel;
  bestForYou: TargetRobustness;
  economicFit: TargetRobustness;
  priorities: PriorityRobustness[];
  nearest?: VariableRobustness;
  messages: Message[];
  rulesVersion: string;
}

export const bestForYouSignature = (r: AlphaDecisionResult) => {
  const b = r.alphaBestForYou;
  return `${b.status}:${b.candidateId ?? (b.tiedIds ?? []).join(',')}`;
};
export const economicSignature = (r: AlphaDecisionResult) => `${r.economicFit.status}:${r.economicFit.leaderId ?? (r.economicFit.tiedIds ?? []).join(',')}`;

const RULES = ROBUSTNESS_RULES;
const round = (x: number, decimals: number) => (decimals < 0 ? Math.round(x / 10 ** -decimals) * 10 ** -decimals : Math.round(x * 10 ** decimals) / 10 ** decimals);

function statusOf(distance: number): VariableStatus {
  if (distance < RULES.thresholds.very_sensitive_below) return 'VERY_SENSITIVE';
  if (distance < RULES.thresholds.sensitive_below) return 'SENSITIVE';
  return 'STABLE';
}

/**
 * Punto de cambio más cercano a `current` en [min, max] para una firma de resultado. Rejilla de N pasos por lado
 * y bisección entre el último punto igual y el primero distinto. Las variables enteras se recorren valor a valor.
 */
function scan(v: ProbeVariable, sig: (x: number) => string, base: string): Omit<VariableRobustness, 'variable' | 'currentValue' | 'range' | 'evaluations'> {
  const def = RULES.variables[v.variable];
  const sides = [
    { dir: 'BELOW' as const, bound: v.min },
    { dir: 'ABOVE' as const, bound: v.max },
  ];
  let best: { x: number; dir: 'BELOW' | 'ABOVE'; after: string } | undefined;
  for (const side of sides) {
    if (side.bound === v.current) continue;
    let prev = v.current;
    let found: { lo: number; hi: number } | undefined;
    if (def.kind === 'integer') {
      const step = side.bound > v.current ? 1 : -1;
      for (let x = Math.round(v.current) + step; step > 0 ? x <= side.bound : x >= side.bound; x += step) {
        if (sig(x) !== base) {
          found = { lo: x, hi: x };
          break;
        }
      }
    } else {
      for (let i = 1; i <= RULES.grid_steps_per_side; i++) {
        const x = v.current + ((side.bound - v.current) * i) / RULES.grid_steps_per_side;
        if (sig(x) !== base) {
          found = { lo: prev, hi: x };
          break;
        }
        prev = x;
      }
      if (found) {
        let { lo, hi } = found; // lo: igual que base; hi: distinto
        for (let k = 0; k < RULES.bisection_iterations; k++) {
          const mid = (lo + hi) / 2;
          if (sig(mid) === base) lo = mid;
          else hi = mid;
        }
        found = { lo, hi };
      }
    }
    if (found) {
      const x = found.hi;
      if (!best || Math.abs(x - v.current) < Math.abs(best.x - v.current)) best = { x, dir: side.dir, after: sig(x) };
    }
  }
  if (!best) return { status: 'NO_SWITCH_IN_RANGE' };
  const distanceNormalized = Math.round((Math.abs(best.x - v.current) / (v.max - v.min)) * 10_000) / 10_000;
  return { status: statusOf(distanceNormalized), switchValue: round(best.x, def.display_decimals), direction: best.dir, distanceNormalized, resultAfterSwitch: best.after };
}

const LEVELS: PriorityLevel[] = ['LOW', 'MEDIUM', 'HIGH'];

export function resultRobustness(base: AlphaDecisionResult, probe?: RobustnessProbe): ResultRobustness {
  const bfyBase = bestForYouSignature(base);
  const ecoBase = economicSignature(base);
  const empty = (target: TargetRobustness['target'], baseResult: string): TargetRobustness => ({ target, baseResult, variables: [] });
  if (!probe) {
    return { status: 'UNKNOWN', level: 'LOW', bestForYou: empty('ALPHA_BEST_FOR_YOU', bfyBase), economicFit: empty('ECONOMIC_FIT', ecoBase), priorities: [], messages: [message('decision.robustness.unknown')], rulesVersion: RULES.version };
  }
  const cache = new Map<string, AlphaDecisionResult>();
  const evalAt = (v: RobustnessVariable, x: number) => {
    const k = `${v}|${x}`;
    let r = cache.get(k);
    if (!r) cache.set(k, (r = probe.evaluate(v, x)));
    return r;
  };
  const perTarget = (target: TargetRobustness['target'], sig: (r: AlphaDecisionResult) => string, baseSig: string): TargetRobustness => ({
    target,
    baseResult: baseSig,
    variables: [...probe.variables]
      .sort((a, b) => a.variable.localeCompare(b.variable))
      .map((v) => {
        const head = { variable: v.variable, currentValue: v.current, range: { min: v.min, max: v.max } };
        if (!v.applicable) return { ...head, status: 'NOT_APPLICABLE' as const, evaluations: 0 };
        const before = cache.size;
        const res = scan(v, (x) => sig(evalAt(v.variable, x)), baseSig);
        return { ...head, ...res, evaluations: cache.size - before };
      }),
  });
  const bestForYou = perTarget('ALPHA_BEST_FOR_YOU', bestForYouSignature, bfyBase);
  const economicFit = perTarget('ECONOMIC_FIT', economicSignature, ecoBase);

  const priorities: PriorityRobustness[] = (['COST', 'SPACE', 'PERFORMANCE'] as const).map((p) => ({
    priority: p,
    current: base.priorities[p],
    changesWith: LEVELS.filter((l) => l !== base.priorities[p] && Math.abs(LEVELS.indexOf(l) - LEVELS.indexOf(base.priorities[p])) === 1).filter((l) => bestForYouSignature(probe.evaluatePriorities({ ...base.priorities, [p]: l })) !== bfyBase),
  }));

  const switching = bestForYou.variables.filter((v) => v.switchValue !== undefined).sort((a, b) => a.distanceNormalized! - b.distanceNormalized! || a.variable.localeCompare(b.variable));
  const nearest = switching[0];
  const messages: Message[] = switching.map((v) => message('decision.robustness.switch', { variable: v.variable, direction: v.direction, switchValue: v.switchValue, currentValue: v.currentValue }));
  for (const p of priorities) for (const l of p.changesWith) messages.push(message('decision.robustness.priority_switch', { priority: p.priority, level: l }));

  const st = base.alphaBestForYou.status;
  let status: ResultRobustness['status'];
  if (st === 'PRACTICAL_TIE') status = 'TIE';
  else if (st === 'RANGE_DEPENDENT') status = 'RANGE_DEPENDENT';
  else if (st === 'NO_FULL_MATCH') status = 'NO_RECOMMENDATION';
  else if (st === 'INSUFFICIENT_DATA') status = 'UNKNOWN';
  else {
    const worstVar = nearest?.status === 'VERY_SENSITIVE' ? 'VERY_SENSITIVE' : nearest?.status === 'SENSITIVE' ? 'SENSITIVE' : 'STABLE';
    const priorityFlip = priorities.some((p) => p.changesWith.length);
    status = worstVar === 'STABLE' && priorityFlip ? RULES.priority_flip_status : worstVar;
  }
  const level: ConfidenceLevel = status === 'STABLE' ? 'HIGH' : status === 'SENSITIVE' ? 'MEDIUM' : 'LOW';
  if (status === 'TIE') messages.unshift(message('decision.robustness.tie'));
  else if (status === 'RANGE_DEPENDENT') messages.unshift(message('decision.robustness.range_dependent'));
  else if (status === 'NO_RECOMMENDATION') messages.unshift(message('decision.robustness.no_recommendation'));
  else if (!messages.length) messages.push(message('decision.robustness.stable'));
  return { status, level, bestForYou, economicFit, priorities, ...(nearest ? { nearest } : {}), messages, rulesVersion: RULES.version };
}
