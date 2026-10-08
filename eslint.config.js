import tseslint from 'typescript-eslint';

// Paquetes que NUNCA pueden hablar con la base de datos (plan §33, ADR-002):
// el dominio, los engines y los adapters reciben/devuelven objetos; solo @vscar/db persiste.
const DB_FREE_PACKAGES = [
  'apps/web/**',
  'packages/ui/**',
  'packages/vehicle-schema/**',
  'packages/quality/**',
  'packages/*-engine/**',
  'packages/used-adjustment/**',
  'packages/methodology/**',
  'packages/data-connectors/**',
  'packages/market-context/**',
];

// Consumidores de datos normalizados: tampoco conocen las fuentes (Step 4g). Reciben datos por puerto/entrada.
const SOURCE_AGNOSTIC_PACKAGES = ['packages/market-context/src/**', 'packages/*-engine/src/**'];

// Frontend (labs de Step 6e, apps/web de Step 7a, @vscar/ui): solo engines puros + snapshots;
// nunca DB, conectores, worker, fixtures (node:crypto) ni módulos de Node.
const BROWSER_LABS = ['labs/*/src/**', 'apps/web/src/**', 'packages/ui/src/**'];

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
    files: BROWSER_LABS,
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
);
