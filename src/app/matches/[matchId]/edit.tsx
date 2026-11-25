import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import type { ReactElement } from "react";
import { useStore } from "zustand";

import { getMatchSessionStore, newMatchDetailsDraft } from "@/state/app-stores";
import type { MatchDetailsDraft } from "@/state/match-details-draft";
import type { MatchView } from "@/state/match-view";
import { parseMatchId } from "@/state/route-params";
import { useMatchDetailsActions } from "@/ui/match-details-actions";
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
  return (
    <Details
      draft={draft}
      matchId={id}
      view={view}
      onSaved={() => router.back()}
    />
  );
}

interface DetailsProps {
  readonly draft: MatchDetailsDraft;
  readonly matchId: number;
  readonly view: MatchView;
  readonly onSaved: () => void;
}

// Drawn only once the guards above hold, so the actions' hook never runs for another match.
function Details({
  draft,
  matchId,
  view,
  onSaved,
}: DetailsProps): ReactElement {
  const current = view.formatOptions.find((option) => option.isCurrent);
  const format = current?.format ?? view.formatOptions[0]!.format;
  const actions = useMatchDetailsActions(matchId, format);
  return (
    <MatchForm
      draft={draft}
      format={format}
      onFormatChange={actions.onFormatChange}
    >
      <MatchDetailsSave draft={draft} onSaved={onSaved} />
      {actions.footer}
    </MatchForm>
  );
}
