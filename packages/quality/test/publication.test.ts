import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BYD_SEAL_IDS, MODEL3_2021_IDS, loadAllCases } from '@vscar/fixtures';
import type { DatasetBundle } from '@vscar/vehicle-schema';
import {
  SOURCE_RIGHTS,
  availableIn,
  evaluatePublication,
  filterBundleForChannel,
  publicationInputFromBundle,
  sourcePublication,
  variantAvailability,
  vehiclePageEligible,
  type RightState,
} from '../src/index.ts';

const MATRIX = readFileSync(new URL('../../../docs/data/DATA_RIGHTS_MATRIX.md', import.meta.url), 'utf8');
const SYMBOL: Record<string, RightState> = { '✅': 'VERIFIED', '⚠️': 'CONDITIONAL', '❓': 'PENDING', '❌': 'DENIED' };

/** Filas S.. de las tablas §2.1 y §2.2: código → [store, republish, commercial, derive] (primer símbolo de cada celda). */
function matrixRights(): Map<string, RightState[]> {
  const rows = new Map<string, RightState[]>();
  for (const line of MATRIX.split('\n')) {
    const cells = line.split('|').map((c) => c.trim());
    const code = cells[1];
    if (!code || !/^S\d{2}(-[A-Z]{2})?$/.test(code)) continue;
    // §2.1: | ID | Fuente | Titular | authority | Uso | Acceso | Términos | store | republish | commercial | derive |…
    // §2.2: | ID | Fuente | Titular | authority | Uso | Términos | store | republish | commercial | derive |…
    const start = cells.length > 15 ? 8 : 7;
    const first = (c: string) => Object.keys(SYMBOL).find((s) => c.startsWith(s));
    rows.set(code, cells.slice(start, start + 4).map((c) => SYMBOL[first(c) ?? '❓']!));
  }
  return rows;
}

describe('rights registry = DATA_RIGHTS_MATRIX v0.2', () => {
  const matrix = matrixRights();
  it('covers every S-source of the matrix', () => {
    expect(matrix.size).toBeGreaterThanOrEqual(15);
    for (const code of matrix.keys()) expect(SOURCE_RIGHTS[code], code).toBeDefined();
  });
  it('store / republish / commercial / derive match the matrix symbols', () => {
    for (const [code, rights] of matrix) {
      const r = SOURCE_RIGHTS[code]!;
      expect([r.store, r.republish, r.commercial, r.derive], code).toEqual(rights);
    }
  });
  it('commercial providers (not contracted) and unknown codes fail closed', () => {
    expect(sourcePublication('C07')).toBe('BLOCKED');
    expect(sourcePublication('S99')).toBe('BLOCKED');
    expect(sourcePublication(undefined)).toBe('BLOCKED');
  });
});

describe('source publication: rights ≠ quality', () => {
  it('CC BY sources (EEA, MITECO) are publishable with attribution', () => {
    expect(sourcePublication('S01')).toBe('PUBLISHABLE');
    expect(sourcePublication('S03')).toBe('PUBLISHABLE');
    expect(SOURCE_RIGHTS.S01!.attribution).toMatch(/CC BY 4\.0/);
  });
  it('pending rights (manufacturer, IDAE, ESIOS) are preview-only', () => {
    for (const c of ['S02', 'S04', 'S08', 'S08-EU']) expect(sourcePublication(c), c).toBe('PREVIEW_ONLY');
  });
  it('SECONDARY_REFERENCE is never published, whatever its code says', () => {
    expect(sourcePublication('S01', 'SECONDARY_REFERENCE')).toBe('BLOCKED');
  });
});

describe('Dataset Core under both channels', () => {
  const bundle = loadAllCases();
  const avail = (id: string) => variantAvailability(publicationInputFromBundle(bundle, id));

  it('no Dataset Core variant is PUBLIC today (test_fixture records, rights pending): honest empty public catalog', () => {
    for (const v of bundle.variants) {
      const p = avail(v.id);
      expect(p.availability, v.slug).not.toBe('PUBLIC_AVAILABLE');
      expect(p.public.reasons, v.slug).toContain('RECORD_NOT_PUBLISHED');
    }
  });

  it('BYD SEAL and the Model 3 used by the web are available in PREVIEW', () => {
    expect(avail(BYD_SEAL_IDS.variant).availability).toBe('INTERNAL_AVAILABLE');
    expect(avail(MODEL3_2021_IDS.srp).availability).toBe('INTERNAL_AVAILABLE');
    expect(availableIn('INTERNAL_AVAILABLE', 'PREVIEW')).toBe(true);
    expect(availableIn('INTERNAL_AVAILABLE', 'PUBLIC')).toBe(false);
  });

  it('PUBLIC also requires an EXACT technical identity (Model 3 2021 is UNCONFIRMED)', () => {
    expect(avail(MODEL3_2021_IDS.srp).public.reasons).toContain('IDENTITY_NOT_EXACT');
  });

  it('field level: a blocked field hides only that field, the variant stays selectable', () => {
    const m3 = avail(MODEL3_2021_IDS.srp).preview;
    // EV Database (C07, secondary) values are hidden, the variant is still comparable.
    expect(m3.hidden.values.length).toBeGreaterThan(0);
    expect(m3.selectable).toBe(true);
    expect(m3.pendingSources).toContain('S08');
  });

  it('the comparability gate IS vehicle_page_eligibility (Catalog §8) on the visible fields', () => {
    for (const v of bundle.variants) {
      const input = publicationInputFromBundle(bundle, v.id);
      const filtered = filterBundleForChannel(bundle, 'PREVIEW');
      const visible = publicationInputFromBundle(filtered, v.id);
      const gate = !evaluatePublication(input, 'PREVIEW').reasons.includes('NO_COMPARABLE_CATEGORY');
      expect(gate, v.slug).toBe(vehiclePageEligible(visible));
    }
  });
});

describe('critical fields: identity', () => {
  const bundle = loadAllCases();
  /** Bundle con la fuente de la homologación de una variant cambiada a un código sin licencia. */
  function withIdentitySource(b: DatasetBundle, variantId: string, code: string): DatasetBundle {
    const v = b.variants.find((x) => x.id === variantId)!;
    const blockedSourceId = '00000000-0000-4000-8000-0000000000c7';
    return {
      ...b,
      sources: [...b.sources, { id: blockedSourceId, code, name: 'blocked', source_authority: 'OFFICIAL_MANUFACTURER', market_code: 'ES' }],
      homologations: b.homologations.map((h) => (h.id === v.homologation_id ? { ...h, source_id: blockedSourceId } : h)),
    };
  }

  it('a variant whose identity depends on a blocked source disappears from every channel', () => {
    const b = withIdentitySource(bundle, BYD_SEAL_IDS.variant, 'C01');
    const p = variantAvailability(publicationInputFromBundle(b, BYD_SEAL_IDS.variant));
    expect(p.availability).toBe('NOT_AVAILABLE');
    expect(p.preview.reasons).toContain('IDENTITY_SOURCE_NOT_ALLOWED');
  });

  it('filterBundleForChannel removes blocked fields and keeps the variants', () => {
    const pub = filterBundleForChannel(bundle, 'PUBLIC');
    expect(pub.variants.length).toBe(bundle.variants.length);
    const sources = new Map(bundle.sources.map((s) => [s.id, s.code]));
    for (const v of pub.spec_values) expect(['S01', 'S03'], sources.get(v.source_id)).toContain(sources.get(v.source_id));
    for (const p of pub.prices) expect(['S01', 'S03']).toContain(sources.get(p.source_id));
  });
});

describe('rights filtering never changes a quality decision', () => {
  it('hiding a secondary value does NOT resolve its conflict: the visible value stays out of the engines', () => {
    const bundle = loadAllCases();
    const m3 = (b: DatasetBundle) => b.spec_values.filter((v) => v.variant_id === MODEL3_2021_IDS.srp && v.spec_key === 'bat.capacity_kwh');
    const before = m3(bundle);
    expect(before.some((v) => v.source_authority === 'SECONDARY_REFERENCE')).toBe(true);
    const after = m3(filterBundleForChannel(bundle, 'PREVIEW'));
    expect(after.length).toBeGreaterThan(0);
    expect(after.every((v) => v.source_authority !== 'SECONDARY_REFERENCE')).toBe(true);
    expect(after.every((v) => v.status === 'CONFLICT')).toBe(true);
  });
});
