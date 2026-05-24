import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";
import { db, queryClient } from "./client.js";

function resolveMigrationsFolder(): string {
  if (process.env.DRIZZLE_MIGRATIONS_DIR) {
    return path.resolve(process.env.DRIZZLE_MIGRATIONS_DIR);
  }
  const cwdCandidate = path.resolve(process.cwd(), "drizzle");
  if (existsSync(cwdCandidate)) return cwdCandidate;
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../drizzle");
}

const migrationsFolder = resolveMigrationsFolder();

export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder });
}

export async function runMigrationsStandalone(): Promise<void> {
  await runMigrations();
  await queryClient.end();
}
