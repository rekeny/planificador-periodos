// Helpers of the tests of the team's matches on the team screen (T099). This file holds no test
// calls. Assumed screen (`/teams/<id>`): one SectionList, so one vertical scroll, with the heading
// «Jugadores» (`team.players`) and the D2 player rows (number and name as Texts), then the heading
// «Partidos» (`team.matches`) and one `MatchListItem` button per match of the team, in the store's
// order, or the text `matches.empty`; the buttons «Editar equipo», «Nuevo partido» and «Nuevo
// jugador» and the duplicate-number banner may be above the list or inside it. The matches come
// from `getMatchesStore()`: `loadTeam(teamId)` on every focus, `teamMatches` drawn only when its
// `teamId` is the route's. Items and their readers are those of match-lists.ts.
import { fireEvent, screen } from "expo-router/testing-library";

import type { AppDatabase } from "@/data/database-types";
import type { MatchesStore } from "@/state/matches-store";
import { addMatch } from "./match-lists";
import { screenTexts } from "./screen-reading";
import { ALEVIN, CADETE } from "./squad-fixtures";
import { DUPLICATE_BANNER, seedTeam } from "./team-screen";

export const PLAYERS = "Jugadores";
export const MATCHES = "Partidos";
export const EMPTY_MATCHES = "Todavía no hay partidos.";
const BUTTON_TEXTS = ["Nuevo partido", "Nuevo jugador"];
const DATE_TEXT = /^\d{2}\/\d{2}\/\d{4}/;

/**
 * «Alevín A» (id 1, with Luis 9 and Ana 4) with three matches saved out of order (1, 15 and 8
 * November: «Águilas» – «Rival» 72–65; no names and no score; «Pavo» – no away name, 8 periods,
 * 12:00), and «Cadete B» (id 2, with Bea 7) with one match on 20 November («Zorros» – «Osos»).
 */
export function seedTwoTeams(db: AppDatabase): {
  first: number;
  second: number;
} {
  const first = seedTeam(db, ALEVIN, [
    ["Luis", "9"],
    ["Ana", "4"],
  ]);
  const second = seedTeam(db, CADETE, [["Bea", "7"]]);
  addMatch(db, first, {
    date: "2026-11-01",
    homeName: "Águilas",
    awayName: "Rival",
    homeScore: 72,
    awayScore: 65,
  });
  addMatch(db, first, { date: "2026-11-15" });
  addMatch(db, first, {
    date: "2026-11-08",
    format: 8,
    time: "12:00",
    homeName: "Pavo",
  });
  addMatch(db, second, {
    date: "2026-11-20",
    homeName: "Zorros",
    awayName: "Osos",
  });
  return { first, second };
}

/** Every Text of the screen in order, without the labels of the buttons and the banner. */
export function teamTexts(): string[] {
  return screenTexts().filter(
    (text) => !BUTTON_TEXTS.includes(text) && !DUPLICATE_BANNER.test(text),
  );
}

/** Where the two headings and the first match item are in `teamTexts()` (-1 when absent). */
export function positions(): {
  players: number;
  matches: number;
  item: number;
} {
  const texts = teamTexts();
  return {
    players: texts.indexOf(PLAYERS),
    matches: texts.indexOf(MATCHES),
    item: texts.findIndex((text) => DATE_TEXT.test(text)),
  };
}

/** The vertical ScrollViews that the coach can scroll: a FlatList or a SectionList draws one. */
export function scrolls(): ReturnType<typeof screen.container.queryAll> {
  return screen.container
    .queryAll((node) => node.type === "RCTScrollView")
    .filter(
      (view) =>
        view.props.horizontal !== true && view.props.scrollEnabled !== false,
    );
}

/**
 * Scrolls the list to its end the way a finger does, so that the virtualised list draws the rows
 * that were out of its first window (Jest has no layout: the sizes are the ones of the event).
 */
export async function scrollToEnd(
  list: ReturnType<typeof scrolls>[number],
): Promise<void> {
  const layout = { x: 0, y: 0, width: 375, height: 667 };
  await fireEvent(list, "layout", { nativeEvent: { layout } });
  await fireEvent(list, "contentSizeChange", 375, 10000);
  await fireEvent.scroll(list, {
    nativeEvent: {
      contentOffset: { y: 10000 },
      contentSize: { height: 10000, width: 375 },
      layoutMeasurement: { height: 667, width: 375 },
    },
  });
}

/** Spies on the store's `loadTeam` and lets the real one run. */
export function spyOnLoadTeam(store: MatchesStore): jest.SpyInstance {
  return jest.spyOn(store.getState(), "loadTeam");
}

/** The React warnings about a component updating while another one renders (D3 rule 3, F-03). */
export function renderUpdateWarnings(errors: jest.SpyInstance): string[] {
  return errors.mock.calls
    .map((call) => call.map(String).join(" "))
    .filter((message) => /Cannot update a component/.test(message));
}
