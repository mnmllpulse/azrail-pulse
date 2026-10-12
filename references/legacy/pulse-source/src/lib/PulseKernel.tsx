import React, { createContext, useContext, useState } from 'react';

// Единое состояние Pulse OS
const PulseContext = createContext<any>(null);

export const PulseProvider = ({ children }: { children: React.ReactNode }) => {
  const [systemState, setSystemState] = useState({
    status: 'Healthy',
    activeAgents: 7,
    runningWorkflows: 12,
    pendingDecisions: 3,
    riskLevel: 'Low',
    estimatedCost: 4.21,
    architectureHealth: 94,
    confidence: 91,
    currentTask: 'Building authentication',
    reasoning: 'Mission requires secure user access'
  });

  return (
    <PulseContext.Provider value={{ systemState, setSystemState }}>
      {children}
    </PulseContext.Provider>
  );
};

export const usePulse = () => useContext(PulseContext);
