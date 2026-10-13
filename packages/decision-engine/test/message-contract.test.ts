import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COMPARISON_MESSAGE_PARAM_SCHEMA, COMPARISON_MESSAGE_TEMPLATES } from '@vscar/comparison-engine';
import { isStructuredParamValue } from '@vscar/methodology';
import { MESSAGE_PARAM_SCHEMA, MESSAGE_TEMPLATES } from '../src/index.ts';
import { buildMessageCases, collectMessages } from './message-cases.ts';

/**
 * Step 7a.1 — Decision Message Contract. Toda explicación visible de los engines es `messageKey + params`
 * (datos). `text` es solo respaldo. Estos tests fallan si aparece una explicación visible sin clave, una clave
 * sin plantilla/esquema, un parámetro que no es dato, o un engine que importa i18n.
 */
const cases = buildMessageCases();
const TEMPLATES = { ...MESSAGE_TEMPLATES, ...COMPARISON_MESSAGE_TEMPLATES };
const SCHEMA = { ...MESSAGE_PARAM_SCHEMA, ...COMPARISON_MESSAGE_PARAM_SCHEMA };

describe('every visible decision explanation has a messageKey', () => {
  for (const [name, c] of Object.entries(cases)) {
    it(name, () => {
      const r = c.result;
      expect(r.alphaBestForYou.explanationMessage?.messageKey, 'alphaBestForYou').toBeTruthy();
      if (r.alphaBestForYou.closestCandidate) expect(r.alphaBestForYou.closestCandidate.noteMessage.messageKey).toBeTruthy();
      for (const t of r.topContributions) {
        expect(t.message?.messageKey, `contribution ${t.component}`).toBeTruthy();
        expect(Array.isArray(t.whyMessages)).toBe(true);
      }
      expect(r.technicalLeader.messages.length, 'technicalLeader').toBeGreaterThanOrEqual(r.technicalLeader.status === 'LEADER' ? 0 : 1);
      if (r.technicalLeader.reasons.length) expect(r.technicalLeader.messages.length).toBeGreaterThan(0);
      if (r.economicFit.reasons.length) expect(r.economicFit.messages.length, 'economicFit').toBeGreaterThan(0);
      if (r.economicFit.status !== 'LEADER' && r.candidates.length > 1) expect(r.economicFit.messages.length, `economicFit ${r.economicFit.status}`).toBeGreaterThan(0);
      for (const p of r.practicalFit) expect(p.messages.length, `practicalFit ${p.status}`).toBeGreaterThan(0);
      if (r.dataConfidence.reasons.length) expect(r.dataConfidence.messages.length, 'dataConfidence').toBeGreaterThan(0);
      for (const comp of r.alphaBestForYou.alphaFit.flatMap((a) => a.components)) if (comp.note) expect(comp.noteMessage?.messageKey).toBeTruthy();
      // 6c: ya eran mensajes; siguen siéndolo.
      expect(r.resultRobustness.messages.length).toBeGreaterThan(0);
      expect(r.recommendationConfidence.reasons.length).toBeGreaterThan(0);
      for (const w of Object.values(r.whyNotByCandidate)) for (const i of w.items) expect(i.messageKey).toBeTruthy();
      // Comparación (6a)
      for (const pair of c.pairs) {
        for (const m of [...pair.technicalComparisons, ...pair.economicComparison.metrics]) {
          if (m.reason) expect(m.reasonMessage?.messageKey, `${m.metric} reason`).toBeTruthy();
          if (m.explanation) expect(m.explanationMessage?.messageKey, `${m.metric} explanation`).toBeTruthy();
          if (m.meaningfulForYou?.rules.length) expect(m.meaningfulForYou.messages.length, `${m.metric} for you`).toBe(m.meaningfulForYou.rules.length);
        }
        if (pair.economicComparison.reason) expect(pair.economicComparison.reasonMessage?.messageKey).toBeTruthy();
        if (pair.dataConfidence.reasons.length) expect(pair.dataConfidence.messages.length).toBeGreaterThan(0);
      }
      for (const db of Object.values(c.dealBreakers)) for (const ch of db.checks) expect(ch.message?.messageKey, ch.criterion).toBeTruthy();
    });
  }
});

describe('message keys, params schema and structured params', () => {
  const all = Object.values(cases).flatMap((c) => collectMessages(c));
  it('the cases exercise a broad set of keys', () => {
    expect(new Set(all.map((m) => m.messageKey)).size).toBeGreaterThan(40);
  });
  it('every key has a fallback template and a params schema', () => {
    for (const m of all) {
      expect(TEMPLATES[m.messageKey], m.messageKey).toBeTypeOf('function');
      expect(SCHEMA[m.messageKey], m.messageKey).toBeDefined();
    }
    expect(Object.keys(SCHEMA).sort()).toEqual(Object.keys(TEMPLATES).sort());
  });
  it('every message carries its required params', () => {
    for (const m of all) for (const k of SCHEMA[m.messageKey]!) expect(m.params, `${m.messageKey}.${k}`).toHaveProperty(k);
  });
  it('params are data: primitives, no localized numbers, no currency strings, no sentences', () => {
    for (const m of all) for (const [k, v] of Object.entries(m.params)) expect(isStructuredParamValue(v), `${m.messageKey}.${k} = ${JSON.stringify(v)}`).toBe(true);
  });
  it('the old free-text params are gone (reason, label, detail, what, valueSubject)', () => {
    for (const m of all) for (const k of ['reason', 'label', 'detail', 'what', 'valueSubject', 'valueOther', 'description']) {
      if (m.messageKey === 'decision.confidence.cap' && k === 'reason') continue; // enum (estado del resultado)
      expect(m.params, `${m.messageKey} must not carry ${k}`).not.toHaveProperty(k);
    }
  });
  it('fallback text is rendered and never empty (debug / missing translation)', () => {
    for (const m of all) expect(m.text.length, m.messageKey).toBeGreaterThan(0);
  });
});

describe('engines stay locale-agnostic', () => {
  it('no i18n, React or web imports in decision/comparison engines or methodology', () => {
    for (const pkg of ['decision-engine', 'comparison-engine', 'methodology']) {
      const dir = new URL(`../../${pkg}/src/`, import.meta.url);
      for (const f of readdirSync(dir).filter((x) => x.endsWith('.ts'))) {
        const src = readFileSync(new URL(f, dir), 'utf8');
        expect(src, `${pkg}/${f}`).not.toMatch(/from ['"](next-intl|use-intl|react|react-dom|next\/|@vscar\/web)/);
        expect(src, `${pkg}/${f}`).not.toMatch(/messages\/(es|en)\.json/);
      }
    }
  });
});
