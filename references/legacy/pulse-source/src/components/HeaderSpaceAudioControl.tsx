import React, { useState } from 'react';
import { useAudio } from '../contexts/AudioContext';
import { Music, Volume2, VolumeX, Sparkles } from 'lucide-react';
import Tooltip from './Tooltip';

export const HeaderSpaceAudioControl: React.FC = () => {
  const {
    isSpaceSoundtrackPlaying,
    toggleSpaceSoundtrack,
    spaceVolume,
    setSpaceVolume,
    isBinauralActive,
  } = useAudio();

  const [showVolumePopover, setShowVolumePopover] = useState(false);

  return (
    <div className="relative flex items-center gap-1.5 font-mono">
      <Tooltip
        contentEn="Toggle global minimalist space ambient soundtrack across all routes."
        contentRu="Включить/выключить фоновую космическую звуковую дорожку."
        titleEn="Space Soundtrack"
        titleRu="Космический Саундтрек"
        position="bottom"
      >
        <button
          onClick={toggleSpaceSoundtrack}
          onMouseEnter={() => setShowVolumePopover(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            isSpaceSoundtrackPlaying
              ? 'bg-purple-950/80 border-purple-500/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
              : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Music className={`w-3.5 h-3.5 ${isSpaceSoundtrackPlaying ? 'animate-bounce text-purple-400' : ''}`} />
          <span className="hidden md:inline">
            {isSpaceSoundtrackPlaying ? 'SPACE SOUND ON' : 'SPACE SOUND'}
          </span>
          {isBinauralActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse ml-0.5" title="40Hz Binaural Focus Beats Active" />
          )}
        </button>
      </Tooltip>

      {/* Popover Volume Control */}
      {showVolumePopover && isSpaceSoundtrackPlaying && (
        <div
          onMouseLeave={() => setShowVolumePopover(false)}
          className="absolute top-full mt-2 right-0 p-2.5 rounded-xl bg-zinc-950/95 border border-purple-500/30 backdrop-blur-xl shadow-2xl z-50 flex items-center gap-2 w-36"
        >
          <Volume2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={spaceVolume}
            onChange={(e) => setSpaceVolume(parseFloat(e.target.value))}
            className="w-full accent-purple-500 h-1 bg-white/20 rounded-lg cursor-pointer"
          />
        </div>
      )}
    </div>
  );
};

export default HeaderSpaceAudioControl;
