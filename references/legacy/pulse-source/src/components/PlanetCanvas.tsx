import React, { useEffect, useRef } from 'react';
import { PlanetCore } from './planet-core';

export const PlanetCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<PlanetCore | null>(null);

  useEffect(() => {
    if (containerRef.current && !coreRef.current) {
      coreRef.current = new PlanetCore(containerRef.current);
    }

    return () => {
      if (coreRef.current) {
        coreRef.current.destroy();
        coreRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      id="planet-core" 
      ref={containerRef} 
      className="w-full h-full bg-transparent"
    />
  );
};
