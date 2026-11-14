import { Stack } from "expo-router";
import { hideAsync, preventAutoHideAsync } from "expo-splash-screen";
import { useEffect } from "react";
import type { ReactElement } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import "@/i18n";
import { useDatabaseStart } from "../state/use-database-start";
import { DatabaseOpenFailed } from "../ui/database-open-failed";

void preventAutoHideAsync();

type Translate = TFunction;

// `as const` keeps the literal type that the navigator options ask for.
const MODAL = "modal" as const;

// Options by route name here, at layout level: the new-team form is a modal with its own title.
function screenOptionsFor(t: Translate) {
  return ({ route }: { route: { name: string } }) => {
    if (route.name === "teams/new") {
      return { title: t("teams.new"), presentation: MODAL };
    }
    if (route.name === "teams/[teamId]/edit") {
      return { title: t("common.edit"), presentation: MODAL };
    }
    if (route.name === "teams/[teamId]/players/new") {
      return { title: t("players.new"), presentation: MODAL };
    }
    if (route.name === "teams/[teamId]/matches/new") {
      return { title: t("matches.new"), presentation: MODAL };
    }
    // The match screen has no title of its own yet; the empty string hides the route name.
    if (route.name === "matches/[matchId]/index") return { title: "" };
    if (route.name === "matches/[matchId]/call-up") {
      return { title: t("callUp.title") };
    }
    if (route.name === "matches/[matchId]/new-player") {
      return { title: t("players.new"), presentation: MODAL };
    }
    return { title: t("teams.title") };
  };
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
  return <Stack screenOptions={screenOptionsFor(t)} />;
}
