'use client';
import { MOTION } from '@vscar/ui/tokens';
import { AnimatePresence, LayoutGroup, motion, MotionConfig } from 'motion/react';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { notifyChaptersUpdated } from '@/client/scenario-nav';
import { COMPARISONS } from '@/domain/comparisons';
import { computeDecision } from '@/domain/decision';
import { scenarioKey, type Scenario } from '@/domain/scenario';
import { buildDecisionView, withRobustness, type DecisionView } from '@/domain/view-model';
import { MARKETS, parseLocaleSegment } from '@/i18n/locales';
import type { RobustnessRequest, RobustnessResponse } from '@/workers/robustness-protocol';
import { DecisionChapters } from './DecisionChapters';
import type { MotionKit } from './kit';

/**
 * Chunk DIFERIDO del recálculo: pipeline real en cliente (`createDecisionPipeline`, sin robustez),
 * robustez en un Web Worker, y Motion para tie_balance → tie_to_winner (marcador compartido + jerarquía de
 * layout; sin zoom, flash, glow ni confeti) y scenario_morph.
 */
export interface ClientDecisionProps {
  initialView: DecisionView;
  initialScenario: Scenario;
  scenario: Scenario;
  pathname: string;
  slug: string;
  locale: string;
  labels: { recalculating: string };
  messages: Record<string, unknown>;
}

const ease = (b: readonly number[]) => b as [number, number, number, number];

const MOTION_KIT: MotionKit = {
  Card: ({ dim, children, ...p }) => (
    <motion.article layout {...p} animate={{ opacity: dim ? 0.62 : 1 }}>
      {children}
    </motion.article>
  ),
  Marker: ({ hidden, className, children }) => (
    <motion.span layoutId="verdict" className={className} {...(hidden ? { 'aria-hidden': true } : {})}>
      {children}
    </motion.span>
  ),
  Morph: ({ morphKey, className, children }) => (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={morphKey} className={className} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: MOTION.scenario_morph.ms / 1000, ease: ease(MOTION.scenario_morph.css) }}>
        {children}
      </motion.div>
    </AnimatePresence>
  ),
};

export function ClientDecision(props: ClientDecisionProps) {
  const market = MARKETS[parseLocaleSegment(props.locale)?.market ?? 'ES'];
  return (
    <NextIntlClientProvider locale={props.locale} messages={props.messages} timeZone={market.timeZone}>
      <Recalculating {...props} />
    </NextIntlClientProvider>
  );
}

function Recalculating({ initialView, initialScenario, scenario, pathname, slug }: ClientDecisionProps) {
  const t = useTranslations();
  const [shown, setShown] = useState({ view: initialView, scenario: initialScenario, key: scenarioKey(initialScenario) });
  const [pending, setPending] = useState(false);
  const [announce, setAnnounce] = useState('');
  const worker = useRef<Worker | null>(null);
  const latest = useRef(0);

  useEffect(
    () => () => {
      worker.current?.terminate();
      worker.current = null;
    },
    [],
  );

  // Recalcular cuando cambia el escenario de la URL. Fuera del handler de input (se dispara tras el commit)
  // y en el siguiente frame, para que el marcador anime desde el estado anterior.
  useEffect(() => {
    const key = scenarioKey(scenario);
    if (key === shown.key) return;
    const def = COMPARISONS[slug];
    if (!def) return;
    const frame = requestAnimationFrame(() => {
      const run = computeDecision(def, scenario, { robustness: false });
      const fresh = buildDecisionView(def, run.input, run.result, false);
      // Hasta que el worker responda se conservan robustez y confianza anteriores (atenuadas, `aria-busy`):
      // nunca se muestra una confianza "sin robustez" como definitiva y no hay salto de layout.
      const view: DecisionView = { ...fresh, confidence: shown.view.confidence, ...(shown.view.robustness ? { robustness: shown.view.robustness } : {}) };
      setShown({ view, scenario, key });
      setPending(true);
      const statusText = t(`decision.announce.${fresh.status}`, { name: fresh.candidates.find((c) => c.side === fresh.selected)?.name ?? '', a: fresh.candidates[0].name, b: fresh.candidates[1].name });
      setAnnounce(fresh.status !== shown.view.status || fresh.selected !== shown.view.selected ? `${t('decision.announce.changed')} ${statusText}` : statusText);
      const id = ++latest.current;
      if (!worker.current) {
        worker.current = new Worker(new URL('../../workers/robustness.worker.ts', import.meta.url), { type: 'module' });
        worker.current.onmessage = (e: MessageEvent<RobustnessResponse>) => {
          const r = e.data;
          if (r.id !== latest.current) return;
          setPending(false);
          if (r.ok) setShown((s) => ({ ...s, view: withRobustness(s.view, r) }));
        };
      }
      worker.current.postMessage({ id, slug, scenario } satisfies RobustnessRequest);
    });
    return () => cancelAnimationFrame(frame);
  }, [scenario, shown.key, shown.view, slug, t]);

  useEffect(() => {
    notifyChaptersUpdated();
  }, [shown.view]);

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: MOTION.result_lock.ms / 1000, ease: ease(MOTION.result_lock.css) }}>
      <p className="sr-only" aria-live="polite" data-testid="result-announcement">
        {announce}
      </p>
      <LayoutGroup>
        <DecisionChapters view={shown.view} scenario={shown.scenario} pathname={pathname} kit={MOTION_KIT} robustnessPending={pending} />
      </LayoutGroup>
    </MotionConfig>
  );
}
