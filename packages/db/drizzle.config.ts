import { defineConfig } from 'drizzle-kit';

// Solo generación de migraciones (no necesita conexión). Aplicación: migrator de drizzle-orm.
export default defineConfig({
  dialect: 'mysql',
  schema: './src/schema.ts',
  out: './drizzle',
});
