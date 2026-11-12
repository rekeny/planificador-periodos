/// <reference types="node" />
// Tests of scripts/check-traceability.mjs (T001), part 1: the format of the IDs and what counts as
// a test. The script reads every test name under tests/, so nothing here may look like a real test
// that carries an ID: the test names below have no IDs and the fixtures are built at run time.
import {
  IT,
  createFixture,
  removeFixtures,
  runScript,
  spec,
  tasks,
  testFile,
} from "./traceability-fixtures";

afterEach(removeFixtures);

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
