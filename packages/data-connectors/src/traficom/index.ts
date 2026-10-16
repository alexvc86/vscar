import { readCsvRows } from '../acquisition/csv.ts';
import { normalizeTan } from '../eea/normalize.ts';

/**
 * Traficom (S13, Finlandia) — "Ajoneuvojen avoin data" (CC BY 4.0, avoindata.suomi.fi `ajoneuvojen-avoin-data`).
 * Una fila por vehículo del registro finlandés: se agrega SOLO por clave técnica exacta (TAN completo + Va + Ve) y solo
 * para las claves pedidas. Nunca se leen ni conservan campos de vehículo individual (municipio, cuentakilómetros,
 * primeros 10 caracteres del bastidor, nº secuencial, color).
 * Códigos según "Ajoneuvotiedot_avoin_data_luokitukset_24.03.2026.xlsx" (Traficom).
 */
export const TRAFICOM_DATASET = {
  source_code: 'S13',
  name: 'Traficom — Ajoneuvojen avoin data (Finnish open vehicle data)',
  catalog_url: 'https://avoindata.suomi.fi/data/en/dataset/ajoneuvojen-avoin-data',
  download_url: 'https://opendata.traficom.fi/Content/Ajoneuvorekisteri.zip',
  code_list_url: 'https://tieto.traficom.fi/files/media/file/Ajoneuvotiedot_avoin_data_luokitukset_24.03.2026.xlsx',
  license: 'CC BY 4.0',
  license_url: 'http://creativecommons.org/licenses/by/4.0/',
  attribution: 'Liikenne- ja viestintävirasto Traficom — Ajoneuvojen avoin data, CC BY 4.0',
  source_market: 'FI',
} as const;

/** Columnas que se leen (whitelist). Las personales/individuales no aparecen aquí. */
export const TRAFICOM_FIELDS = [
  'ajoneuvoluokka', 'ensirekisterointipvm', 'variantti', 'versio', 'ovienLukumaara', 'korityyppi', 'istumapaikkojenLkm', 'kayttovoima',
  'iskutilavuus', 'suurinNettoteho', 'sahkohybridi', 'sahkohybridinluokka', 'merkkiSelvakielinen', 'mallimerkinta', 'vaihteisto', 'vaihteidenLkm',
  'kaupallinenNimi', 'tyyppihyvaksyntanro',
] as const;
export const TRAFICOM_NEVER_READ = ['kunta', 'matkamittarilukema', 'valmistenumero2', 'jarnro', 'vari'] as const;

/** VAIHTEISTO (lista oficial): solo 1 y 2 tienen equivalente inequívoco en VScar. */
export const TRAFICOM_GEARBOX: Readonly<Record<string, { label: string; vscar?: 'manual' | 'automatic' }>> = {
  '1': { label: 'Manual', vscar: 'manual' },
  '2': { label: 'Automatic', vscar: 'automatic' },
  '3': { label: 'Stepless' },
  '4': { label: 'Manual/automatic' },
  '5': { label: 'Variator' },
  '6': { label: 'Variable transmission' },
  '7': { label: 'Foot-shifted' },
  X: { label: 'Not applicable' },
  Y: { label: 'Other' },
};

export interface TraficomAggregate {
  key: string;
  vehicles: number;
  firstRegistration?: { from: string; to: string };
  distributions: Record<'vaihteisto' | 'vaihteidenLkm' | 'korityyppi' | 'ovienLukumaara' | 'istumapaikkojenLkm' | 'kaupallinenNimi' | 'mallimerkinta' | 'suurinNettoteho' | 'iskutilavuus' | 'kayttovoima' | 'sahkohybridinluokka', Record<string, number>>;
}

const DIST_FIELDS = ['vaihteisto', 'vaihteidenLkm', 'korityyppi', 'ovienLukumaara', 'istumapaikkojenLkm', 'kaupallinenNimi', 'mallimerkinta', 'suurinNettoteho', 'iskutilavuus', 'kayttovoima', 'sahkohybridinluokka'] as const;

const isoFromFi = (d: string) => {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(d.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined;
};

export const traficomKey = (tan: string, variant: string, version: string) => `${normalizeTan(tan)}|${variant.trim().toUpperCase()}|${version.trim().toUpperCase()}`;

/** Recorre el CSV (`;`, ISO-8859-1) y agrega por clave exacta solo las claves pedidas. */
export async function aggregateTraficom(source: AsyncIterable<string | Buffer>, keys: ReadonlySet<string>): Promise<{ rows: number; matched: number; aggregates: Map<string, TraficomAggregate>; schemaIssues: string[] }> {
  let header: string[] | undefined;
  let idx: Record<string, number> = {};
  let rows = 0;
  let matched = 0;
  const aggregates = new Map<string, TraficomAggregate>();
  const schemaIssues: string[] = [];
  for await (const r of readCsvRows(source, ';', 'latin1')) {
    if (!header) {
      header = r.fields.map((h) => h.trim());
      idx = Object.fromEntries(header.map((h, i) => [h, i]));
      for (const f of TRAFICOM_FIELDS) if (!(f in idx)) schemaIssues.push(`missing column ${f}`);
      if (schemaIssues.length) throw new Error(`Traficom schema drift: ${schemaIssues.join(', ')}`);
      continue;
    }
    rows++;
    const get = (f: (typeof TRAFICOM_FIELDS)[number]) => (r.fields[idx[f]!] ?? '').trim();
    const tan = get('tyyppihyvaksyntanro');
    if (!tan) continue;
    const key = traficomKey(tan, get('variantti'), get('versio'));
    if (!keys.has(key)) continue;
    matched++;
    const a = aggregates.get(key) ?? { key, vehicles: 0, distributions: Object.fromEntries(DIST_FIELDS.map((f) => [f, {}])) as TraficomAggregate['distributions'] };
    a.vehicles++;
    for (const f of DIST_FIELDS) {
      const v = get(f);
      if (v !== '') a.distributions[f][v] = (a.distributions[f][v] ?? 0) + 1;
    }
    const d = isoFromFi(get('ensirekisterointipvm'));
    if (d) a.firstRegistration = a.firstRegistration ? { from: d < a.firstRegistration.from ? d : a.firstRegistration.from, to: d > a.firstRegistration.to ? d : a.firstRegistration.to } : { from: d, to: d };
    aggregates.set(key, a);
  }
  return { rows, matched, aggregates, schemaIssues };
}

/** Caja de cambios con evidencia: un único código (≥ 95 % de los vehículos de la clave) y mapeable. */
export function traficomTransmission(a: TraficomAggregate | undefined): { value?: 'manual' | 'automatic'; code?: string; share?: number; reason: string } {
  if (!a) return { reason: 'no Traficom vehicles for the exact key' };
  const dist = Object.entries(a.distributions.vaihteisto);
  const total = dist.reduce((s, [, n]) => s + n, 0);
  if (!total) return { reason: 'gearbox not reported' };
  const [code, n] = dist.sort((x, y) => y[1] - x[1])[0]!;
  const share = n / total;
  if (share < 0.95) return { code, share, reason: `gearbox codes disagree within the key (${dist.map(([c, k]) => `${c}×${k}`).join(', ')})` };
  const g = TRAFICOM_GEARBOX[code];
  return g?.vscar ? { value: g.vscar, code, share, reason: `Traficom code ${code} (${g.label})` } : { code, share, reason: `Traficom code ${code} (${g?.label ?? 'unknown'}) has no unambiguous VScar transmission` };
}

/** Carrocería (KORITYYPPI = códigos UE): solo AA/AB/AD/AE son inequívocos; AC y AF se usan también para hatchback y SUV (D1.1). */
const TRAFICOM_BODY: Readonly<Record<string, 'sedan' | 'hatchback' | 'coupe' | 'convertible'>> = { AA: 'sedan', AB: 'hatchback', AD: 'coupe', AE: 'convertible' };

export function traficomBody(a: TraficomAggregate | undefined): { value?: 'sedan' | 'hatchback' | 'coupe' | 'convertible'; code?: string; share?: number; reason: string } {
  if (!a) return { reason: 'no Traficom vehicles for the exact key' };
  const dist = Object.entries(a.distributions.korityyppi);
  const total = dist.reduce((s, [, n]) => s + n, 0);
  if (!total) return { reason: 'body not reported' };
  const [code, n] = dist.sort((x, y) => y[1] - x[1])[0]!;
  const share = n / total;
  if (share < 0.95) return { code, share, reason: `body codes disagree within the key (${dist.map(([c, k]) => `${c}×${k}`).join(', ')})` };
  const v = TRAFICOM_BODY[code];
  return v ? { value: v, code, share, reason: `EU body code ${code}` } : { code, share, reason: `EU body code ${code} does not separate hatchback/estate/SUV/MPV` };
}
