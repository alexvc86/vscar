import { z } from 'zod';
import { readCsvRows } from '../acquisition/csv.ts';
import { listZipEntries, openZipEntry } from '../acquisition/zip.ts';

/**
 * S14 — gor3a/vehicle-makes-models (Step D1.4). Dataset de investigación: marcas → modelos → "generaciones" → motores.
 * Código MIT; **datos ODbL 1.0** declarados por el repositorio, compilados de autoevolution.com (derechos de origen sin
 * acreditar). No contiene homologación (TAN/Va/Ve): nunca puede dar identidad técnica, solo candidatos de nivel 1–2.
 * Solo se leen los artefactos de datos de una release fijada; nunca se ejecutan los scripts del repositorio.
 */
export const GOR3A_DATASET = {
  source_code: 'S14',
  name: 'gor3a/vehicle-makes-models',
  repository: 'https://github.com/gor3a/vehicle-makes-models',
  release: 'v1.0.2',
  commit: 'ee99776470a45214bf524cdfe22e5dbf4bd67f93',
  data_commit: '718f8e789898e612eaee57ed9e76b37b9187a2d5',
  release_url: 'https://github.com/gor3a/vehicle-makes-models/releases/tag/v1.0.2',
  data_license: 'ODbL 1.0',
  data_license_url: 'https://opendatacommons.org/licenses/odbl/1-0/',
  code_license: 'MIT',
  upstream: 'autoevolution.com',
  attribution: 'vehicle-makes-models (github.com/gor3a/vehicle-makes-models), ODbL 1.0 — upstream: autoevolution.com',
} as const;

/* Schema del JSON tier-3 (scripts/schema.ts del repositorio, leído, no ejecutado). `.strict()` → un campo nuevo es deriva. */
export const Gor3aEngine = z
  .object({
    label: z.string(),
    fuelType: z.string().nullable(),
    cylinders: z.number().nullable(),
    displacementCc: z.number().nullable(),
    powerHp: z.number().nullable(),
    torqueNm: z.number().nullable(),
    transmission: z.string().nullable(),
    drivetrain: z.string().nullable(),
    zeroToHundredKmhS: z.number().nullable(),
    topSpeedKmh: z.number().nullable(),
    fuelEconomyCombinedL100: z.number().nullable(),
    lengthMm: z.number().nullable(),
    widthMm: z.number().nullable(),
    heightMm: z.number().nullable(),
    wheelbaseMm: z.number().nullable(),
    curbWeightKg: z.number().nullable(),
    specs: z.record(z.string(), z.string()),
  })
  .strict();
export const Gor3aGeneration = z.object({ name: z.string(), yearStart: z.number().nullable(), yearEnd: z.number().nullable(), bodyType: z.string().nullable(), engines: z.array(Gor3aEngine) }).strict();
export const Gor3aModel = z.object({ name: z.string(), yearStart: z.number().nullable(), yearEnd: z.number().nullable(), generations: z.array(Gor3aGeneration).default([]) }).strict();
export const Gor3aMake = z.object({ name: z.string(), country: z.string().optional(), models: z.array(Gor3aModel) }).strict();
export const Gor3aMakeFile = z.object({ group: z.string(), makes: z.array(Gor3aMake) }).strict();
export type Gor3aMakeFile = z.infer<typeof Gor3aMakeFile>;
export type Gor3aEngine = z.infer<typeof Gor3aEngine>;

/** Una fila por motor, con su generación; `id` estable = posición en el JSON de la release (reproducible). */
export interface Gor3aEngineRow {
  id: string;
  generationId: string;
  group: string;
  make: string;
  model: string;
  generation: string;
  genYearStart: number | null;
  genYearEnd: number | null;
  engine: Gor3aEngine;
}

export function flattenGor3a(files: readonly Gor3aMakeFile[]): Gor3aEngineRow[] {
  const rows: Gor3aEngineRow[] = [];
  for (const f of files)
    f.makes.forEach((mk, i) =>
      mk.models.forEach((mo, j) =>
        mo.generations.forEach((g, k) => {
          const generationId = `${f.group}/${i}/${j}/${k}`;
          g.engines.forEach((e, l) => rows.push({ id: `${generationId}/${l}`, generationId, group: f.group, make: mk.name, model: mo.name, generation: g.name, genYearStart: g.yearStart, genYearEnd: g.yearEnd, engine: e }));
        }),
      ),
    );
  return rows;
}

export function countGor3a(files: readonly Gor3aMakeFile[]) {
  let makes = 0;
  let models = 0;
  let generations = 0;
  let engines = 0;
  for (const f of files)
    for (const mk of f.makes) {
      makes++;
      for (const mo of mk.models) {
        models++;
        for (const g of mo.generations) {
          generations++;
          engines += g.engines.length;
        }
      }
    }
  return { makeGroups: files.length, makes, models, generations, engines };
}

/** Lee los JSON por marca de `vehicle-data-json.zip` (se ignora `all.json`, que los repite) y los valida. */
export async function readGor3aJsonZip(path: string): Promise<{ files: Gor3aMakeFile[]; issues: string[] }> {
  const entries = (await listZipEntries(path)).filter((e) => /^json\/[^/]+\.json$/.test(e.name) && e.name !== 'json/all.json').sort((a, b) => a.name.localeCompare(b.name));
  const files: Gor3aMakeFile[] = [];
  const issues: string[] = [];
  for (const e of entries) {
    const parts: Buffer[] = [];
    for await (const c of await openZipEntry(path, e)) parts.push(c as Buffer);
    const parsed = Gor3aMakeFile.safeParse(JSON.parse(Buffer.concat(parts).toString('utf8')));
    if (parsed.success) files.push(parsed.data);
    else issues.push(`${e.name}: ${parsed.error.issues[0]?.path.join('.')} ${parsed.error.issues[0]?.message}`);
  }
  return { files, issues };
}

export const GOR3A_ENGINES_CSV_HEADER = ['make_group', 'make', 'model', 'generation', 'gen_year_start', 'gen_year_end', 'body_type', 'engine_label', 'fuel_type', 'cylinders', 'displacement_cc', 'power_hp', 'torque_nm', 'transmission', 'drivetrain', 'zero_to_100_s', 'top_speed_kmh', 'fuel_economy_combined_l100', 'length_mm', 'width_mm', 'height_mm', 'wheelbase_mm', 'curb_weight_kg'] as const;

/** Clave de paridad JSON ↔ CSV (mismos campos tipados; vacío = null). */
export const gor3aParityKey = (v: readonly (string | number | null)[]) => v.map((x) => (x === null || x === undefined ? '' : String(x))).join('\u001f');
export const gor3aRowParityKey = (r: Gor3aEngineRow) => {
  const e = r.engine;
  return gor3aParityKey([r.group, r.make, r.model, r.generation, r.genYearStart, r.genYearEnd, null, e.label, e.fuelType, e.cylinders, e.displacementCc, e.powerHp, e.torqueNm, e.transmission, e.drivetrain, e.zeroToHundredKmhS, e.topSpeedKmh, e.fuelEconomyCombinedL100, e.lengthMm, e.widthMm, e.heightMm, e.wheelbaseMm, e.curbWeightKg]);
};

/** Paridad multiconjunto entre filas JSON y `engines.csv` (cabecera exacta exigida). */
export async function gor3aCsvParity(csv: AsyncIterable<string | Buffer>, rows: readonly Gor3aEngineRow[]): Promise<{ csvRows: number; jsonRows: number; onlyInJson: number; onlyInCsv: number; headerOk: boolean }> {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = gor3aRowParityKey(r);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let header: string[] | undefined;
  let csvRows = 0;
  let onlyInCsv = 0;
  for await (const r of readCsvRows(csv)) {
    if (!header) {
      header = r.fields;
      continue;
    }
    csvRows++;
    const k = gor3aParityKey(r.fields.map((f) => f.trim()).map((f) => (f === '' ? null : f)).map((f, i) => (f !== null && /^(gen_year|cylinders|displacement|power|torque|zero|top|fuel_economy|length|width|height|wheelbase|curb)/.test(GOR3A_ENGINES_CSV_HEADER[i] ?? '') ? Number(f) : f)));
    const n = counts.get(k) ?? 0;
    if (n > 0) counts.set(k, n - 1);
    else onlyInCsv++;
  }
  const onlyInJson = [...counts.values()].reduce((s, n) => s + n, 0);
  return { csvRows, jsonRows: rows.length, onlyInJson, onlyInCsv, headerOk: JSON.stringify(header) === JSON.stringify(GOR3A_ENGINES_CSV_HEADER) };
}

/* ───────── Parseo de los valores crudos de `specs` (unidades explícitas en el texto; nunca se convierte HP) ───────── */

const num = (s: string | undefined) => (s === undefined ? undefined : Number(s.replace(/,/g, '')));

/** "167.6 in (4257 mm)" → 4257. Solo el valor métrico entre paréntesis. */
export const gor3aMillimetres = (v: string | undefined) => num(/\(([\d.,]+)\s*mm\)/i.exec(v ?? '')?.[1]);
/** "13.4 cuFT (379 L)" → 379. Método (VDA/SAE, asientos) no declarado. */
export const gor3aLitres = (v: string | undefined) => num(/\(([\d.,]+)\s*L\)/.exec(v ?? '')?.[1]);
/** "80.9 KW @ 5000-5500 RPM110 HP …" → 80.9 kW. Si no hay KW explícito → undefined (el "HP" del origen es PS en muchos casos: no se convierte). */
export const gor3aKw = (v: string | undefined) => num(/([\d.]+)\s*KW\b/i.exec(v ?? '')?.[1]);
/** "9.9 s" → 9.9 (campo etiquetado "0-62 Mph (0-100 kph)"; 62 mph ≈ 100 km/h, no hay conversión). */
export const gor3aSeconds = (v: string | undefined) => num(/^([\d.]+)\s*s\b/i.exec((v ?? '').trim())?.[1]);
/** "122 mph (196 km/h)" → 196. */
export const gor3aKmh = (v: string | undefined) => num(/\(([\d.]+)\s*km\/h\)/i.exec(v ?? '')?.[1]);
/** "2725 lbs (1236 kg)" → 1236. */
export const gor3aKg = (v: string | undefined) => num(/\(([\d.,]+)\s*kg\)/i.exec(v ?? '')?.[1]);

export const GOR3A_SPEC = {
  power: 'ENGINE SPECS / Power',
  motorPower: 'ENGINE SPECS / Electrical motor power',
  systemPower: 'ENGINE SPECS / Total maximum power',
  cargo: 'DIMENSIONS / Cargo Volume',
  accel: 'PERFORMANCE SPECS / Acceleration 0-62 Mph (0-100 kph)',
  topSpeed: 'PERFORMANCE SPECS / Top Speed',
  length: 'DIMENSIONS / Length',
  width: 'DIMENSIONS / Width',
  height: 'DIMENSIONS / Height',
  wheelbase: 'DIMENSIONS / Wheelbase',
  unladen: 'WEIGHT SPECS / Unladen Weight',
  gearbox: 'TRANSMISSION SPECS / Gearbox',
  batteryNominal: 'POWER SYSTEM SPECS / Nominal Capacity',
  batteryMax: 'POWER SYSTEM SPECS / Maximum Capacity',
  chargeNormal: 'POWER SYSTEM SPECS / Charging time (normal)',
  chargeQuick: 'POWER SYSTEM SPECS / Charging time (quick)',
} as const;

/** Potencia en kW con su base: ICE ("Power"), motor eléctrico o sistema. Nunca a partir de HP. */
export function gor3aPowerKw(e: Gor3aEngine): { kw?: number; basis?: 'ENGINE' | 'ELECTRIC_MOTOR' | 'SYSTEM' } {
  const p = gor3aKw(e.specs[GOR3A_SPEC.power]);
  if (p !== undefined) return { kw: p, basis: 'ENGINE' };
  const m = gor3aKw(e.specs[GOR3A_SPEC.motorPower]);
  if (m !== undefined) return { kw: m, basis: 'ELECTRIC_MOTOR' };
  const s = gor3aKw(e.specs[GOR3A_SPEC.systemPower]);
  return s !== undefined ? { kw: s, basis: 'SYSTEM' } : {};
}

/** Caja: manual / automática / 1 marcha; CVT (incl. eCVT, CVTi y "Planetary Gear System" de los híbridos Toyota) queda aparte, sin equivalente inequívoco (como Traficom código 3). */
export function gor3aTransmission(t: string | null | undefined): { kind?: 'manual' | 'automatic' | 'single_speed' | 'cvt'; gears?: number } {
  const s = (t ?? '').trim();
  if (!s) return {};
  const g = /(\d+)\s*[- ]?\s*speed/i.exec(s);
  const gears = g ? Number(g[1]) : undefined;
  const out = (kind: 'manual' | 'automatic' | 'single_speed' | 'cvt') => (gears !== undefined ? { kind, gears } : { kind });
  if (/CVT|continuously variable|planetary gear/i.test(s)) return out('cvt');
  if (gears === 1) return out('single_speed');
  if (/manual/i.test(s)) return out('manual');
  if (/automatic|DSG|DCT|TCT|dual( dry)?[- ]clutch|tiptronic|steptronic|EAT/i.test(s)) return out('automatic');
  return {};
}

const GOR3A_DRIVE: Readonly<Record<string, 'FWD' | 'RWD' | 'AWD'>> = { 'Front Wheel Drive': 'FWD', 'Rear Wheel Drive': 'RWD', 'All Wheel Drive': 'AWD' };
export const gor3aDrive = (d: string | null | undefined): 'FWD' | 'RWD' | 'AWD' | undefined => GOR3A_DRIVE[d ?? ''];

/** Carrocería y puertas declaradas en el nombre del modelo/generación ("Golf 5 Doors (2017)", "Golf Variant (2017)"). */
export function gor3aBodyFromName(model: string, generation: string): { doors?: number; body?: 'estate' | 'sedan' | 'hatchback' | 'convertible' | 'coupe' } {
  const s = `${model} ${generation}`;
  const d = /\b(\d)\s*doors?\b/i.exec(s);
  const doors = d ? Number(d[1]) : undefined;
  const body = /\b(variant|combi|sw|estate|wagon|touring|st|sportswagon|sports tourer|break|grandtour)\b/i.test(s)
    ? 'estate'
    : /\b(sedan|saloon|limousine)\b/i.test(s)
      ? 'sedan'
      : /\b(cabrio|cabriolet|convertible|roadster)\b/i.test(s)
        ? 'convertible'
        : /\bcoupe\b/i.test(s)
          ? 'coupe'
          : /\bhatchback\b/i.test(s)
            ? 'hatchback'
            : undefined;
  return { ...(doors !== undefined ? { doors } : {}), ...(body ? { body } : {}) };
}

/** Clase de tren motriz del origen → compatible con `productClass` de VScar (lista cerrada; desconocido → sin match). */
export const GOR3A_FUEL: Readonly<Record<string, { fuel?: 'petrol' | 'diesel' | 'lpg' | 'cng'; classes: readonly string[] }>> = {
  Gasoline: { fuel: 'petrol', classes: ['ICE_OR_MHEV'] },
  Diesel: { fuel: 'diesel', classes: ['ICE_OR_MHEV'] },
  'Mild Hybrid': { fuel: 'petrol', classes: ['ICE_OR_MHEV', 'MHEV', 'HEV_OR_MHEV'] },
  'Mild Hybrid Diesel': { fuel: 'diesel', classes: ['ICE_OR_MHEV', 'MHEV', 'HEV_OR_MHEV'] },
  Hybrid: { fuel: 'petrol', classes: ['HEV_OR_MHEV'] },
  'Hybrid Gasoline': { fuel: 'petrol', classes: ['HEV_OR_MHEV'] },
  'Hybrid Diesel': { fuel: 'diesel', classes: ['HEV_OR_MHEV'] },
  'Plug-in Hybrid': { classes: ['PHEV'] },
  Electric: { classes: ['BEV'] },
  'Natural Gas': { fuel: 'cng', classes: ['ICE_OR_MHEV'] },
  'Liquefied Petroleum Gas (LPG)': { fuel: 'lpg', classes: ['ICE_OR_MHEV'] },
};
