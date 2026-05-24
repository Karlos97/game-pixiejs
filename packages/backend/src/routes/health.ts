import type { FastifyPluginAsync } from "fastify";
import type { HealthResponse } from "@experiments/shared";

export const healthRoute: FastifyPluginAsync = async (app) => {
  app.get(
    "/health",
    {
      config: { rateLimit: false },
    },
    async (): Promise<HealthResponse> => {
      return { status: "ok", timestamp: Date.now() };
    },
  );
};
