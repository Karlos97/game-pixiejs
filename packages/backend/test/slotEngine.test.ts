import { describe, expect, it } from "vitest";
import {
  SLOT_REELS,
  SLOT_ROWS,
  SLOT_SYMBOLS,
  type SlotSymbol,
} from "@experiments/shared";
import { spinReels } from "../src/services/slotEngine.js";

const PAYOUTS: Record<SlotSymbol, number> = {
  CHERRY: 2,
  LEMON: 3,
  BELL: 5,
  STAR: 8,
  GEM: 20,
  SEVEN: 50,
};

const MAX_PAYLINES = SLOT_ROWS + 2;
const MAX_MULTIPLIER = Math.max(...Object.values(PAYOUTS));
const MAX_POSSIBLE_PER_BET = MAX_PAYLINES * MAX_MULTIPLIER;

describe("spinReels — shape & invariants", () => {
  it("returns a 3x3 grid where every symbol is from the SLOT_SYMBOLS set", () => {
    const { symbols } = spinReels(1);
    expect(symbols.length).toBe(SLOT_REELS);
    for (const reel of symbols) {
      expect(reel.length).toBe(SLOT_ROWS);
      for (const sym of reel) {
        expect(SLOT_SYMBOLS).toContain(sym);
      }
    }
  });

  it("payout equals sum of bet * PAYOUTS[symbol] across all detected paylines", () => {
    for (let i = 0; i < 200; i++) {
      const bet = 10;
      const { paylines, payout } = spinReels(bet);
      const expected = paylines.reduce((sum, p) => sum + bet * PAYOUTS[p.symbol], 0);
      expect(payout).toBe(expected);
      for (const p of paylines) {
        expect(p.multiplier).toBe(PAYOUTS[p.symbol]);
      }
    }
  });

  it("never produces a negative or absurdly large payout across 100 spins", () => {
    const bet = 5;
    for (let i = 0; i < 100; i++) {
      const { payout } = spinReels(bet);
      expect(payout).toBeGreaterThanOrEqual(0);
      expect(payout).toBeLessThanOrEqual(MAX_POSSIBLE_PER_BET * bet);
    }
  });

  it("detects all-rows-match cases correctly (grid sanity)", () => {
    let sawRowMatch = false;
    for (let i = 0; i < 500; i++) {
      const { paylines } = spinReels(1);
      if (paylines.some((p) => p.kind === "row")) {
        sawRowMatch = true;
        break;
      }
    }
    expect(sawRowMatch).toBe(true);
  });
});

describe("spinReels — RNG sanity", () => {
  it("produces every symbol at least once across 2000 spins (no obviously dead weight)", () => {
    const seen = new Set<SlotSymbol>();
    for (let i = 0; i < 2000; i++) {
      const { symbols } = spinReels(1);
      for (const reel of symbols) {
        for (const sym of reel) {
          seen.add(sym);
        }
      }
      if (seen.size === SLOT_SYMBOLS.length) break;
    }
    expect(seen.size).toBe(SLOT_SYMBOLS.length);
  });
});
