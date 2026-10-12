import React, { useState, useEffect } from 'react';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export const InteractionRipple: React.FC = () => {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      // Create ripple at click/touch coordinates
      const id = Date.now() + Math.random();
      const newRipple = { id, x: e.clientX, y: e.clientY };
      
      setRipples((prev) => [...prev.slice(-10), newRipple]);

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 600);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {ripples.map((r) => (
        <div
          key={r.id}
          className="absolute rounded-full border border-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.8)] animate-[ping_0.6s_ease-out_forwards]"
          style={{
            left: `${r.x - 20}px`,
            top: `${r.y - 20}px`,
            width: '40px',
            height: '40px',
          }}
        />
      ))}
    </div>
  );
};

export default InteractionRipple;
