import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var __hourglassPgClient: postgres.Sql | undefined;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Reuse the connection across Next.js dev-server hot reloads so we don't
// leak a new connection pool into Postgres on every file save.
const client =
  globalThis.__hourglassPgClient ?? postgres(connectionString, { max: 10 });
if (process.env.NODE_ENV !== "production") {
  globalThis.__hourglassPgClient = client;
}

export const db = drizzle(client, { schema });
