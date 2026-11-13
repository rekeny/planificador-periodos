import { useRef, useState } from "react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { Format } from "@/domain/format";
import type { SaveResult } from "@/state/save-result";
import type { TeamInput } from "@/state/squad-store";
import { FormatPicker } from "./format-picker";
import { NAME_MAX_LENGTH } from "./input-limits";
import { SaveErrorBanner } from "./save-error-banner";

export interface TeamFormValues {
  readonly name: string;
  readonly category: string;
  readonly defaultFormat: Format;
}

interface TeamFormProps {
  readonly initialValues: TeamFormValues;
  readonly onSave: (input: TeamInput) => SaveResult;
}

type Message = "none" | "nameRequired" | "saveFailed";

export function TeamForm({
  initialValues,
  onSave,
}: TeamFormProps): ReactElement {
  const { t } = useTranslation();
  const [name, setName] = useState(initialValues.name);
  const [category, setCategory] = useState(initialValues.category);
  const [format, setFormat] = useState<Format>(initialValues.defaultFormat);
  const [message, setMessage] = useState<Message>("none");
  // A ref, not state: a second press in the same instant must see the first one. It is released
  // only after a failed or invalid save; after a success the screen is closing.
  const saving = useRef(false);

  const save = (): void => {
    if (saving.current) return;
    saving.current = true;
    // The raw texts go in: the store validators trim them and turn an empty category into null.
    const result = onSave({ name, category, defaultFormat: format });
    if (result.kind === "invalid") setMessage("nameRequired");
    else if (result.kind === "saveFailed") setMessage("saveFailed");
    else return;
    saving.current = false;
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.label}>{t("team.field.name")}</Text>
      <TextInput
        accessibilityLabel={t("team.field.name")}
        value={name}
        onChangeText={setName}
        maxLength={NAME_MAX_LENGTH}
        style={styles.input}
      />
      {message === "nameRequired" ? (
        <Text style={styles.error}>{t("validation.nameRequired")}</Text>
      ) : null}
      <Text style={styles.label}>{t("team.field.category")}</Text>
      <TextInput
        accessibilityLabel={t("team.field.category")}
        value={category}
        onChangeText={setCategory}
        maxLength={NAME_MAX_LENGTH}
        style={styles.input}
      />
      <Text style={styles.label}>{t("team.field.defaultFormat")}</Text>
      <FormatPicker value={format} onChange={setFormat} />
      <Pressable accessibilityRole="button" onPress={save} style={styles.save}>
        <Text style={styles.saveText}>{t("common.save")}</Text>
      </Pressable>
      {message === "saveFailed" ? <SaveErrorBanner /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
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
