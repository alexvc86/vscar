import { describe, expect, it } from 'vitest';
import { SpecValue, type CuratedObservation, type CuratedTechnicalVehicle } from '@vscar/vehicle-schema';
import { diagnosticVehicle } from '../src/domain/technical-diagnostics.ts';

/**
 * Step D1.7 — la vista interna con el perfil de las 74 homologaciones nuevas: identidad comercial UNCONFIRMED (sin
 * designación ni acabado), conflictos conservados, derechos pendientes. Nada se completa ni se vuelve comparable.
 */
const id = '33333333-3333-5333-8333-333333333333';
const vehicle: CuratedTechnicalVehicle = {
  id,
  market_code: 'ES',
  technical_key: 'E9*2007/46*0001*10|A|B1',
  brand: 'Hyundai',
  model: 'Kona',
  technical_identity: { type_approval_number: 'E9*2007/46*0001*10', variant_code: 'A', version_code: 'B1', confidence: 'EXACT' },
  homologation_powertrain: 'NOVC_HEV',
  product_class: 'HEV_OR_MHEV',
  registration_period: { first_observed_year: 2023, last_observed_year: 2024 },
  commercial_identity_status: 'UNCONFIRMED',
  curation_status: 'CURATED',
  source_codes: ['S01', 'S11'],
  d1_rank: 59,
  blockers: ['generation not verified (no source)', 'model_year not verified (no source)', 'trim not confirmed', 'critical key missing: cap.boot_l'],
};
const obs = (k: number, source: 'S01' | 'S11', value: number): CuratedObservation => ({
  value: SpecValue.parse({ id: `44444444-4444-5444-8444-00000000000${k}`, variant_id: id, spec_key: 'nrg.fuel_combined_l100', value, unit: 'L/100 km', source_id: '00000000-0000-4000-8000-00000000c001', source_url: source === 'S01' ? 'https://discodata.eea.europa.eu/' : 'https://opendata.rdw.nl/', source_market: 'ES', reference_market: 'ES', source_authority: 'OFFICIAL_AUTHORITY', mapping_confidence: 'EXACT', homologation_match: 'NOT_APPLICABLE', retrieved_at: '2026-10-16', test_cycle: 'WLTP', measurement_basis: { consumption_basis: 'COMBINED' } }),
  source_code: source,
  source_record: `${source}:E9*2007/46*0001*10|A|B1`,
  identity_match: 'EXACT_TAN_VA_VE',
  rights_status: source === 'S01' ? 'CONDITIONAL' : 'PENDING',
  quality_status: 'NOT_USABLE',
  quality_reasons: ['conflict'],
  conflict_status: 'IN_CONFLICT',
  conflict_group: 'nrg.fuel_combined_l100',
});

describe('internal view with the D1.7 vehicles', () => {
  const d = diagnosticVehicle({ vehicle, attributes: [], observations: [obs(1, 'S01', 4.6), obs(2, 'S11', 5.1)], sources: [] });

  it('UNCONFIRMED commercial identity stays empty: no generation, model year, trim or designation is filled in', () => {
    expect(d.commercial).toEqual({ generation: null, modelYear: null, trim: null, designation: null });
    expect(d.commercialStatus).toBe('UNCONFIRMED');
  });

  it('both conflicting values are shown with their source and rights; none is usable; the vehicle is never comparable', () => {
    expect(d.quality).toEqual({ usable: 0, notUsable: 2, inConflict: 2 });
    expect(d.observations.map((o) => [o.source, o.rights, o.conflict])).toEqual([
      ['S01', 'CONDITIONAL', 'IN_CONFLICT'],
      ['S11', 'PENDING', 'IN_CONFLICT'],
    ]);
    expect(d.comparison).toEqual({ available: false, reason: 'NOT_IN_SELECTABLE_CATALOG' });
  });

  it('registration period is shown as registration, never as model year; missing keys are listed, not zero', () => {
    expect(d.registration).toBe('2023–2024');
    expect(d.missing).toEqual(['cap.boot_l']);
  });
});
