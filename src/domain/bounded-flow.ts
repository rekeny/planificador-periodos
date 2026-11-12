// Flow with lower and upper bounds on every edge, used only by rule-feasibility.ts (RF-067).

export interface FlowEdge {
  readonly from: number;
  readonly to: number;
  readonly min: number;
  readonly max: number;
}

export interface FlowNetwork {
  readonly nodeCount: number;
  readonly source: number;
  readonly sink: number;
  readonly edges: readonly FlowEdge[];
}

interface Arc {
  readonly to: number;
  capacity: number;
}

// Residual graph: arcs come in pairs, so the reverse of arc i is arc i ^ 1.
class ResidualGraph {
  readonly arcs: Arc[] = [];
  readonly outgoing: number[][];

  constructor(nodeCount: number) {
    this.outgoing = Array.from({ length: nodeCount }, () => []);
  }

  addEdge(from: number, to: number, capacity: number): void {
    this.outgoing[from]?.push(this.arcs.length);
    this.arcs.push({ to, capacity });
    this.outgoing[to]?.push(this.arcs.length);
    this.arcs.push({ to: from, capacity: 0 });
  }

  // Edmonds-Karp: shortest augmenting paths by breadth-first search.
  maxFlow(source: number, sink: number): number {
    let total = 0;
    for (;;) {
      const via = this.shortestPath(source, sink);
      if (via === undefined) return total;
      let bottleneck = Infinity;
      for (let node = sink; node !== source;) {
        const index = via[node] as number;
        bottleneck = Math.min(bottleneck, this.arcs[index]?.capacity ?? 0);
        node = this.arcs[index ^ 1]?.to as number;
      }
      for (let node = sink; node !== source;) {
        const index = via[node] as number;
        (this.arcs[index] as Arc).capacity -= bottleneck;
        (this.arcs[index ^ 1] as Arc).capacity += bottleneck;
        node = this.arcs[index ^ 1]?.to as number;
      }
      total += bottleneck;
    }
  }

  // For each reached node, the arc used to reach it; undefined when the sink is unreachable.
  private shortestPath(source: number, sink: number): number[] | undefined {
    const via: number[] = new Array<number>(this.outgoing.length).fill(-1);
    const seen = new Array<boolean>(this.outgoing.length).fill(false);
    seen[source] = true;
    const queue = [source];
    for (let head = 0; head < queue.length; head += 1) {
      const node = queue[head] as number;
      for (const index of this.outgoing[node] ?? []) {
        const arc = this.arcs[index] as Arc;
        if (arc.capacity <= 0 || seen[arc.to]) continue;
        seen[arc.to] = true;
        via[arc.to] = index;
        if (arc.to === sink) return via;
        queue.push(arc.to);
      }
    }
    return undefined;
  }
}

// An integer flow exists with min <= flow <= max on every edge and conservation
// at every node except the source and the sink.
export function hasFeasibleFlow(network: FlowNetwork): boolean {
  if (network.edges.some((edge) => edge.min > edge.max)) return false;

  // Standard reduction: the sink may send back to the source freely (circulation),
  // lower bounds become excesses served from a super-source and a super-sink.
  const superSource = network.nodeCount;
  const superSink = network.nodeCount + 1;
  const graph = new ResidualGraph(network.nodeCount + 2);
  const excess = new Array<number>(network.nodeCount).fill(0);

  const edges: readonly FlowEdge[] = [
    ...network.edges,
    { from: network.sink, to: network.source, min: 0, max: Infinity },
  ];
  for (const edge of edges) {
    graph.addEdge(edge.from, edge.to, edge.max - edge.min);
    excess[edge.to] = (excess[edge.to] ?? 0) + edge.min;
    excess[edge.from] = (excess[edge.from] ?? 0) - edge.min;
  }

  let required = 0;
  excess.forEach((value, node) => {
    if (value > 0) {
      graph.addEdge(superSource, node, value);
      required += value;
    } else if (value < 0) {
      graph.addEdge(node, superSink, -value);
    }
  });
  return graph.maxFlow(superSource, superSink) === required;
}
