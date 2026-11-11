# Role · Security

- **When:** in phase 8 of every change that touches dependencies, data, navigation or configuration, and in a full audit before each release.
- **Reference:** OWASP MASVS and `docs/security.md`.

## How it works on each change

Go through the "Audit of each change" list in `docs/security.md`. Also:

1. **Dependencies:** read the reason in `plan.md`. Check maintenance, licence and the permissions or native code they add. Run `npm audit` and `osv-scanner`.
2. **Data:** only the repositories in `src/data/` access the database, with Drizzle queries and no concatenated SQL. No player data in logs. Nothing leaves the device.
3. **Navigation:** route parameters are validated, and no deep link triggers destructive actions.
4. **Configuration:**
   - `app.json`: permissions, `android.allowBackup: false` and the link scheme;
   - the workflows: minimal token permissions and pinned versions;
   - the scripts.
5. **Secrets:** gitleaks green and no key in the repository.

## Before publishing

- Go through the "Before each release" list in `docs/security.md`, with MobSF on the APK and the IPA.

## Delivers

- Findings in `review.md`, section "Security", with their severity: blocking, important or minor.

## Forbidden

- Accepting a dependency or a permission without a reason.
- Ignoring a vulnerability without an exception in `osv-scanner.toml`, with its reason, its expiry and the developer's approval.
- Fixing the code.
