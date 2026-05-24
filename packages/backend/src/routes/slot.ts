import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { SlotSpinResponse } from "@experiments/shared";
import { db } from "../db/client.js";
import { spins } from "../db/schema.js";
import { spinReels } from "../services/slotEngine.js";
import { credit, deduct, getPlayer } from "../services/balanceStore.js";
import { requireSession } from "../auth/session.js";
import { RATE_LIMITS } from "../plugins/security.js";

const spinSchema = z.object({
  bet: z.number().int().positive(),
});

export const slotRoute: FastifyPluginAsync = async (app) => {
  app.post(
    "/spin",
    {
      preHandler: requireSession,
      config: { rateLimit: RATE_LIMITS.slotSpin },
    },
    async (request, reply) => {
      const parsed = spinSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }

      const playerName = request.session!.playerName;
      const { bet } = parsed.data;

      const deductResult = await deduct(playerName, bet);
      if (!deductResult.ok) {
        if (deductResult.reason === "not_found") {
          return reply.code(404).send({ error: "PLAYER_NOT_FOUND" });
        }
        return reply.code(400).send({
          error: "INSUFFICIENT_FUNDS",
          balance: deductResult.balance,
        });
      }

      const player = await getPlayer(playerName);
      if (!player) {
        app.log.error({ playerName }, "deduct succeeded but player vanished");
        return reply.code(500).send({ error: "INTERNAL" });
      }

      const spinResult = spinReels(bet);
      const { symbols, paylines, payout } = spinResult;

      let newCoinBalance = deductResult.newBalance;
      if (payout > 0) {
        const creditResult = await credit(playerName, payout);
        if (!creditResult.ok) {
          app.log.error(
            { playerName, payout },
            "credit not_found after successful deduct",
          );
          return reply.code(500).send({ error: "INTERNAL" });
        }
        newCoinBalance = creditResult.newBalance;
      }

      await db.insert(spins).values({
        playerId: player.id,
        bet,
        payout,
        symbols,
        paylines,
      });

      const response: SlotSpinResponse = {
        symbols,
        paylines,
        payout,
        newCoinBalance,
      };
      return response;
    },
  );
};
