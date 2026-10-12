import React from 'react';

interface PulseBackgroundProps {
  isLight: boolean;
  children?: React.ReactNode;
  minHeight?: string;
}

export function PulseBackground({ isLight, children, minHeight = '520px' }: PulseBackgroundProps) {
  return (
    <div 
      className={`relative w-full h-full overflow-hidden border transition-all duration-1000 rounded-[48px] ${
        isLight 
          ? 'bg-indigo-50/50 border-indigo-100' 
          : 'bg-depth-void border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]'
      }`}
      style={{ minHeight }}
    >
      {/* Background Grid Layer */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{ 
          backgroundImage: `radial-gradient(circle at 1px 1px, ${isLight ? '#7B4DFF' : '#B388FF'} 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} 
      />

      {/* Main Content Area */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center py-20">
        {children}
      </div>

      {/* Interface Footer Indicators */}
      <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between pointer-events-none">
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-8 h-1 rounded-full bg-pulse-primary/20 overflow-hidden">
              <div className="h-full w-full bg-pulse-primary opacity-50" />
            </div>
          ))}
        </div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-pulse-accent/40">
          Sync Status: Ready
        </div>
      </div>
    </div>
  );
}
