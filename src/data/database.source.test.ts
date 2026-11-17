/// <reference types="node" />
// T029: what the source of the start-up files may and may not do (RF-011, RF-082), read as text:
// the data stack stays in src/data/, and screens never reach the database through a React
// context (plan.md "Data"). Behaviour is in database.test.ts and database-ready.test.ts.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");

const read = (file: string): string => readFileSync(join(ROOT, file), "utf8");

function importsOf(file: string): string[] {
  return [
    ...read(file).matchAll(
      /(?:from\s+|import\s*\(\s*|require\(\s*|import\s+)["']([^"']+)["']/g,
    ),
  ].map((match) => match[1] ?? "");
}

function productionFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { recursive: true })
    .map(String)
    .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
    .map((name) => join(dir, name));
}

describe("database source", () => {
  it("RF-011 RF-082: src/data/database.ts opens with expo-sqlite, wraps with drizzle-orm/expo-sqlite and migrates with its migrator and the bundle", () => {
    const file = "src/data/database.ts";
    expect(existsSync(join(ROOT, file))).toBe(true);
    const names = importsOf(file);
    expect(names).toContain("expo-sqlite");
    expect(names).toContain("drizzle-orm/expo-sqlite");
    expect(names).toContain("drizzle-orm/expo-sqlite/migrator");
    expect(
      names.some((name) => /^(\.\/|@\/data\/)migrations\/bundle$/.test(name)),
    ).toBe(true);
  });

  it("RF-011 RF-082: src/data/database.ts never imports better-sqlite3", () => {
    expect(importsOf("src/data/database.ts").join(" ")).not.toContain(
      "better-sqlite3",
    );
  });

  it("RF-011 RF-082: src/state/database-ready.ts exports initializeDatabase and imports no expo-sqlite or drizzle", () => {
    const file = "src/state/database-ready.ts";
    expect(existsSync(join(ROOT, file))).toBe(true);
    expect(read(file)).toMatch(
      /export\s+(async\s+)?function\s+initializeDatabase\b|export\s+const\s+initializeDatabase\b/,
    );
    expect(
      importsOf(file).filter(
        (name) => name.includes("expo-sqlite") || name.includes("drizzle"),
      ),
    ).toEqual([]);
  });

  it("RF-011 RF-082: no production file uses SQLiteProvider or useSQLiteContext", () => {
    const offenders = ["src/app", "src/data", "src/state", "src/ui"]
      .filter((dir) => existsSync(join(ROOT, dir)))
      .flatMap(productionFiles)
      .filter((file) =>
        /\b(SQLiteProvider|useSQLiteContext)\b/.test(read(file)),
      );
    expect(offenders).toEqual([]);
  });

  it("RF-011 RF-082: only src/data/ imports expo-sqlite", () => {
    const offenders = [
      "src/app",
      "src/domain",
      "src/i18n",
      "src/state",
      "src/ui",
    ]
      .filter((dir) => existsSync(join(ROOT, dir)))
      .flatMap(productionFiles)
      .filter((file) =>
        importsOf(file).some((name) => name.startsWith("expo-sqlite")),
      );
    expect(offenders).toEqual([]);
  });
});
