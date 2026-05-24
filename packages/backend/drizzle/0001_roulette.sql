CREATE TABLE IF NOT EXISTS "roulette_spins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"bets" jsonb NOT NULL,
	"winning_number" integer NOT NULL,
	"total_bet" integer NOT NULL,
	"total_payout" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "roulette_spins" ADD CONSTRAINT "roulette_spins_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
