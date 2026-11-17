# Small change form · Opaque navigation header on iOS 26

- **Date:** 2026-11-16
- **Branch:** `001-planificador-v1-d2` (the defect is in D2, which is not merged yet; approved instead of a `fix/` branch)
- **Approved by:** Fernando, 2026-11-16 (chat)

## What

Every Stack screen gets an opaque navigation header (`headerTransparent: false` in the root layout's screen options), so the content of every screen starts below the header on iOS 26.

## Why

Found by Fernando on the iPad simulator (Release build, iOS 26): after creating a team, the team list was drawn behind the «Equipos» header and could not be seen or tapped. With Liquid Glass, Expo Router makes the header transparent when no header background is set (`useHeaderConfigProps`, `usesSystemBackground`), so the content of every screen (team list, team, call-up, forms, grid) starts behind the header. The D2 height budgets already assume content below the header. Jest has no layout engine, so no test saw it.

Discarded: moving the content screen by screen (about six screens and the landscape budgets to review) and `enableLegacyHeaderAppearance()` (deprecated by Expo Router).

## How

`src/app/_layout.tsx` (screen options of the root `Stack`) and its test.

## Why it is small

It changes no specified behaviour and does not touch `src/domain/`. The headers keep their titles and buttons; only the header background becomes opaque.

## Tests

A test that reads the options the root layout gives to every route and expects `headerTransparent: false`; it fails before the change. The real look is checked on the iPad simulator with a Release build.
