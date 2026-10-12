import { useState, useEffect } from 'react';

export interface DynamicContrastConfig {
  autoAdapt: boolean;
  contrastMode: 'standard' | 'high' | 'ultra-dark';
  ambientLight: 'bright' | 'dim' | 'dark';
}

export function useDynamicContrast() {
  const [config, setConfig] = useState<DynamicContrastConfig>(() => {
    const saved = localStorage.getItem('pulse_contrast_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      autoAdapt: true,
      contrastMode: 'standard',
      ambientLight: 'dark',
    };
  });

  useEffect(() => {
    localStorage.setItem('pulse_contrast_config', JSON.stringify(config));

    // Update root CSS custom properties according to contrast mode and ambient light
    const root = document.documentElement;

    if (config.contrastMode === 'high' || (config.autoAdapt && window.matchMedia('(prefers-contrast: more)').matches)) {
      root.style.setProperty('--pulse-bg-base', '#030108');
      root.style.setProperty('--pulse-card-bg', 'rgba(18, 12, 32, 0.95)');
      root.style.setProperty('--pulse-text-main', '#ffffff');
      root.style.setProperty('--pulse-text-sub', '#d4d4d8');
      root.style.setProperty('--pulse-border-color', 'rgba(168, 85, 247, 0.45)');
      root.style.setProperty('--pulse-glow-mult', '1.4');
    } else if (config.contrastMode === 'ultra-dark') {
      root.style.setProperty('--pulse-bg-base', '#000000');
      root.style.setProperty('--pulse-card-bg', 'rgba(10, 10, 15, 0.9)');
      root.style.setProperty('--pulse-text-main', '#f4f4f5');
      root.style.setProperty('--pulse-text-sub', '#a1a1aa');
      root.style.setProperty('--pulse-border-color', 'rgba(255, 255, 255, 0.12)');
      root.style.setProperty('--pulse-glow-mult', '0.8');
    } else {
      // Standard Dark Mnmll
      root.style.setProperty('--pulse-bg-base', '#090514');
      root.style.setProperty('--pulse-card-bg', 'rgba(15, 10, 26, 0.85)');
      root.style.setProperty('--pulse-text-main', '#f8fafc');
      root.style.setProperty('--pulse-text-sub', '#94a3b8');
      root.style.setProperty('--pulse-border-color', 'rgba(168, 85, 247, 0.25)');
      root.style.setProperty('--pulse-glow-mult', '1.0');
    }
  }, [config]);

  const setContrastMode = (mode: 'standard' | 'high' | 'ultra-dark') => {
    setConfig((prev) => ({ ...prev, contrastMode: mode }));
  };

  const toggleAutoAdapt = () => {
    setConfig((prev) => ({ ...prev, autoAdapt: !prev.autoAdapt }));
  };

  return {
    config,
    setContrastMode,
    toggleAutoAdapt,
  };
}
