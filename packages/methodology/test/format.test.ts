import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { METHODOLOGY_CONFIG, canonicalJson, fallbackEur, fallbackNumber, formatEnUs, methodologyFingerprint } from '../src/index.ts';

/** Step D1.6a — el formateador reutilizado es una optimización: su salida es idéntica a `toLocaleString('en-US')`. */
describe('formatEnUs', () => {
  const OPTIONS: Intl.NumberFormatOptions[] = [{}, { maximumFractionDigits: 0 }, { maximumFractionDigits: 1 }, { maximumFractionDigits: 2 }, { minimumFractionDigits: 2, maximumFractionDigits: 2 }];
  it('equals Number#toLocaleString for any finite number and the options the engines use', () => {
    fc.assert(
      fc.property(fc.oneof(fc.double({ noNaN: true, min: -1e9, max: 1e9 }), fc.integer({ min: -1e9, max: 1e9 })), fc.constantFrom(...OPTIONS), (x, o) => {
        expect(formatEnUs(x, o)).toBe(x.toLocaleString('en-US', o));
      }),
      { numRuns: 2000 },
    );
  });
  it('edge values and the fallback helpers keep their text', () => {
    for (const x of [0, -0, NaN, Infinity, 1234.5, 0.005, 1e21]) expect(formatEnUs(x)).toBe(x.toLocaleString('en-US'));
    expect(fallbackNumber(12345.678)).toBe('12,345.68');
    expect(fallbackEur(123456)).toBe('€1,234.56');
  });
});

/** Implementación BigInt original (referencia) de la huella FNV-1a 64. */
function fnvBigInt(config: unknown): string {
  let h = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(canonicalJson(config))) h = ((h ^ BigInt(byte)) * 0x100000001b3n) & 0xffffffffffffffffn;
  return h.toString(16).padStart(16, '0');
}

describe('methodologyFingerprint (32-bit implementation)', () => {
  it('is bit-identical to the BigInt FNV-1a 64 reference', () => {
    expect(methodologyFingerprint()).toBe(fnvBigInt(METHODOLOGY_CONFIG));
    fc.assert(
      fc.property(fc.jsonValue(), (v) => {
        expect(methodologyFingerprint(v)).toBe(fnvBigInt(v));
      }),
      { numRuns: 1000 },
    );
    for (const v of ['', 'ñ€😀', { a: [1, 2, { b: null }] }, 0]) expect(methodologyFingerprint(v)).toBe(fnvBigInt(v));
  });
});
