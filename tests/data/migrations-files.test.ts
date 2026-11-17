/// <reference types="node" />
// Tests of the real files of T027 (RF-011 and RF-082): drizzle.config.ts, the db:generate script,
// src/data/schema.ts, the generated SQL and meta/ folder, and src/data/migrations/bundle.ts. Every
// check that has to run drizzle-kit or the bundle script runs it on a temporary copy, so the real
// files are only read. A bundle.ts that differs from the SQL files turns these tests red.
import { is, getTableName } from "drizzle-orm";
import { SQLiteTable } from "drizzle-orm/sqlite-core";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import {
  BUNDLE,
  REAL_MIGRATIONS,
  ROOT,
  createProjectFromRealMigrations,
  createScratchFolder,
  evaluateBundle,
  removeFolders,
  runBundle,
  snapshot,
  type JournalEntry,
} from "../scripts/bundle-migrations-fixtures";

afterEach(removeFolders);

const DRIZZLE_KIT = join(ROOT, "node_modules/.bin/drizzle-kit");
const REAL_BUNDLE = join(ROOT, BUNDLE);

function readJournal(): { entries: JournalEntry[] } {
  const path = join(REAL_MIGRATIONS, "meta/_journal.json");
  expect(existsSync(path)).toBe(true);
  return JSON.parse(readFileSync(path, "utf8")) as { entries: JournalEntry[] };
}

function drizzleKit(args: string[]) {
  const result = spawnSync(DRIZZLE_KIT, args, { cwd: ROOT, encoding: "utf8" });
  return {
    status: result.status,
    output: `${result.stdout}\n${result.stderr}`,
  };
}

describe("drizzle configuration and schema", () => {
  it("RF-011 RF-082: drizzle.config.ts uses the sqlite dialect without a driver, the schema file and the migrations folder", () => {
    const path = join(ROOT, "drizzle.config.ts");
    expect(existsSync(path)).toBe(true);
    const text = readFileSync(path, "utf8");

    expect(text).toMatch(/dialect:\s*["']sqlite["']/);
    expect(text).toMatch(/schema:\s*["']\.\/src\/data\/schema\.ts["']/);
    expect(text).toMatch(/out:\s*["']\.\/src\/data\/migrations["']/);
    expect(text).not.toMatch(/driver\s*:/);
  });

  it("RF-011 RF-082: db:generate runs drizzle-kit generate and then the bundle script", () => {
    const packageJson = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };

    const script = packageJson.scripts["db:generate"] ?? "";

    expect(script).toMatch(/drizzle-kit generate/);
    expect(script).toMatch(/scripts\/bundle-migrations\.mjs/);
    expect(script.indexOf("drizzle-kit generate")).toBeLessThan(
      script.indexOf("bundle-migrations"),
    );
    expect(script).toMatch(/&&/);
  });

  it("RF-011 RF-082: src/data/schema.ts exports exactly the five tables of the plan", () => {
    expect(existsSync(join(ROOT, "src/data/schema.ts"))).toBe(true);
    const schemaPath = join(ROOT, "src/data/schema");
    const schema = jest.requireActual<Record<string, unknown>>(schemaPath);

    const names = Object.values(schema)
      .filter((value): value is SQLiteTable => is(value, SQLiteTable))
      .map((table) => getTableName(table));

    expect(names.sort()).toEqual(
      ["call_up_entries", "marks", "matches", "players", "teams"].sort(),
    );
  });
});

describe("generated migration folder", () => {
  it("RF-011 RF-082: every journal entry has its .sql file and its snapshot, and every .sql file has an entry", () => {
    const { entries } = readJournal();

    expect(entries.length).toBeGreaterThan(0);
    for (const item of entries) {
      expect(existsSync(join(REAL_MIGRATIONS, `${item.tag}.sql`))).toBe(true);
      const snapshotName = `${String(item.idx).padStart(4, "0")}_snapshot.json`;
      expect(existsSync(join(REAL_MIGRATIONS, "meta", snapshotName))).toBe(
        true,
      );
    }
    const files = readdirSync(REAL_MIGRATIONS).filter((n) =>
      n.endsWith(".sql"),
    );
    expect(files.sort()).toEqual(
      entries.map((item) => `${item.tag}.sql`).sort(),
    );
  });

  it("RF-011 RF-082: drizzle-kit check is green on the real migration folder", () => {
    const result = drizzleKit(["check"]);

    expect(result.output).toMatch(/Everything's fine/);
    expect(result.status).toBe(0);
  });

  it("RF-011 RF-082: generating again with no schema change writes or changes no file", () => {
    const project = createProjectFromRealMigrations();
    const scratch = createScratchFolder();
    const config = join(scratch, "drizzle.config.ts");
    writeFileSync(
      config,
      `export default { dialect: "sqlite", schema: "./src/data/schema.ts", out: ${JSON.stringify(relative(ROOT, join(project, "src/data/migrations")))} };\n`,
    );
    const before = snapshot(join(project, "src/data/migrations"));

    const result = drizzleKit(["generate", "--config", config]);

    expect(result.output).toMatch(/No schema changes/);
    expect(result.status).toBe(0);
    expect(snapshot(join(project, "src/data/migrations"))).toEqual(before);
  });
});

describe("the real bundle.ts", () => {
  it("RF-011 RF-082: bundle.ts is exactly what the script writes from the SQL files and the journal", () => {
    const project = createProjectFromRealMigrations();
    expect(runBundle(project).status).toBe(0);

    expect(existsSync(REAL_BUNDLE)).toBe(true);
    expect(readFileSync(REAL_BUNDLE, "utf8")).toBe(
      readFileSync(join(project, BUNDLE), "utf8"),
    );
  });

  it("RF-011 RF-082: bundle.ts holds the journal entries and every .sql file as a string under m0000, m0001, ...", () => {
    const { entries } = readJournal();
    expect(existsSync(REAL_BUNDLE)).toBe(true);

    const bundle = evaluateBundle(readFileSync(REAL_BUNDLE, "utf8"));

    expect(bundle.journal.entries).toEqual(entries);
    expect(Object.keys(bundle.migrations).sort()).toEqual(
      entries.map((item) => `m${String(item.idx).padStart(4, "0")}`),
    );
    for (const item of entries) {
      expect(bundle.migrations[`m${String(item.idx).padStart(4, "0")}`]).toBe(
        readFileSync(join(REAL_MIGRATIONS, `${item.tag}.sql`), "utf8"),
      );
    }
  });

  it("RF-011 RF-082: bundle.ts compiles when assigned to the parameter type of the installed expo-sqlite migrate()", () => {
    const scratch = createScratchFolder();
    const check = (
      name: string,
      expression: string,
    ): readonly ts.Diagnostic[] => {
      const file = join(scratch, name);
      writeFileSync(
        file,
        [
          'import type { migrate } from "drizzle-orm/expo-sqlite/migrator";',
          `import bundle from ${JSON.stringify(join(ROOT, "src/data/migrations/bundle"))};`,
          `const config: Parameters<typeof migrate>[1] = ${expression};`,
          "export default config;",
          "",
        ].join("\n"),
      );
      const program = ts.createProgram([file], {
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        types: [],
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
      });
      return ts.getPreEmitDiagnostics(program);
    };

    const real = check("real.ts", "bundle");
    const wrongShape = check(
      "wrong.ts",
      '{ journal: { entries: [{ idx: "0" }] }, migrations: {} }',
    );

    expect(wrongShape.length).toBeGreaterThan(0);
    expect(
      real.map((item) =>
        ts.flattenDiagnosticMessageText(item.messageText, "\n"),
      ),
    ).toEqual([]);
  });
});
