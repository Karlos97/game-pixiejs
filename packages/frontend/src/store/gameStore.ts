import { create } from "zustand";
import type {
  NPC,
  RouletteBet,
  RouletteSpinResponse,
  SlotSpinResponse,
  Vec2,
} from "@experiments/shared";

type Scene = "world" | "slot" | "roulette";

interface GameState {
  playerName: string | null;
  coins: number;
  nearbyNPC: NPC | null;
  dialogOpen: boolean;
  activeDialogNPC: NPC | null;

  scene: Scene;
  isSpinning: boolean;
  lastSpinResult: SlotSpinResponse | null;
  bet: number;
  betOptions: number[];

  selectedChip: number;
  chipOptions: number[];
  pendingBets: RouletteBet[];
  isRouletteSpinning: boolean;
  lastRouletteResult: RouletteSpinResponse | null;

  playerPosition: Vec2 | null;
  hasLoadedState: boolean;
  npcs: NPC[];
  outOfCoinsModalOpen: boolean;

  setPlayerName: (name: string) => void;
  setCoins: (coins: number) => void;
  setNearbyNPC: (npc: NPC | null) => void;
  openDialog: (npc: NPC) => void;
  closeDialog: () => void;

  setBalance: (coins: number) => void;
  setBet: (bet: number) => void;
  setIsSpinning: (v: boolean) => void;
  setLastSpinResult: (r: SlotSpinResponse | null) => void;
  openSlot: () => void;
  closeSlot: () => void;

  setSelectedChip: (n: number) => void;
  addBet: (bet: RouletteBet) => void;
  removeBet: (index: number) => void;
  clearBets: () => void;
  setIsRouletteSpinning: (v: boolean) => void;
  setLastRouletteResult: (r: RouletteSpinResponse | null) => void;
  openRoulette: () => void;
  closeRoulette: () => void;

  setPlayerPosition: (pos: Vec2) => void;
  setHasLoadedState: (v: boolean) => void;
  setNPCs: (npcs: NPC[]) => void;
  showOutOfCoinsModal: () => void;
  hideOutOfCoinsModal: () => void;
}

function betsMatch(a: RouletteBet, b: RouletteBet): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "straight") return a.number === b.number;
  return true;
}

export const useGameStore = create<GameState>((set) => ({
  playerName: null,
  coins: 0,
  nearbyNPC: null,
  dialogOpen: false,
  activeDialogNPC: null,

  scene: "world",
  isSpinning: false,
  lastSpinResult: null,
  bet: 50,
  betOptions: [10, 50, 100, 500],

  selectedChip: 25,
  chipOptions: [5, 25, 100, 500],
  pendingBets: [],
  isRouletteSpinning: false,
  lastRouletteResult: null,

  playerPosition: null,
  hasLoadedState: false,
  npcs: [],
  outOfCoinsModalOpen: false,

  setPlayerName: (name) => set({ playerName: name }),
  setCoins: (coins) => set({ coins }),
  setNearbyNPC: (npc) => set({ nearbyNPC: npc }),
  openDialog: (npc) => set({ dialogOpen: true, activeDialogNPC: npc }),
  closeDialog: () => set({ dialogOpen: false, activeDialogNPC: null }),

  setBalance: (coins) => set({ coins }),
  setBet: (bet) => set({ bet }),
  setIsSpinning: (v) => set({ isSpinning: v }),
  setLastSpinResult: (r) => set({ lastSpinResult: r }),
  openSlot: () =>
    set({
      scene: "slot",
      dialogOpen: false,
      activeDialogNPC: null,
      lastSpinResult: null,
    }),
  closeSlot: () => set({ scene: "world", isSpinning: false, lastSpinResult: null }),

  setSelectedChip: (n) => set({ selectedChip: n }),
  addBet: (bet) =>
    set((state) => {
      const idx = state.pendingBets.findIndex((b) => betsMatch(b, bet));
      if (idx >= 0) {
        const next = state.pendingBets.slice();
        const existing = next[idx];
        if (existing) {
          next[idx] = { ...existing, amount: existing.amount + bet.amount };
        }
        return { pendingBets: next };
      }
      return { pendingBets: [...state.pendingBets, bet] };
    }),
  removeBet: (index) =>
    set((state) => ({
      pendingBets: state.pendingBets.filter((_, i) => i !== index),
    })),
  clearBets: () => set({ pendingBets: [] }),
  setIsRouletteSpinning: (v) => set({ isRouletteSpinning: v }),
  setLastRouletteResult: (r) => set({ lastRouletteResult: r }),
  openRoulette: () =>
    set({
      scene: "roulette",
      dialogOpen: false,
      activeDialogNPC: null,
      lastRouletteResult: null,
    }),
  closeRoulette: () =>
    set({
      scene: "world",
      isRouletteSpinning: false,
      lastRouletteResult: null,
      pendingBets: [],
    }),

  setPlayerPosition: (pos) => set({ playerPosition: pos }),
  setHasLoadedState: (v) => set({ hasLoadedState: v }),
  setNPCs: (npcs) => set({ npcs }),
  showOutOfCoinsModal: () => set({ outOfCoinsModalOpen: true }),
  hideOutOfCoinsModal: () => set({ outOfCoinsModalOpen: false }),
}));
