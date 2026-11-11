# Summary · 000 Project setup

What was done, explained so the app is understood and not only used.

## What was done and what changes for the user

The repository [rekeny/planificador-periodos](https://github.com/rekeny/planificador-periodos) is ready to work with the spec-driven process. **No feature has been implemented**: for the user, the app only shows the title "Planificador de periodos". It has been checked on an iPhone 18 Pro, an iPad Pro 11-inch (M5) and the Android emulator `Medium_Phone_API_37.0`, also in landscape.

What exists now:

- the Expo SDK 58 project with strict TypeScript and Expo Router;
- the process rules and documents (`AGENTS.md`, constitution, architecture, security and three ADRs), all in English;
- eight agent roles, seven templates and nine subagents (the Reviewer has one for phase 4 and another, with Haiku, for phase 8);
- quality (ESLint with boundaries between layers and Prettier), tests (Jest, Testing Library, fast-check and Stryker) and security (npm audit, OSV-Scanner, gitleaks and Semgrep);
- a single command, `npm run verify`, that runs everything locally and in GitHub Actions, and a protected `main`: merges only through a PR with the `verify` check green.

## How: files and new pieces

| Piece                     | Files                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| Project and configuration | `app.json`, `package.json`, `tsconfig.json`, `.nvmrc`, `.gitignore`                                       |
| Rules and documents       | `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/`, `specs/000-puesta-en-marcha/`                             |
| Agents                    | `.agents/roles/` (8), `.agents/templates/` (7), `.claude/agents/` (9), `.github/pull_request_template.md` |
| Layers                    | `src/{app,ui,state,data,domain,i18n}`, with a `README.md` per empty layer                                 |
| Texts and screen          | `src/i18n/{es.json,index.ts,i18next.d.ts}`, `src/app/{_layout,index}.tsx`                                 |
| Quality                   | `eslint.config.js`                                                                                        |
| Tests                     | `jest.config.js`, `stryker.config.json`, `tests/app/index.test.tsx`                                       |
| Verification and review   | `scripts/verify.sh`, `scripts/check-traceability.mjs`, `scripts/review.sh`, `osv-scanner.toml`            |
| Continuous integration    | `.github/workflows/verify.yml`                                                                            |

Eleven tasks (`T001` to `T011`) on the `000-puesta-en-marcha` branch, and a PR to `main`.

## Why: decisions made

- **Local development builds, no Expo Go.** Expo Go on the phone is still on SDK 57 and local builds use no EAS quota.
- **`master` renamed to `main` and `LICENSE` deleted** (T001): the template already came with a Git repository and Expo's MIT licence; the repository is public and unlicensed.
- **Template dependencies the plan does not list** (T004): `react-native-gesture-handler`, `reanimated`, `worklets`, `@expo/ui`, `expo-glass-effect` and others. They stay because Expo installs them and removing them may break the start-up.
- **Adjustments for new versions** (T006 and T007): the `eslint-plugin-boundaries` 7.4 option is called `policies`; Testing Library 14 makes `render` asynchronous; TypeScript 6 no longer loads `@types/*` by itself (`"types": ["jest"]`); and the `jest.config.js` pattern ignored every test inside Stryker's sandbox.
- **OSV-Scanner exceptions with an expiry** (T008): 9 medium vulnerabilities in indirect dependencies of Expo, Jest and Stryker, with no fix short of major versions we do not control. They expire on 2027-02-08.
- **`codex exec` instead of `codex review --base`** (T011): with Codex 0.167.0, `--base` does not accept custom instructions. Also, the `gpt-5.2` model pinned in `~/.codex/config.toml` is not supported on a ChatGPT account; that line was removed.
- **Fixes after the review** (T011): packages per layer in ESLint, `jsx-only` with visible attributes, `checkGlobalObject`, traceability that only reads test names, `verify.sh` that detects `it.skip.each` and SHA-256 pinned in the workflow.
- **Two subagents for the Reviewer** (T011): `reviewer` does the phase 4 analysis with Opus, and `codex-reviewer` does phase 8 with Haiku, because there it only runs `scripts/review.sh` and copies Codex's findings. A subagent can only pin one model, and this way it does not depend on the orchestrator remembering to change it.
- **One model per subagent** (T011): Opus in the roles that decide (specify, clarify, plan, analyse, audit and design tests), Sonnet in the Implementer, which writes code against existing tests and goes through `verify.sh` and Codex, and Haiku in the Verifier and `codex-reviewer`, which only run a script. Each file in `.claude/agents/` pins it with `model` and `effort`; the main session keeps whichever model the developer picks.
- **English across the repository** (T011, ADR-003): the repository is public, so code, commits, documentation, specs and PRs are in English. The app stays in Spanish (`es.json`), and so does the chat with the developer. `resumen.md` became `summary.md`, `[DUDA]` became `[DOUBT]` and `check-traceability.mjs` now looks for the status "Closed". The commits before this change stay in Spanish, and the folder and branch `000-puesta-en-marcha` keep their name because the open PR depends on them.

All the deviations are in the "Deviations" table of `plan.md`, with their approval.

## To learn

### Expo, `package.json` and `package-lock.json`

Expo is a layer on top of React Native: it brings the CLI, file-based routing, prebuilt native modules and configuration in `app.json`. Each Expo SDK pins the versions of compatible libraries; that is why packages are installed with `npx expo install` and not `npm install`. `package.json` is the equivalent of the `Gemfile` and `package-lock.json` of the `Gemfile.lock`.

### File-based routes with Expo Router

Each file in `src/app/` is a screen; `_layout.tsx` defines how to navigate between them (`src/app/_layout.tsx`):

```tsx
export default function RootLayout(): ReactElement {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

`index.tsx` is the `/` route. Default exports are only allowed in `src/app/` because Expo Router requires them.

### Continuous Native Generation and development builds

`ios/` and `android/` are not versioned: `npx expo run:ios` and `npx expo run:android` generate them from `app.json` (prebuild), build with Xcode or Gradle, install the app and Metro serves the JavaScript. A development build is your own app with `expo-dev-client`, unlike Expo Go, which is a generic app with a fixed set of native modules. The iOS simulator simulates the system; the Android emulator is a full virtual machine, which is why it uses a lot of memory.

### Components, hooks and typed text (`src/app/index.tsx`, `src/i18n/`)

```tsx
const { t } = useTranslation();
// ...
<Text accessibilityRole="header">{t("app.title")}</Text>;
```

`HomeScreen` is a function component that returns JSX. `useTranslation` is a hook: a function that hooks the component into the i18next state. The text lives only in `es.json`, and `i18next.d.ts` extends the library's types so that `t("app.title")` compiles and `t("app.titel")` does not:

```ts
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof es };
  }
}
```

### Strict TypeScript

`tsconfig.json` adds `noUncheckedIndexedAccess`: `players[0]` becomes `Player | undefined` and must be checked before use, like a `first` that may be `nil` in Ruby.

### ESLint and layers with `boundaries` (`eslint.config.js`)

The flat config is a list of blocks applied per file, in order. `boundaries` classifies each folder of `src/` as a layer and only lets through the imports in the table of `docs/architecture.md`:

```js
layerPolicy("app", ["ui", "state", "i18n"], ["domain"]),
layerPolicy("state", ["domain", "data"]),
layerPolicy("data", [], ["domain"]),
```

The third argument is type-only imports (`import type`). `eslint-disable` comments are forbidden with `noInlineConfig: true`, so nobody can turn off a rule without it showing in the configuration.

### Tests: Jest, Testing Library, fast-check and Stryker

- A Jest _preset_ (`jest-expo`) brings React Native transformers and mocks already set up.
- Testing Library queries by role, as a user would (`tests/app/index.test.tsx`):

  ```tsx
  await render(<HomeScreen />);
  expect(screen.getByRole("header", { name: es.app.title })).toBeTruthy();
  ```

- fast-check generates random data to check properties that always hold.
- A mutant is a copy of the code with a small change (for example `>=` for `>`). If the tests still pass, the mutant survives and the tests were not watching that line. Coverage only says which lines run; mutation says whether the tests watch them. In the trial, Stryker killed 9 mutants out of 9 (100 %).

### A single command: `scripts/verify.sh`

```bash
set -euo pipefail
```

`-e` stops at the first failure, `-u` fails on undefined variables and `pipefail` makes a pipeline fail if any of its steps fails. Without it, a verification script could say "all good" with broken steps. Traceability follows a requirement from `spec.md` to the name of a test, and fails if an RF or an E has no test.

### GitHub Actions and protection of `main` (`.github/workflows/verify.yml`)

A workflow reads top to bottom: when it triggers (`on`), with which permissions (`permissions: contents: read`, the minimum), and the steps of a job. The security tools are downloaded with a pinned version and their SHA-256 is checked before running them. Branch protection prevents merging into `main` without a PR and without the `verify` check green, even for you as an administrator.

## To check it

```bash
npm run verify                 # types, lint, formatting, tests, traceability, Expo Doctor, dependencies, secrets and static analysis
npm run ios                    # iPhone simulator
npm run android                # Android emulator
gh pr checks                   # the PR's verify check
gh api repos/rekeny/planificador-periodos/branches/main/protection   # protection of main
```

## Pending

- **C-10 (important, accepted as pending):** RF and E IDs are global; when two specs reuse `RF-001`, one test can count for both. The per-spec ID convention is decided when starting 001.
- **S-02 / C-12 (minor):** `actions/checkout` and `actions/setup-node` are pinned by tag and not by commit SHA.
- **S-04 (minor):** list or remove the unused template dependencies before 001.
- **S-05 (minor, before publishing):** block the extra Android permissions (`INTERNET`, `SYSTEM_ALERT_WINDOW`, `VIBRATE`, storage) and check that `expo-dev-client` does not get into the production build.
- **OSV-Scanner exceptions:** they expire on 2027-02-08; they must be reviewed before then.
- Mutation testing has not run on real code, because `src/domain/` has none yet.
- Next step: after merging the PR, close this session and open Claude Code **inside** `planificador-periodos`, so it loads `CLAUDE.md` and the subagents, and start spec 001.
