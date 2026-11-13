import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { useStore } from "zustand";

import type { Format } from "@/domain/format";
import type { NewMatchDraft } from "@/state/new-match-draft";
import { FormatPicker } from "./format-picker";
import { NAME_MAX_LENGTH, NOTES_MAX_LENGTH } from "./input-limits";
import { ScoreFields } from "./score-fields";

interface MatchFormProps {
  readonly draft: NewMatchDraft;
  // The format comes from outside so the details screen can reuse the form with its own match.
  readonly format: Format;
  readonly onFormatChange: (format: Format) => void;
}

export function MatchForm({
  draft,
  format,
  onFormatChange,
}: MatchFormProps): ReactElement {
  const { t } = useTranslation();
  const state = useStore(draft, (current) => current);
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.label}>{t("match.field.format")}</Text>
      <FormatPicker value={format} onChange={onFormatChange} />
      <Text style={styles.label}>{t("match.field.home")}</Text>
      <TextInput
        accessibilityLabel={t("match.field.home")}
        value={state.homeName}
        onChangeText={state.setHomeName}
        maxLength={NAME_MAX_LENGTH}
        style={styles.input}
      />
      <Text style={styles.label}>{t("match.field.away")}</Text>
      <TextInput
        accessibilityLabel={t("match.field.away")}
        value={state.awayName}
        onChangeText={state.setAwayName}
        maxLength={NAME_MAX_LENGTH}
        style={styles.input}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => state.setMyTeamAs("home")}
        style={styles.quick}
      >
        <Text>{t("match.quickHome")}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => state.setMyTeamAs("away")}
        style={styles.quick}
      >
        <Text>{t("match.quickAway")}</Text>
      </Pressable>
      <Text style={styles.label}>{t("match.field.score")}</Text>
      <ScoreFields
        home={state.homeScore}
        away={state.awayScore}
        onHomeChange={state.setHomeScore}
        onAwayChange={state.setAwayScore}
      />
      <Text style={styles.label}>{t("match.field.notes")}</Text>
      <TextInput
        accessibilityLabel={t("match.field.notes")}
        value={state.notes}
        onChangeText={state.setNotes}
        maxLength={NOTES_MAX_LENGTH}
        multiline
        style={styles.input}
      />
    </ScrollView>
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
  quick: {
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#888888",
    borderRadius: 8,
  },
});
