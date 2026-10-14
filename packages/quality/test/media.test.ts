import { describe, expect, it } from 'vitest';
import { VehicleModelMedia, type VehicleModelMediaInput } from '@vscar/vehicle-schema';
import { mediaPublication, selectModelMedia } from '../src/index.ts';

/** Registros SINTÉTICOS (solo tests): no apuntan a ningún asset real. */
const media = (over: Partial<VehicleModelMediaInput> & { id: string }): VehicleModelMedia =>
  VehicleModelMedia.parse({
    brand: 'Volkswagen',
    model: 'Golf',
    role: 'SELECTOR',
    media_type: 'IMAGE',
    asset_path: '/media/synthetic/golf.webp',
    width: 640,
    height: 360,
    origin: 'SELF_CREATED',
    rights_status: 'VERIFIED',
    license: 'VScar original (synthetic test)',
    verified_at: '2026-10-13',
    ...over,
  });

const ID = (n: number) => `00000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;
const golf = media({ id: ID(1) });
const golfMk7 = media({ id: ID(2), generation_code: 'Mk7' });
const pendingMk8 = media({ id: ID(3), generation_code: 'Mk8', origin: 'MANUFACTURER_VERIFIED', rights_status: 'PENDING', license: undefined, verified_at: undefined });

describe('media rights ≠ data rights', () => {
  it('VERIFIED/CONDITIONAL → public; PENDING → preview only; DENIED or unverified origin → never', () => {
    expect(mediaPublication(golf)).toBe('PUBLISHABLE');
    expect(mediaPublication(pendingMk8)).toBe('PREVIEW_ONLY');
    expect(mediaPublication({ rights_status: 'DENIED', origin: 'LICENSED' })).toBe('BLOCKED');
    expect(mediaPublication({ rights_status: 'PENDING', origin: 'UNVERIFIED' })).toBe('PREVIEW_ONLY');
  });
  it('the schema refuses verified rights without license, and an unverified origin with verified rights', () => {
    expect(() => media({ id: ID(4), license: undefined })).toThrow(/license/);
    expect(() => media({ id: ID(5), origin: 'UNVERIFIED' })).toThrow(/UNVERIFIED/);
    expect(() => media({ id: ID(6), rights_status: 'CONDITIONAL' })).toThrow(/attribution/);
  });
});

describe('selection and fallback order: generation → model → SVG', () => {
  const all = [golf, golfMk7, pendingMk8];
  it('exact generation media wins over the generic model media', () => {
    const r = selectModelMedia(all, { brand: 'Volkswagen', model: 'Golf', generation: 'Mk7', role: 'SELECTOR', channel: 'PUBLIC' });
    expect([r.match, r.media?.id]).toEqual(['GENERATION', golfMk7.id]);
  });
  it('without generation media, the model media is used', () => {
    const r = selectModelMedia(all, { brand: 'volkswagen', model: 'GOLF', generation: 'Mk6', role: 'SELECTOR', channel: 'PUBLIC' });
    expect([r.match, r.media?.id]).toEqual(['MODEL', golf.id]);
  });
  it('PUBLIC: a PENDING image is never delivered (falls back); PREVIEW: delivered and flagged', () => {
    const pub = selectModelMedia([pendingMk8], { brand: 'Volkswagen', model: 'Golf', generation: 'Mk8', role: 'SELECTOR', channel: 'PUBLIC' });
    expect(pub).toEqual({ match: 'FALLBACK', previewOnly: false });
    const pre = selectModelMedia([pendingMk8], { brand: 'Volkswagen', model: 'Golf', generation: 'Mk8', role: 'SELECTOR', channel: 'PREVIEW' });
    expect([pre.match, pre.previewOnly]).toEqual(['GENERATION', true]);
  });
  it('no media at all → SVG fallback (never a card without visual)', () => {
    expect(selectModelMedia([], { brand: 'BYD', model: 'SEAL', role: 'SELECTOR', channel: 'PREVIEW' })).toEqual({ match: 'FALLBACK', previewOnly: false });
  });
  it('THUMBNAIL may reuse a SELECTOR image; never a HERO one', () => {
    expect(selectModelMedia([golf], { brand: 'Volkswagen', model: 'Golf', role: 'THUMBNAIL', channel: 'PUBLIC' }).media?.id).toBe(golf.id);
    expect(selectModelMedia([media({ id: ID(7), role: 'HERO' })], { brand: 'Volkswagen', model: 'Golf', role: 'THUMBNAIL', channel: 'PUBLIC' }).match).toBe('FALLBACK');
  });
  it('year-ranged media only applies inside its range', () => {
    const ranged = media({ id: ID(8), model_year_from: 2020, model_year_to: 2023 });
    expect(selectModelMedia([ranged], { brand: 'Volkswagen', model: 'Golf', modelYear: 2018, role: 'SELECTOR', channel: 'PUBLIC' }).match).toBe('FALLBACK');
    expect(selectModelMedia([ranged], { brand: 'Volkswagen', model: 'Golf', modelYear: 2021, role: 'SELECTOR', channel: 'PUBLIC' }).match).toBe('MODEL');
  });
});
