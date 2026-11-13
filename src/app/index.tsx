import { useEffect } from "react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useStore } from "zustand";

import { getSquadStore } from "@/state/app-stores";

export default function TeamListScreen(): ReactElement {
  const { t } = useTranslation();
  // Asked at render time: the store needs the database, which is open only after start-up.
  const store = getSquadStore();
  const teams = useStore(store, (state) => state.teams);

  useEffect(() => {
    store.getState().loadTeams();
  }, [store]);

  if (teams.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{t("teams.empty")}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={teams}
      keyExtractor={(team) => String(team.id)}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text numberOfLines={1} style={styles.name}>
            {item.name}
          </Text>
          {item.category !== null && item.category !== "" ? (
            <Text numberOfLines={1} style={styles.category}>
              {item.category}
            </Text>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
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
