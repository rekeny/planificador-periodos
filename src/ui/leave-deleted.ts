import type { useRouter } from "expo-router";

type Router = ReturnType<typeof useRouter>;

/** The part of a navigation route the helpers read. */
export interface StackRoute {
  readonly name: string;
  readonly params?: object;
}

interface NavState {
  readonly routes: readonly (StackRoute & { readonly state?: NavState })[];
}

/** The routes of the app's stack: the root state wraps them in its single `__root` route. */
export function stackRoutes(root: NavState | undefined): Routes {
  const wrapper = root?.routes[0];
  return wrapper?.state?.routes ?? root?.routes;
}

/** What a deletion needs to know to leave: the routes of the stack and which ones are the deleted thing's. */
type Routes = readonly StackRoute[] | undefined;

// A route of a dynamic segment: its name starts with the folder and its param is the deleted id.
export function isRouteOf(
  route: StackRoute,
  folder: string,
  param: string,
  id: number,
): boolean {
  if (!route.name.startsWith(`${folder}/`)) return false;
  const value = (route.params as Record<string, unknown> | undefined)?.[param];
  return String(value) === String(id);
}

// How many routes at the top of the stack belong to the deleted thing.
function trailing(
  routes: readonly StackRoute[],
  own: (r: StackRoute) => boolean,
) {
  const below = [...routes].reverse().findIndex((route) => !own(route));
  return below === -1 ? routes.length : below;
}

// Empties the stack down to its root and replaces that root, so no old route is left under it.
function resetTo(router: Router, href: "/" | "/matches", routes: Routes): void {
  if (routes !== undefined && routes.length > 1) router.dismissAll();
  router.replace(href);
}

/**
 * Leaves the screens of a deleted match: every route of it at the top of the stack (the grid and
 * any details above it) is popped, so the app ends on the screen below the grid. When the grid is
 * the root of the stack (a restored session or a deep link) nothing is left below it, so the app
 * ends on `/`. The grid's unmount closes the session.
 */
export function leaveDeletedMatch(
  router: Router,
  routes: Routes,
  matchId: number,
): void {
  const own = (route: StackRoute) =>
    isRouteOf(route, "matches/[matchId]", "matchId", matchId);
  const count = routes === undefined ? 0 : trailing(routes, own);
  if (routes === undefined || count === 0 || count === routes.length) {
    resetTo(router, "/matches", routes);
  } else {
    router.dismiss(count);
  }
}

/**
 * Leaves the screens of a deleted team: always ends on `/`, the list of teams, with no route of
 * the team left, whatever the stack under the form.
 */
export function leaveDeletedTeam(router: Router, routes: Routes): void {
  if (
    routes !== undefined &&
    routes.length > 1 &&
    routes[0]?.name === "index"
  ) {
    router.dismissAll();
  } else {
    resetTo(router, "/", routes);
  }
}
