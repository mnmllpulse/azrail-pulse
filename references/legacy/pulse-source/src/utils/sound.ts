// Web Audio API Sound Utility for METATRON / Pulse OS
// Implements futuristic, low-frequency, minimalist cybernetic feedback sounds

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a subtle, high-end hover sound (a low-frequency click or warm sine bump)
 * We use a quick frequency sweep in the low-mids to create a tactile physical-button feel
 */
export function playHoverSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    // Deep warm pulse: 140Hz sliding down rapidly to 80Hz
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, now);

    // Ultra short decay so it acts as a subtle tactile bump
    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  } catch (e) {
    console.warn('Audio Context error on hover play:', e);
  }
}

/**
 * Play an immersive low-frequency module activation sound (sub-bass drop / cyberthud)
 */
export function playActivationSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Sub oscillator (low fundamental)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    
    // Harmonic helper (for audible presence)
    const midOsc = ctx.createOscillator();
    const midGain = ctx.createGain();

    const lowpass = ctx.createBiquadFilter();

    subOsc.type = 'triangle'; // Richer in low-end harmonics than sine
    subOsc.frequency.setValueAtTime(90, now);
    subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.45);

    midOsc.type = 'sine';
    midOsc.frequency.setValueAtTime(180, now);
    midOsc.frequency.exponentialRampToValueAtTime(70, now + 0.35);

    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(120, now);
    lowpass.frequency.linearRampToValueAtTime(60, now + 0.4);

    // Gain Envelopes
    subGain.gain.setValueAtTime(0.0, now);
    subGain.gain.linearRampToValueAtTime(0.4, now + 0.02);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    midGain.gain.setValueAtTime(0.0, now);
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
    console.warn('Audio Context error on activation play:', e);
  }
}
