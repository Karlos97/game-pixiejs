import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "../src/auth/session.js";

describe("signToken / verifyToken — happy path", () => {
  it("produces a 3-part token (b64name.iat.b64hmac)", () => {
    const token = signToken("alice");
    const parts = token.split(".");
    expect(parts.length).toBe(3);
    const [namePart, iat, sig] = parts;
    expect(namePart).toBeTruthy();
    expect(iat).toBeTruthy();
    expect(sig).toBeTruthy();
    expect(Number.isFinite(Number(iat))).toBe(true);
    expect(namePart).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(sig).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("verifyToken returns the original player name", () => {
    expect(verifyToken(signToken("alice"))).toBe("alice");
    expect(verifyToken(signToken("bob-with-dashes"))).toBe("bob-with-dashes");
    expect(verifyToken(signToken("unicode-✓-name"))).toBe("unicode-✓-name");
  });
});

describe("verifyToken — rejection cases", () => {
  it("rejects tampered tokens (extra character appended)", () => {
    const token = signToken("alice");
    expect(verifyToken(token + "x")).toBeNull();
  });

  it("rejects tampered tokens (signature mutated)", () => {
    const token = signToken("alice");
    const parts = token.split(".");
    const sig = parts[2]!;
    const flipped = (sig[0] === "A" ? "B" : "A") + sig.slice(1);
    parts[2] = flipped;
    expect(verifyToken(parts.join("."))).toBeNull();
  });

  it("rejects malformed garbage input", () => {
    expect(verifyToken("garbage")).toBeNull();
    expect(verifyToken("only.two")).toBeNull();
    expect(verifyToken("a.b.c.d")).toBeNull();
    expect(verifyToken("..")).toBeNull();
  });

  it("rejects null and undefined", () => {
    expect(verifyToken(undefined)).toBeNull();
    expect(verifyToken(null)).toBeNull();
    expect(verifyToken("")).toBeNull();
  });

  it("rejects empty-name tokens (empty b64 decodes to empty string)", () => {
    const token = signToken("");
    expect(verifyToken(token)).toBeNull();
  });
});

describe("verifyToken — cross-secret", () => {
  it("a token signed under a different SESSION_SECRET cannot be re-verified", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createHmac } = require("node:crypto") as typeof import("node:crypto");
    const namePart = Buffer.from("alice", "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const iat = Math.floor(Date.now() / 1000).toString();
    const payload = `${namePart}.${iat}`;
    const forgedSecret = "z".repeat(64);
    const forgedSig = createHmac("sha256", forgedSecret)
      .update(payload)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const forged = `${payload}.${forgedSig}`;
    expect(verifyToken(forged)).toBeNull();
  });
});

describe("session.ts — implementation hardening", () => {
  it("uses timingSafeEqual for signature comparison", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const sessionPath = resolve(here, "../src/auth/session.ts");
    const source = readFileSync(sessionPath, "utf8");
    expect(source).toContain("timingSafeEqual");
  });
});
