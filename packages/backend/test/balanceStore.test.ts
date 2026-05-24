import { beforeEach, describe, expect, it, vi } from "vitest";

interface MockState {
  updateReturning: unknown[];
  selectLimit: unknown[];
}

const mockState: MockState = {
  updateReturning: [],
  selectLimit: [],
};

vi.mock("../src/db/client.js", () => {
  const updateChain = {
    set: () => updateChain,
    where: () => updateChain,
    returning: () => Promise.resolve(mockState.updateReturning),
  };

  const selectChain = {
    from: () => selectChain,
    where: () => selectChain,
    limit: () => Promise.resolve(mockState.selectLimit),
  };

  return {
    db: {
      update: () => updateChain,
      select: () => selectChain,
      insert: () => ({
        values: () => ({
          onConflictDoNothing: () => ({
            returning: () => Promise.resolve([]),
          }),
        }),
      }),
    },
  };
});

const { deduct, credit, reset } = await import("../src/services/balanceStore.js");

beforeEach(() => {
  mockState.updateReturning = [];
  mockState.selectLimit = [];
});

describe("deduct", () => {
  it("returns ok with the new balance when UPDATE matches a row", async () => {
    mockState.updateReturning = [{ coins: 950 }];
    const result = await deduct("alice", 50);
    expect(result).toEqual({ ok: true, newBalance: 950 });
  });

  it("returns insufficient when UPDATE matches no rows but the player exists", async () => {
    mockState.updateReturning = [];
    mockState.selectLimit = [{ coins: 10 }];
    const result = await deduct("alice", 100);
    expect(result).toEqual({ ok: false, reason: "insufficient", balance: 10 });
  });

  it("returns not_found when UPDATE matches no rows AND no player row exists", async () => {
    mockState.updateReturning = [];
    mockState.selectLimit = [];
    const result = await deduct("ghost", 100);
    expect(result).toEqual({ ok: false, reason: "not_found", balance: 0 });
  });
});

describe("credit", () => {
  it("returns ok with the new balance when UPDATE matches a row", async () => {
    mockState.updateReturning = [{ coins: 1050 }];
    const result = await credit("alice", 50);
    expect(result).toEqual({ ok: true, newBalance: 1050 });
  });

  it("returns not_found when UPDATE matches no rows", async () => {
    mockState.updateReturning = [];
    const result = await credit("ghost", 50);
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("reset", () => {
  it("returns the new balance when UPDATE matches a row", async () => {
    mockState.updateReturning = [{ coins: 1000 }];
    const result = await reset("alice");
    expect(result).toBe(1000);
  });

  it("returns null when no row matches", async () => {
    mockState.updateReturning = [];
    const result = await reset("ghost");
    expect(result).toBeNull();
  });
});
