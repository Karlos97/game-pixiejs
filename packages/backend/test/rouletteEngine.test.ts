import { describe, expect, it } from "vitest";
import {
  ROULETTE_PAYOUTS,
  ROULETTE_RED_NUMBERS,
  rouletteColorForNumber,
  type RouletteBet,
} from "@experiments/shared";
import { evaluateBet, runSpin, spinWheel } from "../src/services/rouletteEngine.js";

describe("spinWheel — output range", () => {
  it("returns an integer in [0, 36] inclusive across 1000 spins", () => {
    for (let i = 0; i < 1000; i++) {
      const n = spinWheel();
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(36);
    }
  });

  it("empirical mean of 5000 spins lands within ~5 of theoretical 18", () => {
    const samples = 5000;
    let sum = 0;
    for (let i = 0; i < samples; i++) sum += spinWheel();
    const mean = sum / samples;
    expect(Math.abs(mean - 18)).toBeLessThan(5);
  });

  it("covers both extremes (0 and 36) within 10k spins (RNG sanity)", () => {
    let sawZero = false;
    let sawMax = false;
    for (let i = 0; i < 10_000; i++) {
      const n = spinWheel();
      if (n === 0) sawZero = true;
      if (n === 36) sawMax = true;
      if (sawZero && sawMax) break;
    }
    expect(sawZero).toBe(true);
    expect(sawMax).toBe(true);
  });
});

describe("evaluateBet — straight (single number)", () => {
  it("wins when the winning number matches and pays out at the straight multiplier", () => {
    const bet: RouletteBet = { kind: "straight", number: 17, amount: 10 };
    const result = evaluateBet(bet, 17);
    expect(result.won).toBe(true);
    expect(result.payout).toBe(10 * ROULETTE_PAYOUTS.straight);
  });

  it("loses when the winning number does not match", () => {
    const bet: RouletteBet = { kind: "straight", number: 17, amount: 10 };
    const result = evaluateBet(bet, 18);
    expect(result.won).toBe(false);
    expect(result.payout).toBe(0);
  });

  it("throws on a malformed straight bet missing `number`", () => {
    const bad = { kind: "straight", amount: 10 } as RouletteBet;
    expect(() => evaluateBet(bad, 5)).toThrow("INVALID_STRAIGHT_BET");
  });
});

describe("evaluateBet — outside bets", () => {
  it("red bet wins on red, loses on black and on zero", () => {
    const red: RouletteBet = { kind: "red", amount: 5 };
    const aRed = [...ROULETTE_RED_NUMBERS][0]!;
    expect(evaluateBet(red, aRed).won).toBe(true);
    expect(evaluateBet(red, aRed).payout).toBe(5 * ROULETTE_PAYOUTS.red);
    expect(rouletteColorForNumber(2)).toBe("black");
    expect(evaluateBet(red, 2).won).toBe(false);
    expect(evaluateBet(red, 2).payout).toBe(0);
    expect(evaluateBet(red, 0).won).toBe(false);
  });

  it("black bet mirrors red", () => {
    const black: RouletteBet = { kind: "black", amount: 5 };
    expect(evaluateBet(black, 2).won).toBe(true);
    expect(evaluateBet(black, 1).won).toBe(false);
    expect(evaluateBet(black, 0).won).toBe(false);
  });

  it("even bet treats 0 as a loss (zero is neutral, not even)", () => {
    const even: RouletteBet = { kind: "even", amount: 5 };
    expect(evaluateBet(even, 0).won).toBe(false);
    expect(evaluateBet(even, 0).payout).toBe(0);
    expect(evaluateBet(even, 2).won).toBe(true);
    expect(evaluateBet(even, 3).won).toBe(false);
  });

  it("odd bet treats 0 as a loss", () => {
    const odd: RouletteBet = { kind: "odd", amount: 5 };
    expect(evaluateBet(odd, 0).won).toBe(false);
    expect(evaluateBet(odd, 1).won).toBe(true);
    expect(evaluateBet(odd, 2).won).toBe(false);
  });

  it("low/high partition 1..18 vs 19..36 and both reject 0", () => {
    const low: RouletteBet = { kind: "low", amount: 5 };
    const high: RouletteBet = { kind: "high", amount: 5 };
    expect(evaluateBet(low, 0).won).toBe(false);
    expect(evaluateBet(low, 1).won).toBe(true);
    expect(evaluateBet(low, 18).won).toBe(true);
    expect(evaluateBet(low, 19).won).toBe(false);
    expect(evaluateBet(high, 0).won).toBe(false);
    expect(evaluateBet(high, 18).won).toBe(false);
    expect(evaluateBet(high, 19).won).toBe(true);
    expect(evaluateBet(high, 36).won).toBe(true);
  });

  it("dozens partition 1..36 into three 12-number ranges", () => {
    const d1: RouletteBet = { kind: "dozen-1", amount: 5 };
    const d2: RouletteBet = { kind: "dozen-2", amount: 5 };
    const d3: RouletteBet = { kind: "dozen-3", amount: 5 };
    expect(evaluateBet(d1, 0).won).toBe(false);
    expect(evaluateBet(d1, 1).won).toBe(true);
    expect(evaluateBet(d1, 12).won).toBe(true);
    expect(evaluateBet(d1, 13).won).toBe(false);
    expect(evaluateBet(d2, 13).won).toBe(true);
    expect(evaluateBet(d2, 24).won).toBe(true);
    expect(evaluateBet(d3, 25).won).toBe(true);
    expect(evaluateBet(d3, 36).won).toBe(true);
    expect(evaluateBet(d3, 24).won).toBe(false);
  });

  it("columns partition by `n % 3` and exclude 0", () => {
    const c1: RouletteBet = { kind: "column-1", amount: 5 };
    const c2: RouletteBet = { kind: "column-2", amount: 5 };
    const c3: RouletteBet = { kind: "column-3", amount: 5 };
    expect(evaluateBet(c1, 0).won).toBe(false);
    expect(evaluateBet(c1, 1).won).toBe(true);
    expect(evaluateBet(c1, 4).won).toBe(true);
    expect(evaluateBet(c1, 2).won).toBe(false);
    expect(evaluateBet(c2, 2).won).toBe(true);
    expect(evaluateBet(c2, 5).won).toBe(true);
    expect(evaluateBet(c2, 1).won).toBe(false);
    expect(evaluateBet(c3, 3).won).toBe(true);
    expect(evaluateBet(c3, 6).won).toBe(true);
    expect(evaluateBet(c3, 1).won).toBe(false);
    expect(evaluateBet(c3, 0).won).toBe(false);
  });
});

describe("runSpin — aggregate", () => {
  it("evaluates all bets against the same winning number and sums payouts", () => {
    const bets: RouletteBet[] = [
      { kind: "red", amount: 10 },
      { kind: "even", amount: 10 },
    ];
    const result = runSpin(bets);
    expect(result.winningNumber).toBeGreaterThanOrEqual(0);
    expect(result.winningNumber).toBeLessThanOrEqual(36);
    expect(result.betResults.length).toBe(2);
    const summed = result.betResults.reduce((sum, betResult) => sum + betResult.payout, 0);
    expect(result.totalPayout).toBe(summed);
  });

  it("returns an empty result when no bets are placed", () => {
    const result = runSpin([]);
    expect(result.betResults).toEqual([]);
    expect(result.totalPayout).toBe(0);
  });
});
