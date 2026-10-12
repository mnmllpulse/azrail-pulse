class MinimalSynthEngine {
  private audioCtx: AudioContext | null = null;
  private streamDestination: MediaStreamAudioDestinationNode | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isRunning: boolean = false;
  private currentStep: number = 0;
  private nextNoteTime: number = 0.0;
  private timerId: number | null = null;
  private bpm: number = 120;
  private stepDuration: number = 0.125; // 16th note at 120 bpm = 60 / 120 / 4 = 0.125s
  private onStepCallback: (step: number) => void = () => {};

  // Simple step sequencer grid for 16 steps
  // 1 means play note/drum
  private kickSeq =  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
  private hihatSeq = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0];
  private bassSeq =  [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1];
  private synthSeq = [0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0];

  // A Minor chord notes (frequencies)
  private bassFreqs = [55, 65.41, 73.42, 82.41]; // A1, C2, D2, E2
  private synthFreqs = [220, 261.63, 293.66, 329.63, 392.00, 440.00]; // A3, C4, D4, E4, G4, A4

  public getSequences() {
    return {
      kick: this.kickSeq,
      hihat: this.hihatSeq,
      bass: this.bassSeq,
      synth: this.synthSeq,
    };
  }

  public setSequence(track: 'kick' | 'hihat' | 'bass' | 'synth', index: number, value: number) {
    if (track === 'kick') this.kickSeq[index] = value;
    else if (track === 'hihat') this.hihatSeq[index] = value;
    else if (track === 'bass') this.bassSeq[index] = value;
    else if (track === 'synth') this.synthSeq[index] = value;
  }

  public setAllSequences(kick: number[], hihat: number[], bass: number[], synth: number[]) {
    this.kickSeq = [...kick];
    this.hihatSeq = [...hihat];
    this.bassSeq = [...bass];
    this.synthSeq = [...synth];
  }

  public setBpm(val: number) {
    this.bpm = val;
    this.stepDuration = 60.0 / this.bpm / 4;
  }

  public getBpm() {
    return this.bpm;
  }

  private suiteFunctions: Record<string, boolean> = {};

  public setSuiteFunctions(funcs: Record<string, boolean>) {
    this.suiteFunctions = { ...funcs };
  }

  constructor(onStep: (step: number) => void) {
    this.onStepCallback = onStep;
  }

  public getMediaStream(): MediaStream | null {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (!this.masterGain) {
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.connect(this.audioCtx.destination);
    }
    if (!this.analyser) {
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.masterGain.connect(this.analyser);
    }
    if (!this.streamDestination) {
      this.streamDestination = this.audioCtx.createMediaStreamDestination();
      this.masterGain.connect(this.streamDestination);
    }
    return this.streamDestination.stream;
  }

  public getAnalyserData(dataArray: Uint8Array) {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(dataArray);
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public start() {
    if (this.isRunning) return;
    
    // Create audio context if it doesn't exist
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (!this.masterGain) {
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.connect(this.audioCtx.destination);
    }

    if (!this.analyser) {
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.masterGain.connect(this.analyser);
    }

    if (!this.streamDestination) {
      this.streamDestination = this.audioCtx.createMediaStreamDestination();
      this.masterGain.connect(this.streamDestination);
    }
    
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.isRunning = true;
    this.currentStep = 0;
    this.nextNoteTime = this.audioCtx.currentTime;
    this.scheduler();
  }

  public stop() {
    this.isRunning = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private scheduler() {
    if (!this.isRunning || !this.audioCtx) return;

    while (this.nextNoteTime < this.audioCtx.currentTime + 0.1) {
      this.scheduleNote(this.currentStep, this.nextNoteTime);
      this.advanceStep();
    }

    this.timerId = window.setTimeout(() => this.scheduler(), 25);
  }

  private advanceStep() {
    if (!this.audioCtx) return;
    
    // Callback to front-end for visual feedback
    const step = this.currentStep;
    setTimeout(() => {
      if (this.isRunning) this.onStepCallback(step);
    }, 0);

    const secondsPerBeat = 60.0 / this.bpm;
    this.stepDuration = secondsPerBeat / 4; // 16th notes
    this.nextNoteTime += this.stepDuration;
    this.currentStep = (this.currentStep + 1) % 16;
  }

  private scheduleNote(step: number, time: number) {
    if (!this.audioCtx) return;

    // f66: MIDI Velocity Humanizer
    let velocity = 1.0;
    if (this.suiteFunctions['f66']) {
      velocity = 0.75 + Math.random() * 0.4; // 0.75 - 1.15
    }

    // KICK DRUM
    if (this.kickSeq[step] === 1) {
      this.playKick(time, velocity);
    }

    // HI-HAT / GLITCH CLICK
    if (this.hihatSeq[step] === 1) {
      this.playHihat(time, velocity);

      // f61: Glitch Swarm Patternizer (micro rhythmic double hits)
      if (this.suiteFunctions['f61'] && step % 4 === 2 && Math.random() > 0.4) {
        this.playHihat(time + 0.04, velocity * 0.6);
        this.playHihat(time + 0.08, velocity * 0.4);
      }
    }

    // MELODIC BASS
    if (this.bassSeq[step] === 1) {
      let freq = this.bassFreqs[step % this.bassFreqs.length];
      
      // f59: Microtonal Tuning Matrix (432Hz pitch shift)
      if (this.suiteFunctions['f59']) {
        freq = freq * (432 / 440);
      }

      this.playBass(freq, time, step, velocity);
    }

    // SYNTH ARPEGGIATOR
    if (this.synthSeq[step] === 1) {
      let index = (step * 3) % this.synthFreqs.length;
      let freq = this.synthFreqs[index];

      // f54: AI Chord Substituter (advanced modal chords)
      if (this.suiteFunctions['f54']) {
        const substituteFreqs = [392.00, 493.88, 587.33, 659.25, 783.99, 880.00]; // Complex jazz notes G4, B4, D5, E5, G5, A5
        freq = substituteFreqs[step % substituteFreqs.length];
      }

      // f59: Microtonal Tuning Matrix
      if (this.suiteFunctions['f59']) {
        freq = freq * (432 / 440);
      }

      this.playSynth(freq, time, velocity);
    }
  }

  private playKick(time: number, velocity: number = 1.0) {
    if (!this.audioCtx) return;
    
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.connect(gain);
    
    // f65: Valve & Tape Warmth (WaveShaper distortion/saturation)
    if (this.suiteFunctions['f65']) {
      const shaper = this.audioCtx.createWaveShaper();
      const curve = new Float32Array(44100);
      for (let i = 0; i < 44100; ++i) {
        const x = (i * 2) / 44100 - 1;
        curve[i] = Math.tanh(x * 2.5); // Warm saturation
      }
      shaper.curve = curve;
      gain.connect(shaper);
      if (this.masterGain) shaper.connect(this.masterGain);
      else shaper.connect(this.audioCtx.destination);
    } else {
      if (this.masterGain) gain.connect(this.masterGain);
      else gain.connect(this.audioCtx.destination);
    }
    
    // f51: Neuro-Transient Shaper
    const isTransientShaper = this.suiteFunctions['f51'];
    const kickFreq = isTransientShaper ? 190 : 150;
    const kickDecay = isTransientShaper ? 0.18 : 0.3;
    const kickGain = isTransientShaper ? 1.35 * velocity : 1.0 * velocity;

    osc.frequency.setValueAtTime(kickFreq, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + kickDecay);
    
    gain.gain.setValueAtTime(kickGain, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + kickDecay);
    
    // f70: Look-Ahead Dynamic Limiter
    if (this.suiteFunctions['f70']) {
      gain.gain.setValueAtTime(Math.min(kickGain, 1.0), time);
    }

    osc.start(time);
    osc.stop(time + kickDecay);
  }

  private playHihat(time: number, velocity: number = 1.0) {
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'triangle';
    
    // f56: Neural De-Esser (Filters harsh sibilance)
    if (this.suiteFunctions['f56']) {
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(6000, time); // smoother, less harsh high end
      filter.Q.setValueAtTime(1.5, time);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    if (this.masterGain) gain.connect(this.masterGain);
    else gain.connect(this.audioCtx.destination);
    
    osc.frequency.setValueAtTime(10000, time);
    
    const hVolume = 0.15 * velocity;
    gain.gain.setValueAtTime(hVolume, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    
    osc.start(time);
    osc.stop(time + 0.05);
  }

  private playBass(frequency: number, time: number, step: number, velocity: number = 1.0) {
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const lowpass = this.audioCtx.createBiquadFilter();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, time);
    
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(200, time);
    
    osc.connect(lowpass);
    lowpass.connect(gain);
    if (this.masterGain) gain.connect(this.masterGain);
    else gain.connect(this.audioCtx.destination);
    
    // f55: Dynamic Sidechain Masker (duck bass when kick hits on quarter notes)
    let bVolume = 0.5 * velocity;
    if (this.suiteFunctions['f55'] && (step % 4 === 0)) {
      bVolume = 0.1 * velocity; // heavy sidechain ducking
    }

    gain.gain.setValueAtTime(0.0, time);
    gain.gain.linearRampToValueAtTime(bVolume, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
    
    osc.start(time);
    osc.stop(time + 0.25);

    // f52: Sub-Harmonic Synthesizer (deep sub below 40Hz)
    if (this.suiteFunctions['f52']) {
      const subOsc = this.audioCtx.createOscillator();
      const subGain = this.audioCtx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(frequency / 2, time); // One octave down
      
      subGain.gain.setValueAtTime(0.0, time);
      subGain.gain.linearRampToValueAtTime(0.35, time + 0.04);
      subGain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
      
      subOsc.connect(subGain);
      if (this.masterGain) subGain.connect(this.masterGain);
      else subGain.connect(this.audioCtx.destination);
      
      subOsc.start(time);
      subOsc.stop(time + 0.25);
    }
  }

  private playSynth(frequency: number, time: number, velocity: number = 1.0) {
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const delay = this.audioCtx.createDelay();
    const delayGain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();
    
    osc.type = 'sine';
    
    // f67: Vintage Analog Drift (slight detuning modulation)
    let finalFreq = frequency;
    if (this.suiteFunctions['f67']) {
      const driftAmount = 1.0 + (Math.sin(time * 8) * 0.005); // 0.5% organic pitch float
      finalFreq = frequency * driftAmount;
    }
    osc.frequency.setValueAtTime(finalFreq, time);
    
    // f60: Dynamic Automation Gen (modulating filter sweep)
    filter.type = 'lowpass';
    const cutoff = this.suiteFunctions['f60'] 
      ? 600 + Math.sin(time * 6) * 400  // automatic LFO
      : 1500;
    filter.frequency.setValueAtTime(cutoff, time);

    osc.connect(filter);
    filter.connect(gain);

    // f53: 3D Binaural Head-Tracker (Psychoacoustic stereofield panning)
    if (this.suiteFunctions['f53'] && this.audioCtx.createStereoPanner) {
      const panner = this.audioCtx.createStereoPanner();
      const panSpeed = Math.sin(time * 3); // rapid 3D orbit
      panner.pan.setValueAtTime(panSpeed, time);
      gain.connect(panner);
      if (this.masterGain) panner.connect(this.masterGain);
      else panner.connect(this.audioCtx.destination);
    } else {
      if (this.masterGain) gain.connect(this.masterGain);
      else gain.connect(this.audioCtx.destination);
    }
    
    const sVolume = 0.25 * velocity;
    // Soft volume envelope
    gain.gain.setValueAtTime(0.0, time);
    gain.gain.linearRampToValueAtTime(sVolume, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    
    // f68: Neural Re-Reverberation & f69: Intelligent De-Reverb
    let delayFeedback = 0.35;
    let delayLength = 0.18;
    if (this.suiteFunctions['f68']) {
      delayFeedback = 0.70; // Cathedral scale reverberation
      delayLength = 0.28;
    } else if (this.suiteFunctions['f69']) {
      delayFeedback = 0.08; // extremely dry room echo cancellation
      delayLength = 0.05;
    }

    // Simple echo effect
    delay.delayTime.setValueAtTime(delayLength, time);
    delayGain.gain.setValueAtTime(delayFeedback, time);
    
    gain.connect(delay);
    delay.connect(delayGain);
    if (this.masterGain) delayGain.connect(this.masterGain);
    else delayGain.connect(this.audioCtx.destination);
    
    osc.start(time);
    osc.stop(time + 0.35);
  }
}

export default MinimalSynthEngine;
