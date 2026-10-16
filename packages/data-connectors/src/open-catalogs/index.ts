import { z } from 'zod';
import { readCsvRows } from '../acquisition/csv.ts';

/**
 * Step D1.5 — catálogos abiertos de terceros (investigación). Ninguno publica homologación (TAN/Va/Ve): solo pueden dar
 * candidatos de nivel modelo/generación/motorización/acabado. Los valores originales se conservan tal cual (`raw`); las
 * normalizaciones son explícitas y testadas. Nada de aquí entra en `spec_values` sin identidad verificada y derechos.
 *
 * S15 Opendatabay/Kaggle "Car Dataset 1945-2020" · S16 autoseeker.eu models.csv · S17 OpenEV Data · S18 VehiclesDB ·
 * S19 Kilowatt Open EV Data (archivado).
 */

/** Granularidad real de una observación (de menos a más específica). TECHNICAL_VARIANT exige TAN+Va+Ve. */
export const DATA_GRANULARITY = ['MODEL', 'GENERATION', 'POWERTRAIN', 'COMMERCIAL_TRIM', 'TECHNICAL_VARIANT'] as const;
export type DataGranularity = (typeof DATA_GRANULARITY)[number];

export const OPEN_CATALOG_SOURCES = {
  S15: { name: 'Opendatabay / Kaggle — Car Dataset 1945-2020', license: 'CC0 declared (Kaggle, Opendatabay page) vs "General AI Training and Fine-Tuning Data License" (Opendatabay JSON-LD)', url: 'https://www.kaggle.com/datasets/jahaidulislam/car-specification-dataset-1945-2020' },
  S16: { name: 'autoseeker.eu — open data models.csv', license: 'CC BY 4.0', url: 'https://autoseeker.eu/en/data/', attribution: 'autoseeker.eu (https://autoseeker.eu/en/data/), CC BY 4.0' },
  S17: { name: 'OpenEV Data — open-ev-data-dataset v1.24.0', license: 'CDLA-Permissive-2.0', url: 'https://github.com/open-ev-data/open-ev-data-dataset', attribution: 'OpenEV Data (open-ev-data/open-ev-data-dataset), CDLA-Permissive-2.0' },
  S18: { name: 'VehiclesDB v2026.10.4', license: 'CC BY 4.0 (+ upstream register notices)', url: 'https://github.com/vehiclesdb/vehiclesdb', attribution: 'Vehicle data by VehiclesDB (vehiclesdb.com), CC BY 4.0 — upstream notices in ATTRIBUTION.md' },
  S19: { name: 'Kilowatt Open EV Data (archived)', license: 'MIT with attribution requirement', url: 'https://github.com/KilowattApp/open-ev-data', attribution: 'Open EV Data (https://github.com/KilowattApp/open-ev-data)' },
} as const;

/* ───────────────────────── Normalizaciones comunes ───────────────────────── */

/** 1 PS (CV métrico) = 735,49875 W por definición. Es una equivalencia de unidad, no una estimación. */
export const PS_TO_KW = 0.73549875;
export const psToKw = (ps: number) => ps * PS_TO_KW;
const numOrUndef = (s: string | undefined) => {
  const t = (s ?? '').trim();
  if (!t) return undefined;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

/** Clase de tren motriz VScar (lista cerrada) */
export type FuelClass = 'petrol' | 'diesel' | 'hev' | 'phev' | 'bev' | 'lpg' | 'cng';
/** ¿Es compatible una clase de origen con el `productClass`/combustible de la candidata? */
export function fuelClassCompatible(f: FuelClass, productClass: string, fuel?: string): boolean {
  switch (productClass) {
    case 'BEV':
      return f === 'bev';
    case 'PHEV':
      return f === 'phev';
    case 'HEV_OR_MHEV':
    case 'MHEV':
      // Homologación NOVC_HEV: solo filas híbridas; un gasolina/diésel sin hibridación declarada no es la misma motorización.
      return f === 'hev';
    default:
      return !!fuel && f === fuel;
  }
}

/* ───────────────────────── S15 Opendatabay / Kaggle ───────────────────────── */

export const ODB_HEADER = ['id_trim', 'Make', 'Modle', 'Generation', 'Year_from', 'Year_to', 'Series', 'Trim', 'Body_type', 'load_height_mm', 'number_of_seats', 'length_mm', 'width_mm', 'height_mm', 'wheelbase_mm', 'front_track_mm', 'rear_track_mm', 'curb_weight_kg', 'wheel_size_r14', 'ground_clearance_mm', 'trailer_load_with_brakes_kg', 'payload_kg', 'back_track_width_mm', 'front_track_width_mm', 'clearance_mm', 'full_weight_kg', 'front_rear_axle_load_kg', 'max_trunk_capacity_l', 'cargo_compartment_length_width_height_mm', 'cargo_volume_m3', 'minimum_trunk_capacity_l', 'maximum_torque_n_m', 'injection_type', 'overhead_camshaft', 'cylinder_layout', 'number_of_cylinders', 'compression_ratio', 'engine_type', 'valves_per_cylinder', 'boost_type', 'cylinder_bore_mm', 'stroke_cycle_mm', 'engine_placement', 'cylinder_bore_and_stroke_cycle_mm', 'turnover_of_maximum_torque_rpm', 'max_power_kw', 'presence_of_intercooler', 'capacity_cm3', 'engine_hp', 'engine_hp_rpm', 'drive_wheels', 'bore_stroke_ratio', 'number_of_gears', 'turning_circle_m', 'transmission', 'mixed_fuel_consumption_per_100_km_l', 'range_km', 'emission_standards', 'fuel_tank_capacity_l', 'acceleration_0_100_km/h_s', 'max_speed_km_per_h', 'city_fuel_per_100km_l', 'CO2_emissions_g/km', 'fuel_grade', 'highway_fuel_per_100km_l', 'back_suspension', 'rear_brakes', 'front_brakes', 'front_suspension', 'steering_type', 'car_class', 'country_of_origin', 'number_of_doors', 'safety_assessment', 'rating_name', 'battery_capacity_KW_per_h', 'electric_range_km', 'charging_time_h'] as const;
export type OdbColumn = (typeof ODB_HEADER)[number];

export interface OdbRecord {
  id: string;
  make: string;
  model: string;
  generation: string;
  yearFrom?: number;
  /** "0" en origen = sin fin declarado (en producción a la fecha del dataset). */
  yearTo?: number;
  series: string;
  trim: string;
  raw: Record<OdbColumn, string>;
}

export async function readOdbCsv(source: AsyncIterable<string | Buffer>): Promise<{ records: OdbRecord[]; headerOk: boolean; rows: number }> {
  let header: string[] | undefined;
  const records: OdbRecord[] = [];
  for await (const r of readCsvRows(source)) {
    if (!header) {
      header = r.fields;
      if (JSON.stringify(header) !== JSON.stringify(ODB_HEADER)) throw new Error('S15 schema drift: header differs from the 78-column layout');
      continue;
    }
    const raw = Object.fromEntries(ODB_HEADER.map((h, i) => [h, r.fields[i] ?? ''])) as Record<OdbColumn, string>;
    const yt = numOrUndef(raw.Year_to);
    records.push({ id: raw.id_trim, make: raw.Make, model: raw.Modle, generation: raw.Generation, ...(numOrUndef(raw.Year_from) !== undefined ? { yearFrom: numOrUndef(raw.Year_from)! } : {}), ...(yt ? { yearTo: yt } : {}), series: raw.Series, trim: raw.Trim, raw });
  }
  return { records, headerOk: true, rows: records.length };
}

/** "7 generation [redesign]" → ordinal 7, restyling 1; "[2nd redesign]" → 2; códigos ("W177", "GMT900") se conservan como código. */
export function odbGeneration(g: string): { ordinal?: number; restyling: number; code?: string } {
  const m = /^(\d+)\s+generation\b/i.exec(g.trim());
  const red = /\[(?:(\d+)(?:st|nd|rd|th)\s+)?redesign\]/i.exec(g);
  const restyling = red ? (red[1] ? Number(red[1]) : 1) : 0;
  if (m) return { ordinal: Number(m[1]), restyling };
  const code = g.replace(/\[.*?\]/g, '').trim();
  return code ? { code, restyling } : { restyling };
}

/** Potencia: `max_power_kw` si existe; si no, `engine_hp` es CV métrico (PS) → kW por definición exacta. Base declarada. */
export function odbPowerKw(raw: Record<OdbColumn, string>): { kw?: number; basis?: 'KW' | 'PS_CONVERTED' } {
  const kw = numOrUndef(raw.max_power_kw);
  if (kw !== undefined) return { kw, basis: 'KW' };
  const ps = numOrUndef(raw.engine_hp);
  return ps !== undefined ? { kw: psToKw(ps), basis: 'PS_CONVERTED' } : {};
}

export function odbTransmission(t: string): 'manual' | 'automatic' | 'cvt' | undefined {
  const s = t.trim().toLowerCase();
  if (!s) return undefined;
  if (s.includes('cvt') || s.includes('continuously')) return 'cvt';
  if (s === 'manual') return 'manual';
  if (s === 'automatic' || s === 'robot' || s.startsWith('electronic with')) return 'automatic';
  return undefined;
}

export function odbDrive(d: string): 'FWD' | 'RWD' | 'AWD' | undefined {
  const s = d.trim().toLowerCase();
  if (s.startsWith('front')) return 'FWD';
  if (s.startsWith('rear')) return 'RWD';
  if (s.includes('all wheel') || s.includes('four wheel') || s === 'full') return 'AWD';
  return undefined;
}

export function odbFuel(e: string): FuelClass | undefined {
  const s = e.trim().toLowerCase();
  if (s === 'gasoline' || s === 'petrol') return 'petrol';
  if (s === 'diesel') return 'diesel';
  if (s === 'hybrid') return 'hev';
  if (s === 'electric') return 'bev';
  if (s === 'gas') return 'lpg';
  return undefined; // "Gasoline, Gas" (bi-fuel), "Rotor"… → sin clase inequívoca
}

/** Puertas explícitas en la serie ("Hatchback 5-doors", "Hatchback 5 doors"). */
export const odbDoors = (series: string) => {
  const m = /(\d)[- ]doors?/i.exec(series);
  return m ? Number(m[1]) : undefined;
};

/* ───────────────────────── S16 autoseeker.eu ───────────────────────── */

export const AUTOSEEKER_HEADER = ['slug', 'merk', 'model', 'generatie', 'status', 'bouwjaarVan', 'bouwjaarTot', 'fuels', 'carrosserie', 'zitplaatsen', 'deuren', 'vermogen_pk', 'wltp_range_km', 'batterij_kwh', 'laadvermogen_dc_kw', 'trekgewicht_geremd_kg', 'kofferbak_liter', 'verbruik_wltp_l_100km', 'verbruik_wltp_kwh_100km', 'co2_g_km'] as const;

const AS_FUEL: Readonly<Record<string, FuelClass>> = { benzine: 'petrol', diesel: 'diesel', hybride: 'hev', phev: 'phev', ev: 'bev', lpg: 'lpg' };
const AS_BODY: Readonly<Record<string, string>> = { suv: 'suv', hatchback: 'hatchback', sedan: 'sedan', crossover: 'crossover', stationwagen: 'estate', stationwagon: 'estate', 'shooting brake': 'estate', coupe: 'coupe', mpv: 'mpv', liftback: 'liftback', fastback: 'fastback', cabrio: 'convertible', pickup: 'pickup', 'suv-coupe': 'suv_coupe', 'suv-coupé': 'suv_coupe' };

export interface AutoseekerRecord {
  slug: string;
  make: string;
  model: string;
  generation: string;
  status: string;
  yearFrom?: number;
  yearTo?: number;
  fuels: FuelClass[];
  unknownFuels: string[];
  body?: string;
  granularity: DataGranularity;
  values: { powerPs?: number; wltpRangeKm?: number; batteryKwh?: number; dcKw?: number; towingKg?: number; bootL?: number; wltpL100?: number; wltpKwh100?: number; co2?: number; seats?: number; doors?: number };
  raw: Record<(typeof AUTOSEEKER_HEADER)[number], string>;
}

/**
 * Granularidad: varios combustibles en una fila → MODEL (la fila agrupa motorizaciones; sus cifras describen una sola,
 * no declarada). Un combustible y motor/potencia en `generatie` ("1.5 TSI", "eDrive40", "Hybrid 140") → POWERTRAIN.
 * Si no → GENERATION. Nunca TECHNICAL_VARIANT (no hay homologación).
 */
export function autoseekerGranularity(fuels: readonly string[], generatie: string): DataGranularity {
  if (fuels.length !== 1) return 'MODEL';
  return /\d\.\d\s*[a-z]|\b(tsi|tfsi|tdi|tce|dci|crdi|t-gdi|bluehdi|puretech|edrive\d+|xdrive\d+|e-tech|hybrid \d+|eco-g \d+|\d+\s*kwh|\d+[de]\b|\d{2,3}\s*(pk|hp|cv)|rwd|awd|fwd|long range|standard range|performance|plug-in hybrid \d+|phev|e-power)\b/i.test(generatie) ? 'POWERTRAIN' : 'GENERATION';
}

export async function readAutoseekerCsv(source: AsyncIterable<string | Buffer>): Promise<AutoseekerRecord[]> {
  let header: string[] | undefined;
  const out: AutoseekerRecord[] = [];
  for await (const r of readCsvRows(source)) {
    if (!header) {
      header = r.fields;
      if (JSON.stringify(header) !== JSON.stringify(AUTOSEEKER_HEADER)) throw new Error('S16 schema drift: header differs from the 20-column layout');
      continue;
    }
    const raw = Object.fromEntries(AUTOSEEKER_HEADER.map((h, i) => [h, r.fields[i] ?? ''])) as AutoseekerRecord['raw'];
    const fuelTokens = raw.fuels.split('|').map((f) => f.trim().toLowerCase()).filter(Boolean);
    const fuels = fuelTokens.map((f) => AS_FUEL[f]).filter((f): f is FuelClass => !!f);
    const v = (k: (typeof AUTOSEEKER_HEADER)[number]) => numOrUndef(raw[k]);
    const values: AutoseekerRecord['values'] = {};
    const put = (k: keyof AutoseekerRecord['values'], n: number | undefined) => {
      if (n !== undefined && n !== 0) values[k] = n; // 0 en trekgewicht = "no homologado para remolque" o vacío: no es un valor útil
    };
    put('powerPs', v('vermogen_pk'));
    put('wltpRangeKm', v('wltp_range_km'));
    put('batteryKwh', v('batterij_kwh'));
    put('dcKw', v('laadvermogen_dc_kw'));
    put('towingKg', v('trekgewicht_geremd_kg'));
    put('bootL', v('kofferbak_liter'));
    put('wltpL100', v('verbruik_wltp_l_100km'));
    put('wltpKwh100', v('verbruik_wltp_kwh_100km'));
    put('co2', v('co2_g_km'));
    put('seats', v('zitplaatsen'));
    put('doors', v('deuren'));
    const body = AS_BODY[raw.carrosserie.trim().toLowerCase()];
    out.push({
      slug: raw.slug,
      make: raw.merk,
      model: raw.model,
      generation: raw.generatie,
      status: raw.status,
      ...(v('bouwjaarVan') !== undefined ? { yearFrom: v('bouwjaarVan')! } : {}),
      ...(v('bouwjaarTot') !== undefined ? { yearTo: v('bouwjaarTot')! } : {}),
      fuels,
      unknownFuels: fuelTokens.filter((f) => !AS_FUEL[f]),
      ...(body ? { body } : {}),
      granularity: autoseekerGranularity(fuelTokens, raw.generatie),
      values,
      raw,
    });
  }
  return out;
}

/* ───────────────────────── S17 OpenEV Data ───────────────────────── */

const OevVehicle = z
  .object({
    make: z.object({ slug: z.string(), name: z.string() }),
    model: z.object({ slug: z.string(), name: z.string() }),
    year: z.number().int(),
    trim: z.object({ slug: z.string(), name: z.string() }),
    variant: z.object({ slug: z.string(), name: z.string(), kind: z.string().optional() }).optional(),
    unique_code: z.string(),
    vehicle_type: z.string(),
    powertrain: z.object({ drivetrain: z.string().optional(), system_power_kw: z.number().optional(), system_torque_nm: z.number().optional() }).passthrough(),
    battery: z.object({ pack_capacity_kwh_gross: z.number().optional(), pack_capacity_kwh_net: z.number().optional(), warranty: z.object({ years: z.number().optional(), distance_km: z.number().optional() }).passthrough().optional() }).passthrough(),
    charging: z.object({ ac: z.object({ max_power_kw: z.number().optional() }).passthrough().optional(), dc: z.object({ max_power_kw: z.number().optional() }).passthrough().optional() }).passthrough(),
    range: z.object({ rated: z.array(z.object({ cycle: z.string(), range_km: z.number(), notes: z.string().optional() })) }).passthrough(),
    performance: z.object({ acceleration_0_100_kmh_s: z.number().optional(), top_speed_kmh: z.number().optional() }).passthrough().optional(),
    capacity: z.object({ cargo_l: z.number().optional(), cargo_max_l: z.number().optional() }).passthrough().optional(),
    dimensions: z.object({ length_mm: z.number().optional() }).passthrough().optional(),
    markets: z.array(z.string()),
    pricing: z.object({ msrp: z.array(z.object({ currency: z.string(), amount: z.number(), country: z.string().optional(), year: z.number().optional() })) }).passthrough().optional(),
    sources: z.array(z.object({ type: z.string(), url: z.string(), title: z.string().optional() }).passthrough()),
  })
  .passthrough();
export type OevVehicle = z.infer<typeof OevVehicle>;

export interface OevRecord {
  id: string;
  make: string;
  model: string;
  year: number;
  trim: string;
  variant?: string;
  drivetrain?: 'FWD' | 'RWD' | 'AWD';
  systemPowerKw?: number;
  /** Solo valores declarados con ciclo WLTP; EPA/CLTC/NEDC nunca se convierten ni se toman como WLTP. */
  wltpRangeKm?: number;
  batteryGrossKwh?: number;
  batteryNetKwh?: number;
  acKw?: number;
  dcKw?: number;
  accel0100?: number;
  cargoL?: number;
  markets: string[];
  hasEsPrice: boolean;
  batteryWarranty: boolean;
  sourceQuality: 'DEEP_LINK' | 'DOMAIN_ONLY';
}

const DRIVE = (d?: string) => (d === 'fwd' ? 'FWD' : d === 'rwd' ? 'RWD' : d === 'awd' || d === '4wd' ? 'AWD' : undefined);

export function parseOpenEv(json: unknown): { records: OevRecord[]; issues: string[] } {
  const root = z.object({ schema_version: z.string(), vehicle_count: z.number(), vehicles: z.array(z.unknown()) }).passthrough().parse(json);
  const records: OevRecord[] = [];
  const issues: string[] = [];
  root.vehicles.forEach((x, i) => {
    const p = OevVehicle.safeParse(x);
    if (!p.success) {
      issues.push(`vehicle[${i}]: ${p.error.issues[0]?.path.join('.')} ${p.error.issues[0]?.message}`);
      return;
    }
    const v = p.data;
    const wltp = v.range.rated.filter((r) => r.cycle === 'wltp');
    const d = DRIVE(v.powertrain.drivetrain);
    records.push({
      id: `${v.unique_code}#${v.year}#${v.trim.slug}${v.variant ? `#${v.variant.slug}` : ''}`,
      make: v.make.name,
      model: v.model.name,
      year: v.year,
      trim: v.trim.name,
      ...(v.variant ? { variant: v.variant.name } : {}),
      ...(d ? { drivetrain: d } : {}),
      ...(v.powertrain.system_power_kw !== undefined ? { systemPowerKw: v.powertrain.system_power_kw } : {}),
      ...(wltp.length === 1 ? { wltpRangeKm: wltp[0]!.range_km } : {}),
      ...(v.battery.pack_capacity_kwh_gross !== undefined ? { batteryGrossKwh: v.battery.pack_capacity_kwh_gross } : {}),
      ...(v.battery.pack_capacity_kwh_net !== undefined ? { batteryNetKwh: v.battery.pack_capacity_kwh_net } : {}),
      ...(v.charging.ac?.max_power_kw !== undefined ? { acKw: v.charging.ac.max_power_kw } : {}),
      ...(v.charging.dc?.max_power_kw !== undefined ? { dcKw: v.charging.dc.max_power_kw } : {}),
      ...(v.performance?.acceleration_0_100_kmh_s !== undefined ? { accel0100: v.performance.acceleration_0_100_kmh_s } : {}),
      ...(v.capacity?.cargo_l !== undefined ? { cargoL: v.capacity.cargo_l } : {}),
      markets: v.markets,
      hasEsPrice: !!v.pricing?.msrp.some((m) => m.country === 'ES'),
      batteryWarranty: !!v.battery.warranty,
      sourceQuality: v.sources.some((s) => !/^https?:\/\/[^/]+\/?$/.test(s.url)) ? 'DEEP_LINK' : 'DOMAIN_ONLY',
    });
  });
  return { records, issues };
}

/* ───────────────────────── S18 VehiclesDB (taxonomía) ───────────────────────── */

export interface VdbModel {
  make: string;
  model: string;
  kind: string;
  aliases: string[];
  formerIds: string[];
  availability: string[];
}

export function parseVehiclesDb(json: unknown): { version: string; license: string; models: VdbModel[] } {
  const root = z
    .object({
      version: z.string(),
      license: z.string(),
      makes: z.array(z.object({ name: z.string(), models: z.array(z.object({ name: z.string(), kind: z.string(), aliases: z.array(z.string()).optional(), former_ids: z.array(z.string()).optional(), availability: z.array(z.string()).optional() }).passthrough()) }).passthrough()),
    })
    .passthrough()
    .parse(json);
  return { version: root.version, license: root.license, models: root.makes.flatMap((mk) => mk.models.map((m) => ({ make: mk.name, model: m.name, kind: m.kind, aliases: m.aliases ?? [], formerIds: m.former_ids ?? [], availability: m.availability ?? [] }))) };
}

/* ───────────────────────── S19 Kilowatt (archivado) ───────────────────────── */

export interface KwRecord {
  id: string;
  brand: string;
  model: string;
  variant: string;
  year?: number;
  usableKwh?: number;
  acKw?: number;
  dcKw?: number;
}

export function parseKilowatt(json: unknown): { updatedAt: string; records: KwRecord[] } {
  const root = z
    .object({
      meta: z.object({ updated_at: z.string(), overall_count: z.number() }).passthrough(),
      data: z.array(z.object({ id: z.string(), brand: z.string(), model: z.string(), variant: z.string().nullable().optional(), release_year: z.number().optional(), usable_battery_size: z.number().optional(), ac_charger: z.object({ max_power: z.number().optional() }).passthrough().optional(), dc_charger: z.object({ max_power: z.number().optional() }).passthrough().nullable().optional() }).passthrough()),
    })
    .passthrough()
    .parse(json);
  return {
    updatedAt: root.meta.updated_at,
    records: root.data.map((d) => ({ id: d.id, brand: d.brand, model: d.model, variant: (d.variant ?? '').trim(), ...(d.release_year !== undefined ? { year: d.release_year } : {}), ...(d.usable_battery_size !== undefined ? { usableKwh: d.usable_battery_size } : {}), ...(d.ac_charger?.max_power !== undefined ? { acKw: d.ac_charger.max_power } : {}), ...(d.dc_charger?.max_power !== undefined ? { dcKw: d.dc_charger.max_power } : {}) })),
  };
}

/** Variante Kilowatt: tracción solo si el texto la nombra (AWD/4WD/Dual Motor → AWD; RWD/Rear → RWD). */
export function kilowattDrive(variant: string): 'AWD' | 'RWD' | 'FWD' | undefined {
  if (/\b(awd|4wd|dual motor|4motion|quattro|xdrive)\b/i.test(variant)) return 'AWD';
  if (/\b(rwd|rear)\b/i.test(variant)) return 'RWD';
  if (/\bfwd\b/i.test(variant)) return 'FWD';
  return undefined;
}
