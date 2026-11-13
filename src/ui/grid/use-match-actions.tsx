import { useState } from "react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";

import type { MatchView } from "@/state/match-view";
import type { MatchSessionState } from "@/state/match-session-store";
import { ChoiceDialog } from "@/ui/choice-dialog";
import type { GridButtonsProps } from "./grid-toolbar";

type Actions = Pick<
  MatchSessionState,
  "undo" | "addOvertime" | "removeLastOvertime"
>;

/**
 * The props of the three buttons plus the confirmation of removing an overtime with marks
 * (RF-059). Without marks the overtime goes at once. `getActions` is read at tap time.
 */
export function useMatchActions(
  view: MatchView | null,
  getActions: () => Actions,
): { buttons: GridButtonsProps; dialog: ReactElement } {
  const { t } = useTranslation();
  const [asking, setAsking] = useState(false);
  const overtimes = view?.columns.filter(
    (column) => column.column.kind === "overtime",
  ).length;
  const hasMarks = view?.lastOvertimeHasMarks === true;
  const buttons: GridButtonsProps = {
    canUndo: view?.canUndo === true,
    canRemoveOvertime: view?.canRemoveOvertime === true,
    onUndo: () => void getActions().undo(),
    onAddOvertime: () => void getActions().addOvertime(),
    onRemoveOvertime: () => {
      if (hasMarks) setAsking(true);
      else void getActions().removeLastOvertime();
    },
  };
  const dialog = (
    <ChoiceDialog
      mode="confirm"
      visible={asking}
      title={t("confirm.removeOvertime.title", { number: overtimes ?? 0 })}
      message={t("confirm.removeOvertime.message")}
      confirmLabel={t("confirm.removeOvertime.confirm")}
      onCancel={() => setAsking(false)}
      onConfirm={() => {
        setAsking(false);
        void getActions().removeLastOvertime();
      }}
    />
  );
  return { buttons, dialog };
}
