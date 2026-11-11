# Period Planner — Functional specification v1

2026-11-09 · Fernando

> Translated from the original Spanish specification. The app's user interface is Spanish only, so every text the user sees is kept in Spanish between «», followed by an English gloss in brackets.

## Purpose and principles

The app plans which periods each player plays in youth basketball games and warns about possible breaches of the rules of each format.

- **It informs and warns; it never blocks.** Any combination can be marked even if it breaks the rules, with a single limit: a period never has more than 5 X. The decision always belongs to the coach.
- **Before and during the match.** Planning is done in advance and adjusted freely during the match, without saving versions.
- **Nothing changes on its own.** The app never changes marks by itself. Marks are only deleted when the coach confirms it.
- **Simple.** Little data and few taps.

## Scope

v1 is an app for iOS and Android, on phone and tablet, that works offline and in Spanish.

- **Data:** everything is stored on the device. No accounts and no sync. Someone using two devices enters the data on each one.
- **Intended use:** personal at first. In the long term, publication in the stores for any coach.
- **Independent** of the scoreboard app.
- **Technology:** decided after this specification is closed.

**Out of scope for v1**

- Automatic planning proposals and substitution recommendations.
- "Can play" colours (green).
- Statistics and season summaries.
- Sharing, exporting and backups.
- Marking injuries or players fouled out.
- Changing a player's number for a specific match.
- Players shared between teams: they are added to each team separately.
- Custom period configurations.
- Other languages.

## Rules

There are three formats. In each one, the first periods are subject to rules (the rule window) and the rest, together with overtimes, are free.

| Format    | Rule window | Min. periods played | Min. periods rested | Players in the call-up |
| --------- | ----------- | ------------------- | ------------------- | ---------------------- |
| 4 periods | 1st–3rd     | 1                   | 1                   | 8–12                   |
| 6 periods | 1st–5th     | 2                   | 2                   | 9–12                   |
| 8 periods | 1st–6th     | 2                   | 2                   | 8–12                   |

- **There are always 5 players on court.**
- **Played:** the player starts the period. If they leave the court during the period, that period still counts as played.
- **Rested:** the player does not step on court during the whole period.
- **Sub (substitution):** the player comes on during the period, even for one second. That period counts neither as played nor as rested.
- **Free periods and overtimes:** no restrictions at all.
- **Call-up outside the allowed range:** with fewer players than the minimum the match is forfeited, and more than 12 cannot be registered. The app only warns.
- **How often subs happen:** in the rule window they are rare (injury or 5 fouls). In free periods and overtimes, players are substituted freely.

## Data

The app stores teams, their players and their matches. Each match has its call-up and its grid.

| Item   | Data                                                                                               | Rules                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------ | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Team   | Name, category, default format (4, 6 or 8 periods)                                                 | There can be several. It can be deleted with confirmation, and then its players and matches are deleted too.                                                                                                                                                                                                                                                                                                         |
| Player | Name, number, active or deactivated                                                                | Never deleted: it is deactivated, with confirmation, and can be reactivated. A deactivated player does not appear in new call-ups but remains in saved matches. The number does not change per match. If two players of the team have the same number, a warning is shown. A player who plays in two teams is added to each one. If their name or number is changed, matches already created keep the data they had. |
| Match  | Format, date, time, home team name, away team name, final score (optional), notes, added overtimes | The date defaults to today and can be changed. Home and away are free text, with a quick option to put yourself as home or away. It can be edited and deleted; deleting asks for confirmation.                                                                                                                                                                                                                       |

**Call-up**

- When the match is created, all active players of the team are selected, and the coach deselects those who are not playing. This only affects that match.
- Players can be added or removed later, for last-minute changes. Only active players are offered when adding.
- Removing a player who already has marked cells asks for confirmation and deletes their marks.
- A new player can be created from the match; they are added to the team and to the call-up.
- If the number of players in the call-up is outside the range of the format, a warning is shown.

**Match format**

- It takes the team's default format and can be changed to any of the three at any time. Changing the team's default format only affects new matches.
- Changing it always shows a general warning that information may be lost, and asks for confirmation.
- Marks in periods that still exist are kept. Marks in periods that disappear are deleted.
  - Added overtimes are kept, with their marks, after the new last period.

## Grid: how marking works

Each row is a player in the call-up, sorted by number, and each column is a period of the format or an overtime. Each cell has three states: **empty** (rested), **X** (starts the period) and **circled X** (comes on as a sub).

| Action                      | Situation of the period          | Result                                                                                                                                                                                                                                                                                           |
| --------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tap an empty cell           | Fewer than 5 X                   | An X is marked.                                                                                                                                                                                                                                                                                  |
| Tap an empty cell           | Rule-window period with 5 X      | There are already 5 starters, so the app asks: «¿Entra de cambio o es titular en lugar de otro?» [Is this player coming on as a sub, or starting in place of someone else?]. Sub: a circled X is marked. Starter: the coach chooses which X it replaces, and both cells change in a single step. |
| Tap an empty cell           | Free period or overtime with 5 X | A circled X is marked, without asking.                                                                                                                                                                                                                                                           |
| Tap an X                    | No sub in the period             | The X is removed.                                                                                                                                                                                                                                                                                |
| Tap an X                    | Some sub in the period           | Reminder: «Si ha salido por un cambio, déjala marcada: sigue contando como jugado» [If they left the court for a sub, keep it marked: it still counts as played]. Options: remove anyway, or cancel.                                                                                             |
| Tap a circled X             | Any                              | It is removed.                                                                                                                                                                                                                                                                                   |
| Long press on a marked cell | Any                              | Menu: «Titular» [Starter], «Entró de cambio» [Came on as a sub], «Quitar» [Remove]. It is used to correct the type of mark. If the period already has 5 X, choosing «Titular» asks which X it replaces.                                                                                          |

- **Undo:** a button undoes the last action, and it can be pressed several times in a row to undo earlier actions, one by one.
- **Nothing changes on its own:** when an X is removed, no sub becomes an X automatically. And a period can never have a sixth X.
- **Overtimes:** the «Añadir prórroga» [Add overtime] button adds a column. As many as needed can be added, and those added by mistake can be removed.
- **Free editing** before and during the match.

## Warnings, colours and counter

Warnings are recalculated on every tap and never prevent marking. By default everything is white: there is no green and there are no recommendations, and free periods and overtimes are never coloured.

| Warning                            | When it appears                                                                                                                        | How it looks                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Cell that should not be marked     | Empty rule-window cell of a player whose rests in the window are already at the minimum: marking it would leave them below it.         | Light red background on the cell                                               |
| Player without enough rest         | Their rests in the window are already below the minimum, for example 4 X in the first 5 periods. It appears immediately.               | Player in red                                                                  |
| Player with too few periods played | They are missing periods played and every period of the window already has 5 X. While any period is still incomplete, it is not shown. | Player in red                                                                  |
| Incomplete period                  | The period has fewer than 5 X.                                                                                                         | Exclamation mark in the column header                                          |
| Inconsistent period                | The period has a sub but fewer than 5 X. Usually the X of the player who left was removed.                                             | Its own warning in the column header, different from the incomplete-period one |
| Rule impossible to meet            | With the free cells left in the window, there is no longer any way to complete the periods with 5 X while meeting everyone's minimums. | General warning above the grid                                                 |
| Call-up outside the range          | Fewer players than the minimum, or more than 12.                                                                                       | Warning in the match                                                           |
| Duplicate number                   | Two players of the same team have the same number.                                                                                     | Warning in the team                                                            |

**Player counter**

- It shows the periods played and rested over the whole match, overtimes included: «J 3 · D 3» [P 3 · R 3: played 3, rested 3].
- A sub adds neither to played nor to rested, so played + rested can be lower than the number of periods.
- The colours, on the other hand, only look at the rule window.

## Lists, deletions and confirmations

When the app opens, the list of teams is shown. There are two match lists, both sorted by date with the most recent first: one with every match of every team, and one per team.

| Action                                      | Confirmation                      | Effect                                            |
| ------------------------------------------- | --------------------------------- | ------------------------------------------------- |
| Delete a team                               | Yes, stating what will be deleted | The team, its players and its matches are deleted |
| Delete a match                              | Yes                               | The match and its grid are deleted                |
| Remove a player with marks from the call-up | Yes                               | Their marks in that match are deleted             |
| Change the format of a match                | Yes, with a general warning       | Marks in the periods that disappear are deleted   |
| Deactivate a player                         | Yes                               | They no longer appear in new call-ups             |

Players cannot be deleted: they only disappear when their team is deleted.

## Phone and tablet

The app works in portrait and landscape, on phone and tablet.

- **Phone in portrait:** the player column stays fixed, with number and name and the counter below. With 4 and 6 periods everything fits. With 8 periods and overtimes, the grid scrolls horizontally, because cells would be about 35 points wide, below the 44 recommended for touch.
- **Phone in landscape:** all periods fit across. If the 12 players do not fit, the grid scrolls vertically.
- **Tablet:** everything fits in both orientations.

## User stories

There are seven stories, with a proposed priority: with the P1 stories the app can already be used in a match.

### US1 · Create teams and players (P1)

As a coach, I want to save my teams with their players so I don't have to enter them for every match.

1. When I create a team with a name, category and default format, it appears in the list of teams.
2. When I add a player with a name and number, they appear in the team, sorted by number.
3. If there is already a player with number 7 and I add another one with 7, it is saved and the duplicate-number warning appears.

### US2 · Create a match and its call-up (P1)

As a coach, I want to create a match with the players who are going to play.

1. In a team whose default format is 6 periods, the new match has 6 periods and today's date.
2. With 12 active players, all 12 are in the call-up when the match is created, and I can deselect those who are not playing.
3. In a 6-period match with 8 players in the call-up, the call-up-outside-the-range warning appears.
4. If I create a player from the match, they stay in the team and in the call-up.

### US3 · Plan the periods (P1)

As a coach, I want to mark who starts each period.

1. In a period with fewer than 5 X, tapping an empty cell marks an X.
2. In a period with no subs, tapping an X removes it.
3. Pressing Undo several times reverts the last actions, one by one.
4. Adding an overtime shows a new column, which can be removed.

### US4 · See the rule warnings (P1)

As a coach, I want to see immediately whether the plan breaks the rules.

1. In 6 periods, if a player has an X in P1, P2 and P3, their P4 and P5 cells are light red.
2. If every period of the window has 5 X and a player only has 1 X, the player is shown in red.
3. A period with 4 X shows the exclamation mark.
4. If the rule can no longer be met with the free cells, the general warning appears.

### US5 · Record subs during the match (P2)

As a coach, I want to record substitutions during a period without messing up the numbers.

1. In a rule-window period with 5 X, tapping an empty cell makes the app ask whether it is a sub or a starter.
2. If I answer starter and choose who they replace, that player's X moves to the new player.
3. In a free period with 5 X, tapping an empty cell marks a sub without asking.
4. In a period with a sub, tapping an X shows the reminder before removing it.
5. With a long press on a marked cell I can turn it into a starter or a sub, or remove it.

### US6 · View, edit and delete matches (P2)

As a coach, I want to view and correct saved matches.

1. I see all matches with the most recent first, and also each team's matches separately.
2. I can edit the details and the grid of a saved match.
3. Deleting a match asks for confirmation.
4. Changing the format shows the warning, asks for confirmation and deletes the marks in the periods that disappear.

### US7 · Keep the squad up to date (P3)

As a coach, I want to keep my teams up to date throughout the season.

1. Deactivating a player asks for confirmation. Once deactivated, they do not appear in new matches but remain in saved ones.
2. When reactivated, they appear again in new call-ups.
3. Deleting a team asks for confirmation and also deletes its players and its matches.

## Rule examples

Each row is a test case: in that situation, the app must show exactly that result.

| #   | Format         | Situation                                                                         | Expected result                                                                         |
| --- | -------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | 6              | Juan has an X in P1, P2 and P3.                                                   | Juan's P4 and P5 are light red.                                                         |
| 2   | 6              | Juan has an X in P1 and P2 and a sub in P3.                                       | Juan's P4 and P5 are light red, because the sub does not count as a rest.               |
| 3   | 6              | Juan has an X in P1, P2, P3 and P4.                                               | Juan in red and P5 light red.                                                           |
| 4   | 6              | P1–P5 have 5 X each and Pedro only has an X in P1.                                | Pedro in red: he is one period played short.                                            |
| 5   | 6              | P1–P4 have 5 X, P5 has 3 X and Pedro only has an X in P1.                         | Pedro is not in red, because the window is not complete.                                |
| 6   | 6              | P1–P4 have 5 X and P5 has 4 X. Pedro and Luis have 1 X each and neither is in P5. | Rule-impossible warning: one slot is left for two players who need it.                  |
| 7   | 6              | 10 players in the call-up; in P1–P4 each has 2 X and P5 is empty.                 | Only the exclamation mark on P5. Any combination of 5 in P5 meets the rule.             |
| 8   | 8              | Juan has an X in P1, P2, P3 and P4.                                               | Juan's P5 and P6 are light red; P7 and P8 have no colour.                               |
| 9   | 4              | Juan has an X in P1 and P2.                                                       | Juan's P3 is light red; P4 has no colour.                                               |
| 10  | 4              | Juan has an X in P1 and a sub in P2.                                              | Juan's P3 is light red.                                                                 |
| 11  | 6              | P2 has 5 X and you tap Ana's empty cell.                                          | The app asks whether it is a sub or a starter.                                          |
| 12  | 6              | P6 has 5 X and you tap Ana's empty cell.                                          | A sub is marked without asking.                                                         |
| 13  | 6              | P3 has 5 X and a sub, and you tap Eva's X.                                        | The reminder appears. If you remove it anyway, the inconsistent-period warning appears. |
| 14  | 6 + 1 overtime | Juan has an X in P1, P3 and P6, a sub in P5, and P2, P4 and the overtime empty.   | Counter «J 3 · D 3».                                                                    |
| 15  | 6              | There are 8 players in the call-up.                                               | Call-up-outside-the-range warning (minimum 9).                                          |
| 16  | 8 → 4          | You change the format with marks in P5–P8.                                        | General warning and confirmation. On confirming, the marks in P5–P8 are deleted.        |
| 17  | Any            | You remove Ana, who has marks, from the call-up.                                  | Confirmation. On confirming, her marks are deleted.                                     |
| 18  | Any            | You change Juan's number from 7 to 9 in the team.                                 | Matches already created still show 7; new ones show 9.                                  |
