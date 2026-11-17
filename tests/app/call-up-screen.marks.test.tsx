// T046: removing from the call-up a player who has marks (RF-034, E-017). The marks are written
// straight into the in-memory database before the match is opened, because the cells arrive in
// T055. The dialog is the real ChoiceDialog of T045. The route `/matches/[matchId]/call-up` does
// not exist yet; the assumed screen is described in tests/support/call-up-screen.ts.
import { fireEvent, screen, waitFor } from "expo-router/testing-library";

import { writeMark } from "../support/match-session-fixtures";
import { savedCallUp, savedMarkKeys } from "../support/match-session-call-up";
import { pressBack, tapOutside } from "../support/choice-dialog-harness";
import {
  confirmationShown,
  openCallUpAlone,
  openMatchScreen,
  pressAdd,
  pressRemove,
  removeButtons,
  shows,
  startSession,
} from "../support/call-up-screen";
import type { Session } from "../support/call-up-screen";

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

const TITLE = "¿Quitar a Ana de la convocatoria?";
const MESSAGE = "Tiene marcas en este partido y se borrarán.";

/** Ana (number 1) has two marks and Luis (number 2) one, in a call-up of nine. */
function withMarks(): Session {
  const specs = Array.from({ length: 9 }, (_, i): [string, string] => [
    i === 0 ? "Ana" : i === 1 ? "Luis" : `Jugador ${i + 1}`,
    String(i + 1),
  ]);
  const s = startSession(specs);
  const [ana, luis] = s.entryIds;
  writeMark(s.db, ana ?? 0, "P", 1, "starter");
  writeMark(s.db, ana ?? 0, "P", 2, "sub");
  writeMark(s.db, luis ?? 0, "P", 1, "starter");
  return s;
}

function marksOf(s: Session, entry: number): string[] {
  return savedMarkKeys(s.db, s.matchId).filter((key) =>
    key.startsWith(`${entry}:`),
  );
}

describe("call-up screen, removing a player with marks", () => {
  it("RF-034 E-017: removing Ana, who has marks, asks «¿Quitar a Ana de la convocatoria?» and removes nothing yet", async () => {
    const s = withMarks();
    await openCallUpAlone(s);
    await pressRemove(s, "Ana");
    expect(await screen.findByText(TITLE)).toBeTruthy();
    expect(screen.getByText(MESSAGE)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Quitar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
    expect(removeButtons()).toHaveLength(9);
    expect(savedCallUp(s.db, s.matchId)).toContain("1 Ana");
    expect(savedMarkKeys(s.db, s.matchId)).toHaveLength(3);
  });

  it("RF-034 E-017: confirming removes her row and deletes only her marks", async () => {
    const s = withMarks();
    const [ana, luis] = s.entryIds;
    await openCallUpAlone(s);
    await pressRemove(s, "Ana");
    await fireEvent.press(
      await screen.findByRole("button", { name: "Quitar" }),
    );
    await waitFor(() => expect(removeButtons()).toHaveLength(8));
    expect(screen.queryByText(TITLE)).toBeNull();
    expect(confirmationShown()).toBe(false);
    expect(savedCallUp(s.db, s.matchId)).not.toContain("1 Ana");
    expect(marksOf(s, ana ?? 0)).toEqual([]);
    expect(marksOf(s, luis ?? 0)).toEqual([`${luis}:P1`]);
  });

  it("RF-034 E-017: after confirming, adding Ana again gives an empty row that is removed without asking", async () => {
    const s = withMarks();
    await openCallUpAlone(s);
    await pressRemove(s, "Ana");
    await fireEvent.press(
      await screen.findByRole("button", { name: "Quitar" }),
    );
    await waitFor(() => expect(removeButtons()).toHaveLength(8));
    await pressAdd("Ana");
    await waitFor(() => expect(removeButtons()).toHaveLength(9));
    expect(savedMarkKeys(s.db, s.matchId)).toHaveLength(1);
    await pressRemove(s, "Ana");
    await waitFor(() => expect(removeButtons()).toHaveLength(8));
    expect(confirmationShown()).toBe(false);
  });

  it("RF-034 E-017: cancelling keeps the player, her row and her marks, and closes the dialog", async () => {
    const s = withMarks();
    await openCallUpAlone(s);
    await pressRemove(s, "Ana");
    await fireEvent.press(
      await screen.findByRole("button", { name: "Cancelar" }),
    );
    await waitFor(() => expect(confirmationShown()).toBe(false));
    expect(removeButtons()).toHaveLength(9);
    expect(savedCallUp(s.db, s.matchId)).toContain("1 Ana");
    expect(savedMarkKeys(s.db, s.matchId)).toHaveLength(3);
  });

  it("RF-034: cancelling and asking again shows the dialog again, and confirming then removes her", async () => {
    const s = withMarks();
    await openCallUpAlone(s);
    await pressRemove(s, "Ana");
    await fireEvent.press(
      await screen.findByRole("button", { name: "Cancelar" }),
    );
    await waitFor(() => expect(confirmationShown()).toBe(false));
    await pressRemove(s, "Ana");
    await fireEvent.press(
      await screen.findByRole("button", { name: "Quitar" }),
    );
    await waitFor(() => expect(removeButtons()).toHaveLength(8));
    expect(savedCallUp(s.db, s.matchId)).not.toContain("1 Ana");
  });

  it("RF-034: asking for Luis after cancelling for Ana names Luis in the dialog", async () => {
    const s = withMarks();
    await openCallUpAlone(s);
    await pressRemove(s, "Ana");
    await fireEvent.press(
      await screen.findByRole("button", { name: "Cancelar" }),
    );
    await waitFor(() => expect(confirmationShown()).toBe(false));
    await pressRemove(s, "Luis");
    expect(
      await screen.findByText("¿Quitar a Luis de la convocatoria?"),
    ).toBeTruthy();
    expect(shows("¿Quitar a Ana")).toBe(false);
  });
});

describe("call-up screen, the confirmation closes only with its buttons", () => {
  it("RF-034: tapping outside the open confirmation leaves it open and keeps the player and the marks", async () => {
    const s = withMarks();
    await openCallUpAlone(s);
    await pressRemove(s, "Ana");
    await screen.findByText(TITLE);
    await tapOutside();
    expect(screen.getByText(TITLE)).toBeTruthy();
    expect(removeButtons()).toHaveLength(9);
    expect(savedMarkKeys(s.db, s.matchId)).toHaveLength(3);
  });

  it("RF-034: Android Back with the confirmation open leaves it open, changes nothing and does not leave the screen", async () => {
    const s = withMarks();
    await openMatchScreen(s.matchId);
    await fireEvent.press(screen.getByRole("button", { name: "Convocatoria" }));
    await pressRemove(s, "Ana");
    await screen.findByText(TITLE);
    pressBack();
    expect(screen.getByText(TITLE)).toBeTruthy();
    expect(screen).toHavePathname(`/matches/${s.matchId}/call-up`);
    expect(savedCallUp(s.db, s.matchId)).toContain("1 Ana");
    expect(savedMarkKeys(s.db, s.matchId)).toHaveLength(3);
  });
});
