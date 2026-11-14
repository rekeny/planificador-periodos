import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { shownDate, shownTime } from "@/state/match-date-text";
import { toLocalDate } from "./date-time-field-shared";
import type { DateTimeFieldProps } from "./date-time-field-shared";

type Mode = "date" | "time";

interface DialogProps {
  readonly mode: Mode;
  readonly value: Date;
  readonly onPick: (picked: Date) => void;
  readonly onClose: () => void;
}

// The inline Android picker reports its initial value on mount, which would save an untouched
// 12:00, so the picker is a dialog the coach opens, and anything it reports while it is mounting
// is ignored: only a later emission (the confirm button) counts. A dialog never reports on mount;
// the guard is there in case a native version changes that.
function PickerDialog({
  mode,
  value,
  onPick,
  onClose,
}: DialogProps): ReactElement {
  const armed = useRef(false);
  useEffect(() => {
    armed.current = true;
  }, []);
  return (
    <DateTimePicker
      mode={mode}
      presentation="dialog"
      value={value}
      onValueChange={(_event, picked) => {
        if (!armed.current) return;
        onPick(picked);
        onClose();
      }}
      onDismiss={onClose}
    />
  );
}

export function DateTimeFieldAndroid({
  date,
  time,
  onDateChange,
  onTimeChange,
  onClearTime,
}: DateTimeFieldProps): ReactElement {
  const { t } = useTranslation();
  const [open, setOpen] = useState<Mode | null>(null);
  const timeText = shownTime(time);
  const close = (): void => setOpen(null);
  return (
    <View style={styles.field}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen("date")}
        style={styles.button}
      >
        <Text style={styles.label}>{t("match.field.date")}</Text>
        <Text>{shownDate(date)}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen("time")}
        style={styles.button}
      >
        <Text style={styles.label}>{t("match.field.time")}</Text>
        {timeText === null ? null : <Text>{timeText}</Text>}
      </Pressable>
      {open === null ? null : (
        <PickerDialog
          mode={open}
          value={toLocalDate(date, time)}
          onClose={close}
          onPick={(picked) =>
            open === "date"
              ? onDateChange({
                  year: picked.getFullYear(),
                  month: picked.getMonth() + 1,
                  day: picked.getDate(),
                })
              : onTimeChange({
                  hour: picked.getHours(),
                  minute: picked.getMinutes(),
                })
          }
        />
      )}
      <Pressable
        accessibilityRole="button"
        onPress={onClearTime}
        style={styles.button}
      >
        <Text>{t("match.clearTime")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontSize: 14 },
  button: {
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#888888",
    borderRadius: 8,
    gap: 4,
  },
});
