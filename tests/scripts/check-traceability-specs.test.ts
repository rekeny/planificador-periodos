/// <reference types="node" />
// Tests of scripts/check-traceability.mjs (T001), part 2: duplicate IDs across specs, retired IDs
// and closed or in-progress specs. The test names below have no IDs and the fixtures are built at
// run time (see traceability-fixtures.ts).
import {
  createFixture,
  removeFixtures,
  runScript,
  spec,
  tasks,
  testFile,
} from "./traceability-fixtures";

afterEach(removeFixtures);

describe("check-traceability script", () => {
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
});
