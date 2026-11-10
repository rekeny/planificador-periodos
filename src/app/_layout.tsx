import { Stack } from "expo-router";
import type { ReactElement } from "react";

import "@/i18n";

export default function RootLayout(): ReactElement {
  return <Stack screenOptions={{ headerShown: false }} />;
}
