import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  ROULETTE_BET_KINDS,
  rouletteColorForNumber,
  type RouletteSpinResponse,
} from "@experiments/shared";
import { db } from "../db/client.js";
import { rouletteSpins } from "../db/schema.js";
import { runSpin } from "../services/rouletteEngine.js";
import { credit, deduct, getBalance, getPlayer } from "../services/balanceStore.js";
import { requireSession } from "../auth/session.js";
import { RATE_LIMITS } from "../plugins/security.js";

const betSchema = z.object({
  kind: z.enum([...ROULETTE_BET_KINDS]),
  number: z.number().int().min(0).max(36).optional(),
  amount: z.number().int().positive(),
});

const spinSchema = z.object({
  bets: z.array(betSchema).min(1).max(50),
});

export const rouletteRoute: FastifyPluginAsync = async (app) => {
  app.post(
    "/spin",
    {
      preHandler: requireSession,
      config: { rateLimit: RATE_LIMITS.rouletteSpin },
    },
    async (request, reply) => {
      const parsed = spinSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }

      const playerName = request.session!.playerName;
      const { bets } = parsed.data;

      const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0);
      if (totalBet <= 0) {
        return reply.code(400).send({ error: "INVALID_TOTAL_BET" });
      }

      const deductResult = await deduct(playerName, totalBet);
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

      let winningNumber: number;
      let betResults;
      let totalPayout: number;
      try {
        ({ winningNumber, betResults, totalPayout } = runSpin(bets));
      } catch (err) {
        if (err instanceof Error && err.message === "INVALID_STRAIGHT_BET") {
          const refund = await credit(playerName, totalBet);
          if (!refund.ok) {
            app.log.error({ playerName }, "refund credit not_found after deduct");
            return reply.code(500).send({ error: "INTERNAL" });
          }
          return reply.code(400).send({ error: "INVALID_STRAIGHT_BET" });
        }
        throw err;
      }

      if (totalPayout > 0) {
        const creditResult = await credit(playerName, totalPayout);
        if (!creditResult.ok) {
          app.log.error(
            { playerName, totalPayout },
            "credit not_found after successful deduct",
          );
          return reply.code(500).send({ error: "INTERNAL" });
        }
      }

      const newCoinBalance = await getBalance(playerName);
      if (newCoinBalance === null) {
        app.log.error({ playerName }, "getBalance not_found after successful deduct");
        return reply.code(500).send({ error: "INTERNAL" });
      }

      await db.insert(rouletteSpins).values({
        playerId: player.id,
        bets,
        winningNumber,
        totalBet,
        totalPayout,
      });

      const response: RouletteSpinResponse = {
        winningNumber,
        winningColor: rouletteColorForNumber(winningNumber),
        totalBet,
        totalPayout,
        newCoinBalance,
        betResults,
      };
      return response;
    },
  );
};
