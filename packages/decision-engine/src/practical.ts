import { evaluateDealBreakers, type ComparisonCandidate, type DealBreakerCheck, type DealBreakerResult } from '@vscar/comparison-engine';
import type { Message } from '@vscar/methodology';
import type { ComponentScore, DecisionScenario, PracticalFitResult } from './contracts.ts';
import { checkParams, message } from './messages.ts';
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
  maxMileageKm: ['mileage', 'km'],
  maxAgeYears: ['age', 'years'],
  minBatteryHealthPct: ['battery health', '%'],
  minWarrantyRemainingMonths: ['remaining warranty', 'months'],
  mustHaveFullServiceHistory: ['full service history', ''],
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

  // Mismos hechos que `reasons`, como mensajes estructurados (la UI traduce; nunca infiere de `reasons`).
  const messages: Message[] = [];
  for (const f of failed) messages.push(message('decision.practical.requirement_failed', checkParams(f)));
  if (status !== 'FAIL') {
    const met = mandatory.checks.filter((x) => x.status === 'PASS');
    if (met.length) for (const m of met) messages.push(message('decision.practical.requirement_met', checkParams(m)));
    else messages.push(message('decision.practical.no_failures'));
    for (const x of compromises) {
      const o = x.observedValue!;
      const isMax = x.criterion.startsWith('max');
      messages.push(message('decision.practical.compromise', { ...checkParams(x), gap: isMax ? o.min - x.requiredValue : x.requiredValue - o.max, direction: isMax ? 'ABOVE' : 'BELOW' }));
    }
  }
  for (const u of mandatory.unknownChecks) messages.push(message('decision.practical.unconfirmed', checkParams(u)));
  for (const u of desired.unknownChecks) messages.push(message('decision.practical.desired_unknown', checkParams(u)));

  const score = practicalScore(components);
  return {
    candidateId: c.id,
    status,
    ...(score ? { score } : {}),
    components: components.filter((x) => x.component === 'SPACE' || x.component === 'RANGE_FIT'),
    reasons,
    messages,
    compromises,
    unknowns,
    mandatoryUnknowns: mandatory.unknownChecks,
    failed,
  };
}
