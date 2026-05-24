import type { FastifyPluginAsync } from "fastify";
import type { NPC } from "@experiments/shared";

const STATIC_NPCS: NPC[] = [
  {
    id: "npc-1",
    name: "Snake Eyes",
    position: { x: 656, y: 208 },
    kind: "slot-machine",
  },
  {
    id: "npc-2",
    name: "Big Hand",
    position: { x: 976, y: 624 },
    kind: "roulette-table",
  },
  {
    id: "npc-3",
    name: "Mama Carlotta",
    position: { x: 1168, y: 1104 },
    kind: "slot-machine",
  },
];

export const worldRoute: FastifyPluginAsync = async (app) => {
  app.get("/npcs", async () => {
    return { npcs: STATIC_NPCS };
  });
};
