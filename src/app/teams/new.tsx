import { useRouter } from "expo-router";
import type { ReactElement } from "react";

import { NEW_TEAM_DEFAULT_FORMAT } from "@/state/format-options";
import { getSquadStore } from "@/state/app-stores";
import type { TeamInput } from "@/state/squad-store";
import { TeamForm } from "@/ui/team-form";

const EMPTY_TEAM = {
  name: "",
  category: "",
  defaultFormat: NEW_TEAM_DEFAULT_FORMAT,
};

export default function NewTeamScreen(): ReactElement {
  const router = useRouter();

  const onSave = (input: TeamInput) => {
    const result = getSquadStore().getState().createTeam(input);
    if (result.kind === "saved") router.back();
    return result;
  };

  return <TeamForm initialValues={EMPTY_TEAM} onSave={onSave} />;
}
