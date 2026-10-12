import React, { useRef, useEffect } from 'react';
import { useAudio } from '../contexts/AudioContext';
import { useSystemState } from '../contexts/SystemStateContext';
import { Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AudioWaveform: React.FC = () => {
  const { isListening, setIsListening, analyser } = useAudio();
  const { uiPreferences } = useSystemState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>(0);

  useEffect(() => {
    if (!isListening || !analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationIdRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = uiPreferences.pulsePrimary;
      ctx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();

    return () => {
      cancelAnimationFrame(animationIdRef.current);
    };
  }, [isListening, analyser, uiPreferences.pulsePrimary]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4 bg-depth-void/80 backdrop-blur-xl p-3 rounded-2xl border border-white/5 shadow-2xl">
      <AnimatePresence mode="wait">
        {isListening && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 120 }}
            exit={{ opacity: 0, width: 0 }}
            className="overflow-hidden"
          >
            <canvas ref={canvasRef} width={120} height={40} className="w-[120px] h-[40px]" />
          </motion.div>
        )}
      </AnimatePresence>
      
      <button
        onClick={() => setIsListening(!isListening)}
        className={`p-3 rounded-xl transition-all ${
          isListening 
            ? 'bg-pulse-primary text-white shadow-lg shadow-pulse-primary/30' 
            : 'bg-white/5 text-white/40 hover:text-white/80'
        }`}
      >
        {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
      </button>
    </div>
  );
};
