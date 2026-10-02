'use client';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLab } from '@/lab/lab-context';
import { COMMUTER, runLab, runRobustness, SCENARIO_SELECTED, SCENARIO_TIE } from '@/lab/pipeline';
import { rangeLayers, resultView } from '@/lab/view-model';
import { DevPanel } from './DevPanel';
import { MetricScrub } from './MetricScrub';
import { ResultReveal } from './ResultReveal';
import { SplitHeading } from './SplitHeading';
import { ThreeAtmosphere } from './ThreeAtmosphere';
import { VehicleStage } from './VehicleStage';
import { VsScene } from './VsScene';

/**
 * Única ruta del lab. Narrativa: BYD → VS → Model 3 → PRACTICAL TIE → cambio de escenario → BYD seleccionado.
 * Todo resultado sale de `runLab` (pipeline real). La UI solo presenta.
 */
export function LabPage() {
  const lab = useLab();
  const run = useMemo(() => runLab(lab.longTrips), [lab.longTrips]);
  const [robust, setRobust] = useState<{ trips: number; ms: number; result: ReturnType<typeof runRobustness>['result'] }>();
  const result = robust?.trips === lab.longTrips ? robust.result : run.result;
  const view = resultView(result);
  const layers = rangeLayers(run.range);
  const resultHeading = useRef<HTMLHeadingElement>(null);

  // Lectura para el navegador automatizado (solo lab).
  useEffect(() => {
    (window as unknown as { __lab: unknown }).__lab = { pipelineMs: run.ms, status: view.status, selected: view.selectedLabel ?? null, tier: lab.decision.tier, renderer: lab.renderer, trips: lab.longTrips, scrollTriggers: () => ScrollTrigger.getAll().length };
  }, [run.ms, view.status, view.selectedLabel, lab.decision.tier, lab.renderer, lab.longTrips]);

  const skip = () => {
    document.getElementById('result')?.scrollIntoView({ behavior: 'auto', block: 'start' });
    resultHeading.current?.focus({ preventScroll: true });
  };
  const tripsChanged = lab.longTrips !== SCENARIO_TIE;

  return (
    <>
      <a
        href="#result"
        className="skip"
        onClick={(e) => {
          e.preventDefault();
          skip();
        }}
      >
        Skip motion — go to result
      </a>
      <main>
        <section className="scene scene--hero" aria-labelledby="hero-title">
          <ThreeAtmosphere tone="a" />
          <div className="scene__content">
            <p className="eyebrow">VScar Motion Lab · Step 6e · real engines, real fixtures</p>
            <h1 id="hero-title" className="hero__title">
              BYD SEAL <span className="hero__vs">vs</span> Tesla Model 3
            </h1>
            <p className="hero__sub mono">
              Commuter · {COMMUTER.dailyDistanceKm} km/day · home charging · {COMMUTER.annualKm.toLocaleString('en')} km/year
            </p>
            <button type="button" className="button button--ghost" onClick={skip}>
              Skip to the result
            </button>
          </div>
        </section>

        <section className="scene scene--vehicle" aria-label="Candidate A: BYD SEAL">
          <div className="scene__content scene__content--split">
            <div>
              <p className="eyebrow eyebrow--a">Candidate A</p>
              <SplitHeading text="BYD SEAL" className="vehicle__name" />
              <p className="mono vehicle__meta">2026 · BEV · sedan</p>
            </div>
            <VehicleStage side="a" label="BYD SEAL 2026" lit={0.6} />
          </div>
        </section>

        <VsScene />

        <section className="scene scene--vehicle" aria-label="Candidate B: Tesla Model 3">
          <div className="scene__content scene__content--split scene__content--reverse">
            <div>
              <p className="eyebrow eyebrow--b">Candidate B</p>
              <SplitHeading text="Tesla Model 3" className="vehicle__name" />
              <p className="mono vehicle__meta">2021 · BEV · sedan</p>
            </div>
            <VehicleStage side="b" label="Tesla Model 3 2021" lit={0.6} />
          </div>
        </section>

        <section id="result" className="scene scene--result" aria-label="Result">
          <div className="scene__content">
            <p className="eyebrow">For your needs</p>
            <ResultReveal ref={resultHeading} view={view} />
          </div>
        </section>

        <section className="scene scene--scenario" aria-labelledby="scenario-title">
          <div className="scene__content">
            <SplitHeading text="What if you drive far a few times a year?" className="section__title" />
            <p id="scenario-title" className="muted">
              Only one input changes: long trips per year. The engines recompute; nothing is scripted.
            </p>
            <div className="scenario" role="group" aria-label="Long trips per year">
              <button type="button" className="button" aria-pressed={!tripsChanged} onClick={() => lab.set({ longTrips: SCENARIO_TIE })}>
                {SCENARIO_TIE} long trip / year
              </button>
              <button type="button" className="button" aria-pressed={lab.longTrips === SCENARIO_SELECTED} onClick={() => lab.set({ longTrips: SCENARIO_SELECTED })}>
                {SCENARIO_SELECTED} long trips / year
              </button>
            </div>
            <p className="muted mono" aria-live="polite">
              Now: {lab.longTrips} long trips / year → {view.status === 'SELECTED' ? `${view.selectedLabel} selected` : 'practical tie'}
            </p>
            {view.status === 'SELECTED' && (
              <button type="button" className="button button--ghost" onClick={skip}>
                See how the decision changed
              </button>
            )}
          </div>
        </section>

        {layers && (
          <section className="scene scene--metric" aria-labelledby="metric-title">
            <div className="scene__content">
              <SplitHeading text="Electric range, three readings" className="section__title" scrub />
              <p id="metric-title" className="muted">
                Same numbers, read three ways: raw, meaningful in general, meaningful for you.
              </p>
              <MetricScrub layers={layers} scenarioKey={String(lab.longTrips)} />
            </div>
          </section>
        )}

        <footer className="lab-footer mono">
          Generic silhouettes — no manufacturer imagery or logos · Dataset Core fixtures · energy snapshot ESIOS 2026-09-24 / MITECO 2026-09-20 · pipeline{' '}
          {run.ms.toFixed(1)} ms
        </footer>
      </main>
      <DevPanel
        pipelineMs={run.ms}
        {...(robust?.trips === lab.longTrips ? { robustness: { ms: robust.ms, level: `${robust.result.resultRobustness.status} / ${robust.result.resultRobustness.level}` } } : {})}
        onRobustness={() => {
          const r = runRobustness(lab.longTrips);
          setRobust({ trips: lab.longTrips, ms: r.ms, result: r.result });
        }}
      />
    </>
  );
}
