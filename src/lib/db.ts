import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { Database } from "@/lib/db/types";

const globalForDb = globalThis as unknown as { dbPool?: Pool; db?: Kysely<Database> };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export function getPool(): Pool {
  if (!globalForDb.dbPool) {
    globalForDb.dbPool = createPool();
  }
  return globalForDb.dbPool;
}

export function getDb(): Kysely<Database> {
  if (!globalForDb.db) {
    globalForDb.db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool: getPool() }),
    });
  }
  return globalForDb.db;
}
