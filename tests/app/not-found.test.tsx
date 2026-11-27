// F-SMALL-2: the screen of an address that matches no route (`+not-found`). Real src/app routes
// run through renderRouter, with the doubles of teams-list.test.tsx. The texts are the ones the
// developer approved on 2026-11-26.
import {
  fireEvent,
  renderRouter,
  screen,
  testRouter,
} from "expo-router/testing-library";

import es from "@/i18n/es.json";
import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { headerConfigs } from "../support/screen-reading";
import type { SquadStore } from "../support/squad-fixtures";

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

let mockStore: SquadStore | undefined;
jest.mock("@/state/app-stores", () => ({
  getSquadStore: () => {
    if (mockStore === undefined) {
      throw new Error("The test gave no squad store");
    }
    return mockStore;
  },
}));

const TITLE = "Pantalla no encontrada";
const MESSAGE = "Esta dirección no existe en la app.";
const BACK = "Volver a los equipos";

// The app opens on the unknown address, as a stale link would open it.
async function openUnknownAddress(): Promise<void> {
  await renderRouter("./src/app", { initialUrl: "/esta-direccion-no-existe" });
}

beforeEach(() => {
  mockStore = createSquadStore(resetMockDatabase());
});

describe("not-found route", () => {
  it("RF-012: es.json holds the three texts of the not-found screen", () => {
    const texts = es as unknown as { notFound?: Record<string, string> };
    expect(texts.notFound?.title).toBe(TITLE);
    expect(texts.notFound?.screenMessage).toBe(MESSAGE);
    expect(texts.notFound?.back).toBe(BACK);
  });

  it("RF-012: an address the app does not have shows the title in the header, the message and the button in Spanish", async () => {
    await openUnknownAddress();
    expect(await screen.findByText(MESSAGE)).toBeTruthy();
    expect(headerConfigs()).toEqual([{ title: TITLE, hidden: false }]);
    expect(screen.getByRole("button", { name: BACK })).toBeTruthy();
  });

  it("RF-073: «Volver a los equipos» replaces the route with the list of teams, with nothing to go back to", async () => {
    await openUnknownAddress();
    await fireEvent.press(await screen.findByRole("button", { name: BACK }));
    expect(await screen.findByText(es.teams.empty)).toBeTruthy();
    expect(screen).toHavePathname("/");
    expect(testRouter.canGoBack()).toBe(false);
  });
});
