import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { COMPARISONS, DEMO_SLUG } from '../src/domain/comparisons.ts';
import { computeDecision, computeRobustness, VEHICLE_IDS } from '../src/domain/decision.ts';
import { DEFAULT_SCENARIO, parseScenarioFromSearchParams, Scenario, SCENARIO_LIMITS, serializeScenario, toEngineScenarios } from '../src/domain/scenario.ts';
import { serverDecisionView } from '../src/domain/server-decision.ts';
import { buildDecisionView, withRobustness } from '../src/domain/view-model.ts';

const def = COMPARISONS[DEMO_SLUG]!;
const view = (trips: number, robustness = false) => {
  const run = computeDecision(def, { ...DEFAULT_SCENARIO, trips }, { robustness });
  return { run, view: buildDecisionView(def, run.input, run.result, robustness) };
};

describe('scenario ⇄ URL (single parser, single serializer)', () => {
  it('defaults when empty; invalid fields fall back and are reported', () => {
    expect(parseScenarioFromSearchParams(new URLSearchParams()).scenario).toEqual(DEFAULT_SCENARIO);
    const r = parseScenarioFromSearchParams(new URLSearchParams('km=abc&trips=10&years=99&home=12.5'));
    expect(r.scenario).toEqual({ ...DEFAULT_SCENARIO, trips: 10 });
    expect(r.invalid.sort()).toEqual(['home', 'km', 'years']);
  });
  it('accepts Next searchParams records too', () => {
    expect(parseScenarioFromSearchParams({ km: '18000', trips: ['10', '2'] }).scenario).toMatchObject({ km: 18000, trips: 10 });
  });
  it('serialize is deterministic, ordered and omits defaults', () => {
    expect(serializeScenario(DEFAULT_SCENARIO)).toBe('');
    expect(serializeScenario({ ...DEFAULT_SCENARIO, performance: 3, km: 18000, trips: 10 })).toBe('?km=18000&trips=10&performance=3');
  });
  it('property: parse(serialize(s)) === s for every valid scenario', () => {
    const arb = fc.record(Object.fromEntries((Object.keys(DEFAULT_SCENARIO) as (keyof Scenario)[]).map((k) => {
      const lim = SCENARIO_LIMITS[k === 'cost' || k === 'space' || k === 'performance' ? 'priority' : k];
      return [k, fc.integer({ min: lim.min, max: lim.max })];
    })) as Record<keyof Scenario, fc.Arbitrary<number>>);
    fc.assert(fc.property(arb, (s) => {
      const q = serializeScenario(s);
      expect(parseScenarioFromSearchParams(new URLSearchParams(q)).scenario).toEqual(s);
      expect(serializeScenario(parseScenarioFromSearchParams(new URLSearchParams(q)).scenario)).toBe(q);
    }));
  });
  it('maps to the real engine contracts', () => {
    const { economicScenario, decisionScenario } = toEngineScenarios({ ...DEFAULT_SCENARIO, home: 0, cost: 3 });
    expect(economicScenario).toMatchObject({ annualKm: 15000, horizonYears: 5, energy: { homeChargingShare: 0 } });
    expect(decisionScenario.comparison).toMatchObject({ dailyDistanceKm: 35, longTripsPerYear: 1, homeChargingAvailable: false });
    expect(decisionScenario.priorities).toEqual({ COST: 'HIGH', SPACE: 'MEDIUM', PERFORMANCE: 'MEDIUM' });
  });
});

describe('real decision (no hardcoded UI expectations)', () => {
  it('1 long trip/year → PRACTICAL_TIE, no candidate marked', () => {
    const { run, view: v } = view(1);
    expect(run.result.alphaBestForYou.status).toBe('PRACTICAL_TIE');
    expect(v.status).toBe('PRACTICAL_TIE');
    expect(v.selected).toBeUndefined();
  });
  it('10 long trips/year → BYD SEAL selected (side A)', () => {
    const { run, view: v } = view(10);
    expect(run.result.alphaBestForYou.status).toBe('BEST_FOR_YOU');
    expect(run.result.alphaBestForYou.candidateId).toBe(VEHICLE_IDS.byd);
    expect(v.selected).toBe('a');
    expect(v.reasons.length).toBeGreaterThan(0);
    expect(v.reasons.length).toBeLessThanOrEqual(3);
  });
  it('+122 km preserved from the Comparison Engine, oriented from BYD', () => {
    for (const trips of [1, 10]) {
      const m = view(trips).view.keyMetrics.find((k) => k.metric === 'rng.electric_combined_km')!;
      expect([m.a?.min, m.b?.min, m.delta]).toEqual([570, 448, { min: 122, max: 122 }]);
      expect(m.leader).toBe('a');
      expect(m.meaningful).toBe('CLEAR');
    }
  });
  it('Meaningful For You changes with the scenario exactly as the engine says', () => {
    const forYou = (trips: number) => {
      const run = computeDecision(def, { ...DEFAULT_SCENARIO, trips }, { robustness: false });
      const engine = run.input.comparison.pairs[0]!.technicalComparisons.find((m) => m.metric === 'rng.electric_combined_km')!.meaningfulForYou?.level;
      const ui = buildDecisionView(def, run.input, run.result, false).keyMetrics.find((m) => m.metric === 'rng.electric_combined_km')!.forYou;
      expect(ui).toBe(engine);
      return ui;
    };
    expect(forYou(1)).toBe('SLIGHT');
    expect(forYou(10)).toBe('CLEAR');
  });
  it('confidence and robustness in the view are the engine values', () => {
    for (const trips of [1, 10]) {
      const { run, view: v } = view(trips, true);
      expect(v.confidence.level).toBe(run.result.recommendationConfidence.level);
      expect(v.confidence.reasons).toEqual(run.result.recommendationConfidence.reasons.slice(0, 3));
      expect(v.robustness?.messages).toEqual(run.result.resultRobustness.messages);
    }
  });
  it('dynamic chapters: never an empty chapter, details only with content', () => {
    for (const trips of [0, 1, 3, 10]) {
      const v = view(trips).view;
      const kinds = v.chapters.map((c) => c.kind);
      expect(kinds.slice(0, 2)).toEqual(['vs', 'result']);
      expect(kinds.at(-1)).toBe('details');
      expect(v.chapters.length).toBeGreaterThanOrEqual(6);
      expect(v.chapters.length).toBeLessThanOrEqual(9);
      if (kinds.includes('tradeoffs')) expect(v.tradeoffs.length + v.whyNot.reduce((n, w) => n + w.items.length, 0)).toBeGreaterThan(0);
      for (const c of v.metricsByCategory) expect(c.metrics.every((m) => m.a !== undefined || m.b !== undefined)).toBe(true);
    }
  });
  it('UNKNOWN values stay missing (never 0)', () => {
    const v = view(1).view;
    const power = v.metricsByCategory.flatMap((c) => c.metrics).find((m) => m.metric === 'perf.power_max_kw')!;
    expect(power.outcome).toBe('UNKNOWN');
    expect(power.a).toBeUndefined();
    expect(power.b?.min).toBe(239);
  });
  it('economic ranges preserved (no midpoint)', () => {
    const e = view(10).view.economics;
    expect(e.leader).toBe('b');
    expect(e.annualDelta).toEqual({ min: 2396, max: 12368 });
    expect(e.perSide.a.annual).toEqual({ min: 48372, max: 53746 });
  });
});

describe('server / client / worker consistency', () => {
  it('server initial view === client recompute + worker robustness (same scenario → same decision)', () => {
    for (const trips of [1, 10]) {
      const scenario = { ...DEFAULT_SCENARIO, trips };
      const server = serverDecisionView(def, scenario).view;
      const client = computeDecision(def, scenario, { robustness: false });
      const clientView = buildDecisionView(def, client.input, client.result, false);
      const worker = computeRobustness(def, scenario);
      const merged = withRobustness(clientView, worker);
      expect(merged).toEqual(server);
      expect(worker.scenarioHash).toBe(server.versions.scenarioHash);
    }
  });
  it('property: a serialized scenario yields the same decision after a URL roundtrip', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 20 }), fc.integer({ min: 5000, max: 40000 }), (trips, km) => {
        const s = { ...DEFAULT_SCENARIO, trips, km: Math.round(km / 500) * 500 };
        const back = parseScenarioFromSearchParams(new URLSearchParams(serializeScenario(s))).scenario;
        const a = computeDecision(def, s, { robustness: false }).result;
        const b = computeDecision(def, back, { robustness: false }).result;
        expect(b.scenarioHash).toBe(a.scenarioHash);
        expect(b.alphaBestForYou).toEqual(a.alphaBestForYou);
      }),
      { numRuns: 25 },
    );
  });
});
