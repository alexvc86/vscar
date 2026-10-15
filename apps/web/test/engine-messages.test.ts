import { COMPARISON_MESSAGE_TEMPLATES } from '@vscar/comparison-engine';
import { MESSAGE_TEMPLATES, type Message } from '@vscar/decision-engine';
import { LEON_EHYBRID_IDS, MODEL3_2021_IDS, USED_BEV_COMPLETE, USED_BEV_LOW_INFO, USED_EVALUATION_DATE, USED_ICE_HIGH_MILEAGE, USED_PHEV_UNKNOWN_HISTORY, X3_2018_IDS } from '@vscar/fixtures';
import { USED_MESSAGE_TEMPLATES, adjustUsedVehicle } from '@vscar/used-adjustment';
import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { buildMessageCases, collectMessages } from '../../../packages/decision-engine/test/message-cases.ts';
import en from '../messages/en.json';
import es from '../messages/es.json';
import { translateDecisionMessage, type Translator } from '../src/i18n/engine-messages.ts';
import { createFormat } from '../src/i18n/format.ts';
import { MARKETS, parseLocaleSegment } from '../src/i18n/locales.ts';

/**
 * Step 7a.1 — contrato i18n de los mensajes de engine en la web: el catálogo cubre TODAS las claves, la UI
 * traduce desde el catálogo (nunca desde `text`), sin fugas de idioma, y el resultado no depende del respaldo.
 */
const SEGMENTS = ['es-es', 'en-es'] as const;
const tr = (seg: string): Translator => createTranslator({ locale: seg, messages: seg.startsWith('es') ? es : en }) as unknown as Translator;
const fmt = (seg: string) => {
  const l = parseLocaleSegment(seg)!;
  return createFormat(l.formatLocale, MARKETS[l.market], { yes: 'yes', no: 'no' });
};
const render = (msg: Message, seg: string) => translateDecisionMessage(msg, tr(seg), fmt(seg));
const ALL_KEYS = [...Object.keys(MESSAGE_TEMPLATES), ...Object.keys(COMPARISON_MESSAGE_TEMPLATES), ...Object.keys(USED_MESSAGE_TEMPLATES)];

/** Params de ejemplo por NOMBRE (datos plausibles) para ejercitar cada plantilla del catálogo. */
const SAMPLE: Record<string, string | number | boolean> = {
  subject: 'BYD SEAL', other: 'Tesla Model 3', a: 'BYD SEAL', b: 'Tesla Model 3', subjectId: 'id-a', otherId: 'id-b', candidateId: 'id-a',
  metric: 'rng.electric_combined_km', criterion: 'minTowingKg', required: 1500, unit: 'kg', op: 'min', observedMin: 1200, observedMax: 1400,
  gap: 300, direction: 'BELOW', level: 'CLEAR', forYou: 'SLIGHT', forYouLevel: 'SLIGHT', generalLevel: 'CLEAR', component: 'RANGE_FIT',
  priority: 'COST', relevance: 'LOW', valueMin: 570, valueMax: 570, otherValueMin: 448, otherValueMax: 448, valueAMin: 570, valueAMax: 570,
  valueBMin: 448, valueBMax: 448, deltaMin: 122, deltaMax: 122, amountMinMinor: 2396, amountMaxMinor: 12368, annualMinMinor: 2396,
  annualMaxMinor: 12368, currency: 'EUR', annualKm: 15000, horizonYears: 5, count: 2, total: 8, notAvailable: 6, failed: 1, status: 'NOT_COMPARABLE',
  category: 'Economy', coverage: 0.45, cycleA: 'NEDC', cycleB: 'WLTP', cycleSubject: 'NEDC', cycleOther: 'WLTP', reason: 'PRACTICAL_TIE',
  variable: 'annual_km', switchValue: 21840, currentValue: 15000, outcome: 'AHEAD', missingA: true, missingB: false, powertrain: 'ICE',
  authorityA: 'EuroNCAP', authorityB: 'EuroNCAP', yearA: 2019, yearB: 2023, starsA: 5, starsB: 5, code: 'CYCLE_MISMATCH', dailyKm: 35,
  smallestRangeKm: 448, longTripsPerYear: 10, minLongTrips: 6, maxLongTrips: 2, familySize: 5,
  // Step 8a — used.*
  mileageKm: 90000, ageMonthsMin: 25, ageMonthsMax: 25, annualKmMin: 43200, annualKmMax: 43200, referenceAnnualKm: 15000, thresholdAnnualKm: 22500,
  basis: 'CALCULATED', warrantyRemainingMonthsMin: 5, warrantyRemainingMonthsMax: 5, limitMonths: 12, history: 'PARTIAL', cause: 'LOW', batteryHealthPct: 65,
  thresholdPct: 70, thresholdBasis: 'METHODOLOGY_DEFAULT', condition: 'POOR', inspectionStatus: 'EXPIRED', field: 'battery_health', critical: true, knownCount: 7,
  relevantCount: 10, notApplicableCount: 0, registration: '2027-01-01', evaluationDate: '2026-10-14', registrationYearAssumed: 2019, marketCurrency: 'EUR',
  observedAt: '2026-10-20',
};
const synthetic = (key: string): Message => ({ messageKey: key, params: SAMPLE, text: 'FALLBACK' });

/** Nombres propios y códigos de datos que pueden aparecer en cualquier idioma. */
function stripProper(text: string, msgs: Message[]): string {
  const names = new Set<string>();
  const walk = (m: Message) => {
    for (const k of ['subject', 'other', 'a', 'b']) if (typeof m.params[k] === 'string') names.add(m.params[k] as string);
    m.details?.forEach(walk);
  };
  msgs.forEach(walk);
  let out = text;
  for (const n of [...names].sort((x, y) => y.length - x.length)) out = out.split(n).join(' ');
  return out.replace(/\b(WLTP|NEDC|EPA|BEV|PHEV|HEV|ICE|EuroNCAP|NCAP|EUR|kWh|km|kg|mm|L|kW)\b/g, ' ');
}
const ENGLISH = /\b(the|and|than|does|not|meet|requirement|requirements|costs?|ranges?|data|ahead|difference|vehicles?|confidence|your|which|with|less|more|per|year|years|fails|cannot|running|tie)\b/i;
const SPANISH = /\b(el|los|las|que|más|menos|año|años|frente|requisitos?|datos|confianza|coste|autonomía|del|por|sin|tu|tus|cumple)\b/i;

describe('catalog coverage: all engine message keys ⊆ es and ⊆ en', () => {
  for (const seg of SEGMENTS) {
    it(seg, () => {
      const missing = ALL_KEYS.filter((k) => !tr(seg).has(`engine.${k}`));
      expect(missing).toEqual([]);
    });
  }
});

describe('every key renders from the catalog in both languages (synthetic params)', () => {
  for (const seg of SEGMENTS) {
    it(seg, () => {
      for (const key of ALL_KEYS) {
        const r = render(synthetic(key), seg);
        expect(r.fromCatalog, `${seg} ${key}`).toBe(true);
        expect(r.text, `${seg} ${key}`).not.toBe('FALLBACK');
        expect(r.text, `${seg} ${key}`).not.toMatch(/engine\.|\{[A-Za-z]+\}|undefined|NaN/);
        expect(r.text.trim().length, `${seg} ${key}`).toBeGreaterThan(0);
      }
    });
  }
});

describe('real engine results (9 reference cases)', () => {
  const cases = buildMessageCases();
  const messages = Object.values(cases).flatMap((c) => collectMessages(c) as unknown as Message[]);

  it('exercise a broad set of keys', () => expect(new Set(messages.map((m) => m.messageKey)).size).toBeGreaterThan(40));

  it('ES: every message comes from the catalog and contains no English', () => {
    for (const m of messages) {
      const r = render(m, 'es-es');
      expect(r.fromCatalog, m.messageKey).toBe(true);
      const leak = stripProper(r.text, [m]).match(ENGLISH);
      expect(leak, `${m.messageKey}: «${r.text}»`).toBeNull();
    }
  });

  it('EN: every message comes from the catalog and contains no Spanish', () => {
    for (const m of messages) {
      const r = render(m, 'en-es');
      expect(r.fromCatalog, m.messageKey).toBe(true);
      const leak = stripProper(r.text, [m]).match(SPANISH);
      expect(leak, `${m.messageKey}: «${r.text}»`).toBeNull();
    }
  });

  it('fallback text is not needed: replacing every `text` changes nothing', () => {
    const sentinel = (m: Message): Message => ({ ...m, text: 'FALLBACK_SENTINEL', ...(m.details ? { details: m.details.map(sentinel) } : {}) });
    for (const seg of SEGMENTS) {
      for (const m of messages) {
        const a = render(m, seg).text;
        const b = render(sentinel(m), seg).text;
        expect(b, m.messageKey).toBe(a);
        expect(b).not.toContain('FALLBACK_SENTINEL');
      }
    }
  });

  it('natural product Spanish and plain English for the key decision sentences', () => {
    const lt = cases.byd_m3_long_trips!.result;
    const contrib = lt.topContributions[0]!.message;
    expect(render(contrib, 'es-es').text).toBe('Autonomía eléctrica: BYD SEAL 570 km frente a Tesla Model 3 448 km — diferencia clara');
    expect(render(contrib, 'en-es').text).toBe('Electric range: BYD SEAL 570 km vs Tesla Model 3 448 km — clear difference');
    const tie = cases.byd_m3_commuter!.result.alphaBestForYou.explanationMessage;
    expect(render(tie, 'es-es').text).toBe('Para tu uso, ninguno de los dos es claramente mejor: empate práctico, sin ganador forzado.');
    const cheaper = cases.byd_m3_long_trips!.result.economicFit.messages[0]!;
    expect(render(cheaper, 'es-es').text).toMatch(/^El Tesla Model 3 te costaría \d/);
    expect(render(cheaper, 'en-es').text).toMatch(/^The Tesla Model 3 costs €\d/);
    const cycles = cases.x3_nedc_vs_golf_wltp!.result.economicFit.messages[0]!;
    expect(render(cycles, 'es-es').text).toBe('Los costes de uso del BMW X3 2018 (NEDC) y del Golf eTSI (WLTP) salen de ciclos de homologación distintos: no son directamente comparables.');
    const verify = cases.unconfirmed_towing!.result.requiresVerification[0]!;
    expect(render(verify, 'es-es').text).toBe('Sin confirmar: capacidad de remolque. Comprueba que sea de al menos 1.500 kg.');
    expect(render(verify, 'en-es').text).toBe('Not confirmed: towing capacity. Verify that it is at least 1,500 kg.');
  });

  it('market formatting is preserved in English (km, EUR) — language ≠ market', () => {
    const lt = cases.byd_m3_long_trips!.result;
    const msgs = collectMessages(lt) as unknown as Message[];
    const enText = msgs.map((m) => render(m, 'en-es').text).join('\n');
    expect(enText).not.toMatch(/\bmiles?\b|\$|mpg/i);
    expect(enText).toMatch(/km/);
  });
});

describe('Step 8a — used.* messages from real adjustments render in both languages without leaks', () => {
  const ctx = (id: string, powertrainType: 'BEV' | 'ICE' | 'PHEV') => ({ referenceVariantId: id, powertrainType, market: 'ES' as const, originalWarranty: { years: 3, valueIds: [] } });
  const adjusted = [
    adjustUsedVehicle({ reference: ctx(MODEL3_2021_IDS.srp, 'BEV'), instance: USED_BEV_COMPLETE, evaluationDate: USED_EVALUATION_DATE }),
    adjustUsedVehicle({ reference: ctx(MODEL3_2021_IDS.srp, 'BEV'), instance: USED_BEV_LOW_INFO, evaluationDate: USED_EVALUATION_DATE }),
    adjustUsedVehicle({ reference: ctx(X3_2018_IDS.variant, 'ICE'), instance: USED_ICE_HIGH_MILEAGE, evaluationDate: USED_EVALUATION_DATE }),
    adjustUsedVehicle({ reference: ctx(LEON_EHYBRID_IDS.variant, 'PHEV'), instance: USED_PHEV_UNKNOWN_HISTORY, evaluationDate: USED_EVALUATION_DATE }),
  ];
  const messages = adjusted.flatMap((a) => collectMessages(a) as unknown as Message[]);
  it('ES: from the catalog, no English', () => {
    for (const m of messages) {
      const r = render(m, 'es-es');
      expect(r.fromCatalog, m.messageKey).toBe(true);
      expect(stripProper(r.text, [m]).match(ENGLISH), `${m.messageKey}: «${r.text}»`).toBeNull();
    }
  });
  it('EN: from the catalog, no Spanish', () => {
    for (const m of messages) {
      const r = render(m, 'en-es');
      expect(r.fromCatalog, m.messageKey).toBe(true);
      expect(stripProper(r.text, [m]).match(SPANISH), `${m.messageKey}: «${r.text}»`).toBeNull();
    }
  });
  it('key sentences', () => {
    const high = adjusted[2]!.ownershipSignals.find((s) => s.signal === 'HIGH_MILEAGE_FOR_AGE')!;
    expect(render(high, 'es-es').text).toBe('Kilometraje alto para su edad: 210.000 km en 101 meses, unos 24.950 km/año (referencia: 15.000 km/año)');
    expect(render(high, 'en-es').text).toBe('High mileage for its age: 210,000 km in 101 months, about 24,950 km/year (reference: 15,000 km/year)');
    const verify = adjusted[3]!.verificationRequirements.find((v) => v.check === 'BATTERY_HEALTH')!;
    expect(render(verify, 'es-es').text).toBe('Comprueba la salud de la batería (informe de estado) antes de decidir');
  });
});
