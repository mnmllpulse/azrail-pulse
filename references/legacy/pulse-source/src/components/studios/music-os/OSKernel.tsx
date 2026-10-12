import React, { createContext, useContext, useState, useEffect } from 'react';
import { MusicOSState, DJDeck, SynthNode } from '../../../types';

interface MusicOSContextType {
  state: MusicOSState;
  updateState: (updates: Partial<MusicOSState>) => void;
  updateDeck: (deckId: string, updates: Partial<DJDeck>) => void;
  addSynthNode: (node: SynthNode) => void;
  autoConfigure: (mode: 'dj' | 'production' | 'mastering') => void;
}

const INITIAL_STATE: MusicOSState = {
  bpm: 124,
  masterKey: 'Am',
  isLive: false,
  activeAgents: ['Composer AI', 'Mixer AI'],
  decks: [
    { id: 'deck-1', isActive: true, bpm: 124, key: 'Am', sync: true, gain: 0.8, crossfaderPos: -1, progress: 34, trackName: 'Pulse Core', artist: 'MNMLL' },
    { id: 'deck-2', isActive: false, bpm: 124, key: 'Am', sync: true, gain: 0.8, crossfaderPos: 1, progress: 0, trackName: 'Ethereal Drift', artist: 'PULSE' },
    { id: 'deck-3', isActive: false, bpm: 124, key: 'Dm', sync: false, gain: 0.0, crossfaderPos: 0, progress: 0 },
    { id: 'deck-4', isActive: false, bpm: 124, key: 'Em', sync: false, gain: 0.0, crossfaderPos: 0, progress: 0 },
  ],
  synthPatch: [
    { id: 'osc-1', type: 'generator', name: 'Analog OSC', params: { wave: 'sine', detune: 5 }, connections: ['filter-1'] },
    { id: 'filter-1', type: 'processing', name: 'Ladder Filter', params: { cutoff: 1200, res: 0.4 }, connections: ['master-out'] },
  ]
};

const MusicOSContext = createContext<MusicOSContextType | undefined>(undefined);

export const MusicOSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<MusicOSState>(INITIAL_STATE);

  const updateState = (updates: Partial<MusicOSState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const updateDeck = (deckId: string, updates: Partial<DJDeck>) => {
    setState(prev => ({
      ...prev,
      decks: prev.decks.map(d => d.id === deckId ? { ...d, ...updates } : d)
    }));
  };

  const addSynthNode = (node: SynthNode) => {
    setState(prev => ({
      ...prev,
      synthPatch: [...prev.synthPatch, node]
    }));
  };

  const autoConfigure = (mode: 'dj' | 'production' | 'mastering') => {
    switch(mode) {
      case 'dj':
        updateState({ bpm: 128, isLive: true, activeAgents: ['Mixer AI', 'Beat AI'] });
        break;
      case 'production':
        updateState({ bpm: 120, isLive: false, activeAgents: ['Composer AI', 'Sound Designer AI'] });
        break;
      case 'mastering':
        updateState({ bpm: 0, isLive: false, activeAgents: ['Master AI'] });
        break;
    }
  };

  useEffect(() => {
    autoConfigure('production');
  }, []);

  return (
    <MusicOSContext.Provider value={{ state, updateState, updateDeck, addSynthNode, autoConfigure }}>
      {children}
    </MusicOSContext.Provider>
  );
};

export const useMusicOS = () => {
  const context = useContext(MusicOSContext);
  if (!context) throw new Error('useMusicOS must be used within MusicOSProvider');
  return context;
};
