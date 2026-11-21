import { useLocalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useStore } from "zustand";

import { getSquadStore } from "@/state/app-stores";
import { parseTeamId } from "@/state/route-params";
import type { TeamInput } from "@/state/squad-store";
import { NotFound } from "@/ui/not-found";
import { TeamForm } from "@/ui/team-form";
import { useOpenRouteTeam } from "@/ui/use-open-route-team";

export default function EditTeamScreen(): ReactElement | null {
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const id = parseTeamId(teamId);
  const store = getSquadStore();
  // The squad store is shared by every mounted form: after Back from another team's form the open
  // team is that other one, so this route opens its own team when it is focused (F-03: from the
  // focus effect, never from a render).
  const ready = useOpenRouteTeam(id, store, "if-another");
  const team = useStore(store, (state) => state.team);

  if (id === null) return <NotFound />;
  if (!ready) return null;
  if (team === null || team.id !== id) return <NotFound />;

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
