import { useRef, useState } from "react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text } from "react-native";

import type { SaveResult } from "@/state/save-result";
import { ChoiceDialog } from "./choice-dialog";
import { SaveErrorBanner } from "./save-error-banner";

interface PlayerActionsProps {
  readonly name: string;
  readonly isActive: boolean;
  // Saves the new state and, when it is saved, leaves the screen.
  readonly onSetActive: (isActive: boolean) => SaveResult;
}

/**
 * «Desactivar» (asks first, RF-022) or «Reactivar» (asks nothing, RF-024) of the player screen, and
 * the banner of a failed write. Goes inside the form's scroll container (RF-076).
 */
export function PlayerActions({
  name,
  isActive,
  onSetActive,
}: PlayerActionsProps): ReactElement {
  const { t } = useTranslation();
  const [asking, setAsking] = useState(false);
  const [failed, setFailed] = useState(false);
  // A ref, not state: a second press in the same instant must see the first one.
  const busy = useRef(false);

  const change = (active: boolean): void => {
    if (busy.current) return;
    busy.current = true;
    setAsking(false);
    const result = onSetActive(active);
    setFailed(result.kind === "saveFailed");
    // After a success the screen is closing; a failed save must not latch.
    if (result.kind !== "saved") busy.current = false;
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={isActive ? () => setAsking(true) : () => change(true)}
        style={styles.button}
      >
        <Text style={styles.label}>
          {t(isActive ? "player.deactivate" : "player.reactivate")}
        </Text>
      </Pressable>
      {failed ? <SaveErrorBanner /> : null}
      <ChoiceDialog
        mode="confirm"
        visible={asking}
        title={t("confirm.deactivatePlayer.title", { name })}
        message={t("confirm.deactivatePlayer.message")}
        confirmLabel={t("confirm.deactivatePlayer.confirm")}
        onCancel={() => setAsking(false)}
        onConfirm={() => change(false)}
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
    borderColor: "#1d4ed8",
    alignItems: "center",
    justifyContent: "center",
  },
  label: { color: "#1d4ed8", fontSize: 16 },
});
