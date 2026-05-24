import type { FastifyInstance, FastifyRequest } from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";

const GLOBAL_MAX_PER_MINUTE = 300;

export const RATE_LIMITS = {
  registerPlayer: { max: 10, timeWindow: "1 minute" },
  slotSpin: { max: 60, timeWindow: "1 minute" },
  rouletteSpin: { max: 60, timeWindow: "1 minute" },
  meReset: { max: 5, timeWindow: "5 minutes" },
} as const;

export async function registerSecurityPlugins(app: FastifyInstance): Promise<void> {
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

  await app.register(rateLimit, {
    max: GLOBAL_MAX_PER_MINUTE,
    timeWindow: "1 minute",
    keyGenerator: (request: FastifyRequest) => request.session?.playerName ?? request.ip,
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: "RATE_LIMITED",
      retryAfter: Math.ceil(context.ttl / 1000),
    }),
  });
}
