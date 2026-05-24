import type { SlotSpinRequest, SlotSpinResponse } from "@experiments/shared";
import { apiBaseUrl } from "./config";

export class InsufficientFundsError extends Error {
  balance: number | undefined;
  constructor(balance: number | undefined) {
    super("INSUFFICIENT_FUNDS");
    this.name = "InsufficientFundsError";
    this.balance = balance;
  }
}

export async function spin(req: SlotSpinRequest): Promise<SlotSpinResponse> {
  const res = await fetch(`${apiBaseUrl}/slot/spin`, {
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
      throw new InsufficientFundsError(body.balance);
    }
    throw new Error(`Spin failed: ${res.status} ${body.error ?? ""}`.trim());
  }

  return (await res.json()) as SlotSpinResponse;
}
