import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSystemState } from '../contexts/SystemStateContext';
import { useAudio } from '../contexts/AudioContext';
import { useDeepWork } from '../contexts/DeepWorkContext';

import planetTexture from '../assets/images/dark_purple_planet_1784739121226.jpg';

interface AnimatedPlanetProps {
  size?: number; // Size in px
  className?: string;
  showRings?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  glowIntensity?: number; // 0 to 1 override, or dynamically synced to system
}

interface Particle {
  id: number;
  radius: number;
  angle: number;
  speed: number;
  size: number;
  color: string;
}

interface NebulaCloud {
  id: number;
  size: number;
  color: string;
  orbitRadius: number;
  speed: number;
  blur: number;
  opacity: number;
}

export const AnimatedPlanet: React.FC<AnimatedPlanetProps> = ({
  size = 320,
  className = '',
  showRings = true,
  interactive = true,
  onClick,
  glowIntensity,
}) => {
  const { systemActivity, logicCoreLoad, triggerPulseWave, preloadedStudios } = useSystemState();
  const { playActivation, isListening, analyser } = useAudio();
  const { isDeepWork } = useDeepWork();

  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [isVibrating, setIsVibrating] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [focusRingTrigger, setFocusRingTrigger] = useState(0);
  const [voiceAudioLevel, setVoiceAudioLevel] = useState(0);
  const prevPreloadSize = useRef(preloadedStudios ? preloadedStudios.size : 0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic rotation speed based on CPU / system load (idle = 90s, high load = 15s)
  const currentLoad = Math.max(systemActivity || 0, logicCoreLoad || 0, 20);
  const rotationDuration = Math.max(15, Math.min(100, 100 - (currentLoad / 100) * 80));

  // Trigger expanding focus ring animation when predictive preload updates
  useEffect(() => {
    if (preloadedStudios && preloadedStudios.size !== prevPreloadSize.current) {
      prevPreloadSize.current = preloadedStudios.size;
      setFocusRingTrigger((prev) => prev + 1);
    }
  }, [preloadedStudios]);

  // Voice Peak Audio Meter loop when microphone listening is active
  useEffect(() => {
    if (!isListening || !analyser) {
      setVoiceAudioLevel(0);
      return;
    }

    let animationFrameId: number;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      setVoiceAudioLevel(avg / 255); // 0 to 1
      animationFrameId = requestAnimationFrame(updateLevel);
    };

    updateLevel();

    return () => cancelAnimationFrame(animationFrameId);
  }, [isListening, analyser]);

  // Calculate dynamic glow opacity
  const computedGlow = glowIntensity ?? Math.min(1, 0.4 + currentLoad / 100);

  // Orbiting Glowing Small Particles
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: 14 }).map((_, i) => ({
      id: i,
      radius: size * (0.65 + (i % 4) * 0.22),
      angle: (i * 360) / 14,
      speed: (0.3 + (i % 3) * 0.4) * (i % 2 === 0 ? 1 : -1),
      size: 2 + (i % 3),
      color: i % 3 === 0 ? '#38bdf8' : i % 2 === 0 ? '#c084fc' : '#a855f7',
    }))
  );

  // Pulse OS Floating Nebulae System
  const [nebulae] = useState<NebulaCloud[]>(() => [
    { id: 1, size: size * 0.7, color: 'rgba(168, 85, 247, 0.35)', orbitRadius: size * 0.45, speed: 45, blur: 40, opacity: 0.6 },
    { id: 2, size: size * 0.85, color: 'rgba(56, 189, 248, 0.3)', orbitRadius: size * 0.6, speed: -60, blur: 50, opacity: 0.5 },
    { id: 3, size: size * 0.6, color: 'rgba(236, 72, 153, 0.25)', orbitRadius: size * 0.5, speed: 35, blur: 35, opacity: 0.45 },
    { id: 4, size: size * 0.75, color: 'rgba(139, 92, 246, 0.35)', orbitRadius: size * 0.7, speed: -50, blur: 45, opacity: 0.55 },
    { id: 5, size: size * 0.5, color: 'rgba(6, 182, 212, 0.3)', orbitRadius: size * 0.55, speed: 40, blur: 30, opacity: 0.5 },
  ]);

  // Mouse move parallax handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = (e.clientX - centerX) / (rect.width / 2);
    const mouseY = (e.clientY - centerY) / (rect.height / 2);
    setMouseOffset({ x: mouseX * 12, y: mouseY * 12 });
  };

  const handleMouseLeave = () => {
    setMouseOffset({ x: 0, y: 0 });
  };

  const handlePlanetClick = () => {
    setIsVibrating(true);
    setTimeout(() => setIsVibrating(false), 400);

    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2400);

    // Trigger Focus Ring
    setFocusRingTrigger((prev) => prev + 1);

    try {
      playActivation();
      triggerPulseWave();
    } catch (e) {}

    if (onClick) onClick();
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: `${size * 1.8}px`, height: `${size * 1.8}px` }}
    >
      {/* Deep Space Atmosphere Background */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none transition-opacity duration-700 blur-3xl"
        style={{
          background: `radial-gradient(circle at center, rgba(147, 51, 234, ${0.35 * computedGlow}) 0%, rgba(88, 28, 135, ${0.2 * computedGlow}) 40%, rgba(9, 5, 20, 0) 75%)`,
        }}
      />

      {/* Floating Nebulae Particle Clouds */}
      {nebulae.map((neb) => (
        <motion.div
          key={neb.id}
          animate={{ rotate: neb.speed > 0 ? 360 : -360 }}
          transition={{ duration: Math.abs(neb.speed), repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
        >
          <div
            className="absolute rounded-full mix-blend-screen pointer-events-none"
            style={{
              width: `${neb.size}px`,
              height: `${neb.size}px`,
              backgroundColor: neb.color,
              filter: `blur(${neb.blur}px)`,
              opacity: neb.opacity * (isDeepWork ? 1.2 : 1),
              transform: `translate(${neb.orbitRadius}px, 0px)`,
            }}
          />
        </motion.div>
      ))}

      {/* Parallax Container */}
      <motion.div
        animate={{
          x: mouseOffset.x,
          y: mouseOffset.y,
        }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        className="relative flex items-center justify-center"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {/* Predictive Preload Expanding Focus Ring Animation */}
        <AnimatePresence>
          {focusRingTrigger > 0 && (
            <motion.div
              key={focusRingTrigger}
              initial={{ scale: 0.9, opacity: 0.9 }}
              animate={{ scale: 2.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full border-2 border-cyan-400 shadow-[0_0_30px_rgba(56,189,248,0.8)] pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Real-time Voice Peak Visualizer Ring */}
        {(isListening || voiceAudioLevel > 0) && (
          <div
            className="absolute inset-0 rounded-full border border-cyan-300/80 transition-all duration-75 pointer-events-none flex items-center justify-center"
            style={{
              transform: `scale(${1.15 + voiceAudioLevel * 0.45})`,
              boxShadow: `0 0 ${20 + voiceAudioLevel * 40}px rgba(56, 189, 248, ${0.4 + voiceAudioLevel * 0.6})`,
            }}
          >
            <div className="absolute -top-3 px-2 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-400/80 text-[9px] font-mono text-cyan-300 uppercase tracking-widest animate-pulse">
              VOICE ACTIVE
            </div>
          </div>
        )}

        {/* Dynamic Glow Halo */}
        <div
          className="absolute inset-0 rounded-full blur-2xl transition-all duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(circle, rgba(168,85,247,${0.6 * computedGlow}) 0%, rgba(56,189,248,${0.3 * computedGlow}) 50%, transparent 80%)`,
            transform: `scale(${1.25 + computedGlow * 0.15})`,
          }}
        />

        {/* Orbiting Small Particles */}
        {particles.map((p) => (
          <motion.div
            key={p.id}
            animate={{ rotate: p.speed > 0 ? 360 : -360 }}
            transition={{ duration: 25 / Math.abs(p.speed), repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
          >
            <div
              className="absolute rounded-full shadow-lg"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                boxShadow: `0 0 10px ${p.color}, 0 0 20px ${p.color}`,
                transform: `translate(${p.radius}px, 0px)`,
              }}
            />
          </motion.div>
        ))}

        {/* Orbit Rings (Saturn Style Purple Beams) */}
        {showRings && (
          <div
            className="absolute z-10 pointer-events-none"
            style={{
              width: `${size * 1.6}px`,
              height: `${size * 0.5}px`,
              transform: 'rotate(-22deg)',
            }}
          >
            <div className="absolute inset-0 rounded-[50%] border-2 border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.6)] animate-[spin_30s_linear_infinite]" />
            <div
              className="absolute inset-2 rounded-[50%] border border-cyan-400/60 shadow-[0_0_15px_rgba(56,189,248,0.8)]"
              style={{
                background:
                  'radial-gradient(ellipse at center, transparent 60%, rgba(168,85,247,0.2) 80%, rgba(56,189,248,0.4) 100%)',
              }}
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-[50%]"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-cyan-300 rounded-full shadow-[0_0_12px_#38bdf8]" />
            </motion.div>
          </div>
        )}

        {/* Main Planet Sphere with Surface Shift Context and Load-controlled rotation speed */}
        <motion.div
          onClick={interactive ? handlePlanetClick : undefined}
          animate={
            isVibrating
              ? { x: [-3, 3, -2, 2, 0], y: [2, -2, 1, -1, 0], scale: [1, 1.04, 0.98, 1] }
              : { scale: [1, 1.02, 1] }
          }
          transition={
            isVibrating
              ? { duration: 0.35, ease: 'easeInOut' }
              : { duration: 4, repeat: Infinity, ease: 'easeInOut' }
          }
          className={`relative z-20 rounded-full overflow-hidden shadow-[inset_-25px_-25px_50px_rgba(0,0,0,0.92),_0_0_50px_rgba(168,85,247,0.5)] border border-purple-500/40 transition-all duration-700 ${
            interactive ? 'cursor-pointer group hover:border-cyan-400/70' : ''
          }`}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            filter: isDeepWork ? 'hue-rotate(15deg) contrast(1.15) brightness(0.95)' : 'none',
          }}
        >
          {/* Detailed Image Texture Layer with System Load Controlled Rotation Speed */}
          <div
            className="absolute inset-0 bg-cover bg-center mix-blend-screen opacity-85 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              backgroundImage: `url(${planetTexture})`,
              backgroundSize: '160% 160%',
              animation: `spin ${rotationDuration}s linear infinite`,
            }}
          />

          {/* Procedural Grid Overlay */}
          <div
            className="absolute inset-0 opacity-40 mix-blend-overlay"
            style={{
              backgroundImage: `
                repeating-linear-gradient(0deg, rgba(168,85,247,0.2) 0px, rgba(168,85,247,0.2) 1px, transparent 1px, transparent 20px),
                repeating-linear-gradient(90deg, rgba(168,85,247,0.2) 0px, rgba(168,85,247,0.2) 1px, transparent 1px, transparent 20px)
              `,
              animation: `spin ${rotationDuration * 1.3}s linear infinite`,
            }}
          />

          {/* Vector Geography Wireframe */}
          <svg
            className="absolute inset-0 w-full h-full opacity-45 mix-blend-screen"
            style={{ animation: `spin ${rotationDuration * 0.9}s linear infinite` }}
            viewBox="0 0 100 100"
          >
            <circle cx="50" cy="50" r="48" fill="none" stroke="#a855f7" strokeWidth="0.5" strokeDasharray="2,2" />
            <ellipse cx="50" cy="50" rx="48" ry="24" fill="none" stroke="#38bdf8" strokeWidth="0.5" />
            <ellipse cx="50" cy="50" rx="48" ry="12" fill="none" stroke="#a855f7" strokeWidth="0.3" />
            <ellipse cx="50" cy="50" rx="24" ry="48" fill="none" stroke="#a855f7" strokeWidth="0.5" />
            <line x1="50" y1="2" x2="50" y2="98" stroke="#38bdf8" strokeWidth="0.6" strokeDasharray="1,1" />
            <line x1="2" y1="50" x2="98" y2="50" stroke="#38bdf8" strokeWidth="0.6" strokeDasharray="1,1" />
          </svg>

          {/* DeepWork Surface Shift Layer */}
          {isDeepWork && (
            <div className="absolute inset-0 bg-indigo-950/20 mix-blend-color-dodge pointer-events-none animate-pulse" />
          )}

          {/* Atmosphere Shading */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.25) 0%, transparent 40%, rgba(9,5,20,0.92) 82%)',
            }}
          />

          {/* Outer Specular Ring Edge */}
          <div className="absolute inset-0 rounded-full border border-purple-400/60 shadow-[inset_0_0_25px_rgba(168,85,247,0.7)] pointer-events-none" />
        </motion.div>

        {/* Pulse Toast */}
        <AnimatePresence>
          {showNotification && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: -size / 2 - 24, scale: 1 }}
              exit={{ opacity: 0, y: -size / 2 - 35, scale: 0.85 }}
              transition={{ duration: 0.25 }}
              className="absolute z-30 px-3.5 py-1.5 rounded-full bg-purple-950/90 border border-purple-400/60 text-purple-200 text-xs font-mono tracking-widest uppercase shadow-[0_0_20px_rgba(168,85,247,0.8)] backdrop-blur-md flex items-center gap-2 pointer-events-none"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>PULSE DETECTED</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default AnimatedPlanet;
