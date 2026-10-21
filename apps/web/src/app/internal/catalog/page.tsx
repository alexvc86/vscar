import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { pairSlug } from '@/domain/catalog';
import { checkInternalAuth, internalAuthEnv } from '@/server/internal-auth';
import { vehicleCatalog } from '@/server/catalog';
import { technicalCatalogDiagnostics } from '@/server/technical-catalog';

/**
 * Step D1.6 — diagnóstico PRIVADO de la capa de curación técnica (ADR-019 B). Protegido por `proxy.ts` y, otra vez,
 * aquí (defensa en profundidad: sin autorización válida la ruta no existe). Los vehículos curados NO están en el
 * selector ni se comparan: la demo de comparación usa solo variantes ya elegibles del catálogo seleccionable.
 */
export const dynamic = 'force-dynamic';

const RIGHTS: Record<string, string> = { APPROVED: 'aprobado', CONDITIONAL: 'condicional (CC BY)', PENDING: 'pendiente', DENIED: 'denegado' };

export default async function InternalCatalogPage() {
  const h = await headers();
  if (checkInternalAuth(h.get('authorization'), internalAuthEnv()) !== 'ok') notFound();

  const { vehicles } = await technicalCatalogDiagnostics('ES');
  let demoPairs: { href: string; label: string }[] = [];
  try {
    const examples = await vehicleCatalog().examples('ES');
    demoPairs = examples.slice(0, 3).map(({ a, b }) => ({ href: `/es-es/compare/${pairSlug(a.slug, b.slug)}`, label: `${a.brand} ${a.model} ${a.variant} vs ${b.brand} ${b.model} ${b.variant}` }));
  } catch {
    demoPairs = [];
  }

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 16px', fontSize: 14, lineHeight: 1.45 }} data-testid="internal-catalog">
      <h1 style={{ fontSize: 22 }}>Curación técnica — diagnóstico interno</h1>
      <p className="muted">
        {vehicles.length} vehículos reales identificados por homologación exacta (TAN + variante + versión). <strong>No están en el selector ni alimentan los motores</strong>: su generación, año-modelo y acabado no se inventan, y solo se mostrarán para comparar tras una promoción explícita al catálogo seleccionable.
      </p>

      <section aria-labelledby="demo" style={{ margin: '16px 0' }}>
        <h2 id="demo" style={{ fontSize: 17 }}>Demostración de comparación (catálogo seleccionable existente)</h2>
        {demoPairs.length ? (
          <ul>
            {demoPairs.map((p) => (
              <li key={p.href}>
                <a href={p.href}>{p.label}</a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">El catálogo seleccionable no está disponible en este entorno.</p>
        )}
        <p className="muted small">Ninguna variante técnica nueva supera hoy los requisitos para comparar (generación, año-modelo, acabado, claves críticas y derechos): no se fuerza su entrada ni se muestra un ganador.</p>
      </section>

      {vehicles.map((v) => (
        <details key={v.id} style={{ borderTop: '1px solid #333', padding: '10px 0' }} data-testid="technical-vehicle">
          <summary style={{ cursor: 'pointer' }}>
            <strong>{v.name}</strong> · matriculado {v.registration} · {v.productClass} · identidad comercial {v.commercialStatus} · {v.quality.usable}/{v.quality.usable + v.quality.notUsable} observaciones utilizables
            {v.quality.inConflict ? ` · ${v.quality.inConflict} en conflicto` : ''}
          </summary>
          <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '4px 12px', margin: '8px 0' }}>
            <dt>Identidad técnica</dt>
            <dd className="mono">
              {v.technicalIdentity.tan} · {v.technicalIdentity.variant} · {v.technicalIdentity.version} ({v.technicalIdentity.confidence})
            </dd>
            <dt>Generación · año-modelo</dt>
            <dd>{v.commercial.generation ?? 'sin verificar'} · {v.commercial.modelYear ?? 'sin verificar (el año de matriculación no es año-modelo)'}</dd>
            <dt>Acabado</dt>
            <dd>{v.commercial.trim ?? 'no confirmado'}{v.commercial.designation ? ` · designación oficial: «${v.commercial.designation}»` : ''}</dd>
            <dt>Atributos técnicos</dt>
            <dd>{v.technicalAttributes.length ? v.technicalAttributes.map((a) => `${a.attribute}: ${a.value} (${a.source}, ${RIGHTS[a.rights]})`).join(' · ') : '—'}</dd>
            <dt>Fuentes</dt>
            <dd>{v.sources.map((s) => `${s.code}: ${s.rights.map((r) => RIGHTS[r]).join('/')}`).join(' · ')}</dd>
            <dt>Faltan (claves críticas)</dt>
            <dd>{v.missing.length ? v.missing.join(', ') : '—'}</dd>
            <dt>Comparación</dt>
            <dd>No disponible: no está en el catálogo seleccionable (capa de curación técnica).</dd>
          </dl>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th align="left">SpecKey</th>
                <th align="left">Valor</th>
                <th align="left">Fuente</th>
                <th align="left">Derechos</th>
                <th align="left">Calidad</th>
                <th align="left">Conflicto</th>
              </tr>
            </thead>
            <tbody>
              {v.observations.map((o, i) => (
                <tr key={`${o.specKey}-${o.source}-${i}`}>
                  <td className="mono">{o.specKey}</td>
                  <td className="mono">
                    {o.value} {o.unit ?? ''}
                    {o.cycle ? ` · ${o.cycle}` : ''}
                  </td>
                  <td title={o.record}>{o.source}</td>
                  <td>{RIGHTS[o.rights]}</td>
                  <td title={o.reasons.join('; ')}>{o.quality === 'USABLE' ? 'utilizable' : 'no utilizable'}</td>
                  <td>{o.conflict === 'IN_CONFLICT' ? 'sí (se conservan todos los valores)' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ))}
    </main>
  );
}
