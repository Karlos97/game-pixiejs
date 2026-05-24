import { randomInt } from "node:crypto";
import {
  SLOT_REELS,
  SLOT_ROWS,
  SLOT_SYMBOLS,
  type Payline,
  type SlotGrid,
  type SlotSymbol,
} from "@experiments/shared";

const WEIGHTS: Record<SlotSymbol, number> = {
  CHERRY: 30,
  LEMON: 25,
  BELL: 20,
  STAR: 15,
  GEM: 7,
  SEVEN: 3,
};

const PAYOUTS: Record<SlotSymbol, number> = {
  CHERRY: 2,
  LEMON: 3,
  BELL: 5,
  STAR: 8,
  GEM: 20,
  SEVEN: 50,
};

const TOTAL_WEIGHT = SLOT_SYMBOLS.reduce((sum, sym) => sum + WEIGHTS[sym], 0);

function weightedSymbol(): SlotSymbol {
  let roll = randomInt(0, TOTAL_WEIGHT);
  for (const sym of SLOT_SYMBOLS) {
    roll -= WEIGHTS[sym];
    if (roll < 0) {
      return sym;
    }
  }
  return SLOT_SYMBOLS[SLOT_SYMBOLS.length - 1]!;
}

export function spinReels(bet: number): {
  symbols: SlotGrid;
  paylines: Payline[];
  payout: number;
} {
  const symbols: SlotGrid = [];
  for (let col = 0; col < SLOT_REELS; col++) {
    const reel: SlotSymbol[] = [];
    for (let row = 0; row < SLOT_ROWS; row++) {
      reel.push(weightedSymbol());
    }
    symbols.push(reel);
  }

  const paylines: Payline[] = [];

  for (let row = 0; row < SLOT_ROWS; row++) {
    const first = symbols[0]![row]!;
    let allMatch = true;
    for (let col = 1; col < SLOT_REELS; col++) {
      if (symbols[col]![row] !== first) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) {
      paylines.push({
        kind: "row",
        index: row,
        symbol: first,
        multiplier: PAYOUTS[first],
      });
    }
  }

  const diagDownStart = symbols[0]![0]!;
  if (diagDownStart === symbols[1]![1] && diagDownStart === symbols[2]![2]) {
    paylines.push({
      kind: "diag-down",
      index: 0,
      symbol: diagDownStart,
      multiplier: PAYOUTS[diagDownStart],
    });
  }

  const diagUpStart = symbols[0]![2]!;
  if (diagUpStart === symbols[1]![1] && diagUpStart === symbols[2]![0]) {
    paylines.push({
      kind: "diag-up",
      index: 0,
      symbol: diagUpStart,
      multiplier: PAYOUTS[diagUpStart],
    });
  }

  const payout = paylines.reduce((sum, payline) => sum + bet * payline.multiplier, 0);

  return { symbols, paylines, payout };
}
