import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** VScar Web. Los paquetes del monorepo se consumen como TypeScript fuente (imports con `.ts`). */
const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // No generar AGENTS.md/CLAUDE.md (next dev los crea por defecto).
  agentRules: false,
  transpilePackages: [
    '@vscar/comparison-engine',
    '@vscar/decision-engine',
    '@vscar/economics-engine',
    '@vscar/market-context',
    '@vscar/methodology',
    '@vscar/quality',
    '@vscar/ui',
    '@vscar/vehicle-schema',
  ],
  async redirects() {
    return [
      // Desarrollo local: la raíz va al mercado/idioma por defecto. Sin geolocalización por IP (Plan §29).
      { source: '/', destination: '/es-es', permanent: false },
      // Ruta canónica única `compare` (ADR-012): el alias en español redirige.
      { source: '/:locale/comparar/:slug', destination: '/:locale/compare/:slug', permanent: true },
    ];
  },
};

export default withNextIntl(config);
