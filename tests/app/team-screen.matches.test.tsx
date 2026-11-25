// T099: the team's matches on the team screen, under its players (RF-075, RF-057, E-023). Real
// src/app routes, the real stores on the in-memory database; the doubles are those of
// team-screen.test.tsx. Every test opens the team screen as the only screen of the stack, because
// the screens under it would add their own Texts. Assumed screen: tests/support/team-matches.ts.
import { screen, within } from "expo-router/testing-library";

import { createSquadStore } from "@/state/squad-store";
import es from "@/i18n/es.json";
import {
  addMatch,
  itemButtons,
  itemDates,
  itemScores,
  itemTexts,
  itemTimes,
  matchesStoreOn,
  breakMatchReads,
} from "../support/match-lists";
import { useMockSquadStore } from "../support/mock-app-stores";
import { resetMockDatabase } from "../support/mock-database";
import { ALEVIN, CADETE } from "../support/squad-fixtures";
import {
  EMPTY_MATCHES,
  MATCHES,
  PLAYERS,
  positions,
  scrollToEnd,
  scrolls,
  seedTwoTeams,
  teamTexts,
} from "../support/team-matches";
import { NOT_FOUND } from "../support/edit-team";
import { openTeamAlone, seedTeam } from "../support/team-screen";

jest.mock("expo-sqlite", () => {
  throw new Error("expo-sqlite was loaded in Jest");
});
jest.mock("@/data/database", () =>
  jest
    .requireActual<typeof import("../support/mock-database")>(
      "../support/mock-database",
    )
    .mockDatabaseModule(),
);
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock("@/state/database-ready", () => ({
  initializeDatabase: jest.fn(() => Promise.resolve()),
}));
jest.mock("@/state/app-stores", () =>
  jest
    .requireActual<typeof import("../support/mock-app-stores")>(
      "../support/mock-app-stores",
    )
    .mockAppStoresModule(),
);

type Db = ReturnType<typeof resetMockDatabase>;
let db: Db;

beforeEach(() => {
  db = resetMockDatabase();
  useMockSquadStore(createSquadStore(db));
  matchesStoreOn(db);
});

describe("team screen, the two sections", () => {
  it("RF-075 RF-016: «Jugadores» with Ana 4 and Luis 9, then «Partidos» with the matches of 15, 8 and 1 November, in that order, under the players", async () => {
    const { first } = seedTwoTeams(db);
    await openTeamAlone(first);
    await screen.findAllByRole("button", { name: /\d{2}\/\d{2}\/\d{4}/ });
    const texts = teamTexts();
    const at = positions();
    expect(at.players).toBe(0);
    expect(texts.slice(1, at.matches)).toEqual(["4", "Ana", "9", "Luis"]);
    expect(at.matches).toBeGreaterThan(at.players);
    expect(at.item).toBe(at.matches + 1);
    expect(itemDates()).toEqual(["15/11/2026", "08/11/2026", "01/11/2026"]);
  });

  it("RF-075 E-023: the items show «15/11/2026» with no time and no score, «08/11/2026 12:00» in 8 periods, and «01/11/2026» with «Águilas – Rival» and «72–65»", async () => {
    const { first } = seedTwoTeams(db);
    await openTeamAlone(first);
    await screen.findAllByRole("button", { name: /\d{2}\/\d{2}\/\d{4}/ });
    expect(itemTimes()).toEqual([null, "12:00", null]);
    expect(itemScores()).toEqual([null, null, "72–65"]);
    const [newest, middle, oldest] = itemTexts();
    expect(newest).toEqual(
      expect.arrayContaining(["Local – Visitante", "6 periodos"]),
    );
    expect(middle).toEqual(
      expect.arrayContaining(["Pavo – Visitante", "8 periodos"]),
    );
    expect(oldest).toEqual(
      expect.arrayContaining(["Águilas – Rival", "72–65", "6 periodos"]),
    );
  });

  it("RF-075: two matches on 8 November, at 10:00 and at 12:00, are listed 12:00 first, as in the list of every match", async () => {
    const id = seedTeam(db, ALEVIN, [["Ana", "4"]]);
    addMatch(db, id, { date: "2026-11-08", time: "10:00" });
    addMatch(db, id, { date: "2026-11-08", time: "12:00" });
    await openTeamAlone(id);
    await screen.findAllByRole("button", { name: /08\/11\/2026/ });
    expect(itemTimes()).toEqual(["12:00", "10:00"]);
  });

  it("RF-075: no item shows the team's name or category, and no other team's match is listed", async () => {
    const { first } = seedTwoTeams(db);
    await openTeamAlone(first);
    await screen.findAllByRole("button", { name: /\d{2}\/\d{2}\/\d{4}/ });
    expect(itemButtons()).toHaveLength(3);
    const everyText = itemTexts().flat();
    expect(everyText).not.toContain("Alevín A");
    expect(everyText).not.toContain("2015");
    expect(teamTexts()).not.toContain("Alevín A");
    expect(teamTexts()).not.toContain("2015");
    expect(teamTexts()).not.toContain("Zorros – Osos");
    expect(itemDates()).not.toContain("20/11/2026");
  });

  it("RF-075: «Cadete B», whose own match is dated 20 November, lists only that one", async () => {
    const { second } = seedTwoTeams(db);
    await openTeamAlone(second);
    await screen.findAllByRole("button", { name: /20\/11\/2026/ });
    expect(itemDates()).toEqual(["20/11/2026"]);
    expect(teamTexts()).toContain("Zorros – Osos");
    expect(teamTexts()).not.toContain("Águilas – Rival");
  });
});

describe("team screen, a section with nothing in it", () => {
  it("RF-075: a team with players and no matches shows «Todavía no hay partidos.» right under «Partidos»", async () => {
    const id = seedTeam(db, ALEVIN, [["Ana", "4"]]);
    await openTeamAlone(id);
    expect(await screen.findByText(EMPTY_MATCHES)).toBeOnTheScreen();
    expect(teamTexts()).toEqual([PLAYERS, "4", "Ana", MATCHES, EMPTY_MATCHES]);
    expect(itemButtons()).toHaveLength(0);
  });

  it("RF-075 RF-016: a team with matches and no players shows the empty «Jugadores» section with no text, then «Partidos» and the matches", async () => {
    const id = seedTeam(db, CADETE);
    addMatch(db, id, { date: "2026-11-08", homeName: "Zorros" });
    await openTeamAlone(id);
    await screen.findAllByRole("button", { name: /08\/11\/2026/ });
    const texts = teamTexts();
    expect(texts.slice(0, 2)).toEqual([PLAYERS, MATCHES]);
    expect(texts).not.toContain(EMPTY_MATCHES);
    expect(screen.queryByText(NOT_FOUND)).toBeNull();
    expect(itemDates()).toEqual(["08/11/2026"]);
  });

  it("RF-075 RF-016: a new team, with no players and no matches, shows «Jugadores» with nothing under it and «Partidos» with the empty text", async () => {
    const id = seedTeam(db, CADETE);
    await openTeamAlone(id);
    await screen.findByText(EMPTY_MATCHES);
    expect(teamTexts()).toEqual([PLAYERS, MATCHES, EMPTY_MATCHES]);
  });

  it("RF-075: a team whose matches cannot be read shows «Todavía no hay partidos.» and keeps its players", async () => {
    const id = seedTeam(db, ALEVIN, [["Ana", "4"]]);
    breakMatchReads(db);
    await openTeamAlone(id);
    expect(await screen.findByText(EMPTY_MATCHES)).toBeOnTheScreen();
    expect(screen.getByText("Ana")).toBeOnTheScreen();
    expect(screen.queryByText(NOT_FOUND)).toBeNull();
  });

  it("RF-075: the key team.matches of es.json is «Partidos»", () => {
    const texts = es as unknown as Record<string, Record<string, unknown>>;
    expect(texts.team?.matches).toBe(MATCHES);
    expect(texts.team?.players).toBe(PLAYERS);
  });
});

describe("team screen, one list that scrolls", () => {
  it("RF-075 RF-016: with 13 players and 10 matches there is one vertical scroll, holding «Jugadores» and, once scrolled to the end, «Partidos» and the oldest match", async () => {
    const id = seedTeam(
      db,
      ALEVIN,
      Array.from({ length: 13 }, (_, n) => [`Jugador ${n + 1}`, String(n + 1)]),
    );
    for (let day = 1; day <= 10; day += 1) {
      addMatch(db, id, { date: `2026-12-${String(day).padStart(2, "0")}` });
    }
    await openTeamAlone(id);
    await screen.findByText("Jugador 1");
    const lists = scrolls();
    expect(lists).toHaveLength(1);
    const [list] = lists;
    if (list === undefined) throw new Error("No scroll");
    await scrollToEnd(list);
    await screen.findByText(MATCHES);
    expect(within(list).getByText(PLAYERS)).toBeOnTheScreen();
    expect(within(list).getByText("Jugador 13")).toBeOnTheScreen();
    expect(within(list).getByText(MATCHES)).toBeOnTheScreen();
    expect(itemDates()).toEqual(
      Array.from(
        { length: 10 },
        (_, n) => `${String(10 - n).padStart(2, "0")}/12/2026`,
      ),
    );
    expect(
      itemButtons().every((item) =>
        within(list).queryAllByRole("button").includes(item),
      ),
    ).toBe(true);
  });
});
