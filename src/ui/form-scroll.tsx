import type { ReactElement, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

interface FormScrollProps {
  readonly children: ReactNode;
  readonly contentStyle: StyleProp<ViewStyle>;
}

// Everything a form draws goes inside the scroll, so a short landscape viewport or an open keyboard
// never leaves a field, an error or «Guardar» out of reach. "handled" lets a tap on «Guardar» work
// while the keyboard is open. React Native recommends "padding" on iOS and "height" on Android.
export function FormScroll({
  children,
  contentStyle,
}: FormScrollProps): ReactElement {
  return (
    <KeyboardAvoidingView
      testID="form-keyboard-avoiding"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.avoiding}
    >
      <ScrollView
        testID="form-scroll"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={contentStyle}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ avoiding: { flex: 1 } });
