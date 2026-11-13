import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { MatchView, RowView } from "@/state/match-view";

interface CallUpRowsProps {
  readonly rows: readonly RowView[];
  readonly onRemove: (row: RowView) => void;
}

/** The call-up in the view's order, each row with its own remove button. */
export function CallUpRows({ rows, onRemove }: CallUpRowsProps): ReactElement {
  const { t } = useTranslation();
  return (
    <>
      {rows.map((row) => (
        <View key={row.entryId} style={styles.row}>
          <Text style={styles.number}>{row.number}</Text>
          <Text numberOfLines={1} style={styles.name}>
            {row.name}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => onRemove(row)}
            style={styles.button}
          >
            <Text style={styles.remove}>{t("callUp.remove")}</Text>
          </Pressable>
        </View>
      ))}
    </>
  );
}

interface PlayersToAddProps {
  readonly players: MatchView["playersToAdd"];
  readonly onAdd: (playerId: number) => void;
}

/** Active players who are not in the call-up; pressing a name adds that player (RF-032). */
export function PlayersToAdd({
  players,
  onAdd,
}: PlayersToAddProps): ReactElement {
  const { t } = useTranslation();
  return (
    <>
      <Text style={styles.heading}>{t("callUp.add")}</Text>
      {players.length === 0 ? (
        <Text style={styles.empty}>{t("callUp.addEmpty")}</Text>
      ) : (
        players.map((player) => (
          <Pressable
            key={player.id}
            accessibilityRole="button"
            onPress={() => onAdd(player.id)}
            style={styles.row}
          >
            <Text style={styles.number}>{player.number}</Text>
            <Text numberOfLines={1} style={styles.name}>
              {player.name}
            </Text>
          </Pressable>
        ))
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  number: { fontSize: 18, fontWeight: "700", minWidth: 32 },
  name: { flex: 1, fontSize: 18 },
  button: { padding: 8 },
  remove: { fontSize: 16, color: "#b00020" },
  heading: { margin: 16, fontSize: 18, fontWeight: "600" },
  empty: { marginHorizontal: 16, fontSize: 16 },
});
