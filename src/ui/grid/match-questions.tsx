import type { TFunction } from "i18next";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "zustand";

import { getMatchSessionStore } from "@/state/app-stores";
import type { PendingQuestion } from "@/state/match-session-store";
import type { RowView } from "@/state/match-view";
import { ChoiceDialog } from "@/ui/choice-dialog";
import type { QuestionOption } from "@/ui/choice-dialog-question";

interface Content {
  readonly title: string;
  readonly options: readonly QuestionOption[];
}

const NONE: Content = { title: "", options: [] };

function contentOf(
  pending: PendingQuestion | null,
  starters: readonly RowView[],
  t: TFunction,
): Content {
  if (pending?.kind === "subOrStarter") {
    return {
      title: t("grid.subOrStarter.question"),
      options: [
        { key: "sub", label: t("grid.subOrStarter.sub") },
        { key: "starter", label: t("grid.subOrStarter.starter") },
      ],
    };
  }
  if (pending?.kind === "chooseReplaced") {
    return {
      title: t("grid.chooseReplaced.title"),
      options: starters.map((row) => ({
        key: String(row.entryId),
        label: row.number,
        secondLine: row.name,
      })),
    };
  }
  if (pending?.kind === "confirmRemoveStarter") {
    return {
      title: t("grid.removeXReminder.message"),
      options: [
        { key: "remove", label: t("grid.removeXReminder.removeAnyway") },
      ],
    };
  }
  return NONE;
}

// The question dialog of the match screen: one dialog whose content follows the session's pending
// question. It only draws it and calls the store's answers; the rules stay in the domain.
export function MatchQuestions(): ReactElement {
  const { t } = useTranslation();
  const store = getMatchSessionStore();
  const pending = useStore(store, (state) => state.pending);
  const starters = useStore(
    store,
    (state) => state.view?.replaceableStarters ?? [],
  );
  const { title, options } = contentOf(pending, starters, t);
  const answer = (key: string): void => {
    const state = store.getState();
    if (key === "sub") void state.answerSub();
    else if (key === "starter") void state.answerStarter();
    else if (key === "remove") void state.confirmRemove();
    else void state.chooseReplaced(Number(key));
  };
  return (
    <ChoiceDialog
      mode="question"
      visible={pending !== null && pending.kind !== "cellMenu"}
      title={title}
      options={options}
      stage={`${pending?.kind ?? ""}:${JSON.stringify(pending?.cell ?? "")}`}
      onChoose={answer}
      onCancel={() => void store.getState().cancelQuestion()}
    />
  );
}
