import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Test-only helpers for creating an isolated, temporary content root
 * (entirely outside the repository, under the OS temp directory) so
 * loader tests never touch the real `/content` directory. Each call to
 * `makeTempContentRoot()` creates a fresh, uniquely-named directory;
 * callers must call `cleanupTempContentRoot()` (e.g. in an `afterEach`)
 * to remove it again.
 */

export function makeTempContentRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "vy-content-loader-test-"));
}

export function cleanupTempContentRoot(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

export function writeJsonFile(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

export function writeRawFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}
