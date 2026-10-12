import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAudio } from './AudioContext';

interface DeepWorkContextType {
  isDeepWork: boolean;
  setIsDeepWork: (value: boolean | ((prev: boolean) => boolean)) => void;
  toggleDeepWork: () => void;
  silenceNotifications: boolean;
  simplifiedUI: boolean;
}

const DeepWorkContext = createContext<DeepWorkContextType | null>(null);

export const useDeepWork = () => {
  const context = useContext(DeepWorkContext);
  if (!context) {
    throw new Error('useDeepWork must be used within a DeepWorkProvider');
  }
  return context;
};

export const DeepWorkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [isDeepWork, setIsDeepWork] = useState(false);
  const audio = useAudio();

  // Auto-enable DeepWork mode when entering any studio environment
  useEffect(() => {
    const isStudioRoute = location.pathname.startsWith('/studio/');
    setIsDeepWork(isStudioRoute);
  }, [location.pathname]);

  // Apply deepwork mode class to document body
  useEffect(() => {
    if (isDeepWork) {
      document.body.classList.add('deepwork-focus-mode');
    } else {
      document.body.classList.remove('deepwork-focus-mode');
    }
  }, [isDeepWork]);

  const toggleDeepWork = () => {
    setIsDeepWork((prev) => !prev);
  };

  return (
    <DeepWorkContext.Provider
      value={{
        isDeepWork,
        setIsDeepWork,
        toggleDeepWork,
        silenceNotifications: isDeepWork,
        simplifiedUI: isDeepWork,
      }}
    >
      {children}
    </DeepWorkContext.Provider>
  );
};
