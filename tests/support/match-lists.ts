// Helpers of the tests of the list of every match (T071). This file holds no test calls. Assumed
// screens:
//   - the list of teams (`/`) has a button «Todos los partidos» (`matches.allTitle`) next to «Nuevo
//     equipo», always shown, that pushes `/matches`;
//   - `/matches` draws one button per match (a Pressable with role «button»), in the store's order,
//     or the text `matches.empty` and no item; no other button. Its items are `MatchListItem`s of
//     src/ui/match-list-item.tsx: the Texts of an item are, in some order, the date, the time (if
//     any), the home and away names joined, the score (if any, as its own Text), the format and,
//     each in its own Text, the team's name and category (if any). The date and the time may be one
//     Text or two, so the helpers read them from the joined Texts of the item.
// The two stores come from src/state/matches-store.ts and are handed out by `getMatchesStore()`.
import { sql } from "drizzle-orm";
import {
  fireEvent,
  renderRouter,
  screen,
  waitFor,
  within,
} from "expo-router/testing-library";

import type { AppDatabase } from "@/data/database-types";
import { createMatch } from "@/data/match-repository";
import { createTeam } from "@/data/team-repository";
import { createMatchesStore } from "@/state/matches-store";
import type { MatchesStore } from "@/state/matches-store";
import { matchValues } from "../data/match-fixtures";
import { setMockMatchesStore } from "./mock-app-stores";
import { ALEVIN, CADETE } from "./squad-fixtures";

export const ALL_MATCHES = "Todos los partidos";
export const EMPTY_MATCHES = "Todavía no hay partidos.";
const DATE = /\d{2}\/\d{2}\/\d{4}/;
const TIME = /\b\d{2}:\d{2}\b/;
const SCORE = /^\d+–\d+$/;

// `setMockMatchesStore` is not a hook: the alias keeps the rules-of-hooks lint from reading it as one.
const giveMatchesStore = setMockMatchesStore;

/** A new matches store on the database, handed out by `getMatchesStore()`. */
export function matchesStoreOn(db: AppDatabase): MatchesStore {
  const store = createMatchesStore(db);
  giveMatchesStore(store);
  return store;
}

/** Teams «Alevín A» (2015, id 1) and «Cadete B» (no category, id 2), and no match. */
export function seedTeams(db: AppDatabase): { alevin: number; cadete: number } {
  return {
    alevin: createTeam(db, ALEVIN).id,
    cadete: createTeam(db, CADETE).id,
  };
}

/**
 * Teams «Alevín A» (2015, id 1) and «Cadete B» (no category, id 2) and three matches, saved in an
 * order that is neither the date order nor the reverse one: 1 November (team 1, «Águilas» –
 * «Rival», 72–65, 6 periods), 15 November (team 1, no names, no score, 6 periods) and 8 November
 * (team 2, «Pavo» and no away name, 8 periods, 12:00). Match ids 1, 2 and 3.
 */
export function seedThreeMatches(db: AppDatabase): void {
  const { alevin, cadete } = seedTeams(db);
  createMatch(
    db,
    matchValues(alevin, {
      date: "2026-11-01",
      homeName: "Águilas",
      awayName: "Rival",
      homeScore: 72,
      awayScore: 65,
    }),
    [],
  );
  createMatch(db, matchValues(alevin, { date: "2026-11-15" }), []);
  createMatch(
    db,
    matchValues(cadete, {
      date: "2026-11-08",
      format: 8,
      time: "12:00",
      homeName: "Pavo",
    }),
    [],
  );
}

/** Saves one more match of the team behind the app's back. */
export function addMatch(
  db: AppDatabase,
  teamId: number,
  values: Parameters<typeof matchValues>[1] = {},
): number {
  return createMatch(db, matchValues(teamId, values), []).id;
}

/** Every read of the matches table throws from now on ("no such table"). */
export function breakMatchReads(db: AppDatabase): void {
  db.run(sql.raw("ALTER TABLE matches RENAME TO broken_matches"));
}

/** The list of every match as the only screen of the stack, as a deep link would open it. */
export async function openAllAlone(): Promise<void> {
  await renderRouter("./src/app", { initialUrl: "/matches" });
}

/** The list of teams, then «Todos los partidos», as the coach would. */
export async function openAllFromTeams(): Promise<void> {
  await renderRouter("./src/app");
  await pressAllMatches();
}

export async function pressAllMatches(): Promise<void> {
  await fireEvent.press(
    await screen.findByRole("button", { name: ALL_MATCHES }),
  );
  await waitFor(() => expect(screen).toHavePathname("/matches"));
}

const textOf = (node: { props: { children?: unknown } }): string =>
  [node.props.children].flat().join("");

/** The buttons that are match items: the ones that show a date. Other screens under may add buttons. */
export function itemButtons(): ReturnType<typeof screen.queryAllByRole> {
  return screen
    .queryAllByRole("button")
    .filter((button) => DATE.test(textsOf(button).join(" ")));
}

/** The Texts inside one element, in tree order. */
export function textsOf(node: Parameters<typeof within>[0]): string[] {
  return within(node).queryAllByText(/.*/).map(textOf);
}

/** The Texts of every item, in screen order. */
export function itemTexts(): string[][] {
  return itemButtons().map(textsOf);
}

/** The date of every item, in screen order, as «15/11/2026». */
export function itemDates(): string[] {
  return itemTexts().map((texts) => DATE.exec(texts.join(" "))?.[0] ?? "");
}

/** The time of every item, in screen order, as «12:00», or null for an item with no time. */
export function itemTimes(): (string | null)[] {
  return itemTexts().map((texts) => TIME.exec(texts.join(" "))?.[0] ?? null);
}

/** The score Text of every item («72–65») or null. */
export function itemScores(): (string | null)[] {
  return itemTexts().map(
    (texts) => texts.find((text) => SCORE.test(text)) ?? null,
  );
}

/** Opens the item with that date. */
export async function pressItemOf(date: string): Promise<void> {
  const index = itemDates().indexOf(date);
  const button = itemButtons()[index];
  if (button === undefined) throw new Error(`No item of ${date}`);
  await fireEvent.press(button);
}
