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
      screenOptions={({ route }) =>
        route.name === "teams/new"
          ? { title: t("teams.new"), presentation: "modal" }
          : { title: t("teams.title") }
      }
    />
  );
}
