/// <reference types="node" />
// Tests of scripts/check-focused-tests.sh (T085), part 3: how scripts/verify.sh uses it. The whole
// of verify.sh is never run: the step "Focused or skipped tests" is cut out of its text and run in
// a temporary repository, after the header of verify.sh (its `set` options and its helpers).
// No RF or E IDs here.
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  VERIFY,
  createFolder,
  installScript,
  removeFolders,
  summarise,
} from "./focused-tests-fixtures";

afterEach(removeFolders);

const VERIFY_TEXT = readFileSync(VERIFY, "utf8");
const STEP_START = VERIFY_TEXT.indexOf('step "Focused or skipped tests"');
const STEP_END = VERIFY_TEXT.indexOf('step "', STEP_START + 1);
const HEADER = VERIFY_TEXT.slice(
  0,
  VERIFY_TEXT.indexOf("require_tool gitleaks"),
);
const STEP = VERIFY_TEXT.slice(STEP_START, STEP_END);
const END_MARK = "REACHED_END_OF_THE_STEP";

type ScriptState = "executable" | "not executable" | "missing";

/** Runs the focused-tests step of verify.sh in a temporary repository with `files`. */
function runStep(files: Record<string, string>, state: ScriptState) {
  const root = createFolder({
    "src/.keep": "",
    "tests/.keep": "",
    ...files,
    "scripts/verify.sh": `${HEADER}\n${STEP}\necho ${END_MARK}\n`,
  });
  if (state !== "missing") installScript(root);
  const installed = join(root, "scripts/check-focused-tests.sh");
  if (state === "not executable" && existsSync(installed)) {
    chmodSync(installed, 0o644);
  }
  return summarise(
    spawnSync("bash", ["scripts/verify.sh"], { cwd: root, encoding: "utf8" }),
  );
}

describe("verify.sh and the focused-tests check", () => {
  describe("happy path", () => {
    it("T085: verify.sh calls scripts/check-focused-tests.sh", () => {
      expect(VERIFY_TEXT).toContain("scripts/check-focused-tests.sh");
    });

    it("T085: the step Focused or skipped tests can be found in verify.sh", () => {
      expect(STEP_START).toBeGreaterThan(-1);
      expect(STEP).toContain("scripts/check-focused-tests.sh");
    });
  });

  describe("outside the rules", () => {
    it("T085: verify.sh no longer holds the old regex inline", () => {
      expect(VERIFY_TEXT).not.toContain("fit|ftest|fdescribe");
      expect(VERIFY_TEXT).not.toContain("(only|skip)");
    });
  });

  describe("sequences", () => {
    it("T085: the step passes on tests without focused calls, with a title that says fit", () => {
      const result = runStep(
        { "src/a.test.ts": 'it("6 periods fit across", () => {});\n' },
        "executable",
      );

      expect(result.status).toBe(0);
      expect(result.output).toContain(END_MARK);
    });

    it("T085: the step fails on a focused test and prints the file and the line", () => {
      const result = runStep(
        { "tests/b.test.ts": 'it("x", () => {});\nit.only("y", () => {});\n' },
        "executable",
      );

      expect(result.status).not.toBe(0);
      expect(result.output).toContain("b.test.ts:2:");
      expect(result.output).not.toContain(END_MARK);
    });
  });

  describe("interruptions", () => {
    it.each(["missing", "not executable"] as const)(
      "T085: the step fails loudly when the script is %s",
      (state) => {
        const result = runStep(
          { "src/a.test.ts": 'it("x", () => {});\n' },
          state,
        );

        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain("check-focused-tests.sh");
        expect(result.output).not.toContain(END_MARK);
      },
    );
  });
});
