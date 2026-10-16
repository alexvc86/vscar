import { describe, expect, it } from 'vitest';
import {
  AUTOSEEKER_HEADER,
  ODB_HEADER,
  PS_TO_KW,
  autoseekerGranularity,
  fuelClassCompatible,
  kilowattDrive,
  odbDoors,
  odbDrive,
  odbFuel,
  odbGeneration,
  odbPowerKw,
  odbTransmission,
  parseKilowatt,
  parseOpenEv,
  parseVehiclesDb,
  psToKw,
  readAutoseekerCsv,
  readOdbCsv,
} from '../src/index.ts';

/** Step D1.5 — lectores de catálogos abiertos (S15–S19): schema, unidades, granularidad, idiomas. Sin red. */

const src = (text: string) =>
  (async function* () {
    yield text;
  })();
const csvLine = (vals: readonly string[]) => vals.map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(',');

describe('S15 Opendatabay / Kaggle CSV', () => {
  const row = (o: Partial<Record<(typeof ODB_HEADER)[number], string>>) => csvLine(ODB_HEADER.map((h) => o[h] ?? ''));
  const text = [ODB_HEADER.join(','), row({ id_trim: '67454', Make: 'Volkswagen', Modle: 'Golf', Generation: '7 generation [redesign]', Year_from: '2017', Year_to: '2020', Series: 'Hatchback 5-doors', Trim: '1.0 TSI MT', engine_hp: '110', engine_type: 'Gasoline', minimum_trunk_capacity_l: '380', max_trunk_capacity_l: '1270' }), row({ id_trim: '9', Make: 'X', Modle: 'Y', Generation: 'W177', Year_from: '2018', Year_to: '0' })].join('\n');

  it('parses all 78 columns and keeps the original values untouched', async () => {
    const { records } = await readOdbCsv(src(text));
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({ id: '67454', make: 'Volkswagen', model: 'Golf', yearFrom: 2017, yearTo: 2020, series: 'Hatchback 5-doors', trim: '1.0 TSI MT' });
    expect(records[0]!.raw.minimum_trunk_capacity_l).toBe('380');
    expect(records[0]!.raw.max_trunk_capacity_l).toBe('1270');
  });

  it('Year_to "0" means "no end declared" (not year 0)', async () => {
    const { records } = await readOdbCsv(src(text));
    expect(records[1]!.yearTo).toBeUndefined();
  });

  it('schema drift on the header is an error', async () => {
    await expect(readOdbCsv(src(`id_trim,Make,Model\n1,a,b`))).rejects.toThrow(/schema drift/);
  });

  it('generation label: ordinal + restyling index, or code (never a model year)', () => {
    expect(odbGeneration('7 generation [redesign]')).toEqual({ ordinal: 7, restyling: 1 });
    expect(odbGeneration('4 generation [2nd redesign]')).toEqual({ ordinal: 4, restyling: 2 });
    expect(odbGeneration('8 generation')).toEqual({ ordinal: 8, restyling: 0 });
    expect(odbGeneration('W177')).toEqual({ code: 'W177', restyling: 0 });
  });

  it('power: kW column first; otherwise metric PS converted by exact definition', () => {
    expect(PS_TO_KW).toBe(0.73549875);
    expect(psToKw(110)).toBeCloseTo(80.9, 1);
    expect(odbPowerKw({ max_power_kw: '96', engine_hp: '130' } as never)).toEqual({ kw: 96, basis: 'KW' });
    expect(odbPowerKw({ max_power_kw: '', engine_hp: '150' } as never).basis).toBe('PS_CONVERTED');
    expect(odbPowerKw({ max_power_kw: '', engine_hp: '' } as never)).toEqual({});
  });

  it('vocabularies: transmission (robot = automated), drive, fuel, doors', () => {
    expect(odbTransmission('robot')).toBe('automatic');
    expect(odbTransmission('Continuously variable transmission (CVT)')).toBe('cvt');
    expect(odbTransmission('Manual')).toBe('manual');
    expect(odbTransmission('')).toBeUndefined();
    expect(odbDrive('full')).toBe('AWD');
    expect(odbDrive('Four wheel drive (4WD)')).toBe('AWD');
    expect(odbDrive('Front wheel drive')).toBe('FWD');
    expect(odbFuel('Gasoline, Gas')).toBeUndefined();
    expect(odbFuel('petrol')).toBe('petrol');
    expect(odbDoors('Hatchback 5-doors')).toBe(5);
    expect(odbDoors('Hatchback 5 doors')).toBe(5);
    expect(odbDoors('Crossover')).toBeUndefined();
  });
});

describe('S16 autoseeker models.csv', () => {
  const r = (o: Partial<Record<(typeof AUTOSEEKER_HEADER)[number], string>>) => csvLine(AUTOSEEKER_HEADER.map((h) => o[h] ?? ''));
  const text = [
    AUTOSEEKER_HEADER.join(','),
    r({ slug: 'a', merk: 'Audi', model: 'Q7', generatie: '4M facelift II (2024+)', bouwjaarVan: '2015', fuels: 'benzine|diesel|phev', carrosserie: 'SUV', vermogen_pk: '286', batterij_kwh: '22', kofferbak_liter: '865', trekgewicht_geremd_kg: '0' }),
    r({ slug: 'b', merk: 'SEAT', model: 'Leon', generatie: 'IV 1.5 TSI (Typ KL, 2020-)', bouwjaarVan: '2020', fuels: 'benzine', carrosserie: 'Hatchback', vermogen_pk: '150', kofferbak_liter: '380' }),
    r({ slug: 'c', merk: 'Kia', model: 'Sportage', generatie: 'NQ5 (2021+)', bouwjaarVan: '2021', fuels: 'hybride', carrosserie: 'Stationwagen', zitplaatsen: '5' }),
    r({ slug: 'd', merk: 'X', model: 'Y', generatie: 'Z', bouwjaarVan: '2024', fuels: 'waterstof', carrosserie: 'hatchback' }),
  ].join('\n');

  it('multi-fuel rows are MODEL level: one row is not three variants', async () => {
    const [q7] = await readAutoseekerCsv(src(text));
    expect(q7).toMatchObject({ fuels: ['petrol', 'diesel', 'phev'], granularity: 'MODEL' });
  });

  it('powertrain named in the generation → POWERTRAIN; otherwise GENERATION; never TECHNICAL_VARIANT', async () => {
    const rows = await readAutoseekerCsv(src(text));
    expect(rows[1]!.granularity).toBe('POWERTRAIN');
    expect(rows[2]!.granularity).toBe('GENERATION');
    expect(autoseekerGranularity(['benzine'], 'J12 e-Power (facelift 2024)')).toBe('POWERTRAIN');
    expect(rows.every((x) => x.granularity !== 'TECHNICAL_VARIANT')).toBe(true);
  });

  it('Dutch vocabulary normalised; unknown fuel flagged; towing 0 treated as absent', async () => {
    const rows = await readAutoseekerCsv(src(text));
    expect(rows[2]).toMatchObject({ fuels: ['hev'], body: 'estate' });
    expect(rows[3]).toMatchObject({ fuels: [], unknownFuels: ['waterstof'], body: 'hatchback' });
    expect(rows[0]!.values.towingKg).toBeUndefined();
    expect(rows[0]!.values.bootL).toBe(865);
  });

  it('schema drift on the header is an error', async () => {
    await expect(readAutoseekerCsv(src('slug,brand\n1,2'))).rejects.toThrow(/schema drift/);
  });

  it('fuel compatibility: a hybrid key never matches a plain petrol row', () => {
    expect(fuelClassCompatible('petrol', 'HEV_OR_MHEV', 'petrol')).toBe(false);
    expect(fuelClassCompatible('hev', 'HEV_OR_MHEV', 'petrol')).toBe(true);
    expect(fuelClassCompatible('phev', 'PHEV')).toBe(true);
    expect(fuelClassCompatible('petrol', 'ICE_OR_MHEV', 'diesel')).toBe(false);
  });
});

describe('S17 OpenEV Data', () => {
  const v = (o: Record<string, unknown> = {}) => ({
    make: { slug: 'byd', name: 'BYD' },
    model: { slug: 'seal', name: 'Seal' },
    year: 2024,
    trim: { slug: 'premium', name: 'Premium' },
    unique_code: 'byd:seal:2024:seal_premium',
    vehicle_type: 'passenger_car',
    powertrain: { drivetrain: 'rwd', system_power_kw: 230 },
    battery: { pack_capacity_kwh_gross: 85, pack_capacity_kwh_net: 82.5 },
    charging: { ac: { max_power_kw: 11 }, dc: { max_power_kw: 150 } },
    range: { rated: [{ cycle: 'epa', range_km: 500 }] },
    markets: ['DE'],
    sources: [{ type: 'oem', url: 'https://www.byd.com' }],
    ...o,
  });

  it('gross and usable battery stay separate; only WLTP-declared range is taken (EPA never converted)', () => {
    const { records } = parseOpenEv({ schema_version: '1.0.0', vehicle_count: 2, vehicles: [v(), v({ range: { rated: [{ cycle: 'wltp', range_km: 570 }] }, trim: { slug: 'x', name: 'X' } })] });
    expect(records[0]).toMatchObject({ batteryGrossKwh: 85, batteryNetKwh: 82.5, drivetrain: 'RWD', acKw: 11, dcKw: 150 });
    expect(records[0]!.wltpRangeKm).toBeUndefined();
    expect(records[1]!.wltpRangeKm).toBe(570);
  });

  it('provenance quality: a bare domain URL is flagged; no ES price', () => {
    const { records } = parseOpenEv({ schema_version: '1.0.0', vehicle_count: 1, vehicles: [v()] });
    expect(records[0]).toMatchObject({ sourceQuality: 'DOMAIN_ONLY', hasEsPrice: false });
  });

  it('invalid records are reported, not silently accepted', () => {
    const { records, issues } = parseOpenEv({ schema_version: '1.0.0', vehicle_count: 1, vehicles: [{ make: 'x' }] });
    expect(records).toEqual([]);
    expect(issues).toHaveLength(1);
  });
});

describe('S18 VehiclesDB and S19 Kilowatt', () => {
  it('VehiclesDB is taxonomy only: make, model, aliases, availability', () => {
    const r = parseVehiclesDb({ version: '2026.10.4', license: 'CC-BY-4.0', makes: [{ name: 'Hyundai', models: [{ name: 'Kona', kind: 'car', availability: ['es', 'nl'], former_ids: ['car/hyundai/kona-kauai'] }] }] });
    expect(r.models[0]).toEqual({ make: 'Hyundai', model: 'Kona', kind: 'car', aliases: [], formerIds: ['car/hyundai/kona-kauai'], availability: ['es', 'nl'] });
    expect(Object.keys(r.models[0]!)).not.toContain('power');
  });

  it('Kilowatt: usable battery and charging; drivetrain only when the variant names it', () => {
    const k = parseKilowatt({ meta: { updated_at: '2025-04-12', overall_count: 1 }, data: [{ id: 'u', brand: 'BYD', model: 'Seal', variant: '82.5 kWh RWD Design', release_year: 2023, usable_battery_size: 82.5, ac_charger: { max_power: 11 }, dc_charger: { max_power: 150 } }] });
    expect(k.records[0]).toMatchObject({ usableKwh: 82.5, acKw: 11, dcKw: 150, year: 2023 });
    expect(kilowattDrive('82.5 kWh RWD Design')).toBe('RWD');
    expect(kilowattDrive('Long Range Dual Motor')).toBe('AWD');
    expect(kilowattDrive('Standard')).toBeUndefined();
  });
});
