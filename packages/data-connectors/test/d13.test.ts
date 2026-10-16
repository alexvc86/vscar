import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  TRAFICOM_DATASET,
  TRAFICOM_FIELDS,
  TRAFICOM_NEVER_READ,
  aggregateTraficom,
  listZipEntries,
  openZipEntry,
  traficomBody,
  traficomKey,
  traficomTransmission,
  type TraficomAggregate,
} from '../src/index.ts';

/** Step D1.3 — lector ZIP sin dependencias y agregación Traficom (S13) por clave técnica exacta. Sin red. */

function makeZip(name: string, data: Buffer, method: 0 | 8): Buffer {
  const body = method === 8 ? deflateRawSync(data) : data;
  const crc = crc32(data);
  const nameBuf = Buffer.from(name, 'utf8');
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(method, 8);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  const cd = Buffer.alloc(46);
  cd.writeUInt32LE(0x02014b50, 0);
  cd.writeUInt16LE(20, 4);
  cd.writeUInt16LE(20, 6);
  cd.writeUInt16LE(method, 10);
  cd.writeUInt32LE(crc, 16);
  cd.writeUInt32LE(body.length, 20);
  cd.writeUInt32LE(data.length, 24);
  cd.writeUInt16LE(nameBuf.length, 28);
  cd.writeUInt32LE(0, 42);
  const cdOffset = local.length + nameBuf.length + body.length;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(cd.length + nameBuf.length, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  return Buffer.concat([local, nameBuf, body, cd, nameBuf, eocd]);
}

const tmp = mkdtempSync(join(tmpdir(), 'vscar-d13-'));
const writeZip = (file: string, name: string, data: Buffer, method: 0 | 8) => {
  const p = join(tmp, file);
  writeFileSync(p, makeZip(name, data, method));
  return p;
};
const drain = async (s: AsyncIterable<Buffer | string>) => {
  const parts: Buffer[] = [];
  for await (const c of s) parts.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(parts);
};

describe('zip reader', () => {
  const payload = Buffer.from('a;b\n1;2\n'.repeat(500), 'latin1');
  it.each([
    ['deflate', 8 as const],
    ['stored', 0 as const],
  ])('lists and streams a %s entry byte-exactly', async (_label, method) => {
    const p = writeZip(`t${method}.zip`, 'data.csv', payload, method);
    const [e, ...rest] = await listZipEntries(p);
    expect(rest).toEqual([]);
    expect(e).toMatchObject({ name: 'data.csv', method, uncompressedSize: payload.length });
    expect((await drain(await openZipEntry(p, e!))).equals(payload)).toBe(true);
  });

  it('rejects a file that is not a ZIP', async () => {
    const p = join(tmp, 'nozip.zip');
    writeFileSync(p, 'not a zip at all');
    await expect(listZipEntries(p)).rejects.toThrow(/not a ZIP/);
  });
});

/* CSV sintético con la cabecera oficial (whitelist + campos que nunca deben leerse, con valores centinela). */
const HEADER: string[] = [...TRAFICOM_FIELDS, ...TRAFICOM_NEVER_READ];
const NEVER = new Set<string>(TRAFICOM_NEVER_READ);
const row = (o: Record<string, string>) => HEADER.map((h) => o[h] ?? (NEVER.has(h) ? `SECRET_${h}` : '')).join(';');
const TAN = 'e2*2007/46*0628*30';
const base = { tyyppihyvaksyntanro: TAN, variantti: 'b', versio: 'yhzt-b21700', ajoneuvoluokka: 'M1', korityyppi: 'AB', vaihteisto: '2', kaupallinenNimi: 'Pöllö 308' };
const csv = (rows: string[], header = HEADER.join(';')) => `${[header, ...rows].join('\n')}\n`;
const src = (text: string) =>
  (async function* () {
    const b = Buffer.from(text, 'latin1');
    yield b.subarray(0, 37);
    yield b.subarray(37);
  })();
const KEY = traficomKey(TAN, 'B', 'YHZT-B21700');

describe('Traficom aggregation (S13)', () => {
  it('dataset metadata: CC BY 4.0, Finnish market, attribution text', () => {
    expect(TRAFICOM_DATASET).toMatchObject({ source_code: 'S13', license: 'CC BY 4.0', source_market: 'FI' });
    expect(TRAFICOM_DATASET.attribution).toMatch(/Traficom.*CC BY 4\.0/);
  });

  it('aggregates only the requested exact key (TAN + Va + Ve, normalised), latin1-decoded', async () => {
    const text = csv([
      row({ ...base, ensirekisterointipvm: '15.03.2019' }),
      row({ ...base, ensirekisterointipvm: '02.11.2020' }),
      row({ ...base, versio: 'OTHER' }),
      row({ ...base, tyyppihyvaksyntanro: 'e2*2007/46*0628*31' }),
      row({ ...base, tyyppihyvaksyntanro: '' }),
    ]);
    const r = await aggregateTraficom(src(text), new Set([KEY]));
    expect(r.rows).toBe(5);
    expect(r.matched).toBe(2);
    const a = r.aggregates.get(KEY)!;
    expect(a.vehicles).toBe(2);
    expect(a.distributions.kaupallinenNimi).toEqual({ 'Pöllö 308': 2 });
    expect(a.firstRegistration).toEqual({ from: '2019-03-15', to: '2020-11-02' });
  });

  it('never reads per-vehicle fields (municipality, odometer, VIN prefix, sequence, colour)', async () => {
    const r = await aggregateTraficom(src(csv([row(base)])), new Set([KEY]));
    expect(JSON.stringify([...r.aggregates.values()])).not.toMatch(/SECRET_/);
    for (const f of TRAFICOM_NEVER_READ) expect(TRAFICOM_FIELDS as readonly string[]).not.toContain(f);
  });

  it('throws on schema drift (a whitelisted column missing)', async () => {
    const header = HEADER.filter((h) => h !== 'vaihteisto').join(';');
    await expect(aggregateTraficom(src(csv([], header)), new Set([KEY]))).rejects.toThrow(/schema drift: missing column vaihteisto/);
  });

  it('first registration is kept as a date range, never as model year', async () => {
    const r = await aggregateTraficom(src(csv([row({ ...base, ensirekisterointipvm: '01.01.2021' })])), new Set([KEY]));
    const a = r.aggregates.get(KEY)!;
    expect(a).not.toHaveProperty('modelYear');
    expect(a.firstRegistration).toEqual({ from: '2021-01-01', to: '2021-01-01' });
  });
});

const agg = (field: 'vaihteisto' | 'korityyppi', dist: Record<string, number>): TraficomAggregate => ({
  key: KEY,
  vehicles: Object.values(dist).reduce((s, n) => s + n, 0),
  distributions: { vaihteisto: {}, vaihteidenLkm: {}, korityyppi: {}, ovienLukumaara: {}, istumapaikkojenLkm: {}, kaupallinenNimi: {}, mallimerkinta: {}, suurinNettoteho: {}, iskutilavuus: {}, kayttovoima: {}, sahkohybridinluokka: {}, [field]: dist },
});

describe('Traficom evidence rules', () => {
  it('transmission: codes 1/2 map at ≥ 95 %; 3 (stepless) and 6 (variable) stay unmapped', () => {
    expect(traficomTransmission(agg('vaihteisto', { '1': 99, '2': 1 })).value).toBe('manual');
    expect(traficomTransmission(agg('vaihteisto', { '2': 40 })).value).toBe('automatic');
    expect(traficomTransmission(agg('vaihteisto', { '3': 50 }))).toMatchObject({ code: '3' });
    expect(traficomTransmission(agg('vaihteisto', { '3': 50 })).value).toBeUndefined();
    expect(traficomTransmission(agg('vaihteisto', { '6': 50 })).value).toBeUndefined();
  });

  it('transmission: disagreement below 95 % is not resolved', () => {
    const t = traficomTransmission(agg('vaihteisto', { '3': 1080, '6': 91 }));
    expect(t.value).toBeUndefined();
    expect(t.reason).toMatch(/disagree/);
  });

  it('no vehicles / not reported → no value', () => {
    expect(traficomTransmission(undefined).value).toBeUndefined();
    expect(traficomTransmission(agg('vaihteisto', {})).reason).toMatch(/not reported/);
  });

  it('body: only AA/AB/AD/AE are unambiguous; AC/AF (estate/MPV, also used for SUVs) are not mapped', () => {
    expect(traficomBody(agg('korityyppi', { AA: 20 })).value).toBe('sedan');
    expect(traficomBody(agg('korityyppi', { AB: 20 })).value).toBe('hatchback');
    expect(traficomBody(agg('korityyppi', { AF: 20 })).value).toBeUndefined();
    expect(traficomBody(agg('korityyppi', { AC: 20 })).value).toBeUndefined();
    expect(traficomBody(agg('korityyppi', { AB: 90, AC: 10 })).value).toBeUndefined();
  });
});
