// T071 (D3 rule 11): `screenOptionsFor` of src/app/_layout.tsx becomes a table by route name. This
// test lists every D2 route with the title and the presentation it has today, so that the rewrite
// cannot change one, and adds the list of every match, `matches/index`, titled «Todos los
// partidos» (`matches.allTitle`) and pushed as a normal screen (D3-3). Jest has no layout engine
// nor native header, so the observable thing is the options the root layout gives to the Stack: a
// mocked Stack keeps the `screenOptions` callback it receives and the test asks it for each route
// (as layout.header.test.tsx does). The layout file is the real one.
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";

import RootLayout from "@/app/_layout";

type Options = {
  headerTransparent?: boolean;
  title?: string;
  presentation?: string;
};
type ScreenOptions = (args: { route: { name: string } }) => Options;

const received: { screenOptions?: ScreenOptions } = {};

jest.mock("@/state/database-ready", () => ({
  initializeDatabase: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo-router", () => ({
  Stack: (props: { screenOptions: ScreenOptions }): ReactElement | null => {
    received.screenOptions = props.screenOptions;
    return null;
  },
}));

type Row = [route: string, title: string, presentation: string | undefined];

// Titles are the Spanish texts of es.json, written out so that a changed key shows up here.
const D2_ROUTES: Row[] = [
  ["index", "Equipos", undefined],
  ["teams/new", "Nuevo equipo", "modal"],
  ["teams/[teamId]/index", "Equipos", undefined],
  ["teams/[teamId]/edit", "Editar", "modal"],
  ["teams/[teamId]/players/new", "Nuevo jugador", "modal"],
  ["teams/[teamId]/matches/new", "Nuevo partido", "modal"],
  ["matches/[matchId]/index", "", undefined],
  ["matches/[matchId]/call-up", "Convocatoria", undefined],
  ["matches/[matchId]/new-player", "Nuevo jugador", "modal"],
];

async function optionsOf(route: string): Promise<Options> {
  await render(<RootLayout />);
  // The layout draws the Stack only after the database start-up ends.
  await new Promise((resolve) => setImmediate(resolve));
  const options = received.screenOptions?.({ route: { name: route } });
  if (options === undefined) throw new Error("The layout drew no Stack");
  return options;
}

describe("root layout, the options of every route", () => {
  it.each(D2_ROUTES)(
    "RF-076: the D2 route %s keeps its title «%s» and its presentation (%s) and an opaque header",
    async (route, title, presentation) => {
      expect(await optionsOf(route)).toEqual({
        headerTransparent: false,
        title,
        presentation,
      });
    },
  );

  it("RF-074: the list of every match, matches/index, is titled «Todos los partidos», is a normal screen and has an opaque header", async () => {
    expect(await optionsOf("matches/index")).toEqual({
      headerTransparent: false,
      title: "Todos los partidos",
    });
  });

  it("RF-025 RF-028 RF-076: the match details, matches/[matchId]/edit, is titled «Editar» (common.edit), is a modal and has an opaque header, so its first field starts below it (F-D3-01)", async () => {
    expect(await optionsOf("matches/[matchId]/edit")).toEqual({
      headerTransparent: false,
      title: "Editar",
      presentation: "modal",
    });
  });

  it("RF-018 RF-022 RF-076: the player screen, teams/[teamId]/players/[playerId], is titled «Editar» (common.edit), is a modal and has an opaque header, so its first field starts below it (F-D3-01)", async () => {
    expect(await optionsOf("teams/[teamId]/players/[playerId]")).toEqual({
      headerTransparent: false,
      title: "Editar",
      presentation: "modal",
    });
  });

  it("RF-076: a route the table does not list gets the title «Equipos», as before, and an opaque header", async () => {
    expect(await optionsOf("something/else")).toEqual({
      headerTransparent: false,
      title: "Equipos",
    });
  });

  it("RF-074 RF-076: the options are the same on every call for the same route, so a re-render does not change a title", async () => {
    await render(<RootLayout />);
    await new Promise((resolve) => setImmediate(resolve));
    const ask = received.screenOptions;
    const first = ask?.({ route: { name: "matches/index" } });
    const second = ask?.({ route: { name: "matches/index" } });
    expect(second).toEqual(first);
    expect(ask?.({ route: { name: "teams/new" } })).toEqual({
      headerTransparent: false,
      title: "Nuevo equipo",
      presentation: "modal",
    });
  });
});
