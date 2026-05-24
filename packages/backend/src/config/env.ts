import { readFileSync } from "node:fs";

export function readSecret(name: string): string | undefined {
  const filePath = process.env[`${name}_FILE`];
  if (filePath) {
    try {
      return readFileSync(filePath, "utf8").trim();
    } catch (err) {
      throw new Error(`Failed to read ${name} from file ${filePath}`, {
        cause: err,
      });
    }
  }
  return process.env[name];
}
