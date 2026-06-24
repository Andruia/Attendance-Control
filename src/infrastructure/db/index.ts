import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DatabaseClient = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  conn: DatabaseClient | undefined;
};

function createDb(): DatabaseClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // During build time or when no DB is configured, return a placeholder
    // that will be replaced at runtime
    return null as unknown as DatabaseClient;
  }

  const client = postgres(connectionString, {
    prepare: false,
    max: 1,
  });

  return drizzle(client, { schema });
}

export const db: DatabaseClient = globalForDb.conn ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = db;
}

export type DbClient = typeof db;
export { schema };
