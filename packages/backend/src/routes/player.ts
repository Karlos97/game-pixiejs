import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type {
  BalanceResponse,
  CreatePlayerResponse,
  PlayerStateResponse,
} from "@experiments/shared";
import { createPlayer, getPlayer, reset } from "../services/balanceStore.js";
import { getState, saveState } from "../services/playerStore.js";
import { requireSession, setSessionCookie } from "../auth/session.js";
import { RATE_LIMITS } from "../plugins/security.js";

const stateSchema = z.object({
  posX: z.number().finite(),
  posY: z.number().finite(),
});

const createPlayerSchema = z.object({
  name: z.string().min(1).max(64).optional(),
});

const AUTO_NAME_SUFFIX_CHARS = 4;
const AUTO_NAME_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_AUTO_NAME_ATTEMPTS = 8;

function randomSuffix(): string {
  let out = "";
  for (let i = 0; i < AUTO_NAME_SUFFIX_CHARS; i++) {
    out += AUTO_NAME_ALPHABET[Math.floor(Math.random() * AUTO_NAME_ALPHABET.length)];
  }
  return out;
}

export const playerRoute: FastifyPluginAsync = async (app) => {
  app.post(
    "/player",
    {
      config: { rateLimit: RATE_LIMITS.registerPlayer },
    },
    async (request, reply): Promise<CreatePlayerResponse | undefined> => {
      const parsed = createPlayerSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400).send({ error: parsed.error.flatten() });
        return;
      }

      if (request.session) {
        const existing = await getPlayer(request.session.playerName);
        if (existing) {
          setSessionCookie(reply, existing.name);
          return { playerId: existing.id, name: existing.name, coins: existing.coins };
        }
      }

      const requestedName = parsed.data.name;
      if (requestedName !== undefined) {
        const row = await createPlayer(requestedName);
        if (!row) {
          reply.code(409).send({ error: "NAME_TAKEN" });
          return;
        }
        setSessionCookie(reply, row.name);
        return { playerId: row.id, name: row.name, coins: row.coins };
      }

      for (let attempt = 0; attempt < MAX_AUTO_NAME_ATTEMPTS; attempt++) {
        const name = `Player-${randomSuffix()}`;
        const row = await createPlayer(name);
        if (row) {
          setSessionCookie(reply, row.name);
          return { playerId: row.id, name: row.name, coins: row.coins };
        }
      }
      reply.code(500).send({ error: "NAME_GEN_FAILED" });
      return;
    },
  );

  app.get(
    "/me/balance",
    { preHandler: requireSession },
    async (request, reply): Promise<BalanceResponse | undefined> => {
      const name = request.session!.playerName;
      const player = await getPlayer(name);
      if (!player) {
        reply.code(404).send({ error: "PLAYER_NOT_FOUND" });
        return;
      }
      return { playerId: player.id, coins: player.coins };
    },
  );

  app.post(
    "/me/reset",
    {
      preHandler: requireSession,
      config: { rateLimit: RATE_LIMITS.meReset },
    },
    async (request, reply): Promise<BalanceResponse | undefined> => {
      if (process.env.NODE_ENV === "production") {
        reply.code(403).send({ error: "FORBIDDEN" });
        return;
      }
      const name = request.session!.playerName;
      const coins = await reset(name);
      if (coins === null) {
        reply.code(404).send({ error: "PLAYER_NOT_FOUND" });
        return;
      }
      const player = await getPlayer(name);
      if (!player) {
        reply.code(500).send({ error: "INTERNAL" });
        return;
      }
      return { playerId: player.id, coins };
    },
  );

  app.get(
    "/me/state",
    { preHandler: requireSession },
    async (request, reply): Promise<PlayerStateResponse | undefined> => {
      const name = request.session!.playerName;
      const state = await getState(name);
      if (!state) {
        reply.code(404).send({ error: "PLAYER_NOT_FOUND" });
        return;
      }
      return state;
    },
  );

  app.post("/me/state", { preHandler: requireSession }, async (request, reply) => {
    const parsed = stateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const name = request.session!.playerName;
    const { posX, posY } = parsed.data;
    try {
      await saveState(name, posX, posY);
    } catch (err) {
      if (err instanceof Error && err.message === "PLAYER_NOT_FOUND") {
        return reply.code(404).send({ error: "PLAYER_NOT_FOUND" });
      }
      throw err;
    }
    return { ok: true };
  });
};
