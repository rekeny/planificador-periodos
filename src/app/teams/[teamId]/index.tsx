import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useStore } from "zustand";

import { getSquadStore } from "@/state/app-stores";
import { parseTeamId } from "@/state/route-params";
import { NotFound } from "@/ui/not-found";
import { DuplicateNumberBanner } from "@/ui/warnings/duplicate-number-banner";

type Store = ReturnType<typeof getSquadStore>;

// Opened before the first render reads the store, so another team's players never show, and
// again on every focus: the screen stays mounted under the match, so players created there
// (and their duplicate-number warning) show on Back (RF-035, RF-069).
function useOpenTeam(id: number | null, store: Store): void {
  useState(() => {
    if (id !== null) store.getState().openTeam(id);
  });
  useFocusEffect(
    useCallback(() => {
      if (id !== null) store.getState().openTeam(id);
    }, [id, store]),
  );
}

// Material symbol on Android, SF Symbol on iOS: one icon, no new dependency.
function EditButton({ teamId }: { teamId: number }): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Pressable
      accessibilityLabel={t("teams.edit")}
      accessibilityRole="button"
      onPress={() => router.push(`/teams/${teamId}/edit`)}
      style={styles.editIcon}
    >
      <SymbolView
        name={{ ios: "pencil", android: "edit", web: "edit" }}
        size={22}
        tintColor="#1d4ed8"
      />
    </Pressable>
  );
}

export default function TeamScreen(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const id = parseTeamId(teamId);
  const store = getSquadStore();
  useOpenTeam(id, store);
  const team = useStore(store, (state) => state.team);
  const players = useStore(store, (state) => state.players);
  const duplicates = useStore(store, (state) => state.duplicateNumbers);

  if (id === null || team === null || team.id !== id) return <NotFound />;

  return (
    <View style={styles.screen}>
      {/* Inside the screen, not in the layout: only here is the team's name known. */}
      <Stack.Screen
        options={{
          title: team.name,
          headerRight: () => <EditButton teamId={id} />,
        }}
      />
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/teams/${id}/matches/new`)}
          style={[styles.action, styles.primary]}
        >
          <Text numberOfLines={1} style={styles.primaryText}>
            {t("matches.new")}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/teams/${id}/players/new`)}
          style={[styles.action, styles.secondary]}
        >
          <Text numberOfLines={1} style={styles.secondaryText}>
            {t("players.new")}
          </Text>
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
  editIcon: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  action: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#1d4ed8",
  },
  primary: { backgroundColor: "#1d4ed8" },
  secondary: { backgroundColor: "transparent" },
  primaryText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  secondaryText: { color: "#1d4ed8", fontSize: 16, fontWeight: "600" },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  number: { fontSize: 18, fontWeight: "700", minWidth: 32 },
  name: { flex: 1, fontSize: 18 },
});
