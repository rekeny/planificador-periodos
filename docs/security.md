# Security

The reference is the OWASP MASVS standard for mobile apps. Since the app works offline, the attack surface is small, but not zero. The Security role (`.agents/roles/security.md`) audits every change that touches dependencies, data, navigation or configuration, and does a full audit before each release.

## Controls

| What can go wrong                    | Control                                                                                                                             | How it is checked                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| A malicious or vulnerable dependency | Few dependencies, versions pinned in `package-lock.json` and a review before adding one                                             | `npm audit` and OSV-Scanner in `verify.sh`                                    |
| Data leaving the device              | No analytics or third-party SDKs; the Internet permission is blocked in the published Android build                                 | ESLint forbids network calls; MobSF reviews the manifest                      |
| Database injection                   | Only parameterised Drizzle queries                                                                                                  | Semgrep and the Codex review                                                  |
| An external link that opens a screen | No link can trigger a destructive action, and parameters are validated                                                              | Tests and audit                                                               |
| Secrets in the repository            | There are no keys, but it is scanned anyway                                                                                         | gitleaks in `verify.sh`                                                       |
| Data in logs or system backups       | Android automatic backup disabled; no `console` in `src/`                                                                           | ESLint, audit and MobSF                                                       |
| Data in iCloud or computer backups   | The config plugin marks the database folder (`Documents/SQLite`) `isExcludedFromBackup` at every launch, before React Native starts | Plugin tests, audit of the generated `AppDelegate.swift`, `xattr` on a device |
| Unnecessary permissions              | Only the essential ones                                                                                                             | MobSF on the APK and the IPA before publishing                                |
| A compromised CI workflow            | Minimal token permissions and pinned versions of actions and tools                                                                  | Audit of every change in `.github/`                                           |

**Children's data.** The app stores children's names. They never leave the device, and the stores are told that the app collects no data.

## Audit of each change

- [ ] Each new or updated dependency is justified in `plan.md`, is maintained and has a compatible licence.
- [ ] No new iOS or Android permission without a reason.
- [ ] No network calls and no player data in logs.
- [ ] Database queries only through Drizzle with parameters.
- [ ] Route parameters validated; no link triggers destructive actions.
- [ ] `app.json` still has `android.allowBackup: false` and lists `./plugins/with-backup-exclusion.js` once.
- [ ] Android: the prebuilt manifest has `android:dataExtractionRules` and `android:fullBackupContent`, and both XML files exclude the nine domains (cloud backup, device transfer and full backup).
- [ ] iOS: the prebuilt `AppDelegate.swift` has the tagged block `with-backup-exclusion-ios` once, inside the launch function and before `let delegate = ReactNativeDelegate()`. It builds the folder from `.documentDirectory` + `"SQLite"` (the `defaultDatabaseDirectory` of the installed `expo-sqlite`), creates it if missing, sets `isExcludedFromBackup` and deletes nothing. Any new place that stores data on the device (another folder, `directory` argument of `openDatabaseSync`, a file, `AsyncStorage`) is also excluded or justified.
- [ ] iOS: a failed attribute write must not stay silent without a trace: the block reports it with a fixed message that holds no path and no data (see `review.md`, SEC-T026-1). Before each release, check with `xattr` on a device that `com.apple.metadata:com_apple_backup_excludeItem` is on the SQLite folder.
- [ ] `expo-sqlite` opens with `useNewConnection: true` so the dev inspector never registers the database.
- [ ] State layer: no `devtools`, `persist` or `zustand/middleware` (they would push or store children's names outside the database).
- [ ] `better-sqlite3` is imported only from `tests/` (never from `src/`), and `drizzle-orm` only through its `better-sqlite3` subpaths there.
- [ ] No route writes on open: every write is called from a button, a form submit or a cell tap, and routes carry only numeric ids parsed with `parseTeamId`, `parsePlayerId` or `parseMatchId`.
- [ ] Workflows with minimal permissions and pinned versions.
- [ ] `npm audit` (fails only at high severity or above), OSV-Scanner, gitleaks and Semgrep green.

## Before each release

- [ ] Block the Internet permission in the Android production build and check that the app works without it.
- [ ] MobSF on the APK and the IPA, with no open high findings.
- [ ] Review the generated `AndroidManifest.xml` and `Info.plist`: only the essential permissions. Block `SYSTEM_ALERT_WINDOW`, `VIBRATE`, `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` with `android.blockedPermissions`, and check that the dev-client residue (`exp+` scheme, local-network and Bonjour keys in `Info.plist`) is gone from the production build.
- [ ] Set `ios.config.usesNonExemptEncryption: false` (`ITSAppUsesNonExemptEncryption`) before the first iOS upload.
- [ ] Declare in the App Store and Google Play that the app collects no data.
- [ ] Review the GDPR privacy obligations, because there is children's data on the device.
- [ ] Full dependency audit, including development ones.

## Exceptions

If a vulnerability cannot be fixed, it is recorded in `osv-scanner.toml` with:

- the reason;
- an expiry date, 90 days at most;
- the developer's approval.

Without those three, there is no exception.
