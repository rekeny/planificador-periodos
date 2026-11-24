import {
  canOpenCellMenu,
  chooseCellMenuOption,
  type CellMenuChoice,
} from "@/domain/cell-menu";
import type { Cell } from "@/domain/grid";
import { openMatchOf, type CallUpHost } from "@/state/match-session-call-up";
import { commitMarkChange } from "@/state/match-session-commit";
import { ask, drop, hasPendingQuestion } from "@/state/match-session-pending";
import type { MatchSessionState } from "@/state/match-session-store";
import type { SaveResult } from "@/state/save-result";

type Actions = Pick<MatchSessionState, "openCellMenu" | "chooseCellMenuOption">;

// A long press opens the menu only on a marked cell, with nothing else pending (RF-052).
function openCellMenu(host: CallUpHost, cell: Cell): SaveResult {
  const current = openMatchOf(host);
  if (
    current === null ||
    hasPendingQuestion(host) ||
    !canOpenCellMenu(current.grid, cell)
  ) {
    return { kind: "unchanged" };
  }
  return ask(host, { kind: "cellMenu", cell });
}

// The domain decides what the choice does; the menu then closes, turns into a question or saves.
function chooseOption(host: CallUpHost, choice: CellMenuChoice): SaveResult {
  const current = openMatchOf(host);
  const pending = host.get().pending;
  if (current === null || pending === null || pending.kind !== "cellMenu") {
    return { kind: "unchanged" };
  }
  const { cell } = pending;
  const result = chooseCellMenuOption(current.grid, cell, choice);
  switch (result.kind) {
    case "changed":
      return commitMarkChange(host, current, result.grid);
    case "chooseReplacedStarter":
      return ask(host, { kind: "chooseReplaced", cell });
    case "confirmRemoveStarter":
      return ask(host, { kind: "confirmRemoveStarter", cell });
    default:
      // "unchanged" (the choice that matches the cell); the menu never yields askSubOrStarter.
      drop(host);
      return { kind: "unchanged" };
  }
}

export function createMenuActions(host: CallUpHost): Actions {
  return {
    openCellMenu: (cell) => openCellMenu(host, cell),
    chooseCellMenuOption: (choice) => chooseOption(host, choice),
  };
}
