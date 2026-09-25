import { describe, expect, it } from 'vitest';
import {
  ALPHA_CATEGORIES,
  CATEGORY_REQUIREMENTS,
  Homologation,
  SPEC_KEYS,
  SPEC_KEY_DEFINITIONS,
  SpecValue,
  displayCycle,
  isSpecKey,
  valueOriginOf,
  type SpecValueInput,
} from '../src/index.ts';

const ID = {
  value: '00000000-0000-4000-8000-000000000001',
  variant: '00000000-0000-4000-8000-000000000002',
  source: '00000000-0000-4000-8000-000000000003',
};

const base = (over: Partial<SpecValueInput>): SpecValueInput => ({
  id: ID.value,
  variant_id: ID.variant,
  spec_key: 'dim.length_mm',
  value: 4282,
  unit: 'mm',
  source_id: ID.source,
  source_url: 'https://example.org/source',
  source_market: 'ES',
  reference_market: 'ES',
  source_authority: 'OFFICIAL_MANUFACTURER',
  mapping_confidence: 'EXACT',
  homologation_match: 'NOT_APPLICABLE',
  retrieved_at: '2026-09-24',
  ...over,
});

const messages = (input: SpecValueInput) => {
  const r = SpecValue.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe('SpecKey catalog v0.2', () => {
  it('has 90 unique keys', () => {
    expect(SPEC_KEYS).toHaveLength(90);
    expect(new Set(SPEC_KEYS).size).toBe(90);
  });

  it('every key referenced by category rules exists and is marked critical', () => {
    for (const byCategory of Object.values(CATEGORY_REQUIREMENTS)) {
      for (const category of ALPHA_CATEGORIES) {
        for (const alt of byCategory[category]) {
          for (const req of alt.all) {
            if (req.kind !== 'spec') continue;
            expect(isSpecKey(req.key), req.key).toBe(true);
            const def = SPEC_KEY_DEFINITIONS.get(req.key)!;
            // 0–60 (US) y capacidad de batería (alternativa BEV) son críticas solo en su alternativa.
            if (!['perf.accel_0_60_s', 'bat.capacity_kwh'].includes(req.key)) expect(def.critical, req.key).toBe(true);
          }
        }
      }
    }
  });

  it('market elements are never cross-market (D1)', () => {
    for (const key of ['war.years', 'emi.dgt_label_es', 'adas.aeb', 'tech.apple_carplay', 'bat.warranty_km'] as const) {
      expect(SPEC_KEY_DEFINITIONS.get(key)!.crossMarket, key).toBe(false);
    }
    for (const key of ['nrg.fuel_charge_sustaining_l100', 'emi.co2_combined_gkm', 'dim.mass_kg', 'bat.capacity_kwh'] as const) {
      expect(SPEC_KEY_DEFINITIONS.get(key)!.crossMarket, key).toBe(true);
    }
  });
});

describe('SpecValue v0.2 — generic rules', () => {
  it('accepts a plain point value', () => {
    expect(messages(base({}))).toEqual([]);
  });

  it('accepts a range with value omitted (D4: never collapsed)', () => {
    const v = SpecValue.parse(
      base({ spec_key: 'emi.co2_combined_gkm', unit: 'g/km', value: undefined, value_min: 132, value_max: 142, range_basis: 'WHEEL_SIZE', test_cycle: 'NEDC' }),
    );
    expect(v.value).toBeUndefined();
    expect([v.value_min, v.value_max]).toEqual([132, 142]);
  });

  it('rejects point + range together, half ranges, and ranges without basis', () => {
    expect(messages(base({ value_min: 1, value_max: 2, range_basis: 'TRIM' }))).not.toEqual([]);
    expect(messages(base({ value: undefined, value_min: 1 }))).not.toEqual([]);
    expect(messages(base({ value: undefined, value_min: 1, value_max: 2 }))).toContain('ranges need `range_basis`');
  });

  it('requires archive_url + original_url for archived sources (D3)', () => {
    expect(messages(base({ archived: true }))).toContain('archived values need `archive_url` and `original_url`');
  });

  it('inferred cycle only with UNDECLARED and with evidence', () => {
    const co2 = { spec_key: 'emi.co2_combined_gkm', unit: 'g/km', value: 113 } as const;
    expect(messages(base({ ...co2, test_cycle: 'WLTP', test_cycle_inferred: 'NEDC_CORRELATED', cycle_evidence: 'x' }))).not.toEqual([]);
    expect(messages(base({ ...co2, test_cycle: 'UNDECLARED', test_cycle_inferred: 'NEDC_CORRELATED' }))).toContain('an inferred cycle needs `cycle_evidence`');
    const ok = SpecValue.parse(base({ ...co2, test_cycle: 'UNDECLARED', test_cycle_inferred: 'NEDC_CORRELATED', cycle_evidence: 'Ewltp present' }));
    expect(displayCycle(ok)).toEqual({ cycle: 'NEDC_CORRELATED', declared: false, label: 'ciclo no declarado (probablemente NEDC_CORRELATED)' });
  });

  it('cross-market needs a homologation_match and EU markets', () => {
    const cs = { spec_key: 'nrg.fuel_charge_sustaining_l100', unit: 'L/100 km', value: 5.0, test_cycle: 'WLTP' } as const;
    expect(messages(base({ ...cs, source_market: 'DE' }))).toContain('cross-market values need EXACT, PARTIAL or UNCONFIRMED');
    expect(messages(base({ ...cs, source_market: 'DE', homologation_match: 'UNCONFIRMED' }))).toEqual([]);
    expect(messages(base({ ...cs, source_market: 'GB', homologation_match: 'EXACT' }))).toContain('cross-market reuse is only allowed between EU markets (D1)');
    expect(messages(base({ homologation_match: 'EXACT' }))).toContain('same-market values must use NOT_APPLICABLE');
  });

  it('CROSS_MARKET_EXACT_HOMOLOGATION mapping only with a cross-market EXACT match', () => {
    const cs = { spec_key: 'nrg.fuel_charge_sustaining_l100', unit: 'L/100 km', value: 5.0, test_cycle: 'WLTP', source_market: 'DE' } as const;
    expect(messages(base({ ...cs, homologation_match: 'PARTIAL', mapping_confidence: 'CROSS_MARKET_EXACT_HOMOLOGATION' }))).not.toEqual([]);
    expect(messages(base({ ...cs, homologation_match: 'EXACT', mapping_confidence: 'CROSS_MARKET_EXACT_HOMOLOGATION' }))).toEqual([]);
  });
});

describe('SpecValue v0.2 — per-key rules', () => {
  it('market elements cannot come from another market (DGT label, warranty)', () => {
    expect(
      messages(base({ spec_key: 'emi.dgt_label_es', unit: null, value: 'ECO', source_market: 'DE', homologation_match: 'EXACT' })),
    ).toContain('emi.dgt_label_es is a market element: cross-market reuse not allowed (D1)');
    expect(
      messages(base({ spec_key: 'war.years', unit: 'years', value: 3, source_market: 'DE', homologation_match: 'EXACT' })),
    ).toContain('war.years is a market element: cross-market reuse not allowed (D1)');
  });

  it('cycle keys require test_cycle; non-cycle keys reject it', () => {
    expect(messages(base({ spec_key: 'nrg.fuel_combined_l100', unit: 'L/100 km', value: 5.4 }))).toContain(
      'nrg.fuel_combined_l100 requires test_cycle (use UNDECLARED if the source does not state it)',
    );
    expect(messages(base({ test_cycle: 'WLTP' }))).toContain('dim.length_mm does not take a test_cycle');
  });

  it('required measurement bases must be present, UNSPECIFIED allowed', () => {
    const cap = { spec_key: 'bat.capacity_kwh', unit: 'kWh', value: 82.5 } as const;
    expect(messages(base(cap))).toContain('bat.capacity_kwh requires battery_capacity_basis (UNSPECIFIED allowed)');
    expect(messages(base({ ...cap, measurement_basis: { battery_capacity_basis: 'UNSPECIFIED' } }))).toEqual([]);
  });

  it('fixed bases cannot be contradicted', () => {
    expect(
      messages(base({ spec_key: 'nrg.fuel_charge_sustaining_l100', unit: 'L/100 km', value: 5, test_cycle: 'WLTP', measurement_basis: { consumption_basis: 'WEIGHTED_PHEV' } })),
    ).toContain('nrg.fuel_charge_sustaining_l100 has fixed consumption_basis=CHARGE_SUSTAINING');
  });

  it('dc charging time needs its SoC window', () => {
    expect(messages(base({ spec_key: 'chg.dc_time_min', unit: 'min', value: 37 }))).toHaveLength(2);
    expect(messages(base({ spec_key: 'chg.dc_time_min', unit: 'min', value: 37, measurement_basis: { soc_from_pct: 10, soc_to_pct: 80 } }))).toEqual([]);
  });

  it('checks unit, type, integer and enum values', () => {
    expect(messages(base({ unit: 'm' }))).toContain('unit must be mm for dim.length_mm');
    expect(messages(base({ value: 4282.5 }))).toContain('dim.length_mm expects an integer');
    expect(messages(base({ spec_key: 'emi.dgt_label_es', unit: null, value: 'GREEN' }))).not.toEqual([]);
    expect(messages(base({ spec_key: 'nope.key' }))).toContain('unknown SpecKey nope.key');
  });
});

describe('Homologation', () => {
  const h = {
    id: ID.value,
    market_code: 'ES',
    valid_from: '2018-01-01',
    test_cycle: 'NEDC',
    emissions_standard_family: 'EURO_6',
    homologation_powertrain: 'ICE',
    source_id: ID.source,
    source_url: 'https://example.org',
  } as const;

  it('without TAN/Va/Ve or equivalent code it can only be UNCONFIRMED', () => {
    expect(Homologation.safeParse({ ...h, identification_confidence: 'EXACT' }).success).toBe(false);
    expect(Homologation.safeParse({ ...h, identification_confidence: 'UNCONFIRMED' }).success).toBe(true);
    expect(Homologation.safeParse({ ...h, identification_confidence: 'EXACT', type_approval_number: 'e1*2007/46*0623*33' }).success).toBe(true);
  });
});

describe('value origin (Catalog Q8)', () => {
  it('projects source_authority into how the value originated', () => {
    expect(valueOriginOf('OFFICIAL_AUTHORITY')).toBe('DIRECT');
    expect(valueOriginOf('CALCULATED')).toBe('CALCULATED');
    expect(valueOriginOf('USER_PROVIDED')).toBe('USER_PROVIDED');
  });
});
