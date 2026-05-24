import type { RouletteSpinRequest, RouletteSpinResponse } from "@experiments/shared";
import { apiBaseUrl } from "./config";

export class RouletteInsufficientFundsError extends Error {
  balance: number | undefined;
  constructor(balance: number | undefined) {
    super("INSUFFICIENT_FUNDS");
    this.name = "RouletteInsufficientFundsError";
    this.balance = balance;
  }
}

export async function spinRoulette(
  req: RouletteSpinRequest,
): Promise<RouletteSpinResponse> {
  const res = await fetch(`${apiBaseUrl}/roulette/spin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    let body: { error?: string; balance?: number } = {};
    try {
      body = (await res.json()) as { error?: string; balance?: number };
    } catch {
      /* empty */
    }
    if (res.status === 400 && body.error === "INSUFFICIENT_FUNDS") {
      throw new RouletteInsufficientFundsError(body.balance);
    }
    throw new Error(`Roulette spin failed: ${res.status} ${body.error ?? ""}`.trim());
  }

  return (await res.json()) as RouletteSpinResponse;
}
