import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useStore } from "zustand";

import { getSquadStore } from "@/state/app-stores";
import { parseTeamId } from "@/state/route-params";
import { NotFound } from "@/ui/not-found";
import { DuplicateNumberBanner } from "@/ui/warnings/duplicate-number-banner";

export default function TeamScreen(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const id = parseTeamId(teamId);
  const store = getSquadStore();
  // Opened once, before the first render reads the store, so another team's players are never
  // shown. It is a read that is safe to repeat; an effect would need setState.
  useState(() => {
    if (id !== null) store.getState().openTeam(id);
  });
  const team = useStore(store, (state) => state.team);
  const players = useStore(store, (state) => state.players);
  const duplicates = useStore(store, (state) => state.duplicateNumbers);

  if (id === null || team === null || team.id !== id) return <NotFound />;

  return (
    <View style={styles.screen}>
      {/* Inside the screen, not in the layout: only here is the team's name known. */}
      <Stack.Screen options={{ title: team.name }} />
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/teams/${id}/edit`)}
          style={styles.action}
        >
          <Text style={styles.actionText}>{t("common.edit")}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/teams/${id}/players/new`)}
          style={styles.action}
        >
          <Text style={styles.actionText}>{t("players.new")}</Text>
        </Pressable>
      </View>
      <DuplicateNumberBanner numbers={duplicates} />
      <FlatList
        data={players}
        keyExtractor={(player) => String(player.id)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.number}>{item.number}</Text>
            <Text numberOfLines={1} style={styles.name}>
              {item.name}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  actions: { flexDirection: "row", gap: 8, padding: 16 },
  action: {
    flex: 1,
    alignItems: "center",
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
