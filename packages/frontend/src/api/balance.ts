import type { BalanceResponse } from "@experiments/shared";
import { apiBaseUrl } from "./config";

export async function fetchBalance(): Promise<number> {
  const res = await fetch(`${apiBaseUrl}/me/balance`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch balance: ${res.status}`);
  }
  const data = (await res.json()) as BalanceResponse;
  return data.coins;
}

export async function resetBalance(): Promise<number> {
  const res = await fetch(`${apiBaseUrl}/me/reset`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to reset balance: ${res.status}`);
  }
  const data = (await res.json()) as BalanceResponse;
  return data.coins;
}
