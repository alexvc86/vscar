import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import type { CuratedAttribute, CuratedObservation, CuratedTechnicalVehicle } from '@vscar/vehicle-schema';
import { pairSlug } from '../src/domain/catalog.ts';
import { DEFAULT_SCENARIO } from '../src/domain/scenario.ts';
import { diagnosticVehicle } from '../src/domain/technical-diagnostics.ts';
import { parsePairConditions, serializePairConditions, swapPair, withSide, type PairConditions } from '../src/domain/used-params.ts';
import { proxy, config } from '../src/proxy.ts';
import { checkInternalAuth, internalAuthEnabled } from '../src/server/internal-auth.ts';
import { serverDecisionView } from '../src/server/server-decision.ts';
import { comparisonData, memoryCatalog } from './support/catalog.ts';

/** Step D1.6 — ruta interna protegida, diagnóstico técnico y precio manual de coche nuevo. */

const PASS = 'correct-horse-battery-staple';
const ENV = { VSCAR_INTERNAL_USER: 'curator', VSCAR_INTERNAL_PASSWORD: PASS, VSCAR_PUBLICATION_CHANNEL: 'PREVIEW' };
const basic = (u: string, p: string) => `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}`;

describe('internal authorization (noindex is not access control)', () => {
  it('fails closed: no credentials, short password or PUBLIC channel → route disabled', () => {
    expect(checkInternalAuth(basic('curator', PASS), {})).toBe('disabled');
    expect(checkInternalAuth(basic('curator', 'short'), { ...ENV, VSCAR_INTERNAL_PASSWORD: 'short' })).toBe('disabled');
    expect(checkInternalAuth(basic('curator', PASS), { ...ENV, VSCAR_PUBLICATION_CHANNEL: 'PUBLIC' })).toBe('disabled');
    expect(internalAuthEnabled(ENV)).toBe(true);
  });

  it('requires valid Basic credentials', () => {
    expect(checkInternalAuth(undefined, ENV)).toBe('unauthorized');
    expect(checkInternalAuth('Bearer x', ENV)).toBe('unauthorized');
    expect(checkInternalAuth(basic('curator', 'wrong-password-123456'), ENV)).toBe('unauthorized');
    expect(checkInternalAuth(basic('other', PASS), ENV)).toBe('unauthorized');
    expect(checkInternalAuth(basic('curator', PASS), ENV)).toBe('ok');
  });

  it('proxy: only /internal/*; 404 when disabled, 401 with challenge, never indexable', () => {
    expect(config.matcher).toEqual(['/internal/:path*']);
    const saved = { ...process.env };
    try {
      delete process.env.VSCAR_INTERNAL_USER;
      delete process.env.VSCAR_INTERNAL_PASSWORD;
      expect(proxy(new NextRequest('http://localhost/internal/catalog')).status).toBe(404);
      Object.assign(process.env, ENV);
      const denied = proxy(new NextRequest('http://localhost/internal/catalog'));
      expect(denied.status).toBe(401);
      expect(denied.headers.get('www-authenticate')).toMatch(/^Basic realm=/);
      expect(denied.headers.get('x-robots-tag')).toMatch(/noindex/);
      const ok = proxy(new NextRequest('http://localhost/internal/catalog', { headers: { authorization: basic('curator', PASS) } }));
      expect(ok.status).toBe(200);
      expect(ok.headers.get('x-robots-tag')).toMatch(/noindex/);
      expect(ok.headers.get('cache-control')).toMatch(/no-store/);
    } finally {
      for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
      Object.assign(process.env, saved);
    }
  });
});

describe('technical diagnostics view', () => {
  const id = '11111111-1111-5111-8111-111111111111';
  const vehicle: CuratedTechnicalVehicle = {
    id,
    market_code: 'ES',
    technical_key: 'E2*2007/46*0628*30|B|YHZT-B21700',
    brand: 'Peugeot',
    model: '308',
    technical_identity: { type_approval_number: 'E2*2007/46*0628*30', variant_code: 'B', version_code: 'YHZT-B21700', confidence: 'EXACT' },
    homologation_powertrain: 'ICE',
    product_class: 'ICE_OR_MHEV',
    registration_period: { first_observed_year: 2024, last_observed_year: 2024 },
    commercial_identity_status: 'PARTIAL',
    curation_status: 'CURATED',
    source_codes: ['S01'],
    blockers: ['generation not verified (no source)', 'critical key missing: cap.boot_l'],
  };
  const attr: CuratedAttribute = { id: '22222222-2222-5222-8222-222222222222', vehicle_id: id, kind: 'COMMERCIAL', attribute: 'commercial_designation', value: '308 5P ALLURE', status: 'PARTIAL', source_code: 'S01', source_record: 'S01:x', retrieved_at: '2026-10-16', rights_status: 'CONDITIONAL', evidence: 'EEA Cn' };

  it('shows identity and missing data; generation/model year/trim stay unverified; never comparable', () => {
    const d = diagnosticVehicle({ vehicle, attributes: [attr], observations: [] as CuratedObservation[], sources: [] });
    expect(d.technicalIdentity).toEqual({ tan: 'E2*2007/46*0628*30', variant: 'B', version: 'YHZT-B21700', confidence: 'EXACT' });
    expect(d.commercial).toEqual({ generation: null, modelYear: null, trim: null, designation: '308 5P ALLURE' });
    expect(d.registration).toBe('2024');
    expect(d.missing).toEqual(['cap.boot_l']);
    expect(d.comparison).toEqual({ available: false, reason: 'NOT_IN_SELECTABLE_CATALOG' });
  });
});

const GOLF = 'volkswagen-golf-style-1-5-etsi-150-dsg';
const BYD = 'byd-seal-2026-design-rwd-82-5-kwh';
const TODAY = '2026-10-21';

describe('manual new-car purchase price (URL contract)', () => {
  it('a NEW side accepts {side}_price as a user-provided price; invalid values are dropped and reported', () => {
    const { pair, invalid } = parsePairConditions(new URLSearchParams('a_price=31000&b_price=-5'), TODAY);
    expect(pair.a).toEqual({ condition: 'new', price: 31_000 });
    expect(pair.b).toEqual({ condition: 'new' });
    expect(invalid).toEqual(['b_price']);
    expect(pair.evaluationDate).toBeUndefined();
  });

  it('empty price = no price (never invented); other used facts on a NEW side are still rejected', () => {
    const { pair, invalid } = parsePairConditions(new URLSearchParams('a_price=&a_km=1000'), TODAY);
    expect(pair.a).toEqual({ condition: 'new' });
    expect(invalid).toEqual(['a_km']);
  });

  it('serialises deterministically, survives swap and is dropped when the car changes', () => {
    const p: PairConditions = { a: { condition: 'new', price: 31_000 }, b: { condition: 'new' } };
    expect(serializePairConditions(p)).toBe('a_price=31000');
    expect(parsePairConditions(new URLSearchParams(serializePairConditions(p)), TODAY).pair).toEqual(p);
    expect(serializePairConditions(swapPair(p))).toBe('b_price=31000');
    expect(withSide(p, 'a', { condition: 'new' }, TODAY).a).toEqual({ condition: 'new' });
  });

  it('used sides keep their contract (u=1, asking price) next to a priced new side', () => {
    const q = 'u=1&a_price=30000&b=used&b_price=21000&b_km=60000&eval=2026-10-15';
    const { pair } = parsePairConditions(new URLSearchParams(q), TODAY);
    expect(pair.a).toEqual({ condition: 'new', price: 30_000 });
    expect(pair.b).toMatchObject({ condition: 'used', facts: { price: 21_000, km: 60_000 } });
    expect(serializePairConditions(pair)).toBe('u=1&a_price=30000&b=used&b_price=21000&b_km=60000&eval=2026-10-15');
  });
});

describe('manual new-car price in economics (Economic Fit unchanged)', async () => {
  const slug = pairSlug(BYD, GOLF);
  const without = serverDecisionView(await comparisonData(slug, memoryCatalog(), { a: { condition: 'new' }, b: { condition: 'new' } }), DEFAULT_SCENARIO).view;
  const withPrice = serverDecisionView(await comparisonData(slug, memoryCatalog(), { a: { condition: 'new', price: 39_990 }, b: { condition: 'new' } }), DEFAULT_SCENARIO).view;

  it('the price is labelled as entered by the user (OVERRIDE, USER_PROVIDED), never as a list price', () => {
    expect(withPrice.economics.perSide.a.purchase).toEqual({ amount: 3_999_000, source: 'OVERRIDE', basis: 'USER_PROVIDED' });
  });

  it('running cost, Economic Fit ranking and overall result do not change', () => {
    expect(withPrice.economics.perSide.a.annual).toEqual(without.economics.perSide.a.annual);
    expect(withPrice.economics.status).toBe(without.economics.status);
    expect(withPrice.economics.leader).toBe(without.economics.leader);
    expect(withPrice.status).toBe(without.status);
  });

  it('without a price the energy comparison still runs and no price is invented', () => {
    expect(without.economics.perSide.a.annual).toBeDefined();
    expect(without.economics.perSide.a.purchase?.source).not.toBe('OVERRIDE');
  });
});
