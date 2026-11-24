import { useLocalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useStore } from "zustand";

import { getSquadStore } from "@/state/app-stores";
import { parsePlayerId, parseTeamId } from "@/state/route-params";
import type { PlayerInput } from "@/state/squad-store";
import { NotFound } from "@/ui/not-found";
import { PlayerActions } from "@/ui/player-actions";
import { PlayerForm } from "@/ui/player-form";
import { useOpenRouteTeam } from "@/ui/use-open-route-team";

export default function EditPlayerScreen(): ReactElement | null {
  const router = useRouter();
  const params = useLocalSearchParams<{ teamId: string; playerId: string }>();
  const id = parseTeamId(params.teamId);
  const playerId = parsePlayerId(params.playerId);
  const store = getSquadStore();
  // Opened from the focus effect, never from a render (F-03); see the other team forms.
  const ready = useOpenRouteTeam(id, store, "if-another");
  const team = useStore(store, (state) => state.team);
  const player = useStore(store, (state) =>
    state.players.find((candidate) => candidate.id === playerId),
  );

  if (id === null || playerId === null) return <NotFound />;
  if (!ready) return null;
  // Only a player of the route's own team is shown (D3 rule 4).
  if (team === null || team.id !== id) return <NotFound />;
  if (player === undefined || player.teamId !== id) return <NotFound />;

  const onSave = (input: PlayerInput) => {
    const result = store.getState().updatePlayer(playerId, input);
    if (result.kind === "saved") router.back();
    return result;
  };
  const onSetActive = (isActive: boolean) => {
    const result = store.getState().setPlayerActive(playerId, isActive);
    if (result.kind === "saved") router.back();
    return result;
  };

  return (
    <PlayerForm
      initialValues={{ name: player.name, number: player.number }}
      onSave={onSave}
    >
      <PlayerActions
        name={player.name}
        isActive={player.isActive}
        onSetActive={onSetActive}
      />
    </PlayerForm>
  );
}
