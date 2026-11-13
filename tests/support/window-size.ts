// The window size in grid tests (T083). This file holds no test calls. jest-expo starts with a
// 750 × 1334 window, which would already be a tablet, so every grid test sets its own size and
// puts the first one back. `Dimensions.set` fires the same event as a real rotation.
import { act } from "@testing-library/react-native";
import { Dimensions } from "react-native";

const INITIAL = Dimensions.get("window");

export async function setWindow(width: number, height: number): Promise<void> {
  const window = { width, height, scale: 2, fontScale: 1 };
  await act(async () => Dimensions.set({ window, screen: window }));
}

export async function restoreWindow(): Promise<void> {
  await act(async () => Dimensions.set({ window: INITIAL, screen: INITIAL }));
}
