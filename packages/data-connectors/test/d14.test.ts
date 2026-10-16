import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  GOR3A_DATASET,
  GOR3A_ENGINES_CSV_HEADER,
  GOR3A_FUEL,
  GOR3A_SPEC,
  Gor3aMakeFile,
  countGor3a,
  flattenGor3a,
  gor3aBodyFromName,
  gor3aCsvParity,
  gor3aDrive,
  gor3aKg,
  gor3aKmh,
  gor3aKw,
  gor3aLitres,
  gor3aMillimetres,
  gor3aPowerKw,
  gor3aSeconds,
  gor3aTransmission,
  readGor3aJsonZip,
  type Gor3aEngine,
} from '../src/index.ts';

/** Step D1.4 — lector del dataset gor3a (S14): schema, paridad JSON/CSV, unidades, potencia, caja, carrocería. Sin red. */

export const engine = (o: Partial<Gor3aEngine> = {}): Gor3aEngine => ({
  label: '1.5L TSI 6MT FWD (150 HP)',
  fuelType: 'Gasoline',
  cylinders: 4,
  displacementCc: 1498,
  powerHp: 150,
  torqueNm: 250,
  transmission: '6-speed manual',
  drivetrain: 'Front Wheel Drive',
  zeroToHundredKmhS: 8.3,
  topSpeedKmh: 216,
  fuelEconomyCombinedL100: 5.3,
  lengthMm: 4258,
  widthMm: 1799,
  heightMm: 1492,
  wheelbaseMm: 2620,
  curbWeightKg: 1240,
  specs: { [GOR3A_SPEC.power]: '110.3 KW @ 5000-6000 RPM150 HP @ 5000-6000 RPM', [GOR3A_SPEC.cargo]: '13.4 cuFT (380 L)' },
  ...o,
});
const file: Gor3aMakeFile = {
  group: 'volkswagen',
  makes: [
    {
      name: 'Volkswagen',
      models: [
        { name: 'Golf', yearStart: 1974, yearEnd: null, generations: [{ name: 'Golf 5 Doors (2017)', yearStart: 2017, yearEnd: 2019, bodyType: null, engines: [engine(), engine({ label: '1.6L TDI 7AT FWD (115 HP)', fuelType: 'Diesel', zeroToHundredKmhS: null })] }] },
        { name: 'Golf Variant', yearStart: 1993, yearEnd: null, generations: [{ name: 'Golf Variant (2017)', yearStart: 2017, yearEnd: 2020, bodyType: null, engines: [engine({ lengthMm: 4567 })] }] },
      ],
    },
  ],
};

function zipOf(entries: Record<string, string>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(entries)) {
    const data = Buffer.from(text, 'utf8');
    const body = deflateRawSync(data);
    const n = Buffer.from(name);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(crc32(data), 14);
    lh.writeUInt32LE(body.length, 18);
    lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(n.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(crc32(data), 16);
    ch.writeUInt32LE(body.length, 20);
    ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(n.length, 28);
    ch.writeUInt32LE(offset, 42);
    locals.push(lh, n, body);
    centrals.push(ch, n);
    offset += lh.length + n.length + body.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(Object.keys(entries).length, 8);
  eocd.writeUInt16LE(Object.keys(entries).length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, eocd]);
}
const tmp = mkdtempSync(join(tmpdir(), 'vscar-d14-'));

describe('gor3a dataset metadata', () => {
  it('pins a release and commit; data licence (ODbL) is distinct from code licence (MIT); upstream recorded', () => {
    expect(GOR3A_DATASET).toMatchObject({ source_code: 'S14', release: 'v1.0.2', data_license: 'ODbL 1.0', code_license: 'MIT', upstream: 'autoevolution.com' });
    expect(GOR3A_DATASET.commit).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe('gor3a parsing and schema', () => {
  it('reads per-make JSON from the release zip, ignores all.json, counts real records', async () => {
    const p = join(tmp, 'json.zip');
    writeFileSync(p, zipOf({ 'json/volkswagen.json': JSON.stringify(file), 'json/all.json': JSON.stringify([file]) }));
    const { files, issues } = await readGor3aJsonZip(p);
    expect(issues).toEqual([]);
    expect(countGor3a(files)).toEqual({ makeGroups: 1, makes: 1, models: 2, generations: 2, engines: 3 });
  });

  it('schema drift: an unknown engine field is reported, not silently accepted', async () => {
    const p = join(tmp, 'drift.zip');
    const bad = JSON.parse(JSON.stringify(file));
    bad.makes[0].models[0].generations[0].engines[0].bootLitres = 380;
    writeFileSync(p, zipOf({ 'json/volkswagen.json': JSON.stringify(bad) }));
    const { files, issues } = await readGor3aJsonZip(p);
    expect(files).toEqual([]);
    expect(issues[0]).toMatch(/volkswagen\.json/);
  });

  it('flattened rows carry stable positional ids and the generation interval (no model year)', () => {
    const rows = flattenGor3a([file]);
    expect(rows.map((r) => r.id)).toEqual(['volkswagen/0/0/0/0', 'volkswagen/0/0/0/1', 'volkswagen/0/1/0/0']);
    expect(rows[0]).toMatchObject({ generation: 'Golf 5 Doors (2017)', genYearStart: 2017, genYearEnd: 2019 });
    expect(rows[0]).not.toHaveProperty('modelYear');
  });
});

describe('JSON ↔ CSV parity', () => {
  const rows = flattenGor3a([file]);
  const line = (r: (typeof rows)[number]) => {
    const e = r.engine;
    return [r.group, r.make, r.model, r.generation, r.genYearStart, r.genYearEnd, '', e.label, e.fuelType, e.cylinders, e.displacementCc, e.powerHp, e.torqueNm, e.transmission, e.drivetrain, e.zeroToHundredKmhS, e.topSpeedKmh, e.fuelEconomyCombinedL100, e.lengthMm, e.widthMm, e.heightMm, e.wheelbaseMm, e.curbWeightKg].map((v) => (v === null ? '' : String(v))).join(',');
  };
  const csv = (ls: string[]) => (async function* () {
    yield `${[GOR3A_ENGINES_CSV_HEADER.join(','), ...ls].join('\n')}\n`;
  })();

  it('identical content → exact parity (nulls as empty fields)', async () => {
    expect(await gor3aCsvParity(csv(rows.map(line)), rows)).toEqual({ csvRows: 3, jsonRows: 3, onlyInJson: 0, onlyInCsv: 0, headerOk: true });
  });

  it('a changed value or a missing row is detected', async () => {
    const ls = rows.map(line);
    ls[0] = ls[0]!.replace(',8.3,', ',8.4,');
    const r = await gor3aCsvParity(csv(ls.slice(0, 2)), rows);
    expect(r).toMatchObject({ csvRows: 2, onlyInCsv: 1, onlyInJson: 2 });
  });
});

describe('units and raw specs', () => {
  it('metric value is taken from the explicit unit in parentheses', () => {
    expect(gor3aMillimetres('167.6 in (4257 mm)')).toBe(4257);
    expect(gor3aMillimetres('60.4/59.2 in (1,534/1,504 mm)')).toBeUndefined();
    expect(gor3aLitres('13.4 cuFT (379 L)')).toBe(379);
    expect(gor3aKmh('122 mph (196 km/h)')).toBe(196);
    expect(gor3aKg('2725 lbs (1236 kg)')).toBe(1236);
    expect(gor3aMillimetres(undefined)).toBeUndefined();
  });

  it('0–100 km/h: only the field labelled "0-100 kph" is parsed; no 0–60 mph conversion', () => {
    expect(GOR3A_SPEC.accel).toMatch(/0-100 kph/);
    expect(gor3aSeconds('9.9 s')).toBe(9.9);
    expect(gor3aSeconds('0-60 mph: 9.1')).toBeUndefined();
  });

  it('power: explicit kW only — the source "HP" (often metric PS) is never converted', () => {
    expect(gor3aKw('80.9 KW @ 5000-5500 RPM110 HP @ 5000-5500 RPM')).toBe(80.9);
    expect(gor3aKw('110 HP @ 5000 RPM')).toBeUndefined();
    expect(gor3aPowerKw(engine({ specs: {} }))).toEqual({});
    expect(gor3aPowerKw(engine({ specs: { [GOR3A_SPEC.systemPower]: '103 kw (140 hp, 138 bhp)' } }))).toEqual({ kw: 103, basis: 'SYSTEM' });
    expect(gor3aPowerKw(engine({ specs: { [GOR3A_SPEC.motorPower]: '150 KW' } }))).toEqual({ kw: 150, basis: 'ELECTRIC_MOTOR' });
  });

  it('null handling: absent values stay undefined/null, never 0', () => {
    expect(gor3aLitres('')).toBeUndefined();
    expect(gor3aTransmission(null)).toEqual({});
    expect(gor3aDrive(null)).toBeUndefined();
  });
});

describe('transmission, drivetrain, fuel and body vocabularies', () => {
  it('transmission mapping: manual/automatic/1-speed; every CVT variant stays separate', () => {
    expect(gor3aTransmission('6-speed manual')).toEqual({ kind: 'manual', gears: 6 });
    expect(gor3aTransmission('7-speed automatic (DSG)')).toEqual({ kind: 'automatic', gears: 7 });
    expect(gor3aTransmission('1-speed automatic')).toEqual({ kind: 'single_speed', gears: 1 });
    for (const t of ['CVT', 'eCVT', 'CVTi-S', 'CVT-i', 'automatic transmission ECVT', 'Planetary Gear System']) expect(gor3aTransmission(t).kind).toBe('cvt');
    expect(gor3aTransmission('Alfa TCT (Dual Dry Clutch) 6 speed').kind).toBe('automatic');
  });

  it('drivetrain and fuel are closed lists', () => {
    expect(gor3aDrive('All Wheel Drive')).toBe('AWD');
    expect(gor3aDrive('4x4 sometimes')).toBeUndefined();
    expect(GOR3A_FUEL['Plug-in Hybrid']!.classes).toEqual(['PHEV']);
    expect(GOR3A_FUEL['Hydrogen Fuel Cell']).toBeUndefined();
  });

  it('body/doors only from explicit words in the model/generation name', () => {
    expect(gor3aBodyFromName('Golf', 'Golf 5 Doors (2017)')).toEqual({ doors: 5 });
    expect(gor3aBodyFromName('Golf Variant', 'Golf Variant (2017)')).toEqual({ body: 'estate' });
    expect(gor3aBodyFromName('Corolla', 'Corolla Sedan (2022)')).toEqual({ body: 'sedan' });
    expect(gor3aBodyFromName('Qashqai', 'Qashqai (2024)')).toEqual({});
  });
});
