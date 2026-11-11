# Planificador de periodos

An iOS and Android app that helps youth basketball coaches plan which periods each player plays. It warns when the plan breaks the rules of the format (4, 6 or 8 periods), without ever blocking. It works offline and all data stays on the device. The app is in Spanish.

**Status:** in development. Phase 0 sets up the project; the first feature arrives with spec 001.

## How it is built

- **Technology:** Expo (React Native) with strict TypeScript and Expo Router. The stack and the layers are in [`docs/architecture.md`](docs/architecture.md).
- **Process:** spec-driven development with AI agents. The rules are in [`AGENTS.md`](AGENTS.md), the principles in [`docs/constitution.md`](docs/constitution.md) and each feature in [`specs/`](specs/).
- **Review:** the code review is done by Codex; the automatic verification, by [`scripts/verify.sh`](scripts/verify.sh).

## Local setup

Requirements:

- macOS with Xcode and an iOS simulator;
- Android Studio with an emulator;
- Node, in the version of `.nvmrc`;
- CocoaPods;
- gitleaks, osv-scanner and semgrep (`brew install cocoapods gitleaks osv-scanner semgrep`).

```bash
npm install
npm run ios       # iOS simulator
npm run android   # Android emulator
npm run verify    # full verification
```

## Structure

```text
src/app/      screens and navigation
src/ui/       components that render
src/state/    match session and undo
src/data/     database and repositories
src/domain/   rules of the regulations, pure
src/i18n/     Spanish texts
specs/        one folder per spec
docs/         constitution, architecture, security and decisions
.agents/      agent roles and templates
```

## Licence

No licence: the code is public to read, but all rights are reserved.
