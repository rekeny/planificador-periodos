# Architecture

## Stack

| Piece       | Choice                                                                          | What for                                                        | Arrives in              |
| ----------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------- |
| Platform    | Expo SDK 58 (React Native)                                                      | A single code base for iOS and Android                          | Phase 0                 |
| Language    | TypeScript in strict mode                                                       | Catch errors while writing                                      | Phase 0                 |
| Navigation  | Expo Router                                                                     | Routes from the files in `src/app/`                             | Phase 0                 |
| Texts       | i18next and react-i18next                                                       | Interface texts in `es.json`, with typed keys                   | Phase 0                 |
| Development | expo-dev-client                                                                 | Local development builds instead of Expo Go                     | Phase 0                 |
| Database    | expo-sqlite, Drizzle ORM and drizzle-kit                                        | Store teams, players and matches on the device, with migrations | 001                     |
| State       | Zustand                                                                         | Session of the open match and undo                              | 001                     |
| Gestures    | react-native-gesture-handler                                                    | Long press on the cells                                         | 001                     |
| Tests       | Jest (jest-expo), React Native Testing Library, fast-check, Stryker and Maestro | See "Tests"                                                     | Phase 0; Maestro in 001 |
| Quality     | ESLint (eslint-config-expo, boundaries, i18next) and Prettier                   | Style and boundaries between layers                             | Phase 0                 |
| Security    | npm audit, OSV-Scanner, gitleaks and Semgrep; MobSF before publishing           | See `docs/security.md`                                          | Phase 0                 |
| Publishing  | EAS Build and EAS Submit, free plan                                             | Build and upload to the stores                                  | Before publishing       |

The exact versions are those in `package-lock.json`. Expo picks the ones compatible with the SDK when installing with `npx expo install`.

## How it runs

- **Local development builds.** `npm run ios` and `npm run android` build the app with Xcode or Android Studio, install it on the simulator or emulator and start Metro, the server that serves the JavaScript code. Local builds do not use EAS quota.
- **Expo Go is not used.** During the move to SDK 58, Expo Go on the phone is still on SDK 57, and Expo recommends it only for learning.
- **`ios/` and `android/` are not versioned.** Expo generates them from `app.json` (Continuous Native Generation). Any native setting goes in `app.json` or a config plugin, never by hand in those folders.

## Structure

```text
src/
  app/            screens and navigation (Expo Router)
  ui/             components that render
  state/          match session and undo
  data/           schema, migrations and repositories
  domain/         pure rules and types
  i18n/           language setup and es.json
tests/
  app/            tests of the screens in src/app
  scripts/        tests of the scripts in scripts/
  plugins/        tests of the config plugins in plugins/
  setup/          Jest setup files, such as the fast-check settings
  support/        test helpers, such as the in-memory database and fast-check generators
e2e/              Maestro flows
plugins/          config plugins that write native settings at prebuild
specs/            one folder per spec
docs/             constitution, architecture, security and decisions
.agents/          agent roles and templates
.claude/agents/   Claude Code subagents, which point to .agents/roles
scripts/          verify.sh, review.sh, check-traceability.mjs and other tooling scripts
```

The folders outside `src/` are created by the task that first needs them (spec 001, ADR-004). Files under `tests/` are test code for ESLint, like `*.test.ts` files, and they do not count in coverage.

## Layers

| Folder        | Contains                            | May import                                                 | May not import                                        |
| ------------- | ----------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------- |
| `src/app/`    | Screens and navigation              | `src/ui`, `src/state`, `src/i18n`, types from `src/domain` | `src/data`, the database                              |
| `src/ui/`     | Components that render              | `src/state`, `src/i18n`, types from `src/domain`           | `src/data`, functions from `src/domain`, the database |
| `src/state/`  | Match session and undo              | `src/domain`, `src/data`                                   | `src/app`, `src/ui`, `react-native`                   |
| `src/data/`   | Schema, migrations and repositories | Drizzle, expo-sqlite, types from `src/domain`              | `src/app`, `src/ui`, `src/state`                      |
| `src/domain/` | Pure rules and types                | Nothing external                                           | Any package and any other layer                       |
| `src/i18n/`   | Texts and language                  | i18next, react-i18next                                     | Any other layer                                       |

- If a layer imports something it should not, ESLint fails (`boundaries` rule).
- Tests may import what they test.

**Data flow.**

1. The user taps and the `ui` component calls a `state` action.
2. `state` asks a pure `domain` function for the new state and the warnings.
3. `state` saves the result with a `data` repository and publishes it.
4. `ui` renders it.

The interface never computes rules.

## Conventions

- **Strict TypeScript:** no `any`, explicit types on everything exported and `noUncheckedIndexedAccess`.
- **Pure domain:** functions without side effects or state, which receive data and return new data. For expected cases they do not throw: they return the result.
- **One responsibility** per file and per function. ESLint limits:
  - complexity 10 at most;
  - 250 lines per file;
  - 60 lines per function (not applied to tests);
  - 4 parameters;
  - 3 levels of nesting.
- **Function components with hooks,** with typed props and no business logic inside.
- **Data only through repositories.** Never SQL built by concatenating text.
- **Nothing "just in case":** generalise when a second real case appears.
- **Comments** for the why, not the what.
- **Formatting** with Prettier, with no custom configuration.
- **Names:**
  - files in kebab-case, such as `rule-window.ts`;
  - components and types in PascalCase;
  - functions and variables in camelCase;
  - imports with the `@/` alias, which stands for `src/`.
- **Named exports.** The default export is only used in the routes of `src/app/`, because Expo Router requires it.
- **No `console` in `src/`,** because logs could contain player data.
- **No network calls:** `fetch`, `XMLHttpRequest`, `WebSocket` and `EventSource` are forbidden.
- **No comments that disable rules:** neither `eslint-disable` nor `@ts-ignore`.
- **Interface texts** only in `src/i18n/es.json`. ESLint forbids loose text in JSX.

## Glossary

The app is in Spanish, so the first column shows the words the user sees.

| In the app (Spanish)                        | Meaning                                     | In the code                    |
| ------------------------------------------- | ------------------------------------------- | ------------------------------ |
| Equipo                                      | Team                                        | `Team`                         |
| Jugador, dorsal, activo                     | Player, shirt number, active                | `Player`, `number`, `isActive` |
| Partido, convocatoria                       | Match, call-up (players picked for a match) | `Match`, `CallUp`              |
| Variante (4, 6 u 8 periodos)                | Format (4, 6 or 8 periods)                  | `Format`                       |
| Periodo, prórroga                           | Period, overtime                            | `Period`, `Overtime`           |
| Tramo con regla                             | Window of periods with a rule               | `RuleWindow`                   |
| Marca: titular (X) o cambio (X con círculo) | Mark: starter (X) or substitute (circled X) | `Mark`: `starter` or `sub`     |
| Jugado, descansado                          | Played, rested                              | `played`, `rested`             |
| Aviso                                       | Warning                                     | `Warning`                      |

A new concept is added here before it is used in the code.

## Tests

- **Where:** next to the file they test, such as `rule-window.test.ts`. Tests of the screens in `src/app/` go in `tests/app/`, because Expo Router would treat any file in `src/app/` as a route.
- **Name:** starts with the IDs it covers, such as `it('RF-018 E-01: highlights P4 and P5 when the player has 3 X in the window', …)`. That is how traceability works.
- **Thresholds:** 90 % coverage in `src/domain/` and at least 80 % of mutants killed by Stryker.

| Level                  | Tool                         | What for                                                                   |
| ---------------------- | ---------------------------- | -------------------------------------------------------------------------- |
| Rules                  | Jest, with `it.each` tables  | Every requirement (RF) and every example (E)                               |
| Rules with random data | fast-check                   | Properties that always hold, such as never having more than 5 X per period |
| Components and screens | React Native Testing Library | What the user sees and touches                                             |
| Full flows             | Maestro, in `e2e/`           | Real journeys on the simulator                                             |

| Scenario          | What it covers                                         | Example                                                |
| ----------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| Happy path        | What the user is expected to do                        | Mark 5 starters in a period                            |
| Boundaries        | Right on the edge of a rule                            | The third X in the 6-period window: the reds appear    |
| Outside the rules | What the regulations forbid and the app does not block | Fourth X: the player shows in red                      |
| Odd data          | Empty, repeated or extreme                             | Two players with shirt number 7, or an empty name      |
| Sequences         | Several actions in a row                               | Mark, change the format and undo three times           |
| Interruptions     | The app closes halfway                                 | Close with the match half done and open again          |
| Mistakes          | Typical user errors                                    | Remove the X of the player going off in a substitution |

## Traceability

Each requirement is followed from the spec to the commit with the same identifier. `scripts/check-traceability.mjs` fails if a requirement or an example has no test.

| Where               | How it appears                                                                   |
| ------------------- | -------------------------------------------------------------------------------- |
| `spec.md`           | `- **RF-018** · Cell that should not be marked shows light red`                  |
| `spec.md`, examples | `\| E-01 \| Juan with X in P1, P2 and P3 \| P4 and P5 in light red \| RF-018 \|` |
| `tasks.md`          | `- [ ] **T012** · Evaluate red cells (RF-018, E-01, E-02)`                       |
| Test                | `it('RF-018 E-01: highlights P4 and P5 …')`                                      |
| Commit              | `T012 RF-018: highlight periods in light red`                                    |
| `review.md`         | Findings and verification output of T012                                         |

The script checks the IDs of the tasks ticked as done and, when the spec status is "Closed", all of its IDs.

## Visual design

For now there are only basic components and a minimal file with the warning colours. Making the app nicer and easier to use will be a spec of its own later on.
