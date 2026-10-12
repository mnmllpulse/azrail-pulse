import { PulseState } from './types';

export class SourceOfTruth {
  private currentState: PulseState = {
    version: '1.0.0',
    status: 'healthy',
    confidence: 100,
    activeAgents: 0
  };

  getState(): PulseState {
    return this.currentState;
  }

  updateState(newState: Partial<PulseState>) {
    this.currentState = { ...this.currentState, ...newState };
  }
}

export const sourceOfTruth = new SourceOfTruth();
