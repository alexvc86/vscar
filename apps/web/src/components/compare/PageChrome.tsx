import type { CandidateView } from '@/domain/view-model';
import { localizedHref } from '@/i18n/routes';
import type { I18n } from '@/i18n/use-i18n';

/**
 * Piezas de página de la comparación (Step 7c), server-rendered y sin JS:
 * - `Breadcrumbs`: Inicio → Comparar → A vs B (discreto; el JSON-LD lleva la misma ruta).
 * - `VehicleRail`: barra compacta y fija al desplazarse (CSS `position: sticky`), con A/B en sus colores.
 */
export function Breadcrumbs({ i18n, names }: { i18n: I18n; names: [string, string] }) {
  const { t, locale } = i18n;
  const home = localizedHref(locale, { page: 'home' });
  return (
    <nav className="breadcrumbs" aria-label={t('breadcrumbs.label')}>
      <ol>
        <li>
          <a href={home}>{t('breadcrumbs.home')}</a>
        </li>
        <li>
          <a href={`${home}#compare`}>{t('breadcrumbs.compare')}</a>
        </li>
        <li aria-current="page">
          {names[0]} vs {names[1]}
        </li>
      </ol>
    </nav>
  );
}

export function VehicleRail({ i18n, candidates }: { i18n: I18n; candidates: [CandidateView, CandidateView] }) {
  const { t } = i18n;
  const [a, b] = candidates;
  return (
    <aside className="vehicle-rail" aria-label={t('rail.label')} data-testid="vehicle-rail">
      <span className="vehicle-rail__name tone-a">{a.name}</span>
      <span className="vehicle-rail__vs mono" aria-hidden="true">
        VS
      </span>
      <span className="vehicle-rail__name tone-b">{b.name}</span>
      <a className="vehicle-rail__jump small" href="#result">
        {t('skip.result')}
      </a>
    </aside>
  );
}
