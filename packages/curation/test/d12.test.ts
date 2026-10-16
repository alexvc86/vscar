import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { IdaeRecord } from '@vscar/data-connectors';
import {
  CommercialIdentityArtifact,
  buildCandidates,
  catalogOverlap,
  isDetailedDesignation,
  summarizeCommercialEvidence,
  validateCommercialEntry,
  type CommercialIdentityEntry,
} from '../src/index.ts';

/** Step D1.2 — identidad comercial ≠ técnica, anti-invención, duplicados con el catálogo. */

const entry = (o: Partial<CommercialIdentityEntry>): CommercialIdentityEntry => ({
  candidateId: '00000000-0000-4000-8000-000000000001',
  rank: 1,
  technicalIdentityKey: 'E2*2007/46*0628*30|B|YHZT-B21700',
  commercialBrand: 'Peugeot',
  commercialGeneration: null,
  commercialModelYear: null,
  market: 'ES',
  evidence: [{ sourceId: 'S01', record: '2024F:E2*2007/46*0628*30|B|YHZT-B21700', field: 'Cn', text: '308 5P ALLURE BLUEHDI 130 S&S EAT8', registrations: 536, share: 1 }],
  identityConfidence: 'EXACT',
  evidenceRights: 'CONDITIONAL',
  notes: [],
  commercialModel: '308',
  commercialTrim: 'ALLURE',
  ...o,
});

describe('commercial identity — anti-invention validator', () => {
  it('EXACT: every value appears literally in the cited official text', () => {
    expect(validateCommercialEntry(entry({ commercialEngine: 'BLUEHDI 130', commercialTransmission: 'EAT8', commercialBody: '5P' }))).toEqual([]);
  });

  it('a trim (or engine) that is not in the evidence is rejected — no guessing', () => {
    expect(validateCommercialEntry(entry({ commercialTrim: 'GT LINE' }))[0]).toMatch(/does not appear literally/);
    expect(validateCommercialEntry(entry({ commercialTransmission: 'automatic' }))[0]).toMatch(/does not appear literally/);
  });

  it('a token is matched on word boundaries (no "GT" inside another word)', () => {
    const e = entry({ evidence: [{ sourceId: 'S01', record: 'x', field: 'Cn', text: 'SPORTAGE GTLINE', share: 1 }], commercialModel: 'SPORTAGE', commercialTrim: 'GT' });
    expect(validateCommercialEntry(e)[0]).toMatch(/GT/);
  });

  it('EXACT needs one trim and ≥ 95 % of the exact-key registrations; several trims are PARTIAL with a trim set', () => {
    const shared = entry({ evidence: [{ sourceId: 'S01', record: 'x', field: 'Cn', text: '208 5P ACTIVE BLUEHDI 100', share: 0.9056 }], commercialModel: '208', commercialTrim: 'ACTIVE' });
    expect(validateCommercialEntry(shared)).toContain('trim from an EEA designation requires ≥ 95 % of the exact key registrations');
    expect(validateCommercialEntry(entry({ commercialTrim: undefined }))).toContain('EXACT requires a single evidenced trim');
    const partial = entry({
      identityConfidence: 'PARTIAL',
      commercialTrim: undefined,
      commercialTrimSet: ['ACTIVE', 'ACTIVE PACK'],
      commercialModel: '208',
      evidence: [
        { sourceId: 'S01', record: 'x', field: 'Cn', text: '208 5P ACTIVE BLUEHDI 100 S&S 6 VEL MAN', share: 0.9056 },
        { sourceId: 'S01', record: 'x', field: 'Cn', text: '208 5P ACTIVE PACK BLUEHDI 100 S&S 6 VEL MAN', share: 0.0944 },
      ],
    });
    expect(validateCommercialEntry(partial)).toEqual([]);
    expect(validateCommercialEntry({ ...partial, commercialTrim: 'ACTIVE' })).toContain('PARTIAL cannot carry a single trim (use commercialTrimSet)');
  });

  it('RDW permitted names are never the sole evidence of a commercial identity', () => {
    const e = entry({ evidence: [{ sourceId: 'S11', record: 'S11:x5v3-sewk:k', field: 'handelsbenamingfabrikant', text: '308 ALLURE' }] });
    expect(validateCommercialEntry(e)).toContain('RDW handelsbenaming lists every permitted name of the approval: never sole evidence of commercial identity');
  });

  it('non-redistributable evidence (IDAE) is resolved from the local raw file by reference', () => {
    const e = entry({ evidence: [{ sourceId: 'S02', record: 'S02:aaaaaaaaaaaa:L10', field: 'Modelo+Vehiculo' }], commercialModel: 'SEAL', commercialTrim: 'Design', evidenceRights: 'PENDING_REVIEW' });
    expect(validateCommercialEntry(e, () => undefined)).toContain('no resolvable evidence text');
    expect(validateCommercialEntry(e, () => 'SEAL Design (SE2R1C/2NTE5F002NL1)')).toEqual([]);
  });

  it('the versioned D1.2 artifact is schema-valid, leaves generation/model year null and never carries IDAE text', () => {
    const art = CommercialIdentityArtifact.parse(JSON.parse(readFileSync(fileURLToPath(new URL('../../../docs/data/d12/commercial-identity-v1.json', import.meta.url)), 'utf8')));
    expect(art.entries.length).toBe(22);
    for (const e of art.entries) {
      expect(e.commercialGeneration).toBeNull();
      expect(e.commercialModelYear).toBeNull();
      for (const r of e.evidence.filter((x) => x.sourceId === 'S02')) expect(r.text).toBeUndefined();
      // S01 (CC BY) evidence is self-contained: validate without any resolver.
      if (e.evidence.every((x) => x.sourceId === 'S01')) expect(validateCommercialEntry(e)).toEqual([]);
    }
    expect(art.entries.filter((e) => e.identityConfidence === 'EXACT').map((e) => e.rank).sort((a, b) => a - b)).toEqual([2, 4, 26]);
  });
});

describe('automatic commercial evidence', () => {
  const group = (va: string, ve: string) => ({
    key: 'k', memberState: 'ES', year: 2025, status: 'F' as const, tan: 'E13*2018/858*00639*00', tanRaw: [], tanBase: 'E13*2018/858*00639', types: ['EKE'], variant: va, version: ve,
    make: 'BYD', commercialNames: ['BYD SEAL'], fuelTypes: ['ELECTRIC'], fuelModes: ['E'], homologationPowertrain: 'BEV' as const, registrations: 500, sourceRows: 500,
    distributions: { 'Ep (KW)': [[390, 500]] as Array<[number, number]> }, conflicts: [],
  });
  const cand = buildCandidates({ groups: [group('SE2D1C', '1NXE5E001NL1')], idae: [], rawSha256: { S01: ['1'.repeat(64)], S02: [] } }).candidates[0]!;
  const idae = (line: number, model: string, version: string): IdaeRecord => ({
    sourceRecordId: `S02:x:L${line}`, line, makeRaw: 'BYD', make: 'BYD', scope: 'MAINLAND', model, version, segment: '', motorizacion: 'Eléctricos puros', powertrain: 'BEV', category: 'M1', dates: {},
    hints: { kw: [], cv: [], codeCandidate: { variant: 'SE2D1C', version: '1NXE5E001NL1' } }, values: {}, unmapped: {}, issues: [],
  });

  it('a Va/Ve code printed for another model is flagged as a collision (BYD SEAL vs BYD HAN)', () => {
    const s = summarizeCommercialEvidence(cand, new Map([['BYD SEAL', 556]]), [idae(1, 'SEAL', 'Excellence AWD (SE2D1C/1NXE5E001NL1)'), idae(2, 'HAN', 'Executive (SE2D1C/1NXE5E001NL1)')]);
    expect(s.level).toBe('CODE_VERSION_TEXT');
    expect(s.idaeCodeCollision).toBe(true);
    expect(s.indicative).toBe('PARTIAL');
  });

  it('designation levels: model only vs detailed; never EXACT automatically', () => {
    expect(isDetailedDesignation('BYD SEAL', 'BYD', 'BYD SEAL')).toBe(false);
    expect(isDetailedDesignation('308 5P ALLURE BLUEHDI 130 S&S EAT8', 'Peugeot', 'Peugeot 308')).toBe(true);
    const s = summarizeCommercialEvidence(cand, new Map([['BYD SEAL', 556]]), []);
    expect(s).toMatchObject({ level: 'MODEL_ONLY', indicative: 'PARTIAL' });
    expect(summarizeCommercialEvidence(cand, new Map(), []).indicative).toBe('UNCONFIRMED');
  });
});

describe('canonical identity vs the existing catalogue (duplicates)', () => {
  const key = { tan: 'E13*2018/858*00639*03', variant: 'SE2R1C', version: '2NTE5F002NL1' };

  it('full TAN + Va + Ve equal → DUPLICATE (case-insensitive TAN)', () => {
    expect(catalogOverlap({ tan: 'E1*2007/46*0623*33', variant: 'GAC4DACAX0', version: 'V' }, [{ variantSlug: 'golf', tan: 'e1*2007/46*0623*33', variant: 'GAC4DACAX0', version: 'V' }])[0]!.kind).toBe('DUPLICATE');
  });

  it('catalogue without TAN (BYD SEAL DC-08) or with a base TAN only → probable duplicate, never merged', () => {
    expect(catalogOverlap(key, [{ variantSlug: 'dc-08', variant: 'SE2R1C', version: '2NTE5F002NL1' }])[0]!.kind).toBe('PROBABLE_DUPLICATE_TAN_INCOMPLETE');
    expect(catalogOverlap(key, [{ variantSlug: 'x', tan: 'e13*2018/858*00639', variant: 'SE2R1C', version: '2NTE5F002NL1' }])[0]!.kind).toBe('PROBABLE_DUPLICATE_TAN_INCOMPLETE');
  });

  it('same Va/Ve under another full extension is a related revision, not a duplicate', () => {
    expect(catalogOverlap(key, [{ variantSlug: 'x', tan: 'E13*2018/858*00639*00', variant: 'SE2R1C', version: '2NTE5F002NL1' }])[0]!.kind).toBe('RELATED_OTHER_EXTENSION');
  });

  it('partial matches never count: other variant, other version, other approval', () => {
    expect(catalogOverlap(key, [{ variantSlug: 'x', tan: 'E13*2018/858*00639*03', variant: 'SE2D1C', version: '2NTE5F002NL1' }])).toEqual([]);
    expect(catalogOverlap(key, [{ variantSlug: 'x', tan: 'E13*2018/858*00639*03', variant: 'SE2R1C', version: 'OTHER' }])).toEqual([]);
    expect(catalogOverlap(key, [{ variantSlug: 'x', tan: 'E13*KS18/858*00023*01', variant: 'SE2R1C', version: '2NTE5F002NL1' }])).toEqual([]);
  });

  it('catalogue identity without version (TAN + Va only) is reported as partial identity', () => {
    expect(catalogOverlap({ tan: 'E4*2007/46*1293*25', variant: 'E6LR', version: 'X' }, [{ variantSlug: 'm3', tan: 'e4*2007/46*1293', variant: 'E6LR' }])[0]!.kind).toBe('CATALOG_PARTIAL_IDENTITY');
  });
});
