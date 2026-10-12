import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Compass, 
  Sparkles, 
  Sun, 
  Moon, 
  Cpu, 
  Home, 
  Globe, 
  Bot, 
  Beaker, 
  Zap, 
  X, 
  Activity,
  Layers
} from 'lucide-react';
import { useSystemState, BgShaderId } from '../contexts/SystemStateContext';
import Tooltip from './Tooltip';
import { useLanguage } from '../contexts/LanguageContext';

interface QuickActionsProps {
  isLight: boolean;
  onToggleTheme: () => void;
  floating?: boolean;
}

export default function QuickActions({ isLight, onToggleTheme, floating = true }: QuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { activeShader, setActiveShader, triggerPulseWave, triggerDiagnostics } = useSystemState();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close the menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const navItems = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: <Home className="w-4 h-4" />,
      path: '/dashboard',
      desc: 'OS Central Hub'
    },
    {
      id: 'swarm-chat',
      name: 'Swarm Chat',
      icon: <Sparkles className="w-4 h-4" />,
      path: '/swarm-chat',
      desc: 'Multi-Agent Matrix'
    },
    {
      id: 'web-studio',
      name: 'Web Studio',
      icon: <Globe className="w-4 h-4" />,
      path: '/studio/web',
      desc: 'UI Prototype Gen'
    },
    {
      id: 'agent-studio',
      name: 'Agent Studio',
      icon: <Bot className="w-4 h-4" />,
      path: '/studio/agent',
      desc: 'Autonomous Builders'
    }
  ];

  const shadersList: { id: BgShaderId; name: string; dotColor: string }[] = [
    { id: 'cosmic-pulse', name: 'Cosmic', dotColor: 'bg-indigo-500' },
    { id: 'quantum-aurora', name: 'Aurora', dotColor: 'bg-emerald-500' },
    { id: 'cyber-pulse', name: 'Cyber', dotColor: 'bg-amber-500' },
    { id: 'monochrome', name: 'Mono', dotColor: 'bg-zinc-500' },
    { id: 'solar-eclipse', name: 'Solar', dotColor: 'bg-yellow-500' }
  ];

  const handlePulseWave = () => {
    triggerPulseWave();
    // Flash dynamic light to confirm
    const originalBodyBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = isLight ? '#E0E7FF' : '#1E1B4B';
    setTimeout(() => {
      document.body.style.backgroundColor = originalBodyBg;
    }, 150);
  };

  return (
    <div ref={containerRef} className={floating ? "fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50" : "relative"}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(8px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`absolute bottom-full mb-4 ${floating ? 'right-0' : 'left-0'} w-[300px] rounded-2xl border p-4 shadow-2xl flex flex-col gap-4 backdrop-blur-2xl z-[60] ${
              isLight 
                ? 'bg-white/95 border-gray-200/80 text-gray-800' 
                : 'bg-[#0B0B0F]/95 border-white/10 text-[#e0e0e0]'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-1.5">
                <Compass className={`w-4 h-4 ${isLight ? 'text-indigo-600' : 'text-indigo-400'} animate-spin-slow`} />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] font-semibold">
                  Quick Actions Orbit
                </span>
              </div>
              <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-md ${
                isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500/10 text-indigo-300'
              }`}>
                OS Matrix v1.0
              </span>
            </div>

            {/* Quick Navigation Bento Grid */}
            <div className="flex flex-col gap-1.5">
              <span className={`text-[8px] font-mono uppercase tracking-widest ${isLight ? 'text-gray-400' : 'text-white/40'}`}>
                System Navigation
              </span>
              <div className="grid grid-cols-2 gap-2">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Tooltip
                      key={item.id}
                      contentEn={item.desc}
                      contentRu={item.desc}
                      position="top"
                      isLight={isLight}
                      className="w-full"
                    >
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          navigate(item.path);
                          setIsOpen(false);
                        }}
                        className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all w-full ${
                          isActive
                            ? isLight
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-900 ring-1 ring-indigo-200'
                              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 ring-1 ring-indigo-500/20'
                            : isLight
                            ? 'bg-gray-50/50 border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                            : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg mb-1.5 ${
                          isActive
                            ? isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-500/20 text-indigo-300'
                            : isLight ? 'bg-gray-100 text-gray-500' : 'bg-white/5 text-gray-400'
                        }`}>
                          {item.icon}
                        </div>
                        <span className="text-[11px] font-semibold tracking-tight leading-none mb-0.5">
                          {item.name}
                        </span>
                        <span className={`text-[8px] font-mono leading-none truncate w-full ${
                          isLight ? 'text-gray-400' : 'text-white/30'
                        }`}>
                          {item.desc}
                        </span>
                      </motion.button>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            {/* System Tuning Toggles */}
            <div className="flex flex-col gap-1.5">
              <span className={`text-[8px] font-mono uppercase tracking-widest ${isLight ? 'text-gray-400' : 'text-white/40'}`}>
                Hardware Tones & Core
              </span>
              <div className="grid grid-cols-2 gap-2">
                {/* Theme Toggle */}
                <Tooltip
                  contentEn={isLight ? "Activate Dark Mode" : "Activate Light Mode"}
                  contentRu={isLight ? "Активировать темную тему" : "Активировать светлую тему"}
                  position="top"
                  isLight={isLight}
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onToggleTheme}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                      isLight 
                        ? 'bg-amber-50/50 border-amber-200/50 hover:bg-amber-50 text-amber-900' 
                        : 'bg-blue-950/20 border-blue-900/30 hover:bg-blue-950/40 text-blue-300'
                    }`}
                  >
                    <div className={`p-1 rounded-lg ${isLight ? 'bg-amber-100 text-amber-700' : 'bg-blue-900/30 text-blue-300'}`}>
                      {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-[10px] font-semibold tracking-tight">Theme Mode</span>
                      <span className="text-[8px] font-mono opacity-60">
                        {isLight ? 'SWITCH DARK' : 'SWITCH LIGHT'}
                      </span>
                    </div>
                  </motion.button>
                </Tooltip>

                {/* Pulse Diagnostics */}
                <Tooltip
                  contentEn="Test system integrity with a neural pulse wave"
                  contentRu="Проверка целостности системы нейронным импульсом"
                  position="top"
                  isLight={isLight}
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePulseWave}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                      isLight 
                        ? 'bg-rose-50/50 border-rose-200/50 hover:bg-rose-50 text-rose-900' 
                        : 'bg-rose-950/20 border-rose-900/30 hover:bg-rose-950/40 text-rose-300'
                    }`}
                  >
                    <div className={`p-1 rounded-lg ${isLight ? 'bg-rose-100 text-rose-700' : 'bg-rose-900/30 text-rose-300'} animate-pulse`}>
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-[10px] font-semibold tracking-tight">Wave Pulse</span>
                      <span className="text-[8px] font-mono opacity-60">TEST INTEGRITY</span>
                    </div>
                  </motion.button>
                </Tooltip>
              </div>
            </div>

            {/* Quick Shader Switcher */}
            <div className="flex flex-col gap-1.5 border-t pt-2 border-white/5">
              <span className={`text-[8px] font-mono uppercase tracking-widest ${isLight ? 'text-gray-400' : 'text-white/40'}`}>
                Ambient Background Atmosphere
              </span>
              <div className="flex items-center justify-between gap-1">
                {shadersList.map((shader) => {
                  const isActive = activeShader === shader.id;
                  return (
                    <motion.button
                      key={shader.id}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setActiveShader(shader.id)}
                      className={`flex flex-col items-center gap-1 flex-1 py-1.5 px-1 rounded-lg transition-all border ${
                        isActive
                          ? isLight
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold'
                            : 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 font-semibold'
                          : isLight
                          ? 'bg-transparent border-transparent hover:bg-gray-50 text-gray-500 hover:text-gray-800'
                          : 'bg-transparent border-transparent hover:bg-white/5 text-white/40 hover:text-white/80'
                      }`}
                      title={shader.name}
                    >
                      <span className={`w-2 h-2 rounded-full ${shader.dotColor} ${
                        isActive ? 'ring-2 ring-indigo-500/50 scale-110' : 'opacity-60'
                      }`} />
                      <span className="text-[8px] font-mono font-medium tracking-tight">
                        {shader.name}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Trigger Floating Action Button */}
      <Tooltip 
        contentEn="System Quick Access Orbit" 
        contentRu="Орбита быстрого доступа к системе"
        position="left"
        shortcut="Alt + Q"
        isLight={isLight}
      >
        <motion.button
          whileHover={{ scale: 1.05, rotate: isOpen ? -90 : 15 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl border transition-colors relative group overflow-hidden outline-none ${
            isOpen
              ? 'bg-rose-500 border-rose-400 text-white'
              : isLight
              ? 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700'
              : 'bg-white border-white text-black hover:bg-gray-100 shadow-[0_0_20px_rgba(255,255,255,0.25)]'
          }`}
          style={{ cursor: 'pointer' }}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="w-5 h-5" />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-center relative"
              >
                <Zap className="w-5 h-5" />
                {/* Pulse waves emanating behind trigger when closed */}
                <span className={`absolute inset-0 rounded-2xl scale-150 animate-ping opacity-15 ${
                  isLight ? 'bg-indigo-400' : 'bg-white'
                }`} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </Tooltip>
    </div>
  );
}
