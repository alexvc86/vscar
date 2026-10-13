import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildMessageCases } from './message-cases.ts';

/**
 * Step 7a.1 — golden de LÓGICA. El contrato de mensajes puede cambiar (claves, params, textos); la decisión no:
 * mismos enums, scores, ganador/empate, deltas, umbrales de robustez y confianza. El snapshot se generó con el
 * código ANTERIOR al cambio de contrato (VSCAR_GOLDEN_WRITE=1) y no se regenera para aceptar un cambio de lógica.
 */
const GOLDEN = new URL('./golden/logic-7a1.json', import.meta.url);

/** Campos de explicación (texto o mensaje): fuera de la proyección lógica. */
const TEXT_KEYS = new Set([
  'text', 'explanation', 'explanationMessage', 'message', 'messages', 'messageKey', 'params', 'details', 'note', 'noteMessage',
  'why', 'what', 'howMuch', 'forWhom', 'label', 'reason', 'reasons', 'reasonMessage', 'reasonMessages', 'detail', 'warnings',
  'rules', 'ruleMessages', 'forYouMessage', 'explanationMessages', 'whyMessages',
]);

function logic(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(logic);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .filter(([k]) => !TEXT_KEYS.has(k))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, x]) => [k, logic(x)]),
    );
  }
  return v;
}

describe('Step 7a.1 — decision logic unchanged by the message contract', () => {
  const projected = Object.fromEntries(Object.entries(buildMessageCases()).map(([k, v]) => [k, logic(v)]));

  if (process.env.VSCAR_GOLDEN_WRITE === '1') {
    it('writes the golden logic snapshot', () => {
      mkdirSync(new URL('./golden/', import.meta.url), { recursive: true });
      writeFileSync(GOLDEN, `${JSON.stringify(projected, null, 1)}\n`);
      expect(existsSync(GOLDEN)).toBe(true);
    });
    return;
  }

  const golden = JSON.parse(readFileSync(GOLDEN, 'utf8')) as Record<string, unknown>;
  for (const name of Object.keys(golden)) {
    it(`${name}: same enums, scores, winner/tie, deltas, robustness thresholds and confidence`, () => {
      expect(projected[name]).toEqual(golden[name]);
    });
  }
});
