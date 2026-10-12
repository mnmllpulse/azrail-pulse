import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWebContainer } from './WebContainerContext';

export interface StudioAIContextType {
  fileTree: string[];
  terminalLogs: string[];
  lastBuildStatus: 'success' | 'failed' | 'idle';
  setLastBuildStatus: (status: 'success' | 'failed' | 'idle') => void;
  getAIContextPrompt: (userPrompt: string) => string;
}

const StudioAIContext = createContext<StudioAIContextType | undefined>(undefined);

export const StudioAIContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { fs, terminalLogs } = useWebContainer();
  const [lastBuildStatus, setLastBuildStatus] = useState<'success' | 'failed' | 'idle'>('idle');

  const fileTree = Object.keys(fs);

  // Generate context string for AI assistant
  const getAIContextPrompt = (userPrompt: string): string => {
    const fileStructureStr = fileTree.map(f => `- ${f}`).join('\n');
    const recentLogs = terminalLogs.slice(-15).join('\n');

    return `
[SYSTEM AI CONTEXT ENHANCEMENT]
Below is the current state of the developer workspace. Use this information to generate accurate code, find potential bugs, or assist with terminal logs.

### Project File Tree:
${fileStructureStr || 'Empty Workspace'}

### Recent WebContainer Terminal Logs & Output:
${recentLogs || 'No logs recorded yet'}

### Current Virtual Build Status:
${lastBuildStatus.toUpperCase()}

[USER REQUEST]:
${userPrompt}
`;
  };

  return (
    <StudioAIContext.Provider value={{
      fileTree,
      terminalLogs,
      lastBuildStatus,
      setLastBuildStatus,
      getAIContextPrompt
    }}>
      {children}
    </StudioAIContext.Provider>
  );
};

export const useStudioAI = () => {
  const context = useContext(StudioAIContext);
  if (!context) {
    throw new Error('useStudioAI must be used within a StudioAIContextProvider');
  }
  return context;
};
