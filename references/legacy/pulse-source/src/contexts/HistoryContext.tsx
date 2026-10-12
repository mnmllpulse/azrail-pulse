
import React, { createContext, useContext, useState, useEffect } from 'react';

export interface HistoryItem {
  id: string;
  type: 'music' | 'video' | 'image' | 'text' | 'web' | 'chat' | 'quantum' | 'code' | 'knowledge';
  title: string;
  description: string;
  timestamp: string;
  previewUrl?: string;
  metadata?: any;
}

interface HistoryContextType {
  history: HistoryItem[];
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pulse_generation_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('pulse_generation_history', JSON.stringify(history));
  }, [history]);

  const addToHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
    };
    
    setHistory(prev => [newItem, ...prev].slice(0, 50));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('pulse_generation_history');
  };

  const removeFromHistory = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  return (
    <HistoryContext.Provider value={{ history, addToHistory, clearHistory, removeFromHistory }}>
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = () => {
  const context = useContext(HistoryContext);
  if (context === undefined) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
};
