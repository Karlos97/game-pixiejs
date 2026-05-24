import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyCookie from "@fastify/cookie";
import { healthRoute } from "./routes/health.js";
import { worldRoute } from "./routes/world.js";
import { slotRoute } from "./routes/slot.js";
import { rouletteRoute } from "./routes/roulette.js";
import { playerRoute } from "./routes/player.js";
import { runMigrations } from "./db/migrate.js";
import { assertSessionSecretAvailable, sessionPlugin } from "./auth/session.js";
import { registerSecurityPlugins } from "./plugins/security.js";

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
  },
});

assertSessionSecretAvailable();

await runMigrations();
app.log.info("database migrations applied");

const corsOrigins = process.env.CORS_ORIGIN?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const isProduction = process.env.NODE_ENV === "production";
if (isProduction && (!corsOrigins || corsOrigins.length === 0)) {
  throw new Error("CORS_ORIGIN must be set in production");
}
await app.register(cors, {
  origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : true,
  credentials: true,
});

await app.register(fastifyCookie);
await app.register(sessionPlugin);

await registerSecurityPlugins(app);

await app.register(healthRoute);
await app.register(worldRoute, { prefix: "/world" });
await app.register(slotRoute, { prefix: "/slot" });
await app.register(rouletteRoute, { prefix: "/roulette" });
await app.register(playerRoute);

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
  app.log.info(`Backend ready on http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
