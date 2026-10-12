export interface Node {
  id: string;
  type: 'component' | 'service' | 'api' | 'database';
  name: string;
}

export interface Edge {
  source: string;
  target: string;
  type: 'dependency' | 'calls' | 'uses';
}

export class CodeGraph {
  private nodes: Node[] = [];
  private edges: Edge[] = [];

  addNode(node: Node) { this.nodes.push(node); }
  addEdge(edge: Edge) { this.edges.push(edge); }
  
  analyzeImpact(nodeId: string) {
    // Внедрение IMPACT ENGINE
    return { affectedNodes: [] };
  }
}
