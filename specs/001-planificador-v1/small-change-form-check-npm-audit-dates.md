# Small change form · `check-npm-audit` counts only full datetimes at most 90 days away

- **Date:** 2026-11-26
- **Branch:** `fix/check-npm-audit-dates`
- **Approved by:** Fernando, 2026-11-26 (chat)

## What

In `scripts/check-npm-audit.mjs`, the `effectiveUntil` of an `osv-scanner.toml` exception approves an `npm audit` advisory only if it is a full TOML datetime (date, time and zone, such as `2027-02-08T00:00:00Z`) and it is after now and at most 90 days after now. A bare year, a date with no time, a datetime with no zone, a past date and a date more than 90 days away do not approve anything.

## Why

`docs/security.md` says an exception has an expiry of 90 days at most, but the script accepted any value `Date.parse` understood, so `effectiveUntil = 2099` approved an advisory for 70 years. The script is the only place that checks the rule for `npm audit`.

## How

- `scripts/check-npm-audit.mjs`: `approvedIds` checks the value against a full-datetime pattern and against `now` plus 90 days. A datetime with no zone is not accepted because it would depend on the machine's clock.
- `tests/scripts/check-npm-audit-fixtures.ts`: the usual "future" expiry is now 30 days from today (it was 2099, which the new rule rejects), `inDays(n)` builds a datetime at midnight UTC `n` days from today, and an exception can carry a raw value.
- `tests/scripts/check-npm-audit.test.ts`: new cases (see below).
- `osv-scanner.toml` does not change. Checked on 2026-11-26: its seven entries end on 2027-02-08 (six, 73 days away) and 2027-02-10 (one, 75 days away), so all of them still count and `npm run verify` is not affected. From 2027-02-11 on they have expired anyway, and a new exception has to be written with a date at most 90 days away.

## Why it is small

It changes no behaviour of the app and does not touch `src/domain/`: it makes a tooling script apply a rule that `docs/security.md` already states.

## Tests

- **Red first:** a bare year, a date with no time (far, and within 90 days), a datetime with no zone, a datetime 91 days away and a datetime in 2099 each approve the advisory with the current script, so the script passes where the test expects it to fail.
- **Green after:** those six cases fail the script; a datetime exactly 90 days away (midnight UTC, so the hour of the run does not matter), one for tomorrow, one with an offset and one with fractions of a second pass.
- **Kept:** a past date, no date and the old `ignoreUntil` key still do not approve.
- **Not covered:** the exact second of the 90-day limit, because the script reads the real clock; the tests use midnight UTC of the day, which is never later than now plus 90 days.

## Scope added by the review (2026-11-27)

Fernando approved on 2026-11-27 (chat: "Sí, arréglalos") fixing the Codex finding and the two IMPORTANT Security findings of PR 30. What changes in the script:

- **What:** the datetime also accepts a lowercase `t` or `z` and a space instead of the `T` (RFC 3339), and the value is read up to a trailing `#` comment. Every `[[IgnoredVulns]]` entry is checked, not only those `npm audit` needs: a full datetime with a zone, at most 90 days away (an expired one is inert and passes), or the script fails and names the id. An entry ends at the next table header.
- **How:** `scripts/check-npm-audit.mjs` splits the file by lines (`entries`), `exceptionProblems` validates every entry and runs first in `main`; `scripts/verify.sh` already calls the script before `osv-scanner`, and a test checks that order. An entry with a `"""` or `'''` string or a repeated `id` or `effectiveUntil` is refused (2 lines, tested). `docs/security.md` records the rule.
- **Tests:** `tests/scripts/check-npm-audit.test.ts` (more datetime forms) and the new `tests/scripts/check-npm-audit-toml.test.ts` (block end, every entry, the real file, the order in `verify.sh`).
