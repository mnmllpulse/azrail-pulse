import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Play, Square, Settings2 } from 'lucide-react';

interface VoiceOutputButtonProps {
  text: string;
  isLight?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function VoiceOutputButton({ text, isLight = false, className = '', size = 'md' }: VoiceOutputButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    };
    
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handlePlay = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }
    
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    if (voices[selectedVoiceIndex]) {
      utterance.voice = voices[selectedVoiceIndex];
    }
    
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const sizeClasses = {
    sm: 'p-1.5 rounded-lg text-xs',
    md: 'p-2 rounded-xl text-sm',
    lg: 'p-3 rounded-2xl text-base'
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className={`relative flex items-center gap-1.5 ${className}`}>
      {showSettings && (
        <div className={`absolute top-full mt-2 right-0 p-2 rounded-xl border text-[10px] font-mono z-50 shadow-xl min-w-[200px] max-h-32 overflow-y-auto ${isLight ? 'bg-white border-gray-200' : 'bg-[#0a0a0c] border-white/10 text-white'}`}>
          <div className="font-bold mb-1 px-1">Select Voice</div>
          {voices.map((v, i) => (
            <button
              key={i}
              onClick={() => { setSelectedVoiceIndex(i); setShowSettings(false); }}
              className={`block w-full text-left px-2 py-1 rounded-lg hover:bg-indigo-500/20 truncate ${selectedVoiceIndex === i ? 'text-indigo-400 font-bold bg-indigo-500/10' : ''}`}
            >
              {v.name} ({v.lang})
            </button>
          ))}
          {voices.length === 0 && (
            <div className="flex flex-col gap-2">
              <div className="px-1 text-zinc-500 text-[9px]">No voices found</div>
              <button 
                onClick={() => {
                  const availableVoices = window.speechSynthesis.getVoices();
                  if (availableVoices.length > 0) setVoices(availableVoices);
                }}
                className="w-full text-left px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold"
              >
                Reload Voices
              </button>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowSettings(!showSettings)}
        className={`transition-all duration-200 flex items-center justify-center shrink-0 border ${isLight ? 'bg-gray-100 border-gray-200 hover:bg-gray-200' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/60'} ${sizeClasses[size]}`}
        title="Voice Settings"
      >
        <Settings2 className={iconSizes[size]} />
      </button>

      <button
        type="button"
        onClick={handlePlay}
        className={`transition-all duration-200 flex items-center justify-center shrink-0 border ${
          isPlaying 
            ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400 animate-pulse ring-4 ring-indigo-500/10' 
            : isLight
              ? 'bg-white border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-800'
              : 'bg-white/5 border-white/10 hover:border-white/20 text-[#E0E0E0]/60 hover:text-white'
        } ${sizeClasses[size]}`}
        title={isPlaying ? 'Stop Playing' : 'Read Aloud'}
      >
        {isPlaying ? <Square className={iconSizes[size]} /> : <Play className={iconSizes[size]} />}
      </button>
    </div>
  );
}
