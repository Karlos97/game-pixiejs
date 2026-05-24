import type { PlayerStateResponse } from "@experiments/shared";
import { apiBaseUrl } from "./config";

export class PlayerNotFoundError extends Error {
  constructor() {
    super("PLAYER_NOT_FOUND");
    this.name = "PlayerNotFoundError";
  }
}

export class UnauthenticatedError extends Error {
  constructor() {
    super("UNAUTHENTICATED");
    this.name = "UnauthenticatedError";
  }
}

export async function fetchPlayerState(): Promise<PlayerStateResponse> {
  const res = await fetch(`${apiBaseUrl}/me/state`, {
    credentials: "include",
  });
  if (res.status === 401) {
    throw new UnauthenticatedError();
  }
  if (res.status === 404) {
    throw new PlayerNotFoundError();
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch player state: ${res.status}`);
  }
  return (await res.json()) as PlayerStateResponse;
}

export async function savePlayerPosition(posX: number, posY: number): Promise<void> {
  const res = await fetch(`${apiBaseUrl}/me/state`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ posX, posY }),
  });
  if (!res.ok) {
    throw new Error(`Failed to save player position: ${res.status}`);
  }
}
