import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMemo } from "react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { useStore } from "zustand";

import { getSquadStore } from "@/state/app-stores";
import { parseTeamId } from "@/state/route-params";
import {
  buildTeamSections,
  renderTeamRow,
  TeamSectionFooter,
  TeamSectionHeader,
  teamRowKey,
} from "@/ui/team-sections";
import { NotFound } from "@/ui/not-found";
import { useOpenRouteTeam } from "@/ui/use-open-route-team";
import { useTeamMatches } from "@/ui/use-team-matches";
import { DuplicateNumberBanner } from "@/ui/warnings/duplicate-number-banner";

// Material symbol on Android, SF Symbol on iOS: one icon, no new dependency.
function EditButton({ teamId }: { teamId: number }): ReactElement | null {
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

function TeamActions({ teamId }: { teamId: number }): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={styles.actions}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/teams/${teamId}/matches/new`)}
        style={[styles.action, styles.primary]}
      >
        <Text numberOfLines={1} style={styles.primaryText}>
          {t("matches.new")}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/teams/${teamId}/players/new`)}
        style={[styles.action, styles.secondary]}
      >
        <Text numberOfLines={1} style={styles.secondaryText}>
          {t("players.new")}
        </Text>
      </Pressable>
    </View>
  );
}

export default function TeamScreen(): ReactElement | null {
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const id = parseTeamId(teamId);
  const store = getSquadStore();
  // Opened on every focus, from the focus effect and never from a render (F-03): the screen stays
  // mounted under the match, so players created there (and their duplicate-number warning) show on
  // Back (RF-035, RF-069).
  const ready = useOpenRouteTeam(id, store, "every-focus");
  const team = useStore(store, (state) => state.team);
  const players = useStore(store, (state) => state.players);
  const duplicates = useStore(store, (state) => state.duplicateNumbers);
  const matches = useTeamMatches(id);
  const sections = useMemo(
    () => buildTeamSections(players, matches),
    [players, matches],
  );

  if (id === null) return <NotFound />;
  if (!ready) return null;
  if (team === null || team.id !== id) return <NotFound />;

  return (
    <View style={styles.screen}>
      {/* Inside the screen, not in the layout: only here is the team's name known. */}
      <Stack.Screen
        options={{
          title: team.name,
          headerRight: () => <EditButton teamId={id} />,
        }}
      />
      <TeamActions teamId={id} />
      <DuplicateNumberBanner numbers={duplicates} />
      <SectionList
        sections={sections}
        initialNumToRender={40}
        keyExtractor={teamRowKey}
        renderSectionHeader={({ section }) => (
          <TeamSectionHeader sectionKey={section.key} />
        )}
        renderSectionFooter={({ section }) => (
          <TeamSectionFooter
            sectionKey={section.key}
            empty={section.data.length === 0}
          />
        )}
        renderItem={(info) =>
          renderTeamRow(info, (matchId) => router.push(`/matches/${matchId}`))
        }
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
});
