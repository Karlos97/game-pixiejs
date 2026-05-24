import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { players } from "../db/schema.js";

export const DEFAULT_BALANCE = 1000;

export interface PlayerRow {
  id: string;
  name: string;
  coins: number;
  posX: number;
  posY: number;
}

export type DeductResult =
  | { ok: true; newBalance: number }
  | { ok: false; reason: "insufficient" | "not_found"; balance: number };

export type CreditResult =
  | { ok: true; newBalance: number }
  | { ok: false; reason: "not_found" };

export async function getPlayer(name: string): Promise<PlayerRow | null> {
  const rows = await db
    .select({
      id: players.id,
      name: players.name,
      coins: players.coins,
      posX: players.posX,
      posY: players.posY,
    })
    .from(players)
    .where(eq(players.name, name))
    .limit(1);

  return rows[0] ?? null;
}

export async function createPlayer(name: string): Promise<PlayerRow | null> {
  const inserted = await db
    .insert(players)
    .values({ name })
    .onConflictDoNothing({ target: players.name })
    .returning({
      id: players.id,
      name: players.name,
      coins: players.coins,
      posX: players.posX,
      posY: players.posY,
    });

  return inserted[0] ?? null;
}

export async function getBalance(name: string): Promise<number | null> {
  const player = await getPlayer(name);
  return player ? player.coins : null;
}

export async function deduct(name: string, amount: number): Promise<DeductResult> {
  const updated = await db
    .update(players)
    .set({
      coins: sql`${players.coins} - ${amount}`,
      updatedAt: new Date(),
    })
    .where(and(eq(players.name, name), gte(players.coins, amount)))
    .returning({ coins: players.coins });

  if (updated.length === 0) {
    const rows = await db
      .select({ coins: players.coins })
      .from(players)
      .where(eq(players.name, name))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return { ok: false, reason: "not_found", balance: 0 };
    }
    return { ok: false, reason: "insufficient", balance: row.coins };
  }

  return { ok: true, newBalance: updated[0]!.coins };
}

export async function credit(name: string, amount: number): Promise<CreditResult> {
  const updated = await db
    .update(players)
    .set({
      coins: sql`${players.coins} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(players.name, name))
    .returning({ coins: players.coins });

  const next = updated[0]?.coins;
  if (next === undefined) {
    return { ok: false, reason: "not_found" };
  }
  return { ok: true, newBalance: next };
}

export async function reset(name: string): Promise<number | null> {
  const updated = await db
    .update(players)
    .set({ coins: DEFAULT_BALANCE, updatedAt: new Date() })
    .where(eq(players.name, name))
    .returning({ coins: players.coins });

  const next = updated[0]?.coins;
  return next === undefined ? null : next;
}
