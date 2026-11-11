// "Rule impossible to meet" (RF-067): can the empty cells of the rule window be filled with X
// so that every window period has exactly 5 X and every player reaches both minimums?
import { hasFeasibleFlow, type FlowEdge } from "@/domain/bounded-flow";
import { ruleWindowColumns } from "@/domain/column";
import { FORMAT_RULES, MAX_STARTERS_PER_PERIOD } from "@/domain/format";
import { cellState, starterCount, type MatchGrid } from "@/domain/grid";

export function isRuleImpossible(grid: MatchGrid): boolean {
  const { minPlayed, minRested } = FORMAT_RULES[grid.format].ruleWindow;
  const columns = ruleWindowColumns(grid.format);
  const players = grid.callUp.length;
  if (players < MAX_STARTERS_PER_PERIOD) return true;

  // Nodes: 0 source, players, window periods, sink.
  const firstPeriod = 1 + players;
  const sink = firstPeriod + columns.length;
  const edges: FlowEdge[] = [];

  grid.callUp.forEach((entry, row) => {
    let played = 0;
    const emptyPeriods: number[] = [];
    columns.forEach((column, index) => {
      const state = cellState(grid, { entryId: entry.id, column });
      if (state === "starter") played += 1;
      else if (state === "empty") emptyPeriods.push(firstPeriod + index);
    });
    const min = Math.max(0, minPlayed - played);
    const max = emptyPeriods.length - minRested;
    edges.push({ from: 0, to: 1 + row, min, max });
    for (const period of emptyPeriods) {
      edges.push({ from: 1 + row, to: period, min: 0, max: 1 });
    }
  });

  columns.forEach((column, index) => {
    const missing = MAX_STARTERS_PER_PERIOD - starterCount(grid, column);
    edges.push({
      from: firstPeriod + index,
      to: sink,
      min: missing,
      max: missing,
    });
  });

  return !hasFeasibleFlow({ nodeCount: sink + 1, source: 0, sink, edges });
}
