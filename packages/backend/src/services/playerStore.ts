import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { players } from "../db/schema.js";
import { getPlayer } from "./balanceStore.js";

export interface PlayerState {
  playerId: string;
  name: string;
  coins: number;
  posX: number;
  posY: number;
}

export async function getState(name: string): Promise<PlayerState | null> {
  const row = await getPlayer(name);
  if (!row) return null;
  return {
    playerId: row.id,
    name: row.name,
    coins: row.coins,
    posX: row.posX,
    posY: row.posY,
  };
}

export async function saveState(name: string, posX: number, posY: number): Promise<void> {
  const updated = await db
    .update(players)
    .set({ posX, posY, updatedAt: new Date() })
    .where(eq(players.name, name))
    .returning({ id: players.id });

  if (updated.length === 0) {
    throw new Error("PLAYER_NOT_FOUND");
  }
}
