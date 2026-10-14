import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Configuración única del monorepo (Step 7b): DATABASE_URL y VSCAR_PUBLICATION_CHANNEL viven en el `.env` raíz
// (nunca en Git). Las variables ya definidas en el entorno tienen prioridad.
const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** VScar Web. Los paquetes del monorepo se consumen como TypeScript fuente (imports con `.ts`). */
const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // No generar AGENTS.md/CLAUDE.md (next dev los crea por defecto).
  agentRules: false,
  // Media del selector (Step 7b.2): solo assets locales aprobados (`/public/media`), servidos en AVIF/WebP.
  // Sin `remotePatterns`: una URL externa no se optimiza ni se muestra hasta que exista una lista de dominios con licencia.
  images: { formats: ['image/avif', 'image/webp'], imageSizes: [160, 220, 320, 440], minimumCacheTTL: 2_678_400 },
  // Driver MySQL nativo de Node: fuera del bundle de servidor (solo lo usa `src/server/*`).
  serverExternalPackages: ['mysql2'],
  transpilePackages: [
    '@vscar/comparison-engine',
    '@vscar/db',
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
