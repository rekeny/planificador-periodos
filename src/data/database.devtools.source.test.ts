/// <reference types="node" />
// Codex fourth run, blocking finding 1 (RF-011, constitution principles 3 and 5), read as text: the
// app never wires its database to a development inspector. The only way the open call is kept out of
// the inspector is the option `useNewConnection: true` (expo-sqlite SQLiteDatabase.ts line 637), and
// the open call still passes no `directory`.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");

const productionFiles = readdirSync(join(ROOT, "src"), { recursive: true })
  .map(String)
  .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
  .map((name) => join("src", name));

const read = (file: string): string => readFileSync(join(ROOT, file), "utf8");

describe("database source, development inspector", () => {
  it("RF-011: no production file imports the dev-tools client or an inspector package", () => {
    const offenders = productionFiles.filter((file) =>
      /["'](expo\/devtools|@expo\/devtools|expo-dev-[a-z-]+|expo-sqlite\/[^"']*DevTools[^"']*)["']/.test(
        read(file),
      ),
    );
    expect(offenders).toEqual([]);
  });

  it("RF-011: no production file touches the dev-tools registration or the inspector plugin", () => {
    const offenders = productionFiles.filter((file) =>
      /(registerDatabaseForDevTools|SQLiteDevToolsClient|getDevToolsPluginClient|DevToolsPluginClient)/.test(
        read(file),
      ),
    );
    expect(offenders).toEqual([]);
  });

  it("RF-011: src/data/database.ts asks for its own connection with useNewConnection: true", () => {
    expect(read("src/data/database.ts")).toMatch(/useNewConnection\s*:\s*true/);
  });
});
