import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
  preHandlerHookHandler,
} from "fastify";
import fp from "fastify-plugin";
import { readSecret } from "../config/env.js";

const COOKIE_NAME = "experiments_session";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const MIN_SECRET_LENGTH = 32;

let cachedSecret: string | null = null;

function getSecret(): string {
  if (cachedSecret !== null) return cachedSecret;

  const fromEnv = readSecret("SESSION_SECRET");
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    if (!fromEnv || fromEnv.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `SESSION_SECRET must be set in production (min ${MIN_SECRET_LENGTH} chars). ` +
          "Generate one with: openssl rand -hex 32",
      );
    }
    cachedSecret = fromEnv;
    return cachedSecret;
  }

  if (fromEnv && fromEnv.length >= MIN_SECRET_LENGTH) {
    cachedSecret = fromEnv;
    return cachedSecret;
  }

  cachedSecret = "dev-only-session-secret-not-for-production-use!!";
  return cachedSecret;
}

function b64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecodeToString(input: string): string | null {
  try {
    const padded = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
    return Buffer.from(padded + pad, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function hmacSign(payload: string): string {
  return b64url(createHmac("sha256", getSecret()).update(payload).digest());
}

export function signToken(playerName: string): string {
  const namePart = b64url(playerName);
  const iat = Math.floor(Date.now() / 1000).toString();
  const payload = `${namePart}.${iat}`;
  const sig = hmacSign(payload);
  return `${payload}.${sig}`;
}

export function verifyToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [namePart, iat, sig] = parts;
  if (!namePart || !iat || !sig) return null;

  const expected = hmacSign(`${namePart}.${iat}`);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  const decoded = b64urlDecodeToString(namePart);
  if (decoded === null || decoded.length === 0) return null;
  return decoded;
}

export interface SessionData {
  playerName: string;
}

declare module "fastify" {
  interface FastifyRequest {
    session: SessionData | null;
  }
}

export function setSessionCookie(reply: FastifyReply, playerName: string): void {
  const token = signToken(playerName);
  const isProduction = process.env.NODE_ENV === "production";
  reply.setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(COOKIE_NAME, { path: "/" });
}

const sessionPluginImpl: FastifyPluginAsync = async (app) => {
  app.decorateRequest("session", null);
  app.addHook("preHandler", async (request) => {
    const raw = request.cookies?.[COOKIE_NAME];
    const playerName = verifyToken(raw);
    request.session = playerName ? { playerName } : null;
  });
};

export const sessionPlugin = fp(sessionPluginImpl, {
  name: "session-plugin",
  dependencies: ["@fastify/cookie"],
});

export const requireSession: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  if (!request.session) {
    reply.code(401).send({ error: "UNAUTHENTICATED" });
  }
};

export function assertSessionSecretAvailable(): void {
  getSecret();
}
