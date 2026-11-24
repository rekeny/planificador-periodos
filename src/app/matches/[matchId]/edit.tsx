import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import type { ReactElement } from "react";
import { useStore } from "zustand";

import { getMatchSessionStore, newMatchDetailsDraft } from "@/state/app-stores";
import { parseMatchId } from "@/state/route-params";
import { MatchDetailsSave } from "@/ui/match-details-save";
import { MatchForm } from "@/ui/match-form";
import { NotFound } from "@/ui/not-found";

// The match details: the form of the new match without the call-up, over the session's match.
// The screen owns its draft, built once when it mounts and never in a shared store's action while
// rendering (D3 rules 3 and 4); it draws only while the session is open for its own match.
export default function MatchDetailsScreen(): ReactElement {
  const router = useRouter();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const id = parseMatchId(matchId);
  const [draft] = useState(() => newMatchDetailsDraft(id ?? 0));
  const session = getMatchSessionStore();
  const status = useStore(session, (state) => state.status);
  const view = useStore(session, (state) => state.view);
  const ready = useStore(draft, (state) => state.status === "ready");

  if (id === null || !ready || status !== "open" || view?.matchId !== id) {
    return <NotFound />;
  }
  const current = view.formatOptions.find((option) => option.isCurrent);

  return (
    <MatchForm
      draft={draft}
      format={current?.format ?? view.formatOptions[0]!.format}
      // Changing the format of an open match is wired in T096.
      onFormatChange={() => undefined}
    >
      <MatchDetailsSave draft={draft} onSaved={() => router.back()} />
    </MatchForm>
  );
}
