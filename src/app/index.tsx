import { useEffect } from "react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useStore } from "zustand";

import { getSquadStore } from "@/state/app-stores";

export default function TeamListScreen(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  // Asked at render time: the store needs the database, which is open only after start-up.
  const store = getSquadStore();
  const teams = useStore(store, (state) => state.teams);

  useEffect(() => {
    store.getState().loadTeams();
  }, [store]);

  const newTeam = (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push("/teams/new")}
      style={styles.newTeam}
    >
      <Text style={styles.newTeamText}>{t("teams.new")}</Text>
    </Pressable>
  );

  if (teams.length === 0) {
    return (
      <View style={styles.screen}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t("teams.empty")}</Text>
        </View>
        {newTeam}
      </View>
    );
  }

  return (
    <FlatList
      data={teams}
      ListFooterComponent={newTeam}
      keyExtractor={(team) => String(team.id)}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/teams/${item.id}`)}
          style={styles.row}
        >
          <Text numberOfLines={1} style={styles.name}>
            {item.name}
          </Text>
          {item.category !== null && item.category !== "" ? (
            <Text numberOfLines={1} style={styles.category}>
              {item.category}
            </Text>
          ) : null}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  newTeam: {
    margin: 16,
    alignItems: "center",
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#1d4ed8",
  },
  newTeamText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  emptyText: { fontSize: 16, textAlign: "center" },
  row: { paddingHorizontal: 16, paddingVertical: 12 },
  name: { fontSize: 18, fontWeight: "600" },
  category: { fontSize: 14, opacity: 0.7 },
});
