import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useStore } from "zustand";

import { getMatchesStore } from "@/state/app-stores";
import { MatchListItem } from "@/ui/match-list-item";

// The list of every match, newest first (RF-074). It loads on every focus, never while rendering,
// so a match deleted or created elsewhere is up to date when the coach comes back (D3 rule 5).
export default function AllMatchesScreen(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const store = getMatchesStore();
  const matches = useStore(store, (state) => state.allMatches);

  useFocusEffect(
    useCallback(() => {
      store.getState().loadAll();
    }, [store]),
  );

  if (matches.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{t("matches.empty")}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={matches}
      keyExtractor={(match) => String(match.id)}
      renderItem={({ item }) => (
        <MatchListItem
          item={item}
          onPress={() => router.push(`/matches/${item.id}`)}
        />
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
});
