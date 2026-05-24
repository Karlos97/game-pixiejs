import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";
import { readSecret } from "../config/env.js";

function resolveConnectionString(): string {
  const fromEnv = process.env.DATABASE_URL;
  if (fromEnv) return fromEnv;

  const host = process.env.POSTGRES_HOST ?? "localhost";
  const port = process.env.POSTGRES_PORT ?? "5432";
  const user = process.env.POSTGRES_USER ?? "game";
  const dbName = process.env.POSTGRES_DB ?? "game";
  const password = readSecret("POSTGRES_PASSWORD");

  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && !password) {
    throw new Error(
      "POSTGRES_PASSWORD (or POSTGRES_PASSWORD_FILE) is required in production",
    );
  }

  return `postgres://${user}:${encodeURIComponent(password ?? "")}@${host}:${port}/${dbName}`;
}

const connectionString = resolveConnectionString();
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

export const queryClient = postgres(connectionString, { max: 10 });
export const db = drizzle(queryClient, { schema });
export { schema };
