import { describe, expect, it } from 'vitest';
import { buildComparisonChapters, MAX_CHAPTERS, relevantTechnicalMetrics } from '../src/domain/chapters.ts';
import type { MetricView } from '../src/domain/view-model.ts';

/** Step 7c §27–31: capítulos solo cuando el engine los hace relevantes; prioridad, tope y orden de página. */
const metric = (m: string, over: Partial<MetricView> = {}): MetricView => ({
  metric: m,
  category: 'Performance',
  outcome: 'AHEAD',
  a: { min: 1, max: 1, unit: 's' },
  b: { min: 2, max: 2, unit: 's' },
  meaningful: 'CLEAR',
  forYouMessages: [],
  leader: 'a',
  ...over,
});
const base = { keyMetrics: [] as MetricView[], technicalMetrics: [] as MetricView[], economicStatus: 'TIE', practicalStatus: ['PASS', 'PASS'] as const, hasTradeoffs: false };
const kinds = (input: Parameters<typeof buildComparisonChapters>[0]) => buildComparisonChapters(input).map((c) => c.kind);

describe('buildComparisonChapters', () => {
  it('minimum: VS, result, what would change, confidence, details (6–9 with reasons)', () => {
    expect(kinds(base)).toEqual(['vs', 'result', 'change', 'confidence', 'details']);
  });
  it('practical chapter only when a requirement fails, needs a compromise or cannot be confirmed', () => {
    expect(kinds(base)).not.toContain('practical');
    expect(kinds({ ...base, practicalStatus: ['FAIL', 'PASS'] })).toContain('practical');
    expect(kinds({ ...base, practicalStatus: ['UNCONFIRMED', 'UNCONFIRMED'] })).toContain('practical');
  });
  it('economics when there is a comparable leader (not already a reason) or cycles are NOT comparable', () => {
    expect(kinds({ ...base, economicStatus: 'LEADER' })).toContain('economics');
    expect(kinds({ ...base, economicStatus: 'NOT_COMPARABLE' })).toContain('economics');
    expect(kinds({ ...base, economicStatus: 'LEADER', keyMetrics: [metric('economic.running_annual', { category: 'Economy' })] })).not.toContain('economics');
  });
  it('technical only with relevant (≥ MEANINGFUL) differences that are not already a reason chapter', () => {
    expect(kinds({ ...base, technicalMetrics: [metric('perf.accel_0_100_s', { meaningful: 'SLIGHT' })] })).not.toContain('technical');
    expect(kinds({ ...base, technicalMetrics: [metric('perf.accel_0_100_s')] })).toContain('technical');
    const reason = metric('rng.electric_combined_km');
    expect(relevantTechnicalMetrics([reason], [reason])).toEqual([]);
    expect(relevantTechnicalMetrics([metric('x', { outcome: 'NOT_COMPARABLE' })], [])).toEqual([]);
  });
  it('page order (§27) and the cap of 9: lower priorities drop first (tradeoffs, then technical)', () => {
    const full = { keyMetrics: [metric('r1'), metric('r2'), metric('r3')], technicalMetrics: [metric('t1')], economicStatus: 'LEADER', practicalStatus: ['FAIL', 'PASS'] as const, hasTradeoffs: true };
    const out = kinds(full);
    expect(out.length).toBe(MAX_CHAPTERS);
    expect(out).toEqual(['vs', 'result', 'reason', 'reason', 'economics', 'practical', 'change', 'confidence', 'details']);
    expect(kinds({ ...full, keyMetrics: [metric('r1')] })).toEqual(['vs', 'result', 'reason', 'economics', 'technical', 'practical', 'change', 'confidence', 'details']);
  });
});
