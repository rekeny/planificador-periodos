/// <reference types="node" />
// Tests of the mutation testing cache key in .github/workflows/verify.yml (Codex re-run, MINOR).
// Stryker loads tests/setup/fast-check-mutation.ts, so a change there must change the key; else a
// run reuses stale mutant results. The workflow is read as text. Test names carry no RF or E IDs.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const WORKFLOW = resolve(__dirname, "../../.github/workflows/verify.yml");
const lines = readFileSync(WORKFLOW, "utf8").split("\n");

/** The lines that hash files for the cache key: the restore key, the restore prefix and the save key. */
const hashed = lines
  .map((text, index) => ({ text, number: index + 1 }))
  .filter(({ text }) => /stryker-.*hashFiles\(/.test(text));

/** The list of globs inside `hashFiles(...)` of one line. */
function globsOf(text: string): string[] {
  const inside = /hashFiles\(([^)]*)\)/.exec(text)?.[1] ?? "";
  return [...inside.matchAll(/'([^']+)'/g)].map((match) => match[1] ?? "");
}

describe("verify workflow, mutation testing cache key", () => {
  it("builds the key in three places: restore key, restore prefix and save key", () => {
    expect(hashed.map(({ text }) => text.trim().split(":")[0])).toEqual([
      "key",
      "restore-keys",
      "key",
    ]);
  });

  it("hashes tests/setup/** in every place where the key lists its globs", () => {
    const missing = hashed
      .filter(({ text }) => !globsOf(text).includes("tests/setup/**"))
      .map(({ number }) => `verify.yml:${number}`);
    expect(missing).toEqual([]);
  });

  it("keeps the helpers, the configs and the lock file in the key", () => {
    for (const { text } of hashed) {
      expect(globsOf(text)).toEqual(
        expect.arrayContaining([
          "tests/support/**",
          "jest*.config.js",
          "stryker.config.json",
          "package-lock.json",
        ]),
      );
    }
  });

  it("lists the same globs in the three places, so a restored cache always matches the saved one", () => {
    const lists = hashed.map(({ text }) => globsOf(text).join("|"));
    expect(new Set(lists).size).toBe(1);
  });
});
