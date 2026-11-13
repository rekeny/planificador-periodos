// T043: the new-match form, opening it, its defaults and the format (RF-025, RF-036, RF-082,
// RF-084, E-024). Real src/app routes through renderRouter, with the doubles of the T035 tests plus
// the new-match draft that `@/state/app-stores` hands out (a real draft on the in-memory
// database). The route `/teams/[teamId]/matches/new` and the button «Nuevo partido» do not exist yet.
import { act, screen, testRouter } from "expo-router/testing-library";
import { Dimensions } from "react-native";

import { listTeams } from "@/data/team-repository";
import es from "@/i18n/es.json";
import { presentations } from "../support/screen-presentation";
import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import { savedMatches } from "../support/new-match-fixtures";
import type { NewMatchDraft } from "../support/new-match-fixtures";
import {
  awayField,
  checkedFormats,
  chooseFormatInForm,
  homeField,
  notesField,
  openFormAlone,
  openFormFromTeam,
  pressNewMatch,
  scoreFields,
  seedTeams,
  freshDraft,
  typeIn,
} from "../support/new-match-form";
import { headerTitles } from "../support/team-screen";

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
let draft: NewMatchDraft;
let ids: { alevin: number; cadete: number };

beforeEach(() => {
  db = resetMockDatabase();
  ids = seedTeams(db);
  useMockSquadStore(createSquadStore(db));
  draft = freshDraft(db);
});

describe("new-match form, opening it", () => {
  it("RF-025: «Nuevo partido» on the team screen opens /teams/1/matches/new as a modal with the header «Nuevo partido»", async () => {
    await openFormFromTeam("Alevín A");
    expect(screen).toHavePathname(`/teams/${ids.alevin}/matches/new`);
    expect(headerTitles()).toEqual(["Equipos", "Alevín A", "Nuevo partido"]);
    expect(presentations()).toEqual(["push", "push", "modal"]);
  });

  it("RF-025: the fields are found by the labels «Local», «Visitante», «Resultado final» (two) and «Notas», all empty", async () => {
    await openFormAlone(ids.alevin);
    expect(homeField()).toHaveDisplayValue("");
    expect(awayField()).toHaveDisplayValue("");
    expect(notesField()).toHaveDisplayValue("");
    expect(scoreFields()).toHaveLength(2);
    scoreFields().forEach((field) => expect(field).toHaveDisplayValue(""));
    expect(screen.getByText("Variante")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Mi equipo es local" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Mi equipo es visitante" }),
    ).toBeTruthy();
  });

  it("RF-084: the format picker offers exactly «4 periodos», «6 periodos» and «8 periodos»", async () => {
    await openFormAlone(ids.alevin);
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    [4, 6, 8].forEach((periods) =>
      expect(
        screen.getByRole("radio", { name: `${periods} periodos` }),
      ).toBeTruthy(),
    );
  });

  it("RF-025 RF-036: es.json holds the texts of the new-match form", () => {
    const texts = es as unknown as Record<string, Record<string, unknown>>;
    const field = texts.match?.field as Record<string, unknown>;
    expect(texts.matches?.new).toBe("Nuevo partido");
    expect(field.format).toBe("Variante");
    expect(field.home).toBe("Local");
    expect(field.away).toBe("Visitante");
    expect(field.score).toBe("Resultado final");
    expect(field.notes).toBe("Notas");
    expect(texts.match?.quickHome).toBe("Mi equipo es local");
    expect(texts.match?.quickAway).toBe("Mi equipo es visitante");
    expect(texts.validation?.scoreIncomplete).toBe(
      "Escribe los dos resultados o ninguno.",
    );
  });
});

describe("new-match form, the format (RF-036, RF-084, E-024)", () => {
  it.each([
    ["alevin", 6],
    ["cadete", 8],
  ] as const)(
    "RF-036: the form of the team «%s» opens with its default format %i chosen and the draft reset to it",
    async (team, periods) => {
      await openFormAlone(ids[team]);
      expect(checkedFormats()).toEqual([periods]);
      expect(draft.getState().format).toBe(periods);
    },
  );

  it("RF-036: after «Alevín A» (default 6) was opened with 4 chosen, «Cadete B» opens with 8 and no trace of the earlier form", async () => {
    await openFormAlone(ids.alevin);
    await chooseFormatInForm(4);
    await screen.unmount();
    await openFormAlone(ids.cadete);
    expect(checkedFormats()).toEqual([8]);
    expect(draft.getState().format).toBe(8);
  });

  it("RF-084 E-024: changing the format 6 → 8 shows no dialog and no warning, and the draft has 8", async () => {
    await openFormAlone(ids.alevin);
    await chooseFormatInForm(8);
    expect(checkedFormats()).toEqual([8]);
    expect(draft.getState().format).toBe(8);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(/perder|advertencia|confirm/i)).toBeNull();
    expect(screen).toHavePathname(`/teams/${ids.alevin}/matches/new`);
  });

  it("RF-084 E-024: changing the format 4, 8 and 6 again leaves the team's default format at 6", async () => {
    await openFormAlone(ids.alevin);
    await chooseFormatInForm(4);
    await chooseFormatInForm(8);
    await chooseFormatInForm(6);
    expect(checkedFormats()).toEqual([6]);
    expect(
      listTeams(db).find((team) => team.id === ids.alevin)?.defaultFormat,
    ).toBe(6);
  });

  it("E-024 RF-084: after choosing 8 in «Alevín A» the team's default format is still 6", async () => {
    await openFormAlone(ids.alevin);
    await chooseFormatInForm(8);
    expect(
      listTeams(db).find((team) => team.id === ids.alevin)?.defaultFormat,
    ).toBe(6);
    expect(savedMatches(db)).toEqual([]);
  });
});

describe("new-match form, leaving it and coming back (RF-082)", () => {
  it("RF-082: leaving the half-filled form with Back asks no question, saves no match, and opening it again shows the defaults", async () => {
    await openFormFromTeam("Alevín A");
    await typeIn(homeField(), "Cadete B");
    await typeIn(notesField(), "Pista cubierta");
    await chooseFormatInForm(8);
    await testRouter.back();
    expect(screen).toHavePathname(`/teams/${ids.alevin}`);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(savedMatches(db)).toEqual([]);
    await pressNewMatch();
    expect(homeField()).toHaveDisplayValue("");
    expect(notesField()).toHaveDisplayValue("");
    expect(checkedFormats()).toEqual([6]);
    expect(draft.getState().homeName).toBe("");
  });

  it("RF-082: the app closed with the form half-filled (unmount, new stores on the same database) saves no match and the form opens with the defaults", async () => {
    await openFormAlone(ids.alevin);
    await typeIn(awayField(), "Infantil C");
    await chooseFormatInForm(4);
    await screen.unmount();
    expect(savedMatches(db)).toEqual([]);
    useMockSquadStore(createSquadStore(db));
    draft = freshDraft(db);
    await openFormAlone(ids.alevin);
    expect(awayField()).toHaveDisplayValue("");
    expect(checkedFormats()).toEqual([6]);
    expect(savedMatches(db)).toEqual([]);
  });

  it("RF-025: rotating the device keeps the form with what was typed", async () => {
    await openFormAlone(ids.alevin);
    await typeIn(homeField(), "Cadete B");
    await chooseFormatInForm(4);
    await act(() => {
      Dimensions.set({
        window: { width: 800, height: 400, scale: 2, fontScale: 1 },
      });
    });
    expect(homeField()).toHaveDisplayValue("Cadete B");
    expect(checkedFormats()).toEqual([4]);
    expect(screen).toHavePathname(`/teams/${ids.alevin}/matches/new`);
  });
});
