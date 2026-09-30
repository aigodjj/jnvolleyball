// Tiny WebAudio chiptune SFX (no asset files needed)
let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(m: boolean) {
  muted = m;
}
export function isMuted() {
  return muted;
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  getCtx();
}

function tone(type: OscillatorType, f0: number, f1: number, dur: number, vol = 0.12, delay = 0) {
  const c = getCtx();
  if (!c || muted) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.15) {
  const c = getCtx();
  if (!c || muted) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  const g = c.createGain();
  g.gain.value = vol;
  src.buffer = buf;
  src.connect(g).connect(c.destination);
  src.start();
}

export function sfx(name: string) {
  switch (name) {
    case "jump":
      tone("square", 280, 620, 0.12, 0.05);
      break;
    case "swing":
      tone("triangle", 500, 200, 0.08, 0.04);
      break;
    case "hit":
      tone("square", 520, 240, 0.09, 0.1);
      break;
    case "spike":
      noise(0.14, 0.18);
      tone("sawtooth", 300, 70, 0.2, 0.14);
      break;
    case "net":
      tone("square", 130, 90, 0.1, 0.1);
      break;
    case "wall":
      tone("triangle", 330, 260, 0.05, 0.06);
      break;
    case "serve":
      tone("square", 660, 880, 0.08, 0.07);
      break;
    case "score":
      tone("square", 392, 392, 0.1, 0.09);
      tone("square", 523, 523, 0.1, 0.09, 0.1);
      tone("square", 659, 659, 0.2, 0.09, 0.2);
      break;
    case "win":
      [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone("square", f, f, 0.16, 0.09, i * 0.15));
      break;
  }
}
