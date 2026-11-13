import { useLocalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useStore } from "zustand";

import { getMatchSessionStore } from "@/state/app-stores";
import { parseMatchId } from "@/state/route-params";
import type { PlayerInput } from "@/state/squad-store";
import { NotFound } from "@/ui/not-found";
import { PlayerForm } from "@/ui/player-form";

// Pushed on top of the call-up screen, which keeps the session open: this route never opens or
// closes it, so a session that is not open for its match shows the not-found message.
export default function NewPlayerInMatchScreen(): ReactElement {
  const router = useRouter();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const id = parseMatchId(matchId);
  const store = getMatchSessionStore();
  const status = useStore(store, (state) => state.status);
  const view = useStore(store, (state) => state.view);

  if (id === null || status !== "open" || view === null || view.matchId !== id)
    return <NotFound />;

  const onSave = (input: PlayerInput) => {
    const result = store.getState().createPlayerInMatch(input);
    if (result.kind === "saved") router.back();
    return result;
  };

  return <PlayerForm onSave={onSave} />;
}
