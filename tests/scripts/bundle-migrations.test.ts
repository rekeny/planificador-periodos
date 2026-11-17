/// <reference types="node" />
// Tests of scripts/bundle-migrations.mjs (T027, RF-011 and RF-082), part 1: what the bundle holds.
// Fixture projects are written to a temporary folder at run time (see bundle-migrations-fixtures).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  BUNDLE,
  MIGRATIONS,
  createProject,
  entry,
  evaluateBundle,
  journalText,
  removeFolders,
  runBundle,
  snapshot,
} from "./bundle-migrations-fixtures";

afterEach(removeFolders);

const FIRST =
  "CREATE TABLE `teams` (\n\t`id` integer PRIMARY KEY NOT NULL\n);\n";
const SECOND = "ALTER TABLE `teams` ADD `note` text;\n";
const ONE_MIGRATION = {
  [`${MIGRATIONS}/meta/_journal.json`]: journalText([entry(0, "0000_first")]),
  [`${MIGRATIONS}/0000_first.sql`]: FIRST,
};
const TWO_MIGRATIONS = {
  [`${MIGRATIONS}/meta/_journal.json`]: journalText([
    entry(0, "0000_first"),
    entry(1, "0001_second"),
  ]),
  [`${MIGRATIONS}/0000_first.sql`]: FIRST,
  [`${MIGRATIONS}/0001_second.sql`]: SECOND,
};

const NASTY_SQL = [
  ["single quotes", "INSERT INTO t VALUES ('it''s');"],
  ["double quotes", 'CREATE TABLE "t" ("a" text);'],
  ["backticks", "CREATE TABLE `t` (`a` text);"],
  ["a dollar and a brace", "SELECT '${not_a_template}' AS `${x}`;"],
  ["backslashes", "SELECT 'C:\\new\\table', '\\u0041', '\\\\';"],
  ["a statement breakpoint", "A;\n--> statement-breakpoint\nB;"],
  ["accents and emoji", "SELECT 'Ñandú, camión 🏀';"],
  ["windows line ends and no final newline", "A;\r\nB;"],
  ["an end of comment and a script tag", "/* x */ SELECT '</script>';"],
] as const;

function bundleOf(root: string) {
  return evaluateBundle(readFileSync(join(root, BUNDLE), "utf8"));
}

describe("bundle-migrations script, the bundle", () => {
  it("RF-011 RF-082: a journal with one entry gives a bundle with that entry and its SQL", () => {
    const root = createProject(ONE_MIGRATION);

    const result = runBundle(root);

    expect(result.status).toBe(0);
    const bundle = bundleOf(root);
    expect(bundle.journal.entries).toEqual([entry(0, "0000_first")]);
    expect(bundle.migrations).toEqual({ m0000: FIRST });
  });

  it("RF-011 RF-082: two entries give the keys m0000 and m0001 that the migrator reads, in journal order", () => {
    const root = createProject(TWO_MIGRATIONS);

    expect(runBundle(root).status).toBe(0);

    const bundle = bundleOf(root);
    expect(bundle.journal.entries.map((item) => item.tag)).toEqual([
      "0000_first",
      "0001_second",
    ]);
    expect(bundle.migrations).toEqual({ m0000: FIRST, m0001: SECOND });
  });

  it.each(NASTY_SQL)(
    "RF-011 RF-082: a migration with %s is bundled unchanged",
    (_name, sql) => {
      const root = createProject({
        ...ONE_MIGRATION,
        [`${MIGRATIONS}/0000_first.sql`]: sql,
      });

      expect(runBundle(root).status).toBe(0);

      expect(bundleOf(root).migrations.m0000).toBe(sql);
    },
  );

  it("RF-011 RF-082: the journal fields of the migrator are kept as they are in the file", () => {
    const root = createProject({
      ...ONE_MIGRATION,
      [`${MIGRATIONS}/meta/_journal.json`]: journalText([
        { ...entry(0, "0000_first"), breakpoints: false, when: 1 },
      ]),
    });

    expect(runBundle(root).status).toBe(0);

    expect(bundleOf(root).journal.entries).toEqual([
      { ...entry(0, "0000_first"), breakpoints: false, when: 1 },
    ]);
  });

  it("RF-011 RF-082: an old bundle.ts is replaced, whatever it held", () => {
    const root = createProject({
      ...ONE_MIGRATION,
      [BUNDLE]:
        "export default { journal: { entries: [] }, migrations: {} };\n",
    });

    expect(runBundle(root).status).toBe(0);

    expect(bundleOf(root).migrations).toEqual({ m0000: FIRST });
  });

  it("RF-011 RF-082: only bundle.ts is written, and the SQL and the journal stay as they were", () => {
    const root = createProject(TWO_MIGRATIONS);
    const before = snapshot(join(root, MIGRATIONS));

    expect(runBundle(root).status).toBe(0);

    const after = snapshot(join(root, MIGRATIONS));
    expect(Object.keys(after).sort()).toEqual(
      [...Object.keys(before), "bundle.ts"].sort(),
    );
    for (const [name, content] of Object.entries(before)) {
      expect(after[name]).toBe(content);
    }
  });

  it("RF-011 RF-082: running it twice with no change leaves every file as it was", () => {
    const root = createProject(TWO_MIGRATIONS);
    expect(runBundle(root).status).toBe(0);
    const first = snapshot(join(root, MIGRATIONS));

    expect(runBundle(root).status).toBe(0);

    expect(snapshot(join(root, MIGRATIONS))).toEqual(first);
  });

  it("RF-011 RF-082: editing a .sql file and running it again changes the bundle", () => {
    const root = createProject(TWO_MIGRATIONS);
    expect(runBundle(root).status).toBe(0);
    const before = readFileSync(join(root, BUNDLE), "utf8");

    writeFileSync(
      join(root, MIGRATIONS, "0001_second.sql"),
      `${SECOND}-- edited\n`,
    );
    expect(runBundle(root).status).toBe(0);

    expect(readFileSync(join(root, BUNDLE), "utf8")).not.toBe(before);
    expect(bundleOf(root).migrations.m0001).toBe(`${SECOND}-- edited\n`);
  });
});
