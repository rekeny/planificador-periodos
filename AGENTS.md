# AGENTS.md · Planificador de periodos

Rules for any agent or person working in this repository, with any tool or model. If a tool needs its own instructions file, such as `CLAUDE.md`, that file only imports this one: there are no rules here that belong to a single tool.

## The project

An iOS and Android app, for phones and tablets, that helps youth basketball coaches plan which periods each player plays. It warns about breaches of the rules of each format (4, 6 or 8 periods). It works offline, stores everything on the device, is in Spanish and never blocks the coach, except for the limit of 5 X per period.

## Before anything else, read

1. This file.
2. `docs/constitution.md`: the non-negotiable principles.
3. `docs/architecture.md`: the stack, the layers, the conventions and the glossary.
4. The affected spec, in `specs/NNN-name/`.
5. Your role in `.agents/roles/`, if you act as one.

## Languages

- **English in the repository:** code, identifiers, comments, test names, script messages, file names, commits, documentation, specs, ADRs, reports and PRs (ADR-003).
- **Spanish in the app:** the user interface texts live only in `src/i18n/es.json`, never written in the code.
- **Spanish in the chat:** explanations and questions to the developer are given in the conversation in Spanish; what is saved in the repository is written in English.
- Domain names always come from the glossary in `docs/architecture.md`.

## How to ask for work

- **Large:** "New spec: <request>". The orchestrator launches the Specifier.
- **Medium:** "Change in specs/NNN: <request>". The orchestrator updates the spec with the Specifier and continues from phase 3.
- **Small:** "Small change: <request>". The orchestrator fills in the short form and waits for approval.

## Change levels

Before touching anything, declare the level. When in doubt, go one level up. No level touches code without the developer's approval.

| Level  | Examples                                                               | Mandatory phases                                                                                      |
| ------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Small  | Fix a text, a colour or a bug without changing the specified behaviour | Approved short form (`.agents/templates/small-change.md`) → Tests → Implement → Verify → Codex review |
| Medium | Change something that already exists                                   | Update the spec and follow the flow from phase 3                                                      |
| Large  | New feature                                                            | Full flow, with a new folder in `specs/`                                                              |

- Anything that touches `src/domain/` is at least medium.
- The reviewer may reclassify the level.

## Workflow

| #   | Phase               | Role                                        | Deliverable                                                                        | Gate to move on                                                                         |
| --- | ------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | Specify             | Specifier                                   | `spec.md` with stories, RF requirements and E examples; every gap marked `[DOUBT]` | —                                                                                       |
| 2   | Clarify             | Clarifier                                   | `spec.md` without `[DOUBT]`, with the answers recorded and dated                   | The developer has answered every doubt                                                  |
| 3   | Plan                | Planner                                     | `plan.md`, starting with the "before" explanation, and `tasks.md`                  | —                                                                                       |
| 4   | Analyse and approve | Reviewer and developer                      | Consistency analysis in `review.md`; approval recorded in `spec.md` and `plan.md`  | **The developer approves the spec and the plan. No code is touched before this point.** |
| 5   | Design tests        | Test designer                               | Scenarios for each task in `tasks.md`                                              | Every acceptance criterion has scenarios                                                |
| 6   | Implement           | Test designer and Implementer, task by task | For each task: red tests, code, green verification and commit                      | `scripts/verify.sh` green                                                               |
| 7   | Verify              | Verifier                                    | Verification output in `review.md`                                                 | All green                                                                               |
| 8   | Review              | Reviewer (Codex) and Security               | Findings in `review.md`                                                            | No blocking finding                                                                     |
| 9   | Close               | Developer                                   | Device test, `summary.md` and merged PR                                            | The developer accepts the result                                                        |

**Going back.** If the developer does not approve in phase 4, the plan is fixed (phase 3). If verification fails or there is a blocking finding in phase 8, implementation starts again (phase 6). A small change enters phase 5 with its approved form; a medium one enters phase 3.

**Cycle of each task in phase 6.**

1. The Test designer writes the task's tests from its scenarios and checks that they fail for the right reason.
2. The Implementer writes the minimum code to make them pass and runs `scripts/verify.sh`.
3. A single commit holds the tests and the code.

This way tests always come before code and the branch never piles up red tests.

## Roles

| Role          | File                             | Phases                  |
| ------------- | -------------------------------- | ----------------------- |
| Specifier     | `.agents/roles/specifier.md`     | 1                       |
| Clarifier     | `.agents/roles/clarifier.md`     | 2                       |
| Planner       | `.agents/roles/planner.md`       | 3                       |
| Test designer | `.agents/roles/test-designer.md` | 5 and 6                 |
| Implementer   | `.agents/roles/implementer.md`   | 6                       |
| Verifier      | `.agents/roles/verifier.md`      | 7                       |
| Reviewer      | `.agents/roles/reviewer.md`      | 4 and 8                 |
| Security      | `.agents/roles/security.md`      | 8 and before publishing |

- The main session acts as the **orchestrator**: it launches each role in its phase, passes it only what it needs and does not move on if the phase gate is not met.
- Roles do not talk to the developer: they return their questions to the orchestrator, who asks them.
- In Claude Code, each role is a subagent in `.claude/agents/`. In other tools, the role file is pasted as the prompt.
- Whoever writes something does not review it.

## The 17 rules of every prompt

**When starting**

1. Read `AGENTS.md`, `docs/constitution.md` and the affected spec before proposing anything.
2. Declare the change level and which spec and tasks it touches.
3. If the request contradicts the spec, stop and ask. The spec rules until it is changed.
4. Explain what will be done, how and why. Do not touch code until the developer approves the spec and the plan.

**While working**

5. One task at a time, in the order of `tasks.md`.
6. Do not invent requirements, data or behaviour. Whatever is not written down is asked and marked `[DOUBT]`.
7. Tests are written before the code and cover everything the user can do. Nobody deletes or weakens them. Their name carries the requirement and example ID.
8. The rules of the regulations live only in `src/domain/`. The interface does not compute rules.
9. The texts the user sees go in `src/i18n/es.json`, never in the code.
10. No new dependency without recording it in `plan.md` with its reason.
11. Do not change the constitution or the architecture without an approved ADR.
12. Respect the layers, the conventions and the glossary in `docs/architecture.md`.

**When finishing**

13. `scripts/verify.sh` green, with its output attached. Without that output, the task is not done.
14. One commit per task, with the format `T012 RF-018: description`.
15. Tick the task in `tasks.md` and record what is left pending.
16. Whoever implemented does not review. The code review is done by Codex with `scripts/review.sh`, and the Security role audits if the change touches dependencies, data, navigation or configuration.
17. Finish with the report of what was done, how and why, and also save it in `summary.md`.

## Explanations before and after

The developer uses this project to learn. Every implementation is explained twice, in plain language.

|             | Before running                                                       | After running                               |
| ----------- | -------------------------------------------------------------------- | ------------------------------------------- |
| Where       | At the start of `plan.md` and in the chat, with the approval request | In the chat and in `summary.md`             |
| What        | What will be done, in two or three sentences                         | What was done and what changes for the user |
| How         | Steps and files that will be touched                                 | Files touched and new pieces                |
| Why         | Why this way and which alternatives are discarded                    | Decisions made along the way and why        |
| To learn    | TypeScript, React or Expo concepts that will appear                  | Those concepts explained with the real code |
| To check it | What the developer will have to test                                 | Steps or commands to see it working         |
| Pending     | Doubts that need an answer                                           | Risks or tasks left                         |

Codex checks during the review that the explanations match what was really done.

## Branches, commits and PRs

- **Branches:** one per spec, named after its folder, such as `001-period-planner-v1`. Small changes use `fix/short-description`.
- **Commits:** one per task, such as `T012 RF-018: highlight periods in light red`. If the task has no requirement: `T001: description`.
- **`main` is protected:** merges only through a PR with the GitHub Actions verification green. Every PR uses the template `.github/pull_request_template.md`.
- **Merging:** PRs are merged with a merge commit, to keep the commits of each task.

## Verification and review

- **`scripts/verify.sh`** (or `npm run verify`) checks:
  - types, lint and formatting;
  - that no focused or skipped tests are left;
  - tests with coverage and traceability;
  - the database, once it exists;
  - Expo Doctor;
  - mutation testing, if `src/domain/` changes;
  - dependencies, secrets and static analysis.

  The agent runs it when finishing each task, and GitHub Actions on every PR. With `FORCE_MUTATION=1`, mutation testing runs even if the domain does not change.

- **`scripts/review.sh specs/NNN-name`** launches the Codex review of the branch against `main` and saves the output in `specs/NNN-name/codex-review.md`. It takes several minutes: launch it with a long timeout or in the background.
- **The developer** can also use the Codex plugin in Claude Code: `/codex:review --base main` and `/codex:adversarial-review --base main <focus>`.

## Commands

| Command                                                 | What for                                                                         |
| ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `npm run ios` / `npm run android`                       | Build and install the app on the simulator or emulator, and start the dev server |
| `npm start`                                             | Only the dev server, with the app already installed                              |
| `npm test`                                              | Tests                                                                            |
| `npm run test:coverage`                                 | Tests with coverage                                                              |
| `npm run test:mutation`                                 | Mutation testing of `src/domain/`                                                |
| `npm run verify`                                        | Full verification                                                                |
| `npm run typecheck` / `npm run lint` / `npm run format` | Single checks and formatting                                                     |

## Expo

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

### Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

### Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

### Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

### Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

### Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
