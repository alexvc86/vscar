import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { UsedVehicleInstance } from '@vscar/vehicle-schema';
import { EMPTY_USED_FORM, factsToForm, parseWholeNumber, validateUsedForm } from '../src/domain/used-form.ts';
import {
  ALL_NEW,
  appendUsedSearch,
  joinQuery,
  parsePairConditions,
  serializePairConditions,
  swapPair,
  swapSearch,
  todayIn,
  usedSearchOf,
  withSide,
  type PairConditions,
  type UsedFacts,
} from '../src/domain/used-params.ts';
import { toUsedInstance, usedSubjectId } from '../src/domain/used-subject.ts';
import { parseScenarioFromSearchParams, serializeScenario, DEFAULT_SCENARIO, toEngineScenarios } from '../src/domain/scenario.ts';
import { swapLocaleInPath } from '../src/i18n/routes.ts';
import { LOCALES } from '../src/i18n/locales.ts';

/** Step 8b — contrato URL `u=1` de Nuevo/Usado y hechos de la unidad, y formulario. */
const TODAY = '2026-10-15';
const q = (s: string) => new URLSearchParams(s);
const GOLF_USED: UsedFacts = { price: 28_000, km: 84_000, reg: { year: 2019, month: 3 }, service: 'partial' };
const NEW_USED: PairConditions = { a: { condition: 'new' }, b: { condition: 'used', facts: GOLF_USED }, evaluationDate: TODAY };

describe('used URL contract (parse / serialize)', () => {
  it('all-new comparisons have no used block (7c URLs unchanged)', () => {
    expect(parsePairConditions(q(''), TODAY)).toEqual({ pair: ALL_NEW, invalid: [] });
    expect(serializePairConditions(ALL_NEW)).toBe('');
    expect(joinQuery('?km=18000', ALL_NEW)).toBe('?km=18000');
  });
  it('deterministic, ordered serialization; scenario first, used block separate', () => {
    expect(serializePairConditions(NEW_USED)).toBe('u=1&b=used&b_price=28000&b_km=84000&b_reg=2019-03&b_service=partial&eval=2026-10-15');
    expect(joinQuery('?km=18000&trips=10', NEW_USED)).toBe('?km=18000&trips=10&u=1&b=used&b_price=28000&b_km=84000&b_reg=2019-03&b_service=partial&eval=2026-10-15');
    // El escenario no lee el bloque usado y viceversa.
    const full = q(joinQuery('?km=18000', NEW_USED).slice(1));
    expect(parseScenarioFromSearchParams(full).scenario).toEqual({ ...DEFAULT_SCENARIO, km: 18000 });
    expect(parsePairConditions(full, TODAY).pair).toEqual(NEW_USED);
  });
  it('property: parse(serialize(p)) === p for valid pairs (new/new, new/used, used/new, used/used)', () => {
    const facts = fc.record(
      {
        price: fc.integer({ min: 100, max: 2_000_000 }),
        km: fc.integer({ min: 0, max: 1_500_000 }),
        reg: fc.record({ year: fc.integer({ min: 1990, max: 2025 }), month: fc.option(fc.integer({ min: 1, max: 12 }), { nil: undefined }) }).map((r) => (r.month ? r : { year: r.year })),
        warranty: fc.integer({ min: 0, max: 120 }),
        service: fc.constantFrom('full', 'partial', 'none'),
        state: fc.constantFrom('ok', 'issues'),
        soh: fc.integer({ min: 1, max: 100 }),
        damage: fc.constantFrom('none', 'declared'),
      },
      { requiredKeys: [] },
    ) as fc.Arbitrary<UsedFacts>;
    const side = fc.oneof(fc.constant({ condition: 'new' as const }), facts.map((f) => ({ condition: 'used' as const, facts: f })));
    fc.assert(
      fc.property(side, side, (a, b) => {
        const p: PairConditions = a.condition === 'used' || b.condition === 'used' ? { a, b, evaluationDate: TODAY } : { a, b };
        const s = serializePairConditions(p);
        expect(parsePairConditions(q(s), TODAY)).toEqual({ pair: p, invalid: [] });
        expect(serializePairConditions(parsePairConditions(q(s), TODAY).pair)).toBe(s);
      }),
    );
  });
  it('two different used instances are kept apart; facts never mix between sides', () => {
    const p: PairConditions = { a: { condition: 'used', facts: { price: 15_900, km: 84_000 } }, b: { condition: 'used', facts: { price: 21_000, km: 30_000 } }, evaluationDate: TODAY };
    const back = parsePairConditions(q(serializePairConditions(p)), TODAY).pair;
    expect(back).toEqual(p);
  });
  it('malformed values never throw: invalid fields are dropped and reported', () => {
    const r = parsePairConditions(q('u=1&b=used&b_price=28.5&b_km=-3&b_soh=140&b_reg=2030&b_service=great&b_state=ok&eval=2099-01-01'), TODAY);
    expect(r.pair).toEqual({ a: { condition: 'new' }, b: { condition: 'used', facts: { state: 'ok' } }, evaluationDate: TODAY });
    expect(r.invalid.sort()).toEqual(['b_km', 'b_price', 'b_reg', 'b_service', 'b_soh', 'eval'].sort());
  });
  it('limits: price, mileage, SOH, registration in the future (also month), impossible dates', () => {
    const one = (s: string) => parsePairConditions(q(`b=used&${s}&eval=${TODAY}`), TODAY);
    expect(one('b_price=99').invalid).toEqual(['b_price']);
    expect(one('b_price=2000001').invalid).toEqual(['b_price']);
    expect(one('b_km=1500001').invalid).toEqual(['b_km']);
    expect(one('b_km=0').pair.b).toEqual({ condition: 'used', facts: { km: 0 } }); // 0 real ≠ vacío
    expect(one('b_soh=0').invalid).toEqual(['b_soh']);
    expect(one('b_reg=2026-11').invalid).toEqual(['b_reg']);
    expect(one('b_reg=2026-10').invalid).toEqual([]);
    expect(one('b_reg=1989').invalid).toEqual(['b_reg']);
    expect(parsePairConditions(q('b=used&eval=2026-02-30'), TODAY).invalid).toEqual(['eval']);
  });
  it('facts of a side that is not used are ignored (and reported); unknown version ignores the block', () => {
    // Step D1.6: `a_price` en un lado NUEVO es ahora el precio de compra del usuario (contrato ampliado, ver d16.test.ts);
    // el resto de hechos de unidad usada siguen ignorándose en un lado nuevo.
    expect(parsePairConditions(q('a_km=20000&b=used&b_km=10'), TODAY)).toEqual({ pair: { a: { condition: 'new' }, b: { condition: 'used', facts: { km: 10 } }, evaluationDate: TODAY }, invalid: ['a_km'] });
    expect(parsePairConditions(q('a_price=20000&b=used&b_km=10'), TODAY).pair.a).toEqual({ condition: 'new', price: 20_000 });
    expect(parsePairConditions(q('u=9&b=used&b_km=10'), TODAY).pair).toEqual(ALL_NEW);
  });
  it('no personal or free-text keys exist in the contract', () => {
    const s = serializePairConditions({ a: { condition: 'used', facts: { price: 1000, km: 1, reg: { year: 2020 }, warranty: 1, service: 'full', state: 'ok', soh: 90, damage: 'none' } }, b: { condition: 'new' }, evaluationDate: TODAY });
    expect([...q(s).keys()].sort()).toEqual(['a', 'a_damage', 'a_km', 'a_price', 'a_reg', 'a_service', 'a_soh', 'a_state', 'a_warranty', 'eval', 'u'].sort());
    expect(s).not.toMatch(/vin|plate|matricula|owner|seller|phone|url|note/i);
  });
});

describe('swap, vehicle change, scenario change and language change', () => {
  it('swap moves condition and every fact with its vehicle', () => {
    expect(swapPair(NEW_USED)).toEqual({ a: NEW_USED.b, b: NEW_USED.a, evaluationDate: TODAY });
    const s = swapSearch(`?km=18000&${serializePairConditions(NEW_USED)}`, TODAY);
    expect(s).toBe('?km=18000&u=1&a=used&a_price=28000&a_km=84000&a_reg=2019-03&a_service=partial&eval=2026-10-15');
    expect(swapSearch(s, TODAY)).toBe(`?km=18000&${serializePairConditions(NEW_USED)}`);
  });
  it('changing a vehicle never carries the previous unit facts; the other side and eval stay', () => {
    const changed = withSide(NEW_USED, 'b', { condition: 'used', facts: {} }, '2027-01-01');
    expect(changed).toEqual({ a: { condition: 'new' }, b: { condition: 'used', facts: {} }, evaluationDate: TODAY });
    expect(withSide(NEW_USED, 'b', { condition: 'new' }, TODAY)).toEqual(ALL_NEW);
  });
  it('a scenario change keeps the used block untouched', () => {
    const current = `?km=18000&${serializePairConditions(NEW_USED)}`;
    expect(appendUsedSearch(serializeScenario({ ...DEFAULT_SCENARIO, trips: 10 }), current)).toBe(`?trips=10&${serializePairConditions(NEW_USED)}`);
    expect(appendUsedSearch('', '?km=18000')).toBe('');
    expect(usedSearchOf('?km=18000&trips=4')).toBe('');
  });
  it('switching language keeps cars, facts and scenario (same query)', () => {
    const search = `?trips=10&${serializePairConditions(NEW_USED)}`;
    const en = LOCALES.find((l) => l.segment === 'en-es')!;
    expect(swapLocaleInPath('/es-es/compare/a-vs-b', search, en)).toBe(`/en-es/compare/a-vs-b${search}`);
  });
});

describe('used subject identity and engine input', () => {
  const V = '00000000-0000-4000-8000-000000000001';
  it('deterministic UUID per (variant, facts); different units differ; salt separates identical units', () => {
    const id = usedSubjectId(V, GOLF_USED);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(usedSubjectId(V, { ...GOLF_USED })).toBe(id);
    expect(usedSubjectId(V, { ...GOLF_USED, km: 84_001 })).not.toBe(id);
    expect(usedSubjectId(V, GOLF_USED, 'b')).not.toBe(id);
    expect(id).not.toBe(V);
  });
  it('facts → UsedVehicleInstance without inventing anything', () => {
    const inst = UsedVehicleInstance.parse(toUsedInstance(GOLF_USED, V, usedSubjectId(V, GOLF_USED), TODAY));
    expect(inst).toMatchObject({ asking_price_minor: 2_800_000, currency: 'EUR', mileage_km: 84_000, registration_year: 2019, registration_month: 3, service_history: 'partial', observed_at: TODAY });
    expect(inst).toMatchObject({ warranty_remaining_months: 'unknown', battery_health_pct: 'unknown', condition: 'unknown', accident_history: 'unknown', inspection_status: 'unknown' });
    expect(UsedVehicleInstance.parse(toUsedInstance({ state: 'ok', damage: 'declared', warranty: 0 }, V, V.replace('1', '2'), TODAY))).toMatchObject({ condition: 'good', accident_history: 'declared', warranty_remaining_months: 0 });
  });
  it('used requirements map onto the existing deal breakers (only when present)', () => {
    expect(toEngineScenarios(DEFAULT_SCENARIO).decisionScenario.comparison).not.toHaveProperty('requirements');
    const s = parseScenarioFromSearchParams(q('maxkm=100000&maxage=8&minsoh=80&minwarranty=6&fullhistory=1')).scenario;
    expect(toEngineScenarios(s).decisionScenario.comparison?.requirements).toEqual({ maxMileageKm: 100_000, maxAgeYears: 8, minBatteryHealthPct: 80, minWarrantyRemainingMonths: 6, mustHaveFullServiceHistory: true });
    expect(serializeScenario(s)).toBe('?maxkm=100000&maxage=8&minsoh=80&minwarranty=6&fullhistory=1');
    expect(parseScenarioFromSearchParams(q('maxkm=-5&fullhistory=2')).invalid).toEqual(['maxkm', 'fullhistory']);
  });
  it('today comes from the market time zone (callers only; the domain never reads the clock)', () => {
    expect(todayIn('Europe/Madrid', new Date('2026-10-14T22:30:00Z'))).toBe('2026-10-15');
  });
});

describe('used form (two levels, everything optional, unknown ≠ 0)', () => {
  it('an empty form is a valid used unit with no facts', () => {
    expect(validateUsedForm(EMPTY_USED_FORM, TODAY, true)).toEqual({ ok: true, facts: {} });
  });
  it('accepts thousands separators, never decimals; validates ranges with field-bound errors', () => {
    expect(parseWholeNumber('28.000')).toBe(28_000);
    expect(parseWholeNumber('84 000')).toBe(84_000);
    expect(parseWholeNumber('28,5')).toBe('invalid');
    const r = validateUsedForm({ ...EMPTY_USED_FORM, price: '50', km: 'abc', regYear: '2026', regMonth: '12', warrantyUnknown: false, warranty: '200' }, TODAY, true);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.map((e) => [e.field, e.code])).toEqual([['price', 'price'], ['km', 'integer'], ['regMonth', 'regFuture'], ['warranty', 'warranty']]);
  });
  it('SOH only when it applies; "I don\'t know" stays unknown (never a default 100 %)', () => {
    const v = { ...EMPTY_USED_FORM, soh: '87', sohUnknown: false };
    expect(validateUsedForm(v, TODAY, true)).toEqual({ ok: true, facts: { soh: 87 } });
    expect(validateUsedForm(v, TODAY, false)).toEqual({ ok: true, facts: {} });
    expect(validateUsedForm({ ...EMPTY_USED_FORM, soh: '87' }, TODAY, true)).toEqual({ ok: true, facts: {} });
  });
  it('round trip facts ↔ form (editing the same unit keeps everything)', () => {
    const f: UsedFacts = { price: 15_900, km: 84_000, reg: { year: 2019 }, warranty: 0, service: 'none', state: 'issues', soh: 90, damage: 'none' };
    expect(validateUsedForm(factsToForm(f), TODAY, true)).toEqual({ ok: true, facts: f });
  });
});
