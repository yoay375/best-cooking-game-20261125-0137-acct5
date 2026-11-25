// Smokehouse BBQ — every sound is cooked up live with WebAudio: a soft pop for
// grabbing, a thud for setting down, a crackle for the smoker, a bright ding when a
// plate is served, a little fanfare for a streak, a buzz for a wrong plate. There
// are no audio files and no network — the browser synthesises it all.

export function makeSound() {
  let ctx = null;
  let off = false;

  function audioCtx() {
    if (!ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /** One sliding note: an oscillator that glides from `a` Hz to `b` Hz. */
  function note(a, b, secs, shape, vol) {
    if (off) return;
    const ac = audioCtx();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = shape;
    osc.frequency.setValueAtTime(a, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, b), ac.currentTime + secs);
    gain.gain.setValueAtTime(vol, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + secs);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + secs);
  }

  /** Crackling noise, the sound of meat in the smoker. */
  function crackle(secs) {
    if (off) return;
    const ac = audioCtx();
    if (!ac) return;
    const len = Math.floor(ac.sampleRate * secs);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.22, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + secs);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    src.start();
  }

  return {
    get muted() {
      return off;
    },
    toggleMute() {
      off = !off;
      return off;
    },
    /** Browsers want a gesture before sound: call this on the first one. */
    unlock() {
      audioCtx();
    },
    grab() {
      note(440, 660, 0.09, 'sine', 0.18);
    },
    setDown() {
      note(280, 180, 0.1, 'triangle', 0.2);
    },
    smoke() {
      crackle(0.5);
    },
    served() {
      note(700, 700, 0.1, 'sine', 0.2);
      setTimeout(() => note(940, 940, 0.14, 'sine', 0.2), 90);
    },
    streak() {
      [392, 494, 587, 784].forEach((n, i) => {
        setTimeout(() => note(n, n, 0.12, 'triangle', 0.2), i * 80);
      });
    },
    wrong() {
      note(200, 100, 0.25, 'sawtooth', 0.13);
    },
    walkedOff() {
      note(330, 220, 0.3, 'triangle', 0.15);
    },
    burnt() {
      note(160, 80, 0.3, 'square', 0.09);
    },
    deny() {
      note(150, 130, 0.08, 'square', 0.08);
    },
    tick() {
      note(1100, 1100, 0.05, 'square', 0.05);
    },
    finale() {
      [330, 262, 196, 131].forEach((n, i) => {
        setTimeout(() => note(n, n, 0.18, 'triangle', 0.17), i * 140);
      });
    },
  };
}
