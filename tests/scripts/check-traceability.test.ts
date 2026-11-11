/// <reference types="node" />
// Tests of scripts/check-traceability.mjs (T001).
//
// The script reads every test name under tests/, so nothing in this file may look like a real test
// that carries an ID: the fixtures are written to a temporary folder at run time, the test names
// below have no IDs, and the fixture test files are built with the IT placeholder so that this
// source never contains a literal call of the kind the script looks for.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const SCRIPT = resolve(__dirname, "../../scripts/check-traceability.mjs");
const IT = "it";

type Files = Record<string, string>;

const createdFolders: string[] = [];

function createFixture(files: Files): string {
  const root = mkdtempSync(join(tmpdir(), "traceability-fixture-"));
  createdFolders.push(root);
  for (const [relativePath, content] of Object.entries(files)) {
    const path = join(root, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  return root;
}

function runScript(root: string) {
  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd: root,
    encoding: "utf8",
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    output: `${result.stdout}\n${result.stderr}`,
  };
}

function spec(options: {
  status: "In progress" | "Closed";
  requirements?: string[];
  examples?: string[];
  extraLines?: string[];
}): string {
  const requirements = (options.requirements ?? []).map(
    (id) => `- **${id}** · Something the app does.`,
  );
  const examples = (options.examples ?? []).map(
    (id) => `| ${id} | Some situation. | Some result. | RF-000 |`,
  );
  return [
    "# Spec",
    "",
    `- **Status:** ${options.status}`,
    "",
    ...requirements,
    "",
    "| ID | Situation | Result | Covers |",
    "| -- | --------- | ------ | ------ |",
    ...examples,
    ...(options.extraLines ?? []),
    "",
  ].join("\n");
}

function tasks(...lines: string[]): string {
  return ["# Tasks", "", ...lines, ""].join("\n");
}

function testFile(...names: string[]): string {
  return names
    .map((name) => `${IT}("${name}", () => {\n  expect(1).toBe(1);\n});`)
    .join("\n");
}

afterEach(() => {
  for (const folder of createdFolders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

describe("check-traceability script", () => {
  describe("happy path", () => {
    it("passes when every ID of a ticked task appears in a test name", () => {
      const root = createFixture({
        "specs/001-alpha/spec.md": spec({
          status: "In progress",
          requirements: ["RF-001"],
          examples: ["E-001"],
        }),
        "specs/001-alpha/tasks.md": tasks(
          "- [x] **T001** · Do it (RF-001, E-001)",
        ),
        "tests/a.test.ts": testFile("RF-001 E-001: does the thing"),
      });

      const result = runScript(root);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Traceability OK");
    });

    it("fails and names the IDs of a ticked task that have no test", () => {
      const root = createFixture({
        "specs/001-alpha/spec.md": spec({
          status: "In progress",
          requirements: ["RF-001"],
          examples: ["E-001"],
        }),
        "specs/001-alpha/tasks.md": tasks(
          "- [x] **T001** · Do it (RF-001, E-001)",
        ),
        "tests/a.test.ts": testFile("RF-001: only the requirement"),
      });

      const result = runScript(root);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("001-alpha");
      expect(result.stderr).toContain("E-001");
      expect(result.stderr).not.toContain("RF-001");
    });
  });

  describe("boundaries of the ID format", () => {
    it("recognises E-001 and E-032 as example IDs", () => {
      const root = createFixture({
        "specs/001-alpha/spec.md": spec({ status: "In progress" }),
        "specs/001-alpha/tasks.md": tasks(
          "- [x] **T001** · First (E-001)",
          "- [x] **T002** · Last (E-032)",
        ),
        "tests/a.test.ts": testFile("E-001: first one"),
      });

      const result = runScript(root);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("E-032");
      expect(result.stderr).not.toContain("E-001");
    });

    it("passes when E-001 and E-032 both have a test name", () => {
      const root = createFixture({
        "specs/001-alpha/spec.md": spec({ status: "In progress" }),
        "specs/001-alpha/tasks.md": tasks(
          "- [x] **T001** · First (E-001)",
          "- [x] **T002** · Last (E-032)",
        ),
        "tests/a.test.ts": testFile("E-001 E-032: both examples"),
      });

      expect(runScript(root).status).toBe(0);
    });

    it("does not recognise two-digit example IDs in a ticked task", () => {
      const root = createFixture({
        "specs/001-alpha/spec.md": spec({ status: "In progress" }),
        "specs/001-alpha/tasks.md": tasks("- [x] **T001** · Old style (E-01)"),
        "tests/a.test.ts": testFile("no IDs here"),
      });

      const result = runScript(root);

      expect(result.status).toBe(0);
    });

    it("does not recognise four-digit example IDs in a ticked task", () => {
      const root = createFixture({
        "specs/001-alpha/spec.md": spec({ status: "In progress" }),
        "specs/001-alpha/tasks.md": tasks("- [x] **T001** · Too long (E-0001)"),
        "tests/a.test.ts": testFile("no IDs here"),
      });

      const result = runScript(root);

      expect(result.status).toBe(0);
    });

    it("does not define two-digit or four-digit examples in a closed spec", () => {
      const root = createFixture({
        "specs/001-alpha/spec.md": spec({
          status: "Closed",
          examples: ["E-01", "E-0001"],
        }),
        "specs/001-alpha/tasks.md": tasks("- [x] **T001** · Done"),
        "tests/a.test.ts": testFile("no IDs here"),
      });

      const result = runScript(root);

      expect(result.status).toBe(0);
    });

    it("does not count a two-digit ID in a test name as the three-digit one", () => {
      const root = createFixture({
        "specs/001-alpha/spec.md": spec({ status: "In progress" }),
        "specs/001-alpha/tasks.md": tasks("- [x] **T001** · Thing (E-001)"),
        "tests/a.test.ts": testFile("E-01: old style name"),
      });

      const result = runScript(root);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("E-001");
    });

    it("recognises RF-088 at the end of a line", () => {
      const root = createFixture({
        "specs/001-alpha/spec.md": spec({ status: "In progress" }),
        "specs/001-alpha/tasks.md": tasks("- [x] **T001** · Backups RF-088"),
        "tests/a.test.ts": testFile("nothing relevant"),
      });

      const result = runScript(root);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("RF-088");
    });

    it("counts RF-088 at the end of a test name", () => {
      const root = createFixture({
        "specs/001-alpha/spec.md": spec({ status: "In progress" }),
        "specs/001-alpha/tasks.md": tasks("- [x] **T001** · Backups RF-088"),
        "tests/a.test.ts": testFile("keeps the data out of backups RF-088"),
      });

      expect(runScript(root).status).toBe(0);
    });
  });

  describe("outside the rules: duplicate IDs", () => {
    it("fails when the same requirement is defined in two specs and names both folders", () => {
      const root = createFixture({
        "specs/001-alpha/spec.md": spec({
          status: "In progress",
          requirements: ["RF-001"],
        }),
        "specs/002-beta/spec.md": spec({
          status: "In progress",
          requirements: ["RF-001"],
        }),
        "tests/a.test.ts": testFile("RF-001: tested anyway"),
      });

      const result = runScript(root);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("RF-001");
      expect(result.stderr).toContain("001-alpha");
      expect(result.stderr).toContain("002-beta");
      expect(result.stdout).not.toContain("Traceability OK");
    });

    it("fails when the same example is defined in two specs and names both folders", () => {
      const root = createFixture({
        "specs/001-alpha/spec.md": spec({
          status: "In progress",
          examples: ["E-005"],
        }),
        "specs/002-beta/spec.md": spec({
          status: "Closed",
          examples: ["E-005"],
        }),
        "tests/a.test.ts": testFile("E-005: tested anyway"),
      });

      const result = runScript(root);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("E-005");
      expect(result.stderr).toContain("001-alpha");
      expect(result.stderr).toContain("002-beta");
    });

    it("passes when different specs define different IDs", () => {
      const root = createFixture({
        "specs/001-alpha/spec.md": spec({
          status: "Closed",
          requirements: ["RF-001"],
          examples: ["E-001"],
        }),
        "specs/002-beta/spec.md": spec({
          status: "Closed",
          requirements: ["RF-002"],
          examples: ["E-002"],
        }),
        "tests/a.test.ts": testFile("RF-001 E-001 RF-002 E-002: all of them"),
      });

      expect(runScript(root).status).toBe(0);
    });
  });

  describe("odd data", () => {
    it("skips a spec folder without a spec file", () => {
      const root = createFixture({
        "specs/000-bootstrap/tasks.md": tasks("- [x] **T001** · Setup"),
        "specs/001-alpha/spec.md": spec({
          status: "In progress",
          requirements: ["RF-001"],
        }),
        "specs/001-alpha/tasks.md": tasks("- [x] **T001** · Do it (RF-001)"),
        "tests/a.test.ts": testFile("RF-001: does the thing"),
      });

      const result = runScript(root);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Traceability OK");
    });

    it("fails when a retired ID is reused in another spec", () => {
      const root = createFixture({
        "specs/001-alpha/spec.md": spec({
          status: "In progress",
          extraLines: ["- **RF-005** · Retired. It no longer applies."],
        }),
        "specs/002-beta/spec.md": spec({
          status: "In progress",
          requirements: ["RF-005"],
        }),
        "tests/a.test.ts": testFile("RF-005: reused"),
      });

      const result = runScript(root);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("RF-005");
      expect(result.stderr).toContain("001-alpha");
      expect(result.stderr).toContain("002-beta");
    });

    it("fails when a retired example is reused in another spec", () => {
      const root = createFixture({
        "specs/001-alpha/spec.md": spec({
          status: "In progress",
          extraLines: ["| E-004 | Retired example. | Nothing. | RF-000 |"],
        }),
        "specs/002-beta/spec.md": spec({
          status: "In progress",
          examples: ["E-004"],
        }),
        "tests/a.test.ts": testFile("E-004: reused"),
      });

      const result = runScript(root);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("E-004");
      expect(result.stderr).toContain("001-alpha");
      expect(result.stderr).toContain("002-beta");
    });

    it("does not require a test for a retired ID in a closed spec", () => {
      const root = createFixture({
        "specs/001-alpha/spec.md": spec({
          status: "Closed",
          requirements: ["RF-001"],
          extraLines: ["- **RF-005** · Retired. It no longer applies."],
        }),
        "specs/001-alpha/tasks.md": tasks("- [x] **T001** · Done"),
        "tests/a.test.ts": testFile("RF-001: the live requirement"),
      });

      expect(runScript(root).status).toBe(0);
    });
  });

  describe("sequences: closed and in progress specs", () => {
    it("requires every defined ID of a closed spec", () => {
      const root = createFixture({
        "specs/001-alpha/spec.md": spec({
          status: "Closed",
          requirements: ["RF-001", "RF-002"],
          examples: ["E-001"],
        }),
        "specs/001-alpha/tasks.md": tasks("- [x] **T001** · Done (RF-001)"),
        "tests/a.test.ts": testFile("RF-001: only one of them"),
      });

      const result = runScript(root);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("RF-002");
      expect(result.stderr).toContain("E-001");
    });

    it("requires only the IDs of ticked tasks in a spec in progress", () => {
      const root = createFixture({
        "specs/001-alpha/spec.md": spec({
          status: "In progress",
          requirements: ["RF-001", "RF-002"],
          examples: ["E-001"],
        }),
        "specs/001-alpha/tasks.md": tasks(
          "- [x] **T001** · Done (RF-001)",
          "- [ ] **T002** · Pending (RF-002, E-001)",
        ),
        "tests/a.test.ts": testFile("RF-001: only the ticked one"),
      });

      const result = runScript(root);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Traceability OK");
    });

    it("requires nothing from a spec in progress with no ticked task", () => {
      const root = createFixture({
        "specs/001-alpha/spec.md": spec({
          status: "In progress",
          requirements: ["RF-001"],
          examples: ["E-001"],
        }),
        "specs/001-alpha/tasks.md": tasks("- [ ] **T001** · Pending (RF-001)"),
      });

      expect(runScript(root).status).toBe(0);
    });
  });

  describe("mistakes: what does not count as a test", () => {
    it("does not count an ID that only appears in a comment", () => {
      const root = createFixture({
        "specs/001-alpha/spec.md": spec({ status: "In progress" }),
        "specs/001-alpha/tasks.md": tasks("- [x] **T001** · Do it (RF-001)"),
        "tests/a.test.ts": [
          "// RF-001 is covered here",
          "/* RF-001 also here */",
          testFile("a test without IDs"),
        ].join("\n"),
      });

      const result = runScript(root);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("RF-001");
    });

    it("does not count an ID that only appears in a describe block", () => {
      const root = createFixture({
        "specs/001-alpha/spec.md": spec({ status: "In progress" }),
        "specs/001-alpha/tasks.md": tasks("- [x] **T001** · Do it (RF-001)"),
        "tests/a.test.ts": [
          'describe("RF-001 group", () => {',
          `  ${IT}("a test without IDs", () => {});`,
          "});",
        ].join("\n"),
      });

      const result = runScript(root);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("RF-001");
    });

    it("does not count an ID in a file that is not a test file", () => {
      const root = createFixture({
        "specs/001-alpha/spec.md": spec({ status: "In progress" }),
        "specs/001-alpha/tasks.md": tasks("- [x] **T001** · Do it (RF-001)"),
        "tests/helper.ts": testFile("RF-001: in a helper"),
      });

      const result = runScript(root);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("RF-001");
    });

    it("counts a test under src, next to the code", () => {
      const root = createFixture({
        "specs/001-alpha/spec.md": spec({ status: "In progress" }),
        "specs/001-alpha/tasks.md": tasks("- [x] **T001** · Do it (RF-001)"),
        "src/domain/rule.test.ts": testFile("RF-001: next to the code"),
      });

      expect(runScript(root).status).toBe(0);
    });
  });
});
