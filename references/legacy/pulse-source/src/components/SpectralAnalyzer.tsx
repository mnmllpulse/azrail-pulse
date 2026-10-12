import React, { useEffect, useRef } from 'react';
import MinimalSynthEngine from '../utils/synth';

interface SpectralAnalyzerProps {
  synth: MinimalSynthEngine | null;
  isPlaying: boolean;
  isLight?: boolean;
}

export default function SpectralAnalyzer({ synth, isPlaying, isLight }: SpectralAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = 128; // Using a subset for better visual density
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      if (synth) {
        synth.getAnalyserData(dataArray);
      } else if (!isPlaying) {
        dataArray.fill(0);
      }

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const barWidth = (width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height;

        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        if (isLight) {
          gradient.addColorStop(0, '#4f46e5');
          gradient.addColorStop(1, '#818cf8');
        } else {
          gradient.addColorStop(0, '#7b4bff');
          gradient.addColorStop(1, '#b388ff');
        }

        ctx.fillStyle = gradient;
        
        // Rounded bars
        const radius = 2;
        const rectX = x;
        const rectY = height - barHeight;
        const rectW = barWidth - 1;
        const rectH = barHeight;

        if (rectH > 2) {
            ctx.beginPath();
            ctx.moveTo(rectX + radius, rectY);
            ctx.lineTo(rectX + rectW - radius, rectY);
            ctx.quadraticCurveTo(rectX + rectW, rectY, rectX + rectW, rectY + radius);
            ctx.lineTo(rectX + rectW, rectY + rectH);
            ctx.lineTo(rectX, rectY + rectH);
            ctx.lineTo(rectX, rectY + radius);
            ctx.quadraticCurveTo(rectX, rectY, rectX + radius, rectY);
            ctx.closePath();
            ctx.fill();
        }

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [synth, isPlaying, isLight]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={120} 
      className="w-full h-full"
    />
  );
}
