import tseslint from 'typescript-eslint';

// Paquetes que NUNCA pueden hablar con la base de datos (plan §33, ADR-002):
// el dominio, los engines y los adapters reciben/devuelven objetos; solo @vscar/db persiste.
const DB_FREE_PACKAGES = [
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

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.turbo/**', 'packages/db/drizzle/**'] },
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
);
