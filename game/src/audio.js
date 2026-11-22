// Tiny synthesized sound effects: one oscillator per blip, no audio files, no
// network. Created lazily on the first player gesture so browsers allow it.
export function createSoundBank() {
  let context = null;
  let muted = false;

  function ensureContext() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freqStart, freqEnd, seconds, kind, gainValue) {
    if (muted) return;
    const ctx = ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = kind;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), now + seconds);
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + seconds + 0.02);
  }

  return {
    unlock() {
      ensureContext();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    pickupLoot() {
      tone(660, 990, 0.14, 'sine', 0.12);
      tone(990, 1320, 0.12, 'sine', 0.08);
    },
    vaultOpen() {
      tone(220, 180, 0.2, 'square', 0.06);
      tone(440, 880, 0.25, 'triangle', 0.1);
    },
    alarmTick() {
      tone(1180, 1180, 0.07, 'square', 0.05);
    },
    spotted() {
      tone(300, 620, 0.35, 'sawtooth', 0.09);
    },
    caughtSting() {
      tone(392, 98, 0.7, 'sawtooth', 0.12);
      tone(196, 49, 0.8, 'triangle', 0.1);
    },
    toolPop() {
      tone(520, 240, 0.16, 'triangle', 0.1);
    },
    escapeWin() {
      tone(523, 523, 0.16, 'sine', 0.1);
      tone(659, 659, 0.16, 'sine', 0.1);
      tone(784, 784, 0.3, 'sine', 0.12);
    },
    clickUi() {
      tone(880, 880, 0.05, 'sine', 0.06);
    },
  };
}
