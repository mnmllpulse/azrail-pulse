import React from 'react';
import { useSystemState } from '../contexts/SystemStateContext';

export const CRTOverlay: React.FC = () => {
  const { uiPreferences } = useSystemState();
  
  if (!uiPreferences.crtEffect) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {/* Scanlines */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-20" />
      
      {/* Vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
      
      {/* Subtle Flickering */}
      <div className="absolute inset-0 bg-white/5 animate-pulse opacity-10 mix-blend-overlay" />
      
      {/* Chromatic Aberration is usually applied via CSS filters on the main container, 
          but we can add a subtle color fringe overlay here too */}
      <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(90deg,red,transparent,blue)] mix-blend-screen" />
    </div>
  );
};
