# Device checklist · D2 and D3 close (2026-11-25)

One session on the devices closes T094, T057, T092 and the device part of T060 and T079. Write the results in `review.md` (device, system version, build, result of each line). A line that fails is a finding `F-D3-NN` for phase 6.

**Devices:** an iPhone, the 5th-generation iPad, an Android phone and, if possible, an Android tablet (emulator). **Build:** Release (`npx expo run:ios --configuration Release --device`, `npx expo run:android --variant release`), about 10 GB of free disk for iOS.

## 1 · Grid on phone and tablet (T057, RF-076 to RF-081)

For each device, in portrait and landscape:

- [ ] 6 periods, 10 players, no overtime, iPhone portrait (375 pt): every period shown, no horizontal scroll (RF-079).
- [ ] 8 periods on a 375 pt phone in portrait: horizontal scroll, cells of at least 44 pt (RF-078).
- [ ] iPad landscape, 12 players with every banner and the legend: no vertical scroll. 13 players: every period across, vertical scroll in landscape, none in portrait (RF-081).
- [ ] Phone landscape, 13 players and 2 overtimes: both scrolls; the player column and the counters stay visible.
- [ ] A very long player name is cut with an ellipsis; 15 players in landscape scroll vertically.
- [ ] Rotate portrait, landscape, portrait with marks: same marks, sizes recomputed, player column fixed. Rotate with the call-up screen and with the overtime dialog open: they stay.
- [ ] Scroll the grid sideways and down, then tap a cell: the tapped cell is the one marked; every button is reachable.
- [ ] By eye: the light red cells and the players in red show on the three devices (Maestro checks only text).

## 2 · Questions, long-press menu and dialogs (T094, RF-045 to RF-053)

- [ ] Each of the four dialogs (question, choice of the replaced X with five starters, removal reminder, cell menu) on each device and orientation: every option and «Cancelar» inside the screen; closes with «Cancelar», a tap outside and, on Android, Back, changing nothing.
- [ ] iPhone in landscape (the React Native `Modal` shows portrait by default): the dialogs keep their options.
- [ ] Long names in the choice are cut but told apart by number.
- [ ] A question that closes after an answer does not flash closed and open (iOS), and the content does not flicker while it fades.
- [ ] A long press neither scrolls the grid nor marks the cell; a scroll never opens the menu; a long press that drags across cells opens no menu and marks nothing.
- [ ] Rotate with each dialog open: it stays, with its options.

## 3 · Time of the match (T092, RF-083)

- [ ] iPhone and Android: a new match starts with «Sin hora» and «Añadir hora»; «Añadir hora» opens the picker at 12:00; «Quitar hora» goes back to no time; the saved time shows in the lists and in the details.
- [ ] A match of 29 March 2026 at 02:30 shows 02:30 (daylight-saving day).

## 4 · D3 screens, on iOS especially (T079, F-D3-01 closed without a fix)

- [ ] The top field or button of the match details («Variante»), the player screen («Nombre») and the edit-team form take a tap (the strip under the header did not reproduce in the simulator; a real device may differ).
- [ ] «Editar» sits next to «Convocatoria» on the match screen and every button is reachable at 375 × 667 with an overtime and in landscape (Jest cannot measure distances).
- [ ] «Todos los partidos» sits next to «Nuevo equipo» in the list of teams.
- [ ] Details with the keyboard open on «Notas»: «Guardar» and «Borrar partido» are reachable by scrolling. Player screen with the keyboard open on «Dorsal»: «Guardar» and «Desactivar» reachable.
- [ ] Open a match from the team's list, from the list of every match; delete it from its details: you land on the screen below the grid, with no «no encontrado» flash and without the match listed.
- [ ] Delete a team from its edit form: you land on the list of teams without it, and its matches are gone from «Todos los partidos».
- [ ] Save the edit-team form opened over the team screen: you go back to the team (a Jest-only difference was seen: Jest ended on the list).
- [ ] The team screen with 13 players and 10 matches scrolls as one list on a phone (`initialNumToRender={40}`).

## 5 · Performance on the iPad (T060, RF-087)

1. Release build on the 5th-generation iPad. 2. A team with 12 players and an 8-period match with all of them called up. 3. Film the iPad from the side with a phone in slow motion at 240 fps. 4. Tap 20 different empty cells, some in the rule window and some in free periods. 5. For each tap count the frames between the finger touching the glass and the X showing (24 frames or fewer is 100 ms or less). 6. Write the worst of the 20, the iPad model, the iOS version and the build in `review.md`. Over 100 ms is a blocking finding (repaint of the grid).

## 6 · Whole match, offline and languages (T079, RF-011, RF-012)

- [ ] A whole match played in airplane mode: every text in Spanish, on a device set to Spanish and on one set to English (the Android date and time dialogs follow the device language: risk accepted on 2026-11-14).
- [ ] A deep link to a path with no route (SEC-T061-4): note what the app shows.
- [ ] iOS backups of the data (`copias de seguridad`, E-028) and the Android calendar in English, from T061, if not checked yet.

## What the assistant does meanwhile (not on the device)

- T060: run `e2e/us4-warnings.yaml` on the Android tablet emulator (it was written for a tablet screen).
- T079: Security audit and Codex review of D3 part 1 (T062 to T066, merged in PR 24): the audit and the two Codex runs of 2026-11-25 covered only the diff of PR 25; part 1 has the first use of `react-native-gesture-handler` in `src/` and must be covered too (`scripts/review.sh specs/001-planificador-v1 866d988`).
- T061 and T079: close the documents once your results are in `review.md`.
