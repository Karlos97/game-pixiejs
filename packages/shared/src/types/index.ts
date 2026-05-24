export interface Player {
  id: string;
  name: string;
  coins: number;
  position: Vec2;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface NPC {
  id: string;
  name: string;
  position: Vec2;
  kind: "slot-machine" | "shop" | "quest-giver" | "roulette-table";
}

export const SLOT_SYMBOLS = ["CHERRY", "LEMON", "BELL", "STAR", "GEM", "SEVEN"] as const;
export type SlotSymbol = (typeof SLOT_SYMBOLS)[number];

export const SLOT_REELS = 3;
export const SLOT_ROWS = 3;

export type SlotGrid = SlotSymbol[][];

export type PaylineKind = "row" | "diag-down" | "diag-up";

export interface Payline {
  kind: PaylineKind;
  index: number;
  symbol: SlotSymbol;
  multiplier: number;
}

export interface SlotSpinRequest {
  bet: number;
}

export interface SlotSpinResponse {
  symbols: SlotGrid;
  paylines: Payline[];
  payout: number;
  newCoinBalance: number;
}

export interface BalanceResponse {
  playerId: string;
  coins: number;
}

export interface CreatePlayerRequest {
  name?: string;
}

export interface CreatePlayerResponse {
  playerId: string;
  name: string;
  coins: number;
  posX: number;
  posY: number;
}

export interface HealthResponse {
  status: "ok";
  timestamp: number;
}

export interface PlayerStateResponse {
  playerId: string;
  name: string;
  coins: number;
  posX: number;
  posY: number;
}

export interface UpdatePlayerStateRequest {
  posX: number;
  posY: number;
}

export const ROULETTE_BET_KINDS = [
  "red",
  "black",
  "even",
  "odd",
  "low",
  "high",
  "dozen-1",
  "dozen-2",
  "dozen-3",
  "column-1",
  "column-2",
  "column-3",
  "straight",
] as const;
export type RouletteBetKind = (typeof ROULETTE_BET_KINDS)[number];

export const ROULETTE_PAYOUTS: Record<RouletteBetKind, number> = {
  red: 2,
  black: 2,
  even: 2,
  odd: 2,
  low: 2,
  high: 2,
  "dozen-1": 3,
  "dozen-2": 3,
  "dozen-3": 3,
  "column-1": 3,
  "column-2": 3,
  "column-3": 3,
  straight: 36,
};

export interface RouletteBet {
  kind: RouletteBetKind;
  number?: number;
  amount: number;
}

export const ROULETTE_WHEEL_ORDER: readonly number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1,
  20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

export const ROULETTE_RED_NUMBERS: ReadonlySet<number> = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export type RouletteColor = "red" | "black" | "green";

export function rouletteColorForNumber(n: number): RouletteColor {
  if (n === 0) return "green";
  return ROULETTE_RED_NUMBERS.has(n) ? "red" : "black";
}

export interface RouletteBetResult {
  bet: RouletteBet;
  won: boolean;
  payout: number;
}

export interface RouletteSpinRequest {
  bets: RouletteBet[];
}

export interface RouletteSpinResponse {
  winningNumber: number;
  winningColor: RouletteColor;
  totalBet: number;
  totalPayout: number;
  newCoinBalance: number;
  betResults: RouletteBetResult[];
}
