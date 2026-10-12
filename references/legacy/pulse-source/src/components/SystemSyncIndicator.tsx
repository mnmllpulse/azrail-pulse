import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Network, Cpu, AlertCircle, Check } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Tooltip } from './common/Tooltip';

interface MemoryMetrics {
  L1: number;
  L2: number;
  L3: number;
  L4: number;
  L5: number;
}

export default function SystemSyncIndicator({ isLight = false }: { isLight?: boolean }) {
  const [syncState, setSyncState] = useState<'synced' | 'syncing' | 'offline'>('syncing');
  const [metrics, setMetrics] = useState<MemoryMetrics | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const { playHover, playActivation, playSuccess, playError } = useAudio() || {};
  const { language } = useLanguage();

  const checkConnection = async (isManual = false) => {
    setSyncState('syncing');
    if (isManual) {
      setIsRotating(true);
    }
    
    try {
      const response = await fetch('/api/memory/status');
      if (!response.ok) {
        throw new Error('Network response error');
      }
      const data = await response.json();
      if (data.status === 'ok' && data.memory) {
        setMetrics(data.memory);
        setSyncState('synced');
        if (isManual) {
          playSuccess?.();
        }
      } else {
        setSyncState('offline');
        if (isManual) {
          playError?.();
        }
      }
    } catch (error) {
      console.error('Azrail Memory connection failed:', error);
      setSyncState('offline');
      if (isManual) {
        playError?.();
      }
    } finally {
      if (isManual) {
        setTimeout(() => setIsRotating(false), 800);
      }
    }
  };

  useEffect(() => {
    // Initial connection sweep
    checkConnection();

    // Periodically update state (every 15 seconds)
    const interval = setInterval(() => {
      checkConnection();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleManualSync = () => {
    playActivation?.();
    checkConnection(true);
  };

  const getStatusTextEn = () => {
    switch (syncState) {
      case 'synced': return 'SYNCED';
      case 'syncing': return 'SYNCING';
      case 'offline': return 'OFFLINE';
    }
  };

  const getStatusTextRu = () => {
    switch (syncState) {
      case 'synced': return 'АКТИВЕН';
      case 'syncing': return 'СИНХР';
      case 'offline': return 'ОФФЛАЙН';
    }
  };

  const getStatusColor = () => {
    switch (syncState) {
      case 'synced':
        return isLight 
          ? 'text-emerald-600 bg-emerald-50 border-emerald-100' 
          : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'syncing':
        return isLight 
          ? 'text-amber-600 bg-amber-50 border-amber-100' 
          : 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'offline':
        return isLight 
          ? 'text-rose-600 bg-rose-50 border-rose-100' 
          : 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    }
  };

  const buildMetricLineEn = (label: string, count: number) => {
    return `• ${label}: ${count} active node${count === 1 ? '' : 's'}`;
  };

  const buildMetricLineRu = (label: string, count: number) => {
    return `• ${label}: ${count} акт. узел${count % 10 === 1 && count % 100 !== 11 ? '' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? 'а' : 'ов'}`;
  };

  const contentEn = metrics 
    ? `Azrail Core Connection: Active. Synchronized memory layers:\n` +
      `${buildMetricLineEn('L1 Session Buffers', metrics.L1)}\n` +
      `${buildMetricLineEn('L2 Episodic Logs', metrics.L2)}\n` +
      `${buildMetricLineEn('L3 Project Contexts', metrics.L3)}\n` +
      `${buildMetricLineEn('L4 Semantic Shards', metrics.L4)}\n` +
      `${buildMetricLineEn('L5 Experience Matrix', metrics.L5)}\n` +
      `Click to execute a manual database diagnostics sweep.`
    : syncState === 'syncing' 
      ? 'Connecting to the central Azrail Memory Core repository...' 
      : 'Azrail Core Connection: Offline. Neural synchronization failed. Click to re-attempt secure handshake.';

  const contentRu = metrics 
    ? `Подключение к ядру Azrail: Активно. Синхронизированные слои памяти:\n` +
      `${buildMetricLineRu('L1 Буферы сессий', metrics.L1)}\n` +
      `${buildMetricLineRu('L2 Эпизоды диалогов', metrics.L2)}\n` +
      `${buildMetricLineRu('L3 Контексты проектов', metrics.L3)}\n` +
      `${buildMetricLineRu('L4 Семантические осколки', metrics.L4)}\n` +
      `${buildMetricLineRu('L5 Матрица опыта', metrics.L5)}\n` +
      `Нажмите для запуска ручной диагностики базы данных.`
    : syncState === 'syncing' 
      ? 'Подключение к центральному репозиторию памяти Azrail...' 
      : 'Подключение к ядру Azrail: Оффлайн. Синхронизация прервана. Нажмите для повторного рукопожатия.';

  return (
    <Tooltip
      contentEn={contentEn}
      contentRu={contentRu}
      titleEn="Azrail Memory Sync"
      titleRu="Синхронизация Azrail"
      position="bottom"
    >
      <motion.button
        onClick={handleManualSync}
        onMouseEnter={() => playHover?.()}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-mono tracking-wider font-bold transition-all relative overflow-hidden ${getStatusColor()}`}
      >
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={isRotating || syncState === 'syncing' ? { rotate: 360 } : { rotate: 0 }}
            transition={isRotating || syncState === 'syncing' ? { duration: 1.2, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }}
          >
            {syncState === 'offline' ? (
              <AlertCircle className="w-3.5 h-3.5" />
            ) : syncState === 'syncing' ? (
              <RefreshCw className="w-3.5 h-3.5" />
            ) : (
              <Network className="w-3.5 h-3.5" />
            )}
          </motion.div>
          
          {/* Pulsing state indicator dot overlay */}
          <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
            syncState === 'synced' 
              ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)] animate-pulse' 
              : syncState === 'syncing'
                ? 'bg-amber-400'
                : 'bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.7)] animate-pulse'
          }`} />
        </div>

        <span className="opacity-90">{language === 'ru' ? 'АЗРАИЛ: ' : 'SYNC: '}</span>
        <span className="font-extrabold uppercase tracking-widest">
          {language === 'ru' ? getStatusTextRu() : getStatusTextEn()}
        </span>
      </motion.button>
    </Tooltip>
  );
}
