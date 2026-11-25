// Small change "opaque navigation header on iOS 26" (specs/001-planificador-v1/small-change-ios26-header.md).
// There is no RF for it: the header is part of the screens that RF-076 requires on every device,
// so the titles carry RF-076. Jest has no layout engine, so the observable thing is the options
// the root layout gives to the Stack: a mocked Stack keeps the `screenOptions` callback it
// receives and the test asks it for every route. The layout file is the real one.
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";

import RootLayout from "@/app/_layout";

type ScreenOptions = (args: { route: { name: string } }) => {
  headerTransparent?: boolean;
};

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

const ROUTES = [
  "index",
  "teams/new",
  "teams/[teamId]/index",
  "teams/[teamId]/edit",
  "teams/[teamId]/players/new",
  "teams/[teamId]/players/[playerId]",
  "teams/[teamId]/matches/new",
  "matches/[matchId]/index",
  "matches/[matchId]/call-up",
  "matches/[matchId]/new-player",
  "matches/[matchId]/edit",
];

describe("root layout, navigation header", () => {
  it.each(ROUTES)(
    "RF-076: the route %s has an opaque header, so its content starts below it on iOS 26",
    async (name) => {
      await render(<RootLayout />);
      // The layout draws the Stack only after the database start-up ends.
      await new Promise((resolve) => setImmediate(resolve));
      const options = received.screenOptions?.({ route: { name } });
      expect(options).toMatchObject({ headerTransparent: false });
    },
  );
});
