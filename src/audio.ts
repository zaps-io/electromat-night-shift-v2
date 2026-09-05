let ctx: AudioContext | null = null;

function ac(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function resumeAudio(): void {
  void ac().resume();
}

function blip(freq: number, dur = 0.08, gain = 0.04): void {
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "square";
  o.frequency.value = freq;
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur);
}

export function playOn(): void {
  blip(220, 0.12, 0.05);
  blip(330, 0.16, 0.04);
}

export function playTalk(): void {
  blip(196, 0.07, 0.035);
}

export function playPlug(): void {
  blip(140, 0.1, 0.05);
}

export function playPay(): void {
  blip(392, 0.09, 0.04);
}

let hum: OscillatorNode | null = null;
let humGain: GainNode | null = null;

export function setHum(on: boolean): void {
  const c = ac();
  if (on && !hum) {
    hum = c.createOscillator();
    humGain = c.createGain();
    hum.type = "sine";
    hum.frequency.value = 58;
    humGain.gain.value = 0.012;
    hum.connect(humGain).connect(c.destination);
    hum.start();
  }
  if (!on && hum) {
    hum.stop();
    hum = null;
    humGain = null;
  }
}
