import { describe, expect, it } from 'vitest';
import { pairSlug } from '../src/domain/catalog.ts';
import type { ComparisonData } from '../src/domain/comparison-data.ts';
import { computeDecision, computeRobustness } from '../src/domain/decision.ts';
import { DEFAULT_SCENARIO, parseScenarioFromSearchParams } from '../src/domain/scenario.ts';
import { ALL_NEW, swapPair, type PairConditions } from '../src/domain/used-params.ts';
import { buildDecisionView, withRobustness } from '../src/domain/view-model.ts';
import { loadComparisonData } from '../src/server/comparison-loader.ts';
import { serverDecisionView } from '../src/server/server-decision.ts';
import { comparisonData, memoryCatalog } from './support/catalog.ts';

/**
 * Step 8b — comparaciones Nuevo/Usado de punta a punta (catálogo en memoria, mismo contrato que MySQL):
 * loader → ComparisonData → createDecisionPipeline (un solo camino) → vista. Servidor y cliente coinciden.
 */
const GOLF = 'volkswagen-golf-style-1-5-etsi-150-dsg';
const BYD = 'byd-seal-2026-design-rwd-82-5-kwh';
const M3 = 'tesla-model-3-2021-standard-range-plus-e6r';
const X3 = 'bmw-x3-2018-xdrive20d';
const EVAL = '2026-10-15';
const usedGolf: PairConditions['b'] = { condition: 'used', facts: { price: 28_000, km: 84_000, reg: { year: 2019, month: 3 }, service: 'partial' } };
const NEW_USED: PairConditions = { a: { condition: 'new' }, b: usedGolf, evaluationDate: EVAL };
const scenario = DEFAULT_SCENARIO;

const tech = (data: ComparisonData, side: 'a' | 'b') => {
  const run = computeDecision(data, scenario, { robustness: false });
  const id = data.vehicles[side === 'a' ? 0 : 1].subjectId;
  const { candidateId: _c, ...rest } = run.result.technicalCapability.find((t) => t.candidateId === id)!;
  return rest;
};

describe('same ReferenceVariant: Golf NEW vs Golf USED', () => {
  it('new vs new of the same variant is still not a comparison (404)', async () => {
    expect(await loadComparisonData('ES', pairSlug(GOLF, GOLF), memoryCatalog())).toEqual({ kind: 'not-found', reason: 'SAME_VEHICLE' });
  });
  it('two participants with their own identity over one ReferenceVariant', async () => {
    const data = await comparisonData(pairSlug(GOLF, GOLF), memoryCatalog(), NEW_USED);
    const [a, b] = data.vehicles;
    expect(a.option.id).toBe(b.option.id);
    expect(a.subjectId).toBe(a.option.id);
    expect(b.subjectId).not.toBe(a.subjectId);
    expect([a.condition, b.condition]).toEqual(['new', 'used']);
    expect([a.label, b.label]).toEqual(['Volkswagen Golf A', 'Volkswagen Golf B']);
    expect(data.evaluationDate).toBe(EVAL);
    expect(b.pipeline.usedInstance).toMatchObject({ asking_price_minor: 2_800_000, mileage_km: 84_000, registration_year: 2019, registration_month: 3, service_history: 'partial' });
    expect(a.pipeline.usedInstance).toBeUndefined();
  });
  it('same technical capability; the purchase uses the asking price; no fake market value or degradation', async () => {
    const data = await comparisonData(pairSlug(GOLF, GOLF), memoryCatalog(), NEW_USED);
    expect(tech(data, 'a')).toEqual(tech(data, 'b'));
    const run = computeDecision(data, scenario, { robustness: false });
    const view = buildDecisionView(data, run.input, run.result, false);
    expect(view.candidates.map((c) => c.condition)).toEqual(['new', 'used']);
    expect(view.economics.perSide.b.purchase).toEqual({ amount: 2_800_000, source: 'USED_ASKING', basis: 'USER_PROVIDED' });
    expect(view.economics.perSide.a.annual).toEqual(view.economics.perSide.b.annual);
    expect(view.used?.b?.information.level).toBeDefined();
    expect(view.used?.a).toBeUndefined();
    expect(JSON.stringify(view.used)).not.toMatch(/marketValue|fairPrice|probabilit|estimatedRange|repairCost/i);
    // Capítulo de la unidad usada + económico (compra y coste conocido).
    expect(view.chapters.map((c) => c.kind)).toEqual(expect.arrayContaining(['economics', 'used']));
  });
  it('server initial view === client recompute from SERIALIZED data + worker robustness (used facts included)', async () => {
    const server = await comparisonData(pairSlug(GOLF, GOLF), memoryCatalog(), NEW_USED);
    const client: ComparisonData = JSON.parse(JSON.stringify(server));
    for (const trips of [1, 10]) {
      const s = { ...DEFAULT_SCENARIO, trips };
      const initial = serverDecisionView(server, s).view;
      const run = computeDecision(client, s, { robustness: false });
      expect(withRobustness(buildDecisionView(client, run.input, run.result, false), computeRobustness(client, s))).toEqual(initial);
    }
  });
});

describe('the four comparison types', () => {
  const types: [string, PairConditions][] = [
    ['new/new', ALL_NEW],
    ['new/used', { a: { condition: 'new' }, b: { condition: 'used', facts: { price: 19_000, km: 62_000, reg: { year: 2021 }, soh: 91 } }, evaluationDate: EVAL }],
    ['used/new', { a: { condition: 'used', facts: { price: 35_000, km: 5_000, reg: { year: 2026, month: 5 } } }, b: { condition: 'new' }, evaluationDate: EVAL }],
    ['used/used', { a: { condition: 'used', facts: { price: 33_000, km: 9_000 } }, b: { condition: 'used', facts: { price: 18_500, km: 70_000, soh: 88, service: 'full' } }, evaluationDate: EVAL }],
  ];
  for (const [name, conditions] of types) {
    it(`${name}: loads, decides through the single pipeline and keeps the technical facts of the reference`, async () => {
      const data = await comparisonData(pairSlug(BYD, M3), memoryCatalog(), conditions);
      const base = await comparisonData(pairSlug(BYD, M3), memoryCatalog());
      expect(tech(data, 'a')).toEqual(tech(base, 'a'));
      expect(tech(data, 'b')).toEqual(tech(base, 'b'));
      const run = computeDecision(data, scenario, { robustness: true });
      const used = data.vehicles.filter((v) => v.condition === 'used').map((v) => v.subjectId).sort();
      expect(Object.keys(run.result.usedAdjustments ?? {}).sort()).toEqual(used);
      if (!used.length) expect(run.result).not.toHaveProperty('usedAdjustments');
    });
  }
  it('new/new is byte-identical to the 7c path (no used block, no extra fields)', async () => {
    const a = await comparisonData(pairSlug(BYD, M3), memoryCatalog());
    const view = serverDecisionView(a, scenario).view;
    expect(view).not.toHaveProperty('used');
    expect(view.chapters.map((c) => c.kind)).not.toContain('used');
  });
});

describe('swap: facts follow their vehicle and the decision is the mirrored one', () => {
  it('A NEW / B USED → A USED / B NEW', async () => {
    const conditions: PairConditions = { a: { condition: 'new' }, b: { condition: 'used', facts: { price: 19_000, km: 62_000, reg: { year: 2021 }, soh: 91 } }, evaluationDate: EVAL };
    const ab = await comparisonData(pairSlug(BYD, M3), memoryCatalog(), conditions);
    const ba = await comparisonData(pairSlug(M3, BYD), memoryCatalog(), swapPair(conditions));
    expect(ba.vehicles[0].used).toEqual(ab.vehicles[1].used);
    expect(ba.vehicles[0].subjectId).toBe(ab.vehicles[1].subjectId);
    expect(ba.vehicles[0].pipeline.usedInstance).toEqual(ab.vehicles[1].pipeline.usedInstance);
    for (const trips of [1, 10]) {
      const s = { ...DEFAULT_SCENARIO, trips };
      const x = serverDecisionView(ab, s).view;
      const y = serverDecisionView(ba, s).view;
      expect(y.status).toBe(x.status);
      const flip = (side?: string) => (side === 'a' ? 'b' : side === 'b' ? 'a' : undefined);
      expect(y.selected).toBe(flip(x.selected));
      expect(y.used?.a).toEqual({ ...x.used?.b, side: 'a' });
      expect(y.confidence.level).toBe(x.confidence.level);
    }
  });
});

describe('powertrain-aware facts and used requirements', () => {
  it('SOH on an ICE is ignored and reported (never penalizes)', async () => {
    const data = await comparisonData(pairSlug(X3, GOLF), memoryCatalog(), { a: { condition: 'used', facts: { price: 18_900, km: 210_000, soh: 80 } }, b: { condition: 'new' }, evaluationDate: EVAL });
    expect(data.vehicles[0].used).toEqual({ price: 18_900, km: 210_000 });
    expect(data.vehicles[0].ignored).toEqual(['a_soh']);
    expect(data.vehicles[0].pipeline.usedInstance?.battery_health_pct).toBeUndefined();
  });
  it('full service history: partial → FAIL; unknown → UNCONFIRMED; never on the new car', async () => {
    const req = parseScenarioFromSearchParams(new URLSearchParams('fullhistory=1&maxkm=100000')).scenario;
    const data = await comparisonData(pairSlug(GOLF, GOLF), memoryCatalog(), NEW_USED);
    const view = serverDecisionView(data, req).view;
    expect(view.practical.b.status).toBe('FAIL');
    expect(view.practical.a.status).toBe('PASS');
    expect(view.selected).toBe('a');
    const unknown = await comparisonData(pairSlug(GOLF, GOLF), memoryCatalog(), { ...NEW_USED, b: { condition: 'used', facts: { price: 28_000 } } });
    expect(serverDecisionView(unknown, req).view.practical.b.status).toBe('UNCONFIRMED');
  });
  it('identical facts on two used units of the same variant are still two participants', async () => {
    const same: PairConditions = { a: { condition: 'used', facts: { price: 20_000 } }, b: { condition: 'used', facts: { price: 20_000 } }, evaluationDate: EVAL };
    const data = await comparisonData(pairSlug(GOLF, GOLF), memoryCatalog(), same);
    expect(data.vehicles[0].subjectId).not.toBe(data.vehicles[1].subjectId);
    expect(serverDecisionView(data, scenario).view.status).toBe('PRACTICAL_TIE');
  });
  it('PREVIEW/PUBLIC gates are unchanged: used facts never make a blocked variant selectable', async () => {
    expect(await loadComparisonData('ES', pairSlug(GOLF, GOLF), memoryCatalog('PUBLIC'), NEW_USED)).toEqual({ kind: 'not-found', reason: 'UNKNOWN_VEHICLE' });
  });
});
