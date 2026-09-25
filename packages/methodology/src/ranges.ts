/**
 * Reglas de rangos (D4 · Plan/Catalog v0.2 §10): los engines trabajan con intervalos.
 * - LOW / HIGH = extremos del rango homologado.
 * - BASE solo existe con una regla metodológica explícita (no se inventa un punto medio).
 * - CONSERVATIVE = extremo desfavorable, solo como escenario explícito.
 */
export type RangeScenario = 'LOW' | 'HIGH' | 'CONSERVATIVE' | 'BASE';

export interface NumericRange {
  min: number;
  max: number;
}

export type RangeVerdict = 'RESULT_STABLE_ACROSS_HOMOLOGATED_RANGE' | 'RESULT_DEPENDS_ON_CONFIGURATION';

export interface BaseRule {
  id: string;
  pick(range: NumericRange): number;
}

export function scenarioValue(range: NumericRange, scenario: RangeScenario, higherIsBetter: boolean, baseRule?: BaseRule): number {
  switch (scenario) {
    case 'LOW':
      return range.min;
    case 'HIGH':
      return range.max;
    case 'CONSERVATIVE':
      return higherIsBetter ? range.min : range.max;
    case 'BASE':
      if (!baseRule) throw new Error('BASE scenario requires a published methodology rule (no invented midpoint)');
      return baseRule.pick(range);
  }
}

/**
 * Evalúa una función monótona sobre un rango de entrada y devuelve el intervalo de salida.
 * Para funciones monótonas los extremos del resultado están en los extremos de la entrada.
 */
export function mapRange(range: NumericRange, fn: (x: number) => number): NumericRange {
  const a = fn(range.min);
  const b = fn(range.max);
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

export interface RangedCandidate {
  id: string;
  outcome: NumericRange;
}

/**
 * ¿Cambia el ganador dentro de los rangos homologados? Estable solo si el peor caso del mejor candidato
 * supera al mejor caso de todos los demás.
 */
export function rangeVerdict(candidates: readonly RangedCandidate[], lowerIsBetter: boolean): { verdict: RangeVerdict; leader?: string } {
  if (candidates.length < 2) return { verdict: 'RESULT_STABLE_ACROSS_HOMOLOGATED_RANGE', ...(candidates[0] ? { leader: candidates[0].id } : {}) };
  const worst = (c: RangedCandidate) => (lowerIsBetter ? c.outcome.max : c.outcome.min);
  const best = (c: RangedCandidate) => (lowerIsBetter ? c.outcome.min : c.outcome.max);
  const sorted = [...candidates].sort((a, b) => (lowerIsBetter ? worst(a) - worst(b) : worst(b) - worst(a)));
  const leader = sorted[0]!;
  const beatsAll = sorted.slice(1).every((c) => (lowerIsBetter ? worst(leader) < best(c) : worst(leader) > best(c)));
  return beatsAll
    ? { verdict: 'RESULT_STABLE_ACROSS_HOMOLOGATED_RANGE', leader: leader.id }
    : { verdict: 'RESULT_DEPENDS_ON_CONFIGURATION' };
}
