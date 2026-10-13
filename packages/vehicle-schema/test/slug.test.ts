import { describe, expect, it } from 'vitest';
import { isValidVariantSlug, proposeVariantSlug, slugify, type SlugParts } from '../src/index.ts';

const golf: SlugParts = { manufacturer: 'Volkswagen', model: 'Golf', variant: 'eTSI 150 DSG', model_year: 2024, powertrain_type: 'MHEV', technical_discriminator: 'h7a' };

describe('variant slugs (Step 7b)', () => {
  it('readable, accent-free, lower-case', () => {
    expect(slugify('SEAT León e-HYBRID 204')).toBe('seat-leon-e-hybrid-204');
    expect(slugify('BYD SEAL Design RWD 82,5 kWh')).toBe('byd-seal-design-rwd-82-5-kwh');
  });
  it('never produces the pair separator -vs-', () => {
    expect(slugify('Foo VS Bar')).toBe('foo-v-bar');
    expect(isValidVariantSlug('a-vs-b')).toBe(false);
  });
  it('proposes the base slug when free', () => {
    expect(proposeVariantSlug(golf, new Set())).toBe('volkswagen-golf-etsi-150-dsg');
  });
  it('collisions: suffix only when needed, deterministic order year → powertrain → technical', () => {
    const taken = new Set(['volkswagen-golf-etsi-150-dsg']);
    expect(proposeVariantSlug(golf, taken)).toBe('volkswagen-golf-etsi-150-dsg-2024');
    taken.add('volkswagen-golf-etsi-150-dsg-2024');
    expect(proposeVariantSlug(golf, taken)).toBe('volkswagen-golf-etsi-150-dsg-2024-mhev');
    taken.add('volkswagen-golf-etsi-150-dsg-2024-mhev');
    expect(proposeVariantSlug(golf, taken)).toBe('volkswagen-golf-etsi-150-dsg-2024-mhev-h7a');
    taken.add('volkswagen-golf-etsi-150-dsg-2024-mhev-h7a');
    expect(proposeVariantSlug(golf, taken)).toBe('volkswagen-golf-etsi-150-dsg-2024-mhev-h7a-2');
    expect(proposeVariantSlug(golf, taken)).toBe(proposeVariantSlug(golf, taken));
  });
});
