import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_URL_TESIS!,
    authToken: process.env.TURSO_TOKEN_TESIS!,
  },
});
