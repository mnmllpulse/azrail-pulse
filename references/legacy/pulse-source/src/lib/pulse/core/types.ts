export interface Intent {
  id: string;
  description: string;
  goal: string;
  constraints: Record<string, any>;
  status: 'pending' | 'analyzing' | 'planned' | 'executing' | 'completed' | 'failed';
}

export interface PulseState {
  version: string;
  status: 'healthy' | 'warning' | 'critical';
  confidence: number;
  activeAgents: number;
}
