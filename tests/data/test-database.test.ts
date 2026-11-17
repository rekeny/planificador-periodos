/// <reference types="node" />
// T028: the shared database type and the in-memory test database (RF-016, RF-017, RF-025). The
// layer rules are checked on the source text: only tests/support/test-database.ts loads
// better-sqlite3 (SEC-T024-2), and src/data/database-types.ts, which src/state/ imports, loads no
// native package.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { teams } from "@/data/schema";
import {
  addTeam,
  counts,
  failureOf,
  openDatabase,
  FOREIGN_KEY_FAILED,
} from "./schema-fixtures";

const ROOT = join(__dirname, "..", "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { recursive: true })
    .map(String)
    .filter((name) => /\.tsx?$/.test(name))
    .map((name) => join(dir, name));
}

const importsOf = (file: string): string[] =>
  [
    ...readFileSync(join(ROOT, file), "utf8").matchAll(
      /(?:from\s+|import\s*\(\s*|require\(\s*|import\s+)["']([^"']+)["']/g,
    ),
  ].map((match) => match[1] ?? "");

describe("test database", () => {
  it("RF-016 RF-017 RF-025: it opens a migrated database with foreign keys on", () => {
    const db = openDatabase();
    expect(db.all(sql`pragma foreign_keys`)).toEqual([{ foreign_keys: 1 }]);
    expect(counts(db)).toEqual({
      teams: 0,
      players: 0,
      matches: 0,
      call_up_entries: 0,
      marks: 0,
    });
  });

  it("RF-016 RF-017 RF-025: two databases opened in a row share no rows", () => {
    const first = openDatabase();
    const second = openDatabase();
    addTeam(first);
    expect(first.select().from(teams).all()).toHaveLength(1);
    expect(second.select().from(teams).all()).toHaveLength(0);
  });

  it("RF-016 RF-025: the database it gives enforces foreign keys, so a stray insert fails", () => {
    const db = openDatabase();
    expect(
      failureOf(() =>
        db.run(
          sql`insert into players (team_id, name, number) values (1, 'Ana', '7')`,
        ),
      ),
    ).toMatch(FOREIGN_KEY_FAILED);
  });
});

describe("database layers", () => {
  it("RF-016 RF-017 RF-025: src/data/database-types.ts exists and imports only drizzle-orm subpaths and the schema", () => {
    const file = "src/data/database-types.ts";
    expect(existsSync(join(ROOT, file))).toBe(true);
    const allowed = /^(\.\/schema|@\/data\/schema|drizzle-orm\/sqlite-core)$/;
    expect(importsOf(file).filter((name) => !allowed.test(name))).toEqual([]);
  });

  it("RF-016 RF-017 RF-025: src/data/database-types.ts exports the AppDatabase type", () => {
    const text = readFileSync(join(ROOT, "src/data/database-types.ts"), "utf8");
    expect(text).toMatch(/export\s+type\s+AppDatabase\b/);
    expect(text).toMatch(/BaseSQLiteDatabase\s*<\s*["']sync["']/);
  });

  it("RF-016 RF-017 RF-025: no file under src/ imports better-sqlite3 or drizzle-orm/better-sqlite3", () => {
    const offenders = sourceFiles("src").filter((file) =>
      importsOf(file).some((name) => name.includes("better-sqlite3")),
    );
    expect(offenders).toEqual([]);
  });

  it("RF-016 RF-017 RF-025: tests/support/test-database.ts is the only file of tests/support that imports better-sqlite3", () => {
    const helper = "tests/support/test-database.ts";
    expect(existsSync(join(ROOT, helper))).toBe(true);
    const importers = sourceFiles("tests/support").filter((file) =>
      importsOf(file).some((name) => name.includes("better-sqlite3")),
    );
    expect(importers).toEqual([helper]);
  });

  it("RF-016 RF-017 RF-025: the test database helper uses only the better-sqlite3 subpaths of drizzle-orm, never its root", () => {
    const names = importsOf("tests/support/test-database.ts");
    expect(names).toEqual(expect.arrayContaining(["better-sqlite3"]));
    expect(names.filter((name) => name === "drizzle-orm")).toEqual([]);
    expect(names).toContain("drizzle-orm/better-sqlite3");
    expect(names).toContain("drizzle-orm/better-sqlite3/migrator");
  });
});
