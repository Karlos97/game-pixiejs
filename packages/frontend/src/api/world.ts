import type { NPC } from "@experiments/shared";
import { apiBaseUrl } from "./config";

interface WorldNPCsResponse {
  npcs: NPC[];
}

export async function fetchNPCs(): Promise<NPC[]> {
  const res = await fetch(`${apiBaseUrl}/world/npcs`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch NPCs: ${res.status}`);
  }
  const data = (await res.json()) as WorldNPCsResponse;
  return data.npcs;
}
