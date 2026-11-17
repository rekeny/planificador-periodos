/// <reference types="node" />
// Tests of scripts/bundle-migrations.mjs (T027, RF-011 and RF-082), part 2: what happens when the
// migration folder is not as drizzle-kit leaves it. The script must exit non-zero with a message
// that names the problem and must never touch the bundle.ts it finds. Fixtures are written to a
// temporary folder at run time.
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  BUNDLE,
  MIGRATIONS,
  createProject,
  entry,
  journalText,
  removeFolders,
  runBundle,
  snapshot,
} from "./bundle-migrations-fixtures";

afterEach(removeFolders);

const PREVIOUS =
  "export default { journal: { entries: [] }, migrations: {} }; // previous\n";
const JOURNAL = `${MIGRATIONS}/meta/_journal.json`;
const TWO_ENTRIES = journalText([
  entry(0, "0000_first"),
  entry(1, "0001_second"),
]);

interface Broken {
  files: Record<string, string>;
  breakIt?: (root: string) => void;
  message: RegExp;
}

const BROKEN: Record<string, Broken> = {
  "a missing meta/_journal.json": {
    files: { [`${MIGRATIONS}/0000_first.sql`]: "A;\n" },
    message: /journal/i,
  },
  "a journal that is not valid JSON": {
    files: {
      [JOURNAL]: "{ not json",
      [`${MIGRATIONS}/0000_first.sql`]: "A;\n",
    },
    message: /journal/i,
  },
  "a journal entry without its .sql file": {
    files: { [JOURNAL]: TWO_ENTRIES, [`${MIGRATIONS}/0000_first.sql`]: "A;\n" },
    message: /0001_second/,
  },
  "a .sql file that cannot be read": {
    files: { [JOURNAL]: TWO_ENTRIES, [`${MIGRATIONS}/0000_first.sql`]: "A;\n" },
    breakIt: (root) => mkdirSync(join(root, MIGRATIONS, "0001_second.sql")),
    message: /0001_second/,
  },
  "a missing migrations folder": {
    files: { [JOURNAL]: TWO_ENTRIES },
    breakIt: (root) => rmSync(join(root, MIGRATIONS), { recursive: true }),
    message: /src[\\/]data[\\/]migrations/,
  },
};

const CASES = Object.keys(BROKEN);

function prepare(name: string, withPreviousBundle: boolean): string {
  const broken = BROKEN[name] as Broken;
  const root = createProject({
    ...broken.files,
    ...(withPreviousBundle ? { [BUNDLE]: PREVIOUS } : {}),
  });
  broken.breakIt?.(root);
  return root;
}

describe("bundle-migrations script, broken input", () => {
  it.each(CASES)(
    "RF-011 RF-082: with %s it exits non-zero with a message and leaves the previous bundle.ts untouched",
    (name) => {
      const root = prepare(name, true);
      const before = existsSync(join(root, MIGRATIONS))
        ? snapshot(join(root, MIGRATIONS))
        : {};

      const result = runBundle(root);

      expect(result.status).not.toBe(0);
      expect(result.status).not.toBeNull();
      expect(result.output).toMatch((BROKEN[name] as Broken).message);
      if (existsSync(join(root, BUNDLE))) {
        expect(readFileSync(join(root, BUNDLE), "utf8")).toBe(PREVIOUS);
      }
      if (existsSync(join(root, MIGRATIONS))) {
        expect(snapshot(join(root, MIGRATIONS))).toEqual(before);
      }
    },
  );

  it.each(CASES)(
    "RF-011 RF-082: with %s and no earlier bundle it exits non-zero and writes no bundle.ts, not even a half-written one",
    (name) => {
      const root = prepare(name, false);

      const result = runBundle(root);

      expect(result.status).not.toBe(0);
      expect(result.output).toMatch((BROKEN[name] as Broken).message);
      expect(existsSync(join(root, BUNDLE))).toBe(false);
    },
  );

  it("RF-011 RF-082: a good first migration followed by a bad second one still writes nothing", () => {
    const root = prepare("a journal entry without its .sql file", false);

    const result = runBundle(root);

    expect(result.status).not.toBe(0);
    expect(result.output).toMatch(/0001_second/);
    expect(snapshot(join(root, MIGRATIONS))).toEqual({
      "0000_first.sql": "A;\n",
      "meta/_journal.json": TWO_ENTRIES,
    });
  });
});
