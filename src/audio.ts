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

/** Papers-style stamp: short stack, louder than a UI blip. */
export function playStamp(): void {
  blip(523, 0.045, 0.07);
  blip(784, 0.08, 0.055);
  blip(1046, 0.15, 0.04);
}

export function playCue(kind: string): void {
  if (kind === "stamp") {
    playStamp();
    return;
  }
  if (kind === "unpaid") {
    blip(196, 0.07, 0.05);
    blip(146, 0.12, 0.04);
    return;
  }
  if (kind === "charging") {
    blip(349, 0.05, 0.03);
    blip(523, 0.1, 0.028);
    return;
  }
  if (kind === "full") {
    blip(698, 0.07, 0.05);
    blip(880, 0.13, 0.04);
    return;
  }
  if (kind === "departing") {
    blip(494, 0.05, 0.04);
    blip(196, 0.16, 0.05);
    return;
  }
  if (kind === "rush") {
    blip(220, 0.07, 0.055);
    blip(277, 0.07, 0.045);
    blip(220, 0.1, 0.04);
    return;
  }
  if (kind === "lounge") {
    blip(392, 0.08, 0.04);
    blip(494, 0.12, 0.032);
    return;
  }
  if (kind === "glare") {
    blip(110, 0.16, 0.04);
    return;
  }
  if (kind === "relax") {
    blip(440, 0.07, 0.035);
    blip(554, 0.12, 0.03);
  }
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
