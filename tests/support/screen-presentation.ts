// Reads how each screen of the stack is presented, next to `headerConfigs()` of screen-reading.ts.
// Jest has no native stack: a screen shown as a modal exists only as the host element
// "RNSModalScreen" with `stackPresentation: "modal"`, and the others as "RNSScreen" with "push".
// This file holds no test calls.
import { screen } from "expo-router/testing-library";

interface JsonNode {
  readonly type: string;
  readonly props: Record<string, unknown>;
  readonly children: readonly (JsonNode | string)[] | null;
}

function collect(node: JsonNode | string, found: unknown[]): void {
  if (typeof node === "string") {
    return;
  }
  const isScreen = node.type === "RNSScreen" || node.type === "RNSModalScreen";
  if (isScreen && node.props.stackPresentation !== undefined) {
    found.push(node.props.stackPresentation);
  }
  node.children?.forEach((child) => collect(child, found));
}

/** The presentation ("push" or "modal") of every screen in the stack, from the bottom up. */
export function presentations(): unknown[] {
  const tree = screen.toJSON() as unknown as JsonNode | JsonNode[] | null;
  const found: unknown[] = [];
  const roots = tree === null ? [] : [tree].flat();
  roots.forEach((root) => collect(root, found));
  return found;
}
