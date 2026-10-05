import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Mirror Next.js's own env-file precedence (.env.local overrides .env) so
// `drizzle-kit` sees the same DATABASE_URL the app does.
config({ path: ".env" });
config({ path: ".env.local", override: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
