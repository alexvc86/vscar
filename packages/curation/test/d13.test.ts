import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CatalogReference, CatalogReferenceArtifact, validateCatalogReference, type CatalogReference as Ref } from '../src/index.ts';

/** Step D1.3 — referencias a catálogos restringidos: sin valores, estados de correspondencia con reglas de evidencia. */

const d13 = (f: string) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../../docs/data/d13/${f}`, import.meta.url)), 'utf8'));

const ref = (o: Partial<Ref>): Ref => ({
  rank: 26,
  candidateId: '00000000-0000-4000-8000-000000000001',
  site: 'km77',
  url: 'https://www.km77.com/coches/peugeot/308/2021/estandar/allure/x/datos',
  consultedAt: '2026-10-16',
  method: 'SEARCH_ENGINE',
  pageLabel: 'Peugeot 308 Allure',
  fieldsLocated: ['brand_model', 'trim', 'power', 'boot'],
  matchStatus: 'MATCH_COMPATIBLE_UNCONFIRMED',
  matchBasis: ['engine, power and body compatible with EEA key'],
  rightsStatus: 'RESTRICTED',
  valuesStored: false,
  ...o,
});

describe('catalog reference validator', () => {
  it('a compatible reference passes', () => {
    expect(validateCatalogReference(ref({}))).toEqual([]);
  });

  it('MATCH_CONFIRMED requires type-approval ids on the page and a TAN basis', () => {
    const issues = validateCatalogReference(ref({ matchStatus: 'MATCH_CONFIRMED' }));
    expect(issues).toHaveLength(2);
    expect(validateCatalogReference(ref({ matchStatus: 'MATCH_CONFIRMED', fieldsLocated: ['type_approval_ids'], matchBasis: ['TAN e2*2007/46*0628*30 + Va/Ve on page'] }))).toEqual([]);
  });

  it('MATCH_REJECTED must state the contradicting fact', () => {
    expect(validateCatalogReference(ref({ matchStatus: 'MATCH_REJECTED' }))[0]).toMatch(/contradicting/);
    expect(validateCatalogReference(ref({ matchStatus: 'MATCH_REJECTED', matchBasis: ['AWD contradicts RDW RWD'] }))).toEqual([]);
  });

  it('values are never stored and rights are always RESTRICTED (schema-level)', () => {
    expect(CatalogReference.safeParse({ ...ref({}), valuesStored: true }).success).toBe(false);
    expect(CatalogReference.safeParse({ ...ref({}), rightsStatus: 'OPEN' }).success).toBe(false);
    expect(CatalogReference.safeParse({ ...ref({}), bootLitres: 412 }).success).toBe(false);
  });
});

describe('D1.3 artifacts', () => {
  const refs = CatalogReferenceArtifact.parse(d13('catalog-references-v1.json'));

  it('every reference is valid and none is MATCH_CONFIRMED (no catalogue page shows TAN/Va/Ve)', () => {
    expect(refs.references.flatMap(validateCatalogReference)).toEqual([]);
    expect(refs.references.some((r) => r.matchStatus === 'MATCH_CONFIRMED')).toBe(false);
    expect(refs.references.some((r) => r.fieldsLocated.includes('type_approval_ids'))).toBe(false);
  });

  it('D2 readiness: 20 candidates, none importable, no generation/model year invented', () => {
    const r = d13('d2-readiness.json') as Array<{ status: string; previewImportable: boolean; blockers: { identity: string[] }; traficom: { firstRegistration?: unknown } | null }>;
    expect(r).toHaveLength(20);
    expect(r.every((x) => !x.previewImportable)).toBe(true);
    expect(r.every((x) => x.blockers.identity.includes('generation_code: no reusable evidence') && x.blockers.identity.includes('model_year: no reusable evidence'))).toBe(true);
    expect(new Set(r.map((x) => x.status))).toEqual(new Set(['DUPLICATE', 'CONFLICTED', 'IDENTITY_PENDING']));
  });

  it('acquisition manifests: Traficom only (Flow A), checksummed, redistributable; no catalogue manifests', () => {
    const m = d13('acquisition-manifests.json') as Array<{ sourceId: string; sha256: string; redistributable: boolean }>;
    expect(m.length).toBe(3);
    expect(m.every((x) => x.sourceId === 'S13' && /^[0-9a-f]{64}$/.test(x.sha256) && x.redistributable)).toBe(true);
  });
});
