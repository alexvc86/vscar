import tseslint from 'typescript-eslint';

// Paquetes que NUNCA pueden hablar con la base de datos (plan §33, ADR-002):
// el dominio, los engines y los adapters reciben/devuelven objetos; solo @vscar/db persiste.
const DB_FREE_PACKAGES = [
  // apps/web: todo salvo la capa de servidor (`src/server/**`, `server-only`) y la config de Next (Step 7b).
  'apps/web/src/app/**',
  'apps/web/src/components/**',
  'apps/web/src/domain/**',
  'apps/web/src/i18n/**',
  'apps/web/src/client/**',
  'apps/web/src/workers/**',
  'packages/ui/**',
  'packages/vehicle-schema/**',
  'packages/quality/**',
  'packages/*-engine/**',
  'packages/used-adjustment/**',
  'packages/methodology/**',
  'packages/data-connectors/**',
  'packages/market-context/**',
  // Step D1: la curación produce candidatos; nunca carga datos en MySQL.
  'packages/curation/**',
];

// Consumidores de datos normalizados: tampoco conocen las fuentes (Step 4g). Reciben datos por puerto/entrada.
const SOURCE_AGNOSTIC_PACKAGES = ['packages/market-context/src/**', 'packages/*-engine/src/**'];

// Frontend (labs de Step 6e, apps/web, @vscar/ui): solo engines puros + datos recibidos del servidor;
// nunca DB, conectores, worker, fixtures (node:crypto) ni módulos de Node.
// Excepción única (Step 7b): `apps/web/src/server/**` es la frontera server-only que lee el catálogo de MySQL.
const BROWSER_LABS = ['labs/*/src/**', 'apps/web/src/**', 'packages/ui/src/**'];
const WEB_SERVER_LAYER = ['apps/web/src/server/**'];

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.turbo/**', 'packages/db/drizzle/**', '**/.next/**', '**/next-env.d.ts'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }],
    },
  },
  {
    files: DB_FREE_PACKAGES,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['@vscar/db', 'mysql2', 'mysql2/promise'],
          patterns: ['drizzle-orm', 'drizzle-orm/*', '@vscar/db/*'],
        },
      ],
    },
  },
  {
    files: SOURCE_AGNOSTIC_PACKAGES,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['@vscar/db', 'mysql2', 'mysql2/promise', '@vscar/data-connectors', '@vscar/worker'],
          patterns: ['drizzle-orm', 'drizzle-orm/*', '@vscar/db/*', '@vscar/data-connectors/*', '@vscar/worker/*', 'node:*'],
        },
      ],
    },
  },
  {
    // Step 8a: la capa de usados es pura y browser-safe (ADR-016): sin DB, sin fuentes, sin Node, sin UI ni i18n, sin apps.
    files: ['packages/used-adjustment/src/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['@vscar/db', 'mysql2', 'mysql2/promise', '@vscar/data-connectors', '@vscar/worker', '@vscar/fixtures', 'react', 'react-dom', 'next', 'next-intl'],
          patterns: ['drizzle-orm', 'drizzle-orm/*', '@vscar/db/*', '@vscar/data-connectors/*', '@vscar/worker/*', '@vscar/fixtures/*', 'node:*', 'react/*', 'react-dom/*', 'next/*', 'next-intl/*', '**/apps/**'],
        },
      ],
    },
  },
  {
    files: BROWSER_LABS,
    ignores: WEB_SERVER_LAYER,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['@vscar/db', 'mysql2', 'mysql2/promise', '@vscar/data-connectors', '@vscar/worker', '@vscar/fixtures'],
          patterns: ['drizzle-orm', 'drizzle-orm/*', '@vscar/db/*', '@vscar/data-connectors/*', '@vscar/worker/*', '@vscar/fixtures/*', 'node:*'],
        },
      ],
    },
  },
  {
    // Capa de servidor de la web: puede leer el catálogo (@vscar/db), nunca conectores, worker ni fixtures.
    files: WEB_SERVER_LAYER,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['mysql2', 'mysql2/promise', '@vscar/data-connectors', '@vscar/worker', '@vscar/fixtures'],
          patterns: ['drizzle-orm', 'drizzle-orm/*', '@vscar/data-connectors/*', '@vscar/worker/*', '@vscar/fixtures/*'],
        },
      ],
    },
  },
);
