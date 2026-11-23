import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text } from "react-native";

import type { MatchListItem as Item } from "@/state/matches-store";

interface Props {
  readonly item: Item;
  readonly onPress: () => void;
}

// One match of a list of matches (RF-074, RF-075). The team's name and category are drawn only
// when the item has a team: the list of every match.
export function MatchListItem({ item, onPress }: Props): ReactElement {
  const { t } = useTranslation();
  const { team, score } = item;
  const category = team?.category ?? "";
  const when = item.time === null ? item.date : `${item.date} ${item.time}`;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <Text numberOfLines={1} style={styles.when}>
        {when}
      </Text>
      <Text numberOfLines={2} style={styles.sides}>
        {t("matches.item.sides", {
          home: item.homeName ?? t("match.field.home"),
          away: item.awayName ?? t("match.field.away"),
        })}
      </Text>
      {score === null ? null : (
        <Text numberOfLines={1} style={styles.sides}>
          {t("matches.item.score", { home: score.home, away: score.away })}
        </Text>
      )}
      <Text numberOfLines={1} style={styles.detail}>
        {t("format.option", { count: item.format })}
      </Text>
      {team === null ? null : (
        <Text numberOfLines={1} style={styles.detail}>
          {team.name}
        </Text>
      )}
      {category === "" ? null : (
        <Text numberOfLines={1} style={styles.detail}>
          {category}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingVertical: 12 },
  when: { fontSize: 14, opacity: 0.7 },
  sides: { fontSize: 18, fontWeight: "600" },
  detail: { fontSize: 14, opacity: 0.7 },
});
