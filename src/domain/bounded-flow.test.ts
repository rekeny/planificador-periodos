import {
  array,
  assert,
  integer,
  property,
  record,
  type Arbitrary,
} from "fast-check";
import { hasFeasibleFlow, type FlowNetwork } from "@/domain/bounded-flow";

// Edge as [from, to, min, max]. Node 0 is the source and the last node is the sink.
type EdgeSpec = readonly [number, number, number, number];

function network(nodeCount: number, edges: readonly EdgeSpec[]): FlowNetwork {
  return {
    nodeCount,
    source: 0,
    sink: nodeCount - 1,
    edges: edges.map(([from, to, min, max]) => ({ from, to, min, max })),
  };
}

// Reference answer by trying every flow value of every edge. Only for tiny networks.
function bruteForceFeasible(net: FlowNetwork): boolean {
  const balance = new Array<number>(net.nodeCount).fill(0);
  const visit = (index: number): boolean => {
    const edge = net.edges[index];
    if (edge === undefined) {
      return balance.every(
        (value, node) =>
          node === net.source || node === net.sink || value === 0,
      );
    }
    for (let flow = edge.min; flow <= edge.max; flow += 1) {
      balance[edge.from] = (balance[edge.from] ?? 0) - flow;
      balance[edge.to] = (balance[edge.to] ?? 0) + flow;
      const found = visit(index + 1);
      balance[edge.from] = (balance[edge.from] ?? 0) + flow;
      balance[edge.to] = (balance[edge.to] ?? 0) - flow;
      if (found) return true;
    }
    return false;
  };
  return visit(0);
}

describe("hasFeasibleFlow, chains and single edges", () => {
  it.each<readonly [string, number, readonly EdgeSpec[], boolean]>([
    ["no edges: the zero flow is enough", 2, [], true],
    ["one edge with room for flow", 2, [[0, 1, 0, 5]], true],
    ["one edge with a lower bound", 2, [[0, 1, 2, 5]], true],
    [
      "lower bound equal to the upper bound",
      3,
      [
        [0, 1, 3, 3],
        [1, 2, 3, 3],
      ],
      true,
    ],
    [
      "second edge takes at least what the first one must send",
      3,
      [
        [0, 1, 1, 3],
        [1, 2, 2, 4],
      ],
      true,
    ],
    [
      "second edge cannot carry what the first one must send",
      3,
      [
        [0, 1, 2, 3],
        [1, 2, 0, 1],
      ],
      false,
    ],
    [
      "second edge must carry more than the first one can send",
      3,
      [
        [0, 1, 0, 1],
        [1, 2, 2, 3],
      ],
      false,
    ],
    ["lower bound above the upper bound", 2, [[0, 1, 3, 2]], false],
    [
      "lower bound above the upper bound on an edge outside any path",
      3,
      [
        [0, 2, 0, 1],
        [1, 2, 2, 1],
      ],
      false,
    ],
    [
      "a node with a forced outflow and no inflow",
      3,
      [
        [0, 2, 0, 1],
        [1, 2, 1, 1],
      ],
      false,
    ],
  ])("RF-067: %s", (_name, nodeCount, edges, expected) => {
    expect(hasFeasibleFlow(network(nodeCount, edges))).toBe(expected);
  });
});

describe("hasFeasibleFlow, branching networks", () => {
  it.each<readonly [string, number, readonly EdgeSpec[], boolean]>([
    [
      "two branches, each lower bound met",
      4,
      [
        [0, 1, 1, 2],
        [0, 2, 1, 2],
        [1, 3, 0, 1],
        [2, 3, 0, 1],
      ],
      true,
    ],
    [
      "two branches, one forced above what its exit can take",
      4,
      [
        [0, 1, 2, 2],
        [0, 2, 1, 2],
        [1, 3, 0, 1],
        [2, 3, 0, 1],
      ],
      false,
    ],
    [
      "needs sending along a side edge, not only straight through",
      4,
      [
        [0, 1, 0, 2],
        [0, 2, 0, 2],
        [2, 1, 0, 2],
        [1, 3, 3, 3],
      ],
      true,
    ],
    [
      "the sink edge asks for more than every road can bring",
      4,
      [
        [0, 1, 0, 2],
        [0, 2, 0, 2],
        [2, 1, 0, 2],
        [1, 3, 5, 5],
      ],
      false,
    ],
  ])("RF-067: %s", (_name, nodeCount, edges, expected) => {
    expect(hasFeasibleFlow(network(nodeCount, edges))).toBe(expected);
  });

  it("RF-067: a greedy first choice must be undone to find the only feasible flow", () => {
    // Nodes: 0 source, 1 and 2 players, 3 and 4 periods, 5 sink. Player 2 can only use period 3,
    // so player 1 must go to period 4 even though period 3 is its first edge.
    const net = network(6, [
      [0, 1, 1, 1],
      [0, 2, 1, 1],
      [1, 3, 0, 1],
      [1, 4, 0, 1],
      [2, 3, 0, 1],
      [3, 5, 1, 1],
      [4, 5, 1, 1],
    ]);
    expect(hasFeasibleFlow(net)).toBe(true);
  });

  it("RF-067: the same network with the second period unreachable is not feasible", () => {
    const net = network(6, [
      [0, 1, 1, 1],
      [0, 2, 1, 1],
      [1, 3, 0, 1],
      [2, 3, 0, 1],
      [3, 5, 1, 1],
      [4, 5, 1, 1],
    ]);
    expect(hasFeasibleFlow(net)).toBe(false);
  });
});

describe("hasFeasibleFlow, purity and agreement with brute force", () => {
  it("RF-067: it does not change the network it receives and answers the same twice", () => {
    const net = network(4, [
      [0, 1, 1, 2],
      [0, 2, 1, 2],
      [1, 3, 0, 1],
      [2, 3, 0, 1],
    ]);
    const before = JSON.stringify(net);
    const first = hasFeasibleFlow(net);
    expect(hasFeasibleFlow(net)).toBe(first);
    expect(JSON.stringify(net)).toBe(before);
  });

  const nodeCountArbitrary = integer({ min: 2, max: 5 });
  const networkArbitrary: Arbitrary<FlowNetwork> = nodeCountArbitrary.chain(
    (nodeCount) =>
      // No edge enters the source or leaves the sink, and no edge joins a node to itself.
      array(
        record({
          from: integer({ min: 0, max: nodeCount - 2 }),
          to: integer({ min: 1, max: nodeCount - 1 }),
          min: integer({ min: 0, max: 2 }),
          max: integer({ min: 0, max: 3 }),
        }),
        { maxLength: 6 },
      ).map((edges) => ({
        nodeCount,
        source: 0,
        sink: nodeCount - 1,
        edges: edges.filter((edge) => edge.from !== edge.to),
      })),
  );

  it("RF-067: on random small networks with lower bounds it agrees with trying every flow", () => {
    assert(
      property(networkArbitrary, (net) => {
        expect(hasFeasibleFlow(net)).toBe(bruteForceFeasible(net));
      }),
    );
  });
});
