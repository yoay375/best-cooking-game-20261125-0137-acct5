// Taco Truck Fiesta — all sound is synthesised live with WebAudio: short blips for
// picking up and placing, a sizzle burst for the grill, a ding for a served taco, a
// buzz for a wrong order and a little jingle for a combo. No audio files, no network.

export function createAudio() {
  let context = null;
  let muted = false;

  function ensureContext() {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    }
    if (context.state === 'suspended') context.resume();
    return context;
  }

  /** One oscillator note: frequency slides from `from` to `to` over `seconds`. */
  function blip(from, to, seconds, type, gainValue) {
    if (muted) return;
    const audio = ensureContext();
    if (!audio) return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), audio.currentTime + seconds);
    gain.gain.setValueAtTime(gainValue, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + seconds);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + seconds);
  }

  /** Filtered noise, the grill's sizzle. */
  function sizzle(seconds) {
    if (muted) return;
    const audio = ensureContext();
    if (!audio) return;
    const length = Math.floor(audio.sampleRate * seconds);
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 4200;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.25, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    source.start();
  }

  return {
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    /** Unlock audio on the first user gesture; browsers need one before sound plays. */
    unlock() {
      ensureContext();
    },
    pickup() {
      blip(520, 780, 0.09, 'sine', 0.18);
    },
    place() {
      blip(300, 190, 0.1, 'triangle', 0.22);
    },
    sizzle() {
      sizzle(0.5);
    },
    served() {
      blip(660, 660, 0.1, 'sine', 0.2);
      setTimeout(() => blip(880, 880, 0.14, 'sine', 0.2), 90);
    },
    combo() {
      [523, 659, 784, 1047].forEach((note, index) => {
        setTimeout(() => blip(note, note, 0.12, 'triangle', 0.2), index * 80);
      });
    },
    wrong() {
      blip(220, 110, 0.25, 'sawtooth', 0.14);
    },
    left() {
      blip(392, 262, 0.3, 'triangle', 0.16);
    },
    burn() {
      blip(180, 90, 0.3, 'square', 0.1);
    },
    deny() {
      blip(160, 140, 0.08, 'square', 0.08);
    },
    tick() {
      blip(1200, 1200, 0.05, 'square', 0.06);
    },
    over() {
      [392, 330, 262, 196].forEach((note, index) => {
        setTimeout(() => blip(note, note, 0.18, 'triangle', 0.18), index * 140);
      });
    },
  };
}
