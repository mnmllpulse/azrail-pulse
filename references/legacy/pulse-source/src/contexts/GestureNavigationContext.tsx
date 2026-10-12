import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSystemState } from './SystemStateContext';
import { useLanguage } from './LanguageContext';

export interface GestureNavItem {
  id: string;
  path: string;
  labelEn: string;
  labelRu: string;
  category: 'core' | 'studio';
}

export const GESTURE_NAV_ITEMS: GestureNavItem[] = [
  // Core Command Modules
  { id: 'dashboard', path: '/dashboard', labelEn: 'Command Center', labelRu: 'Командный Центр', category: 'core' },
  { id: 'swarm', path: '/swarm-chat', labelEn: 'Swarm Commander', labelRu: 'Роевой Командир', category: 'core' },
  { id: 'quantum', path: '/quantum', labelEn: 'Quantum Mind', labelRu: 'Квантовый Разум', category: 'core' },
  { id: 'dna', path: '/dna', labelEn: 'DNA Sequencer', labelRu: 'ДНК-Секвенатор', category: 'core' },
  { id: 'reality', path: '/reality', labelEn: 'Reality Engine', labelRu: 'Движок Реальности', category: 'core' },
  
  // Studios
  { id: 'web', path: '/studio/web', labelEn: 'Web Studio', labelRu: 'Веб-Студия', category: 'studio' },
  { id: 'code', path: '/studio/code', labelEn: 'Code Studio', labelRu: 'Студия Кода', category: 'studio' },
  { id: 'music', path: '/studio/music', labelEn: 'Music Studio', labelRu: 'Музыкальная Студия', category: 'studio' },
  { id: 'video', path: '/studio/video', labelEn: 'Video Studio', labelRu: 'Видео-Студия', category: 'studio' },
  { id: 'sandbox', path: '/studio/sandbox', labelEn: 'Full-Stack Sandbox', labelRu: 'Full-Stack Песочница', category: 'studio' },
  { id: 'agent', path: '/studio/agent', labelEn: 'Agent Forge', labelRu: 'Студия Агентов', category: 'studio' },
  { id: 'image', path: '/studio/image', labelEn: 'Neural Image', labelRu: 'Студия Изображений', category: 'studio' },
  { id: 'lab', path: '/studio/lab', labelEn: 'Pulse Lab', labelRu: 'Лаборатория Pulse', category: 'studio' },
  { id: 'knowledge', path: '/studio/knowledge', labelEn: 'Knowledge Hub', labelRu: 'База Знаний', category: 'studio' },
  { id: 'data', path: '/studio/data', labelEn: 'Data Studio', labelRu: 'Data Studio', category: 'studio' },
  { id: 'model', path: '/studio/model', labelEn: 'Model Studio', labelRu: 'Model Studio', category: 'studio' },
  { id: 'automation', path: '/studio/automation', labelEn: 'Automation Studio', labelRu: 'Automation Studio', category: 'studio' },
  { id: 'analytics', path: '/studio/analytics', labelEn: 'Analytics Studio', labelRu: 'Analytics Studio', category: 'studio' },
  { id: 'deploy', path: '/studio/deploy', labelEn: 'Deploy Studio', labelRu: 'Deploy Studio', category: 'studio' },
  { id: 'security', path: '/studio/security', labelEn: 'Security Center', labelRu: 'Security Center', category: 'studio' },
  { id: 'marketplace', path: '/studio/marketplace', labelEn: 'Marketplace', labelRu: 'Маркетплейс', category: 'studio' },
  
  // Auxiliary
  { id: 'infrastructure', path: '/infrastructure', labelEn: 'Infrastructure Hub', labelRu: 'Инфраструктурный Хаб', category: 'core' },
  { id: 'gallery', path: '/gallery', labelEn: 'Archive Hub', labelRu: 'Архивный Хаб', category: 'core' },
  { id: 'book', path: '/book', labelEn: 'System Manifesto', labelRu: 'Манифест Системы', category: 'core' },
];

interface GestureNavigationContextType {
  navItems: GestureNavItem[];
  currentIndex: number;
  currentNav: GestureNavItem | undefined;
  prevNav: GestureNavItem | undefined;
  nextNav: GestureNavItem | undefined;
  slideDirection: number; // 1 for right (forward), -1 for left (backward)
  dragOffset: number; // Live horizontal offset during swipe (-100 to 100)
  isSwiping: boolean;
  gestureFeedback: {
    active: boolean;
    targetName: string;
    direction: 'left' | 'right' | null;
    progress: number; // 0 to 1
  };
  navigateToIndex: (index: number) => void;
  navigateNext: () => void;
  navigatePrev: () => void;
  isGestureEnabled: boolean;
  setIsGestureEnabled: (enabled: boolean) => void;
}

const GestureNavigationContext = createContext<GestureNavigationContextType | null>(null);

export const useGestureNavigation = () => {
  const context = useContext(GestureNavigationContext);
  if (!context) {
    throw new Error('useGestureNavigation must be used within a GestureNavigationProvider');
  }
  return context;
};

export const GestureNavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { uiPreferences, triggerPulseWave } = useSystemState();
  const { language } = useLanguage();

  const [isGestureEnabled, setIsGestureEnabled] = useState(true);
  const [slideDirection, setSlideDirection] = useState<number>(1);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const [gestureFeedback, setGestureFeedback] = useState<{
    active: boolean;
    targetName: string;
    direction: 'left' | 'right' | null;
    progress: number;
  }>({
    active: false,
    targetName: '',
    direction: null,
    progress: 0,
  });

  // Filter items if simplicityMode is active
  const activeNavItems = React.useMemo(() => {
    if (uiPreferences?.simplicityMode) {
      return GESTURE_NAV_ITEMS.filter(item => 
        ['dashboard', 'swarm', 'web', 'code', 'music', 'image'].includes(item.id)
      );
    }
    return GESTURE_NAV_ITEMS;
  }, [uiPreferences?.simplicityMode]);

  // Find current index based on location.pathname
  const currentIndex = React.useMemo(() => {
    const idx = activeNavItems.findIndex(item => item.path === location.pathname);
    return idx !== -1 ? idx : 0;
  }, [activeNavItems, location.pathname]);

  const currentNav = activeNavItems[currentIndex];
  const prevNav = activeNavItems[(currentIndex - 1 + activeNavItems.length) % activeNavItems.length];
  const nextNav = activeNavItems[(currentIndex + 1) % activeNavItems.length];

  const navigateToIndex = useCallback((targetIndex: number) => {
    if (targetIndex === currentIndex) return;
    const newDirection = targetIndex > currentIndex ? 1 : -1;
    setSlideDirection(newDirection);
    triggerPulseWave();
    navigate(activeNavItems[targetIndex].path);
  }, [currentIndex, activeNavItems, navigate, triggerPulseWave]);

  const navigateNext = useCallback(() => {
    const nextIdx = (currentIndex + 1) % activeNavItems.length;
    setSlideDirection(1);
    triggerPulseWave();
    navigate(activeNavItems[nextIdx].path);
  }, [currentIndex, activeNavItems, navigate, triggerPulseWave]);

  const navigatePrev = useCallback(() => {
    const prevIdx = (currentIndex - 1 + activeNavItems.length) % activeNavItems.length;
    setSlideDirection(-1);
    triggerPulseWave();
    navigate(activeNavItems[prevIdx].path);
  }, [currentIndex, activeNavItems, navigate, triggerPulseWave]);

  // Swipe handling logic
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchLockedRef = useRef<boolean>(false);

  // Global touch handlers for swipe
  useEffect(() => {
    if (!isGestureEnabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Ignore if user touches input, button, scrollable inner canvas or modal
      const target = e.target as HTMLElement;
      if (
        target.closest('input, textarea, select, button, .no-swipe, [data-no-swipe="true"]') ||
        target.isContentEditable
      ) {
        touchStartRef.current = null;
        return;
      }

      if (e.touches.length === 1) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          time: Date.now(),
        };
        touchLockedRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current || touchLockedRef.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      // If vertical scroll is dominating, disable swipe gesture for this touch
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 15) {
        touchLockedRef.current = true;
        setIsSwiping(false);
        setDragOffset(0);
        setGestureFeedback(prev => ({ ...prev, active: false }));
        return;
      }

      // If horizontal movement is significant
      if (Math.abs(deltaX) > 15) {
        setIsSwiping(true);
        setDragOffset(deltaX);

        const progress = Math.min(Math.abs(deltaX) / 120, 1);
        const direction = deltaX < 0 ? 'right' : 'left'; // swiping left moves to next (right item)
        const targetNav = deltaX < 0 ? nextNav : prevNav;
        const targetLabel = language === 'ru' ? targetNav?.labelRu : targetNav?.labelEn;

        setGestureFeedback({
          active: true,
          targetName: targetLabel || '',
          direction,
          progress,
        });
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || touchLockedRef.current) {
        touchStartRef.current = null;
        setIsSwiping(false);
        setDragOffset(0);
        setGestureFeedback(prev => ({ ...prev, active: false }));
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaTime = Date.now() - touchStartRef.current.time;

      const threshold = 60; // px needed to trigger swipe
      const velocityThreshold = 0.35; // px/ms for quick flick

      const velocity = Math.abs(deltaX) / Math.max(deltaTime, 1);

      if (Math.abs(deltaX) > threshold || velocity > velocityThreshold) {
        if (deltaX < 0) {
          // Swipe left -> Next module
          navigateNext();
        } else {
          // Swipe right -> Prev module
          navigatePrev();
        }
      }

      // Reset
      touchStartRef.current = null;
      setIsSwiping(false);
      setDragOffset(0);
      setGestureFeedback({ active: false, targetName: '', direction: null, progress: 0 });
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isGestureEnabled, language, nextNav, prevNav, navigateNext, navigatePrev]);

  // Keyboard Alt+Left / Alt+Right navigation shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        navigateNext();
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        navigatePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateNext, navigatePrev]);

  return (
    <GestureNavigationContext.Provider
      value={{
        navItems: activeNavItems,
        currentIndex,
        currentNav,
        prevNav,
        nextNav,
        slideDirection,
        dragOffset,
        isSwiping,
        gestureFeedback,
        navigateToIndex,
        navigateNext,
        navigatePrev,
        isGestureEnabled,
        setIsGestureEnabled,
      }}
    >
      {children}
    </GestureNavigationContext.Provider>
  );
};
