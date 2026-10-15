import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildMessageCases } from './message-cases.ts';

/**
 * Step 8a — regresión COMPLETA new/new. El snapshot se generó con el código ANTERIOR a la capa de usados
 * (VSCAR_GOLDEN_WRITE_8A=1) e incluye todo: enums, scores, mensajes, params y textos de respaldo.
 * Solo se normalizan la versión de metodología y las huellas que la contienen (cambian por diseño al
 * publicar reglas nuevas): todo lo demás debe ser idéntico sin entrada de usado.
 */
const GOLDEN = new URL('./golden/full-pre-8a.json', import.meta.url);
const VERSIONED = new Set(['methodologyVersion', 'scenarioHash']);

function normalize(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(normalize);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .filter(([, x]) => x !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, x]) => [k, VERSIONED.has(k) ? '<versioned>' : normalize(x)]),
    );
  }
  return v;
}

describe('Step 8a — new/new output unchanged without used input', () => {
  const current = normalize(JSON.parse(JSON.stringify(buildMessageCases()))) as Record<string, unknown>;

  if (process.env.VSCAR_GOLDEN_WRITE_8A === '1') {
    it('writes the full pre-8a snapshot', () => {
      mkdirSync(new URL('./golden/', import.meta.url), { recursive: true });
      writeFileSync(GOLDEN, `${JSON.stringify(current, null, 1)}\n`);
      expect(existsSync(GOLDEN)).toBe(true);
    });
    return;
  }

  const golden = JSON.parse(readFileSync(GOLDEN, 'utf8')) as Record<string, unknown>;
  for (const name of Object.keys(golden)) {
    it(`${name}: identical result, messages and fallback texts`, () => {
      expect(current[name]).toEqual(golden[name]);
    });
  }
});
