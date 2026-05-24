import type { CreatePlayerResponse } from "@experiments/shared";
import { apiBaseUrl } from "./config";

export async function createPlayer(name?: string): Promise<CreatePlayerResponse> {
  const res = await fetch(`${apiBaseUrl}/player`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(name !== undefined ? { name } : {}),
  });
  if (!res.ok) {
    throw new Error(`Failed to create player: ${res.status}`);
  }
  return (await res.json()) as CreatePlayerResponse;
}
