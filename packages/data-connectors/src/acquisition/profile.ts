/**
 * Inventario de columnas incremental (Step D1 §8): tipo detectado, nulos, ceros, cardinalidad y ejemplo, sin
 * convertir todo a string ni guardar el fichero en memoria. La cardinalidad se cuenta hasta `distinctCap`
 * (por encima se informa como mínimo: `distinctCapped = true`).
 */
export type DetectedType = 'empty' | 'integer' | 'decimal' | 'date_dmy' | 'date_iso' | 'text' | 'mixed';

export interface ColumnProfile {
  sourceField: string;
  /** Tipo dominante entre los valores no vacíos; `mixed` si ninguno llega al 95 %. */
  type: DetectedType;
  typeCounts: Partial<Record<DetectedType, number>>;
  count: number;
  /** Vacío literal (`''`) o ausente. */
  nullCount: number;
  nullRate: number;
  /** Valores numéricos exactamente 0: en varias fuentes significan "no aplica"/"sin dato", nunca se interpretan aquí. */
  zeroCount: number;
  zeroRate: number;
  distinct: number;
  distinctCapped: boolean;
  min?: number;
  max?: number;
  example?: string;
}

const INT = /^-?\d+$/;
const DEC = /^-?\d+[.,]\d+$/;
const DMY = /^\d{2}\/\d{2}\/\d{4}$/;
const ISO = /^\d{4}-\d{2}-\d{2}/;

export function detectType(value: string): DetectedType {
  if (value === '') return 'empty';
  if (INT.test(value)) return 'integer';
  if (DEC.test(value)) return 'decimal';
  if (DMY.test(value)) return 'date_dmy';
  if (ISO.test(value)) return 'date_iso';
  return 'text';
}

interface Acc {
  count: number;
  nulls: number;
  zeros: number;
  types: Map<DetectedType, number>;
  distinct: Set<string>;
  capped: boolean;
  min?: number;
  max?: number;
  example?: string;
}

export class ColumnProfiler {
  private readonly acc: Acc[];
  private readonly header: readonly string[];
  private readonly distinctCap: number;
  /** Columnas cuyo ejemplo no debe mostrarse (p. ej. datos personales). */
  private readonly sensitive: ReadonlySet<string>;

  constructor(header: readonly string[], distinctCap = 10_000, sensitive: ReadonlySet<string> = new Set()) {
    this.header = header;
    this.distinctCap = distinctCap;
    this.sensitive = sensitive;
    this.acc = header.map(() => ({ count: 0, nulls: 0, zeros: 0, types: new Map(), distinct: new Set(), capped: false }));
  }

  add(fields: readonly (string | null | undefined)[]): void {
    this.acc.forEach((a, i) => {
      const raw = fields[i];
      const v = raw === null || raw === undefined ? '' : String(raw);
      a.count++;
      const t = detectType(v);
      a.types.set(t, (a.types.get(t) ?? 0) + 1);
      if (t === 'empty') {
        a.nulls++;
        return;
      }
      if (t === 'integer' || t === 'decimal') {
        const n = Number(v.replace(',', '.'));
        if (n === 0) a.zeros++;
        a.min = a.min === undefined ? n : Math.min(a.min, n);
        a.max = a.max === undefined ? n : Math.max(a.max, n);
      }
      if (a.example === undefined && v !== '0') a.example = v;
      if (!a.capped) {
        a.distinct.add(v);
        if (a.distinct.size > this.distinctCap) a.capped = true;
      }
    });
  }

  result(): ColumnProfile[] {
    return this.header.map((name, i) => {
      const a = this.acc[i]!;
      const nonEmpty = a.count - a.nulls;
      const entries = [...a.types.entries()].filter(([t]) => t !== 'empty').sort((x, y) => y[1] - x[1]);
      let type: DetectedType = 'empty';
      if (entries.length > 0) {
        const [top, n] = entries[0]!;
        // Enteros y decimales mezclados son una columna decimal, no "mixed".
        const numeric = (a.types.get('integer') ?? 0) + (a.types.get('decimal') ?? 0);
        if (numeric >= 0.95 * nonEmpty && (a.types.get('decimal') ?? 0) > 0) type = 'decimal';
        else type = n >= 0.95 * nonEmpty ? top : 'mixed';
      }
      return {
        sourceField: name,
        type,
        typeCounts: Object.fromEntries(a.types),
        count: a.count,
        nullCount: a.nulls,
        nullRate: a.count ? a.nulls / a.count : 0,
        zeroCount: a.zeros,
        zeroRate: a.count ? a.zeros / a.count : 0,
        distinct: a.capped ? this.distinctCap : a.distinct.size,
        distinctCapped: a.capped,
        ...(a.min !== undefined ? { min: a.min, max: a.max } : {}),
        ...(a.example !== undefined && !this.sensitive.has(name) ? { example: a.example.slice(0, 80) } : {}),
      };
    });
  }
}
