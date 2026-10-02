import { evaluateDealBreakers, type ComparisonCandidate, type DealBreakerCheck, type DealBreakerResult } from '@vscar/comparison-engine';
import type { ComponentScore, DecisionScenario, PracticalFitResult } from './contracts.ts';
import { practicalScore } from './utilities.ts';

/**
 * Practical Fit: estado + score + motivos. El estado manda sobre el score.
 * - Requisitos obligatorios: el resultado de Deal Breakers del Step 6a (no se reevalúa con otras reglas).
 * - Requisitos deseados: misma regla de comprobación (`evaluateDealBreakers`), pero un incumplimiento es un compromiso.
 * FAIL (obligatorio incumplido) · UNCONFIRMED (obligatorio sin dato: nunca PASS) · PASS_WITH_COMPROMISES · PASS.
 */
const LABELS: Record<string, [string, string]> = {
  minSeats: ['seats', 'seat'],
  minBootL: ['boot', 'L'],
  minTowingKg: ['towing capacity', 'kg'],
  maxLengthMm: ['length', 'mm'],
  maxWidthMm: ['width', 'mm'],
  maxHeightMm: ['height', 'mm'],
  minElectricRangeKm: ['electric range', 'km'],
  maxPurchasePriceEur: ['purchase price', '€'],
};

function shortfallText(c: DealBreakerCheck): string {
  const [what, unit] = LABELS[c.criterion] ?? [c.criterion, ''];
  const o = c.observedValue;
  if (!o) return `${what}: no data`;
  const isMax = c.criterion.startsWith('max');
  const gap = isMax ? o.min - c.requiredValue : c.requiredValue - o.max;
  return `${what} is ${gap.toLocaleString('en-US')} ${unit} ${isMax ? 'above' : 'below'} your preferred ${c.requiredValue.toLocaleString('en-US')} ${unit}`;
}

function passText(c: DealBreakerCheck): string {
  if (c.criterion === 'minSeats') return `fits your ${c.requiredValue}-seat requirement`;
  const [what, unit] = LABELS[c.criterion] ?? [c.criterion, ''];
  return `meets your ${what} requirement (${c.criterion.startsWith('max') ? '≤' : '≥'} ${c.requiredValue.toLocaleString('en-US')} ${unit})`;
}

export function practicalFit(c: ComparisonCandidate, mandatory: DealBreakerResult, scenario: DecisionScenario, components: readonly ComponentScore[]): PracticalFitResult {
  const desired = evaluateDealBreakers(c, { requirements: scenario.desired });
  const failed = mandatory.failedChecks;
  const compromises = desired.failedChecks;
  const unknowns = [...mandatory.unknownChecks, ...desired.unknownChecks];
  const status = failed.length ? 'FAIL' : mandatory.unknownChecks.length ? 'UNCONFIRMED' : compromises.length ? 'PASS_WITH_COMPROMISES' : 'PASS';

  const reasons: string[] = [];
  if (failed.length) reasons.push(`does not meet: ${failed.map((f) => f.reason).join('; ')}`);
  const passes = mandatory.checks.filter((x) => x.status === 'PASS').map(passText);
  if (status !== 'FAIL') {
    const head = passes.length ? passes.join(', ') : 'no mandatory requirement fails';
    reasons.push(compromises.length ? `${head}, but ${compromises.map(shortfallText).join('; ')}` : head);
  }
  if (mandatory.unknownChecks.length) reasons.push(`cannot confirm: ${mandatory.unknownChecks.map((u) => u.reason).join('; ')}`);
  if (desired.unknownChecks.length) reasons.push(`preferred targets without data: ${desired.unknownChecks.map((u) => u.reason).join('; ')}`);

  const score = practicalScore(components);
  return {
    candidateId: c.id,
    status,
    ...(score ? { score } : {}),
    components: components.filter((x) => x.component === 'SPACE' || x.component === 'RANGE_FIT'),
    reasons,
    compromises,
    unknowns,
    mandatoryUnknowns: mandatory.unknownChecks,
    failed,
  };
}
