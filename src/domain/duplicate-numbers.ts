import type { Player } from "@/domain/squad";

/**
 * Numbers shared by two or more active players (RF-069), each listed once, in
 * order of first appearance. Numbers are compared as exact text, so "0" and
 * "00" are different. Deactivated players are ignored. It only informs: it
 * never rejects a player (RF-017).
 */
export function duplicateNumbers(
  players: readonly Player[],
): readonly string[] {
  const counts = new Map<string, number>();
  for (const player of players) {
    if (player.isActive) {
      counts.set(player.number, (counts.get(player.number) ?? 0) + 1);
    }
  }
  return [...counts]
    .filter(([, count]) => count >= 2)
    .map(([number]) => number);
}
