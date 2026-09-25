import { describe, expect, it } from 'vitest';
import { GOLF_2018_IDS, GOLF_CURRENT_IDS, MODEL3_2021_IDS, loadAllCases } from '@vscar/fixtures';
import { vehicleCompleteness } from '../src/index.ts';

const all = loadAllCases();
const completeness = (id: string) => vehicleCompleteness(all.variants.find((v) => v.id === id)!, all.spec_values);

describe('reference_completeness on the fixtures', () => {
  it('stays within [0,1] for every variant', () => {
    for (const v of all.variants) {
      const c = vehicleCompleteness(v, all.spec_values).completeness;
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
  });

  it('is a partial sample: none of the fixtures reaches the 90 % SEO threshold', () => {
    for (const v of all.variants) expect(vehicleCompleteness(v, all.spec_values).completeness).toBeLessThan(0.9);
  });

  it('secondary references do not count (Model 3 AC/DC charging stays missing)', () => {
    expect(completeness(MODEL3_2021_IDS.srp).missing_critical).toEqual(expect.arrayContaining(['chg.ac_max_kw', 'chg.dc_max_kw']));
  });

  it('reports missing critical keys instead of imputing them (Golf 2018)', () => {
    expect(completeness(GOLF_2018_IDS.rvA).missing_critical).toEqual(expect.arrayContaining(['nrg.fuel_combined_l100', 'cap.boot_l', 'pt.fuel_tank_l']));
  });

  it('adding usable values never lowers completeness', () => {
    const golf = all.variants.find((v) => v.id === GOLF_CURRENT_IDS.variant)!;
    const values = all.spec_values.filter((v) => v.variant_id === golf.id);
    let previous = 0;
    for (let i = 0; i <= values.length; i++) {
      const c = vehicleCompleteness(golf, values.slice(0, i)).completeness;
      expect(c).toBeGreaterThanOrEqual(previous);
      previous = c;
    }
  });
});
