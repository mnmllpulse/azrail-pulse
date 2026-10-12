import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

interface LayoutContextType {
  width: number;
  height: number;
  breakpoint: Breakpoint;
}

const LayoutContext = createContext<LayoutContextType>({
  width: 0,
  height: 0,
  breakpoint: 'desktop',
});

export const useLayoutEngine = () => useContext(LayoutContext);

interface LayoutEngineProps {
  children: React.ReactNode;
}

export default function LayoutEngine({ children }: LayoutEngineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<LayoutContextType>({
    width: 1440,
    height: 900,
    breakpoint: 'desktop',
  });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const entry = entries[0];
      const { width, height } = entry.contentRect;

      let breakpoint: Breakpoint = 'desktop';
      if (width < 768) {
        breakpoint = 'mobile';
      } else if (width < 1440) {
        breakpoint = 'tablet';
      }

      setLayout({
        width,
        height,
        breakpoint,
      });
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <LayoutContext.Provider value={layout}>
      <div 
        ref={containerRef} 
        className="layout-engine-container h-full flex flex-col flex-1"
        data-breakpoint={layout.breakpoint}
        id="global-layout-engine"
      >
        {children}
      </div>
    </LayoutContext.Provider>
  );
}
