
// A pure Web Audio API synth for UI sound effects.
// No external assets required.

let audioCtx: AudioContext | null = null;

const getCtx = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

const playTone = (freq: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + duration);
};

export const playHover = () => {
  // High pitch, very short blip
  playTone(800, 'sine', 0.05, 0.05);
};

export const playClick = () => {
  // Lower pitch, punchy square wave
  playTone(400, 'square', 0.1, 0.05);
};

export const playSuccess = () => {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();
  
  // Arpeggio
  const now = ctx.currentTime;
  [440, 554, 659, 880].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + i * 0.1);
    gain.gain.setValueAtTime(0.1, now + i * 0.1);
    gain.gain.linearRampToValueAtTime(0, now + i * 0.1 + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.3);
  });
};

export const playError = () => {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.3);
  
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.3);
};

export const playTypewriterClick = () => {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();

  // Very short, high-passed noise burst for a mechanical "tick"
  const bufferSize = ctx.sampleRate * 0.005; // 5ms
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const gain = ctx.createGain();
  // Very quiet
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.005);

  noise.connect(gain);
  gain.connect(ctx.destination);
  
  noise.start();
};
