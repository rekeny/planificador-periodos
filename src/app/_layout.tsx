import { Stack } from "expo-router";
import { hideAsync, preventAutoHideAsync } from "expo-splash-screen";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";

import "@/i18n";
import { initializeDatabase } from "../state/database-ready";

void preventAutoHideAsync();

export default function RootLayout(): ReactElement | null {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initializeDatabase().then(
      () => {
        setReady(true);
        void hideAsync();
      },
      () => undefined,
    );
  }, []);

  if (!ready) return null;
  // Options by route name here, at layout level: the new-team form is a modal with its own title.
  return (
    <Stack
      screenOptions={({ route }) => {
        if (route.name === "teams/new") {
          return { title: t("teams.new"), presentation: "modal" };
        }
        if (route.name === "teams/[teamId]/edit") {
          return { title: t("common.edit"), presentation: "modal" };
        }
        if (route.name === "teams/[teamId]/players/new") {
          return { title: t("players.new"), presentation: "modal" };
        }
        if (route.name === "teams/[teamId]/matches/new") {
          return { title: t("matches.new"), presentation: "modal" };
        }
        // The match screen has no title of its own yet; the empty string hides the route name.
        if (route.name === "matches/[matchId]/index") return { title: "" };
        if (route.name === "matches/[matchId]/call-up") {
          return { title: t("callUp.title") };
        }
        if (route.name === "matches/[matchId]/new-player") {
          return { title: t("players.new"), presentation: "modal" };
        }
        return { title: t("teams.title") };
      }}
    />
  );
}
