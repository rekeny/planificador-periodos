# Small change form · The team screens no longer update the shared store while rendering (F-03)

- **Date:** 2026-11-21
- **Branch:** `fix/team-forms-render-updates`
- **Approved by:** Fernando, 2026-11-21 (chat)

## What

The team screen, the edit-team form and the new-player form open their team in the shared squad store from the focus effect of the route, and not from inside a render. For the coach nothing changes: the same screens, texts and data. What goes is a React warning, «Cannot update a component (`TeamScreen`) while rendering a different component», that appears in development when a team form is opened over the team screen. The change is in `src/app/teams/[teamId]/index.tsx`, `edit.tsx` and `players/new.tsx`, and in one small hook they share.

## Why

Finding F-03 of the Codex review of 2026-11-18 (M-01 of the review of 2026-11-17), accepted by Fernando as pending for its own `fix/` branch (`review.md`). The three routes call `store.getState().openTeam(id)` inside a `useState(() => …)` initialiser «before the first render reads the store». That call publishes a Zustand update while a component is rendering, and the team screen, which stays mounted under the form and subscribes to the same store, is notified in the middle of the form's render. React's rule is that a render must not update another component. It is reproduced by three new tests (opening the edit form and the new-player form of the same team over the team screen, and a second team's screen over the first), which read the warning from `console.error` and fail today.

Why it matters beyond the warning: updating a store during render is unsupported in React and can show an inconsistent screen in future versions of React; the warning also hides real ones in the development console.

Approach, and what is discarded:

- **Chosen:** a hook `useOpenRouteTeam(id, store, mode)` in `src/ui/`. It calls `openTeam` from `useFocusEffect` (already used by the three routes for the refocus case) and tells the screen when it has done it. Until then the route draws nothing, so a team left in the store by an earlier screen is never shown and never receives a player (the reason the initialiser existed). `mode` keeps the difference that exists today: the team screen opens its team on every focus (players created from a match show on Back), the two forms only when the store holds another team. After that the guards of the routes stay as they are: an unknown or unreadable team still shows «No se ha encontrado».
- **Discarded:** dropping the initialiser and keeping the render guard as the only protection. The first frame would show «No se ha encontrado» until the effect runs (a flash of an error on every open). Also discarded: putting the opening in the store (`openTeam` returning a promise or a new `status`): it moves a UI timing problem into the state layer and touches `squad-store.ts` and its tests.

## How

- `src/ui/use-open-route-team.ts` (new): the hook, about 25 lines.
- `src/app/teams/[teamId]/index.tsx`, `edit.tsx`, `players/new.tsx`: call the hook instead of the `useState` initialiser and the local `useFocusEffect`; draw nothing (`null`) until it reports ready; the rest is unchanged.
- `tests/app/team-forms.render-updates.test.tsx` (new, already written; three of its five tests fail now): no `Cannot update a component` warning when opening the forms and the second team's screen; the edit form of another team shows that team's data; an unknown team shows the not-found text.
- The existing tests of these routes (`team-screen.*`, `edit-team.*`, `new-team.*`, `team-forms.two-teams`) must keep passing without changes: they are the proof that the data shown and saved is the same.

No change in `src/domain/`, `src/state/`, `es.json`, dependencies, the spec or what any screen saves or validates.

## Why it is small

It changes no specified behaviour and does not touch `src/domain/`. Three routes of the interface change how they open the team they show, and the screens keep their fields, messages and buttons.

## Tests

The three new tests fail today with the real React warning and pass after the change; the other two (a second team's edit form shows its data, an unknown team shows the not-found text) pass before and after, to keep those cases as they are. The 905 and more existing tests of the screens must stay green. There is no native proof to run: the warning exists only in development, and it is read in Jest from `console.error`. **Not covered:** a device. The first frame of each route is now empty instead of drawn: on a device it lasts as long as an effect takes to run, before the next paint; it is checked on the Android emulator by opening the three screens.
