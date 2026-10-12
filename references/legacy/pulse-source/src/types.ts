export interface TrackInfo {
  id: number;
  name: string;
  type: 'audio' | 'midi' | 'return' | 'master';
  role: string;
  colorIndex: number;
  clipCount: number;
}

export interface ProjectIR {
  bpm: number;
  timeSignature: string;
  keyRoot: string;
  keyScale: string;
  tracks: TrackInfo[];
}

export interface RemixAction {
  type: 'swap_groove' | 'reharmonize' | 'restructure' | 'add_layer' | 'remove_layer';
  target_tracks: string[];
  params: any;
  reasoning: string;
}

export interface RemixPlan {
  actions: RemixAction[];
}

export interface ProductionPattern {
  id: number;
  genre: string;
  intensity: number;
  pattern_type: 'groove' | 'harmony' | 'structure' | 'mixing';
  description: string;
  parameters: string; // JSON string
}

// Music OS Professional Types
export interface DJDeck {
  id: string;
  isActive: boolean;
  bpm: number;
  key: string;
  sync: boolean;
  gain: number;
  crossfaderPos: number; // -1 to 1
  waveform?: string;
  trackName?: string;
  artist?: string;
  progress: number;
}

export interface SynthNode {
  id: string;
  type: 'generator' | 'modulation' | 'processing' | 'utility';
  name: string;
  params: Record<string, any>;
  connections: string[]; // Target node IDs
}

export interface MusicOSState {
  bpm: number;
  masterKey: string;
  isLive: boolean;
  activeAgents: string[];
  decks: DJDeck[];
  synthPatch: SynthNode[];
}

export interface DivergentIdea {
  id: string;
  title: string;
  content: string;
  type: 'concept' | 'analogy' | 'mutation' | 'hypothesis' | 'scenario';
  domain?: string;
  confidence: number;
  tags: string[];
  connections: string[]; // IDs of related ideas
}

export interface DivergentThinkingState {
  ideas: DivergentIdea[];
  activeMode: 'exploration' | 'cross_domain' | 'analogy' | 'mutation' | 'possibility_graph' | 'hypothesis' | 'scenario' | 'impossible';
  memoryNodes: string[];
}

export interface FusionEngineNode {
  id: string;
  name: string;
  type: 'divergent' | 'convergent' | 'critical' | 'systems' | 'strategic' | 'creative' | 'predictive' | 'ethical';
  confidence: number;
  weight: number;
  status: 'active' | 'standby' | 'conflict' | 'consensus';
}

export interface FusionResult {
  engineId: string;
  decision: string;
  confidence: number;
}

export interface CognitiveFusionState {
  nodes: FusionEngineNode[];
  activeResults: FusionResult[];
  consensusLevel: number;
  isEvolutionActive: boolean;
}
