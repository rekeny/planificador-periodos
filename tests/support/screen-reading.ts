// Helpers that read what a screen test sees (T033 and the screen tests after it). This file holds
// no test calls. Jest has no native header, so the header of a Stack screen only exists as the
// props of the host element "RNSScreenStackHeaderConfig"; `headerConfigs()` reads those props.
import { screen } from "expo-router/testing-library";

import es from "@/i18n/es.json";

interface JsonNode {
  readonly type: string;
  readonly props: Record<string, unknown>;
  readonly children: readonly (JsonNode | string)[] | null;
}

export interface HeaderConfig {
  readonly title: unknown;
  readonly hidden: unknown;
}

function nodesOf(): JsonNode[] {
  const tree = screen.toJSON() as unknown as JsonNode | JsonNode[] | null;
  if (tree === null) {
    return [];
  }
  return Array.isArray(tree) ? tree : [tree];
}

function walk(node: JsonNode | string, visit: (element: JsonNode) => void) {
  if (typeof node === "string") {
    return;
  }
  visit(node);
  node.children?.forEach((child) => walk(child, visit));
}

function plainText(node: JsonNode | string): string {
  if (typeof node === "string") {
    return node;
  }
  return (node.children ?? []).map(plainText).join("");
}

/**
 * The text of every Text on the screen, in order, exactly as drawn (empty ones included), except
 * the label of the «Nuevo equipo» button (T034): it is on every list and not what these tests read.
 */
export function screenTexts(): string[] {
  const texts: string[] = [];
  nodesOf().forEach((root) =>
    walk(root, (element) => {
      if (element.type === "Text" && plainText(element) !== es.teams.new) {
        texts.push(plainText(element));
      }
    }),
  );
  return texts;
}

/** One entry per native header on the screen: its title and whether it is hidden. */
export function headerConfigs(): HeaderConfig[] {
  const configs: HeaderConfig[] = [];
  nodesOf().forEach((root) =>
    walk(root, (element) => {
      if (element.type === "RNSScreenStackHeaderConfig") {
        const { title, hidden } = element.props;
        configs.push({ title, hidden });
      }
    }),
  );
  return configs;
}
