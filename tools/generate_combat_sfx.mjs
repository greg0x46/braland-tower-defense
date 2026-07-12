#!/usr/bin/env node
/**
 * Gera os quatro efeitos sonoros padrão de combate (ataque, impacto, derrota e
 * vazamento) como WAV PCM 16-bit mono.
 *
 * Determinístico por construção: o ruído vem de um LCG com semente fixa, nunca de
 * `Math.random()`. Rodar de novo produz byte a byte o mesmo arquivo — regenerar um
 * asset não vira um diff falso no git nem muda o que o playtest ouviu.
 *
 * Estes sons são placeholders **substituíveis** (Constitution XI): o jogo os
 * referencia por `cacheKey` no catálogo (`src/data/audio.ts`), então trocar por arte
 * final é sobrescrever o arquivo — nenhuma regra de combate muda.
 *
 * Uso: `npm run generate:combat-sfx`
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 44100;
const PEAK = 0.9;
const FADE_IN_SEC = 0.003;
const FADE_OUT_SEC = 0.015;

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'audio');

/** Ruído branco determinístico (LCG numérico clássico). */
function noiseSource(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return (state / 0xffffffff) * 2 - 1;
  };
}

/** Renderiza `durationSec` chamando `voice(t)` uma vez por amostra, em ordem. */
function render(durationSec, voice) {
  const total = Math.round(durationSec * SAMPLE_RATE);
  const samples = new Float64Array(total);
  for (let i = 0; i < total; i++) samples[i] = voice(i / SAMPLE_RATE);
  return samples;
}

/** Rampas curtas nas bordas: sem elas, o corte seco vira um clique audível. */
function shape(samples) {
  const fadeIn = Math.max(1, Math.round(FADE_IN_SEC * SAMPLE_RATE));
  const fadeOut = Math.max(1, Math.round(FADE_OUT_SEC * SAMPLE_RATE));

  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const gain = peak === 0 ? 0 : PEAK / peak;

  const shaped = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const toEnd = samples.length - 1 - i;
    const edge = Math.min(1, (i + 1) / fadeIn, (toEnd + 1) / fadeOut);
    shaped[i] = samples[i] * gain * edge;
  }
  return shaped;
}

function toWav(samples) {
  const dataBytes = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataBytes);

  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16); // tamanho do bloco fmt
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits por amostra
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataBytes, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  return buffer;
}

const sine = (freq, t) => Math.sin(2 * Math.PI * freq * t);

/** Latido curto: tom caindo + sopro de ar. Precisa cortar a trilha sem estalar. */
function towerAttack() {
  const duration = 0.14;
  const air = noiseSource(0x9e37);
  return render(duration, (t) => {
    const envelope = Math.exp(-t * 26);
    const pitch = 540 - 260 * (t / duration);
    return (sine(pitch, t) * 0.75 + air() * 0.3) * envelope;
  });
}

/** Impacto seco e grave: o som mais repetido da onda, então é o mais curto. */
function enemyImpact() {
  const duration = 0.09;
  const grit = noiseSource(0x51ed);
  return render(duration, (t) => {
    const body = sine(200 - 110 * (t / duration), t) * Math.exp(-t * 40);
    const click = grit() * Math.exp(-t * 190) * 0.55;
    return body * 0.85 + click;
  });
}

/** Derrota: dois blips descendentes — distinguível do impacto por contorno, não por volume. */
function enemyKill() {
  const duration = 0.26;
  const tail = noiseSource(0x2f4b);
  return render(duration, (t) => {
    const step = t < 0.09 ? 0 : 1;
    const freq = step === 0 ? 700 : 430;
    const local = step === 0 ? t : t - 0.09;
    const envelope = Math.exp(-local * 18) * (step === 0 ? 1 : 0.9);
    const tone = sine(freq, t) * 0.8 + sine(freq * 2, t) * 0.2;
    return tone * envelope + tail() * Math.exp(-t * 30) * 0.08;
  });
}

/** Alerta de vazamento: duas notas alternadas, longo o bastante para furar a mistura. */
function enemyLeak() {
  const duration = 0.46;
  return render(duration, (t) => {
    const high = t % 0.16 < 0.08;
    const freq = high ? 520 : 390;
    const tone = sine(freq, t) * 0.7 + sine(freq * 1.5, t) * 0.3;
    const envelope = Math.min(1, t * 40) * Math.exp(-t * 3.2);
    return tone * envelope;
  });
}

const EFFECTS = [
  ['combat-attack-default.wav', towerAttack],
  ['combat-impact-default.wav', enemyImpact],
  ['combat-kill-default.wav', enemyKill],
  ['combat-leak-default.wav', enemyLeak],
];

for (const [fileName, voice] of EFFECTS) {
  const wav = toWav(shape(voice()));
  const path = join(OUT_DIR, fileName);
  writeFileSync(path, wav);
  console.log(`${fileName}: ${wav.length} bytes`);
}
