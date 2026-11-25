import type { TFunction } from "i18next";
import { useIsFocused } from "expo-router";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "zustand";

import type { CellMenuChoice } from "@/domain/cell-menu";
import { getMatchSessionStore } from "@/state/app-stores";
import type { PendingQuestion } from "@/state/match-session-store";
import type { MatchView, RowView } from "@/state/match-view";
import { ChoiceDialog } from "@/ui/choice-dialog";
import type { QuestionOption } from "@/ui/choice-dialog-question";
import { columnTitle } from "./column-header";

interface Content {
  readonly title: string;
  readonly options: readonly QuestionOption[];
}

const MENU_PREFIX = "menu-";

const NONE: Content = { title: "", options: [] };

// The menu's title is the cell's accessible label, so it is looked up in the rows (RF-052).
function menuContent(
  pending: PendingQuestion,
  rows: readonly RowView[],
  t: TFunction,
): Content {
  const row = rows.find(
    (candidate) => candidate.entryId === pending.cell.entryId,
  );
  const cell = row?.cells.find(
    (candidate) =>
      candidate.cell.column.kind === pending.cell.column.kind &&
      candidate.cell.column.number === pending.cell.column.number,
  );
  return {
    title: t(`grid.cell.${cell?.state ?? "empty"}`, {
      name: row?.name ?? "",
      period: columnTitle(pending.cell.column, t),
    }),
    options: [
      { key: "menu-starter", label: t("grid.cellMenu.starter") },
      { key: "menu-sub", label: t("grid.cellMenu.sub") },
      { key: "menu-remove", label: t("grid.cellMenu.remove") },
    ],
  };
}

function contentOf(
  pending: PendingQuestion | null,
  view: MatchView | null,
  t: TFunction,
): Content {
  switch (pending?.kind) {
    case "cellMenu":
      return menuContent(pending, view?.rows ?? [], t);
    case "subOrStarter":
      return {
        title: t("grid.subOrStarter.question"),
        options: [
          { key: "sub", label: t("grid.subOrStarter.sub") },
          { key: "starter", label: t("grid.subOrStarter.starter") },
        ],
      };
    case "chooseReplaced":
      return {
        title: t("grid.chooseReplaced.title"),
        options: (view?.replaceableStarters ?? []).map((row) => ({
          key: String(row.entryId),
          label: row.number,
          secondLine: row.name,
        })),
      };
    case "confirmRemoveStarter":
      return {
        title: t("grid.removeXReminder.message"),
        options: [
          { key: "remove", label: t("grid.removeXReminder.removeAnyway") },
        ],
      };
    default:
      return NONE;
  }
}

// The question dialog of the match screen: one dialog whose content follows the session's pending
// question. It only draws it and calls the store's answers; the rules stay in the domain. Only the
// focused grid presents it: the stack can hold two grids of the same match over one shared session,
// and each would open its own dialog (F-D3-08).
export function MatchQuestions(): ReactElement {
  const { t } = useTranslation();
  const store = getMatchSessionStore();
  const focused = useIsFocused();
  const pending = useStore(store, (state) => state.pending);
  const view = useStore(store, (state) => state.view);
  const { title, options } = contentOf(pending, view, t);
  const answer = (key: string): void => {
    const state = store.getState();
    if (key === "sub") void state.answerSub();
    else if (key === "starter") void state.answerStarter();
    else if (key === "remove") void state.confirmRemove();
    else if (key.startsWith(MENU_PREFIX)) {
      void state.chooseCellMenuOption(
        key.slice(MENU_PREFIX.length) as CellMenuChoice,
      );
    } else void state.chooseReplaced(Number(key));
  };
  return (
    <ChoiceDialog
      mode="question"
      visible={focused && pending !== null}
      title={title}
      options={options}
      stage={`${pending?.kind ?? ""}:${JSON.stringify(pending?.cell ?? "")}`}
      onChoose={answer}
      onCancel={() => void store.getState().cancelQuestion()}
    />
  );
}
