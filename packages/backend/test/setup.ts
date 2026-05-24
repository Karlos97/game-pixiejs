import { beforeAll } from "vitest";

beforeAll(() => {
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = "a".repeat(64);
  }
  process.env.NODE_ENV = "test";
});
