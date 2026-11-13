import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
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
