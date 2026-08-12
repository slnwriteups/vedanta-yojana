import fs from "node:fs";
import path from "node:path";
import { MalformedJsonError } from "./errors.ts";

/**
 * Internal filesystem helpers for the content loader. Not exported from
 * the loader's public API (`content-lib/loader/index.ts`) — the public
 * surface deals in content semantics (Divya Desams, Books, Chapters,
 * Knowledge), not filesystem mechanics.
 */

/** JSON files directly inside `dirPath`. [] if the directory doesn't exist. Non-.json files are ignored (e.g. a stray README.md). */
export function listJsonFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(dirPath, entry.name))
    .sort();
}

/** Subdirectory names directly inside `dirPath`. [] if the directory doesn't exist. */
export function listSubdirectories(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** Reads and JSON.parses a file, throwing MalformedJsonError (identifying the file) on failure. */
export function readJsonFile(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch (cause) {
    throw new MalformedJsonError(filePath, cause);
  }
}
