import React, { useEffect, useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface DragonStormRef {
  trigger: () => void;
}

export const DragonStorm = forwardRef<DragonStormRef, {}>((props, ref) => {
  const [isActive, setIsActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useImperativeHandle(ref, () => ({
    trigger: () => {
      setIsActive(true);
      playThunder();
      startParticles();
      setTimeout(() => setIsActive(false), 2000);
    }
  }));

  const playThunder = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audio = new Audio('https://www.soundjay.com/nature/sounds/thunder-01.mp3');
      audio.onerror = () => {
        console.warn('Thunder sound file failed to load.');
      };
      audio.volume = 0.3;
      audio.play().catch(e => {
        console.warn('Audio play failed or was blocked by autoplay policy:', e);
      });
    } catch (e) {
      console.warn('Audio playback/context initialization blocked or failed:', e);
    }
  };

  const startParticles = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number, y: number, vx: number, vy: number, alpha: number }[] = [];
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        alpha: 1
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.01;
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
      if (particles[0].alpha > 0) requestAnimationFrame(animate);
    };
    animate();
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden"
        >
          <canvas ref={canvasRef} className="absolute inset-0" />
          {/* Lightning Flash Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0, 0.8, 0] }}
            transition={{ duration: 0.5, times: [0, 0.1, 0.2, 0.3, 0.5] }}
            className="absolute inset-0 bg-white/20 mix-blend-overlay"
          />

          {/* Shaking effect */}
          <motion.div
            animate={{ x: [-10, 10, -10, 0], y: [-10, 10, -10, 0] }}
            transition={{ duration: 0.1, repeat: 10 }}
            className="absolute inset-0"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
});
