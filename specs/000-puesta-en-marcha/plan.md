# Plan · 000 Project setup

- **Level:** Large (first setup of the repository)
- **Status:** Approved
- **Approved by:** Fernando, on 2026-11-10
- **Spec:** none. Phase 0 implements no feature, so it has no `spec.md`, RF requirements or E examples. Its scope is set by this plan and `tasks.md`. Since no task carries an RF or E ID, `scripts/check-traceability.mjs` requires no tests for this folder.

## Explanation before running

- **What:** leave the repository ready to work with the spec-driven process. It includes the Expo SDK 58 project, the rules, the roles, the quality, testing and security tools, the automatic verification and continuous integration. No feature is implemented: the only screen shows the title.
- **How:** eleven tasks (T001–T011) on the `000-puesta-en-marcha` branch, with one commit per task and a PR to `main`.
- **Why:** the rules, the layers and the checks exist from the first commit, so all the code of spec 001 is born following them, whoever writes it.
- **To learn:**
  - Expo and its configuration;
  - development builds;
  - Expo Router;
  - strict TypeScript;
  - ESLint and its boundaries between layers;
  - Jest, Testing Library, fast-check and Stryker;
  - i18next with typed keys;
  - bash scripts;
  - GitHub Actions and branch protection.
- **To check it:**
  - `npm run verify` green locally;
  - the verification green on the PR;
  - the title visible on iPhone, iPad and Android.
- **Pending:** nothing.

## Decisions

| Decision                                        | Reason                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| Local development builds with `expo-dev-client` | Expo Go on the phone is still on SDK 57; local builds use no EAS quota  |
| Routes in `src/app/`                            | It is the structure of the current template                             |
| `CLAUDE.md` imports `AGENTS.md`                 | Claude Code reads `CLAUDE.md`; this way the rules live in a single file |
| i18next from phase 0                            | The first screen already shows a text                                   |
| No web support                                  | The app is only for phones and tablets                                  |
| Tests before code, task by task                 | The verification is always green                                        |
| Orientation `default`                           | The spec asks for portrait and landscape                                |

## New dependencies

| Package                                                                                        | Reason                                | Type                   |
| ---------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------- |
| `expo-dev-client`                                                                              | Development builds instead of Expo Go | App (development only) |
| `i18next`, `react-i18next`                                                                     | Interface texts in `es.json`          | App                    |
| `eslint`, `eslint-config-expo` (with `npx expo lint`)                                          | Lint                                  | Development            |
| `prettier`, `eslint-config-prettier`                                                           | Formatting                            | Development            |
| `eslint-plugin-boundaries` (and the TypeScript resolver, only if needed)                       | Boundaries between layers             | Development            |
| `eslint-plugin-i18next`                                                                        | Forbid loose text in JSX              | Development            |
| `jest`, `jest-expo`, `@types/jest`                                                             | Tests                                 | Development            |
| `@testing-library/react-native`                                                                | Component and screen tests            | Development            |
| `fast-check`                                                                                   | Property tests                        | Development            |
| `@stryker-mutator/core`, `@stryker-mutator/jest-runner`, `@stryker-mutator/typescript-checker` | Mutation testing                      | Development            |

## Risks

| Risk                                                       | Mitigation                                                        |
| ---------------------------------------------------------- | ----------------------------------------------------------------- |
| A tool has changed its options since this plan was written | Check with `--help` or its documentation and record the deviation |
| Stryker does not work with `jest-expo`                     | Trial with a temporary file in T007                               |
| The CI verification is slow                                | npm cache; mutation testing only runs if `src/domain/` changes    |

## Deviations

| Date       | What changes from the plan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Reason                                                                                                                                                                                        | Approved by          |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| 2026-11-10 | T001: the Expo template already came with a Git repository on `master` and a `LICENSE` file (Expo's MIT). `master` is renamed to `main` and `LICENSE` is deleted, because the repository is public and unlicensed. The `T001` commit sits on top of Expo's initial commit.                                                                                                                                                                                                                                                                                                       | The prompt assumed `create-expo-app` did not start Git and that there was no licence                                                                                                          | Fernando, 2026-11-10 |
| 2026-11-10 | T004: the `default@sdk-58` template brings dependencies the plan does not list (`react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets`, `@expo/ui`, `expo-glass-effect`, among others). They are left as they are.                                                                                                                                                                                                                                                                                                                                   | Expo installs them with the template and removing them may break the start-up; gesture handler was coming in 001 anyway                                                                       | Fernando, 2026-11-10 |
| 2026-11-10 | T006: `src/i18n/index.ts` turns off the `import/no-named-as-default-member` rule only for that file (in `eslint.config.js`). The `eslint-plugin-boundaries` 7.4 option is called `policies`, not `rules`.                                                                                                                                                                                                                                                                                                                                                                        | `i18n.use(...)` is the documented react-i18next way and the rule gives a false warning; with `--max-warnings 0` it would fail. The rule is set in the configuration, not with a comment.      | Fernando, 2026-11-10 |
| 2026-11-10 | T007: `tests/app/index.test.tsx` uses `async` and `await render(...)`. `tsconfig.json` adds `"types": ["jest"]`. `jest.config.js` ignores `<rootDir>/.stryker-tmp/` and `<rootDir>/e2e/` instead of `/.stryker-tmp/` and `/e2e/`. `eslint.config.js` declares `__dirname` as a global of `jest.config.js`.                                                                                                                                                                                                                                                                       | Testing Library 14 makes `render` asynchronous; TypeScript 6 no longer loads `@types/*` by itself; Stryker runs the tests inside `.stryker-tmp/` and the previous pattern ignored all of them | Fernando, 2026-11-10 |
| 2026-11-10 | T008: `osv-scanner.toml` is created with 7 exceptions (9 medium vulnerabilities in `deepmerge`, `glob`, `minimatch` and `qs`), expiring on 2027-02-08.                                                                                                                                                                                                                                                                                                                                                                                                                           | OSV-Scanner failed on vulnerabilities in indirect dependencies of Expo, Jest and Stryker, with no fix short of major versions we do not control. It is the procedure in `docs/security.md`    | Fernando, 2026-11-10 |
| 2026-11-10 | T011: `scripts/review.sh` uses `codex exec --sandbox read-only` with the instructions instead of `codex review --base`.                                                                                                                                                                                                                                                                                                                                                                                                                                                          | With Codex 0.167.0, `codex review --base` does not accept custom instructions at the same time ("the argument --base cannot be used with [PROMPT]")                                           | Fernando, 2026-11-10 |
| 2026-11-10 | T011: after the Codex review, `eslint.config.js` (packages per layer, `jsx-only` with visible attributes, `checkGlobalObject`), `check-traceability.mjs` (test names only), `verify.sh` (`skip`/`only` variants) and `verify.yml` (SHA-256 of gitleaks and osv-scanner) are hardened; `jest`, `jest-expo` and `@types/jest` move to `devDependencies`.                                                                                                                                                                                                                           | Findings C-02 to C-08 in `review.md`                                                                                                                                                          | Fernando, 2026-11-10 |
| 2026-11-11 | T011: the Reviewer role gets two subagents: `reviewer` (phase 4) and `codex-reviewer` (phase 8, `model: haiku`, `effort: low`). Both read `.agents/roles/reviewer.md`; `CLAUDE.md` says which one is used in each phase. Nine subagents in total.                                                                                                                                                                                                                                                                                                                                | In phase 8 Codex does the review and the subagent only runs `scripts/review.sh` and copies the findings; a subagent can only pin one model                                                    | Fernando, 2026-11-11 |
| 2026-11-11 | T011: each subagent pins `model` and `effort`: Opus for `specifier` (high), `clarifier` (medium), `planner` (high), `reviewer` (medium), `security` (high) and `test-designer` (high); Sonnet for `implementer` (high); Haiku for `verifier` and `codex-reviewer` (low).                                                                                                                                                                                                                                                                                                         | Match the model to each role's work: judgement where decisions are made, Sonnet to write code against existing tests and Haiku where only a script runs                                       | Fernando, 2026-11-11 |
| 2026-11-11 | T011: commit messages are written in English (first version of ADR-003).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | The repository is public and the code is already in English; anyone should be able to read the history                                                                                        | Fernando, 2026-11-11 |
| 2026-11-11 | T011: everything in the repository moves to English (ADR-003): rules, docs, ADRs, roles, templates, subagents, this spec folder, `osv-scanner.toml`, the layer READMEs and the PR. `resumen.md` becomes `summary.md`, `[DUDA]` becomes `[DOUBT]`, the closed status is "Closed" and the Codex severities are BLOCKING, IMPORTANT and MINOR; `check-traceability.mjs` and `review.sh` follow. The app stays in Spanish (`es.json`), and so does the chat with the developer. The folder and branch `000-puesta-en-marcha` keep their name, and earlier commits are not rewritten. | The repository is public: documentation and history in Spanish can only be read by people who read Spanish                                                                                    | Fernando, 2026-11-11 |
