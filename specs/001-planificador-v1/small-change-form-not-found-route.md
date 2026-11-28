# Small change form · A screen for an address the app does not have

- **Date:** 2026-11-26
- **Branch:** `fix/not-found-route`
- **Approved by:** Fernando, 2026-11-26 (chat)

## What

The app gets a `+not-found` route, the screen Expo Router shows when an address matches no route (a stale deep link, a typo in a link). It shows the header title «Pantalla no encontrada» (from the options table of the layout), the message «Esta dirección no existe en la app.» and a button «Volver a los equipos» that goes to the list of teams with `router.replace("/")`.

## Why

Today an unknown address shows Expo Router's default not-found screen, in English and with no way back that fits the app. The app is in Spanish and its texts live in `src/i18n/es.json`.

## How

- `src/app/+not-found.tsx`: the route, with a default export as Expo Router requires. It only renders the texts and the button.
- `src/i18n/es.json`: three new keys in the existing `notFound` group, next to `notFound.message` (the one the `NotFound` component uses for a screen whose team or match is gone, which does not change): `title`, `screenMessage` and `back`.
- `src/app/_layout.tsx`: one row in the options table, `"+not-found"`, with the title from `notFound.title` (D2 rule 8: the options of every route are in that table).
- `tests/app/not-found.test.tsx` (new) and one case in `tests/app/layout.options.test.tsx`.

No change in `src/domain/`, the spec, dependencies or `package-lock.json`.

## Why it is small

It adds no specified behaviour and touches no rule: it is the fallback screen for an address that no requirement mentions, with approved texts, and it does not touch `src/domain/`.

## Tests

- **Red first:** opening an unknown address shows none of the three texts (the router's default screen), the button does not exist, and the options table gives the title «Equipos» to `+not-found`.
- **Green after:** the screen shows the three texts, they equal the values in `es.json`, the button replaces the route with `/` (the list of teams shows and there is nothing to go back to), and the layout gives `+not-found` the title «Pantalla no encontrada» with an opaque header.
