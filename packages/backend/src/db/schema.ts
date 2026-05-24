import { relations, sql } from "drizzle-orm";
import {
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const players = pgTable("players", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  coins: integer("coins").notNull().default(1000),
  posX: doublePrecision("pos_x").notNull().default(1000),
  posY: doublePrecision("pos_y").notNull().default(1000),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const spins = pgTable("spins", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  bet: integer("bet").notNull(),
  payout: integer("payout").notNull(),
  symbols: jsonb("symbols").notNull(),
  paylines: jsonb("paylines").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const playersRelations = relations(players, ({ many }) => ({
  spins: many(spins),
}));

export const spinsRelations = relations(spins, ({ one }) => ({
  player: one(players, {
    fields: [spins.playerId],
    references: [players.id],
  }),
}));

export const rouletteSpins = pgTable("roulette_spins", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  bets: jsonb("bets").notNull(),
  winningNumber: integer("winning_number").notNull(),
  totalBet: integer("total_bet").notNull(),
  totalPayout: integer("total_payout").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rouletteSpinsRelations = relations(rouletteSpins, ({ one }) => ({
  player: one(players, {
    fields: [rouletteSpins.playerId],
    references: [players.id],
  }),
}));

export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Spin = typeof spins.$inferSelect;
export type NewSpin = typeof spins.$inferInsert;
export type RouletteSpinRow = typeof rouletteSpins.$inferSelect;
export type NewRouletteSpin = typeof rouletteSpins.$inferInsert;
