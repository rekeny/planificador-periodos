import { useRef, useState } from "react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text } from "react-native";
import { useStore } from "zustand";

import type { MatchDetailsDraft } from "@/state/match-details-draft";
import { SaveErrorBanner } from "./save-error-banner";

interface MatchDetailsSaveProps {
  readonly draft: MatchDetailsDraft;
  // The route decides where to go: the button does not know the routes.
  readonly onSaved: () => void;
}

type Outcome = "none" | "scoreIncomplete" | "saveFailed";

/** «Guardar» of the match details, with the messages of its failures (RF-025, RF-085). */
export function MatchDetailsSave({
  draft,
  onSaved,
}: MatchDetailsSaveProps): ReactElement {
  const { t } = useTranslation();
  const [outcome, setOutcome] = useState<Outcome>("none");
  const saved = useRef(false); // a press after a save that went back writes nothing more
  const homeScore = useStore(draft, (state) => state.homeScore);
  const awayScore = useStore(draft, (state) => state.awayScore);
  // Hidden again as soon as both scores are filled or both empty, without another press.
  const incomplete = (homeScore === "") !== (awayScore === "");

  function save(): void {
    if (saved.current) return;
    const result = draft.getState().save();
    if (result.kind === "saved") {
      saved.current = true;
      onSaved();
    } else if (result.kind === "saveFailed") {
      setOutcome("saveFailed");
    } else if (
      result.kind === "invalid" &&
      result.errors.includes("scoreIncomplete")
    ) {
      setOutcome("scoreIncomplete");
    } else {
      setOutcome("none");
    }
  }

  return (
    <>
      {outcome === "scoreIncomplete" && incomplete ? (
        <Text style={styles.message}>{t("validation.scoreIncomplete")}</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={save}
        style={styles.button}
      >
        <Text style={styles.label}>{t("common.save")}</Text>
      </Pressable>
      {outcome === "saveFailed" ? <SaveErrorBanner /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  message: { color: "#b00020", fontSize: 14 },
  button: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: "#1d4ed8",
    alignItems: "center",
    justifyContent: "center",
  },
  label: { color: "#ffffff", fontSize: 16 },
});
