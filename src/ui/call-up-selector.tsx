import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useStore } from "zustand";

import type { NewMatchDraft } from "@/state/new-match-draft";
import { CallUpRangeBanner } from "./warnings/call-up-range-banner";

interface CallUpSelectorProps {
  readonly draft: NewMatchDraft;
}

/** Every active player with a checkbox, the count and the range warning (RF-030, RF-031, RF-068). */
export function CallUpSelector({ draft }: CallUpSelectorProps): ReactElement {
  const { t } = useTranslation();
  const rows = useStore(draft, (state) => state.callUpSelection);
  const range = useStore(draft, (state) => state.callUpRange);
  const toggle = useStore(draft, (state) => state.toggle);
  const count = rows.filter((row) => row.selected).length;
  return (
    <View>
      <Text style={styles.heading}>{t("callUp.title")}</Text>
      <Text style={styles.count}>{t("callUp.count", { count })}</Text>
      <CallUpRangeBanner warning={range} />
      {rows.map(({ player, selected }) => (
        <Pressable
          key={player.id}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selected }}
          onPress={() => toggle(player.id)}
          style={[styles.row, selected ? styles.selected : styles.unselected]}
        >
          <Text style={styles.number}>{player.number}</Text>
          <Text numberOfLines={1} style={styles.name}>
            {player.name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 14, marginTop: 8 },
  count: { fontSize: 16, marginVertical: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
  selected: { backgroundColor: "#dbeafe" },
  unselected: { opacity: 0.5 },
  number: { width: 36, fontSize: 16, fontWeight: "bold" },
  name: { flex: 1, fontSize: 16 },
});
