import { useEffect } from 'react';

export function useStudioState<T extends Record<string, any>>(
  type: string,
  state: T,
  onLoadPreset: (config: T) => void
) {
  useEffect(() => {
    const handlePresetLoad = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.type === type) {
        onLoadPreset(customEvent.detail.config);
      }
    };
    window.addEventListener('load-workspace-preset', handlePresetLoad);
    return () => window.removeEventListener('load-workspace-preset', handlePresetLoad);
  }, [type, onLoadPreset]);

  useEffect(() => {
    const handleStateRequest = () => {
      const responseEvent = new CustomEvent('response-workspace-state', {
        detail: {
          type,
          config: state,
        },
      });
      window.dispatchEvent(responseEvent);
    };
    window.addEventListener('request-workspace-state', handleStateRequest);
    return () => window.removeEventListener('request-workspace-state', handleStateRequest);
  }, [type, state]);
}
