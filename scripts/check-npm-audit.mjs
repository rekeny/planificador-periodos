// Fails on high or critical `npm audit` advisories that osv-scanner.toml does not approve.
// `npm audit` has no exceptions file, so the list of docs/security.md ("Exceptions") is reused.
// Usage: npm audit --omit=dev --json | node scripts/check-npm-audit.mjs
// The exceptions are read from osv-scanner.toml in the current folder.
import { existsSync, readFileSync } from "node:fs";

const BLOCKING = new Set(["high", "critical"]);

function fail(message) {
  console.error(message);
  process.exit(1);
}

const DAY = 24 * 60 * 60 * 1000;
// docs/security.md: an exception has an expiry of 90 days at most.
const MAX_DAYS = 90;
// A full TOML datetime with a zone, such as 2027-02-08T00:00:00Z. A bare year or a date alone has
// no time of day, and a datetime without a zone depends on the machine's clock, so neither counts.
const DATETIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

// Ids of the [[IgnoredVulns]] entries whose effectiveUntil is a full datetime that has not passed
// and is at most 90 days away. An entry without it, or with another kind of value, never ends or
// ends too late, so it does not count.
export function approvedIds(toml, now = new Date()) {
  const ids = new Set();
  for (const block of toml.split("[[IgnoredVulns]]").slice(1)) {
    const id = /^\s*id\s*=\s*"([^"]+)"/m.exec(block)?.[1];
    const until = /^\s*effectiveUntil\s*=\s*([^\s#]+)/m.exec(block)?.[1];
    const expiry =
      until !== undefined && DATETIME.test(until) ? Date.parse(until) : NaN;
    const valid =
      expiry > now.getTime() && expiry <= now.getTime() + MAX_DAYS * DAY;
    if (id !== undefined && valid) ids.add(id);
  }
  return ids;
}

export function parseAudit(text) {
  let audit;
  try {
    audit = JSON.parse(text);
  } catch {
    return undefined;
  }
  const valid = audit !== null && typeof audit.vulnerabilities === "object";
  return valid && audit.vulnerabilities !== null ? audit : undefined;
}

function advisoryId(via) {
  return /GHSA-[a-z0-9-]+/i.exec(via.url ?? "")?.[0] ?? String(via.source);
}

// Map of advisory id to the set of packages it affects, for high and critical advisories only.
export function blockingAdvisories(audit) {
  const found = new Map();
  for (const [name, entry] of Object.entries(audit.vulnerabilities)) {
    for (const via of entry.via ?? []) {
      if (typeof via !== "object" || !BLOCKING.has(via.severity)) continue;
      const id = advisoryId(via);
      found.set(id, (found.get(id) ?? new Set()).add(via.name ?? name));
    }
  }
  return found;
}

function readToml() {
  return existsSync("osv-scanner.toml")
    ? readFileSync("osv-scanner.toml", "utf8")
    : "";
}

function main() {
  const audit = parseAudit(readFileSync(0, "utf8"));
  if (audit === undefined) {
    fail(
      "check-npm-audit: the npm audit output is not valid JSON of an audit.",
    );
  }
  const approved = approvedIds(readToml());
  const unapproved = [...blockingAdvisories(audit)].filter(
    ([id]) => !approved.has(id),
  );
  if (unapproved.length === 0) {
    console.log("npm audit: no unapproved high or critical advisories.");
    return;
  }
  const lines = unapproved.map(
    ([id, names]) => `  ${id}: ${[...names].join(", ")}`,
  );
  fail(
    `check-npm-audit: unapproved high or critical advisories (see osv-scanner.toml):\n${lines.join("\n")}`,
  );
}

main();
