# Small change form · osv-scanner exceptions use `effectiveUntil` instead of the deprecated `ignoreUntil`

- **Date:** 2026-11-21
- **Branch:** `fix/osv-effective-until`
- **Approved by:** Fernando, 2026-11-21 (chat)

## What

The seven exceptions of `osv-scanner.toml` rename their expiry key from `ignoreUntil` to `effectiveUntil`, with the same dates (2027-02-08 and 2027-02-10). `scripts/check-npm-audit.mjs` reads the new key. Its tests and fixtures use the new key too, and one new test proves that an entry that still uses the old key does not count as approved.

## Why

osv-scanner 2.7.1 (the version CI installs and the one on this Mac) prints on every run: «osv-scanner.toml has at least one ignore entry using 'ignoreUntil' which has been deprecated in favor of 'effectiveUntil'». The Security review of 2026-11-21 recorded it (SEC-D2-4, in SEC-T061-5). If a later osv-scanner drops the old key, the scanner would stop honouring the expiry, and the exceptions would turn into permanent ones: that is the case the rule of `docs/security.md` («an exception has an expiry of 90 days at most») forbids. The exceptions expire on 2027-02-08, so it is better to do it now and not under pressure.

Checked here on 2026-11-21, with copies of the file in `reports/` (ignored by git):

| Copy of `osv-scanner.toml`        | Result with osv-scanner 2.7.1                                                       |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| As it is (`ignoreUntil`)          | «No issues found», 9 vulnerabilities filtered, and the deprecation warning          |
| With `effectiveUntil`, same dates | «No issues found», the same exceptions filtered, **no warning**                     |
| With `effectiveUntil` in the past | The seven advisories come back as findings: the expiry is honoured with the new key |

`scripts/check-npm-audit.mjs` is the other reader of the key: line 20 reads `ignoreUntil` with a regular expression, to decide which `npm audit` advisories are approved. If only the TOML changed, the script would find no date, count no exception as approved, and `verify.sh` would fail. So both change together.

## How

- `osv-scanner.toml`: seven lines, `ignoreUntil =` → `effectiveUntil =`. No date, reason or ID changes.
- `scripts/check-npm-audit.mjs`: the regular expression and the comment above it (lines 14 and 15) read `effectiveUntil`. The old key is **not** accepted as a fallback: an entry that still uses it has no date for the script, so it does not count as approved and `npm audit` fails on it, which forces the migration instead of hiding it. (osv-scanner itself would still honour the old key for now, so the two tools would disagree, and the stricter one wins.)
- `tests/scripts/check-npm-audit-fixtures.ts`: `osvToml` writes `effectiveUntil`.
- `tests/scripts/check-npm-audit.test.ts`: one new test (see below). The test names keep their IDs as they are.
- The Security role reviews it (configuration, rule 16 of `AGENTS.md`).

No change in `src/`, the spec, dependencies or `package-lock.json`.

## Why it is small

It changes no behaviour of the app and touches no dependency: it renames a configuration key that the scanner has already deprecated, in the two places that read it, with the same dates and the same exceptions.

## Tests

- **Red first:** the fixtures move to `effectiveUntil` before the script does, so the existing tests of `check-npm-audit` that need an approved exception («an exception with a future date approves the advisory», and the ones built on it) fail against the current script, for the right reason: it reads a key that is no longer there.
- **New test:** an `osv-scanner.toml` whose exception still has `ignoreUntil` and a future date does not approve the advisory, and the script fails.
- **Kept:** an exception with a past `effectiveUntil` does not approve; an entry with no date does not approve.
- `npm run verify` green, and its osv-scanner step must no longer print the deprecation warning; `osv-scanner scan source --lockfile=package-lock.json` still ends with «No issues found».
- **Not covered:** a future osv-scanner that changes the key again; the weekly scan would show it as a warning, as it did this time.
