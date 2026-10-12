export type AssetType = 'image' | 'video' | 'music' | 'code' | 'document' | 'agent' | 'metadata';

export interface ProjectNode {
  id: string;
  type: AssetType;
  title: string;
  metadata: Record<string, any>;
  data: any; // URL, content, or reference
  createdAt: string;
  updatedAt: string;
}

export interface ProjectEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: 'derived_from' | 'contains' | 'references' | 'inspired_by';
}

export class ProjectGraph {
  public id: string;
  public name: string;
  public nodes: Map<string, ProjectNode> = new Map();
  public edges: Map<string, ProjectEdge> = new Map();

  constructor(name: string) {
    this.id = Math.random().toString(36).substring(7);
    this.name = name;
  }

  addNode(node: Omit<ProjectNode, 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString();
    const fullNode: ProjectNode = {
      ...node,
      createdAt: now,
      updatedAt: now,
    };
    this.nodes.set(node.id, fullNode);
    return fullNode;
  }

  addEdge(sourceId: string, targetId: string, relationType: ProjectEdge['relationType']) {
    const edgeId = `${sourceId}-${relationType}-${targetId}`;
    const edge: ProjectEdge = {
      id: edgeId,
      sourceId,
      targetId,
      relationType,
    };
    this.edges.set(edgeId, edge);
    return edge;
  }

  getRoots(): ProjectNode[] {
    // Return nodes that have no incoming 'derived_from' or 'contains' edges
    const targetIds = new Set(Array.from(this.edges.values()).map(e => e.targetId));
    return Array.from(this.nodes.values()).filter(n => !targetIds.has(n.id));
  }

  getGraphData() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
    };
  }
}
