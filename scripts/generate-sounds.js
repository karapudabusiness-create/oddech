/**
 * Generuje miękkie sygnały faz pacera (WAV, mono, 22.05 kHz, 16 bit) – bez zewnętrznych licencji.
 * Uruchom: node scripts/generate-sounds.js
 *
 * Motywy:
 *  - bell   – delikatny dzwonek (sinus + alikwoty, wykładnicze wygaszanie)
 *  - breeze – szum jak powiew (filtrowany szum, łagodne narastanie i opadanie)
 *  - tone   – czysty, ciepły ton z wolnym atakiem
 * Każdy motyw: inhale (wyżej), exhale (niżej), end (zakończenie sesji).
 */
const fs = require('fs');
const path = require('path');

const RATE = 22050;
const OUT = path.join(__dirname, '..', 'assets', 'sounds');

function writeWav(file, samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) =>
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2),
  );
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(OUT, file), Buffer.concat([h, data]));
}

const len = (sec) => Math.round(sec * RATE);
/** Krótki fade-in/out, by uniknąć trzasków. */
function declick(s, ms = 8) {
  const n = len(ms / 1000);
  for (let i = 0; i < n && i < s.length; i++) {
    s[i] *= i / n;
    s[s.length - 1 - i] *= i / n;
  }
  return s;
}
function normalize(s, peak) {
  const max = s.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  return s.map((v) => (v / max) * peak);
}

function bell(freq, dur) {
  const s = new Float64Array(len(dur));
  const partials = [
    [1, 1, 2.2],
    [2.01, 0.35, 3.5],
    [3.02, 0.12, 5],
    [4.2, 0.05, 7],
  ];
  for (let i = 0; i < s.length; i++) {
    const t = i / RATE;
    const attack = Math.min(1, t / 0.006);
    for (const [mul, amp, decay] of partials)
      s[i] += amp * Math.sin(2 * Math.PI * freq * mul * t) * Math.exp(-decay * t);
    s[i] *= attack;
  }
  return declick(normalize(Array.from(s), 0.5));
}

function tone(freq, dur, glide = 0) {
  const s = [];
  let phase = 0;
  for (let i = 0; i < len(dur); i++) {
    const t = i / RATE;
    const f = freq * (1 + glide * (t / dur));
    phase += (2 * Math.PI * f) / RATE;
    const env = Math.sin(Math.PI * Math.min(1, t / dur)) ** 1.5; // łagodne narastanie i opadanie
    s.push(env * (Math.sin(phase) + 0.15 * Math.sin(2 * phase)));
  }
  return declick(normalize(s, 0.42));
}

function breeze(dur, bright, rising) {
  // Szum różowawy przez prosty filtr dolnoprzepustowy o zmiennej częstotliwości.
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  const s = [];
  let lp = 0;
  let lp2 = 0;
  for (let i = 0; i < len(dur); i++) {
    const t = i / RATE;
    const x = t / dur;
    const sweep = rising ? x : 1 - x;
    const cutoff = bright * (0.35 + 0.65 * sweep);
    const a = Math.min(0.99, (2 * Math.PI * cutoff) / RATE);
    lp += a * (rnd() - lp);
    lp2 += a * (lp - lp2);
    const env = Math.sin(Math.PI * x) ** 2;
    s.push(lp2 * env);
  }
  return declick(normalize(s, 0.38));
}

fs.mkdirSync(OUT, { recursive: true });
const C5 = 523.25;
const G4 = 392.0;
const E5 = 659.25;

writeWav('bell-inhale.wav', bell(E5, 1.4));
writeWav('bell-exhale.wav', bell(G4, 1.6));
writeWav('bell-end.wav', [
  ...bell(C5, 0.5).slice(0, len(0.35)),
  ...bell(E5, 0.5).slice(0, len(0.35)),
  ...bell(C5 * 1.5, 2.0),
]);

writeWav('tone-inhale.wav', tone(440, 0.9, 0.06));
writeWav('tone-exhale.wav', tone(330, 1.0, -0.06));
writeWav('tone-end.wav', [...tone(392, 0.6), ...tone(523.25, 1.2)]);

writeWav('breeze-inhale.wav', breeze(1.2, 2400, true));
writeWav('breeze-exhale.wav', breeze(1.4, 1600, false));
writeWav('breeze-end.wav', [...breeze(1.0, 2000, true), ...breeze(1.6, 1400, false)]);

console.log('Wygenerowano dźwięki w', OUT);
