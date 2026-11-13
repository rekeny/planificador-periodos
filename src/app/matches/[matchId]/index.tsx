import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useStore } from "zustand";

import { getMatchSessionStore } from "@/state/app-stores";
import { parseMatchId } from "@/state/route-params";
import { NotFound } from "@/ui/not-found";
import { CallUpRangeBanner } from "@/ui/warnings/call-up-range-banner";

// First version of the match screen: the call-up and its warning (the grid arrives later).
export default function MatchScreen(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const id = parseMatchId(matchId);
  const store = getMatchSessionStore();
  // Opened once, before the first render reads the store, so another match's data is never shown.
  useState(() => {
    if (id !== null) store.getState().openMatch(id);
  });
  // Only popping this screen closes the session: the call-up screen is pushed on top of it and
  // this one stays mounted below (RF-057). Focus events are not used for that reason.
  useEffect(() => () => store.getState().closeMatch(), [store]);
  const status = useStore(store, (state) => state.status);
  const view = useStore(store, (state) => state.view);

  if (id === null || status !== "open" || view === null) return <NotFound />;

  return (
    <ScrollView style={styles.screen}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/matches/${id}/call-up`)}
        style={styles.action}
      >
        <Text style={styles.actionText}>{t("callUp.title")}</Text>
      </Pressable>
      <CallUpRangeBanner warning={view.callUpRange} />
      {view.rows.map((row) => (
        <View key={row.entryId} style={styles.row}>
          <Text style={styles.number}>{row.number}</Text>
          <Text numberOfLines={1} style={styles.name}>
            {row.name}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  action: {
    alignItems: "center",
    margin: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#1d4ed8",
  },
  actionText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  number: { fontSize: 18, fontWeight: "700", minWidth: 32 },
  name: { flex: 1, fontSize: 18 },
});
