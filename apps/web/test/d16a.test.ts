import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { pairSlug } from '../src/domain/catalog.ts';
import { DEFAULT_SCENARIO } from '../src/domain/scenario.ts';
import { parsePairConditions, type SideCondition } from '../src/domain/used-params.ts';
import { proxy } from '../src/proxy.ts';
import { checkInternalAuth, internalTransportOk } from '../src/server/internal-auth.ts';
import { serverDecisionView } from '../src/server/server-decision.ts';
import { comparisonData, memoryCatalog } from './support/catalog.ts';
import en from '../messages/en.json' with { type: 'json' };
import es from '../messages/es.json' with { type: 'json' };

/** Step D1.6a — seguridad de la ruta interna, aislamiento de la capa curada y regresión del precio manual de coche nuevo. */

const PASS = 'correct-horse-battery-staple';
const ENV = { VSCAR_INTERNAL_USER: 'curator', VSCAR_INTERNAL_PASSWORD: PASS, VSCAR_PUBLICATION_CHANNEL: 'PREVIEW' };
const basic = (u: string, p: string) => `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}`;
const SRC = join(import.meta.dirname, '..', 'src');
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));
const rel = (f: string) => relative(SRC, f).split(sep).join('/');

function withEnv<T>(env: Record<string, string>, fn: () => T): T {
  const saved = { ...process.env };
  try {
    delete process.env.VSCAR_INTERNAL_USER;
    delete process.env.VSCAR_INTERNAL_PASSWORD;
    Object.assign(process.env, env);
    return fn();
  } finally {
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  }
}

describe('internal route security (D1.6a)', () => {
  it('HTTP Basic only over HTTPS: plain HTTP off loopback gets 403 WITHOUT a Basic challenge', () =>
    withEnv(ENV, () => {
      const plain = proxy(new NextRequest('http://localhost:3000/internal/catalog', { headers: { host: 'vscar.example', authorization: basic('curator', PASS) } }));
      expect(plain.status).toBe(403);
      expect(plain.headers.get('www-authenticate')).toBeNull();
      expect(plain.headers.get('cache-control')).toMatch(/no-store/);
      // Tras un proxy TLS (X-Forwarded-Proto) o con HTTPS directo, el flujo normal.
      expect(proxy(new NextRequest('http://vscar.example/internal/catalog', { headers: { 'x-forwarded-proto': 'https', authorization: basic('curator', PASS) } })).status).toBe(200);
      expect(proxy(new NextRequest('https://vscar.example/internal/catalog')).status).toBe(401);
      // Demo local: loopback sin TLS.
      expect(proxy(new NextRequest('http://127.0.0.1:3000/internal/catalog', { headers: { authorization: basic('curator', PASS) } })).status).toBe(200);
    }));

  it('transport rule: host from the Host header; behind a proxy only X-Forwarded-Proto https counts', () => {
    const u = (x: string) => new URL(x);
    expect(internalTransportOk(u('https://x.example/internal'), {})).toBe(true);
    expect(internalTransportOk(u('http://localhost:4211/internal'), { 'x-forwarded-proto': 'https, http' })).toBe(true);
    // Petición local directa, tal como la ve Next (añade X-Forwarded-* con la IP del socket).
    expect(internalTransportOk(u('http://localhost:4211/internal'), { host: '127.0.0.1:4211', 'x-forwarded-proto': 'http', 'x-forwarded-host': '127.0.0.1:4211', 'x-forwarded-for': '::ffff:127.0.0.1' })).toBe(true);
    expect(internalTransportOk(u('http://localhost:4211/internal'), { host: 'localhost:4211' })).toBe(true);
    expect(internalTransportOk(u('http://localhost:4211/internal'), { host: '[::1]:4211' })).toBe(true);
    expect(internalTransportOk(u('http://127.0.0.1:4211/internal'), { host: '127.0.0.1:4211' })).toBe(true);
    // Next no refleja el Host en la URL: un Host público sobre HTTP plano no es loopback.
    expect(internalTransportOk(u('http://localhost:4211/internal'), { host: 'vscar.example', 'x-forwarded-proto': 'http', 'x-forwarded-for': '::ffff:127.0.0.1' })).toBe(false);
    expect(internalTransportOk(u('http://localhost:4211/internal'), { host: 'localhost', 'x-forwarded-for': '192.168.1.20' })).toBe(false);
    // Un proxy que reenvía a loopback sin TLS no hereda la exención local.
    expect(internalTransportOk(u('http://localhost:4211/internal'), { host: 'localhost', 'x-forwarded-for': '203.0.113.9' })).toBe(false);
    expect(internalTransportOk(u('http://localhost:4211/internal'), { host: 'localhost', forwarded: 'for=203.0.113.9;proto=http' })).toBe(false);
  });

  it('disabled configuration fails closed before anything else (404, no challenge, no HTTPS hint)', () =>
    withEnv({ VSCAR_PUBLICATION_CHANNEL: 'PREVIEW' }, () => {
      const r = proxy(new NextRequest('http://vscar.example/internal/catalog'));
      expect(r.status).toBe(404);
      expect(r.headers.get('www-authenticate')).toBeNull();
    }));

  it('malformed or hostile Authorization headers never throw and never authorize', () => {
    const bad = ['Basic', 'Basic ', 'Basic !!!', 'basic', `Basic ${Buffer.from('nocolon').toString('base64')}`, `Basic ${Buffer.from(':').toString('base64')}`, `Basic ${'A'.repeat(64_000)}`, `Basic ${Buffer.from(`curator:${PASS}\u0000`).toString('base64')}`, `Basic ${Buffer.from(`curator :${PASS}`).toString('base64')}`, `Digest ${Buffer.from(`curator:${PASS}`).toString('base64')}`];
    for (const h of bad) expect(checkInternalAuth(h, ENV)).toBe('unauthorized');
    expect(checkInternalAuth(basic('curator', `${PASS}x`), ENV)).toBe('unauthorized');
    expect(checkInternalAuth(basic('curator', PASS.slice(0, -1)), ENV)).toBe('unauthorized');
    expect(checkInternalAuth(basic('curator', PASS), ENV)).toBe('ok');
  });

  it('responses and source never echo credentials; nothing in the internal path logs', () =>
    withEnv(ENV, () => {
      const denied = proxy(new NextRequest('http://localhost/internal/catalog', { headers: { authorization: basic('curator', 'wrong-password-123456') } }));
      const text = JSON.stringify([...denied.headers.entries()]);
      expect(text).not.toContain('wrong-password');
      expect(text).not.toContain(PASS);
      for (const f of ['server/internal-auth.ts', 'proxy.ts', 'server/technical-catalog.ts', 'app/internal/catalog/page.tsx', 'app/internal/layout.tsx']) expect(readFileSync(join(SRC, f), 'utf8')).not.toMatch(/console\.|logger\./);
    }));

  it('the internal layout and page are never indexable and always dynamic', () => {
    const layout = readFileSync(join(SRC, 'app/internal/layout.tsx'), 'utf8');
    expect(layout).toMatch(/index: false/);
    expect(layout).toMatch(/force-dynamic/);
    expect(readFileSync(join(SRC, 'app/internal/catalog/page.tsx'), 'utf8')).toMatch(/checkInternalAuth\(/);
  });
});

describe('curated layer isolation (D1.6a)', () => {
  const all = files(SRC).filter((f) => /\.(ts|tsx)$/.test(f));
  it('only /internal/* reads the technical layer; no public route, API, sitemap or engine input does', () => {
    const importers = all.filter((f) => /server\/technical-catalog['"]|from '\.\/technical-catalog'/.test(readFileSync(f, 'utf8'))).map(rel);
    expect(importers).toEqual(['app/internal/catalog/page.tsx']);
    const repoUsers = all.filter((f) => /createTechnicalCurationRepository|curatedTechnicalVehicles|curatedSpecValues|curated_spec_values/.test(readFileSync(f, 'utf8'))).map(rel);
    // D1.8 (ADR-020): el descubrimiento del selector lee la capa técnica SOLO en agregado (ver test/d18.test.ts).
    expect(repoUsers.sort()).toEqual(['server/catalog-discovery.ts', 'server/technical-catalog.ts']);
  });

  it('no static file exposes plans, raw data or curated values', () => {
    const pub = files(join(SRC, '..', 'public')).map((f) => relative(join(SRC, '..', 'public'), f));
    expect(pub.filter((f) => /\.(json|jsonl|csv|sql|zip)$/i.test(f))).toEqual([]);
  });

  it('selector, sitemap, robots and catalogue APIs read only the selectable catalogue (MySQL isolation is tested in @vscar/db)', () => {
    for (const f of ['server/catalog.ts', 'server/seo.ts', 'app/sitemap.ts', 'app/robots.ts', 'app/api/catalog/browse/route.ts', 'app/api/catalog/search/route.ts']) expect(readFileSync(join(SRC, f), 'utf8'), f).not.toMatch(/technical-catalog|TechnicalCuration|curated|\/internal/);
  });
});

const GOLF = 'volkswagen-golf-style-1-5-etsi-150-dsg';
const BYD = 'byd-seal-2026-design-rwd-82-5-kwh';
const TODAY = '2026-10-21';

describe('manual NEW price regression (D1.6a)', async () => {
  const slug = pairSlug(BYD, GOLF);
  const view = async (a: SideCondition, b: SideCondition) => serverDecisionView(await comparisonData(slug, memoryCatalog(), { a, b, ...(a.condition === 'used' || b.condition === 'used' ? { evaluationDate: '2026-10-15' } : {}) }), DEFAULT_SCENARIO).view;
  const base = await view({ condition: 'new' }, { condition: 'new' });
  const both = await view({ condition: 'new', price: 39_990 }, { condition: 'new', price: 31_500 });
  const mixed = await view({ condition: 'new', price: 39_990 }, { condition: 'used', facts: { price: 18_000, km: 60_000, reg: { year: 2021, month: 3 } } });

  it('NEW/NEW: each side gets exactly its own user-provided price in EUR minor units', () => {
    expect(both.economics.perSide.a.purchase).toEqual({ amount: 3_999_000, source: 'OVERRIDE', basis: 'USER_PROVIDED' });
    expect(both.economics.perSide.b.purchase).toEqual({ amount: 3_150_000, source: 'OVERRIDE', basis: 'USER_PROVIDED' });
  });

  it('NEW/USED: the new price applies once, to the new side; the used side keeps its asking price', () => {
    expect(mixed.economics.perSide.a.purchase).toEqual({ amount: 3_999_000, source: 'OVERRIDE', basis: 'USER_PROVIDED' });
    expect(mixed.economics.perSide.b.purchase?.amount).toBe(1_800_000);
    expect(mixed.economics.perSide.b.purchase?.amount).not.toBe(3_999_000);
  });

  it('Economic Fit (running cost) leader and status never move with a manual price', () => {
    expect(both.economics.perSide.a.annual).toEqual(base.economics.perSide.a.annual);
    expect(both.economics.perSide.b.annual).toEqual(base.economics.perSide.b.annual);
    expect(both.economics.leader).toBe(base.economics.leader);
    expect(both.economics.status).toBe(base.economics.status);
  });

  it('invalid amounts are rejected (negative, zero, decimals, NaN, exponent, out of range) and no price is invented', () => {
    for (const raw of ['-5', '0', '99', '12.5', 'NaN', 'abc', '1e5', '2000001', 'Infinity', '31000€']) {
      const { pair, invalid } = parsePairConditions(new URLSearchParams(`a_price=${encodeURIComponent(raw)}`), TODAY);
      expect(pair.a, raw).toEqual({ condition: 'new' });
      expect(invalid, raw).toEqual(['a_price']);
    }
    expect(parsePairConditions(new URLSearchParams('a_price=100'), TODAY).pair.a).toEqual({ condition: 'new', price: 100 });
    expect(parsePairConditions(new URLSearchParams('a_price=2000000'), TODAY).pair.a).toEqual({ condition: 'new', price: 2_000_000 });
  });

  it('ES and EN have the same new-price messages', () => {
    const keys = (o: Record<string, unknown>) => Object.keys(o).sort();
    const esP = (es as { economic: { newPrice: Record<string, string> } }).economic.newPrice;
    const enP = (en as { economic: { newPrice: Record<string, string> } }).economic.newPrice;
    expect(keys(esP)).toEqual(keys(enP));
    for (const k of keys(esP)) expect(esP[k]!.length && enP[k]!.length).toBeTruthy();
  });
});
