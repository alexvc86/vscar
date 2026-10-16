import type { HomologationPowertrain } from '@vscar/vehicle-schema';
import { RDW_DATASETS } from './fields.ts';
import { rdwNumber, type RdwRawRow, type RdwVersion } from './normalize.ts';

/**
 * Observaciones RDW (mapeo v1) de una versión con coincidencia EXACT. Reglas:
 * - El powertrain de homologación viene del candidato EEA (no se deduce de RDW; RDW solo se contrasta).
 * - Rango = ondergrens–bovengrens. Si RDW publica un solo límite, el valor se conserva con `INFERRED` y nota.
 * - Campos NEDC solo si la fila no trae WLTP y la revisión es anterior a 2021 (en homologaciones WLTP posteriores
 *   RDW rellena a veces los campos "NEDC": se registran como anomalía, nunca como NEDC).
 * - Valores iguales en varias revisiones → una observación con todas las revisiones; distintos → una por revisión.
 * - Datos comerciales/de matriculación neerlandeses nunca entran (ver `RDW_MAPPING`, `rejected`).
 */
export type RdwStructuralField = 'seats' | 'doors' | 'drivetrain' | 'body_type' | 'body_code_eu' | 'gears' | 'gearbox_code' | 'emissions_standard_family' | 'emissions_standard_raw' | 'homologation_powertrain' | 'commercial_name' | 'manufacturer_type';

export interface RdwObservation {
  target: 'spec' | 'structural';
  key: string;
  value?: number | string;
  min?: number;
  max?: number;
  unit?: string | null;
  testCycle?: 'WLTP' | 'NEDC';
  measurementBasis?: Record<string, string>;
  rangeBasis?: 'HOMOLOGATION_FAMILY' | 'UNSPECIFIED';
  dataset: string;
  externalField: string;
  revisions: number[];
  validFrom?: string;
  validTo?: string;
  sourceRecordIds: string[];
  mappingConfidence: 'CROSS_MARKET_EXACT_HOMOLOGATION' | 'INFERRED';
  notes: string[];
}

export interface RdwMappingResult {
  observations: RdwObservation[];
  /** Valores distintos entre revisiones de la misma versión: se conservan todos. */
  revisionConflicts: string[];
  anomalies: string[];
}

const NEDC_LAST_DATE = '2021-01-01';
/**
 * Código de carrocería UE → `body_type` de VScar solo cuando es inequívoco. Verificado con datos reales (D1.1): el Golf
 * de 5 puertas (hatchback) y los SUV RAV4/X3 se homologan como AC ("station wagon"); Tucson y Model Y como AF →
 * AB/AC/AF/AG no distinguen hatchback, familiar, SUV y monovolumen: se conserva el código, no se traduce.
 */
const BODY: Record<string, string> = { AA: 'sedan', AD: 'coupe', AE: 'convertible' };

type Draft = Omit<RdwObservation, 'revisions' | 'sourceRecordIds' | 'validFrom' | 'validTo'>;

function rangeOf(r: RdwRawRow, lo: string, hi: string, convert: (x: number) => number = (x) => x): Pick<Draft, 'value' | 'min' | 'max' | 'mappingConfidence' | 'notes'> | undefined {
  const a = rdwNumber(r, lo);
  const b = rdwNumber(r, hi);
  if (a === undefined && b === undefined) return undefined;
  if (a !== undefined && b !== undefined) {
    const [x, y] = [convert(a), convert(b)];
    return x === y ? { value: x, mappingConfidence: 'CROSS_MARKET_EXACT_HOMOLOGATION', notes: [] } : { min: Math.min(x, y), max: Math.max(x, y), mappingConfidence: 'CROSS_MARKET_EXACT_HOMOLOGATION', notes: [] };
  }
  const only = a ?? b!;
  return { value: convert(only), mappingConfidence: 'INFERRED', notes: [`RDW publishes only ${a === undefined ? hi : lo} (single bound)`] };
}

const round1 = (x: number) => Math.round(x * 10) / 10;
const int = (x: number) => Math.round(x);

function draftsForVersion(v: RdwVersion, hp: HomologationPowertrain, anomalies: string[]): Array<Draft & { record: string }> {
  const out: Array<Draft & { record: string }> = [];
  const id = (ds: string, extra = '') => `S11:${ds}:${v.tan}|${v.variant}|${v.version}|r${v.revision}${extra}`;
  const push = (record: string, d: Draft | undefined) => d && out.push({ ...d, record });
  const b = v.basis;
  const B = RDW_DATASETS.basis.id;
  if (b) {
    const dim = (key: string, lo: string, hi: string) => {
      const r = rangeOf(b, lo, hi, int);
      if (r) push(id(B), { target: 'spec', key, unit: 'mm', dataset: B, externalField: `${lo}/${hi}`, ...(r.min !== undefined ? { rangeBasis: 'HOMOLOGATION_FAMILY' } : {}), ...r, notes: [...r.notes, ...(r.min !== undefined ? ['envelope of all versions of the variant (RDW glossary)'] : [])] });
    };
    dim('dim.length_mm', 'lengteondergrens', 'lengtebovengrens');
    dim('dim.width_mm', 'breedteondergrens', 'breedtebovengrens');
    dim('dim.height_mm', 'hoogteondergrens', 'hoogtebovengrens');
    dim('dim.wheelbase_mm', 'wielbasisondergrens', 'wielbasisbovengrens');
    const m = rangeOf(b, 'massarijklaarondergrens', 'massarijklaarbovengrens', int);
    if (m) push(id(B), { target: 'spec', key: 'dim.mass_kg', unit: 'kg', dataset: B, externalField: 'massarijklaar', measurementBasis: { mass_definition: 'EU_RUNNING_ORDER' }, ...(m.min !== undefined ? { rangeBasis: 'UNSPECIFIED' } : {}), ...m });
    const g = rangeOf(b, 'maximummassaondergrens', 'maximummassabovengrens', int);
    if (g) push(id(B), { target: 'spec', key: 'dim.gross_weight_kg', unit: 'kg', dataset: B, externalField: 'maximummassa', measurementBasis: { mass_definition: 'GROSS_VEHICLE' }, ...(g.min !== undefined ? { rangeBasis: 'UNSPECIFIED' } : {}), ...g });
    const s = rangeOf(b, 'maxconstructiesnelheidahwogr', 'maxconstructiesnelheidahwbgr', int);
    if (s) push(id(B), { target: 'spec', key: 'perf.top_speed_kmh', unit: 'km/h', dataset: B, externalField: 'maxconstructiesnelheidahw', ...(s.min !== undefined ? { rangeBasis: 'UNSPECIFIED' } : {}), ...s });
    for (const [field, lo, hi] of [['seats', 'aantalzitplaatsenondergrens', 'aantalzitplaatsenbovengrens'], ['doors', 'aantaldeurenondergrens', 'aantaldeurenbovengrens']] as const) {
      const a = rdwNumber(b, lo), c = rdwNumber(b, hi);
      if (a !== undefined && a === c) push(id(B), { target: 'structural', key: field, value: a, dataset: B, externalField: `${lo}/${hi}`, mappingConfidence: 'CROSS_MARKET_EXACT_HOMOLOGATION', notes: [] });
      else if (a !== undefined || c !== undefined) anomalies.push(`${v.key}: ${field} given as a range ${a}–${c}: not used as a structural value`);
    }
  }

  const E = RDW_DATASETS.energiebron.id;
  const fuelRows = v.energy.filter((r) => r.codeenergiebron === 'B' || r.codeenergiebron === 'D');
  const elecRows = v.energy.filter((r) => r.codeenergiebron === 'E');
  const plugin = hp === 'OVC_HEV';
  for (const r of v.energy) {
    const rec = id(E, `|e${r.volgnummerenergiebron ?? '?'}`);
    const fuel = r.codeenergiebron === 'B' || r.codeenergiebron === 'D';
    const elec = r.codeenergiebron === 'E';
    const hasWltp = Object.keys(r).some((k) => k.includes('wltp'));
    const nedcAllowed = !hasWltp && (v.validFrom ?? '9999') < NEDC_LAST_DATE;
    const nedcPresent = ['verbruikgecombineerdnedclaag', 'co2emisgecombineerdnedclaag', 'elekverbruikgecombineerdnedc', 'elektrischeactieradiusnedc'].some((f) => r[f] !== undefined);
    if (nedcPresent && !nedcAllowed) anomalies.push(`${v.key} energy ${r.codeenergiebron}: NEDC fields populated on a ${hasWltp ? 'WLTP row' : 'post-2020 approval'} → ignored (cycle cannot be confirmed as NEDC)`);

    const pw = rangeOf(r, 'maximumnettovermogenogr', 'maximumnettovermogenbgr', round1);
    if (pw && fuel) push(rec, hp === 'ICE' ? { target: 'spec', key: 'perf.power_max_kw', unit: 'kW', dataset: E, externalField: 'maximumnettovermogen', measurementBasis: { power_basis: 'ICE_ONLY' }, ...(pw.min !== undefined ? { rangeBasis: 'UNSPECIFIED' } : {}), ...pw } : { target: 'spec', key: 'perf.power_ice_kw', unit: 'kW', dataset: E, externalField: 'maximumnettovermogen', measurementBasis: { power_basis: 'ICE_ONLY' }, ...(pw.min !== undefined ? { rangeBasis: 'UNSPECIFIED' } : {}), ...pw });
    if (pw && elec) push(rec, { target: 'spec', key: 'perf.power_electric_kw', unit: 'kW', dataset: E, externalField: 'maximumnettovermogen', measurementBasis: { power_basis: 'ELECTRIC_ONLY' }, ...(pw.min !== undefined ? { rangeBasis: 'UNSPECIFIED' } : {}), ...pw });

    const em = r.uitlaatemissieniveau?.trim();
    if (em) {
      const fam = /EURO\s*([5-7])/i.exec(em);
      push(rec, { target: 'structural', key: 'emissions_standard_raw', value: em, dataset: E, externalField: 'uitlaatemissieniveau', mappingConfidence: 'CROSS_MARKET_EXACT_HOMOLOGATION', notes: [] });
      if (fam) push(rec, { target: 'structural', key: 'emissions_standard_family', value: `EURO_${fam[1]}`, dataset: E, externalField: 'uitlaatemissieniveau', mappingConfidence: 'CROSS_MARKET_EXACT_HOMOLOGATION', notes: [] });
    }

    const spec = (key: string, lo: string, hi: string, unit: string, cycle: 'WLTP' | 'NEDC', basis?: Record<string, string>, convert?: (x: number) => number, cap?: string) => {
      const x = rangeOf(r, lo, hi, convert);
      if (!x) return;
      push(rec, { target: 'spec', key, unit, testCycle: cycle, dataset: E, externalField: `${lo}/${hi}`, ...(basis ? { measurementBasis: basis } : {}), ...(x.min !== undefined ? { rangeBasis: 'UNSPECIFIED' } : {}), ...x, ...(cap ? { mappingConfidence: 'INFERRED', notes: [...x.notes, cap] } : {}) });
    };
    if (fuel) {
      if (plugin) {
        spec('nrg.fuel_charge_sustaining_l100', 'brandstofverbruikgecombwltpogr', 'brandstofverbruikgecombwltpbgr', 'L/100 km', 'WLTP', { consumption_basis: 'CHARGE_SUSTAINING' }, (x) => Math.round(x * 100) / 100);
        spec('emi.co2_charge_sustaining_gkm', 'co2emisgecombineerdwltpogr', 'co2emisgecombineerdwltpbgr', 'g/km', 'WLTP');
        spec('nrg.phev_weighted_fuel_l100', 'brandstverbrgewogencombwltpogr', 'brandstverbrgewogencombwltpbgr', 'L/100 km', 'WLTP', { consumption_basis: 'WEIGHTED_PHEV' }, (x) => Math.round(x * 100) / 100, 'glossary repeats the CS wording for the weighted field (erratum): weighted value, never used for cost');
        spec('emi.co2_combined_gkm', 'co2emisgewogengecombwltpogr', 'co2emisgewogengecombwltpbgr', 'g/km', 'WLTP');
      } else {
        spec('nrg.fuel_combined_l100', 'brandstofverbruikgecombwltpogr', 'brandstofverbruikgecombwltpbgr', 'L/100 km', 'WLTP', undefined, (x) => Math.round(x * 100) / 100);
        spec('emi.co2_combined_gkm', 'co2emisgecombineerdwltpogr', 'co2emisgecombineerdwltpbgr', 'g/km', 'WLTP');
        if (nedcAllowed) {
          spec('nrg.fuel_combined_l100', 'verbruikgecombineerdnedclaag', 'verbruikgecombineerdnedchoog', 'L/100 km', 'NEDC');
          spec('emi.co2_combined_gkm', 'co2emisgecombineerdnedclaag', 'co2emisgecombineerdnedchoog', 'g/km', 'NEDC');
        }
      }
    }
    if (elec) {
      const kwh = (x: number) => Math.round(x) / 10;
      if (hp === 'BEV') {
        spec('nrg.electric_combined_kwh100', 'verbruikvolledigelekwltpogr', 'verbruikvolledigelekwltpbgr', 'kWh/100 km', 'WLTP', { consumption_basis: 'COMBINED', charging_loss_basis: 'UNSPECIFIED' }, kwh);
        spec('rng.electric_combined_km', 'actieradiusvolledigelekwltpogr', 'actieradiusvolledigelekwltpbgr', 'km', 'WLTP', { range_type: 'WLTP_COMBINED' });
      }
      if (plugin) {
        spec('nrg.electric_combined_kwh100', 'elekverbrexternoplaadbwltpogr', 'elekverbrexternoplaadbwltpbgr', 'kWh/100 km', 'WLTP', { consumption_basis: 'UNSPECIFIED', charging_loss_basis: 'UNSPECIFIED' }, kwh);
        spec('rng.electric_combined_km', 'actieradiusvolledigelekwltpogr', 'actieradiusvolledigelekwltpbgr', 'km', 'WLTP', { range_type: 'AER' });
        spec('rng.electric_combined_km', 'actieradiusexternoplaadwltpogr', 'actieradiusexternoplaadwltpbgr', 'km', 'WLTP', { range_type: 'EAER' });
      }
    }
  }
  if (fuelRows.length === 0 && elecRows.length === 0 && v.energy.length) anomalies.push(`${v.key}: energy rows with codes ${[...new Set(v.energy.map((r) => r.codeenergiebron))].join('/')} not mapped`);

  const A = RDW_DATASETS.aandrijving.id;
  for (const r of v.drive) {
    const rec = id(A, `|a${r.volgnummeraandrijving ?? '?'}`);
    if (hp !== 'BEV') {
      const cc = rdwNumber(r, 'cilinderinhoud');
      if (cc !== undefined && cc > 0) push(rec, { target: 'spec', key: 'pt.displacement_cc', value: int(cc), unit: 'cm³', dataset: A, externalField: 'cilinderinhoud', mappingConfidence: 'CROSS_MARKET_EXACT_HOMOLOGATION', notes: [] });
      const cyl = rdwNumber(r, 'aantalcilinders');
      if (cyl !== undefined && cyl > 0) push(rec, { target: 'spec', key: 'pt.cylinders', value: cyl, unit: 'count', dataset: A, externalField: 'aantalcilinders', mappingConfidence: 'CROSS_MARKET_EXACT_HOMOLOGATION', notes: [] });
    }
    const ext = r.externoplaadbaarindicator, hyb = r.hybridemotorindicator, em = r.elektromotorindicator;
    const observed = ext === 'J' && hyb === 'J' ? 'OVC_HEV' : hyb === 'J' ? 'NOVC_HEV' : em === 'J' && !rdwNumber(r, 'cilinderinhoud') ? 'BEV' : em === 'N' && hyb === 'N' ? 'ICE' : undefined;
    if (observed) push(rec, { target: 'structural', key: 'homologation_powertrain', value: observed, dataset: A, externalField: 'externoplaadbaar/hybride/elektromotor indicators', mappingConfidence: 'CROSS_MARKET_EXACT_HOMOLOGATION', notes: ['cross-check only'] });
  }

  const C = RDW_DATASETS.carrosserie.id;
  for (const r of v.body) {
    const code = r.codecarrosserietype?.trim();
    if (!code) continue;
    push(id(C), { target: 'structural', key: 'body_code_eu', value: code, dataset: C, externalField: 'codecarrosserietype', mappingConfidence: 'CROSS_MARKET_EXACT_HOMOLOGATION', notes: [] });
    if (BODY[code]) push(id(C), { target: 'structural', key: 'body_type', value: BODY[code]!, dataset: C, externalField: 'codecarrosserietype', mappingConfidence: 'CROSS_MARKET_EXACT_HOMOLOGATION', notes: [] });
  }
  const G = RDW_DATASETS.versnelling.id;
  for (const r of v.gearbox) {
    if (r.codetypeversnellingsbak) push(id(G), { target: 'structural', key: 'gearbox_code', value: r.codetypeversnellingsbak, dataset: G, externalField: 'codetypeversnellingsbak', mappingConfidence: 'INFERRED', notes: ['raw RDW code; code list not published → not mapped to transmission'] });
    const a = rdwNumber(r, 'aantalversnellingenondergrens'), c = rdwNumber(r, 'aantalversnellingenbovengrens');
    if (a !== undefined && a === c && a > 0) push(id(G), { target: 'structural', key: 'gears', value: a, dataset: G, externalField: 'aantalversnellingen', mappingConfidence: 'CROSS_MARKET_EXACT_HOMOLOGATION', notes: [] });
  }
  const X = RDW_DATASETS.as.id;
  if (v.axles.length) {
    const driven = v.axles.filter((r) => r.aangedrevenasindicator === 'J').map((r) => Number(r.volgnummeras)).sort();
    const dt = driven.length >= 2 ? 'AWD' : driven[0] === 1 ? 'FWD' : driven[0] === 2 ? 'RWD' : undefined;
    if (dt) push(id(X), { target: 'structural', key: 'drivetrain', value: dt, dataset: X, externalField: 'volgnummeras/aangedrevenasindicator', mappingConfidence: driven.length >= 2 ? 'CROSS_MARKET_EXACT_HOMOLOGATION' : 'INFERRED', notes: driven.length >= 2 ? [] : ['axle 1 = front by CoC numbering convention (not stated in the RDW glossary)'] });
  }
  const H = RDW_DATASETS.handelsbenaming.id;
  for (const r of v.names) {
    if (r.handelsbenamingfabrikant) push(id(H), { target: 'structural', key: 'commercial_name', value: r.handelsbenamingfabrikant.trim(), dataset: H, externalField: 'handelsbenamingfabrikant', mappingConfidence: 'CROSS_MARKET_EXACT_HOMOLOGATION', notes: ['model-level name: does not identify the trim'] });
    if (r.typeaanduidingfabrikant) push(id(H), { target: 'structural', key: 'manufacturer_type', value: r.typeaanduidingfabrikant.trim(), dataset: H, externalField: 'typeaanduidingfabrikant', mappingConfidence: 'CROSS_MARKET_EXACT_HOMOLOGATION', notes: [] });
  }
  return out;
}

export function mapRdwVersions(versions: readonly RdwVersion[], hp: HomologationPowertrain): RdwMappingResult {
  const anomalies: string[] = [];
  const revisionConflicts: string[] = [];
  const merged = new Map<string, RdwObservation>();
  for (const v of versions) {
    for (const d of draftsForVersion(v, hp, anomalies)) {
      const sig = JSON.stringify([d.target, d.key, d.value, d.min, d.max, d.testCycle, d.measurementBasis, d.externalField]);
      const prev = merged.get(sig);
      if (prev) {
        prev.revisions = [...new Set([...prev.revisions, v.revision])].sort((a, b) => a - b);
        prev.sourceRecordIds = [...new Set([...prev.sourceRecordIds, d.record])].sort();
        if (v.validFrom && (!prev.validFrom || v.validFrom < prev.validFrom)) prev.validFrom = v.validFrom;
        if (prev.validTo && (!v.validTo || v.validTo > prev.validTo)) {
          if (v.validTo) prev.validTo = v.validTo;
          else delete prev.validTo;
        }
        continue;
      }
      const { record, ...rest } = d;
      merged.set(sig, { ...rest, revisions: [v.revision], sourceRecordIds: [record], ...(v.validFrom ? { validFrom: v.validFrom } : {}), ...(v.validTo ? { validTo: v.validTo } : {}) });
    }
  }
  const observations = [...merged.values()].sort((a, b) => a.key.localeCompare(b.key) || a.externalField.localeCompare(b.externalField) || (a.revisions[0] ?? 0) - (b.revisions[0] ?? 0));
  const byKey = new Map<string, RdwObservation[]>();
  for (const o of observations) byKey.set(`${o.target}:${o.key}:${o.testCycle ?? ''}:${JSON.stringify(o.measurementBasis ?? {})}`, [...(byKey.get(`${o.target}:${o.key}:${o.testCycle ?? ''}:${JSON.stringify(o.measurementBasis ?? {})}`) ?? []), o]);
  for (const [k, list] of byKey) if (list.length > 1 && versions.length > 1 && new Set(list.map((o) => o.revisions.join(','))).size > 1) revisionConflicts.push(`${k}: different values across RDW revisions (${list.map((o) => `${o.value ?? `${o.min}–${o.max}`} r${o.revisions.join('/')}`).join(' vs ')})`);
  return { observations, revisionConflicts, anomalies };
}


