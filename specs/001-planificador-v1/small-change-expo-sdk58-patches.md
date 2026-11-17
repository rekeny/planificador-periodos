# Small change form · Expo SDK 58 patch updates and npm audit exceptions

- **Date:** 2026-11-17
- **Branch:** `fix/expo-sdk58-patches`
- **Approved by:** Fernando, 2026-11-17 (chat)

## What

The Expo packages move to the patch versions that Expo SDK 58 now expects (`npx expo install --fix`), and `npm audit` in `scripts/verify.sh` accepts the same approved exceptions as OSV-Scanner, through `scripts/check-npm-audit.mjs`. The new advisory GHSA-fc5q-39xc-vjpf (picomatch) gets an exception until 2027-02-15.

## Why

On 2026-11-17 `scripts/verify.sh` stopped passing on `main` and on every branch, with no change of ours: Expo published new SDK 58 patch releases, so Expo Doctor reported 7 outdated packages, and a new high advisory without a fixed version (picomatch ReDoS, build and test tools only) made `npm audit` and OSV-Scanner fail. Fernando chose to update the packages on their own branch and to treat picomatch with an exception and an approved list, so any other new high or critical advisory is still caught.

Discarded: lowering `npm audit` to `--audit-level=critical` (it would hide new high advisories) and waiting for a picomatch fix (nothing could be merged meanwhile).

## How

`package.json`, `package-lock.json`, `osv-scanner.toml`, `scripts/check-npm-audit.mjs`, `scripts/verify.sh`, `docs/security.md`, `specs/001-planificador-v1/plan.md` ("New dependencies") and `review.md` (Security section), and the tests in `tests/scripts/`.

## Why it is small

It changes no behaviour of the app and does not touch `src/`. The bumps are patch releases within SDK 58 (one minor, `expo-web-browser`, which `src/` does not use). Security reviewed it with no blocking finding.

## Tests

`tests/scripts/check-npm-audit.test.ts` (15 tests) fails before the script exists: approved and unexpired ids pass, unapproved or expired high and critical ids fail and are printed once, moderate ones are ignored, bad input fails with a clear message. Full `npm run verify` passes.
