# Spec 001 · Period planner v1

- **Status:** Draft <!-- Draft | Clarified | Approved | In progress | Closed -->
- **Level:** Large
- **Date:** 2026-11-11
- **Approved by:** — <!-- name and date -->
- **Source:** `specs/001-planificador-v1/source-en.md` (Fernando, 2026-11-09, translated from the original Spanish specification).

## Purpose and principles

The app plans which periods each player plays in youth basketball matches and warns about possible breaches of the rules of each format. Planning is done before the match and adjusted freely during it, without saving versions.

Principles of the constitution that weigh most here:

- **1 · Inform, never block.** Any combination of marks can be made even if it breaks the rules. The only limit is that a period never has more than 5 X. The decision always belongs to the coach.
- **2 · Nothing changes by itself.** The app never changes marks on its own. Marks are only deleted when the coach confirms it.
- **3 and 5 · Offline, no data leaving, children's data.** Everything is stored on the device, with no accounts and no sync.
- **4 · Every tap is saved at once.** (Not stated in the source; see Doubts.)
- **6 · Simple.** Little data and few taps.
- **7 · In Spanish.** User-facing texts are quoted in Spanish between «», with an English gloss in brackets.

## Scope

**In**

- An app for iOS and Android, on phone and tablet, in portrait and landscape, that works offline and in Spanish.
- Teams, their players and their matches, stored only on the device. Someone using two devices enters the data on each one.
- The call-up of each match.
- The match grid: marks, undo and overtimes.
- Warnings, colours and the player counter.
- The lists of teams and matches, deletions and confirmations.

**Out**

- Automatic planning proposals and substitution recommendations.
- "Can play" colours (green).
- Statistics and season summaries.
- Sharing, exporting and backups.
- Marking injuries or players fouled out.
- Changing a player's number for a specific match.
- Players shared between teams: they are added to each team separately.
- Custom period configurations.
- Other languages.
- Accounts and sync between devices.
- Any link with the scoreboard app: this app is independent of it.
- Publishing in the stores (the intended use is personal at first; publishing is a long-term goal).

## User stories

The priorities are the ones proposed in the source. With the P1 stories the app can already be used in a match.

### US1 · Create teams and players (P1)

As a coach, I want to save my teams with their players so I don't have to enter them for every match.

Acceptance criteria:

1. When I create a team with a name, category and default format, it appears in the list of teams.
2. When I add a player with a name and number, they appear in the team, sorted by number.
3. If there is already a player with number 7 and I add another one with 7, it is saved and the duplicate-number warning appears.

Requirements: RF-001, RF-011, RF-012, RF-013, RF-014, RF-016, RF-017, RF-069, RF-073.

### US2 · Create a match and its call-up (P1)

As a coach, I want to create a match with the players who are going to play.

Acceptance criteria:

1. In a team whose default format is 6 periods, the new match has 6 periods and today's date.
2. With 12 active players, all 12 are in the call-up when the match is created, and I can deselect those who are not playing.
3. In a 6-period match with 8 players in the call-up, the call-up-outside-the-range warning appears.
4. If I create a player from the match, they stay in the team and in the call-up.

Requirements: RF-005, RF-010, RF-011, RF-012, RF-025, RF-026, RF-027, RF-030, RF-031, RF-032, RF-033, RF-034, RF-035, RF-036, RF-037, RF-068.

### US3 · Plan the periods (P1)

As a coach, I want to mark who starts each period.

Acceptance criteria:

1. In a period with fewer than 5 X, tapping an empty cell marks an X.
2. In a period with no subs, tapping an X removes it.
3. Pressing Undo several times reverts the last actions, one by one.
4. Adding an overtime shows a new column, which can be removed.

Requirements: RF-007, RF-008, RF-011, RF-012, RF-042, RF-043, RF-044, RF-049, RF-054, RF-055, RF-056, RF-057, RF-058, RF-059, RF-070, RF-071, RF-076, RF-077, RF-078, RF-079, RF-080, RF-081.

### US4 · See the rule warnings (P1)

As a coach, I want to see immediately whether the plan breaks the rules.

Acceptance criteria:

1. In 6 periods, if a player has an X in P1, P2 and P3, their P4 and P5 cells are light red.
2. If every period of the window has 5 X and a player only has 1 X, the player is shown in red.
3. A period with 4 X shows the exclamation mark.
4. If the rule can no longer be met with the free cells, the general warning appears.

Requirements: RF-002, RF-003, RF-004, RF-006, RF-007, RF-008, RF-009, RF-011, RF-012, RF-060, RF-061, RF-062, RF-063, RF-064, RF-065, RF-067, RF-072.

### US5 · Record subs during the match (P2)

As a coach, I want to record substitutions during a period without messing up the numbers.

Acceptance criteria:

1. In a rule-window period with 5 X, tapping an empty cell makes the app ask whether it is a sub or a starter.
2. If I answer starter and choose who they replace, that player's X moves to the new player.
3. In a free period with 5 X, tapping an empty cell marks a sub without asking.
4. In a period with a sub, tapping an X shows the reminder before removing it.
5. With a long press on a marked cell I can turn it into a starter or a sub, or remove it.

Requirements: RF-009, RF-011, RF-012, RF-045, RF-046, RF-047, RF-048, RF-050, RF-051, RF-052, RF-053, RF-054, RF-055, RF-066, RF-076, RF-077, RF-078, RF-079, RF-080, RF-081.

### US6 · View, edit and delete matches (P2)

As a coach, I want to view and correct saved matches.

Acceptance criteria:

1. I see all matches with the most recent first, and also each team's matches separately.
2. I can edit the details and the grid of a saved match.
3. Deleting a match asks for confirmation.
4. Changing the format shows the warning, asks for confirmation and deletes the marks in the periods that disappear.

Requirements: RF-001, RF-011, RF-012, RF-025, RF-028, RF-029, RF-038, RF-039, RF-040, RF-041, RF-056, RF-074, RF-075.

### US7 · Keep the squad up to date (P3)

As a coach, I want to keep my teams up to date throughout the season.

Acceptance criteria:

1. Deactivating a player asks for confirmation. Once deactivated, they do not appear in new matches but remain in saved ones.
2. When reactivated, they appear again in new call-ups.
3. Deleting a team asks for confirmation and also deletes its players and its matches.

Requirements: RF-011, RF-012, RF-015, RF-018, RF-019, RF-020, RF-021, RF-022, RF-023, RF-024.

## Functional requirements

<!-- One per line, with this exact format: scripts/check-traceability.mjs reads it. -->

### 1 · Rules

- **RF-001** · There are three formats: 4 periods, 6 periods and 8 periods. Criterion: wherever a format is chosen (team default format, match format), exactly these three options are offered. Stories: US1, US2, US6.
- **RF-002** · Each format has a rule window made of its first periods: P1–P3 in 4 periods, P1–P5 in 6 periods and P1–P6 in 8 periods. Criterion: rule-window warnings are evaluated only on those periods for each format (E-001, E-008, E-009). Stories: US4.
- **RF-003** · The minimum number of periods played in the rule window is 1 in 4 periods, 2 in 6 periods and 2 in 8 periods. Criterion: the too-few-periods-played warning uses these minimums (E-004). Stories: US4.
- **RF-004** · The minimum number of periods rested in the rule window is 1 in 4 periods, 2 in 6 periods and 2 in 8 periods. Criterion: the light red cell and the not-enough-rest warning use these minimums (E-001, E-003, E-008, E-009). Stories: US4.
- **RF-005** · The allowed number of players in the call-up is 8–12 in 4 periods, 9–12 in 6 periods and 8–12 in 8 periods. Criterion: the call-up-outside-the-range warning uses these limits (E-015). Stories: US2.
- **RF-006** · The periods after the rule window and all overtimes are free periods: no rule applies to them and they are never coloured. Criterion: in 8 periods P7 and P8 never get a colour (E-008); in 4 periods P4 never gets a colour (E-009); an overtime never gets a colour. Stories: US4.
- **RF-007** · A period counts as played for a player when their cell has an X (the player starts the period), even if they leave the court during it. Criterion: each X adds one played period to the counter and to the rule-window evaluation (E-004, E-014). Stories: US3, US4.
- **RF-008** · A period counts as rested for a player when their cell is empty (the player does not step on court during the whole period). Criterion: each empty cell adds one rested period to the counter and to the rule-window evaluation (E-001, E-014). Stories: US3, US4.
- **RF-009** · A circled X (the player comes on as a sub during the period, even for one second) counts neither as played nor as rested. Criterion: a circled X adds nothing to played or rested, in the counter or in the rule window (E-002, E-010, E-014). Stories: US4, US5.
- **RF-010** · A call-up with fewer players than the minimum of the format, or with more than 12, is never blocked: the app only warns. Criterion: with 8 players in a 6-period match, and with 13 players in any format, the match can be created and its grid can be marked, and the call-up warning is shown (E-015). Stories: US2.

### 2 · Data: teams, players and matches

- **RF-011** · All data (teams, players and matches) is stored only on the device; the app works without a network connection, without accounts and without sync. Criterion: with no network connection every story can be completed, and there is no sign-in step. Stories: US1, US2, US3, US4, US5, US6, US7.
- **RF-012** · The interface is only in Spanish. Criterion: every text the user sees is in Spanish and there is no language option. Stories: US1, US2, US3, US4, US5, US6, US7.

#### Teams

- **RF-013** · The coach can create a team with a name, a category and a default format (4, 6 or 8 periods). Criterion: after creating it, the team appears in the list of teams with those data. Stories: US1.
- **RF-014** · Several teams can exist at the same time. Criterion: after creating two teams, both appear in the list of teams. Stories: US1.
- **RF-015** · Deleting a team asks for a confirmation that states what will be deleted; on confirming, the team, its players and its matches are deleted. Criterion: after confirming, neither the team, nor its players, nor its matches appear anywhere; after cancelling, nothing changes. Stories: US7.

#### Players

- **RF-016** · The coach can add a player to a team with a name and a number, and the team's players are shown sorted by number. Criterion: after adding players 9, 4 and 7, the team shows them in the order 4, 7, 9. Stories: US1.
- **RF-017** · A player can be saved with the same number as another player of the same team. Criterion: adding a second player with number 7 saves them (and the duplicate-number warning of RF-069 appears). Stories: US1.
- **RF-018** · The coach can change a player's name and number in the team. Criterion: after the change, the team shows the new name and number. Stories: US7.
- **RF-019** · Changing a player's name or number does not change matches already created: they keep the data the player had; matches created afterwards use the new data. Criterion: E-018. Stories: US7.
- **RF-020** · A player belongs to a single team; a person who plays in two teams is added to each team as a separate player. Criterion: the same name and number can be added to two teams, and changing it in one team does not change it in the other. Stories: US7.
- **RF-021** · Players are never deleted individually: they only disappear when their team is deleted. Criterion: there is no action to delete a player; deleting the team removes them (RF-015). Stories: US7.
- **RF-022** · Deactivating a player asks for confirmation; on confirming, the player is deactivated. Criterion: after confirming, the player is shown as deactivated in the team; after cancelling, they stay active. Stories: US7.
- **RF-023** · A deactivated player does not appear in new call-ups and is not offered when adding players to a call-up, but remains, with their marks, in the matches already saved. Criterion: after deactivating Ana, a new match does not include her and she cannot be added to it; a saved match that included her still shows her and her marks. Stories: US7.
- **RF-024** · A deactivated player can be reactivated, and then appears again in new call-ups. Criterion: after reactivating Ana, a new match includes her in the call-up. Stories: US7.

#### Matches

- **RF-025** · Each match belongs to a team and holds a format, a date, a time, a home team name, an away team name, an optional final score, notes and its added overtimes, together with its call-up and its grid. Criterion: all these data can be entered, and they are shown unchanged when the match is opened again. Stories: US2, US6.
- **RF-026** · The date of a new match is today by default and can be changed. Criterion: a match created on 2026-11-11 shows that date; it can be changed to another date and keeps it. Stories: US2.
- **RF-027** · The home and away team names are free text, with a quick option to put the coach's own team as home or as away. Criterion: any text can be typed in each field; using the quick option fills the chosen field with the own team. Stories: US2.
- **RF-028** · A saved match can be edited: its details and its grid. Criterion: after changing a detail or a mark of a saved match and opening it again, the change is there. Stories: US6.
- **RF-029** · Deleting a match asks for confirmation; on confirming, the match and its grid are deleted. Criterion: after confirming, the match no longer appears in any list; after cancelling, nothing changes. Stories: US6.

### 3 · Call-up

- **RF-030** · When a match is created, all the active players of the team are selected in its call-up, and no deactivated player is. Criterion: in a team with 12 active players and 1 deactivated, the new match starts with exactly the 12 active ones. Stories: US2.
- **RF-031** · When creating the match, the coach can deselect the players who are not playing; this only affects that match. Criterion: a player deselected in one match is still in the team and is selected by default in the next new match. Stories: US2.
- **RF-032** · Players can be added to the call-up of an existing match, and only active players of the team are offered. Criterion: when adding, the deactivated players of the team are not offered; the added player appears in the grid. Stories: US2.
- **RF-033** · Players can be removed from the call-up of an existing match. Criterion: after removing a player, their row no longer appears in that match's grid. Stories: US2.
- **RF-034** · Removing from the call-up a player who already has marked cells asks for confirmation; on confirming, their marks in that match are deleted. Criterion: E-017; after cancelling, the player and their marks stay. Stories: US2.
- **RF-035** · A new player can be created from the match: they are added to the team and to the call-up. Criterion: the new player appears in the team and in the grid of that match. Stories: US2.

### 4 · Match format

- **RF-036** · A new match takes the team's default format. Criterion: in a team whose default format is 6 periods, the new match has 6 periods. Stories: US2.
- **RF-037** · Changing a team's default format only affects matches created afterwards. Criterion: after changing the default from 6 to 8 periods, existing matches keep their format and a new match has 8 periods. Stories: US2.
- **RF-038** · The format of a match can be changed to any of the three formats at any time, before or during the match. Criterion: a match can be changed between 4, 6 and 8 periods in any direction. Stories: US6.
- **RF-039** · Changing the format of a match always shows a general warning that information may be lost and asks for confirmation; on cancelling, nothing changes. Criterion: the warning and the confirmation appear on every format change, even when no mark would be lost (E-016). Stories: US6.
- **RF-040** · On confirming a format change, the marks in the periods that still exist are kept and the marks in the periods that disappear are deleted. Criterion: E-016; changing from 8 to 4 periods keeps the marks of P1–P4. Stories: US6.
- **RF-041** · On a format change, the added overtimes are kept, with their marks, after the new last period. Criterion: a 6-period match with 1 overtime changed to 4 periods shows P1–P4 followed by the overtime with its marks. Stories: US6.

### 5 · Grid and marking

- **RF-042** · The grid has one row per player in the call-up, sorted by number, and one column per period of the format followed by one column per added overtime. Criterion: a 6-period match with 1 overtime and 10 players shows 10 rows sorted by number and 7 columns. Stories: US3.
- **RF-043** · Each cell is in one of three states: empty (rested), X (starts the period) or circled X (comes on as a sub). Criterion: every cell always shows exactly one of the three states. Stories: US3.
- **RF-044** · Tapping an empty cell in a period with fewer than 5 X marks an X. Criterion: in a period with 4 X, tapping an empty cell leaves it with an X and the period with 5 X. Stories: US3.
- **RF-045** · Tapping an empty cell in a rule-window period that already has 5 X asks «¿Entra de cambio o es titular en lugar de otro?» [Is this player coming on as a sub, or starting in place of someone else?], with the options sub and starter. Criterion: E-011. Stories: US5.
- **RF-046** · Answering sub to the question of RF-045 marks a circled X in the tapped cell. Criterion: after answering sub, the cell shows a circled X and the period still has 5 X. Stories: US5.
- **RF-047** · Answering starter to the question of RF-045 lets the coach choose which X it replaces; the tapped cell gets an X and the chosen player's X is removed, both in a single step. Criterion: after choosing Eva, the tapped cell has an X, Eva's cell is empty and the period still has 5 X. Stories: US5.
- **RF-048** · Tapping an empty cell in a free period or an overtime that already has 5 X marks a circled X without asking. Criterion: E-012. Stories: US5.
- **RF-049** · Tapping an X in a period with no sub removes the X. Criterion: in a period with 5 X and no circled X, tapping an X leaves the cell empty and the period with 4 X. Stories: US3.
- **RF-050** · Tapping an X in a period with some sub shows the reminder «Si ha salido por un cambio, déjala marcada: sigue contando como jugado» [If they left the court for a sub, keep it marked: it still counts as played], with the options remove anyway and cancel. Criterion: E-013; on cancelling, the X stays. Stories: US5.
- **RF-051** · Tapping a circled X removes it, in any period. Criterion: after tapping a circled X, the cell is empty. Stories: US5.
- **RF-052** · A long press on a marked cell (X or circled X) opens the menu «Titular» [Starter], «Entró de cambio» [Came on as a sub], «Quitar» [Remove], which changes the cell to X, to circled X or to empty, respectively. Criterion: a long press on a circled X and choosing «Titular» in a period with 4 X leaves an X; choosing «Entró de cambio» on an X leaves a circled X; choosing «Quitar» leaves the cell empty. Stories: US5.
- **RF-053** · Choosing «Titular» [Starter] in the long-press menu when the period already has 5 X asks which X it replaces, as in RF-047. Criterion: in a period with 5 X, turning a circled X into «Titular» asks which X it replaces and the period still has 5 X. Stories: US5.
- **RF-054** · The app never changes marks on its own: when an X is removed, no circled X becomes an X automatically. Criterion: in E-013, after removing Eva's X the sub stays as a circled X and the period has 4 X. Stories: US3, US5.
- **RF-055** · A period can never have more than 5 X; this is the only limit on marking. Criterion: no sequence of taps, long presses, format changes or undos leaves any period with 6 X or more. Stories: US3, US5.
- **RF-056** · The grid can be edited freely before and during the match, and no versions of the plan are saved. Criterion: marks can be changed at any moment and only the current state of the grid is kept. Stories: US3, US6.

### 6 · Undo and overtimes

- **RF-057** · An Undo button undoes the last action, and it can be pressed several times in a row to undo earlier actions, one by one. Criterion: after marking three cells and pressing Undo three times, the grid is as before the first mark. Stories: US3.
- **RF-058** · The «Añadir prórroga» [Add overtime] button adds an overtime column after the last column, and as many overtimes as needed can be added. Criterion: pressing it twice in a 6-period match shows 8 columns. Stories: US3.
- **RF-059** · An added overtime can be removed. Criterion: after removing the only overtime of a 6-period match, the grid shows 6 columns. Stories: US3.

### 7 · Warnings and colours

- **RF-060** · Warnings are recalculated on every tap and never prevent marking. Criterion: after each change of the grid, the call-up or the format, the warnings shown match the new state, and every mark that does not create a sixth X is made even if it breaks a rule. Stories: US4.
- **RF-061** · By default everything is white: there is no green colour and there are no recommendations. Criterion: a grid with no warnings has no coloured cell or player, and the app never suggests who should play. Stories: US4.
- **RF-062** · An empty rule-window cell of a player whose rests in the window are already at the minimum (so that marking it would leave them below it) shows a light red background. Criterion: E-001, E-002, E-003, E-008, E-009, E-010. Stories: US4.
- **RF-063** · A player whose rests in the rule window are already below the minimum is shown in red, immediately. Criterion: E-003; for example 4 X in the first 5 periods of a 6-period match. Stories: US4.
- **RF-064** · A player who is missing periods played in the rule window is shown in red only when every period of the window already has 5 X; while any period of the window has fewer than 5 X, it is not shown. Criterion: E-004 and E-005. Stories: US4.
- **RF-065** · A period with fewer than 5 X (incomplete period) shows an exclamation mark in its column header. Criterion: E-007; a period with 4 X shows it and a period with 5 X does not. Stories: US4.
- **RF-066** · A period with a sub and fewer than 5 X (inconsistent period) shows its own warning in the column header, different from the incomplete-period one. Criterion: E-013. Stories: US5.
- **RF-067** · When, with the free cells left in the rule window, there is no longer any way to complete the periods with 5 X while meeting everyone's minimums, a general warning is shown above the grid. Criterion: E-006 shows it; E-007 does not. Stories: US4.
- **RF-068** · When the number of players in the call-up is below the minimum of the format or above 12, a warning is shown in the match. Criterion: E-015; with 9 or 12 players in a 6-period match it is not shown, with 8 or 13 it is. Stories: US2.
- **RF-069** · When two players of the same team have the same number, a warning is shown in the team. Criterion: with two players with number 7 the warning is shown; after changing one of them to 8 it disappears. Stories: US1.

### 8 · Player counter

- **RF-070** · Each player shows a counter of the periods played and rested over the whole match, overtimes included, in the form «J 3 · D 3» [P 3 · R 3: played 3, rested 3]. Criterion: E-014. Stories: US3.
- **RF-071** · A sub adds neither to played nor to rested in the counter, so played plus rested can be lower than the number of columns. Criterion: E-014; a player with one circled X in a 6-period match with no overtime has played plus rested equal to 5. Stories: US3.
- **RF-072** · Colours and player warnings only look at the rule window, while the counter looks at the whole match. Criterion: marks in free periods and overtimes change the counter but never the light red cells or the player in red (E-008, E-014). Stories: US4.

### 9 · Lists, deletions and confirmations

- **RF-073** · When the app opens, the list of teams is shown. Criterion: opening the app shows the list of teams first. Stories: US1.
- **RF-074** · There is a list with every match of every team, sorted by date with the most recent first. Criterion: with matches of two teams on 2026-11-01, 2026-11-08 and 2026-11-15, the list shows all of them in the order 15, 8, 1. Stories: US6.
- **RF-075** · Each team has a list of its own matches, sorted by date with the most recent first. Criterion: the list of a team shows only its matches, the most recent first. Stories: US6.

### 10 · Phone and tablet

- **RF-076** · The app works in portrait and landscape, on phone and on tablet. Criterion: every story can be completed on a phone and on a tablet, in both orientations. Stories: US3, US5.
- **RF-077** · On a phone in portrait, the player column stays fixed, showing the number and name of each player with the counter below. Criterion: when the grid scrolls horizontally, the player column with number, name and counter stays visible. Stories: US3, US5.
- **RF-078** · Grid cells are never narrower than 44 points; when the columns do not fit at that width, the grid scrolls horizontally. Criterion: on a phone in portrait, an 8-period match, and any match with overtimes that do not fit, scrolls horizontally with cells of at least 44 points. Stories: US3, US5.
- **RF-079** · On a phone in portrait, 4-period and 6-period matches fit across without scrolling horizontally. Criterion: a 4-period and a 6-period match without overtimes show every period without horizontal scroll. Stories: US3, US5.
- **RF-080** · On a phone in landscape, all periods fit across; if the players do not fit, the grid scrolls vertically. Criterion: an 8-period match shows every period without horizontal scroll; with 12 players that do not fit, the grid scrolls vertically. Stories: US3, US5.
- **RF-081** · On a tablet, the whole grid fits in both orientations. Criterion: an 8-period match with 12 players shows every cell without scrolling, in portrait and in landscape. Stories: US3, US5.

## Examples

<!-- The ID goes in the first column: scripts/check-traceability.mjs reads it. -->

| ID    | Situation                                                                                               | Expected result                                                                         | Requirements                                   |
| ----- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------- |
| E-001 | 6 periods. Juan has an X in P1, P2 and P3.                                                              | Juan's P4 and P5 are light red.                                                         | RF-002, RF-004, RF-008, RF-062                 |
| E-002 | 6 periods. Juan has an X in P1 and P2 and a sub in P3.                                                  | Juan's P4 and P5 are light red, because the sub does not count as a rest.               | RF-004, RF-009, RF-062                         |
| E-003 | 6 periods. Juan has an X in P1, P2, P3 and P4.                                                          | Juan in red and P5 light red.                                                           | RF-004, RF-062, RF-063                         |
| E-004 | 6 periods. P1–P5 have 5 X each and Pedro only has an X in P1.                                           | Pedro in red: he is one period played short.                                            | RF-003, RF-007, RF-064                         |
| E-005 | 6 periods. P1–P4 have 5 X, P5 has 3 X and Pedro only has an X in P1.                                    | Pedro is not in red, because the window is not complete.                                | RF-064                                         |
| E-006 | 6 periods. P1–P4 have 5 X and P5 has 4 X. Pedro and Luis have 1 X each and neither is in P5.            | Rule-impossible warning: one slot is left for two players who need it.                  | RF-003, RF-067                                 |
| E-007 | 6 periods. 10 players in the call-up; in P1–P4 each has 2 X and P5 is empty.                            | Only the exclamation mark on P5. Any combination of 5 in P5 meets the rule.             | RF-062, RF-065, RF-067                         |
| E-008 | 8 periods. Juan has an X in P1, P2, P3 and P4.                                                          | Juan's P5 and P6 are light red; P7 and P8 have no colour.                               | RF-002, RF-004, RF-006, RF-062, RF-072         |
| E-009 | 4 periods. Juan has an X in P1 and P2.                                                                  | Juan's P3 is light red; P4 has no colour.                                               | RF-002, RF-004, RF-006, RF-062                 |
| E-010 | 4 periods. Juan has an X in P1 and a sub in P2.                                                         | Juan's P3 is light red.                                                                 | RF-009, RF-062                                 |
| E-011 | 6 periods. P2 has 5 X and you tap Ana's empty cell.                                                     | The app asks whether it is a sub or a starter.                                          | RF-045                                         |
| E-012 | 6 periods. P6 has 5 X and you tap Ana's empty cell.                                                     | A sub is marked without asking.                                                         | RF-006, RF-048                                 |
| E-013 | 6 periods. P3 has 5 X and a sub, and you tap Eva's X.                                                   | The reminder appears. If you remove it anyway, the inconsistent-period warning appears. | RF-050, RF-054, RF-066                         |
| E-014 | 6 periods + 1 overtime. Juan has an X in P1, P3 and P6, a sub in P5, and P2, P4 and the overtime empty. | Counter «J 3 · D 3» [P 3 · R 3].                                                        | RF-007, RF-008, RF-009, RF-070, RF-071, RF-072 |
| E-015 | 6 periods. There are 8 players in the call-up.                                                          | Call-up-outside-the-range warning (minimum 9).                                          | RF-005, RF-010, RF-068                         |
| E-016 | 8 → 4 periods. You change the format with marks in P5–P8.                                               | General warning and confirmation. On confirming, the marks in P5–P8 are deleted.        | RF-039, RF-040                                 |
| E-017 | Any format. You remove Ana, who has marks, from the call-up.                                            | Confirmation. On confirming, her marks are deleted.                                     | RF-034                                         |
| E-018 | Any format. You change Juan's number from 7 to 9 in the team.                                           | Matches already created still show 7; new ones show 9.                                  | RF-018, RF-019                                 |

## Source coverage

Every section and bullet of `source-en.md`, with the requirements that cover it.

| Source section         | Source item                                                                                 | Covered by                                 |
| ---------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Purpose and principles | Plans which periods each player plays and warns about breaches                              | US3, US4, RF-042, RF-060                   |
| Purpose and principles | It informs and warns; it never blocks; single limit of 5 X per period                       | RF-010, RF-055, RF-060                     |
| Purpose and principles | Before and during the match, adjusted freely, without saving versions                       | RF-038, RF-056                             |
| Purpose and principles | Nothing changes on its own; marks only deleted when the coach confirms                      | RF-015, RF-029, RF-034, RF-039, RF-054     |
| Purpose and principles | Simple: little data and few taps                                                            | Principle (constitution 6); no requirement |
| Scope                  | iOS and Android, phone and tablet, offline, Spanish                                         | RF-011, RF-012, RF-076                     |
| Scope                  | Data: everything on the device, no accounts, no sync, two devices enter data on each        | RF-011                                     |
| Scope                  | Intended use: personal first, stores in the long term                                       | Out of scope (context)                     |
| Scope                  | Independent of the scoreboard app                                                           | Out of scope                               |
| Scope                  | Technology decided after the specification                                                  | Out of scope (ADR-001)                     |
| Out of scope for v1    | Automatic proposals and substitution recommendations                                        | Out of scope; RF-061                       |
| Out of scope for v1    | "Can play" colours (green)                                                                  | Out of scope; RF-061                       |
| Out of scope for v1    | Statistics and season summaries                                                             | Out of scope                               |
| Out of scope for v1    | Sharing, exporting and backups                                                              | Out of scope                               |
| Out of scope for v1    | Marking injuries or players fouled out                                                      | Out of scope                               |
| Out of scope for v1    | Changing a player's number for a specific match                                             | Out of scope; RF-019                       |
| Out of scope for v1    | Players shared between teams                                                                | Out of scope; RF-020                       |
| Out of scope for v1    | Custom period configurations                                                                | Out of scope; RF-001                       |
| Out of scope for v1    | Other languages                                                                             | Out of scope; RF-012                       |
| Rules                  | Three formats; first periods form the rule window; the rest and overtimes are free          | RF-001, RF-002, RF-006                     |
| Rules (table)          | Rule window per format                                                                      | RF-002                                     |
| Rules (table)          | Min. periods played                                                                         | RF-003                                     |
| Rules (table)          | Min. periods rested                                                                         | RF-004                                     |
| Rules (table)          | Players in the call-up                                                                      | RF-005                                     |
| Rules                  | There are always 5 players on court                                                         | RF-055, RF-065                             |
| Rules                  | Played                                                                                      | RF-007                                     |
| Rules                  | Rested                                                                                      | RF-008                                     |
| Rules                  | Sub                                                                                         | RF-009                                     |
| Rules                  | Free periods and overtimes: no restrictions                                                 | RF-006, RF-072                             |
| Rules                  | Call-up outside the allowed range: the app only warns                                       | RF-010, RF-068                             |
| Rules                  | How often subs happen                                                                       | Context; reflected in RF-045 and RF-048    |
| Data                   | Teams, players and matches; each match has its call-up and grid                             | RF-025, RF-030, RF-042                     |
| Data · Team            | Name, category, default format                                                              | RF-013                                     |
| Data · Team            | There can be several                                                                        | RF-014                                     |
| Data · Team            | Deleted with confirmation, with its players and matches                                     | RF-015                                     |
| Data · Player          | Name, number, active or deactivated                                                         | RF-016, RF-022, RF-024                     |
| Data · Player          | Never deleted; deactivated with confirmation; can be reactivated                            | RF-021, RF-022, RF-024                     |
| Data · Player          | Deactivated: not in new call-ups, remains in saved matches                                  | RF-023                                     |
| Data · Player          | The number does not change per match                                                        | RF-019; Out of scope                       |
| Data · Player          | Same number: warning                                                                        | RF-017, RF-069                             |
| Data · Player          | Plays in two teams: added to each one                                                       | RF-020                                     |
| Data · Player          | Name or number changed: matches already created keep their data                             | RF-018, RF-019                             |
| Data · Match           | Format, date, time, home, away, final score (optional), notes, added overtimes              | RF-025                                     |
| Data · Match           | Date defaults to today and can be changed                                                   | RF-026                                     |
| Data · Match           | Home and away free text, quick option to put yourself                                       | RF-027                                     |
| Data · Match           | Edited and deleted; deleting asks for confirmation                                          | RF-028, RF-029                             |
| Call-up                | All active players selected at creation; the coach deselects; only that match               | RF-030, RF-031                             |
| Call-up                | Added or removed later; only active players offered                                         | RF-032, RF-033                             |
| Call-up                | Removing a player with marks asks for confirmation and deletes them                         | RF-034                                     |
| Call-up                | New player from the match: added to the team and the call-up                                | RF-035                                     |
| Call-up                | Outside the range: warning                                                                  | RF-068                                     |
| Match format           | Takes the team default; changeable at any time; team default only affects new matches       | RF-036, RF-037, RF-038                     |
| Match format           | Always a general warning and confirmation                                                   | RF-039                                     |
| Match format           | Marks kept in surviving periods, deleted in disappearing ones                               | RF-040                                     |
| Match format           | Overtimes kept with their marks after the new last period                                   | RF-041                                     |
| Grid                   | Rows: call-up sorted by number; columns: periods and overtimes                              | RF-042                                     |
| Grid                   | Three cell states                                                                           | RF-043                                     |
| Grid (table)           | Tap empty cell, fewer than 5 X                                                              | RF-044                                     |
| Grid (table)           | Tap empty cell, rule-window period with 5 X: question, sub or starter replacing an X        | RF-045, RF-046, RF-047                     |
| Grid (table)           | Tap empty cell, free period or overtime with 5 X                                            | RF-048                                     |
| Grid (table)           | Tap an X, no sub                                                                            | RF-049                                     |
| Grid (table)           | Tap an X, some sub: reminder                                                                | RF-050                                     |
| Grid (table)           | Tap a circled X                                                                             | RF-051                                     |
| Grid (table)           | Long press on a marked cell: menu; «Titular» with 5 X asks which X                          | RF-052, RF-053                             |
| Grid                   | Undo                                                                                        | RF-057                                     |
| Grid                   | Nothing changes on its own; never a sixth X                                                 | RF-054, RF-055                             |
| Grid                   | Overtimes: add as many as needed, remove those added by mistake                             | RF-058, RF-059                             |
| Grid                   | Free editing before and during the match                                                    | RF-056                                     |
| Warnings               | Recalculated on every tap; never prevent marking                                            | RF-060                                     |
| Warnings               | White by default; no green; no recommendations; free periods and overtimes never coloured   | RF-061, RF-006                             |
| Warnings (table)       | Cell that should not be marked                                                              | RF-062                                     |
| Warnings (table)       | Player without enough rest                                                                  | RF-063                                     |
| Warnings (table)       | Player with too few periods played                                                          | RF-064                                     |
| Warnings (table)       | Incomplete period                                                                           | RF-065                                     |
| Warnings (table)       | Inconsistent period                                                                         | RF-066                                     |
| Warnings (table)       | Rule impossible to meet                                                                     | RF-067                                     |
| Warnings (table)       | Call-up outside the range                                                                   | RF-068                                     |
| Warnings (table)       | Duplicate number                                                                            | RF-069                                     |
| Player counter         | Played and rested over the whole match, overtimes included                                  | RF-070                                     |
| Player counter         | A sub adds to neither                                                                       | RF-071                                     |
| Player counter         | Colours only look at the rule window                                                        | RF-072                                     |
| Lists                  | Teams list on opening                                                                       | RF-073                                     |
| Lists                  | Two match lists, most recent first: all teams and per team                                  | RF-074, RF-075                             |
| Lists (table)          | Delete a team                                                                               | RF-015                                     |
| Lists (table)          | Delete a match                                                                              | RF-029                                     |
| Lists (table)          | Remove a player with marks from the call-up                                                 | RF-034                                     |
| Lists (table)          | Change the format of a match                                                                | RF-039, RF-040                             |
| Lists (table)          | Deactivate a player                                                                         | RF-022, RF-023                             |
| Lists                  | Players cannot be deleted                                                                   | RF-021                                     |
| Phone and tablet       | Portrait and landscape, phone and tablet                                                    | RF-076                                     |
| Phone and tablet       | Phone in portrait: fixed player column; 4 and 6 fit; 8 and overtimes scroll; 44-point cells | RF-077, RF-078, RF-079                     |
| Phone and tablet       | Phone in landscape: all periods fit; vertical scroll if players do not fit                  | RF-080                                     |
| Phone and tablet       | Tablet: everything fits in both orientations                                                | RF-081                                     |
| User stories           | US1–US7 with their acceptance criteria                                                      | US1–US7                                    |
| Rule examples          | Examples 1–18                                                                               | E-001–E-018                                |

## Doubts

### Rules and warnings

- [DOUBT] What counts as the "rests in the window" of a player: the empty cells they still have in the rule window, including periods that are not complete yet (as E-001 and E-003 suggest, where P4 and P5 are empty and not yet decided), or only the rests that are already certain? (RF-062, RF-063)
- [DOUBT] The light red cell is defined for rests "already at the minimum", but E-003 also shows P5 light red when the rests are already below the minimum. Is the condition "at or below the minimum"? (RF-062)
- [DOUBT] Exact definition of "rule impossible to meet": are the "free cells" only the empty cells, with the existing X and circled X fixed? Does it consider both the played and the rested minimums of every player? Is it shown together with a player already in red (E-003 and E-004 do not mention it), and can it appear when every period of the window already has 5 X? (RF-067)
- [DOUBT] E-007 says "only the exclamation mark on P5", although P6 is also empty in that example. Does the incomplete-period warning only apply to rule-window periods, or also to free periods and overtimes? (RF-065)
- [DOUBT] Does the inconsistent-period warning apply to free periods and overtimes too, where subs are frequent? (RF-066)
- [DOUBT] A period with a sub and fewer than 5 X is both incomplete and inconsistent. Are both warnings shown, or only the inconsistent one? (RF-065, RF-066)
- [DOUBT] Both "player without enough rest" and "player with too few periods played" look the same (player in red). Should the coach be able to tell which of the two it is? (RF-063, RF-064)
- [DOUBT] Does the duplicate-number warning also count deactivated players? (RF-069)
- [DOUBT] Is the call-up-outside-the-range warning also shown while selecting the call-up when creating the match, and where exactly "in the match"? (RF-068)

### Grid and marking

- [DOUBT] What does a long press on an empty cell do: nothing, the same as a tap, or a menu? (RF-052)
- [DOUBT] Does the long-press menu always show the three options, including the one matching the current state of the cell? (RF-052)
- [DOUBT] Choosing «Quitar» [Remove] on an X in a period with a sub: does the reminder of RF-050 appear, as when tapping? (RF-052, RF-050)
- [DOUBT] Can the question «¿Entra de cambio o es titular en lugar de otro?» and the choice of which X is replaced be cancelled, leaving the grid as it was? The source only lists the options sub and starter. (RF-045, RF-047, RF-053)
- [DOUBT] When answering starter, the cell of the replaced player becomes empty (US5 criterion 2: "that player's X moves to the new player"). Confirm that it becomes empty and not a circled X. (RF-047)

### Undo and overtimes

- [DOUBT] Scope of undo: does it cover only marks, or also call-up changes, overtimes added or removed, format changes and match details? Are deletions confirmed by the coach (remove anyway, remove a player with marks, format change) undoable? Is the starter replacement, which changes two cells "in a single step", undone in one press? Is the history per match, and does it survive leaving the grid or closing the app? (RF-057, RF-047)
- [DOUBT] Removing an overtime that has marks: does it ask for confirmation (constitution principle 2 says marks are only deleted when the coach confirms)? Can any overtime be removed or only the last one? (RF-059)

### Data and validation

- [DOUBT] Player validation: are the name and the number required? What range is allowed for the number (for example 0–99), and are "0" and "00" different numbers? (RF-016, RF-017)
- [DOUBT] Team validation: are the name and category required? Is the category free text or chosen from a list? (RF-013)
- [DOUBT] Match validation: are the time, the home and away names and the notes required or optional (only the final score is marked optional)? What is the format of the final score? (RF-025)
- [DOUBT] The quick option to "put yourself as home or away": is "yourself" the team name, the name plus the category, or something else? (RF-027)
- [DOUBT] Can a team's name and category be edited? The source only implies that its default format can be changed. (RF-013, RF-037)
- [DOUBT] Does reactivating a player ask for confirmation? (RF-024)
- [DOUBT] If a player's name or number changes and the player is then added to the call-up of a match created before the change, which data does that match show? (RF-019, RF-032)
- [DOUBT] Removing from the call-up a player with no marks: is it done without confirmation? (RF-033)
- [DOUBT] Sorting by number with a tie (duplicate number): what is the second criterion, for example the name? (RF-016, RF-042)
- [DOUBT] In what order is the list of teams shown? (RF-073)
- [DOUBT] What does each match show in the match lists (date, time, home and away, score, team…)? With two matches on the same date, does the time decide the order? (RF-074, RF-075)

### Phone and tablet

- [DOUBT] "With 8 periods and overtimes, the grid scrolls horizontally": on a phone in portrait, must a 4- or 6-period match with overtimes fit, or does it scroll when the 44-point minimum is not met? Which smallest phone is the reference for "fits"? (RF-078, RF-079)
- [DOUBT] Phone in landscape and tablet: "everything fits" also with overtimes, given that there is no limit on the number of overtimes? (RF-080, RF-081)
- [DOUBT] In landscape and on tablet, does the player column also show the number, the name and the counter below, and does it stay fixed when scrolling? (RF-077, RF-080, RF-081)

### Texts and terms

- [DOUBT] The source only gives a few Spanish texts («¿Entra de cambio o es titular en lugar de otro?», «Si ha salido por un cambio, déjala marcada: sigue contando como jugado», «Añadir prórroga», «Titular», «Entró de cambio», «Quitar», «J 3 · D 3»). Who provides the rest (column headers for periods and overtimes, the general format-change warning, every confirmation, every warning, the options sub, starter, remove anyway and cancel, the Undo button, the team-deletion text "stating what will be deleted")? (RF-015, RF-039, RF-045, RF-050, RF-057, RF-060)
- [DOUBT] The source was translated from Spanish. Confirm that the glossary terms keep the rule meaning used here: played = X (jugado), rested = empty cell (descansado), sub = circled X (cambio), starter = X (titular), rule window (tramo con regla), call-up (convocatoria), format (variante), overtime (prórroga), mark (marca), active (activo). (RF-007, RF-008, RF-009, RF-002)
- [DOUBT] New terms not in the glossary, to be confirmed with their Spanish word before they are added: free period, grid, cell, light red cell, player in red, counter, category, default format, home team, away team, final score, notes, deactivated, incomplete period, inconsistent period, rule impossible to meet, call-up range, duplicate number. (RF-006, RF-013, RF-022, RF-025, RF-042, RF-062, RF-065, RF-066, RF-067, RF-070)

### Process and constitution

- [DOUBT] Constitution principle 4 ("every tap is saved at once; if the app closes mid-match, everything is as it was on return") is not stated in the source. Should it be an explicit requirement of this spec, with its own example? (RF-056, RF-057)
- [DOUBT] The source calls the story priorities "proposed". Are P1 for US1–US4, P2 for US5–US6 and P3 for US7 confirmed? (US1–US7)
- [DOUBT] The examples use three-digit IDs (E-001…E-018), as requested, but `scripts/check-traceability.mjs` only recognises two-digit IDs (`E-\d{2}`) and `docs/architecture.md` shows `E-01`. With three digits the script does not detect these examples. Should the script and the architecture be updated, or should the examples use E-01…E-18? (Examples)

## Clarifications

| Date | Question | Developer's answer |
| ---- | -------- | ------------------ |

## Change history

| Date       | Change                          | Level |
| ---------- | ------------------------------- | ----- |
| 2026-11-11 | First draft from `source-en.md` | Large |
