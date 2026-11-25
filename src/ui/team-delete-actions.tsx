import { useRef, useState } from "react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text } from "react-native";

import type { SaveResult } from "@/state/save-result";
import { ChoiceDialog } from "./choice-dialog";
import { SaveErrorBanner } from "./save-error-banner";

interface TeamContentsCount {
  readonly players: number;
  readonly matches: number;
}

interface TeamDeleteActionsProps {
  readonly name: string;
  // Read when «Borrar equipo» is pressed, never while rendering (D3 rule 3).
  readonly readContents: () => TeamContentsCount | null;
  // Deletes the team and, when it is saved, leaves the screen.
  readonly onDelete: () => SaveResult;
}

/**
 * «Borrar equipo» of the edit-team form (RF-015): asks first, with what goes with the team, and the
 * banner of a failed write. Goes inside the form's scroll container (RF-076).
 */
export function TeamDeleteActions({
  name,
  readContents,
  onDelete,
}: TeamDeleteActionsProps): ReactElement {
  const { t } = useTranslation();
  const [contents, setContents] = useState<TeamContentsCount | null>(null);
  const [failed, setFailed] = useState(false);
  // A ref, not state: a second press in the same instant must see the first one.
  const busy = useRef(false);

  const ask = (): void => {
    // A team that cannot be read (already gone, or a failing read) opens nothing: no guess at counts.
    setContents(readContents());
  };

  const confirm = (): void => {
    if (busy.current) return;
    busy.current = true;
    setContents(null);
    const result = onDelete();
    setFailed(result.kind === "saveFailed");
    // After a success the screen is closing; a failed delete must not latch.
    if (result.kind !== "saved") busy.current = false;
  };

  return (
    <>
      <Pressable accessibilityRole="button" onPress={ask} style={styles.button}>
        <Text style={styles.label}>{t("team.delete")}</Text>
      </Pressable>
      {failed ? <SaveErrorBanner /> : null}
      <ChoiceDialog
        mode="confirm"
        visible={contents !== null}
        title={t("confirm.deleteTeam.title", { name })}
        message={t("confirm.deleteTeam.message", {
          players: t("confirm.deleteTeam.players", {
            count: contents?.players ?? 0,
          }),
          matches: t("confirm.deleteTeam.matches", {
            count: contents?.matches ?? 0,
          }),
        })}
        confirmLabel={t("confirm.deleteTeam.confirm")}
        onCancel={() => setContents(null)}
        onConfirm={confirm}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#b00020",
    alignItems: "center",
    justifyContent: "center",
  },
  label: { color: "#b00020", fontSize: 16 },
});
