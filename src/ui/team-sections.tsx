import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import type { SectionListRenderItemInfo } from "react-native";

import type { Player } from "@/domain/squad";
import type { MatchListItem as Item } from "@/state/matches-store";
import { MatchListItem } from "@/ui/match-list-item";

export type TeamRow =
  | { readonly kind: "player"; readonly player: Player }
  | { readonly kind: "match"; readonly match: Item };

export interface TeamSection {
  readonly key: "players" | "matches";
  readonly data: readonly TeamRow[];
}

/**
 * The two sections of the team screen: the players, then the team's matches (RF-016, RF-075). Only
 * the matches of the route's own team are given in `matches` (D3 rule 4).
 */
export function buildTeamSections(
  players: readonly Player[],
  matches: readonly Item[],
): TeamSection[] {
  return [
    {
      key: "players",
      data: players.map((player) => ({ kind: "player", player })),
    },
    {
      key: "matches",
      data: matches.map((match) => ({ kind: "match", match })),
    },
  ];
}

export function teamRowKey(row: TeamRow): string {
  return row.kind === "player" ? `p${row.player.id}` : `m${row.match.id}`;
}

export function TeamSectionHeader({
  sectionKey,
}: {
  sectionKey: TeamSection["key"];
}): ReactElement {
  const { t } = useTranslation();
  return (
    <Text accessibilityRole="header" style={styles.heading}>
      {t(sectionKey === "players" ? "team.players" : "team.matches")}
    </Text>
  );
}

// Only the matches section can show text under an empty list: an empty team shows none (2026-11-12).
export function TeamSectionFooter({
  sectionKey,
  empty,
}: {
  sectionKey: TeamSection["key"];
  empty: boolean;
}): ReactElement | null {
  const { t } = useTranslation();
  if (sectionKey !== "matches" || !empty) return null;
  return <Text style={styles.empty}>{t("matches.empty")}</Text>;
}

export function renderTeamRow(
  info: SectionListRenderItemInfo<TeamRow, TeamSection>,
  openMatch: (matchId: number) => void,
): ReactElement {
  const row = info.item;
  if (row.kind === "match") {
    return (
      <MatchListItem item={row.match} onPress={() => openMatch(row.match.id)} />
    );
  }
  return (
    <View style={styles.row}>
      <Text style={styles.number}>{row.player.number}</Text>
      <Text numberOfLines={1} style={styles.name}>
        {row.player.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    fontSize: 20,
    fontWeight: "700",
  },
  empty: { paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  number: { fontSize: 18, fontWeight: "700", minWidth: 32 },
  name: { flex: 1, fontSize: 18 },
});
