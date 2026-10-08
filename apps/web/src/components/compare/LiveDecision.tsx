'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { pushHref } from '@/client/scenario-nav';
import { parseScenarioFromSearchParams, scenarioKey, type Scenario } from '@/domain/scenario';
import type { DecisionView } from '@/domain/view-model';
import type { LanguageCode } from '@/i18n/locales';
import type { ClientDecisionProps } from './ClientDecision';

/**
 * Frontera de recálculo. Mientras el escenario de la URL sea el inicial, muestra el HTML del servidor
 * (`children`) y no carga nada. Al primer cambio de escenario carga el chunk diferido (pipeline real,
 * Motion, mensajes) y le pasa la vista inicial para animar desde ella. Sin JS, los enlaces navegan al servidor.
 */
export function LiveDecision({ children, initialView, initialScenario, pathname, slug, locale, language, labels }: { children: ReactNode } & Omit<ClientDecisionProps, 'scenario' | 'messages'> & { language: LanguageCode }) {
  const params = useSearchParams();
  const scenario: Scenario = parseScenarioFromSearchParams(new URLSearchParams(params.toString())).scenario;
  const changed = scenarioKey(scenario) !== scenarioKey(initialScenario);
  const [Client, setClient] = useState<{ C: ComponentType<ClientDecisionProps>; messages: Record<string, unknown> }>();
  const [loading, setLoading] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Enlaces de escenario (`data-scenario-link`): mejora progresiva sobre navegación normal.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-scenario-link]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      pushHref(a.href);
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    if (!changed || Client) return;
    let alive = true;
    setLoading(true);
    Promise.all([import('./ClientDecision'), import('@/client/messages').then((m) => m.loadMessages(language))]).then(([mod, messages]) => {
      if (alive) setClient({ C: mod.ClientDecision, messages });
    });
    return () => {
      alive = false;
    };
  }, [changed, Client, language]);

  return (
    <div ref={root} className="live-decision" data-live={Client ? 'client' : 'server'} aria-busy={loading && !Client ? 'true' : undefined}>
      {Client ? (
        <Client.C initialView={initialView} initialScenario={initialScenario} scenario={scenario} pathname={pathname} slug={slug} locale={locale} labels={labels} messages={Client.messages} />
      ) : (
        <>
          {loading ? (
            <p className="live-decision__status" role="status">
              {labels.recalculating}
            </p>
          ) : null}
          {children}
        </>
      )}
    </div>
  );
}

export type LiveDecisionView = DecisionView;
