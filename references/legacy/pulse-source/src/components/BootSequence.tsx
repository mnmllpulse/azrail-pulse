import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Cpu, Shield, Database, Wifi, Sliders, Server, Brain, Activity, Play } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAudio } from '../contexts/AudioContext';

interface BootSequenceProps {
  onComplete: () => void;
}

interface BootLine {
  text: string;
  type: 'info' | 'success' | 'warn' | 'header' | 'metric';
  delay: number;
}

export function BootSequence({ onComplete }: BootSequenceProps) {
  const { language } = useLanguage();
  const { initAudio } = useAudio();
  const [lines, setLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [bootStage, setBootStage] = useState<'terminal' | 'logo' | 'complete'>('terminal');
  const [isAudioPromptSeen, setIsAudioPromptSeen] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Synth sound utilities (Local Web Audio to guarantee zero file dependencies)
  const playClick = () => {
    try {
      const ctx = audioCtxRef.current || (window.AudioContext ? new AudioContext() : null);
      if (!ctx || ctx.state === 'suspended') return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600 + Math.random() * 400, ctx.currentTime);
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      // ignore audio context failures
    }
  };

  const playSuccessChime = () => {
    try {
      const ctx = audioCtxRef.current || (window.AudioContext ? new AudioContext() : null);
      if (!ctx || ctx.state === 'suspended') return;
      const now = ctx.currentTime;
      
      const playNote = (freq: number, delay: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.0, now + delay);
        gain.gain.linearRampToValueAtTime(0.04, now + delay + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + duration);
      };

      playNote(523.25, 0, 0.4); // C5
      playNote(659.25, 0.1, 0.4); // E5
      playNote(783.99, 0.2, 0.5); // G5
      playNote(1046.50, 0.35, 0.6); // C6
    } catch (e) {
      // ignore audio failures
    }
  };

  const bootLogs: BootLine[] = [
    { text: '==================================================', type: 'header', delay: 100 },
    { text: '         DARK MNMLL PULSE OS - COGNITIVE CORE      ', type: 'header', delay: 100 },
    { text: '                 VERSION v3.4.1-ALPHA             ', type: 'header', delay: 150 },
    { text: '==================================================', type: 'header', delay: 100 },
    { text: 'System boot diagnostics triggered...', type: 'info', delay: 200 },
    { text: 'CPU: Core Synapse Engine online (16x logical processors)', type: 'metric', delay: 150 },
    { text: 'RAM: 64.00 GB Memory cache allocation: SECURE', type: 'metric', delay: 150 },
    { text: 'Network handshake establishing on port 3000...', type: 'info', delay: 250 },
    { text: 'Localhost ingress proxy tunnel: ACTIVE', type: 'success', delay: 100 },
    { text: 'Mounting L1 Volatile Memory Core registers...', type: 'info', delay: 180 },
    { text: 'L1 Cache: [ OK ] Pruned 0 unmapped nodes', type: 'success', delay: 100 },
    { text: 'Mounting L2 Episodic Memory Core DB...', type: 'info', delay: 200 },
    { text: 'L2 Cache: [ OK ] Database state persistent', type: 'success', delay: 100 },
    { text: 'Mounting L3 Semantic Vector Search tree...', type: 'info', delay: 220 },
    { text: 'L3 Cache: [ OK ] KNN node grids aligned', type: 'success', delay: 100 },
    { text: 'Retrieving secure key vaults...', type: 'info', delay: 200 },
    { text: 'ENV check: GEMINI_API_KEY detected server-side', type: 'success', delay: 150 },
    { text: 'Warning: Warmth threshold registered at 38.6°C', type: 'warn', delay: 150 },
    { text: 'Dynamic cooling pipeline: ACTIVE', type: 'success', delay: 100 },
    { text: 'Injecting autonomous Metatron Core orchestrator...', type: 'info', delay: 300 },
    { text: 'Metatron daemon listening on port 3001', type: 'success', delay: 120 },
    { text: 'Injecting sovereign neural overlord AZRAIL...', type: 'info', delay: 350 },
    { text: 'Azrail Core: ACTIVE - Proxy verified under 14ms', type: 'success', delay: 150 },
    { text: 'Reading database configurations from uploads/feedback.json...', type: 'info', delay: 200 },
    { text: 'Local persistence registers connected successfully.', type: 'success', delay: 100 },
    { text: 'Boot synchronization cycle complete. All subsystems green.', type: 'success', delay: 400 },
    { text: '========================= SYSTEM SECURE =========================', type: 'header', delay: 300 }
  ];

  // Try to create AudioContext after user interact or auto
  useEffect(() => {
    try {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('AudioContext not supported');
    }
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // Log streaming loop
  useEffect(() => {
    if (currentLineIndex < bootLogs.length) {
      const line = bootLogs[currentLineIndex];
      const timer = setTimeout(() => {
        setLines(prev => [...prev, line.text]);
        playClick();
        setCurrentLineIndex(prev => prev + 1);
        
        // Dynamically advance progress bar
        setProgress(Math.floor((currentLineIndex / bootLogs.length) * 100));
      }, line.delay);
      return () => clearTimeout(timer);
    } else {
      // Stream is done, transition to central logo splash
      setProgress(100);
      playSuccessChime();
      const logoTimer = setTimeout(() => {
        setBootStage('logo');
      }, 600);
      
      const completeTimer = setTimeout(() => {
        handleFinish();
      }, 3200);

      return () => {
        clearTimeout(logoTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [currentLineIndex]);

  // Support ESC shortcut to bypass
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFinish = () => {
    // Attempt to trigger global audio context
    try {
      initAudio();
    } catch (e) {}
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020106] flex flex-col justify-between p-6 select-none font-mono text-xs overflow-hidden relative">
      
      {/* Immersive CRT Grid and Scanlines */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%),
            linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))
          `,
          backgroundSize: '100% 4px, 6px 100%'
        }}
      />

      <div className="absolute inset-0 pointer-events-none crt-overlay opacity-60" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_30%,#000_160%)]" />

      {/* Header telemetry */}
      <div className="flex justify-between items-center text-[10px] text-zinc-500 border-b border-white/5 pb-3 relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
            SECURE BOOT CORE
          </span>
          <span>SYSTEM_ROM: v3.4.1</span>
        </div>
        <div className="flex gap-4">
          <span>MEM: 65,536 MB</span>
          <button 
            onClick={handleFinish}
            className="text-indigo-400 hover:text-indigo-300 transition-colors uppercase border border-indigo-500/20 px-2 py-0.5 rounded bg-indigo-950/20"
          >
            Bypass [ESC]
          </button>
        </div>
      </div>

      {/* Main interactive terminal or Logo view */}
      <div className="flex-1 flex flex-col justify-center my-6 relative z-10 overflow-hidden">
        <AnimatePresence mode="wait">
          
          {bootStage === 'terminal' && (
            <motion.div
              key="terminal-stage"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-4xl mx-auto flex flex-col h-[65vh] p-4 bg-black/40 border border-white/5 rounded-xl justify-end relative"
            >
              <div className="overflow-y-auto space-y-1.5 pr-2 custom-scrollbar max-h-full">
                {lines.map((line, idx) => {
                  const logSpec = bootLogs[idx];
                  let colorClass = 'text-zinc-400';
                  
                  if (logSpec) {
                    if (logSpec.type === 'header') colorClass = 'text-indigo-400 font-bold';
                    else if (logSpec.type === 'success') colorClass = 'text-emerald-400 font-bold';
                    else if (logSpec.type === 'warn') colorClass = 'text-amber-500 font-bold';
                    else if (logSpec.type === 'metric') colorClass = 'text-cyan-400';
                  }

                  return (
                    <div key={idx} className={`text-[11px] leading-relaxed break-words font-mono ${colorClass}`}>
                      {line.startsWith('[ OK ]') ? (
                        <span>
                          <span className="text-emerald-500 font-bold">[ OK ]</span>
                          {line.substring(6)}
                        </span>
                      ) : line.startsWith('Warning:') ? (
                        <span>
                          <span className="text-amber-500 font-bold">[ WARN ]</span>
                          {line.substring(8)}
                        </span>
                      ) : (
                        line
                      )}
                    </div>
                  );
                })}
                <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-1 align-middle" />
              </div>
            </motion.div>
          )}

          {bootStage === 'logo' && (
            <motion.div
              key="logo-stage"
              initial={{ opacity: 0, scale: 0.85, filter: 'blur(15px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.1, filter: 'blur(30px)' }}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              className="flex flex-col items-center justify-center text-center space-y-6"
            >
              {/* Central glowing system eye */}
              <div className="relative">
                <motion.div
                  animate={{ 
                    scale: [1, 1.06, 1],
                    filter: ['drop-shadow(0 0 15px rgba(99,102,241,0.4))', 'drop-shadow(0 0 45px rgba(99,102,241,0.8))', 'drop-shadow(0 0 15px rgba(99,102,241,0.4))']
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-32 h-32 rounded-full border border-indigo-500/30 flex items-center justify-center bg-indigo-950/10 relative"
                >
                  <Brain className="w-14 h-14 text-indigo-400" />
                  <Activity className="w-6 h-6 text-cyan-400 absolute bottom-4 right-4 animate-pulse" />
                </motion.div>

                {/* Rotating technological rings */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-[-15px] rounded-full border border-dashed border-indigo-400/40"
                />
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-[-30px] rounded-full border border-dotted border-cyan-500/20"
                />
              </div>

              <div className="space-y-2">
                <h2 
                  className="text-2xl md:text-3xl font-extrabold text-white tracking-[0.2em] font-sans chromatic-aberration"
                  style={{ textShadow: '0 0 30px rgba(99,102,241,0.8)' }}
                >
                  DARK MNMLL PULSE OS
                </h2>
                <p className="text-[10px] text-cyan-400 uppercase tracking-[0.3em] font-mono">
                  {language === 'ru' ? 'СИСТЕМА ИНИЦИАЛИЗИРОВАНА' : 'SYSTEM INITIALIZATION SECURE'}
                </p>
              </div>

              {/* Secure badge block */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px]">
                <Shield className="w-3.5 h-3.5" />
                <span className="font-bold uppercase tracking-wider">
                  {language === 'ru' ? '100% БЕЗОПАСНАЯ КОГНИТИВНАЯ СРЕДА' : '100% SECURE COGNITIVE SHIELD'}
                </span>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Progress metrics and dynamic bars */}
      <div className="w-full max-w-4xl mx-auto space-y-4 relative z-10 shrink-0">
        <div className="flex justify-between items-center text-[10px] text-zinc-500">
          <span className="uppercase tracking-widest flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            {bootStage === 'logo' 
              ? (language === 'ru' ? 'Авторизация доступа в систему...' : 'Authorizing access payload...')
              : (language === 'ru' ? 'Загрузка синаптических карт...' : 'Mounting synaptic map arrays...')}
          </span>
          <span className="font-bold text-zinc-300">{progress}% COMPLETE</span>
        </div>

        {/* Dynamic sleek progress track */}
        <div className="w-full h-2 bg-white/5 border border-white/10 rounded-full overflow-hidden relative">
          <motion.div 
            className="h-full bg-gradient-to-r from-indigo-600 via-cyan-500 to-indigo-500"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center text-[9px] text-zinc-600 pt-1 border-t border-white/5">
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <Server className="w-3 h-3 text-indigo-400" /> HOST: PORT 3000
            </span>
            <span className="flex items-center gap-1">
              <Wifi className="w-3 h-3 text-emerald-500" /> WAN: CONNECTED
            </span>
          </div>
          <span className="mt-1 sm:mt-0">PRESS ESC TO ESCAPE BOOT CYCLE</span>
        </div>
      </div>

    </div>
  );
}
