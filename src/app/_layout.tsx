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
  return <Stack screenOptions={{ title: t("teams.title") }} />;
}
