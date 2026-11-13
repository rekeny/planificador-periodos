import { Stack } from "expo-router";
import { hideAsync, preventAutoHideAsync } from "expo-splash-screen";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";

import "@/i18n";
import { initializeDatabase } from "../state/database-ready";

void preventAutoHideAsync();

export default function RootLayout(): ReactElement | null {
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
  return <Stack screenOptions={{ headerShown: false }} />;
}
