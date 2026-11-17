/// <reference types="node" />
// Tests of scripts/check-focused-tests.sh (T085), part 2: arguments, exit codes, the working
// directory, a failing grep and the file mode. Fixtures are written to a temporary folder at run
// time. No RF or E IDs here.
import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  ROOT,
  SCRIPT,
  createFolder,
  envWithStubGrep,
  removeFolders,
  runCheck,
} from "./focused-tests-fixtures";

afterEach(removeFolders);

const FOCUSED = 'it.only("x", () => {});\n';
const CLEAN = 'it("x", () => {});\n';

describe("check-focused-tests script, arguments and exit codes", () => {
  describe("boundaries", () => {
    it("T085: the output lists the file and the line of every match and no other line", () => {
      const folder = createFolder({
        "a.test.ts": `${CLEAN}${FOCUSED}${CLEAN}fit("y", () => {});\n`,
      });

      const result = runCheck([folder]);

      expect(result.status).toBe(1);
      expect(result.output).toContain(`${folder}/a.test.ts:2:`);
      expect(result.output).toContain(`${folder}/a.test.ts:4:`);
      expect(result.output).not.toContain("a.test.ts:1:");
      expect(result.output).not.toContain("a.test.ts:3:");
    });

    it.each([
      ["the same folder twice", (folder: string) => [folder, folder]],
      [
        "a folder with a trailing slash and without it",
        (folder: string) => [`${folder}/`, folder],
      ],
    ])(
      "T085: %s is searched once and reports each match once",
      (_name, toArguments) => {
        const folder = createFolder({ "a.test.ts": FOCUSED });

        const result = runCheck(toArguments(folder));

        const reports = result.output
          .split("\n")
          .filter((line) => line.includes("a.test.ts:1:"));
        expect(result.status).toBe(1);
        expect(reports).toHaveLength(1);
      },
    );

    it("T085: a folder with a trailing slash that is clean exits 0", () => {
      const folder = createFolder({ "a.test.ts": CLEAN });

      expect(runCheck([`${folder}/`]).status).toBe(0);
    });

    it("T085: without arguments it searches src and tests of the repository and exits 0", () => {
      const elsewhere = createFolder();

      const result = runCheck([], { cwd: elsewhere });

      expect(result.status).toBe(0);
      expect(result.output.trim()).toBe("");
    });
  });

  describe("outside the rules", () => {
    it.each([
      ["a folder that does not exist", ["does-not-exist"]],
      ["an empty argument", [""]],
      ["src followed by a folder that does not exist", ["src", "nope"]],
      ["a folder that does not exist followed by src", ["nope", "src"]],
    ])("T085: %s exits 2 with a message", (_name, args: string[]) => {
      const result = runCheck(args);

      expect(result.status).toBe(2);
      expect(result.stderr.trim()).not.toBe("");
    });

    it("T085: the message names the argument that is not a folder", () => {
      const result = runCheck(["src", "nope"]);

      expect(result.status).toBe(2);
      expect(result.stderr).toContain("nope");
    });

    it("T085: a file given as an argument exits 2", () => {
      const folder = createFolder({ "a.test.ts": CLEAN });

      const result = runCheck([join(folder, "a.test.ts")]);

      expect(result.status).toBe(2);
      expect(result.stderr).toContain("a.test.ts");
    });

    it("T085: a folder that does not exist exits 2 even when another folder has a match", () => {
      const folder = createFolder({ "a.test.ts": FOCUSED });

      const result = runCheck([folder, "nope"]);

      expect(result.status).toBe(2);
    });
  });

  describe("odd data", () => {
    it("T085: run from the scripts folder it gives the same result", () => {
      const focused = createFolder({ "a.test.ts": FOCUSED });
      const clean = createFolder({ "a.test.ts": CLEAN });

      const fromRoot = runCheck([focused]);
      const fromScripts = runCheck([focused], { cwd: join(ROOT, "scripts") });

      expect(fromScripts).toEqual(fromRoot);
      expect(fromScripts.status).toBe(1);
      expect(runCheck([clean], { cwd: join(ROOT, "scripts") }).status).toBe(0);
    });

    it("T085: a relative folder is resolved from the repository root, not from the working directory", () => {
      const elsewhere = createFolder({ "src/a.test.ts": FOCUSED });

      const result = runCheck(["src"], { cwd: elsewhere });

      expect(result.status).toBe(0);
    });
  });

  describe("interruptions", () => {
    it("T085: a grep that fails makes the script exit 2 with a message, never 0", () => {
      const folder = createFolder({ "a.test.ts": CLEAN });

      const result = runCheck([folder], { env: envWithStubGrep(2) });

      expect(result.status).toBe(2);
      expect(result.stderr.trim()).not.toBe("");
    });

    it("T085: a grep that finds nothing and exits 1 makes the script exit 0", () => {
      const folder = createFolder({ "a.test.ts": FOCUSED });

      const result = runCheck([folder], { env: envWithStubGrep(1) });

      expect(result.status).toBe(0);
    });
  });

  describe("mistakes", () => {
    it("T085: the script file is executable", () => {
      const isExecutable =
        existsSync(SCRIPT) && (statSync(SCRIPT).mode & 0o111) !== 0;

      expect(isExecutable).toBe(true);
    });

    it("T085: git stores the script with mode 100755", () => {
      const listing = spawnSync(
        "git",
        ["ls-files", "-s", "--", "scripts/check-focused-tests.sh"],
        { cwd: ROOT, encoding: "utf8" },
      );

      expect(listing.stdout).toMatch(/^100755 /);
    });
  });
});
