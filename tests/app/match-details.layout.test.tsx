// T072, D3 rule 6 and RF-076: the button «Editar» and the grid's other buttons in the assembled match
// screen, with an overtime, at 375 × 667 and 667 × 375 (phone) and 1024 × 768 and 768 × 1024
// (tablet), and the details form at the same sizes. Jest has no layout engine, so these tests check
// the configuration (where each button is drawn, that none is missing, that the form scrolls as
// one); the geometry is checked on a device (T094, T079). Same doubles as match-details.form.test.tsx.
import { renderRouter, screen } from "expo-router/testing-library";
import { StyleSheet } from "react-native";

import {
  openDetailsFromGrid,
  pressEdit,
  seedDetails,
} from "../support/match-details";
import {
  ADD,
  REMOVE_OVERTIME,
  UNDO,
  afterGrid,
  buttonsNamed,
  inHeader,
} from "../support/match-screen-grid";
import {
  KEYBOARD_AWARE,
  inScroll,
  reachable,
  structure,
} from "../support/form-scroll";
import { restoreWindow, setWindow } from "../support/window-size";

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

afterEach(async () => restoreWindow());

const CALL_UP = "Convocatoria";
const EDIT = "Editar";
const GRID_BUTTONS = [UNDO, ADD, REMOVE_OVERTIME];
const ALL = [CALL_UP, EDIT, ...GRID_BUTTONS];

const PHONE_PORTRAIT = { width: 375, height: 667 };
const PHONE_LANDSCAPE = { width: 667, height: 375 };
const TABLET_LANDSCAPE = { width: 1024, height: 768 };
const TABLET_PORTRAIT = { width: 768, height: 1024 };
// Where the buttons go: in the body on a phone in portrait, in the native header otherwise.
const SIZES = [
  ["a phone in portrait", PHONE_PORTRAIT, false],
  ["a phone in landscape", PHONE_LANDSCAPE, true],
  ["a tablet in landscape", TABLET_LANDSCAPE, true],
  ["a tablet in portrait", TABLET_PORTRAIT, true],
] as const;

async function openGridAt(window: { width: number; height: number }) {
  seedDetails({ overtimeCount: 1 });
  await setWindow(window.width, window.height);
  await renderRouter("./src/app", { initialUrl: "/matches/1" });
  await screen.findByRole("button", { name: EDIT });
}

/** The first host view above a button: the one that lays it out with its neighbours. */
function hostParent(button: ReturnType<typeof screen.getByRole>) {
  let node = button.parent;
  while (node !== null && typeof node.type !== "string") node = node.parent;
  if (node === null) throw new Error("The button has no host parent");
  return node;
}

const only = (name: string) => {
  const found = buttonsNamed(name);
  expect(found).toHaveLength(1);
  return found[0]!;
};

describe("match screen with an overtime, «Editar» and the other buttons (D3 rule 6, RF-076)", () => {
  it.each(SIZES)(
    "RF-076 RF-058 RF-059: on %s every button is drawn once, «Convocatoria», «Editar», «Deshacer», «Añadir prórroga» and «Quitar prórroga»",
    async (_name, window) => {
      await openGridAt(window);
      for (const name of ALL) expect(buttonsNamed(name)).toHaveLength(1);
    },
  );

  it("RF-076: on a phone in portrait «Convocatoria» and «Editar» are in the body above the grid, side by side, and the three grid buttons are under it", async () => {
    await openGridAt(PHONE_PORTRAIT);
    for (const name of ALL) expect(inHeader(only(name))).toBe(false);
    expect(afterGrid(only(CALL_UP))).toBe(false);
    expect(afterGrid(only(EDIT))).toBe(false);
    for (const name of GRID_BUTTONS) expect(afterGrid(only(name))).toBe(true);
    // «Editar» sits next to «Convocatoria»: both buttons share one host view that lays them in a row.
    const row = hostParent(only(EDIT));
    expect(row).toBe(hostParent(only(CALL_UP)));
    expect(StyleSheet.flatten(row.props.style)).toMatchObject({
      flexDirection: "row",
    });
  });

  it.each(SIZES.filter(([, , header]) => header))(
    "RF-076: on %s «Convocatoria», «Editar» and the three grid buttons are all in the native header, and none is in the body",
    async (_name, window) => {
      await openGridAt(window);
      for (const name of ALL) expect(inHeader(only(name))).toBe(true);
    },
  );

  it.each(SIZES)(
    "RF-076 RF-025: on %s «Editar» opens the details, whose fields and «Guardar» are all inside one scroll container that keeps taps",
    async (_name, window) => {
      await openGridAt(window);
      await pressEdit();
      await screen.findByLabelText("Local");
      expect(structure()).toEqual(KEYBOARD_AWARE);
      const labels = [
        "Variante",
        "Local",
        "Visitante",
        "Notas",
        "Mi equipo es local",
        "Mi equipo es visitante",
        "Guardar",
      ];
      expect(reachable(labels).filter((control) => !control.inside)).toEqual(
        [],
      );
    },
  );
});

describe("match details, the first field and the header (F-D3-01, D3 rule 15)", () => {
  // The opaque header (headerTransparent false) is pinned in layout.options.test.tsx and
  // layout.header.test.tsx; what Jest can add is that the first field is not drawn outside the scroll.
  it("RF-076: the first thing of the form, «Variante» and its radios, is inside the scroll container, not in a layer of its own over the header's area", async () => {
    seedDetails();
    await openDetailsFromGrid(1);
    expect(inScroll().queryByText("Variante")).not.toBeNull();
    expect(
      inScroll().queryByRole("radio", { name: "4 periodos" }),
    ).not.toBeNull();
  });
});
