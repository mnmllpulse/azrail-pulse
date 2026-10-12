import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Server, Code, Layers, Activity, Sparkles, Cpu, Play, Pause } from 'lucide-react';

interface NodeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
}

export function PulseArchitectureMap({ isLight }: { isLight: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeLayer, setActiveTab] = useState<'top' | 'middle' | 'base'>('middle');
  const [pulseRate, setPulseRate] = useState<number>(60);
  const [cpuLoad, setCpuLoad] = useState<number>(0.04);
  const [isAnimateActive, setIsAnimateActive] = useState<boolean>(true);
  
  // Custom interactive stats tracking mouse state
  const mouseRef = useRef({ x: -1000, y: -1000, radius: 120 });

  // 1. Procedural Neural Connection Web (Canvas Spring Physics Animation)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: NodeParticle[] = [];
    const maxParticles = 45;

    const resizeCanvas = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      canvas.width = rect?.width || 800;
      canvas.height = 180;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < maxParticles; i++) {
        const radius = Math.random() * 2 + 1;
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius,
          baseRadius: radius,
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Dynamic CPU simulator
    const cpuInterval = setInterval(() => {
      setCpuLoad(prev => {
        const delta = (Math.random() - 0.5) * 0.01;
        return Math.min(0.09, Math.max(0.01, Number((prev + delta).toFixed(4))));
      });
    }, 2000);

    // Loop
    const render = () => {
      if (!isAnimateActive) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw active background pulse paths
      ctx.strokeStyle = isLight ? 'rgba(123, 77, 255, 0.03)' : 'rgba(123, 77, 255, 0.05)';
      ctx.lineWidth = 1;
      
      // Update & Draw Particles
      particles.forEach(p => {
        p.x += p.vx * (pulseRate / 60);
        p.y += p.vy * (pulseRate / 60);

        // Boundary reflection
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Interaction with mouse (Spring Magnetism)
        const dx = mouseRef.current.x - p.x;
        const dy = mouseRef.current.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < mouseRef.current.radius) {
          const force = (mouseRef.current.radius - dist) / mouseRef.current.radius;
          p.x -= dx * force * 0.03;
          p.y -= dy * force * 0.03;
          p.radius = p.baseRadius + force * 2.5;
        } else {
          p.radius = Math.max(p.baseRadius, p.radius - 0.1);
        }

        // Draw node
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = isLight 
          ? `rgba(123, 77, 255, ${p.radius > p.baseRadius ? '0.7' : '0.3'})` 
          : `rgba(179, 136, 255, ${p.radius > p.baseRadius ? '0.8' : '0.4'})`;
        ctx.fill();
      });

      // Draw connection lines
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 85) {
            const opacity = (1 - dist / 85) * 0.25;
            ctx.strokeStyle = isLight 
              ? `rgba(99, 102, 241, ${opacity})` 
              : `rgba(123, 77, 255, ${opacity})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    if (isAnimateActive) {
      render();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      clearInterval(cpuInterval);
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [isLight, pulseRate, isAnimateActive]);

  return (
    <section 
      ref={containerRef}
      aria-label="Pulse Live Architecture Playground" 
      className={`border rounded-[32px] p-6 md:p-8 relative overflow-hidden transition-all duration-700 ${
        isLight ? 'bg-white border-gray-200/80 shadow-xl' : 'bg-depth-space border-white/5 shadow-[0_0_50px_rgba(12,6,24,0.8)]'
      }`}
    >
      {/* 2. Liquid Mesh Organic Background Filter */}
      <div className="absolute inset-0 pointer-events-none opacity-25">
        <svg className="absolute w-full h-full">
          <filter id="liquid-refraction">
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
        <div 
          className="absolute inset-0 bg-gradient-to-tr from-pulse-primary/10 via-transparent to-purple-500/5 mix-blend-screen"
          style={{ filter: isAnimateActive ? 'url(#liquid-refraction)' : 'none' }}
        />
      </div>

      {/* Procedural Canvas Background */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-auto z-0" 
      />

      <div className="relative z-10 flex flex-col gap-6">
        
        {/* Header Block with Telemetry */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pulse-primary/10 border border-pulse-primary/30 flex items-center justify-center animate-pulse">
              <Layers className="w-5 h-5 text-pulse-primary" />
            </div>
            <div>
              <h2 className={`text-sm font-mono tracking-[0.3em] uppercase font-bold flex items-center gap-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Live Pulse OS Kernel
                <span className="inline-flex w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </h2>
              <div className={`text-[9px] font-mono tracking-widest uppercase ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                Active Orchestration Runtime & Telemetry
              </div>
            </div>
          </div>

          {/* Interactive controls */}
          <div className="flex flex-wrap items-center gap-3 z-10">
            {/* Play/Pause Procedural Animation */}
            <button
              onClick={() => setIsAnimateActive(!isAnimateActive)}
              className={`p-2 rounded-lg border flex items-center gap-1.5 text-[10px] font-mono transition-colors ${
                isLight 
                  ? 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200' 
                  : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10'
              }`}
            >
              {isAnimateActive ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
              {isAnimateActive ? 'PAUSE ENGINE' : 'RESUME'}
            </button>

            {/* Pulse Rate controller (60Hz simulated) */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/40 border-white/5'}`}>
              <span className={`text-[9px] font-mono ${isLight ? 'text-gray-500' : 'text-zinc-500'}`}>RATE:</span>
              <input 
                type="range" 
                min="10" 
                max="120" 
                value={pulseRate} 
                onChange={(e) => setPulseRate(Number(e.target.value))}
                className="w-16 accent-pulse-primary cursor-pointer h-1 rounded-full bg-white/10"
              />
              <span className="text-[10px] font-mono font-bold text-pulse-primary">{pulseRate}HZ</span>
            </div>

            {/* CPU Load Metric (Adaptive spring values) */}
            <div className={`px-3 py-1 rounded-lg border flex items-center gap-2 ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/40 border-white/5'}`}>
              <Cpu className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-[10px] font-mono font-bold text-rose-400">{cpuLoad}% CPU</span>
            </div>
          </div>
        </div>

        {/* Triple Architecture Layer Tabs with Advanced Staggered Detail */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 z-10">
          {[
            {
              id: 'top' as const,
              title: 'Top Layer (UI/UX)',
              tech: 'React, Tailwind, Motion',
              desc: 'Кинематографичный минимализм без лишнего киберпанка. Строгая типографика, сбалансированное негативное пространство, идеальный контраст 5.2:1.',
              icon: <Code className="w-4 h-4 text-emerald-400" />
            },
            {
              id: 'middle' as const,
              title: 'Middle Layer (Motion)',
              tech: 'GSAP, WebGL, SVG Filter',
              desc: 'Плавный рендеринг 60 FPS. Живой векторный пульс на GPU, интерактивный кинетический магнетизм элементов и физика пружин.',
              icon: <Zap className="w-4 h-4 text-pulse-primary" />
            },
            {
              id: 'base' as const,
              title: 'Base Layer (Server)',
              tech: 'Node, Redis, Cloudflare Edge',
              desc: 'Сверхбыстрые Redis Queues координируют рой ИИ-агентов. Децентрализованная оркестрация на планетарной границе сети с субмиллисекундным пингом.',
              icon: <Server className="w-4 h-4 text-blue-400" />
            }
          ].map((layer) => {
            const isTabActive = activeLayer === layer.id;
            return (
              <button
                key={layer.id}
                onClick={() => setActiveTab(layer.id)}
                className={`p-5 rounded-[24px] border text-left flex flex-col gap-3 transition-all duration-500 relative overflow-hidden group ${
                  isTabActive
                    ? isLight 
                      ? 'bg-white border-pulse-primary shadow-lg ring-1 ring-pulse-primary/20' 
                      : 'bg-zinc-950/90 border-pulse-primary/40 shadow-[0_0_20px_rgba(123,77,255,0.15)]'
                    : isLight 
                      ? 'bg-gray-50/60 border-gray-100 hover:bg-white hover:border-gray-300' 
                      : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10'
                }`}
              >
                {/* Visual anchor glow for active layers */}
                {isTabActive && (
                  <div className="absolute top-0 right-0 w-16 h-16 bg-pulse-primary/5 rounded-full blur-xl pointer-events-none" />
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {layer.icon}
                    <h3 className={`text-xs font-mono uppercase font-bold tracking-wider ${isLight ? 'text-gray-900' : 'text-white'}`}>
                      {layer.title}
                    </h3>
                  </div>
                  <span className={`text-[8px] font-mono tracking-widest ${isLight ? 'text-gray-400' : 'text-zinc-600'}`}>
                    {layer.id.toUpperCase()}
                  </span>
                </div>

                <div className="text-[10px] font-mono text-pulse-accent uppercase tracking-wider font-semibold">
                  {layer.tech}
                </div>

                <p className={`text-[11px] leading-relaxed transition-all ${
                  isTabActive 
                    ? isLight ? 'text-gray-700' : 'text-zinc-300' 
                    : 'text-zinc-500 group-hover:text-zinc-400'
                }`}>
                  {layer.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Dynamic Interactive Layer Playground Display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeLayer}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className={`p-5 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 z-10 ${
              isLight ? 'bg-pulse-primary/5 border-pulse-primary/10' : 'bg-pulse-primary/10 border-pulse-primary/20 backdrop-blur-md'
            }`}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-pulse-primary animate-spin" style={{ animationDuration: '6s' }} />
              <div>
                <span className={`text-[9px] font-mono uppercase tracking-widest font-bold block ${isLight ? 'text-pulse-primary' : 'text-pulse-accent'}`}>
                  АКТИВНЫЙ АНАЛИЗ СЛОЯ
                </span>
                <span className={`text-xs font-semibold ${isLight ? 'text-gray-800' : 'text-white'}`}>
                  {activeLayer === 'top' && "Прорисовка макета без единого лага при частоте 60 кадров/сек."}
                  {activeLayer === 'middle' && "Аппаратное сглаживание CSS и SVG слоев на уровне видеокарты (GPU)."}
                  {activeLayer === 'base' && "Отказоустойчивость 100%. Выход из строя одного агента мгновенно замещается соседом из очереди Redis."}
                </span>
              </div>
            </div>

            <div className="text-[9px] font-mono tracking-widest uppercase text-pulse-primary font-bold">
              SYSTEM_STATUS: INTEGRITY_100%
            </div>
          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
}
