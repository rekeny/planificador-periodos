import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { shownDate, shownTime } from "@/state/match-date-text";

interface DateTimeFieldProps {
  // "YYYY-MM-DD" and "HH:MM" as the draft keeps them; no time is null.
  readonly date: string;
  readonly time: string | null;
  readonly onDateChange: (parts: {
    year: number;
    month: number;
    day: number;
  }) => void;
  readonly onTimeChange: (parts: { hour: number; minute: number }) => void;
  readonly onClearTime: () => void;
}

// The native picker works with a Date; the draft's strings are turned into one in local time.
// This is plumbing, not a rule: what is shown comes from displayDate and displayTime.
function toLocalDate(date: string, time: string | null): Date {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  const [hour = 12, minute = 0] =
    time === null ? [] : time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

// Both pickers are inline on both platforms, so nothing opens on a press and a dismissed picker
// changes nothing: only a real pick (onValueChange) reaches the draft.
export function DateTimeField({
  date,
  time,
  onDateChange,
  onTimeChange,
  onClearTime,
}: DateTimeFieldProps): ReactElement {
  const { t } = useTranslation();
  const timeText = shownTime(time);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{t("match.field.date")}</Text>
      <Text>{shownDate(date)}</Text>
      <DateTimePicker
        mode="date"
        presentation="inline"
        value={toLocalDate(date, time)}
        onValueChange={(_event, picked) =>
          onDateChange({
            year: picked.getFullYear(),
            month: picked.getMonth() + 1,
            day: picked.getDate(),
          })
        }
      />
      <Text style={styles.label}>{t("match.field.time")}</Text>
      {timeText === null ? null : <Text>{timeText}</Text>}
      <DateTimePicker
        mode="time"
        presentation="inline"
        value={toLocalDate(date, time)}
        onValueChange={(_event, picked) =>
          onTimeChange({
            hour: picked.getHours(),
            minute: picked.getMinutes(),
          })
        }
      />
      <Pressable
        accessibilityRole="button"
        onPress={onClearTime}
        style={styles.clear}
      >
        <Text>{t("match.clearTime")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontSize: 14, marginTop: 8 },
  clear: {
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#888888",
    borderRadius: 8,
  },
});
