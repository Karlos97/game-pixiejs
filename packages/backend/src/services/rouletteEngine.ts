import { randomInt } from "node:crypto";
import {
  ROULETTE_PAYOUTS,
  rouletteColorForNumber,
  type RouletteBet,
  type RouletteBetResult,
} from "@experiments/shared";

export interface RouletteSpinResult {
  winningNumber: number;
  betResults: RouletteBetResult[];
  totalPayout: number;
}

export function spinWheel(): number {
  return randomInt(0, 37);
}

export function evaluateBet(bet: RouletteBet, winningNumber: number): RouletteBetResult {
  let won = false;

  switch (bet.kind) {
    case "red":
    case "black": {
      const color = rouletteColorForNumber(winningNumber);
      won = color === bet.kind;
      break;
    }
    case "even":
      won = winningNumber !== 0 && winningNumber % 2 === 0;
      break;
    case "odd":
      won = winningNumber !== 0 && winningNumber % 2 === 1;
      break;
    case "low":
      won = winningNumber >= 1 && winningNumber <= 18;
      break;
    case "high":
      won = winningNumber >= 19 && winningNumber <= 36;
      break;
    case "dozen-1":
      won = winningNumber >= 1 && winningNumber <= 12;
      break;
    case "dozen-2":
      won = winningNumber >= 13 && winningNumber <= 24;
      break;
    case "dozen-3":
      won = winningNumber >= 25 && winningNumber <= 36;
      break;
    case "column-1":
      won = winningNumber !== 0 && winningNumber % 3 === 1;
      break;
    case "column-2":
      won = winningNumber !== 0 && winningNumber % 3 === 2;
      break;
    case "column-3":
      won = winningNumber !== 0 && winningNumber % 3 === 0;
      break;
    case "straight": {
      if (bet.number === undefined) {
        throw new Error("INVALID_STRAIGHT_BET");
      }
      won = bet.number === winningNumber;
      break;
    }
  }

  const payout = won ? bet.amount * ROULETTE_PAYOUTS[bet.kind] : 0;
  return { bet, won, payout };
}

export function runSpin(bets: RouletteBet[]): RouletteSpinResult {
  const winningNumber = spinWheel();
  const betResults = bets.map((bet) => evaluateBet(bet, winningNumber));
  const totalPayout = betResults.reduce((sum, result) => sum + result.payout, 0);
  return { winningNumber, betResults, totalPayout };
}
