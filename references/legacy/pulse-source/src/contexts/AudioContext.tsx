import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ConfigService } from '../services/ConfigService';

interface AudioContextType {
  playHover: () => void;
  playActivation: () => void;
  playSuccess: () => void;
  playError: () => void;
  setDroneLoad: (load: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
  isInitialized: boolean;
  initAudio: () => void;
  isListening: boolean;
  setIsListening: (val: boolean) => void;
  analyser: AnalyserNode | null;
  setSoundscape: (studioId: string, engagementLevel?: number) => void;
  engagementLevel: number;
  isSpaceSoundtrackPlaying: boolean;
  toggleSpaceSoundtrack: () => void;
  spaceVolume: number;
  setSpaceVolume: (vol: number) => void;
  isBinauralActive: boolean;
  setBinauralBeats: (active: boolean) => void;
}

const AudioContextManager = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return ConfigService.get('pulse_os_audio_muted', false);
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const droneOscRef = useRef<OscillatorNode | null>(null);
  const droneGainRef = useRef<GainNode | null>(null);
  
  // Binaural Beat Oscillators
  const binauralOscLeftRef = useRef<OscillatorNode | null>(null);
  const binauralOscRightRef = useRef<OscillatorNode | null>(null);
  const binauralGainRef = useRef<GainNode | null>(null);
  const [isBinauralActive, setIsBinauralActive] = useState<boolean>(false);

  // Space Ambient Soundtrack
  const spaceOscRef1 = useRef<OscillatorNode | null>(null);
  const spaceOscRef2 = useRef<OscillatorNode | null>(null);
  const spaceGainRef = useRef<GainNode | null>(null);
  const [isSpaceSoundtrackPlaying, setIsSpaceSoundtrackPlaying] = useState<boolean>(false);
  const [spaceVolume, setSpaceVolumeState] = useState<number>(0.25);

  const [droneLoadState, setDroneLoadState] = useState<number>(0);
  const [engagementLevel, setEngagementLevel] = useState<number>(50);
  const soundscapeFilterRef = useRef<BiquadFilterNode | null>(null);

  const setSpaceVolume = (vol: number) => {
    setSpaceVolumeState(vol);
    if (spaceGainRef.current && audioCtxRef.current) {
      spaceGainRef.current.gain.setTargetAtTime(vol * 0.08, audioCtxRef.current.currentTime, 0.2);
    }
  };

  const toggleSpaceSoundtrack = () => {
    initAudio();
    setIsSpaceSoundtrackPlaying((prev) => {
      const next = !prev;
      if (!audioCtxRef.current) return next;
      const now = audioCtxRef.current.currentTime;

      if (next) {
        // Start minimal space ambient generators
        if (!spaceOscRef1.current) {
          const osc1 = audioCtxRef.current.createOscillator();
          const osc2 = audioCtxRef.current.createOscillator();
          const gain = audioCtxRef.current.createGain();

          osc1.type = 'sine';
          osc1.frequency.value = 108.0; // Deep cosmic A2 tone

          osc2.type = 'sine';
          osc2.frequency.value = 162.0; // Fifth interval E3

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(spaceVolume * 0.08, now + 1.5);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(audioCtxRef.current.destination);

          osc1.start();
          osc2.start();

          spaceOscRef1.current = osc1;
          spaceOscRef2.current = osc2;
          spaceGainRef.current = gain;
        } else if (spaceGainRef.current) {
          spaceGainRef.current.gain.setTargetAtTime(spaceVolume * 0.08, now, 0.5);
        }
      } else {
        if (spaceGainRef.current) {
          spaceGainRef.current.gain.setTargetAtTime(0, now, 0.5);
        }
      }
      return next;
    });
  };

  const setBinauralBeats = (active: boolean) => {
    setIsBinauralActive(active);
    if (!active && !audioCtxRef.current) return;
    initAudio();
    if (!audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;

    if (active) {
      if (!binauralOscLeftRef.current) {
        // Create 40Hz binaural beat difference (200Hz Left, 240Hz Right)
        const ctx = audioCtxRef.current;
        const oscL = ctx.createOscillator();
        const oscR = ctx.createOscillator();
        const gain = ctx.createGain();

        // Stereo Panner
        const merger = ctx.createChannelMerger(2);

        oscL.type = 'sine';
        oscL.frequency.value = 200; // Left ear base frequency

        oscR.type = 'sine';
        oscR.frequency.value = 240; // Right ear (40Hz binaural beat offset)

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 1.0);

        oscL.connect(merger, 0, 0); // Left channel
        oscR.connect(merger, 0, 1); // Right channel
        merger.connect(gain);
        gain.connect(ctx.destination);

        oscL.start();
        oscR.start();

        binauralOscLeftRef.current = oscL;
        binauralOscRightRef.current = oscR;
        binauralGainRef.current = gain;
      } else if (binauralGainRef.current) {
        binauralGainRef.current.gain.setTargetAtTime(0.04, now, 0.5);
      }
    } else {
      if (binauralGainRef.current) {
        binauralGainRef.current.gain.setTargetAtTime(0, now, 0.5);
      }
    }
  };

  const setSoundscape = (studioId: string, engagement: number = 50) => {
    setEngagementLevel(engagement);
    if (!audioCtxRef.current || isMuted || !droneOscRef.current || !droneGainRef.current) return;

    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;

    // Frequencies mapped per studio theme
    const studioFreqs: Record<string, number> = {
      code: 52,       // Crisp digital harmonic
      web: 48,        // Modern cyber pulse
      music: 65,      // Rich resonant bass note
      video: 58,      // Cinematic sub-hum
      sandbox: 44,    // Low deep kernel pitch
      agent: 60,      // Neural intelligence frequency
      image: 50,      // Ambient canvas tone
      dna: 62,        // Bio-quantum pulse
      quantum: 70,    // High quantum shimmer
      default: 45,
    };

    const targetFreq = studioFreqs[studioId] || studioFreqs.default;
    const modulatedFreq = targetFreq + (engagement / 100) * 15;
    const targetVol = 0.015 + (engagement / 100) * 0.025;

    droneOscRef.current.frequency.setTargetAtTime(modulatedFreq, now, 0.8);
    droneGainRef.current.gain.setTargetAtTime(targetVol, now, 0.8);
  };

  const setDroneLoad = (load: number) => {
    setDroneLoadState(load);
    if (droneOscRef.current && droneGainRef.current) {
      // Base frequency 40Hz, up to 60Hz based on load
      const freq = 40 + (load / 100) * 20;
      droneOscRef.current.frequency.setTargetAtTime(freq, audioCtxRef.current!.currentTime, 0.5);
      
      // Volume increases slightly with load
      const vol = 0.02 + (load / 100) * 0.03;
      droneGainRef.current.gain.setTargetAtTime(vol, audioCtxRef.current!.currentTime, 0.5);
    }
  };



  // Initialize or resume the Web Audio context
  const initAudio = () => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioCtxRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        setIsInitialized(true);

        // Setup drone
        const droneOsc = audioCtxRef.current.createOscillator();
        const droneGain = audioCtxRef.current.createGain();
        
        droneOsc.type = 'sine';
        droneOsc.frequency.value = 40; // Low frequency hum
        
        droneGain.gain.value = 0.02; // Very quiet
        
        droneOsc.connect(droneGain);
        droneGain.connect(audioCtxRef.current.destination);
        
        droneOsc.start();
        droneOscRef.current = droneOsc;
        droneGainRef.current = droneGain;

      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    } catch (error) {
      console.warn('Failed to initialize Web Audio context:', error);
    }
  };

  useEffect(() => {
    if (isListening) {
      initAudio();
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          streamRef.current = stream;
          if (audioCtxRef.current && analyserRef.current) {
            sourceRef.current = audioCtxRef.current.createMediaStreamSource(stream);
            sourceRef.current.connect(analyserRef.current);
          }
        })
        .catch(err => {
          console.error("Microphone access denied:", err);
          setIsListening(false);
        });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
    }
  }, [isListening]);

  // Attempt auto-init on first click/touchstart to bypass browser security
  useEffect(() => {
    const handleGesture = () => {
      initAudio();
      // Remove event listeners once initialized
      if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
        window.removeEventListener('click', handleGesture);
        window.removeEventListener('keydown', handleGesture);
        window.removeEventListener('touchstart', handleGesture);
      }
    };

    window.addEventListener('click', handleGesture, { passive: true });
    window.addEventListener('keydown', handleGesture, { passive: true });
    window.addEventListener('touchstart', handleGesture, { passive: true });

    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('keydown', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
  }, [isMuted]);

  // Expose playHover sound
  const playHover = () => {
    if (isMuted) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state === 'suspended') return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      // Low-mid warm click frequency sweep
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(250, now);

      // Short tactile feedback curve
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {
      // Graceful fallback
    }
  };


  const playSuccess = () => {
    if (isMuted) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state === 'suspended') return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch(e) {}
  };

  const playError = () => {
    if (isMuted) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state === 'suspended') return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch(e) {}
  };

  // Expose playActivation sound
  const playActivation = () => {
    if (isMuted) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state === 'suspended') return;

      const now = ctx.currentTime;

      // Sub fundamental oscillator (low rumble)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();

      // Mid presence oscillator (creates audibility on standard laptop speakers)
      const midOsc = ctx.createOscillator();
      const midGain = ctx.createGain();

      const lowpass = ctx.createBiquadFilter();

      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(90, now);
      subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.45);

      midOsc.type = 'sine';
      midOsc.frequency.setValueAtTime(180, now);
      midOsc.frequency.exponentialRampToValueAtTime(70, now + 0.35);

      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(120, now);
      lowpass.frequency.linearRampToValueAtTime(60, now + 0.45);

      // Amplitude envelopes
      subGain.gain.setValueAtTime(0, now);
      subGain.gain.linearRampToValueAtTime(0.35, now + 0.02);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      midGain.gain.setValueAtTime(0, now);
      midGain.gain.linearRampToValueAtTime(0.12, now + 0.01);
      midGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      subOsc.connect(lowpass);
      midOsc.connect(lowpass);

      lowpass.connect(subGain);
      lowpass.connect(midGain);

      subGain.connect(ctx.destination);
      midGain.connect(ctx.destination);

      subOsc.start(now);
      midOsc.start(now);

      subOsc.stop(now + 0.55);
      midOsc.stop(now + 0.4);
    } catch (e) {
      // Graceful fallback
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    ConfigService.set('pulse_os_audio_muted', nextMuted);
  };

  return (
    <AudioContextManager.Provider
      value={{
        playHover,
        playActivation,
        playSuccess,
        playError,
        setDroneLoad,
        isMuted,
        toggleMute,
        isInitialized,
        initAudio,
        isListening,
        setIsListening,
        analyser: analyserRef.current,
        setSoundscape,
        engagementLevel,
        isSpaceSoundtrackPlaying,
        toggleSpaceSoundtrack,
        spaceVolume,
        setSpaceVolume,
        isBinauralActive,
        setBinauralBeats,
      }}
    >
      {children}
    </AudioContextManager.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContextManager);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
