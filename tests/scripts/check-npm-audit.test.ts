/// <reference types="node" />
// Tests of scripts/check-npm-audit.mjs (tooling, no RF or E IDs): `npm audit` has no exceptions
// file, so this script fails only on high or critical advisories that osv-scanner.toml does not
// approve (docs/security.md, "Exceptions"). Dates in the fixtures are far from today (2020 and
// 2099) so the tests do not depend on the clock.
import {
  auditJson,
  finding,
  osvToml,
  removeFolders,
  runCheck,
} from "./check-npm-audit-fixtures";

afterEach(removeFolders);

const ID_A = "GHSA-aaaa-bbbb-cccc";
const ID_B = "GHSA-dddd-eeee-ffff";

function occurrences(text: string, part: string): number {
  return text.split(part).length - 1;
}

describe("check-npm-audit script, what passes", () => {
  it("passes when the audit has no vulnerabilities", () => {
    const result = runCheck(auditJson(), osvToml());

    expect(result.status).toBe(0);
  });

  it("passes when the only high advisory is approved and not expired", () => {
    const result = runCheck(
      auditJson(finding("picomatch", ID_A, "high")),
      osvToml({ id: ID_A }),
    );

    expect(result.status).toBe(0);
  });

  it("passes when the only unapproved advisories are moderate or low", () => {
    const result = runCheck(
      auditJson(
        finding("qs", ID_A, "moderate"),
        finding("deepmerge", ID_B, "low"),
      ),
      osvToml(),
    );

    expect(result.status).toBe(0);
  });

  it("passes when a package is affected only through a dependency, with no advisory of its own", () => {
    const stdin = JSON.stringify({
      auditReportVersion: 2,
      vulnerabilities: {
        wrapper: { name: "wrapper", severity: "high", via: ["picomatch"] },
      },
    });

    const result = runCheck(stdin, osvToml());

    expect(result.status).toBe(0);
  });
});

describe("check-npm-audit script, what fails", () => {
  it("fails and prints the id and the package of an unapproved high advisory", () => {
    const result = runCheck(
      auditJson(finding("picomatch", ID_A, "high")),
      osvToml(),
    );

    expect(result.status).toBe(1);
    expect(result.output).toContain(ID_A);
    expect(result.output).toContain("picomatch");
  });

  it("fails on an unapproved critical advisory", () => {
    const result = runCheck(
      auditJson(finding("lodash", ID_A, "critical")),
      osvToml({ id: ID_B }),
    );

    expect(result.status).toBe(1);
    expect(result.output).toContain(ID_A);
    expect(result.output).toContain("lodash");
  });

  it("fails when the approval of a high advisory has expired", () => {
    const result = runCheck(
      auditJson(finding("picomatch", ID_A, "high")),
      osvToml({ id: ID_A, until: "past" }),
    );

    expect(result.status).toBe(1);
    expect(result.output).toContain(ID_A);
  });

  it("fails when the exception has no expiry date, because it would never end", () => {
    const result = runCheck(
      auditJson(finding("picomatch", ID_A, "high")),
      osvToml({ id: ID_A, until: "none" }),
    );

    expect(result.status).toBe(1);
    expect(result.output).toContain(ID_A);
  });

  it("fails when the exception still uses the deprecated ignoreUntil key, so it gets migrated", () => {
    const result = runCheck(
      auditJson(finding("picomatch", ID_A, "high")),
      osvToml({ id: ID_A, until: "legacyKey" }),
    );

    expect(result.status).toBe(1);
    expect(result.output).toContain(ID_A);
  });

  it("fails when there is no osv-scanner.toml, because nothing is approved", () => {
    const result = runCheck(auditJson(finding("picomatch", ID_A, "high")));

    expect(result.status).toBe(1);
    expect(result.output).toContain(ID_A);
  });

  it("prints only the unapproved ids when approved and unapproved advisories are mixed", () => {
    const result = runCheck(
      auditJson(
        finding("picomatch", ID_A, "high"),
        finding("tar", ID_B, "high"),
      ),
      osvToml({ id: ID_A }),
    );

    expect(result.status).toBe(1);
    expect(result.output).toContain(ID_B);
    expect(result.output).toContain("tar");
    expect(result.output).not.toContain(ID_A);
  });

  it("reports an id once and lists every package when it affects several packages", () => {
    const result = runCheck(
      auditJson(
        finding("picomatch", ID_A, "high"),
        finding("micromatch", ID_A, "high"),
      ),
      osvToml(),
    );

    expect(result.status).toBe(1);
    expect(occurrences(result.output, ID_A)).toBe(1);
    expect(result.output).toContain("picomatch");
    expect(result.output).toContain("micromatch");
  });
});

describe("check-npm-audit script, input that is not an audit", () => {
  it.each([
    ["empty input", ""],
    ["text that is not JSON", "npm ERR! audit endpoint returned an error"],
    ["a truncated JSON", '{"vulnerabilities": {"picomatch": '],
    ["a JSON without vulnerabilities", '{"error":{"code":"ENOAUDIT"}}'],
  ])("fails with a clear message on %s", (_label, stdin) => {
    const result = runCheck(stdin, osvToml());

    expect(result.status).toBe(1);
    expect(result.output).toContain("npm audit output");
    expect(result.output).not.toContain("node:internal");
  });
});
