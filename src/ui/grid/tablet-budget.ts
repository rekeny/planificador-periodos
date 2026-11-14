// RF-081 by construction: on a tablet the 12 player rows must fit without scrolling, whatever
// warnings are showing. The vertical space is spent in three places, each with a known ceiling:
// the chrome, one strip of warnings above the grid, and the grid itself.

/** The status bar (24) and the navigation header (50) of the plan's tablet height table. */
export const TABLET_CHROME_HEIGHT = 74;

/**
 * The most the warnings strip may take. The grid keeps 768 - 74 - strip - 44 (header row) >= 528
 * (12 rows of 44) on the shortest tablet window, so the strip is at most 122. 80 leaves room for
 * one line of chips plus the wrapped legend and some slack; anything beyond it is clipped.
 */
export const TABLET_STRIP_MAX_HEIGHT = 80;

/** The least height the grid container has on a tablet of the given window height. */
export function tabletGridViewportHeight(windowHeight: number): number {
  return windowHeight - TABLET_CHROME_HEIGHT - TABLET_STRIP_MAX_HEIGHT;
}
