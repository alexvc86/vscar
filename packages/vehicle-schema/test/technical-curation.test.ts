import { describe, expect, it } from 'vitest';
import { CuratedAttribute, CuratedObservation, CuratedTechnicalVehicle, SpecValue, technicalKeyOf, type CuratedTechnicalVehicleInput } from '../src/index.ts';

/** Step D1.6 — capa de curación técnica: identidad exacta obligatoria, identidad comercial opcional, sin inventar. */

const id = '11111111-1111-5111-8111-111111111111';
const identity = { type_approval_number: 'E1*2007/46*0623*35', variant_code: 'GAC4DACAX0', version_code: 'FM6FM6AJ015N7CPON1ML1BVR2NA', confidence: 'EXACT' as const };
const vehicle = (o: Partial<CuratedTechnicalVehicleInput> = {}): CuratedTechnicalVehicleInput => ({
  id,
  market_code: 'ES',
  technical_key: technicalKeyOf(identity),
  brand: 'Volkswagen',
  model: 'Golf',
  technical_identity: identity,
  homologation_powertrain: 'ICE',
  product_class: 'ICE_OR_MHEV',
  fuel_type: 'petrol',
  registration_period: { first_observed_year: 2018, last_observed_year: 2018 },
  commercial_identity_status: 'UNCONFIRMED',
  curation_status: 'CURATED',
  source_codes: ['S01', 'S11'],
  blockers: [],
  ...o,
});
const attr = (o: Partial<CuratedAttribute>) => ({ id: '22222222-2222-5222-8222-222222222222', vehicle_id: id, kind: 'TECHNICAL', attribute: 'seats', value: '5', status: 'OBSERVED', source_code: 'S11', source_record: 'S11:x', retrieved_at: '2026-10-16', rights_status: 'PENDING', evidence: 'RDW', ...o });
const value = SpecValue.parse({ id: '33333333-3333-5333-8333-333333333333', variant_id: id, spec_key: 'dim.mass_kg', value: 1315, unit: 'kg', source_id: '44444444-4444-5444-8444-444444444444', source_url: 'https://discodata.eea.europa.eu/', source_market: 'ES', reference_market: 'ES', source_authority: 'OFFICIAL_AUTHORITY', mapping_confidence: 'EXACT', homologation_match: 'NOT_APPLICABLE', retrieved_at: '2026-10-16', measurement_basis: { mass_definition: 'EU_RUNNING_ORDER' } });
const obs = (o: Partial<CuratedObservation> = {}) => ({ value, source_code: 'S01', source_record: 'S01:x', identity_match: 'EXACT_TAN_VA_VE', rights_status: 'CONDITIONAL', quality_status: 'USABLE', quality_reasons: [], conflict_status: 'NONE', ...o });

describe('technical identity', () => {
  it('requires the full TAN with extension + variant + version, EXACT', () => {
    expect(CuratedTechnicalVehicle.safeParse(vehicle()).success).toBe(true);
    const noExt = { ...identity, type_approval_number: 'E1*2007/46*0623' };
    expect(CuratedTechnicalVehicle.safeParse(vehicle({ technical_identity: noExt, technical_key: technicalKeyOf(noExt) })).success).toBe(false);
    expect(CuratedTechnicalVehicle.safeParse(vehicle({ technical_identity: { ...identity, confidence: 'PARTIAL' as never } })).success).toBe(false);
  });

  it('the canonical key is TAN|Va|Ve (normalised), never brand+model(+year)', () => {
    expect(technicalKeyOf({ ...identity, type_approval_number: 'e1*2007/46*0623*35 ' })).toBe('E1*2007/46*0623*35|GAC4DACAX0|FM6FM6AJ015N7CPON1ML1BVR2NA');
    expect(CuratedTechnicalVehicle.safeParse(vehicle({ technical_key: 'Volkswagen|Golf|2018' })).success).toBe(false);
  });
});

describe('commercial identity is optional and never invented', () => {
  it('a vehicle without generation, model year or trim is valid (UNCONFIRMED)', () => {
    const v = CuratedTechnicalVehicle.parse(vehicle());
    expect(v.commercial_identity_status).toBe('UNCONFIRMED');
    expect(Object.keys(v)).not.toEqual(expect.arrayContaining(['generation_code', 'model_year', 'trim_name']));
  });

  it('registration years are a period, not a model year', () => {
    expect(CuratedTechnicalVehicle.safeParse(vehicle({ registration_period: { first_observed_year: 2020, last_observed_year: 2018 } })).success).toBe(false);
    expect(CuratedAttribute.safeParse(attr({ kind: 'COMMERCIAL', attribute: 'model_year', value: '2018', status: 'UNCONFIRMED', source_code: 'S01', evidence: 'first registration year in EEA' })).success).toBe(false);
  });

  it('technical facts are OBSERVED; commercial candidates carry their own status', () => {
    expect(CuratedAttribute.safeParse(attr({})).success).toBe(true);
    expect(CuratedAttribute.safeParse(attr({ status: 'EXACT' })).success).toBe(false);
    expect(CuratedAttribute.safeParse(attr({ kind: 'COMMERCIAL', attribute: 'generation', value: 'Mk7', status: 'OBSERVED' })).success).toBe(false);
    expect(CuratedAttribute.safeParse(attr({ kind: 'COMMERCIAL', attribute: 'trim', value: 'ALLURE', status: 'EXACT', source_code: 'S01', evidence: 'literal in EEA designation' })).success).toBe(true);
    expect(CuratedAttribute.safeParse(attr({ kind: 'TECHNICAL', attribute: 'trim' })).success).toBe(false);
  });
});

describe('observations', () => {
  it('reuse SpecValue validation per SpecKey (unit mismatch rejected)', () => {
    expect(CuratedObservation.safeParse(obs()).success).toBe(true);
    expect(CuratedObservation.safeParse(obs({ value: { ...value, unit: 'lb' } })).success).toBe(false);
  });

  it('rights isolation: DENIED sources and research/secondary data are never curated', () => {
    expect(CuratedObservation.safeParse(obs({ rights_status: 'DENIED' })).success).toBe(false);
    expect(CuratedObservation.safeParse(obs({ value: { ...value, source_authority: 'SECONDARY_REFERENCE' } })).success).toBe(false);
  });

  it('conflicting values are kept with a conflict group (no average)', () => {
    expect(CuratedObservation.safeParse(obs({ conflict_status: 'IN_CONFLICT' })).success).toBe(false);
    expect(CuratedObservation.safeParse(obs({ conflict_status: 'IN_CONFLICT', conflict_group: 'dim.mass_kg:abc' })).success).toBe(true);
  });
});
