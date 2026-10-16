/**
 * Parser CSV en streaming (RFC 4180): comillas dobles, comillas escapadas (`""`), separadores y saltos de línea
 * dentro de campos entrecomillados, CRLF/LF y BOM. Nunca carga el fichero entero: consume trozos y emite filas.
 * Todos los campos salen como string tal cual (sin recortar ni convertir): la interpretación es del normalizador.
 */
export interface CsvRow {
  /** Número de fila física (1 = cabecera) de la PRIMERA línea del registro: trazabilidad hasta el fichero original. */
  line: number;
  fields: string[];
}

export class CsvParser {
  private field = '';
  private row: string[] = [];
  private inQuotes = false;
  private quotePending = false;
  private line = 1;
  private rowStartLine = 1;
  private started = false;
  private sawAny = false;

  private readonly delimiter: string;

  constructor(delimiter = ',') {
    this.delimiter = delimiter;
  }

  /** Procesa un trozo y devuelve las filas completas que contiene. */
  push(chunk: string): CsvRow[] {
    const out: CsvRow[] = [];
    let i = 0;
    if (!this.started) {
      this.started = true;
      if (chunk.charCodeAt(0) === 0xfeff) i = 1;
    }
    for (; i < chunk.length; i++) {
      const c = chunk[i]!;
      this.sawAny = true;
      if (this.quotePending) {
        this.quotePending = false;
        if (c === '"') {
          this.field += '"';
          continue;
        }
        this.inQuotes = false;
      }
      if (this.inQuotes) {
        if (c === '"') this.quotePending = true;
        else {
          if (c === '\n') this.line++;
          this.field += c;
        }
        continue;
      }
      if (c === '"' && this.field === '') this.inQuotes = true;
      else if (c === this.delimiter) {
        this.row.push(this.field);
        this.field = '';
      } else if (c === '\n') {
        this.row.push(this.field.endsWith('\r') ? this.field.slice(0, -1) : this.field);
        out.push({ line: this.rowStartLine, fields: this.row });
        this.row = [];
        this.field = '';
        this.line++;
        this.rowStartLine = this.line;
      } else this.field += c;
    }
    return out;
  }

  /** Cierra el flujo: emite la última fila si el fichero no termina en salto de línea. */
  end(): CsvRow[] {
    if (this.inQuotes && !this.quotePending) throw new Error(`unterminated quoted field starting at line ${this.rowStartLine}`);
    if (!this.sawAny || (this.row.length === 0 && this.field === '')) return [];
    this.row.push(this.field.endsWith('\r') ? this.field.slice(0, -1) : this.field);
    const last = { line: this.rowStartLine, fields: this.row };
    this.row = [];
    this.field = '';
    return [last];
  }
}

/** Itera las filas de un flujo de texto (p. ej. `createReadStream(path, 'utf8')`). */
export async function* readCsvRows(source: AsyncIterable<string | Buffer>, delimiter = ','): AsyncGenerator<CsvRow> {
  const parser = new CsvParser(delimiter);
  const decoder = new TextDecoder('utf-8');
  for await (const chunk of source) {
    const text = typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
    yield* parser.push(text);
  }
  yield* parser.push(decoder.decode());
  yield* parser.end();
}

/** Parseo completo de un texto pequeño (tests, muestras). */
export function parseCsvText(text: string, delimiter = ','): CsvRow[] {
  const parser = new CsvParser(delimiter);
  return [...parser.push(text), ...parser.end()];
}
