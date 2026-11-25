import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useId, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useStore } from "zustand";

import { getNewMatchDraft } from "@/state/app-stores";
import { parseTeamId } from "@/state/route-params";
import { CallUpSelector } from "@/ui/call-up-selector";
import { MatchForm } from "@/ui/match-form";
import { NewMatchSave } from "@/ui/new-match-save";
import { NotFound } from "@/ui/not-found";

export default function NewMatchScreen(): ReactElement | null {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const id = parseTeamId(teamId);
  const draft = getNewMatchDraft();
  const draftTeamId = useStore(draft, (state) => state.teamId);
  const draftFormId = useStore(draft, (state) => state.formId);
  const formId = useId(); // this mounted form, told apart from another form of the same team
  const format = useStore(draft, (state) => state.format);
  const [failed, setFailed] = useState(false);
  const [opened, setOpened] = useState(false);
  const started = useRef(false);

  // Every mounted form shares one draft. A form always resets it when it opens (a form left is
  // lost, RF-082) and again when it is focused while the draft belongs to another form, of another
  // team or of the same one, as after Back from a later form (RF-025). An effect, not render: resetting while rendering updates others.
  useFocusEffect(
    useCallback(() => {
      if (id === null) return;
      const first = !started.current;
      started.current = true;
      const current = draft.getState();
      if (!first && current.teamId === id && current.formId === formId) {
        current.refreshPlayers(); // a player deactivated meanwhile leaves the list, nothing else changes
        return;
      }
      setFailed(!current.reset(id, formId));
      setOpened(true);
    }, [draft, id, formId]),
  );

  if (id === null || failed) return <NotFound />;
  // Until the focus effect has loaded this team, nothing of an earlier draft is shown.
  if (draftTeamId !== id || draftFormId !== formId || !opened) return null;

  return (
    <MatchForm
      draft={draft}
      format={format}
      onFormatChange={draft.getState().setFormat}
    >
      <CallUpSelector draft={draft} />
      {/* replace, not push: Back from the grid goes to the team, never to the filled form (P-30) */}
      <NewMatchSave
        draft={draft}
        onSaved={(matchId) =>
          router.replace({
            pathname: "/matches/[matchId]",
            params: { matchId },
          })
        }
      />
    </MatchForm>
  );
}
