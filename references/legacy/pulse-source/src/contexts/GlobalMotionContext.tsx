import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSystemState } from './SystemStateContext';

export type MotionPreset = 
  | 'fluid-sleek' 
  | 'snappy-spring' 
  | 'ultra-inertia' 
  | 'minimal-ease' 
  | 'hyper-bounce' 
  | 'liquid-elastic' 
  | 'magnetic-inertia' 
  | 'anti-gravity-glide';

export interface MotionConfig {
  preset: MotionPreset;
  stiffness: number;
  damping: number;
  mass: number;
  hoverScale: number;
  entranceY: number;
  duration: number;
  isAnimationsEnabled: boolean;
  staggerDelay: number; // custom control for stagger intervals
}

interface GlobalMotionContextType {
  config: MotionConfig;
  updateConfig: (updater: Partial<MotionConfig> | ((prev: MotionConfig) => MotionConfig)) => void;
  resetConfig: () => void;
  getTransition: (overrides?: any) => any;
  getVariants: (type?: 'container' | 'item' | 'card' | 'panel' | 'stagger-container' | 'stagger-item' | 'fade-scale' | 'panel-right') => any;
}

const defaultConfig: MotionConfig = {
  preset: 'fluid-sleek',
  stiffness: 100,
  damping: 15,
  mass: 1.0,
  hoverScale: 1.02,
  entranceY: 15,
  duration: 0.5,
  isAnimationsEnabled: true,
  staggerDelay: 0.05,
};

const GlobalMotionContext = createContext<GlobalMotionContextType>({
  config: defaultConfig,
  updateConfig: () => {},
  resetConfig: () => {},
  getTransition: () => ({}),
  getVariants: () => ({}),
});

export const useGlobalMotion = () => useContext(GlobalMotionContext);

export const useBackgroundSync = () => {
  const { pulseFrequency } = useSystemState();
  const { config } = useGlobalMotion();
  
  // Returns a motion config that is perfectly synced with the background pulse
  return {
    animate: {
      scale: [1, 1.02, 1],
      opacity: [0.8, 1, 0.8],
    },
    transition: {
      duration: 2 / pulseFrequency,
      repeat: Infinity,
      ease: "easeInOut" as const,
      // Disable if global animations are off
      ...(config.isAnimationsEnabled ? {} : { duration: 0 })
    }
  };
};

export function GlobalMotionProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<MotionConfig>(() => {
    try {
      const saved = localStorage.getItem('pulse_motion_config');
      if (saved) {
        return { ...defaultConfig, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to parse global motion config', e);
    }
    return defaultConfig;
  });

  useEffect(() => {
    localStorage.setItem('pulse_motion_config', JSON.stringify(config));
  }, [config]);

  const updateConfig = (updater: Partial<MotionConfig> | ((prev: MotionConfig) => MotionConfig)) => {
    setConfig((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      
      // Auto-update values when preset changes
      if (typeof updater === 'object' && updater.preset && updater.preset !== prev.preset) {
        switch (updater.preset) {
          case 'fluid-sleek':
            next.stiffness = 100;
            next.damping = 15;
            next.mass = 1.0;
            next.duration = 0.5;
            next.staggerDelay = 0.05;
            break;
          case 'snappy-spring':
            next.stiffness = 190;
            next.damping = 13;
            next.mass = 0.8;
            next.duration = 0.35;
            next.staggerDelay = 0.03;
            break;
          case 'ultra-inertia':
            next.stiffness = 40;
            next.damping = 18;
            next.mass = 1.6;
            next.duration = 0.8;
            next.staggerDelay = 0.09;
            break;
          case 'minimal-ease':
            next.stiffness = 100;
            next.damping = 15;
            next.mass = 1.0;
            next.duration = 0.45;
            next.staggerDelay = 0.06;
            break;
          case 'hyper-bounce':
            next.stiffness = 260;
            next.damping = 11;
            next.mass = 0.6;
            next.duration = 0.45;
            next.staggerDelay = 0.035;
            break;
          case 'liquid-elastic':
            next.stiffness = 110;
            next.damping = 12;
            next.mass = 1.4;
            next.duration = 0.65;
            next.staggerDelay = 0.08;
            break;
          case 'magnetic-inertia':
            next.stiffness = 170;
            next.damping = 28;
            next.mass = 2.2;
            next.duration = 0.8;
            next.staggerDelay = 0.04;
            break;
          case 'anti-gravity-glide':
            next.stiffness = 25;
            next.damping = 14;
            next.mass = 0.85;
            next.duration = 0.9;
            next.staggerDelay = 0.14;
            break;
        }
      }
      return next;
    });
  };

  const resetConfig = () => {
    setConfig(defaultConfig);
  };

  const getTransition = (overrides?: any) => {
    if (!config.isAnimationsEnabled) {
      return { duration: 0 };
    }
    if (config.preset === 'minimal-ease') {
      return {
        ease: [0.16, 1, 0.3, 1], // Custom elegant easeOut
        duration: config.duration,
        ...overrides,
      };
    }
    return {
      type: 'spring',
      stiffness: config.stiffness,
      damping: config.damping,
      mass: config.mass,
      ...overrides,
    };
  };

  const getVariants = (type?: 'container' | 'item' | 'card' | 'panel' | 'stagger-container' | 'stagger-item' | 'fade-scale' | 'panel-right') => {
    if (!config.isAnimationsEnabled) {
      return {
        hidden: { opacity: 1, y: 0, scale: 1, rotate: 0 },
        visible: { opacity: 1, y: 0, scale: 1, rotate: 0 },
      };
    }

    const transition = getTransition();
    const stagger = config.staggerDelay || 0.05;

    switch (type) {
      case 'container':
        return {
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: stagger,
              delayChildren: 0.02,
              ...transition,
            },
          },
        };

      case 'stagger-container':
        return {
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: stagger * 1.2, // slightly delayed stagger for deep layouts
              delayChildren: 0.05,
              staggerDirection: 1,
            },
          },
        };

      case 'item':
        return {
          hidden: { opacity: 0, y: config.entranceY },
          visible: {
            opacity: 1,
            y: 0,
            transition,
          },
        };

      case 'stagger-item':
        return {
          hidden: { 
            opacity: 0, 
            y: config.entranceY, 
            scale: 0.96, 
            rotate: -1,
            filter: 'blur(4px)' 
          },
          visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            rotate: 0,
            filter: 'blur(0px)',
            transition: {
              ...transition,
              // stagger transitions are smoother with some extra damping factor
              damping: config.damping * 1.1
            },
          },
        };

      case 'card':
        return {
          hidden: { opacity: 0, scale: 0.98, y: config.entranceY / 2 },
          visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition,
          },
          hover: {
            scale: config.hoverScale,
            y: -4,
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            transition: {
              type: 'spring',
              stiffness: 400,
              damping: 18,
            },
          },
          tap: {
            scale: 0.985,
            y: -1,
          },
        };

      case 'panel':
        return {
          hidden: { opacity: 0, x: -config.entranceY },
          visible: {
            opacity: 1,
            x: 0,
            transition,
          },
        };

      case 'panel-right':
        return {
          hidden: { opacity: 0, x: config.entranceY },
          visible: {
            opacity: 1,
            x: 0,
            transition,
          },
        };

      case 'fade-scale':
        return {
          hidden: { opacity: 0, scale: 0.94 },
          visible: {
            opacity: 1,
            scale: 1,
            transition: {
              ...transition,
              stiffness: config.stiffness * 1.1,
              damping: config.damping * 1.05
            }
          }
        };

      default:
        return {
          hidden: { opacity: 0, y: config.entranceY },
          visible: { opacity: 1, y: 0, transition },
        };
    }
  };

  return (
    <GlobalMotionContext.Provider
      value={{
        config,
        updateConfig,
        resetConfig,
        getTransition,
        getVariants,
      }}
    >
      {children}
    </GlobalMotionContext.Provider>
  );
}
