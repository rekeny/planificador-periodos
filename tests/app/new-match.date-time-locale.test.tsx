// Codex fourth run, blocking finding 3 (RF-012, constitution principle 7): i18next gives the labels
// around the pickers, but the native pickers draw their own text from the platform locale, so on a
// device set to English the form would show English native UI. Installed @expo/ui 58.0.28,
// src/community/datetime-picker/types.tsx lines 90-93: `locale` (iOS, applied by DateTimePicker.tsx
// line 77 as the SwiftUI `locale` environment) and lines 116-124: `positiveButton.label` and
// `negativeButton.label` (Android dialog, DateTimePicker.android.tsx lines 98-99). The Android
// component has NO locale prop: the month and day names of its Material 3 dialog come from
// `LocalConfiguration.current.locales[0]` (DatePickerView.kt lines 372 and 500), which JavaScript
// cannot change, so only the button labels are pinned there. The doubles keep every prop given.
import { Platform } from "react-native";

import es from "@/i18n/es.json";
import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import { pickerProps } from "../support/date-time-picker-double";
import type { PickerMode } from "../support/date-time-picker-double";
import {
  freshDraft,
  openFormAlone,
  seedTeams,
} from "../support/new-match-form";

jest.mock("expo-sqlite", () => {
  throw new Error("expo-sqlite was loaded in Jest");
});
jest.mock("@/data/database", () =>
  jest
    .requireActual<typeof import("../support/mock-database")>(
      "../support/mock-database",
    )
    .mockDatabaseModule(),
);
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock("@/state/database-ready", () => ({
  initializeDatabase: jest.fn(() => Promise.resolve()),
}));
jest.mock("@/state/app-stores", () =>
  jest
    .requireActual<typeof import("../support/mock-app-stores")>(
      "../support/mock-app-stores",
    )
    .mockAppStoresModule(),
);
jest.mock("@expo/ui/community/datetime-picker", () =>
  jest
    .requireActual<typeof import("../support/date-time-picker-native-double")>(
      "../support/date-time-picker-native-double",
    )
    .nativeDateTimePickerModule(),
);

type Labelled = {
  readonly locale?: string;
  readonly positiveButton?: { label?: string };
  readonly negativeButton?: { label?: string };
};
const SPANISH = /^es([-_]ES)?$/;
const MODES: readonly PickerMode[] = ["date", "time"];
let alevin: number;
let platform: ReturnType<typeof jest.replaceProperty> | undefined;

beforeEach(() => {
  const db = resetMockDatabase();
  alevin = seedTeams(db).alevin;
  useMockSquadStore(createSquadStore(db));
  freshDraft(db);
});

afterEach(() => {
  platform?.restore();
  platform = undefined;
});

async function labelled(mode: PickerMode): Promise<Labelled> {
  return (await pickerProps(mode)) as unknown as Labelled;
}

describe("the native pickers speak Spanish", () => {
  it("RF-012: es.json has «Aceptar» under common.accept and «Cancelar» under common.cancel for the Android dialog buttons", () => {
    expect(es.common).toMatchObject({ accept: "Aceptar", cancel: "Cancelar" });
  });

  it.each(MODES)(
    "RF-012: on iOS the inline %s picker receives the Spanish locale",
    async (mode) => {
      expect(Platform.OS).toBe("ios");
      await openFormAlone(alevin);
      expect((await labelled(mode)).locale).toMatch(SPANISH);
    },
  );

  it.each(MODES)(
    "RF-012: on Android the %s dialog has the confirm button «Aceptar» and the cancel button «Cancelar»",
    async (mode) => {
      platform = jest.replaceProperty(Platform, "OS", "android");
      await openFormAlone(alevin);
      const props = await labelled(mode);
      expect(props.positiveButton?.label).toBe("Aceptar");
      expect(props.negativeButton?.label).toBe("Cancelar");
    },
  );
});
