import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Module {
  id: string;
  icon: string;
  label: string;
  desc: string;
  path: string;
  available: boolean;
}

const THOR_MODULES: Module[] = [
  { id: 'quantum', icon: '⚡', label: 'Quantum Mind', desc: 'Синтез 10+ моделей одновременно', path: '/studio/lab', available: true },
  { id: 'dna', icon: '🧬', label: 'DNA Sequencer', desc: 'Цифровой психопрофиль', path: '/dna', available: true },
  { id: 'reality', icon: '🌐', label: 'Reality Engine', desc: 'Голосовое управление реальностью', path: '/reality', available: true },
  { id: 'oracle', icon: '🔮', label: 'Oracle', desc: 'Предиктивные тренды', path: '/oracle', available: true },
  { id: 'lab', icon: '🧪', label: 'AI Lab', desc: 'Автономные эксперименты', path: '/studio/lab', available: true },
  { id: 'mindforge', icon: '🧠', label: 'MindForge', desc: 'Психологический анализ', path: '/mindforge', available: true },
  { id: 'swarm', icon: '⟁', label: 'Swarm', desc: 'Иерархический рой агентов', path: '/swarm', available: true },
  { id: 'generate', icon: '🎬', label: 'Video Engine', desc: 'Генерация видео и изображений', path: '/studio/video', available: true },
];

export default function ThorButton() {
  const [active, setActive] = useState(false);
  const [lightningPhase, setLightningPhase] = useState(0);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Звук грома (синтезируем через Web Audio API)
  const playThunder = () => {
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const ctx = new AudioContextClass();
      const duration = 2.5;

      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const t = i / ctx.sampleRate;
        const envelope = Math.exp(-t * 1.8) * (1 - Math.exp(-t * 20));
        const noise = (Math.random() * 2 - 1) * envelope;
        const rumble = Math.sin(t * 40 * Math.random()) * envelope * 0.3;
        data[i] = (noise + rumble) * 0.6;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(80, 0);
      filter.frequency.exponentialRampToValueAtTime(800, 0.3);
      filter.frequency.exponentialRampToValueAtTime(60, duration);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.8, 0);
      gain.gain.exponentialRampToValueAtTime(0.01, duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      source.stop(ctx.currentTime + duration);
    } catch (e) {
      console.error("Thunder synthesis failed:", e);
    }
  };

  // Молнии на canvas
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf: number;
    let bolts: { x1: number; y1: number; x2: number; y2: number; life: number; maxLife: number; width: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let phaseStart = Date.now();
    setLightningPhase(1);
    playThunder();

    const animate = () => {
      const elapsed = (Date.now() - phaseStart) / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (elapsed < 0.3) {
        const alpha = Math.sin(elapsed / 0.3 * Math.PI);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setLightningPhase(1);
      } else if (elapsed < 0.8) {
        setLightningPhase(2);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (bolts.length < 15 && Math.random() > 0.5) {
          const startX = Math.random() * canvas.width;
          const segments = 8 + Math.floor(Math.random() * 12);
          let x = startX, y = 0;
          for (let i = 0; i < segments; i++) {
            const nx = x + (Math.random() - 0.5) * 120;
            const ny = y + (canvas.height / segments);
            bolts.push({ x1: x, y1: y, x2: nx, y2: ny, life: 0, maxLife: 0.15 + Math.random() * 0.25, width: 1 + Math.random() * 3 });
            x = nx; y = ny;
          }
        }

        bolts = bolts.filter(b => b.life < b.maxLife);
        bolts.forEach(b => {
          b.life += 0.016;
          const alpha = 1 - b.life / b.maxLife;
          ctx.strokeStyle = `rgba(200,220,255,${alpha})`;
          ctx.lineWidth = b.width * alpha;
          ctx.shadowColor = 'rgba(150,200,255,0.8)';
          ctx.shadowBlur = 12 * alpha;
          ctx.beginPath();
          ctx.moveTo(b.x1, b.y1);
          ctx.lineTo(b.x2, b.y2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        });
      } else if (elapsed < 1.5) {
        setLightningPhase(3);
        const alpha = Math.max(0, 1 - (elapsed - 0.8) / 0.7);
        ctx.fillStyle = `rgba(5,5,5,${alpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        setLightningPhase(3);
      }

      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  const handleThorClick = () => {
    setActive(true);
  };

  const handleClose = () => {
    setActive(false);
    setLightningPhase(0);
    setSelectedModule(null);
  };

  const handleModuleClick = (module: Module) => {
    setSelectedModule(module.id);
    setTimeout(() => {
      window.location.href = module.path;
    }, 300);
  };

  return (
    <>
      <button
        onClick={handleThorClick}
        className="relative group flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-700 via-purple-600 to-blue-500 shadow-[0_0_25px_rgba(124,58,237,.5)] hover:shadow-[0_0_50px_rgba(124,58,237,.8)] transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden border border-white/20"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/30 animate-pulse" />
        <svg viewBox="0 0 24 24" className="w-7 h-7 relative z-10 text-white drop-shadow-[0_0_8px_rgba(255,255,255,.6)]" fill="currentColor">
          <path d="M17 7l-1.5-1.5-9 9 1.5 1.5 9-9zM9 3l-2 2 1.5 1.5L6 10 3 7l-2 2 4 4 2-2 2.5 2.5L11 12l2-2-2.5-2.5L12 6l-2-2-1-1zm8 14l2-2-1.5-1.5L20 14l-3 3-2-2-1.5 1.5 2 2 1.5-1.5z" />
        </svg>
      </button>

      <AnimatePresence>
        {active && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center">
            <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: lightningPhase >= 3 ? 1 : 0, y: lightningPhase >= 3 ? 0 : 20 }}
              exit={{ opacity: 0, y: 10 }}
              className="relative z-10 w-full max-w-2xl mx-4"
            >
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-white mb-2 drop-shadow-[0_0_20px_rgba(124,58,237,.8)] tracking-tight">
                  ⚡ MJÖLNIR PROTOCOLS
                </h2>
                <p className="text-xs text-purple-300 tracking-[.2em] uppercase font-mono">Select Module for Activation</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {THOR_MODULES.map(module => (
                  <button
                    key={module.id}
                    onClick={() => module.available && handleModuleClick(module)}
                    className={`relative group p-4 rounded-xl border transition-all duration-300 text-left h-32 flex flex-col justify-between ${
                      selectedModule === module.id
                        ? 'border-purple-400 bg-purple-600/20 shadow-[0_0_25px_rgba(124,58,237,.5)] scale-105'
                        : module.available
                        ? 'border-white/10 bg-white/5 hover:border-purple-500/30 hover:bg-purple-600/10'
                        : 'border-white/5 bg-white/2 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <div className="text-2xl mb-1">{module.icon}</div>
                      <div className="text-xs font-bold text-white mb-0.5">{module.label}</div>
                    </div>
                    <div className="text-[9px] text-gray-500 leading-tight line-clamp-2">{module.desc}</div>
                    {!module.available && (
                      <span className="absolute top-2 right-2 text-[7px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full font-bold">SOON</span>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={handleClose}
                className="mt-8 mx-auto block text-[10px] text-gray-500 hover:text-white transition-colors tracking-[.15em] uppercase font-mono"
              >
                [ ESC ] Close Menu
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
