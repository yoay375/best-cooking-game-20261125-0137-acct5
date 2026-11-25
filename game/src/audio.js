// Ember & Thyme — the kitchen's voice: tiny WebAudio sounds, made on the
// spot with oscillators and filtered noise. No audio files, no network.

let ctx = null;
let master = null;
let muted = false;
let sizzleNodes = null;

function ensure() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  return ctx;
}

function blip(freq, dur, type, vol, slideTo) {
  if (muted) return;
  const ac = ensure();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
  gain.gain.setValueAtTime(vol || 0.2, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start();
  osc.stop(ac.currentTime + dur + 0.02);
}

function noiseBurst(dur, vol, lowpass) {
  if (muted) return;
  const ac = ensure();
  if (!ac) return;
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass || 2400;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol || 0.25, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start();
}

export const sfx = {
  unlock() {
    ensure();
  },
  setMuted(value) {
    muted = value;
    if (master) master.gain.value = value ? 0 : 0.5;
    if (value) this.stopSizzle();
  },
  isMuted() {
    return muted;
  },
  chop() {
    noiseBurst(0.07, 0.5, 1200);
    blip(180, 0.08, 'triangle', 0.25, 90);
  },
  chopDone() {
    blip(520, 0.09, 'triangle', 0.2);
    blip(780, 0.12, 'triangle', 0.18);
  },
  grab() {
    blip(440, 0.06, 'sine', 0.15, 560);
  },
  plate() {
    blip(660, 0.07, 'sine', 0.18);
    noiseBurst(0.05, 0.15, 3000);
  },
  ding() {
    blip(880, 0.16, 'sine', 0.22);
    blip(1318, 0.28, 'sine', 0.16);
  },
  coin() {
    blip(988, 0.1, 'square', 0.1);
    blip(1319, 0.18, 'square', 0.1);
  },
  burn() {
    blip(220, 0.3, 'sawtooth', 0.15, 110);
  },
  lost() {
    blip(330, 0.25, 'sine', 0.18, 165);
  },
  startSizzle() {
    if (muted || sizzleNodes) return;
    const ac = ensure();
    if (!ac) return;
    const len = ac.sampleRate;
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 5200;
    filter.Q.value = 0.6;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.045, ac.currentTime + 0.4);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
    sizzleNodes = { src, gain };
  },
  stopSizzle() {
    if (!sizzleNodes || !ctx) return;
    const nodes = sizzleNodes;
    sizzleNodes = null;
    nodes.gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    setTimeout(() => {
      try {
        nodes.src.stop();
      } catch (err) {
        // Already stopped; nothing to do.
      }
    }, 300);
  },
};
