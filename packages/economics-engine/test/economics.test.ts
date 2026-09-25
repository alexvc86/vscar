import { describe, expect, it } from 'vitest';
import { ECONOMICS_RULES, METHODOLOGY_VERSION } from '@vscar/methodology';
import { breakEven, computeEconomics, economicDelta, economicSensitivity, toMinor } from '../src/index.ts';
import { bev, ctx, ice, phev, uuid, warnCodes } from './helpers.ts';

const S = { annualKm: 18_000, horizonYears: 5 };

describe('energy cost — ICE / HEV', () => {
  it('1. ICE: €/100 km = L/100 km × €/L (6.1 × 1.65 = 10.065)', () => {
    const r = computeEconomics(ice(6.1), ctx({ petrol: 1.65 }), S);
    expect(r.energy).toMatchObject({ status: 'AVAILABLE', costPer100km: { min: 10.065, max: 10.065 }, litresPerYear: { min: 1098, max: 1098 } });
    expect(r.runningCost.annual_minor).toEqual({ min: 181170, max: 181170 });
  });

  it('2. HEV and MHEV use the same energy logic as ICE', () => {
    const base = computeEconomics(ice(4.8), ctx({ petrol: 1.65 }), S);
    for (const powertrainType of ['HEV', 'MHEV'] as const) {
      const r = computeEconomics(ice(4.8, { powertrainType }), ctx({ petrol: 1.65 }), S);
      expect(r.energy).toEqual(base.energy);
    }
  });

  it('diesel vehicles use the diesel reference, not petrol', () => {
    const r = computeEconomics(ice(5, { fuelType: 'diesel' }), ctx({ petrol: 1.65, diesel: 1.5 }), S);
    expect(r.provenance.energyPrices[0]).toMatchObject({ product: 'DIESEL_A', value: 1.5, origin: 'MARKET_REFERENCE' });
  });
});

describe('energy cost — BEV and PHEV', () => {
  it('3. BEV: kWh/100 km ÷ charging efficiency × €/kWh (efficiency = methodology, ESTIMATED)', () => {
    const r = computeEconomics(bev(18, 'EXCLUDED'), ctx({ electricity: 0.2 }), S);
    expect(ECONOMICS_RULES.charging_efficiency.default).toBe(0.9);
    expect(r.energy.costPer100km).toEqual({ min: 4, max: 4 }); // 18 / 0.9 × 0.20
    expect(r.energy.kwhPerYear).toEqual({ min: 3600, max: 3600 });
    expect(r.assumptions).toContainEqual({ key: 'charging_efficiency', value: 0.9, status: 'ESTIMATED' });
    expect(r.breakdown.find((l) => l.component === 'ELECTRICITY')!.basis).toBe('ESTIMATED');
    expect(warnCodes(r)).toContain('CHARGING_EFFICIENCY_ESTIMATED');
  });

  it('BEV: losses already included → efficiency not applied twice; unspecified → range, never a silent choice', () => {
    expect(computeEconomics(bev(18, 'INCLUDED'), ctx({ electricity: 0.2 }), S).energy.costPer100km).toEqual({ min: 3.6, max: 3.6 });
    const u = computeEconomics(bev(18, 'UNSPECIFIED'), ctx({ electricity: 0.2 }), S);
    expect(u.energy.costPer100km).toEqual({ min: 3.6, max: 4 });
    expect(warnCodes(u)).toContain('CHARGING_LOSS_BASIS_UNSPECIFIED');
    const user = computeEconomics(bev(18, 'EXCLUDED'), ctx({ electricity: 0.2 }), { ...S, chargingEfficiency: 0.8 });
    expect(user.energy.costPer100km).toEqual({ min: 4.5, max: 4.5 });
    expect(user.assumptions).toContainEqual({ key: 'charging_efficiency', value: 0.8, status: 'USER_PROVIDED' });
  });

  it('4. PHEV blended: electric km × electric rate + combustion km × charge-sustaining rate', () => {
    const r = computeEconomics(phev(), ctx({ petrol: 1.6, electricity: 0.18 }), { ...S, phevElectricShare: 0.6 });
    // eléctrico: 16/0.9×0.18 = 3.2 €/100 km × 0.6 = 1.92 · combustión: 5.0 × 1.6 = 8 €/100 km × 0.4 = 3.2
    expect(r.energy.costPer100km).toEqual({ min: 5.12, max: 5.12 });
    expect(r.energy.litresPerYear).toEqual({ min: 360, max: 360 });
    expect(r.energy.kwhPerYear).toEqual({ min: 1920, max: 1920 }); // 18 000 × 0.6 / 100 × 16 / 0.9
    expect(r.breakdown.filter((l) => l.timing === 'ANNUAL').map((l) => [l.component, l.amount_minor.min])).toEqual([
      ['ELECTRICITY', 34560],
      ['FUEL', 57600],
    ]);
    expect(r.assumptions).toContainEqual({ key: 'phev_electric_share', value: 0.6, status: 'USER_PROVIDED' });
  });

  it('5. PHEV without charge-sustaining consumption → running cost unavailable (weighted WLTP never used)', () => {
    const noCs = phev({ chargeSustainingL100: undefined, exclusions: ['nrg.phev_weighted_fuel_l100: WLTP weighted consumption is never used for cost'] });
    const r = computeEconomics(noCs, ctx({ petrol: 1.6, electricity: 0.18 }), { ...S, phevElectricShare: 0.6 });
    expect(r.runningCost.status).toBe('UNAVAILABLE');
    expect(r.energy.costPer100km).toBeUndefined();
    expect(warnCodes(r)).toEqual(expect.arrayContaining(['PHEV_CS_UNAVAILABLE', 'PHEV_WEIGHTED_CONSUMPTION_IGNORED']));
    // Solo con conducción 100 % eléctrica no hace falta el CS.
    expect(computeEconomics(noCs, ctx({ electricity: 0.18 }), { ...S, phevElectricShare: 1 }).runningCost.status).toBe('AVAILABLE');
    // Sin fracción eléctrica tampoco se calcula.
    expect(warnCodes(computeEconomics(phev(), ctx({ petrol: 1.6, electricity: 0.18 }), S))).toContain('PHEV_ELECTRIC_SHARE_REQUIRED');
  });

  it('BEV cost does not require range', () => {
    const r = computeEconomics(bev(16.6), ctx({ electricity: 0.19 }), S);
    expect(r.runningCost.status).toBe('AVAILABLE');
  });
});

describe('ranges, prices and availability', () => {
  it('6. a consumption range gives a cost range (no midpoint), kept through every horizon', () => {
    const r = computeEconomics(ice([5.0, 5.4], { fuelType: 'diesel' }), ctx({ diesel: 1.5 }), S);
    expect(r.energy.costPer100km).toEqual({ min: 7.5, max: 8.1 });
    expect(r.runningCost.annual_minor).toEqual({ min: 135000, max: 145800 });
    expect(r.runningCost.horizons.find((h) => h.years === 3)!.total_minor).toEqual({ min: 405000, max: 437400 });
    expect(warnCodes(r)).toContain('CONSUMPTION_RANGE');
  });

  it('7. user override > market reference, shown as USER_PROVIDED', () => {
    const r = computeEconomics(ice(6.1), ctx({ petrol: 1.65 }), { ...S, energy: { fuelPriceOverrides: { PETROL_95_E5: 1.5 } } });
    expect(r.provenance.energyPrices[0]).toMatchObject({ value: 1.5, origin: 'USER_OVERRIDE', status: 'USER_PROVIDED' });
    expect(r.breakdown[0]!.basis).toBe('USER_PROVIDED');
  });

  it('8. market reference > methodology fallback, shown as KNOWN with observation date and source', () => {
    const r = computeEconomics(ice(6.1), ctx({ petrol: 1.65 }), S);
    expect(r.provenance.energyPrices[0]).toMatchObject({ origin: 'MARKET_REFERENCE', observationDate: '2026-09-23', freshness: 'CURRENT', price_basis: 'RETAIL_PUMP_PRICE' });
    expect(r.breakdown[0]!.basis).toBe('KNOWN');
  });

  it('9. no price anywhere → UNAVAILABLE, never an invented value or zero', () => {
    const r = computeEconomics(ice(6.1), ctx(), S);
    expect(r.energy.status).toBe('UNAVAILABLE');
    expect(r.runningCost).toEqual({ status: 'UNAVAILABLE', horizons: [] });
    expect(warnCodes(r)).toContain('ENERGY_PRICE_UNAVAILABLE');
    const noConsumption = computeEconomics(ice(6.1, { fuelConsumptionL100: undefined }), ctx({ petrol: 1.65 }), S);
    expect(noConsumption.runningCost.status).toBe('UNAVAILABLE');
    expect(warnCodes(noConsumption)).toContain('CONSUMPTION_UNAVAILABLE');
    expect(noConsumption.confidence.level).toBe('LOW');
  });

  it('10. horizons 1/3/5 always reported, plus the scenario horizon', () => {
    const r = computeEconomics(ice(6.1), ctx({ petrol: 1.65 }), { annualKm: 18_000, horizonYears: 8 });
    expect(r.runningCost.horizons.map((h) => [h.years, h.total_minor.min])).toEqual([
      [1, 181170],
      [3, 543510],
      [5, 905850],
      [8, 1449360],
    ]);
  });
});

describe('golden: 6.1 vs 4.8 L/100 km, 18,000 km/year, 1.65 €/L', () => {
  it('11. 1,098 vs 864 L/year → 234 L; 386.10 €/year; 1,158.30 € in 3 years; 1,930.50 € in 5 years', () => {
    const a = computeEconomics(ice(6.1), ctx({ petrol: 1.65 }), S);
    const b = computeEconomics(ice(4.8), ctx({ petrol: 1.65 }), S);
    expect(a.energy.litresPerYear!.min).toBe(1098);
    expect(b.energy.litresPerYear!.min).toBe(864);
    expect(a.energy.litresPerYear!.min - b.energy.litresPerYear!.min).toBe(234);
    const d = economicDelta(a, b);
    // Tolerancia: 0 céntimos (money-v1: importes anuales redondeados HALF_UP, acumulados como sumas enteras).
    expect(d.runningAnnual_minor).toEqual({ min: 38610, max: 38610 });
    expect(d.running.find((h) => h.years === 3)!.delta_minor).toEqual({ min: 115830, max: 115830 });
    expect(d.running.find((h) => h.years === 5)!.delta_minor).toEqual({ min: 193050, max: 193050 });
  });
});

describe('break-even', () => {
  const withPrice = (l100: number, eur: number) => ice(l100, { purchase: { participant: 'NEW', listPrice: { amount_minor: eur * 100, currency: 'EUR', status: 'KNOWN' } } });

  it('12. costs 4,000 € more, saves 800 €/year → 5 years', () => {
    // 800 €/año de ahorro a 1.60 €/L y 20.000 km/año = 2.5 L/100 km de diferencia.
    const premium = computeEconomics(withPrice(4.0, 30_000), ctx({ petrol: 1.6 }), { annualKm: 20_000, horizonYears: 5 });
    const baseline = computeEconomics(withPrice(6.5, 26_000), ctx({ petrol: 1.6 }), { annualKm: 20_000, horizonYears: 5 });
    expect(breakEven(premium, baseline)).toMatchObject({ status: 'BREAK_EVEN', years: { min: 5, max: 5 }, extraPurchase_minor: { min: 400000, max: 400000 }, annualSaving_minor: { min: 80000, max: 80000 } });
  });

  it('13. no annual saving → NO_BREAK_EVEN (no forced number); cheaper to buy → NO_PREMIUM', () => {
    const premium = computeEconomics(withPrice(6.5, 30_000), ctx({ petrol: 1.6 }), S);
    const baseline = computeEconomics(withPrice(6.0, 26_000), ctx({ petrol: 1.6 }), S);
    expect(breakEven(premium, baseline).status).toBe('NO_BREAK_EVEN');
    expect(breakEven(baseline, premium).status).toBe('NO_PREMIUM');
    const uncertain = breakEven(computeEconomics(ice([4.5, 7.0], { purchase: { participant: 'NEW', listPrice: { amount_minor: 3_000_000, currency: 'EUR', status: 'KNOWN' } } }), ctx({ petrol: 1.6 }), S), baseline);
    expect(uncertain.status).toBe('BREAK_EVEN_UNCERTAIN');
    expect(breakEven(computeEconomics(ice(6.1), ctx(), S), baseline).status).toBe('UNAVAILABLE');
  });
});

describe('ownership cost: known vs estimated', () => {
  const listed = (over = {}) => ice(6.1, { purchase: { participant: 'NEW', listPrice: { amount_minor: 3_000_000, currency: 'EUR', status: 'KNOWN', incl_taxes: 'YES' } }, ...over });

  it('14. residual is optional: without it ownership is a known-cost view (never called TCO); with it, COMPLETE', () => {
    const noResidual = computeEconomics(listed(), ctx({ petrol: 1.65 }), S, { maintenanceAnnualOverride: { amount_minor: 50_000, currency: 'EUR' } });
    const h5 = noResidual.ownershipCost.horizons.find((h) => h.years === 5)!;
    expect(h5).toMatchObject({ view: 'KNOWN_COST_VIEW', missing: ['RESIDUAL'], total_minor: { min: 3_000_000 + 905_850 + 250_000, max: 3_000_000 + 905_850 + 250_000 } });
    expect(noResidual.ownershipCost.status).toBe('PARTIAL');
    expect(warnCodes(noResidual)).toContain('RESIDUAL_NOT_AVAILABLE');
    const full = computeEconomics(listed({ residualEstimates: [{ years: 5, amount_minor: 1_500_000, currency: 'EUR', status: 'ESTIMATED' }] }), ctx({ petrol: 1.65 }), S, { maintenanceAnnualOverride: { amount_minor: 50_000, currency: 'EUR' } });
    expect(full.ownershipCost.horizons.find((h) => h.years === 5)).toMatchObject({ view: 'COMPLETE', missing: [], total_minor: { min: 2_655_850, max: 2_655_850 } });
    expect(full.breakdown.find((l) => l.component === 'RESIDUAL')!.basis).toBe('ESTIMATED');
  });

  it('15. maintenance: an estimate is ESTIMATED; none → unavailable (not zero); running cost is never blocked', () => {
    const est = computeEconomics(listed({ maintenanceAnnualEstimate: { amount_minor: 60_000, currency: 'EUR', status: 'ESTIMATED', label: 'test estimate' } }), ctx({ petrol: 1.65 }), S);
    expect(est.breakdown.find((l) => l.component === 'MAINTENANCE')!.basis).toBe('ESTIMATED');
    expect(warnCodes(est)).toContain('MAINTENANCE_ESTIMATED');
    const none = computeEconomics(listed(), ctx({ petrol: 1.65 }), S);
    expect(none.ownershipCost.horizons[0]!.missing).toContain('MAINTENANCE');
    expect(none.breakdown.some((l) => l.component === 'MAINTENANCE')).toBe(false);
    expect(none.runningCost.status).toBe('AVAILABLE');
    expect(warnCodes(none)).toContain('MAINTENANCE_NOT_AVAILABLE');
  });

  it('purchase price: override > used asking price > list price; a used car never uses the original list price as its price', () => {
    const used = ice(6.1, { purchase: { participant: 'USED', listPrice: { amount_minor: 3_800_000, currency: 'EUR', status: 'KNOWN' }, usedAskingPrice: { amount_minor: 2_150_000, currency: 'EUR', status: 'USER_PROVIDED' } } });
    expect(computeEconomics(used, ctx({ petrol: 1.65 }), S).ownershipCost.purchase).toEqual({ amount_minor: 2_150_000, basis: 'USER_PROVIDED', source: 'USED_ASKING' });
    expect(computeEconomics(used, ctx({ petrol: 1.65 }), S, { purchasePriceOverride: { amount_minor: 2_000_000, currency: 'EUR' } }).ownershipCost.purchase!.source).toBe('OVERRIDE');
    expect(computeEconomics(listed(), ctx({ petrol: 1.65 }), S).ownershipCost.purchase).toEqual({ amount_minor: 3_000_000, basis: 'KNOWN', source: 'LIST' });
    const usedNoAsk = computeEconomics(ice(6.1, { purchase: { participant: 'USED', listPrice: { amount_minor: 3_800_000, currency: 'EUR', status: 'KNOWN' } } }), ctx({ petrol: 1.65 }), S);
    expect(usedNoAsk.ownershipCost.status).toBe('UNAVAILABLE');
    expect(warnCodes(usedNoAsk)).toContain('PURCHASE_PRICE_NOT_AVAILABLE');
  });
});

describe('warnings, provenance, reproducibility, rounding', () => {
  it('16. stale market data is flagged and lowers confidence', () => {
    const r = computeEconomics(ice(6.1), ctx({ petrol: 1.65, fuelDate: '2026-09-12' }), S);
    expect(warnCodes(r)).toContain('STALE_MARKET_DATA');
    expect(r.provenance.energyPrices[0]!.freshness).toBe('STALE');
    expect(r.confidence.reasons).toContain('market_data_stale');
  });

  it('17. the PVPC reference excludes taxes: flagged as a reference, not the user tariff; its source is kept for the publication gate', () => {
    const r = computeEconomics(bev(16.6, 'UNSPECIFIED'), ctx({ electricity: 0.194264 }), S);
    expect(warnCodes(r)).toContain('ELECTRICITY_REFERENCE_EXCLUDES_TAX');
    expect(r.provenance.energyPrices[0]).toMatchObject({ price_basis: 'PVPC_ENERGY_TERM', taxes: 'EXCLUDED', source_id: '00000000-0000-4000-8000-00000000c004' });
    expect(r.provenance.sources).toContainEqual({ source_id: '00000000-0000-4000-8000-00000000c004', role: 'electricity reference price' });
    // Con precio del usuario ya no hay referencia PVPC.
    const user = computeEconomics(bev(16.6, 'UNSPECIFIED'), ctx({ electricity: 0.194264 }), { ...S, energy: { electricityPriceOverride: 0.14 } });
    expect(warnCodes(user)).not.toContain('ELECTRICITY_REFERENCE_EXCLUDES_TAX');
    expect(user.provenance.sources.some((s) => s.role === 'electricity reference price')).toBe(false);
  });

  it('18. user-entered values are USER_PROVIDED everywhere they appear', () => {
    const r = computeEconomics(ice(6.1), ctx({ petrol: 1.65 }), { ...S, energy: { fuelPriceOverrides: { PETROL_95_E5: 1.7 } } }, {
      purchasePriceOverride: { amount_minor: 2_500_000, currency: 'EUR' },
      maintenanceAnnualOverride: { amount_minor: 40_000, currency: 'EUR' },
      residualOverrides: [{ years: 5, amount_minor: 1_000_000, currency: 'EUR' }],
    });
    expect(r.breakdown.map((l) => [l.component, l.basis])).toEqual([
      ['FUEL', 'USER_PROVIDED'],
      ['PURCHASE', 'USER_PROVIDED'],
      ['MAINTENANCE', 'USER_PROVIDED'],
      ['RESIDUAL', 'USER_PROVIDED'],
    ]);
  });

  it('19. scenarioHash: same input → same hash and result; any change in inputs or overrides changes the hash', () => {
    const v = ice(6.1);
    const c = ctx({ petrol: 1.65 });
    const a = computeEconomics(v, c, S);
    const b = computeEconomics(JSON.parse(JSON.stringify(v)), JSON.parse(JSON.stringify(c)), { horizonYears: 5, annualKm: 18_000 });
    expect(b).toEqual(a);
    expect(a.scenarioHash).toMatch(/^[0-9a-f]{16}$/);
    // Otra observación de mercado (otro id, aunque sea el mismo precio) es otra procedencia → otro hash.
    expect(computeEconomics(v, ctx({ petrol: 1.65 }), S).scenarioHash).not.toBe(a.scenarioHash);
    expect(computeEconomics(v, ctx({ petrol: 1.66 }), S).scenarioHash).not.toBe(a.scenarioHash);
    expect(computeEconomics(v, c, { ...S, annualKm: 18_001 }).scenarioHash).not.toBe(a.scenarioHash);
    expect(computeEconomics(v, c, S, { maintenanceAnnualOverride: { amount_minor: 1, currency: 'EUR' } }).scenarioHash).not.toBe(a.scenarioHash);
    expect(a.methodologyVersion).toBe(METHODOLOGY_VERSION);
    expect([a.economicsRulesVersion, a.roundingPolicy]).toEqual(['economics-v1', 'money-v1']);
  });

  it('20. minor units: HALF_UP away from zero, robust to binary floating point', () => {
    expect(toMinor(1.005)).toBe(101);
    expect(toMinor(0.125)).toBe(13);
    expect(toMinor(-0.125)).toBe(-13);
    expect(toMinor(1811.7000000000003)).toBe(181170);
    expect(toMinor(2.675)).toBe(268);
    const r = computeEconomics(ice(6.1), ctx({ petrol: 1.65 }), S);
    for (const h of r.runningCost.horizons) expect(Number.isInteger(h.total_minor.min) && Number.isInteger(h.total_minor.max)).toBe(true);
  });
});

describe('sensitivity (deterministic, one variable at a time)', () => {
  it('reports km, fuel price and horizon effects; home-charging share has no effect with one reference price', () => {
    const s = economicSensitivity(ice(6.1, { purchase: { participant: 'NEW', listPrice: { amount_minor: 3_000_000, currency: 'EUR', status: 'KNOWN' } } }), ctx({ petrol: 1.65 }), S);
    const km = s.entries.find((e) => e.variable === 'annual_km')!;
    expect(km).toMatchObject({ base: 18_000, low: { input: 5_000, runningAnnual_minor: { min: 50325, max: 50325 } }, high: { input: 60_000 }, effect: 'CHANGES' });
    expect(s.entries.find((e) => e.variable === 'fuel_price')).toMatchObject({ low: { input: 1 }, high: { input: 2.5 }, effect: 'CHANGES' });
    expect(s.entries.find((e) => e.variable === 'purchase_price')).toMatchObject({ low: { input: 2_700_000 }, high: { input: 3_300_000 } });
    expect(s.skipped.map((x) => x.variable)).toEqual(expect.arrayContaining(['electricity_price', 'maintenance', 'residual']));
    const e = economicSensitivity(bev(18), ctx({ electricity: 0.2 }), { ...S, energy: { homeChargingShare: 0.8 } });
    expect(e.entries.find((x) => x.variable === 'home_charging_share')!.effect).toBe('NO_EFFECT');
    expect(e.entries.find((x) => x.variable === 'electricity_price')!.effect).toBe('CHANGES');
  });
});

it('the economic result of A does not depend on which other vehicles exist', () => {
  const a = ice(6.1);
  const c = ctx({ petrol: 1.65, electricity: 0.2 });
  const alone = computeEconomics(a, c, S);
  const inSet = [bev(17), a, ice(4.8, { id: uuid() })].map((v) => computeEconomics(v, c, S)).find((r) => r.vehicleId === alone.vehicleId);
  expect(inSet).toEqual(alone);
});
