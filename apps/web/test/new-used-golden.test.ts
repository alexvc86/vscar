import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';
import en from '../messages/en.json';
import es from '../messages/es.json';
import { pairSlug } from '../src/domain/catalog.ts';
import type { ComparisonData } from '../src/domain/comparison-data.ts';
import { computeDecision } from '../src/domain/decision.ts';
import { DEFAULT_SCENARIO, parseScenarioFromSearchParams, type Scenario } from '../src/domain/scenario.ts';
import { swapPair, type PairConditions, type UsedFacts } from '../src/domain/used-params.ts';
import { withDisplayNames, type DecisionView } from '../src/domain/view-model.ts';
import { translateDecisionMessage, type Translator } from '../src/i18n/engine-messages.ts';
import { createFormat } from '../src/i18n/format.ts';
import { MARKETS, parseLocaleSegment } from '../src/i18n/locales.ts';
import { participantNames } from '../src/i18n/use-i18n.ts';
import { serverDecisionView } from '../src/server/server-decision.ts';
import { comparisonData, memoryCatalog } from './support/catalog.ts';

/**
 * Step 8c — escenarios de negocio NEW/USED (G01–G15). Se comprueban los resultados lógicos Y lo que lee la persona
 * (mensajes del engine traducidos con los alias de presentación). Datos: catálogo de validación (Golf nuevo = 38.850 €).
 */
const GOLF = 'volkswagen-golf-style-1-5-etsi-150-dsg';
const BYD = 'byd-seal-2026-design-rwd-82-5-kwh';
const M3 = 'tesla-model-3-2021-standard-range-plus-e6r';
const X3 = 'bmw-x3-2018-xdrive20d';
const EVAL = '2026-10-15';
const used = (facts: UsedFacts): PairConditions['b'] => ({ condition: 'used', facts });
const NEW = { condition: 'new' } as const;
const pair = (a: PairConditions['a'], b: PairConditions['b'], evaluationDate = EVAL): PairConditions => ({ a, b, evaluationDate });
const scenarioOf = (q = '') => parseScenarioFromSearchParams(new URLSearchParams(q)).scenario;
async function view(slug: string, conditions: PairConditions, scenario: Scenario = DEFAULT_SCENARIO): Promise<{ data: ComparisonData; view: DecisionView }> {
  const data = await comparisonData(slug, memoryCatalog(), conditions);
  return { data, view: serverDecisionView(data, scenario).view };
}
const tr = (seg: string): Translator => createTranslator({ locale: seg, messages: seg.startsWith('es') ? es : en }) as unknown as Translator;
const fmt = (seg: string) => createFormat(parseLocaleSegment(seg)!.formatLocale, MARKETS.ES, { yes: 'yes', no: 'no' });
/** Texto que verá la persona para un mensaje del engine (con los nombres de presentación de la vista). */
const say = (v: DecisionView, seg: string, msg: Parameters<typeof translateDecisionMessage>[0]) => translateDecisionMessage(msg, tr(seg), fmt(seg), { aliases: participantNames(v, tr(seg)) });
const techOf = (v: DecisionView, side: 'a' | 'b') => v.technical[side];

const G01_FACTS: UsedFacts = { price: 28_000, km: 84_000, reg: { year: 2019 }, service: 'partial' };
const GOLF_PAIR = pairSlug(GOLF, GOLF);

describe('G01 — same Golf, NEW vs USED', async () => {
  const { view: v } = await view(GOLF_PAIR, pair(NEW, used(G01_FACTS)));
  it('same technical capability and running cost; only the purchase differs', () => {
    expect(v.sameVariant).toBe(true);
    expect(techOf(v, 'a')).toEqual(techOf(v, 'b'));
    expect(v.economics.perSide.a.annual).toEqual(v.economics.perSide.b.annual);
    expect(v.economics.perSide.a.purchase).toEqual({ amount: 3_885_000, source: 'LIST', basis: 'KNOWN' });
    expect(v.economics.perSide.b.purchase).toEqual({ amount: 2_800_000, source: 'USED_ASKING', basis: 'USER_PROVIDED' });
    const own = (s: 'a' | 'b') => v.economics.perSide[s].ownership!.total.min;
    expect(own('a') - own('b')).toBe(1_085_000);
    expect(v.economics.perSide.b.ownership!.included).toEqual(['PURCHASE', 'FUEL']);
  });
  it('the lower price does NOT make the used car the economic winner; no fabricated break-even', () => {
    expect(v.economics.status).toBe('PRACTICAL_TIE');
    expect(v.economics.leader).toBeUndefined();
    expect(v.economics.breakEven).toMatchObject({ status: 'NO_BREAK_EVEN', premium: 'a', extraPurchase: { min: 1_085_000, max: 1_085_000 } });
    expect(v.status).toBe('PRACTICAL_TIE');
  });
  it('participants are named by condition (never "Golf A / Golf B" for the reader)', () => {
    expect(participantNames(v, tr('es-es'))).toEqual({ 'Volkswagen Golf A': 'Volkswagen Golf nuevo', 'Volkswagen Golf B': 'Volkswagen Golf usado' });
    expect(participantNames(v, tr('en-es'))).toEqual({ 'Volkswagen Golf A': 'Volkswagen Golf (new)', 'Volkswagen Golf B': 'Volkswagen Golf (used)' });
    const all = [v.explanation, ...v.whyNot.flatMap((w) => w.items), ...v.confidence.reasons, ...v.verify];
    for (const seg of ['es-es', 'en-es']) for (const m of all) expect(say(v, seg, m).text).not.toMatch(/Golf [AB]\b/);
    expect(withDisplayNames(v, participantNames(v, tr('es-es'))).candidates.map((c) => c.name)).toEqual(['Volkswagen Golf nuevo', 'Volkswagen Golf usado']);
  });
  it('information about the unit is separate from recommendation confidence', () => {
    expect(v.used?.b?.information.level).toBe('MEDIUM');
    expect(v.usedInformationConfidence).toBe('MEDIUM');
    expect(v.confidence.level).toBe('LOW');
    expect(say(v, 'es-es', v.used!.b!.information.summary).text).toMatch(/^Información sobre la unidad: media/);
  });
  it('unknown ≠ bad: information gaps never appear as tradeoffs; known attention facts do', () => {
    const items = v.whyNot.find((w) => w.side === 'b')!.items;
    expect(items.map((i) => i.type)).not.toContain('USED_INFORMATION');
    expect(items.map((i) => i.messageKey)).toEqual(expect.arrayContaining(['used.ownership.service_history_incomplete']));
    expect(v.whyNot.find((w) => w.side === 'b')!.onlyMinor).toBe(false);
  });
});

describe('G02 — two used Golfs with different facts', () => {
  it('independent identities and signals', async () => {
    const { data, view: v } = await view(GOLF_PAIR, { a: used({ price: 21_000, km: 30_000, reg: { year: 2022, month: 3 }, warranty: 6, service: 'full' }), b: used({ price: 15_900, km: 160_000, reg: { year: 2020 } }), evaluationDate: EVAL });
    expect(data.vehicles[0].subjectId).not.toBe(data.vehicles[1].subjectId);
    expect(v.used?.a?.signals.attention.map((m) => m.messageKey)).toEqual(['used.ownership.limited_warranty']);
    expect(v.used?.b?.signals.attention.map((m) => m.messageKey)).toContain('used.ownership.high_mileage_for_age');
    expect(participantNames(v, tr('es-es'))).toEqual({ 'Volkswagen Golf A': 'Volkswagen Golf usado A', 'Volkswagen Golf B': 'Volkswagen Golf usado B' });
  });
});

describe('G03/G04 — used BEV: SOH unknown vs known, never range degradation', async () => {
  const base = await view(pairSlug(BYD, M3), { a: NEW, b: NEW });
  const unknown = await view(pairSlug(BYD, M3), pair(NEW, used({ price: 24_500, km: 62_000, reg: { year: 2021, month: 6 } })));
  const known = await view(pairSlug(BYD, M3), pair(NEW, used({ price: 24_500, km: 62_000, reg: { year: 2021, month: 6 }, soh: 91 })));
  const range = (v: DecisionView) => v.metricsByCategory.flatMap((c) => c.metrics).find((m) => m.metric === 'rng.electric_combined_km');
  it('the WLTP range is the reference range in every case', () => {
    expect(range(unknown.view)).toEqual(range(base.view));
    expect(range(known.view)).toEqual(range(base.view));
  });
  it('unknown SOH → information gap + verification + capped information (never a defect)', () => {
    expect(unknown.view.used?.b?.signals.gaps.map((m) => m.messageKey)).toContain('used.ownership.battery_health_unknown');
    expect(unknown.view.used?.b?.signals.attention.map((m) => m.messageKey)).not.toContain('used.ownership.battery_health_low');
    expect(unknown.view.used?.b?.verification.map((m) => m.messageKey)).toContain('used.verification.check_battery_health');
  });
  it('known SOH 91 % → declared note only', () => {
    expect(known.view.used?.b?.signals.notes.map((m) => m.messageKey)).toEqual(['used.ownership.battery_health_reported']);
  });
});

describe('G05–G07 — requirements: FAIL, UNCONFIRMED, NO_FULL_MATCH; problems without a deal breaker are signals only', () => {
  it('G05 known mileage above the maximum → FAIL; the other car is the only full match', async () => {
    const { view: v } = await view(pairSlug(BYD, M3), pair(NEW, used({ price: 24_500, km: 62_000, soh: 91 })), scenarioOf('maxkm=50000'));
    expect(v.practical.b.status).toBe('FAIL');
    expect(v.practical.a.status).toBe('PASS');
    expect(v).toMatchObject({ status: 'BEST_FOR_YOU', selected: 'a' });
  });
  it('G06 unknown mandatory evidence → UNCONFIRMED (not FAIL, not PASS)', async () => {
    const { view: v } = await view(pairSlug(BYD, M3), pair(NEW, used({ price: 24_500 })), scenarioOf('maxkm=50000'));
    expect(v.practical.b.status).toBe('UNCONFIRMED');
    expect(v.verifyBySide.filter((x) => x.side === 'b').map((x) => x.messageKey)).toContain('decision.verify.requirement');
  });
  it('G07 both fail → NO_FULL_MATCH; the closest option is informational only', async () => {
    const { view: v } = await view(pairSlug(GOLF, X3), { a: used({ price: 20_000, km: 90_000 }), b: used({ price: 19_000, km: 210_000 }), evaluationDate: EVAL }, scenarioOf('maxkm=50000'));
    expect(v.status).toBe('NO_FULL_MATCH');
    expect(v.selected).toBeUndefined();
    expect(v.closest).toBe('a');
  });
  it('declared issues without a deal breaker → attention signal, never an invented FAIL', async () => {
    const { view: v } = await view(GOLF_PAIR, pair(NEW, used({ price: 25_000, state: 'issues', damage: 'declared' })));
    expect(v.practical.b.status).toBe('PASS');
    expect(v.used?.b?.signals.attention.map((m) => m.messageKey)).toEqual(expect.arrayContaining(['used.ownership.condition_issues_declared', 'used.ownership.accident_damage_declared']));
  });
  it('the five used requirements never apply to the NEW car', async () => {
    const { view: v } = await view(GOLF_PAIR, pair(NEW, used({ price: 28_000 })), scenarioOf('maxkm=1000&maxage=1&minsoh=99&minwarranty=100&fullhistory=1'));
    expect(v.practical.a.status).toBe('PASS');
    expect(v.practical.b.status).not.toBe('PASS');
  });
});

describe('G08 — price missing: known cost incomplete, never zero', () => {
  it('no purchase, no known cost, no break-even, no difference', async () => {
    const { view: v } = await view(GOLF_PAIR, pair(NEW, used({ km: 84_000 })));
    expect(v.economics.perSide.b.purchase).toBeUndefined();
    expect(v.economics.breakEven).toBeUndefined();
    expect(v.economics.perSide.b.annual).toEqual(v.economics.perSide.a.annual);
    expect(v.used?.b?.purchase.messageKey).toBe('used.economic.asking_price_missing');
  });
});

describe('G09 — NEDC vs WLTP: never forced', () => {
  it('economics NOT_COMPARABLE; break-even unavailable', async () => {
    const { view: v } = await view(pairSlug(X3, GOLF), pair(used({ price: 18_900, km: 210_000, reg: { year: 2018, month: 5 } }), NEW));
    expect(v.economics.status).toBe('NOT_COMPARABLE');
    expect(v.economics.breakEven?.status).toBe('UNAVAILABLE');
    expect(v.economics.leader).toBeUndefined();
  });
});

describe('G10 — same pair, different horizon', () => {
  it('known costs follow the horizon; the purchase does not', async () => {
    const c = pair(NEW, used(G01_FACTS));
    const three = (await view(GOLF_PAIR, c, scenarioOf('years=3'))).view;
    const eight = (await view(GOLF_PAIR, c, scenarioOf('years=8'))).view;
    expect(three.economics.perSide.b.purchase).toEqual(eight.economics.perSide.b.purchase);
    expect(eight.economics.perSide.b.ownership!.total.min).toBeGreaterThan(three.economics.perSide.b.ownership!.total.min);
    expect(eight.economics.horizonYears).toBe(8);
    expect(eight.robustness).toBeDefined();
  });
});

describe('G11 — swap: logically equivalent from the other side', () => {
  it('mirrored result, facts follow their car', async () => {
    const c = pair(NEW, used({ price: 24_500, km: 62_000, soh: 91 }));
    const ab = (await view(pairSlug(BYD, M3), c, scenarioOf('trips=10'))).view;
    const ba = (await view(pairSlug(M3, BYD), swapPair(c), scenarioOf('trips=10'))).view;
    const flip = (s?: string) => (s === 'a' ? 'b' : s === 'b' ? 'a' : undefined);
    expect(ba.status).toBe(ab.status);
    expect(ba.selected).toBe(flip(ab.selected));
    expect(ba.economics.perSide.a).toEqual(ab.economics.perSide.b);
    expect(ba.used?.a?.facts).toEqual(ab.used?.b?.facts);
  });
});

describe('G12/G13 — evaluation date: shared links reproduce the age; updating recalculates', () => {
  it('the same URL evaluates at its own date, whatever the day it is opened', async () => {
    const c = pair(NEW, used({ price: 25_000, reg: { year: 2023, month: 6 } }), '2026-10-15');
    const first = (await view(GOLF_PAIR, c)).view.used!.b!;
    const again = (await view(GOLF_PAIR, c)).view.used!.b!;
    expect(again.ageMonths).toEqual(first.ageMonths);
    expect(first.ageMonths).toEqual({ min: 39, max: 40 });
  });
  it('updating the evaluation date changes age-dependent facts only (declared facts untouched)', async () => {
    const before = (await view(GOLF_PAIR, pair(NEW, used({ price: 25_000, reg: { year: 2023, month: 6 } }), '2026-10-15'))).view.used!.b!;
    const after = (await view(GOLF_PAIR, pair(NEW, used({ price: 25_000, reg: { year: 2023, month: 6 } }), '2027-10-15'))).view.used!.b!;
    expect(after.ageMonths).toEqual({ min: 51, max: 52 });
    expect(after.facts).toEqual(before.facts);
    // Garantía original 3 años: calculada > 0 en 2026 (sin confirmar), vencida en 2027.
    expect(before.warranty).toMatchObject({ state: 'KNOWN', basis: 'CALCULATED' });
    expect(after.warranty).toMatchObject({ state: 'KNOWN', basis: 'CALCULATED', months: { min: 0, max: 0 } });
    expect(after.signals.attention.map((m) => m.messageKey)).toContain('used.ownership.no_remaining_warranty');
  });
});

describe('G14/G15 — new/new unchanged and locale parity', () => {
  it('new/new has no used block and the engine result equals the plain pipeline result', async () => {
    const data = await comparisonData(pairSlug(BYD, M3), memoryCatalog());
    const v = serverDecisionView(data, DEFAULT_SCENARIO).view;
    expect(v.used).toBeUndefined();
    expect(v.sameVariant).toBe(false);
    expect(computeDecision(data, DEFAULT_SCENARIO, { robustness: false }).result).not.toHaveProperty('usedAdjustments');
  });
  it('the view is language-neutral: ES and EN render the same logical result from the catalog', async () => {
    const { view: v } = await view(GOLF_PAIR, pair(NEW, used(G01_FACTS)));
    const msgs = [v.explanation, ...v.used!.b!.information.reasons, ...v.used!.b!.signals.attention, ...v.used!.b!.verification, v.used!.b!.purchase];
    for (const seg of ['es-es', 'en-es']) for (const m of msgs) expect(say(v, seg, m).fromCatalog).toBe(true);
  });
});
