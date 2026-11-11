# Security

The reference is the OWASP MASVS standard for mobile apps. Since the app works offline, the attack surface is small, but not zero. The Security role (`.agents/roles/security.md`) audits every change that touches dependencies, data, navigation or configuration, and does a full audit before each release.

## Controls

| What can go wrong                    | Control                                                                                             | How it is checked                                        |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| A malicious or vulnerable dependency | Few dependencies, versions pinned in `package-lock.json` and a review before adding one             | `npm audit` and OSV-Scanner in `verify.sh`               |
| Data leaving the device              | No analytics or third-party SDKs; the Internet permission is blocked in the published Android build | ESLint forbids network calls; MobSF reviews the manifest |
| Database injection                   | Only parameterised Drizzle queries                                                                  | Semgrep and the Codex review                             |
| An external link that opens a screen | No link can trigger a destructive action, and parameters are validated                              | Tests and audit                                          |
| Secrets in the repository            | There are no keys, but it is scanned anyway                                                         | gitleaks in `verify.sh`                                  |
| Data in logs or system backups       | Android automatic backup disabled; no `console` in `src/`                                           | ESLint, audit and MobSF                                  |
| Unnecessary permissions              | Only the essential ones                                                                             | MobSF on the APK and the IPA before publishing           |
| A compromised CI workflow            | Minimal token permissions and pinned versions of actions and tools                                  | Audit of every change in `.github/`                      |

**Children's data.** The app stores children's names. They never leave the device, and the stores are told that the app collects no data.

## Audit of each change

- [ ] Each new or updated dependency is justified in `plan.md`, is maintained and has a compatible licence.
- [ ] No new iOS or Android permission without a reason.
- [ ] No network calls and no player data in logs.
- [ ] Database queries only through Drizzle with parameters.
- [ ] Route parameters validated; no link triggers destructive actions.
- [ ] `app.json` still has `android.allowBackup: false`.
- [ ] Workflows with minimal permissions and pinned versions.
- [ ] `npm audit` (fails only at high severity or above), OSV-Scanner, gitleaks and Semgrep green.

## Before each release

- [ ] Block the Internet permission in the Android production build and check that the app works without it.
- [ ] MobSF on the APK and the IPA, with no open high findings.
- [ ] Review the generated `AndroidManifest.xml` and `Info.plist`: only the essential permissions.
- [ ] Declare in the App Store and Google Play that the app collects no data.
- [ ] Review the GDPR privacy obligations, because there is children's data on the device.
- [ ] Full dependency audit, including development ones.

## Exceptions

If a vulnerability cannot be fixed, it is recorded in `osv-scanner.toml` with:

- the reason;
- an expiry date, 90 days at most;
- the developer's approval.

Without those three, there is no exception.
