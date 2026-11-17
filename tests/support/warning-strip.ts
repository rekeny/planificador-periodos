// What the tablet warning strip tests read (D2 third review, finding 4). This file holds no test
// calls. CONTRACT the Implementer must meet in src/ui/warnings/warning-strip.tsx (compact mode):
//   - `warning-strip` keeps its bounded height: flattened `maxHeight` <= TABLET_STRIP_MAX_HEIGHT.
//   - Inside it a vertical ScrollView with testID `warning-strip-scroll` holds `warning-banners`
//     and `warning-legend` (they are its descendants), with `nestedScrollEnabled` true,
//     `showsVerticalScrollIndicator` true and no `horizontal`.
//   - Nothing between the legend and the scroll container clips (no `overflow: "hidden"`), and
//     nothing from the Text to the strip is hidden from accessibility.
//   - The ScrollView's `scrollEnabled` prop is an explicit boolean that follows the measured
//     content: true when (the height reported by onLayout of `warning-banners`, 0 if it is not
//     drawn or has not reported) + (the height reported by onLayout of `warning-legend`, 0 if
//     likewise) is greater than TABLET_STRIP_MAX_HEIGHT, false otherwise, and false before any
//     report. Heights go on reaching the grid as before.
import { screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

export const STRIP = "warning-strip";
export const STRIP_SCROLL = "warning-strip-scroll";

type Node = ReturnType<typeof screen.getByTestId>;
type Props = Record<string, unknown>;

export function styleOf(node: Node): Props {
  return (StyleSheet.flatten(node.props.style) ?? {}) as Props;
}

/** Whether `node` has `ancestor` somewhere above it in the rendered tree. */
export function isInside(node: Node, ancestor: Node): boolean {
  for (let up = node.parent; up !== null; up = up.parent) {
    if (up === ancestor) return true;
  }
  return false;
}

/** The nodes from `node` up to (not including) `stop`; empty if `stop` is not above it. */
export function chainUpTo(node: Node, stop: Node): Node[] {
  const chain: Node[] = [];
  for (let up: Node | null = node; up !== null; up = up.parent) {
    if (up === stop) return chain;
    chain.push(up);
  }
  return [];
}

/** Whether the ScrollView of the strip lets the user scroll (`scrollEnabled`, undefined = true). */
export function stripScrolls(): boolean {
  const flag: unknown = screen.getByTestId(STRIP_SCROLL).props.scrollEnabled;
  return flag !== false;
}

/** The raw `scrollEnabled` prop, to pin that it is an explicit boolean. */
export function stripScrollFlag(): unknown {
  return screen.getByTestId(STRIP_SCROLL).props.scrollEnabled;
}

/** Whether a node, or anything above it up to `stop`, is hidden from accessibility. */
export function hiddenFromAccessibility(node: Node, stop: Node): boolean {
  return chainUpTo(node, stop).some((link) => {
    const props = link.props as Props;
    return (
      props.accessibilityElementsHidden === true ||
      props["aria-hidden"] === true ||
      props.importantForAccessibility === "no-hide-descendants" ||
      props.importantForAccessibility === "no"
    );
  });
}
