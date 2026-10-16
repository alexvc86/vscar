/**
 * Familias comerciales candidatas (Step D1 §13). Es una HIPÓTESIS de curación, no un catálogo:
 * cada familia declara cómo se reconoce en cada fuente (sin adivinar).
 *
 * EEA (`Cn` es texto libre y cambia de formato entre años, verificado 2026-10-16):
 * - sin marca hasta 2021 ("GOLF"), con marca en 2024 ("TOYOTA COROLLA"); BMW y Mercedes usan el nombre de versión
 *   ("X3 xDrive20d", "A 200 D"); Peugeot usa texto comercial ("NUEVO 208 5P ALLURE…"); Tesla 2019 deja `Cn` vacío
 *   → Tesla se reconoce por `T` (Type): "3" = Model 3, "2" = Model S/X (excluido). Model Y por `T`/`Cn` verificados.
 * - El servidor filtra por marca y "contiene"; aquí se aplican `include`/`exclude` sobre `Cn` (o `T`) por fila.
 * IDAE: `Marca` normalizada (alias de distribuidor) + regex sobre `Modelo`; solo ámbito MAINLAND (Canarias aparte).
 */
export interface FamilyDefinition {
  id: string;
  label: string;
  brand: string;
  /** Marcas `Mk` de la EEA. */
  eeaMakes: readonly string[];
  /** Filtro de servidor `Cn LIKE '%x%'` (vacío = toda la marca, p. ej. Tesla con `Cn` vacío). */
  eeaCnContains: readonly string[];
  include: RegExp;
  exclude?: RegExp;
  /** Reconocimiento por `T` cuando `Cn` no sirve (Tesla). */
  eeaTypes?: readonly string[];
  idaeMakes: readonly string[];
  idaeModel: RegExp;
  idaeModelExclude?: RegExp;
  segment: string;
  notes?: string;
}

export const FAMILY_DEFINITIONS_VERSION = '2026-10-16';

export const FAMILIES: readonly FamilyDefinition[] = [
  { id: 'vw-golf', label: 'Volkswagen Golf', brand: 'Volkswagen', eeaMakes: ['VOLKSWAGEN'], eeaCnContains: ['GOLF'], include: /\bE?-?GOLF\b/, exclude: /SPORTSVAN|GOLF PLUS|\bGOLF R\b/, idaeMakes: ['Volkswagen'], idaeModel: /^(e-)?Golf\b/i, idaeModelExclude: /Sportsvan|Plus/i, segment: 'C', notes: 'Golf Sportsvan/Plus son otro modelo; Golf R excluido (nicho)' },
  { id: 'seat-leon', label: 'SEAT León', brand: 'SEAT', eeaMakes: ['SEAT'], eeaCnContains: ['LEON'], include: /\bLEON\b/, exclude: /CUPRA/, idaeMakes: ['SEAT'], idaeModel: /^(nuevo )?le[oó]n\b/i, idaeModelExclude: /cupra/i, segment: 'C', notes: 'CUPRA León (marca CUPRA desde 2020) no forma parte de la familia' },
  { id: 'cupra-formentor', label: 'CUPRA Formentor', brand: 'CUPRA', eeaMakes: ['CUPRA', 'SEAT'], eeaCnContains: ['FORMENTOR'], include: /\bFORMENTOR\b/, idaeMakes: ['CUPRA'], idaeModel: /formentor/i, segment: 'C-SUV' },
  { id: 'toyota-corolla', label: 'Toyota Corolla', brand: 'Toyota', eeaMakes: ['TOYOTA'], eeaCnContains: ['COROLLA'], include: /\bCOROLLA\b/, exclude: /CROSS/, idaeMakes: ['Toyota'], idaeModel: /^corolla\b/i, idaeModelExclude: /cross/i, segment: 'C', notes: 'Auris (predecesor en Europa) es otra denominación: no se mezcla; Corolla Cross excluido' },
  { id: 'toyota-rav4', label: 'Toyota RAV4', brand: 'Toyota', eeaMakes: ['TOYOTA'], eeaCnContains: ['RAV'], include: /\bRAV\s?4\b/, idaeMakes: ['Toyota'], idaeModel: /^rav\s?4/i, segment: 'D-SUV' },
  { id: 'toyota-yaris', label: 'Toyota Yaris', brand: 'Toyota', eeaMakes: ['TOYOTA'], eeaCnContains: ['YARIS'], include: /\bYARIS\b/, exclude: /CROSS|\bGR\b/, idaeMakes: ['Toyota'], idaeModel: /^yaris\b/i, idaeModelExclude: /cross|gr/i, segment: 'B', notes: 'Yaris Cross y GR Yaris son otros modelos' },
  { id: 'bmw-3', label: 'BMW Serie 3', brand: 'BMW', eeaMakes: ['BMW'], eeaCnContains: ['3', 'M3', 'SERIE 3', '3ER'], include: /^(3\d{2}[A-Z]*\b|M3\b|SERIE 3|3ER\b|3 SERIES)/i, exclude: /\bGT\b|GRAN TURISMO/i, idaeMakes: ['BMW'], idaeModel: /^(serie 3|3 series|m3)\b/i, idaeModelExclude: /gran turismo|gt\b/i, segment: 'D', notes: '`Cn` = denominación de motor (318d, 320d, 330e…); Serie 3 GT excluido' },
  { id: 'bmw-x3', label: 'BMW X3', brand: 'BMW', eeaMakes: ['BMW'], eeaCnContains: ['X3'], include: /^I?X3\b/i, idaeMakes: ['BMW'], idaeModel: /^(i)?x3\b/i, segment: 'D-SUV', notes: 'iX3 (BEV) incluido como variant de la familia' },
  { id: 'tesla-model-3', label: 'Tesla Model 3', brand: 'Tesla', eeaMakes: ['TESLA'], eeaCnContains: [], include: /MODEL ?3\b/, eeaTypes: ['3'], idaeMakes: ['Tesla'], idaeModel: /model\s?3/i, segment: 'D', notes: '`Cn` vacío (2019) o "MODEL" (2021): identificación por `T` = 3' },
  { id: 'tesla-model-y', label: 'Tesla Model Y', brand: 'Tesla', eeaMakes: ['TESLA'], eeaCnContains: [], include: /MODEL ?Y\b/, eeaTypes: ['Y', '005'], idaeMakes: ['Tesla'], idaeModel: /model\s?y/i, segment: 'D-SUV', notes: '`T` de Model Y verificado en los datos de la encuesta (ver informe de cobertura)' },
  { id: 'byd-seal', label: 'BYD SEAL', brand: 'BYD', eeaMakes: ['BYD'], eeaCnContains: ['SEAL'], include: /\bSEAL\b/, exclude: /SEAL\s?U\b|SEAL\s?6|SEALION/, idaeMakes: ['BYD'], idaeModel: /^seal\b/i, idaeModelExclude: /seal\s?u|seal\s?6|sealion/i, segment: 'D', notes: 'SEAL U (SUV) y SEAL 6 DM-i (berlina/touring PHEV) son otros modelos' },
  { id: 'hyundai-tucson', label: 'Hyundai Tucson', brand: 'Hyundai', eeaMakes: ['HYUNDAI'], eeaCnContains: ['TUCSON'], include: /TUCSON/, idaeMakes: ['Hyundai'], idaeModel: /tucson/i, segment: 'C-SUV', notes: '`Cn` "TUCSON,IX35"/"TUCSON IX35" es el mismo nombre de homologación' },
  { id: 'hyundai-kona', label: 'Hyundai Kona', brand: 'Hyundai', eeaMakes: ['HYUNDAI'], eeaCnContains: ['KONA'], include: /\bKONA\b/, idaeMakes: ['Hyundai'], idaeModel: /kona/i, segment: 'B-SUV' },
  { id: 'kia-sportage', label: 'Kia Sportage', brand: 'Kia', eeaMakes: ['KIA'], eeaCnContains: ['SPORTAGE'], include: /SPORTAGE/, idaeMakes: ['Kia'], idaeModel: /sportage/i, segment: 'C-SUV' },
  { id: 'kia-niro', label: 'Kia Niro', brand: 'Kia', eeaMakes: ['KIA'], eeaCnContains: ['NIRO'], include: /\bE?-?NIRO\b/, idaeMakes: ['Kia'], idaeModel: /niro/i, segment: 'C-SUV' },
  { id: 'renault-clio', label: 'Renault Clio', brand: 'Renault', eeaMakes: ['RENAULT'], eeaCnContains: ['CLIO'], include: /\bCLIO\b/, idaeMakes: ['Renault'], idaeModel: /clio/i, segment: 'B' },
  { id: 'renault-megane', label: 'Renault Mégane', brand: 'Renault', eeaMakes: ['RENAULT'], eeaCnContains: ['MEGANE'], include: /\bM[EÉ]GANE\b/, exclude: /SCENIC/, idaeMakes: ['Renault'], idaeModel: /m[eé]gane/i, idaeModelExclude: /sc[eé]nic/i, segment: 'C', notes: 'Mégane E-Tech Electric comparte nombre comercial (otra plataforma): se separa por powertrain' },
  { id: 'peugeot-208', label: 'Peugeot 208', brand: 'Peugeot', eeaMakes: ['PEUGEOT'], eeaCnContains: ['208'], include: /(^|[\s-])(N|E-)?208\b/, idaeMakes: ['Peugeot'], idaeModel: /(^|\s|e-)208\b/i, segment: 'B', notes: '`Cn` comercial libre ("NUEVO 208 5P ALLURE…"); 2008 es otro modelo' },
  { id: 'peugeot-308', label: 'Peugeot 308', brand: 'Peugeot', eeaMakes: ['PEUGEOT'], eeaCnContains: ['308'], include: /(^|[\s-])(N|E-)?308(SW)?\b/, idaeMakes: ['Peugeot'], idaeModel: /(^|\s|e-)308\b/i, segment: 'C' },
  { id: 'peugeot-3008', label: 'Peugeot 3008', brand: 'Peugeot', eeaMakes: ['PEUGEOT'], eeaCnContains: ['3008'], include: /(^|[\s-])(N|E-)?3008\b/, idaeMakes: ['Peugeot'], idaeModel: /(^|\s|e-)3008\b/i, segment: 'C-SUV' },
  { id: 'dacia-sandero', label: 'Dacia Sandero', brand: 'Dacia', eeaMakes: ['DACIA'], eeaCnContains: ['SANDERO'], include: /SANDERO/, idaeMakes: ['Dacia'], idaeModel: /sandero/i, segment: 'B' },
  { id: 'nissan-qashqai', label: 'Nissan Qashqai', brand: 'Nissan', eeaMakes: ['NISSAN'], eeaCnContains: ['QASHQAI'], include: /QASHQAI/, idaeMakes: ['Nissan'], idaeModel: /qashqai/i, segment: 'C-SUV' },
  { id: 'skoda-octavia', label: 'Škoda Octavia', brand: 'Škoda', eeaMakes: ['SKODA'], eeaCnContains: ['OCTAVIA'], include: /OCTAVIA/, idaeMakes: ['SKODA'], idaeModel: /octavia/i, segment: 'C' },
  { id: 'audi-a3', label: 'Audi A3', brand: 'Audi', eeaMakes: ['AUDI'], eeaCnContains: ['A3', 'A 3'], include: /^A ?3\b/, idaeMakes: ['Audi'], idaeModel: /^a3\b/i, segment: 'C', notes: 'S3/RS3 excluidos por el patrón anclado' },
  { id: 'mercedes-a', label: 'Mercedes-Benz Clase A', brand: 'Mercedes-Benz', eeaMakes: ['MERCEDES-BENZ'], eeaCnContains: ['A 1', 'A 2', 'A 3', 'A 4', 'A-KLASSE', 'A-CLASS', 'AMG A'], include: /^(MERCEDES-AMG |AMG )?A ?\d{2,3}\b|A-KLASSE|A-CLASS/, idaeMakes: ['Mercedes-Benz'], idaeModel: /^(clase a|a-class|a\s?\d{3})\b/i, idaeModelExclude: /sedan|limousine/i, segment: 'C', notes: '`Cn` = denominación de motor ("A 200 D"); A Sedán separado en IDAE' },
];

export function familyOfEeaRow(f: FamilyDefinition, cn: string, type: string): boolean {
  const name = cn.trim().toUpperCase();
  if (f.eeaTypes && (name === '' || name === 'MODEL')) return f.eeaTypes.includes(type.trim().toUpperCase());
  return f.include.test(name) && !(f.exclude?.test(name) ?? false);
}

export function familyOfIdaeRecord(f: FamilyDefinition, make: string, model: string): boolean {
  return f.idaeMakes.includes(make) && f.idaeModel.test(model.trim()) && !(f.idaeModelExclude?.test(model) ?? false);
}

/** Años de la encuesta EEA: uno o dos por periodo (Step D1 §13), FINAL salvo 2025 (solo provisional). */
export const SURVEY_YEARS = [
  { year: 2016, period: '2015–2018' },
  { year: 2018, period: '2015–2018' },
  { year: 2020, period: '2019–2021' },
  { year: 2022, period: '2022–2024' },
  { year: 2024, period: '2022–2024' },
  { year: 2025, period: '2025–2026' },
] as const;
export type SurveyPeriod = (typeof SURVEY_YEARS)[number]['period'];

export function periodOfYear(year: number): SurveyPeriod | '2010–2014' | 'other' {
  if (year >= 2010 && year <= 2014) return '2010–2014';
  if (year <= 2018) return '2015–2018';
  if (year <= 2021) return '2019–2021';
  if (year <= 2024) return '2022–2024';
  if (year <= 2026) return '2025–2026';
  return 'other';
}
