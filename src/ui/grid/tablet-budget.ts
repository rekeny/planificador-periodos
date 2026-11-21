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

/**
 * The most the warnings strip may take on a phone in landscape: a landscape phone (375 high)
 * keeps 375 - 74 - 60 - 44 = 197 >= 132 for the grid, with or without the save-error banner (44).
 */
export const PHONE_STRIP_MAX_HEIGHT = 60;

/**
 * The most the strip may take on a phone in portrait (F-A4). 60 showed about one line of the first
 * banner there, so the second one was out of view; 160 holds the two banners (about 75 each). A
 * phone is at least about 640 high: 640 - 74 chrome - 76 call-up button - 56 toolbar - 160 strip
 * - 44 header row = 230 >= 132 (a header row and two rows) for the grid, which scrolls vertically
 * for the rest.
 */
export const PHONE_PORTRAIT_STRIP_MAX_HEIGHT = 160;
