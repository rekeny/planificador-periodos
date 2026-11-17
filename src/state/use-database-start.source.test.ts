/// <reference types="node" />
// T087: what the source of the start-up hook and of the layout may and may not do (RF-085, RF-011),
// read as text, like src/data/database.source.test.ts. Behaviour is in use-database-start.test.ts
// and tests/app/layout.retry.test.tsx.
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

describe("start-up source", () => {
  it("RF-085: the hook lives in the state layer and imports only react and database-ready, never react-native or expo", () => {
    const file = "src/state/use-database-start.ts";
    expect(existsSync(join(ROOT, file))).toBe(true);
    importsOf(file).forEach((name) =>
      expect(name).toMatch(/^(react|(\.\/|@\/state\/)database-ready)$/),
    );
    expect(importsOf(file)).toContain("react");
  });

  it("RF-085: the layout gets the start-up from useDatabaseStart and no longer calls initializeDatabase itself", () => {
    const layout = read("src/app/_layout.tsx");
    expect(importsOf("src/app/_layout.tsx").join(" ")).toMatch(
      /use-database-start/,
    );
    expect(layout).toMatch(/useDatabaseStart\(/);
    expect(layout).not.toMatch(/initializeDatabase/);
    expect(layout).toMatch(/DatabaseOpenFailed/);
  });

  it("RF-085: DatabaseOpenFailed is a named export of src/ui/database-open-failed.tsx and reads its texts from es.json keys, not from the code", () => {
    const file = "src/ui/database-open-failed.tsx";
    expect(existsSync(join(ROOT, file))).toBe(true);
    const source = read(file);
    expect(source).toMatch(/export function DatabaseOpenFailed/);
    expect(source).toMatch(/t\(\s*["']db\.openFailed["']\s*\)/);
    expect(source).toMatch(/t\(\s*["']db\.retry["']\s*\)/);
    expect(source).not.toMatch(/Reintentar|No se han podido abrir/);
  });

  it("RF-085: nothing under src/ deletes or resets the database: no deleteDatabaseSync, no deleteDatabaseAsync and no new database name", () => {
    const all = productionFiles("src").map((file) => [file, read(file)]);
    all.forEach(([file, source]) => {
      expect([file, /deleteDatabase(Sync|Async)/.test(source ?? "")]).toEqual([
        file,
        false,
      ]);
    });
    const opens = all.filter(([, source]) =>
      /openDatabaseSync\(/.test(source ?? ""),
    );
    expect(opens.map(([file]) => file)).toEqual(["src/data/database.ts"]);
  });

  it("RF-085: nothing under src/ writes to the console, so the error cannot reach a log", () => {
    productionFiles("src").forEach((file) =>
      expect([file, /\bconsole\./.test(read(file))]).toEqual([file, false]),
    );
  });
});
