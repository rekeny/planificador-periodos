type RouteParam = string | string[] | undefined;

/**
 * Only the canonical text of a positive integer is an ID: the round trip rejects "01", "1.0",
 * "+1", " 1" and "1e3", and the safe-integer check rejects numbers that lose precision.
 */
function parseId(param: RouteParam): number | null {
  if (typeof param !== "string") {
    return null;
  }
  const value = Number(param);
  return Number.isSafeInteger(value) && value > 0 && String(value) === param
    ? value
    : null;
}

export function parseTeamId(param: RouteParam): number | null {
  return parseId(param);
}

export function parsePlayerId(param: RouteParam): number | null {
  return parseId(param);
}

export function parseMatchId(param: RouteParam): number | null {
  return parseId(param);
}
