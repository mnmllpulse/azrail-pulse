import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AIModel, AI_MODELS } from '../data/models';

interface ModelsContextType {
  connectedModels: Record<string, AIModel>; // map of modelId -> AIModel
  connectModel: (modelId: string) => void;
  disconnectModel: (modelId: string) => void;
  isModelConnected: (modelId: string) => boolean;
}

const ModelsContext = createContext<ModelsContextType | undefined>(undefined);

export function ModelsProvider({ children }: { children: ReactNode }) {
  const [connectedModels, setConnectedModels] = useState<Record<string, AIModel>>({});

  const connectModel = (modelId: string) => {
    const model = AI_MODELS.find(m => m.id === modelId);
    if (model) {
      setConnectedModels(prev => ({ ...prev, [modelId]: model }));
    }
  };

  const disconnectModel = (modelId: string) => {
    setConnectedModels(prev => {
      const next = { ...prev };
      delete next[modelId];
      return next;
    });
  };

  const isModelConnected = (modelId: string) => {
    return !!connectedModels[modelId];
  };

  return (
    <ModelsContext.Provider value={{ connectedModels, connectModel, disconnectModel, isModelConnected }}>
      {children}
    </ModelsContext.Provider>
  );
}

export function useModels() {
  const context = useContext(ModelsContext);
  if (context === undefined) {
    throw new Error('useModels must be used within a ModelsProvider');
  }
  return context;
}
