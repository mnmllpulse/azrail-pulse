export interface AgentTrust {
  agentId: string;
  trustScore: number; // 0-1
  securityScore: number;
  capabilityScore: number;
}

export class TrustGovernance {
  private trustLevels: Map<string, AgentTrust> = new Map();

  getTrust(agentId: string): AgentTrust | undefined {
    return this.trustLevels.get(agentId);
  }

  updateTrust(agentId: string, trust: AgentTrust) {
    this.trustLevels.set(agentId, trust);
  }
}
