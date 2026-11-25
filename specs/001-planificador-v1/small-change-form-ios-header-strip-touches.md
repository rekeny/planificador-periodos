# Small change form · The strip under the iOS navigation header takes touches (F-D3-01)

- **Date:** 2026-11-23
- **Branch:** `fix/ios-header-strip-touches`
- **Approved by:** Fernando, 2026-11-23 (chat)

## Outcome (2026-11-23): closed without a fix

The finding does not reproduce. On the Release build of `main` (iPhone 17, iOS 27.2, 2026-11-23) a Maestro flow created a team with six and then nine players and a match, opened «Convocatoria» and tapped the middle of the first «Quitar de la convocatoria»: it worked in three runs in a row, with the range banner above the first row (one run) and with the first row right under the header (two runs). The header ends above the first row; the two do not overlap. Probable explanations, not proven: a later change fixed it (the opaque header of 2026-11-16, the form scrolling of F-01), or the loss of 2026-11-20 came from a tap right after a screen transition (the US2 flow already notes one lost right after a new player was created). Fernando decided on 2026-11-23 (chat, «Cerrar sin arreglo») to close it with no change of code: no branch is merged, and the check that the first field or button of each new modal screen takes a tap stays in the device pass of T079 (D3 rule 15). The branch `fix/ios-header-strip-touches` was never pushed and is deleted.

## What

On iOS, a tap on a button or field that sits in the strip just under the navigation header is lost. The change makes the whole screen area below the header take touches, wherever the cause is found (the options the root layout gives to the stack in `src/app/_layout.tsx`, or the content container of the screens that sit under the header).

## Why

Finding 1 of the Maestro run on iOS of 2026-11-20 (`review.md`, «Findings about the app, outside this change»): in the call-up screen the first «Quitar de la convocatoria» button sits half inside that strip, and a tap in its middle was lost in four runs. Fernando decided on 2026-11-21 (chat, «Cambio pequeño aparte») that it is fixed in its own small change, merged before T072, because D3 adds two more modal screens with a header (the match details and the player screen) whose first field or button could fall in the same strip (`plan.md` and `tasks.md`, D3 rule 15, open item `F-D3-01`).

The cause is **not established yet**. The first step is to reproduce it on the iPhone 17 simulator with the Release build (the call-up screen, first row), and to find which view covers the strip. Hypotheses to check, in this order: (1) the header of iOS 26 draws a scroll-edge or blur view over the content that takes the touches even with `headerTransparent: false`; (2) the content container starts under the header and the first row is drawn below an invisible view of the header's height; (3) a style of one screen (padding or a negative margin) pushes its first row into the strip.

Approach and what is discarded:

- **Chosen:** the narrowest fix the reproduction supports, in the root layout's options or in the shared container, so every screen is fixed at once and no screen carries a workaround.
- **Discarded:** a spacer or extra padding in each screen (it hides the symptom for one screen and the next modal screen has it again), and a new dependency.
- **If the cause is in a library (react-native-screens or the system header) and the only way is a patch or an upgrade:** I come back to you before choosing, because that is a dependency decision (rule 10 of `AGENTS.md`).

## How

- `src/app/_layout.tsx` (the stack's options) or the shared content container, depending on the cause; nothing else if the first is enough.
- `tests/app/layout.header.test.tsx` (the existing test of the header options) or a new test next to the container, for what Jest can see.
- A Maestro check of the real behaviour, written in the scratchpad and run on the simulator: tap the middle of the first «Quitar de la convocatoria» of the call-up screen, four runs in a row. It is added to `e2e/` only if you ask for it.

No change in `src/domain/`, in `es.json`, in dependencies (unless you approve it as above), in the spec or in what any screen saves or validates.

## Why it is small

It changes no specified behaviour (RF-076 already asks that every button is reachable) and does not touch `src/domain/`. It changes how the touch area of a native header is arranged, in one place.

## Tests

Jest has no layout engine and no touch hit-testing, so its test fails before the change only on what it can see: the option or style that the reproduction shows to be the cause (for example, a prop that the stack lacks, or the container's offset). The real proof is the simulator: before the change, a tap in the middle of the first «Quitar de la convocatoria» of the call-up screen is lost (four runs of 2026-11-20); after it, the tap works in four runs in a row, in portrait and in landscape. **Not covered:** Android (the strip is an iOS finding), the iPad, and a real device.
