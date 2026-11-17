# Small change form · Team screen actions on one line

- **Date:** 2026-11-17
- **Branch:** `fix/team-screen-actions`
- **Approved by:** Fernando, 2026-11-17 (chat)

## What

On the team screen, «Editar» leaves the row of actions and becomes a pencil icon on the right of the navigation header, with the accessible label «Editar equipo». The two remaining actions sit in one row at half width each, always on one line: «Nuevo partido» as the primary button (filled blue) and «Nuevo jugador» as the secondary button (blue border, blue text), each at least 44 pt high.

## Why

Found by Fernando on the iPhone simulator (Release build, 2026-11-17): the three actions shared the width in thirds and «Nuevo jugador» and «Nuevo partido» broke into two lines, which looked poor. Fernando chose the layout above among the options offered (2026-11-17, chat): the pencil icon in the header and a primary and a secondary button.

Discarded: three stacked buttons (about 160 pt before the players), a row of three with a smaller font (still tight on a 320 pt phone), the word «Editar» in the header, a «…» menu and a link at the foot of the list.

## How

`src/app/teams/[teamId]/index.tsx` (header right item and the actions row), `src/i18n/es.json` (new key for the accessible label «Editar equipo», approved by Fernando on 2026-11-17), `specs/001-planificador-v1/spec.md` («Spanish texts» table), and their tests. The icon comes from a package already installed (`expo-symbols` or what the Expo SDK 58 docs recommend for both platforms); no new dependency.

## Why it is small

It changes no specified behaviour and does not touch `src/domain/`: the three actions keep doing the same thing and open the same routes; only where «Editar» sits and how the buttons look change.

## Tests

Screen tests that fail before the change: the edit action is found by its accessible label «Editar equipo» in the header and opens the edit form; «Nuevo partido» and «Nuevo jugador» are in the body and open their forms; no action button with the text «Editar» remains in the body. The real look is checked on the iPhone simulator.
