import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { useStore } from "zustand";

import { getMatchesStore } from "@/state/app-stores";
import type { MatchListItem } from "@/state/matches-store";

const NONE: readonly MatchListItem[] = [];

/**
 * The matches of team `id`, loaded on every focus and never while rendering (D3 rules 3 and 5).
 * Only a list that belongs to the route's own team is returned (D3 rule 4).
 */
export function useTeamMatches(id: number | null): readonly MatchListItem[] {
  const store = getMatchesStore();
  const teamMatches = useStore(store, (state) => state.teamMatches);
  useFocusEffect(
    useCallback(() => {
      if (id !== null) store.getState().loadTeam(id);
    }, [id, store]),
  );
  return teamMatches !== null && teamMatches.teamId === id
    ? teamMatches.items
    : NONE;
}
