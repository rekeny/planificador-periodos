import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import type { ReactElement } from "react";
import { useStore } from "zustand";

import { getSquadStore } from "@/state/app-stores";
import { parseTeamId } from "@/state/route-params";
import type { TeamInput } from "@/state/squad-store";
import { NotFound } from "@/ui/not-found";
import { TeamForm } from "@/ui/team-form";

export default function EditTeamScreen(): ReactElement {
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const id = parseTeamId(teamId);
  const store = getSquadStore();
  // Opened once, before the first render reads the store, so a team left there by an earlier
  // screen is never shown. It is a read that is safe to repeat; an effect would need setState.
  useState(() => {
    if (id !== null) store.getState().openTeam(id);
  });
  // The squad store is shared by every mounted form: after Back from another team's form the open
  // team is that other one, so this route opens its own team again when it is focused.
  useFocusEffect(
    useCallback(() => {
      if (id !== null && store.getState().team?.id !== id) {
        store.getState().openTeam(id);
      }
    }, [id, store]),
  );
  const team = useStore(store, (state) => state.team);

  if (id === null || team === null || team.id !== id) return <NotFound />;

  const onSave = (input: TeamInput) => {
    const result = store.getState().updateTeam(id, input);
    if (result.kind === "saved") router.back();
    return result;
  };

  return (
    <TeamForm
      initialValues={{
        name: team.name,
        category: team.category ?? "",
        defaultFormat: team.defaultFormat,
      }}
      onSave={onSave}
    />
  );
}
