import { useRouter } from "expo-router";
import { useState } from "react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text } from "react-native";

import type { Format } from "@/domain/format";
import { getMatchSessionStore, getMatchesStore } from "@/state/app-stores";
import { ChoiceDialog } from "./choice-dialog";
import { SaveErrorBanner } from "./save-error-banner";

interface MatchDetailsActions {
  // For the format picker: the current format does nothing, another one asks first.
  readonly onFormatChange: (format: Format) => void;
  // What goes in the details' scroll container after «Guardar»: the delete button, the
  // two confirmation dialogs and the banner of a failed write.
  readonly footer: ReactElement;
}

/**
 * The format change and the deletion of the match in the details (RF-029, RF-038, RF-039).
 * Both ask first, and their stores are read when the confirm button is pressed.
 */
export function useMatchDetailsActions(
  matchId: number,
  currentFormat: Format,
): MatchDetailsActions {
  const { t } = useTranslation();
  const router = useRouter();
  const [newFormat, setNewFormat] = useState<Format | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  function changeFormat(format: Format): void {
    setNewFormat(null);
    const result = getMatchSessionStore().getState().changeFormat(format);
    setFailed(result.kind === "saveFailed");
  }

  function deleteMatch(): void {
    setDeleting(false);
    const result = getMatchesStore().getState().deleteMatch(matchId);
    if (result.kind === "saveFailed") {
      setFailed(true);
      return;
    }
    // The details and the grid under them leave together; the grid's unmount closes the session.
    router.dismiss(2);
  }

  const footer = (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setDeleting(true)}
        style={styles.button}
      >
        <Text style={styles.label}>{t("match.delete")}</Text>
      </Pressable>
      {failed ? <SaveErrorBanner /> : null}
      <ChoiceDialog
        mode="confirm"
        visible={newFormat !== null}
        title={t("confirm.formatChange.title")}
        message={t("confirm.formatChange.message")}
        confirmLabel={t("confirm.formatChange.confirm")}
        onCancel={() => setNewFormat(null)}
        onConfirm={() => newFormat !== null && changeFormat(newFormat)}
      />
      <ChoiceDialog
        mode="confirm"
        visible={deleting}
        title={t("confirm.deleteMatch.title")}
        message={t("confirm.deleteMatch.message")}
        confirmLabel={t("confirm.deleteMatch.confirm")}
        onCancel={() => setDeleting(false)}
        onConfirm={deleteMatch}
      />
    </>
  );

  return {
    onFormatChange: (format) => {
      if (format !== currentFormat) setNewFormat(format);
    },
    footer,
  };
}

const styles = StyleSheet.create({
  button: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#b00020",
    alignItems: "center",
    justifyContent: "center",
  },
  label: { color: "#b00020", fontSize: 16 },
});
