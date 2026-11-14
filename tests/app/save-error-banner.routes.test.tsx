// Third Codex review, finding 2 (BLOCKING): on every route with a form the save-error banner is in
// normal flow, so «Guardar» stays visible and a second press saves once the device has space again
// (RF-085, RF-076). Real src/app routes through renderRouter, with the doubles of
// form-scroll.routes.test.tsx; the team forms are opened from the list, so a saved form leaves. Failures are real SQLite triggers. Position and structure:
// tests/support/save-error-banner.ts.
import { fireEvent, renderRouter, screen } from "expo-router/testing-library";

import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import { ALEVIN, allowWrites, failWrites } from "../support/squad-fixtures";
import { startSession } from "../support/call-up-screen";
import { squadSpecs } from "../support/match-session-fixtures";
import {
  allowWrites as allowCallUpWrites,
  failWrites as failCallUpWrites,
} from "../support/match-session-call-up";
import { allowInserts, failInserts } from "../support/new-match-fixtures";
import { freshDraft } from "../support/new-match-form";
import { pressSaveMatch, startMatchSession } from "../support/new-match-save";
import { expectBannerInFlow } from "../support/save-error-banner";
import { addViaForm, seedTeam } from "../support/team-screen";
import { formReady, openEdit } from "../support/edit-team";
import { openForm, pressSave, typeName } from "../support/new-team-form";

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

const bannerGone = (): boolean => screen.queryByRole("alert") === null;

describe("the save-error banner on the form routes", () => {
  it("RF-085 RF-076: new team, a failed save shows the banner in normal flow and «Guardar» saves once the device has space", async () => {
    failWrites(db, "teams", "INSERT");
    await openForm();
    await typeName("Benjamín");
    await pressSave();
    await screen.findByRole("alert");
    expectBannerInFlow();
    allowWrites(db, "teams", "INSERT");
    await pressSave();
    expect(bannerGone()).toBe(true);
  });

  it("RF-085 RF-076: edit team, a failed save shows the banner in normal flow and «Guardar» saves once the device has space", async () => {
    failWrites(db, "teams", "UPDATE");
    await openEdit(team);
    await formReady();
    await typeName("Alevín B");
    await pressSave();
    await screen.findByRole("alert");
    expectBannerInFlow();
    allowWrites(db, "teams", "UPDATE");
    await pressSave();
    expect(bannerGone()).toBe(true);
  });

  it("RF-085 RF-076: new player of a team, a failed save shows the banner in normal flow and «Guardar» saves once the device has space", async () => {
    failWrites(db, "players", "INSERT");
    await open(`/teams/${team}/players/new`, "Dorsal");
    await addViaForm("Eva", "5");
    await screen.findByRole("alert");
    expectBannerInFlow();
    allowWrites(db, "players", "INSERT");
    await pressSave();
    expect(bannerGone()).toBe(true);
  });

  it("RF-085 RF-076 RF-035: new player from the match, a failed save shows the banner in normal flow and «Guardar» saves once the device has space", async () => {
    const s = startSession(squadSpecs(9));
    s.store.getState().openMatch(s.matchId);
    failCallUpWrites(s.db, "players", "INSERT");
    await open(`/matches/${s.matchId}/new-player`, "Nombre");
    await addViaForm("Nora", "15");
    await screen.findByRole("alert");
    expectBannerInFlow();
    allowCallUpWrites(s.db, "players", "INSERT");
    await pressSave();
    expect(bannerGone()).toBe(true);
  });

  it("RF-085 RF-076 RF-025: new match, a failed save shows the banner in normal flow and «Guardar» saves once the device has space", async () => {
    freshDraft(db);
    startMatchSession(db);
    failInserts(db, "matches");
    await open(`/teams/${team}/matches/new`, "Local");
    await pressSaveMatch();
    await screen.findByRole("alert");
    expectBannerInFlow();
    allowInserts(db, "matches");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
    expect(bannerGone()).toBe(true);
  });
});
