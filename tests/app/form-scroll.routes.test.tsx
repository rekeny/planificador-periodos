// Codex re-run, IMPORTANT: the five form routes use the scrollable, keyboard-aware container
// (RF-076): new team, edit team, new player (team), new player (match) and new match. Real
// src/app routes through renderRouter, with the doubles of new-player.form.test.tsx. Each form is
// the only screen of the stack. The testIDs of tests/support/form-scroll.ts do not exist yet.
import { fireEvent, renderRouter, screen } from "expo-router/testing-library";

import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import { ALEVIN } from "../support/squad-fixtures";
import { startSession } from "../support/call-up-screen";
import { squadSpecs } from "../support/match-session-fixtures";
import { failInserts } from "../support/new-match-fixtures";
import { freshDraft } from "../support/new-match-form";
import { seedTeam } from "../support/team-screen";
import {
  KEYBOARD_AWARE,
  inScroll,
  reachable,
  structure,
} from "../support/form-scroll";

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

const SAVE_FAILED = "No se ha podido guardar el cambio. Inténtalo de nuevo.";
type Db = ReturnType<typeof resetMockDatabase>;
let db: Db;
let team: number;

beforeEach(() => {
  db = resetMockDatabase();
  team = seedTeam(db, ALEVIN, [["Ana", "4"]]);
  useMockSquadStore(createSquadStore(db));
});

async function open(url: string, ready: string): Promise<void> {
  await renderRouter("./src/app", { initialUrl: url });
  await screen.findByLabelText(ready);
}

describe("form routes, scrollable and keyboard-aware", () => {
  it.each([
    ["new team", "/teams/new", "Nombre", ["Nombre", "Categoría"]],
    ["edit team", "/teams/1/edit", "Nombre", ["Nombre", "Categoría"]],
    [
      "new player of a team",
      "/teams/1/players/new",
      "Dorsal",
      ["Nombre", "Dorsal"],
    ],
  ] as const)(
    "RF-076: the %s route puts its fields and «Guardar» inside a ScrollView with keyboardShouldPersistTaps «handled» in a KeyboardAvoidingView",
    async (_name, url, ready, labels) => {
      await open(url, ready);
      expect(structure()).toEqual(KEYBOARD_AWARE);
      const missing = reachable([...labels, "Guardar"]).filter(
        (c) => !c.inside,
      );
      expect(missing).toEqual([]);
    },
  );

  it("RF-076 RF-012: on the new-team route the message «Escribe un nombre.» is inside the scroll container", async () => {
    await open("/teams/new", "Nombre");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
    expect(inScroll().queryByText("Escribe un nombre.")).not.toBeNull();
  });

  it("RF-076 RF-016: on the new-player route both messages are inside the scroll container", async () => {
    await open(`/teams/${team}/players/new`, "Dorsal");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
    expect(inScroll().queryByText("Escribe un nombre.")).not.toBeNull();
    expect(
      inScroll().queryByText(/El dorsal debe ser de 0 a 99/),
    ).not.toBeNull();
  });

  it("RF-076 RF-035: the new-player-from-the-match route has the same structure, «Guardar» and messages inside", async () => {
    const session = startSession(squadSpecs(9));
    session.store.getState().openMatch(session.matchId);
    await open(`/matches/${session.matchId}/new-player`, "Nombre");
    expect(structure()).toEqual(KEYBOARD_AWARE);
    await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
    expect(
      reachable(["Nombre", "Dorsal", "Guardar"]).every((c) => c.inside),
    ).toBe(true);
    expect(inScroll().queryByText("Escribe un nombre.")).not.toBeNull();
  });

  it("RF-076 RF-025: the new-match route keeps its fields, call-up and «Guardar» in a scroll container that keeps taps and avoids the keyboard", async () => {
    freshDraft(db);
    await open(`/teams/${team}/matches/new`, "Local");
    expect(structure()).toEqual(KEYBOARD_AWARE);
    const labels = ["Local", "Visitante", "Notas", "Guardar"];
    expect(reachable(labels).filter((c) => !c.inside)).toEqual([]);
  });

  it("RF-076 RF-025: on the new-match route the score message and the save-error banner are inside the scroll container", async () => {
    freshDraft(db);
    await open(`/teams/${team}/matches/new`, "Local");
    await fireEvent.changeText(
      screen.getAllByLabelText("Resultado final")[0]!,
      "54",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
    expect(
      inScroll().queryByText("Escribe los dos resultados o ninguno."),
    ).not.toBeNull();
    await fireEvent.changeText(
      screen.getAllByLabelText("Resultado final")[1]!,
      "48",
    );
    failInserts(db, "matches");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
    expect(inScroll().queryByText(SAVE_FAILED)).not.toBeNull();
  });
});
