/// <reference types="node" />
// Tests of how scripts/check-npm-audit.mjs reads osv-scanner.toml (tooling, no RF or E IDs): a block
// ends at the next table header, and every [[IgnoredVulns]] entry is checked, even one that npm
// audit does not need, because `osv-scanner scan source` in verify.sh honours any effectiveUntil.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  auditJson,
  finding,
  inDays,
  removeFolders,
  runCheck,
} from "./check-npm-audit-fixtures";

afterEach(removeFolders);

const ID_A = "GHSA-aaaa-bbbb-cccc";
const ID_B = "GHSA-dddd-eeee-ffff";
const HIGH_A = auditJson(finding("picomatch", ID_A, "high"));
const NO_AUDIT = auditJson();

function entry(id: string, ...lines: string[]): string {
  return ["[[IgnoredVulns]]", `id = "${id}"`, ...lines, ""].join("\n");
}

describe("check-npm-audit script, where an entry ends", () => {
  it("does not read the effectiveUntil of the next table for an entry that has none", () => {
    const toml = `${entry(ID_A, 'reason = "x"')}\n[[PackageOverrides]]\nname = "qs"\neffectiveUntil = ${inDays(30)}\n`;

    const result = runCheck(HIGH_A, toml);

    expect(result.status).toBe(1);
    expect(result.output).toContain(ID_A);
  });

  it("does not read the effectiveUntil of the next [[IgnoredVulns]] entry either", () => {
    const toml = `${entry(ID_A)}\n${entry(ID_B, `effectiveUntil = ${inDays(30)}`)}`;

    const result = runCheck(HIGH_A, toml);

    expect(result.status).toBe(1);
  });

  it("fails when a multi-line string hides an effectiveUntil line", () => {
    const toml = entry(
      ID_A,
      'reason = """',
      `effectiveUntil = ${inDays(30)}`,
      '"""',
    );

    const result = runCheck(HIGH_A, toml);

    expect(result.status).toBe(1);
    expect(result.output).toContain(ID_A);
  });
});

describe("check-npm-audit script, every exception of osv-scanner.toml", () => {
  it("passes when every entry is valid, even one the audit does not need", () => {
    const toml = `${entry(ID_A, `effectiveUntil = ${inDays(30)}`)}\n${entry(ID_B, `effectiveUntil = ${inDays(90)}`)}`;

    expect(runCheck(NO_AUDIT, toml).status).toBe(0);
  });

  it("passes when an entry has already expired, because osv-scanner no longer honours it", () => {
    const toml = entry(ID_A, "effectiveUntil = 2020-01-01T00:00:00Z");

    expect(runCheck(NO_AUDIT, toml).status).toBe(0);
  });

  it.each([
    ["more than 90 days away", `effectiveUntil = ${inDays(91)}`],
    ["in 2099", "effectiveUntil = 2099-01-01T00:00:00Z"],
    ["a bare year", "effectiveUntil = 2099"],
    ["a date with no time", `effectiveUntil = ${inDays(30).slice(0, 10)}`],
    ["a datetime with no zone", `effectiveUntil = ${inDays(30).slice(0, -1)}`],
    ["missing", 'reason = "x"'],
    ["the deprecated ignoreUntil key", `ignoreUntil = ${inDays(30)}`],
  ])(
    "fails and names the id when an unrelated entry has an expiry that is %s",
    (_name, line) => {
      const toml = `${entry(ID_B, `effectiveUntil = ${inDays(30)}`)}\n${entry(ID_A, line)}`;

      const result = runCheck(NO_AUDIT, toml);

      expect(result.status).toBe(1);
      expect(result.output).toContain(ID_A);
      expect(result.output).not.toContain(ID_B);
    },
  );

  it("fails when an entry has two effectiveUntil lines", () => {
    const toml = entry(
      ID_A,
      `effectiveUntil = ${inDays(30)}`,
      "effectiveUntil = 2099-01-01T00:00:00Z",
    );

    expect(runCheck(NO_AUDIT, toml).status).toBe(1);
  });

  it("fails when an entry has a multi-line string of single quotes", () => {
    const toml = entry(
      ID_A,
      `effectiveUntil = ${inDays(30)}`,
      "reason = '''",
      "text",
      "'''",
    );

    expect(runCheck(NO_AUDIT, toml).status).toBe(1);
  });

  it("accepts the real osv-scanner.toml of the repository", () => {
    const toml = readFileSync(
      resolve(__dirname, "../../osv-scanner.toml"),
      "utf8",
    );

    expect(runCheck(NO_AUDIT, toml).status).toBe(0);
  });

  it("runs from verify.sh before osv-scanner, so every exception is checked", () => {
    const verify = readFileSync(
      resolve(__dirname, "../../scripts/verify.sh"),
      "utf8",
    );

    const check = verify.indexOf("node scripts/check-npm-audit.mjs");
    const osv = verify.indexOf("osv-scanner scan source");

    expect(check).toBeGreaterThan(-1);
    expect(check).toBeLessThan(osv);
  });
});
