import { Stack } from "expo-router";
import { hideAsync, preventAutoHideAsync } from "expo-splash-screen";
import { useEffect } from "react";
import type { ReactElement } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import "@/i18n";
import { useDatabaseStart } from "../state/use-database-start";
import { DatabaseOpenFailed } from "../ui/database-open-failed";

void preventAutoHideAsync();

type Translate = TFunction;

// `as const` keeps the literal type that the navigator options ask for.
const MODAL = "modal" as const;

// Options by route name here, at layout level: the new-team form is a modal with its own title.
// iOS 26 (Liquid Glass) makes the header transparent when no background is set, so the content
// would start behind it. An explicit opaque header keeps the content below it.
const ROOT = { flex: 1 } as const;

const BASE = { headerTransparent: false } as const;

type RouteOptions = { title: string; presentation?: typeof MODAL };

// Title and presentation by route name. A route that is not listed gets the title of the list of
// teams. The match screen has no title of its own yet; the empty string hides the route name.
function optionsTable(t: Translate): Record<string, RouteOptions> {
  return {
    "teams/new": { title: t("teams.new"), presentation: MODAL },
    "teams/[teamId]/edit": { title: t("common.edit"), presentation: MODAL },
    "teams/[teamId]/players/new": {
      title: t("players.new"),
      presentation: MODAL,
    },
    "teams/[teamId]/matches/new": {
      title: t("matches.new"),
      presentation: MODAL,
    },
    "matches/index": { title: t("matches.allTitle") },
    "matches/[matchId]/index": { title: "" },
    "matches/[matchId]/call-up": { title: t("callUp.title") },
    "matches/[matchId]/edit": { title: t("common.edit"), presentation: MODAL },
    "matches/[matchId]/new-player": {
      title: t("players.new"),
      presentation: MODAL,
    },
  };
}

function screenOptionsFor(t: Translate) {
  const table = optionsTable(t);
  return ({ route }: { route: { name: string } }) => ({
    ...BASE,
    ...(table[route.name] ?? { title: t("teams.title") }),
  });
}

export default function RootLayout(): ReactElement | null {
  const { t } = useTranslation();
  const { status, retrying, retry } = useDatabaseStart();

  // The splash screen is hidden once, the first time the start-up ends, well or badly.
  const opening = status === "opening";
  useEffect(() => {
    if (!opening) void hideAsync();
  }, [opening]);

  if (opening) return null;
  if (status === "failed") {
    return <DatabaseOpenFailed retrying={retrying} onRetry={retry} />;
  }
  return (
    <GestureHandlerRootView style={ROOT}>
      <Stack screenOptions={screenOptionsFor(t)} />
    </GestureHandlerRootView>
  );
}
