import React, { useEffect, useRef } from 'react';

export default function VUMeter({ isPlaying, isLight }: { isPlaying: boolean, isLight?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let leftLevel = 0;
    let rightLevel = 0;
    
    // Smoothing factor
    const decay = 0.85;
    const attack = 0.5;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Target levels based on play state
      const targetLeft = isPlaying ? Math.random() * 0.9 + 0.1 : 0;
      const targetRight = isPlaying ? Math.random() * 0.9 + 0.1 : 0;

      // Smooth levels
      leftLevel = leftLevel < targetLeft 
        ? leftLevel + (targetLeft - leftLevel) * attack 
        : leftLevel * decay;
        
      rightLevel = rightLevel < targetRight 
        ? rightLevel + (targetRight - rightLevel) * attack 
        : rightLevel * decay;

      const drawChannel = (level: number, yPos: number) => {
        const segments = 20;
        const gap = 1;
        const segmentWidth = (canvas.width - (segments - 1) * gap) / segments;
        const segmentHeight = (canvas.height - gap) / 2;

        const activeSegments = Math.floor(level * segments);

        for (let i = 0; i < segments; i++) {
          const x = i * (segmentWidth + gap);
          
          if (i < activeSegments) {
            // Active segment color
            if (i < 14) ctx.fillStyle = '#10b981'; // emerald-500
            else if (i < 18) ctx.fillStyle = '#eab308'; // yellow-500
            else ctx.fillStyle = '#ef4444'; // red-500
          } else {
            // Inactive segment color
            ctx.fillStyle = isLight ? '#d1d5db' : 'rgba(255, 255, 255, 0.1)';
          }

          ctx.fillRect(x, yPos, segmentWidth, segmentHeight);
        }
      };

      drawChannel(leftLevel, 0);
      drawChannel(rightLevel, (canvas.height + 1) / 2);

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPlaying, isLight]);

  return (
    <canvas 
      ref={canvasRef} 
      width={120} 
      height={14} 
      className="w-full h-full"
    />
  );
}
