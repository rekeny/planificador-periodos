import type { ReactElement, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TextInput } from "react-native";
import { useStore } from "zustand";

import type { Format } from "@/domain/format";
import type { NewMatchDraft } from "@/state/new-match-draft";
import { DateTimeField } from "./date-time-field";
import { FormatPicker } from "./format-picker";
import { FormScroll } from "./form-scroll";
import { NOTES_MAX_LENGTH } from "./input-limits";
import { ScoreFields } from "./score-fields";
import { TeamNameFields } from "./team-name-fields";

interface MatchFormProps {
  readonly draft: NewMatchDraft;
  // The format comes from outside so the details screen can reuse the form with its own match.
  readonly format: Format;
  readonly onFormatChange: (format: Format) => void;
  // What each screen adds below the fields: the new match adds its call-up and «Guardar».
  readonly children?: ReactNode;
}

export function MatchForm({
  draft,
  format,
  onFormatChange,
  children,
}: MatchFormProps): ReactElement {
  const { t } = useTranslation();
  const state = useStore(draft, (current) => current);
  return (
    <FormScroll contentStyle={styles.screen}>
      <Text style={styles.label}>{t("match.field.format")}</Text>
      <FormatPicker value={format} onChange={onFormatChange} />
      <DateTimeField
        date={state.date}
        time={state.time}
        onDateChange={state.setDate}
        onTimeChange={state.setTime}
        onClearTime={state.clearTime}
      />
      <TeamNameFields
        home={state.homeName}
        away={state.awayName}
        onHomeChange={state.setHomeName}
        onAwayChange={state.setAwayName}
        onMyTeamAs={state.setMyTeamAs}
      />
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
});
