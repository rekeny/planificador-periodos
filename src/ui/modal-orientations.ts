import type { ModalProps } from "react-native";

// React Native's `Modal` on iPhone defaults to portrait only: every `Modal` passes this (RF-076).
export const ALL_ORIENTATIONS: NonNullable<
  ModalProps["supportedOrientations"]
> = [
  "portrait",
  "portrait-upside-down",
  "landscape",
  "landscape-left",
  "landscape-right",
];
