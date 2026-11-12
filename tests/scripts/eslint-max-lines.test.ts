/// <reference types="node" />
// Tests of the max-lines rule of eslint.config.js (T080): 250 counted lines per file, also under
// tests/, scripts/ and plugins/, as under src/. The code is linted as virtual files with ESLint's
// Node API, so nothing is written to the repository. Test names carry no RF or E IDs.
import { ESLint } from "eslint";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");
const LIMIT = 250;

// ESLint loads the whole project config (type resolver included) once; that is slow on a cold run.
jest.setTimeout(60_000);

let eslint: ESLint;

// Jest runs tests in a VM that forbids the dynamic import ESLint uses to load a config file, so the
// project config is required here and handed over as an object.
beforeAll(() => {
  eslint = new ESLint({
    cwd: ROOT,
    overrideConfigFile: true,
    overrideConfig: jest.requireActual<
      NonNullable<ESLint.Options["overrideConfig"]>
    >("../../eslint.config.js"),
  });
});

/** The rule IDs reported for `code` linted as if it were the file `relativePath`. */
async function reportedRules(
  code: string,
  relativePath: string,
): Promise<string[]> {
  const [result] = await eslint.lintText(code, {
    filePath: resolve(ROOT, relativePath),
  });
  return (result?.messages ?? []).map((message) => message.ruleId ?? "");
}

/** `count` lines of code, one statement each, so that every one of them is counted. */
function countedLines(count: number): string {
  return Array.from({ length: count }, (_, i) => `const v${i} = ${i};`).join(
    "\n",
  );
}

const TOOLING_AND_TEST_FILES = [
  "tests/virtual-file.ts",
  "tests/virtual-file.tsx",
  "tests/support/virtual-file.ts",
  "scripts/virtual-file.mjs",
  "plugins/virtual-file.js",
];

describe("max-lines under tests/, scripts/ and plugins/", () => {
  it.each(TOOLING_AND_TEST_FILES)(
    "T080: %s with 250 counted lines is not flagged",
    async (path) => {
      expect(await reportedRules(countedLines(LIMIT), path)).not.toContain(
        "max-lines",
      );
    },
  );

  it.each(TOOLING_AND_TEST_FILES)(
    "T080: %s with 251 counted lines is flagged",
    async (path) => {
      expect(await reportedRules(countedLines(LIMIT + 1), path)).toContain(
        "max-lines",
      );
    },
  );

  it.each(TOOLING_AND_TEST_FILES)(
    "T080: blank lines and comments do not count in %s",
    async (path) => {
      const padding = [
        "",
        "// a whole-line comment",
        "/* a block",
        "   comment */",
        "",
      ].join("\n");
      const code = [padding, countedLines(LIMIT), padding, padding].join("\n");
      expect(await reportedRules(code, path)).not.toContain("max-lines");
    },
  );
});

describe("max-lines under src/ and max-lines-per-function in tests", () => {
  it("T080: a src/ file with 251 counted lines is still flagged, and one with 250 is not", async () => {
    expect(
      await reportedRules(countedLines(LIMIT + 1), "src/domain/virtual.ts"),
    ).toContain("max-lines");
    expect(
      await reportedRules(countedLines(LIMIT), "src/domain/virtual.ts"),
    ).not.toContain("max-lines");
  });

  it("T080: max-lines-per-function stays off for test files and on for src/", async () => {
    const body = countedLines(80);
    const code = `export const longFunction = (): void => {\n${body}\n};\n`;
    expect(await reportedRules(code, "tests/virtual-file.ts")).not.toContain(
      "max-lines-per-function",
    );
    expect(await reportedRules(code, "src/domain/virtual.ts")).toContain(
      "max-lines-per-function",
    );
  });
});
