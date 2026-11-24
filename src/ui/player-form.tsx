import { useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";

import type { ValidationError } from "@/domain/squad-validation";
import type { SaveResult } from "@/state/save-result";
import type { PlayerInput } from "@/state/squad-store";
import { NAME_MAX_LENGTH, NUMBER_MAX_LENGTH } from "./input-limits";
import { FormScroll } from "./form-scroll";
import { SaveErrorBanner } from "./save-error-banner";

interface PlayerFormProps {
  readonly onSave: (input: PlayerInput) => SaveResult;
  // The player's values when editing; empty for a new player.
  readonly initialValues?: PlayerInput;
  // Whatever else goes inside the scroll container, under «Guardar» (T076: the player's actions).
  readonly children?: ReactNode;
}

const EMPTY: PlayerInput = { name: "", number: "" };

function useSaveState(
  initialValues: PlayerInput,
  onSave: (input: PlayerInput) => SaveResult,
) {
  const [name, setName] = useState(initialValues.name);
  const [number, setNumber] = useState(initialValues.number);
  const [errors, setErrors] = useState<readonly ValidationError[]>([]);
  const [failed, setFailed] = useState(false);
  // A ref, not state: a second press in the same instant must see the first one. It is released
  // only after a failed or invalid save; after a success the screen is closing.
  const saving = useRef(false);

  const save = (): void => {
    if (saving.current) return;
    saving.current = true;
    // The raw texts go in: the store validators trim the name.
    const result = onSave({ name, number });
    setErrors(result.kind === "invalid" ? result.errors : []);
    setFailed(result.kind === "saveFailed");
    if (result.kind === "saved") return;
    saving.current = false;
  };

  return { name, setName, number, setNumber, errors, failed, save };
}

export function PlayerForm({
  onSave,
  initialValues = EMPTY,
  children,
}: PlayerFormProps): ReactElement {
  const { t } = useTranslation();
  const { name, setName, number, setNumber, errors, failed, save } =
    useSaveState(initialValues, onSave);

  return (
    <FormScroll contentStyle={styles.screen}>
      <Text style={styles.label}>{t("player.field.name")}</Text>
      <TextInput
        accessibilityLabel={t("player.field.name")}
        value={name}
        onChangeText={setName}
        maxLength={NAME_MAX_LENGTH}
        style={styles.input}
      />
      {errors.includes("nameRequired") ? (
        <Text style={styles.error}>{t("validation.nameRequired")}</Text>
      ) : null}
      <Text style={styles.label}>{t("player.field.number")}</Text>
      <TextInput
        accessibilityLabel={t("player.field.number")}
        value={number}
        onChangeText={setNumber}
        maxLength={NUMBER_MAX_LENGTH}
        style={styles.input}
      />
      {errors.includes("numberInvalid") ? (
        <Text style={styles.error}>{t("validation.numberInvalid")}</Text>
      ) : null}
      <Pressable accessibilityRole="button" onPress={save} style={styles.save}>
        <Text style={styles.saveText}>{t("common.save")}</Text>
      </Pressable>
      {failed ? <SaveErrorBanner /> : null}
      {children}
    </FormScroll>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 8 },
  label: { fontSize: 14, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#888888",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  error: { color: "#b00020" },
  save: {
    marginTop: 16,
    alignItems: "center",
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#1d4ed8",
  },
  saveText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
});
