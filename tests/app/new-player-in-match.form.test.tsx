// T047: the route `/matches/[matchId]/new-player`, how it opens and what it asks (RF-035, RF-016,
// RF-085, E-021, E-022). Same doubles as call-up-screen.test.tsx: the real session store on the
// in-memory database, and only expo-sqlite, the splash screen, initializeDatabase and the store
// getters are doubles. The route and the button «Crear jugador nuevo» do not exist yet; the
// assumed screens are described in tests/support/new-player-in-match.ts.
import { fireEvent, screen, testRouter } from "expo-router/testing-library";

import { breakReads, squadSpecs } from "../support/match-session-fixtures";
import { savedCallUp, savedTeam } from "../support/match-session-call-up";
import { NOT_FOUND } from "../support/edit-team";
import { presentations } from "../support/screen-presentation";
import { headerConfigs, screenTexts } from "../support/screen-reading";
import { NAME_REQUIRED, pressSave } from "../support/new-team-form";
import { NUMBER_INVALID, addViaForm } from "../support/team-screen";
import {
  ADD_EMPTY,
  openCallUpAlone,
  startSession,
} from "../support/call-up-screen";
import {
  CREATE_PLAYER,
  openFormAlone,
  openFormFromMatch,
  openRoute,
  pressCreatePlayer,
} from "../support/new-player-in-match";

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

const NORA: [string, string] = ["Nora", "15"];
const FORTY = "Club Baloncesto Alevín Aragón Zaragoza 1";

describe("new player from the match, the button", () => {
  it("RF-035: the call-up screen offers «Crear jugador nuevo» when there are players to add", async () => {
    const s = startSession(squadSpecs(9), [NORA]);
    await openCallUpAlone(s);
    expect(screen.getByRole("button", { name: CREATE_PLAYER })).toBeTruthy();
    expect(screen.queryByText(ADD_EMPTY)).toBeNull();
  });

  it("RF-035: the call-up screen offers «Crear jugador nuevo» next to the message when nobody is left to add", async () => {
    const s = startSession(squadSpecs(9));
    await openCallUpAlone(s);
    expect(screen.getByText(ADD_EMPTY)).toBeTruthy();
    expect(screen.getByRole("button", { name: CREATE_PLAYER })).toBeTruthy();
  });

  it("RF-035: the button opens the new-player route as a modal over the call-up screen, with the header «Nuevo jugador»", async () => {
    const s = startSession(squadSpecs(9));
    await openFormFromMatch(s);
    expect(screen).toHavePathname(`/matches/${s.matchId}/new-player`);
    expect(presentations()).toEqual(["push", "push", "modal"]);
    expect(headerConfigs().at(-1)?.title).toBe("Nuevo jugador");
  });

  it("RF-035: the form has the fields «Nombre» and «Dorsal», both empty, the button «Guardar» and no message", async () => {
    const s = startSession(squadSpecs(9));
    await openFormFromMatch(s);
    expect(screen.getByLabelText("Nombre")).toHaveDisplayValue("");
    expect(screen.getByLabelText("Dorsal")).toHaveDisplayValue("");
    expect(screen.getByRole("button", { name: "Guardar" })).toBeTruthy();
    expect(screen.queryByText(NAME_REQUIRED)).toBeNull();
    expect(screen.queryByText(NUMBER_INVALID)).toBeNull();
  });
});

describe("new player from the match, the limits", () => {
  it("RF-035 E-022: the name field stops at 40 characters and the number field at 2 (maxLength)", async () => {
    const s = startSession(squadSpecs(9));
    await openFormAlone(s);
    expect(screen.getByLabelText("Nombre").props.maxLength).toBe(40);
    expect(screen.getByLabelText("Dorsal").props.maxLength).toBe(2);
  });

  it("RF-035 E-022: a 40-character name is saved in the team and in the call-up with no message", async () => {
    const s = startSession(squadSpecs(9));
    await openFormAlone(s);
    await addViaForm(FORTY, "5");
    expect(FORTY).toHaveLength(40);
    expect(savedTeam(s.db, s.teamId)).toContain(`5 ${FORTY}`);
    expect(savedCallUp(s.db, s.matchId)).toContain(`5 ${FORTY}`);
    expect(screen.queryByText(NAME_REQUIRED)).toBeNull();
    expect(screen.queryByText(NUMBER_INVALID)).toBeNull();
  });
});

describe("new player from the match, what is asked", () => {
  it.each(["07", "100", ""])(
    "RF-035 RF-016 E-021: the number «%s» shows the number message, keeps the form open and creates nothing",
    async (number) => {
      const s = startSession(squadSpecs(9));
      await openFormAlone(s);
      await addViaForm("Nora", number);
      expect(await screen.findByText(NUMBER_INVALID)).toBeTruthy();
      expect(screen).toHavePathname(`/matches/${s.matchId}/new-player`);
      expect(screen.getByLabelText("Nombre")).toHaveDisplayValue("Nora");
      expect(screen.queryByText(NAME_REQUIRED)).toBeNull();
      expect(savedTeam(s.db, s.teamId)).toHaveLength(9);
      expect(savedCallUp(s.db, s.matchId)).toHaveLength(9);
    },
  );

  it.each(["", "     "])(
    "RF-035 RF-016: a name typed as «%s» shows «Escribe un nombre.» and creates nothing",
    async (blank) => {
      const s = startSession(squadSpecs(9));
      await openFormAlone(s);
      await addViaForm(blank, "7");
      expect(await screen.findByText(NAME_REQUIRED)).toBeTruthy();
      expect(screen.queryByText(NUMBER_INVALID)).toBeNull();
      expect(savedTeam(s.db, s.teamId)).toHaveLength(9);
      expect(savedCallUp(s.db, s.matchId)).toHaveLength(9);
    },
  );

  it("RF-035 RF-016: pressing «Guardar» on the empty form shows both messages and creates nothing", async () => {
    const s = startSession(squadSpecs(9));
    await openFormAlone(s);
    await pressSave();
    expect(await screen.findByText(NAME_REQUIRED)).toBeTruthy();
    expect(screen.getByText(NUMBER_INVALID)).toBeTruthy();
    expect(savedTeam(s.db, s.teamId)).toHaveLength(9);
  });

  it("RF-035 RF-016: after an invalid number, fixing it and pressing «Guardar» again creates the player once", async () => {
    const s = startSession(squadSpecs(9));
    await openFormAlone(s);
    await addViaForm("Nora", "07");
    await screen.findByText(NUMBER_INVALID);
    await fireEvent.changeText(screen.getByLabelText("Dorsal"), "15");
    await pressSave();
    expect(screen.queryByText(NUMBER_INVALID)).toBeNull();
    expect(savedTeam(s.db, s.teamId)).toContain("15 Nora");
    expect(savedCallUp(s.db, s.matchId)).toContain("15 Nora");
    expect(savedCallUp(s.db, s.matchId)).toHaveLength(10);
  });
});

describe("new player from the match, a match that cannot be used", () => {
  it("RF-035 RF-085: the route of a match whose session is not open shows only the not-found message and creates nothing", async () => {
    const s = startSession(squadSpecs(9), [NORA]);
    await openRoute(`/matches/${s.matchId}/new-player`);
    expect(screenTexts()).toEqual([NOT_FOUND]);
    expect(screen.queryByLabelText("Dorsal")).toBeNull();
    expect(screen.queryByRole("button", { name: "Guardar" })).toBeNull();
    expect(savedTeam(s.db, s.teamId)).toHaveLength(10);
    expect(savedCallUp(s.db, s.matchId)).toHaveLength(9);
  });

  it("RF-035 RF-085: the route of another match than the open one shows only the not-found message", async () => {
    const s = startSession(squadSpecs(9));
    s.store.getState().openMatch(s.matchId);
    await openRoute(`/matches/${s.matchId + 1}/new-player`);
    expect(screenTexts()).toEqual([NOT_FOUND]);
    expect(screen.queryByLabelText("Nombre")).toBeNull();
  });

  it.each(["abc", "0", "01"])(
    "RF-035 RF-085: /matches/%s/new-player shows only the not-found message even with a match open",
    async (id) => {
      const s = startSession(squadSpecs(9));
      s.store.getState().openMatch(s.matchId);
      await openRoute(`/matches/${id}/new-player`);
      expect(screenTexts()).toEqual([NOT_FOUND]);
      expect(savedTeam(s.db, s.teamId)).toHaveLength(9);
    },
  );

  it("RF-035 RF-085: a match whose read failed shows only the not-found message and creates nothing", async () => {
    const s = startSession(squadSpecs(9));
    breakReads(s.db, "matches");
    s.store.getState().openMatch(s.matchId);
    await openRoute(`/matches/${s.matchId}/new-player`);
    expect(screenTexts()).toEqual([NOT_FOUND]);
    expect(screen.queryByLabelText("Dorsal")).toBeNull();
    expect(savedTeam(s.db, s.teamId)).toHaveLength(9);
  });
});

describe("new player from the match, opening it twice", () => {
  it("RF-035: after a rejected attempt and going back, the form opens empty again and nothing was created", async () => {
    const s = startSession(squadSpecs(9));
    await openFormFromMatch(s);
    await addViaForm("Nora", "07");
    await screen.findByText(NUMBER_INVALID);
    await testRouter.back();
    await pressCreatePlayer();
    expect(screen.getByLabelText("Nombre")).toHaveDisplayValue("");
    expect(screen.getByLabelText("Dorsal")).toHaveDisplayValue("");
    expect(screen.queryByText(NUMBER_INVALID)).toBeNull();
    expect(savedTeam(s.db, s.teamId)).toHaveLength(9);
  });
});
