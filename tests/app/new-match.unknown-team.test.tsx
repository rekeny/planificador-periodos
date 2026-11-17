// D2 review F1 (RF-082): the new-match route of a team that cannot be loaded (unknown id, failed
// read) shows NotFound: no form, nothing to save, and no trace of a draft abandoned for another
// team. Real src/app routes through renderRouter; the doubles are those of new-match.save.test.tsx.
import {
  act,
  renderRouter,
  screen,
  waitFor,
} from "expo-router/testing-library";

import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import { NOT_FOUND } from "../support/edit-team";
import { savedMatches } from "../support/new-match-fixtures";
import type { NewMatchDraft } from "../support/new-match-fixtures";
import {
  freshDraft,
  homeField,
  openFormAlone,
  typeIn,
} from "../support/new-match-form";
import { seedSquadTeam, squadOf } from "../support/new-match-save";
import { breakReads } from "../support/squad-fixtures";

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
let teamId: number;

beforeEach(() => {
  db = resetMockDatabase();
  useMockSquadStore(createSquadStore(db));
  draft = freshDraft(db);
  teamId = seedSquadTeam(db, squadOf(12));
});

/** The form is not drawn: no field, no «Guardar», and the message of NotFound is. */
async function expectNotFound(): Promise<void> {
  expect(await screen.findByText(NOT_FOUND)).toBeTruthy();
  expect(screen.queryByLabelText("Local")).toBeNull();
  expect(screen.queryByRole("button", { name: "Guardar" })).toBeNull();
}

describe("new-match route, a team that cannot be loaded", () => {
  it("RF-082: an abandoned draft of team A and then /teams/9999/matches/new shows NotFound, no form and nothing can be saved", async () => {
    await openFormAlone(teamId);
    await typeIn(homeField(), "Abandoned home");
    await act(async () => screen.unmount());
    await renderRouter("./src/app", {
      initialUrl: "/teams/9999/matches/new",
    });
    await expectNotFound();
    expect(draft.getState().create()).toEqual({ kind: "unchanged" });
    expect(savedMatches(db)).toEqual([]);
    expect(draft.getState().homeName).toBe("");
  });

  it("RF-082: a team that does not exist on a fresh start shows NotFound and no form", async () => {
    await renderRouter("./src/app", {
      initialUrl: "/teams/9999/matches/new",
    });
    await expectNotFound();
    expect(savedMatches(db)).toEqual([]);
  });

  it("RF-082 RF-085: a failed read of the team's players shows NotFound, no form, and the earlier abandoned draft cannot be saved", async () => {
    await openFormAlone(teamId);
    await typeIn(homeField(), "Abandoned home");
    await act(async () => screen.unmount());
    breakReads(db, "players");
    await renderRouter("./src/app", {
      initialUrl: `/teams/${teamId}/matches/new`,
    });
    await expectNotFound();
    expect(draft.getState().create()).toEqual({ kind: "unchanged" });
    expect(savedMatches(db)).toEqual([]);
  });

  it("RF-082 RF-085: a failed read of the team shows NotFound and no form", async () => {
    breakReads(db, "teams");
    await renderRouter("./src/app", {
      initialUrl: `/teams/${teamId}/matches/new`,
    });
    await expectNotFound();
  });

  it("RF-082: after a NotFound route, opening the team's own form works with the defaults and no abandoned text", async () => {
    await openFormAlone(teamId);
    await typeIn(homeField(), "Abandoned home");
    await act(async () => screen.unmount());
    await renderRouter("./src/app", {
      initialUrl: "/teams/9999/matches/new",
    });
    await expectNotFound();
    await act(async () => screen.unmount());
    await openFormAlone(teamId);
    await waitFor(() => expect(homeField().props.value).toBe(""));
  });
});
