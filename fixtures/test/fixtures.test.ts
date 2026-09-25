import { describe, expect, it } from 'vitest';
import { DatasetBundle } from '@vscar/vehicle-schema';
import { SCHEMA_VALIDATION_CASES, loadAllCases, uid, type CaseName } from '../src/index.ts';

describe('schema validation fixtures', () => {
  for (const name of Object.keys(SCHEMA_VALIDATION_CASES) as CaseName[]) {
    it(`${name} is a valid DatasetBundle`, () => {
      const result = DatasetBundle.safeParse(SCHEMA_VALIDATION_CASES[name]);
      if (!result.success) throw new Error(JSON.stringify(result.error.issues, null, 2));
    });
  }

  it('all cases merge into one consistent bundle with unique ids', () => {
    const all = loadAllCases();
    const ids = [...all.homologations, ...all.variants, ...all.spec_values, ...all.prices, ...all.safety_ratings].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(all.variants).toHaveLength(9);
  });

  it('ids are deterministic UUIDs', () => {
    expect(uid('x')).toBe(uid('x'));
    expect(uid('x')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
