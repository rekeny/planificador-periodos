import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import type { ReactElement } from "react";
import { useStore } from "zustand";

import { getNewMatchDraft } from "@/state/app-stores";
import { parseTeamId } from "@/state/route-params";
import { MatchForm } from "@/ui/match-form";
import { NotFound } from "@/ui/not-found";

export default function NewMatchScreen(): ReactElement {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const id = parseTeamId(teamId);
  const draft = getNewMatchDraft();
  // Reset once, before the first render reads the draft, so a form left half-filled earlier
  // never shows (RF-082). It is a safe, repeatable read; an effect would need setState.
  useState(() => {
    if (id !== null) draft.getState().reset(id);
  });
  const format = useStore(draft, (state) => state.format);

  if (id === null) return <NotFound />;

  return (
    <MatchForm
      draft={draft}
      format={format}
      onFormatChange={draft.getState().setFormat}
    />
  );
}
