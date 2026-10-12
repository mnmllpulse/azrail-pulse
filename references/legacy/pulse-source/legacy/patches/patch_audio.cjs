const fs = require('fs');

let content = fs.readFileSync('src/contexts/AudioContext.tsx', 'utf8');

// Add playSuccess and playError to AudioContextType
content = content.replace(
  "  playActivation: () => void;",
  "  playActivation: () => void;\n  playSuccess: () => void;\n  playError: () => void;\n  setDroneLoad: (load: number) => void;"
);

// Add state and refs for drone
const initAudioHook = `  const [droneLoad, setDroneLoadState] = useState(0);
  const droneOscRef = useRef<OscillatorNode | null>(null);
  const droneGainRef = useRef<GainNode | null>(null);

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

`;

content = content.replace(
  "  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);",
  "  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);\n" + initAudioHook
);

// Add init logic for drone
const initAudioLogic = `        setIsInitialized(true);

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
`;
content = content.replace(
  "        setIsInitialized(true);",
  initAudioLogic
);

// Add playSuccess and playError
const playSounds = `
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
`;

content = content.replace(
  "  // Expose playActivation sound",
  playSounds + "\n  // Expose playActivation sound"
);

content = content.replace(
  "        playActivation,",
  "        playActivation,\n        playSuccess,\n        playError,\n        setDroneLoad,"
);

fs.writeFileSync('src/contexts/AudioContext.tsx', content);
