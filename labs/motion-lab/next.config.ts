import type { NextConfig } from 'next';

/** Lab aislado: los paquetes del monorepo se publican como TypeScript fuente (imports con `.ts`). */
const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@vscar/decision-engine',
    '@vscar/comparison-engine',
    '@vscar/economics-engine',
    '@vscar/market-context',
    '@vscar/methodology',
    '@vscar/quality',
    '@vscar/vehicle-schema',
  ],
  poweredByHeader: false,
  // No generar AGENTS.md/CLAUDE.md en el lab (next dev los crea por defecto).
  agentRules: false,
};
export default config;
