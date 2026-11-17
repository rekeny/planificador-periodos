/// <reference types="node" />
// Shared helpers of the tests of scripts/check-npm-audit.mjs. The script reads the JSON of
// `npm audit --omit=dev --json` from the standard input and the exceptions from osv-scanner.toml in
// the current folder, so each test builds a temporary folder with that file and pipes the audit in.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SCRIPT = resolve(__dirname, "../../scripts/check-npm-audit.mjs");
const FUTURE = "2099-01-01T00:00:00Z";
const PAST = "2020-01-01T00:00:00Z";

export type Severity = "low" | "moderate" | "high" | "critical";
export type Advisory = { id: string; severity: Severity };
export type Finding = { name: string; advisories: Advisory[] };

const createdFolders: string[] = [];

export function removeFolders(): void {
  for (const folder of createdFolders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
}

// One `vulnerabilities` entry in the npm 7+ format: an object in `via` per advisory, plus the name
// of a dependency as a plain string, which npm adds for packages that are only affected indirectly.
function vulnerability({ name, advisories }: Finding) {
  const via = advisories.map(({ id, severity }, index) => ({
    source: 1000 + index,
    name,
    dependency: name,
    title: `Problem ${id}`,
    url: `https://github.com/advisories/${id}`,
    severity,
    cwe: [],
    cvss: { score: 0, vectorString: null },
    range: "<99.0.0",
  }));
  const worst = advisories.some((a) => a.severity === "critical")
    ? "critical"
    : (advisories[0]?.severity ?? "low");
  return {
    name,
    severity: worst,
    isDirect: false,
    via: [...via, "some-dependency"],
    effects: [],
    range: "<99.0.0",
    nodes: [`node_modules/${name}`],
    fixAvailable: false,
  };
}

export function auditJson(...findings: Finding[]): string {
  const vulnerabilities = Object.fromEntries(
    findings.map((finding) => [finding.name, vulnerability(finding)]),
  );
  return JSON.stringify({
    auditReportVersion: 2,
    vulnerabilities,
    metadata: { vulnerabilities: { total: findings.length } },
  });
}

export function finding(name: string, id: string, severity: Severity): Finding {
  return { name, advisories: [{ id, severity }] };
}

type Exception = { id: string; until?: "future" | "past" | "none" };

export function osvToml(...exceptions: Exception[]): string {
  return exceptions
    .map(({ id, until = "future" }) =>
      [
        "[[IgnoredVulns]]",
        `id = "${id}"`,
        ...(until === "none"
          ? []
          : [`ignoreUntil = ${until === "past" ? PAST : FUTURE}`]),
        'reason = "A test reason."',
        "",
      ].join("\n"),
    )
    .join("\n");
}

// Runs the script in a new folder. `toml` undefined means there is no osv-scanner.toml at all.
export function runCheck(stdin: string, toml?: string) {
  const root = mkdtempSync(join(tmpdir(), "check-npm-audit-"));
  createdFolders.push(root);
  if (toml !== undefined) writeFileSync(join(root, "osv-scanner.toml"), toml);
  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd: root,
    input: stdin,
    encoding: "utf8",
  });
  return {
    status: result.status,
    output: `${result.stdout}\n${result.stderr}`,
  };
}
