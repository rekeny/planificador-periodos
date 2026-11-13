/// <reference types="node" />
// Tests of scripts/check-focused-tests.sh (T085), part 1: which lines and which files the script
// reports. The fixtures are quoted strings written to a temporary folder at run time, so pattern 1
// never flags this file; the lines of pattern 2 are built with `dotted`. No RF or E IDs here.
import {
  createFolder,
  dotted,
  removeFolders,
  runCheck,
} from "./focused-tests-fixtures";

afterEach(removeFolders);

/** Runs the script on a folder with one test file whose only line is `line`. */
function checkLine(line: string, file = "a.test.ts") {
  return runCheck([createFolder({ [file]: `${line}\n` })]);
}

const FOCUSED_CALLS = [
  'it.only("x", () => {});',
  'describe.skip("x", () => {});',
  'fit("x", () => {});',
  'xit("x", () => {});',
  'test.concurrent.only("x", () => {});',
];

const BOUNDARY_CALLS = [
  'it.only.each(TABLE)("x", () => {});',
  'it.skip.each(TABLE)("x", () => {});',
  'fit.each(TABLE)("x", () => {});',
  'fdescribe("x", () => {});',
  'it.only<Row>("x", () => {});',
  'it.only.each`a | b`("x", () => {});',
  'xtest("x", () => {});',
  'xdescribe("x", () => {});',
  'ftest("x", () => {});',
  'test.only("x", () => {});',
  'test.skip("x", () => {});',
  'describe.only("x", () => {});',
  'it.only ("x", () => {});',
  '    it.only("x", () => {});',
  '\t\tdescribe.skip("x", () => {});',
];

const VALUE_LINES = [
  `const d = process.env.CI ? describe : ${dotted("describe", "skip")};`,
  `const d = process.env.CI ? ${dotted("describe", "only")} : describe;`,
  `const run = ${dotted("it", "only")};`,
  `register(${dotted("it", "skip")});`,
  `const all = [a, ${dotted("test", "skip")}];`,
];

const HARMLESS_LINES = [
  'it("6 periods fit across", () => {});',
  'it("4 and 6 periods fit at 375 pt", () => {});',
  '// it.only("x", () => {});',
  ' * describe.skip("x") is how a skipped group is written',
  "const fit = 3;",
  "const xit = fit + 1;",
  'it.each(CASES)("title", () => {});',
  'describe.each(CASES)("title", () => {});',
  "const table = it.each(CASES);",
  'const text = "it.only(x)";',
  'const label = "describe.skip is not used";',
  'fitness("x", () => {});',
  'xitem("x");',
  'it.skipped("x", () => {});',
  'it.onlyOne("x", () => {});',
  "const a = it.skipped;",
];

describe("check-focused-tests script, what it reports", () => {
  describe("happy path", () => {
    it.each(FOCUSED_CALLS)(
      "T085: a call at the start of a line makes the script exit 1: %s",
      (line) => {
        expect(checkLine(line).status).toBe(1);
      },
    );

    it("T085: a folder without focused or skipped tests exits 0", () => {
      const folder = createFolder({
        "a.test.ts": 'it("x", () => {});\ndescribe("y", () => {});\n',
      });

      const result = runCheck([folder]);

      expect(result.status).toBe(0);
    });
  });

  describe("boundaries", () => {
    it.each(BOUNDARY_CALLS)(
      "T085: the call %j is found and the script exits 1",
      (line) => {
        expect(checkLine(line).status).toBe(1);
      },
    );

    it.each(VALUE_LINES)(
      "T085: a skipped or focused function used as a value is found: %s",
      (line) => {
        expect(checkLine(line).status).toBe(1);
      },
    );
  });

  describe("outside the rules", () => {
    it.each(HARMLESS_LINES)(
      "T085: the line %j is not found and the script exits 0",
      (line) => {
        const result = checkLine(line);

        expect(result.status).toBe(0);
        expect(result.output.trim()).toBe("");
      },
    );
  });

  describe("odd data", () => {
    it("T085: an empty folder exits 0", () => {
      expect(runCheck([createFolder()]).status).toBe(0);
    });

    it("T085: a folder with no test files exits 0", () => {
      const folder = createFolder({
        "notes.md": "text\n",
        "helper.ts": 'it.only("x", () => {});\n',
      });

      expect(runCheck([folder]).status).toBe(0);
    });

    it.each([
      ["a.test.ts", 1],
      ["a.test.tsx", 1],
      ["deep/er/a.test.ts", 1],
      ["deep/er/a.test.tsx", 1],
      ["a.test.js", 0],
      ["a.ts", 0],
      ["a.tsx", 0],
      ["a.spec.ts", 0],
      ["notes.md", 0],
    ])(
      "T085: a focused call in %s gives exit %i",
      (file: string, expected: number) => {
        const result = checkLine('it.only("x", () => {});', file);

        expect(result.status).toBe(expected);
      },
    );

    it("T085: a folder name with spaces in the searched path is searched", () => {
      const folder = createFolder({
        "my tests/sub dir/a.test.ts": 'it.only("x", () => {});\n',
      });

      const result = runCheck([`${folder}/my tests`]);

      expect(result.status).toBe(1);
      expect(result.output).toContain("my tests/sub dir/a.test.ts:1:");
    });

    it("T085: a clean folder with spaces in its name exits 0", () => {
      const folder = createFolder({
        "my tests/a b.test.ts": 'it("x", () => {});\n',
      });

      expect(runCheck([`${folder}/my tests`]).status).toBe(0);
    });
  });

  describe("sequences", () => {
    it("T085: the script run twice gives the same result", () => {
      const folder = createFolder({
        "a.test.ts": 'it("x", () => {});\nfit("y", () => {});\n',
      });

      const first = runCheck([folder]);
      const second = runCheck([folder]);

      expect(first.status).toBe(1);
      expect(second).toEqual(first);
    });
  });
});
