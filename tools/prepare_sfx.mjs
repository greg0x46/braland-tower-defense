#!/usr/bin/env node
/**
 * Prepara um efeito sonoro cru para o jogo: recorta a janela útil, mixa para mono,
 * apara o silêncio das pontas, normaliza o pico e regrava o cabeçalho.
 *
 * Existe pelo mesmo motivo que `fix_sprite_sheet.py`: o asset como sai da gravação
 * quase nunca é o asset que o jogo deve carregar. Um efeito de combate precisa ser
 * curto, alto o bastante para ser ouvido sobre a trilha, e começar **na hora** — um
 * silêncio de 0,6 s no começo do arquivo vira som atrasado em relação à ação.
 *
 * Também conserta um cabeçalho comum em gravações feitas via stream, em que o chunk
 * `data` declara um tamanho maior que o arquivo (o encoder não sabia o tamanho final
 * ao escrever o header). Sem isso, o decoder do navegador lê lixo ou recusa.
 *
 * Uso:
 *   node tools/prepare_sfx.mjs <entrada.wav> <saida.wav> [--start 0.66] [--end 0.98]
 *
 * Sem `--start/--end`, usa o arquivo inteiro (ainda aparando o silêncio das pontas).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PEAK = 0.9;
const FADE_IN_SEC = 0.003;
const FADE_OUT_SEC = 0.02;
/** Abaixo disto (relativo ao pico) é silêncio para efeito de aparo. */
const SILENCE_RATIO = 0.015;
/** Respiro antes do primeiro pico: cortar rente come o transiente do ataque. */
const PRE_ROLL_SEC = 0.005;

function parseArgs(argv) {
  const [input, output] = argv;
  const flag = (name) => {
    const at = argv.indexOf(`--${name}`);
    return at === -1 ? undefined : Number(argv[at + 1]);
  };
  if (!input || !output) {
    console.error('uso: node tools/prepare_sfx.mjs <entrada.wav> <saida.wav> [--start s] [--end s]');
    process.exit(1);
  }
  return { input, output, start: flag('start'), end: flag('end') };
}

/**
 * Aceita entrada comprimida (mp3/ogg/m4a) decodificando para PCM antes de processar.
 * Precisa do `ffmpeg` no PATH — só para preparar o asset, nunca em runtime.
 *
 * Decodificar não recupera qualidade: um mp3 de preview continua sendo um preview.
 * O que isso resolve é o outro problema do mp3 num efeito curto — o silêncio que o
 * encoder insere no começo, que aqui é aparado junto com o resto.
 */
function decodeToWav(path) {
  if (path.toLowerCase().endsWith('.wav')) return { path, cleanup: () => {} };

  const decoded = join(tmpdir(), `br-td-sfx-${process.pid}.wav`);
  try {
    execFileSync(
      'ffmpeg',
      ['-hide_banner', '-loglevel', 'error', '-y', '-i', path, '-acodec', 'pcm_s16le', '-ar', '44100', decoded],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );
  } catch (error) {
    throw new Error(
      `falha ao decodificar "${path}" com o ffmpeg (ele está instalado?): ${error.message}`,
    );
  }

  return { path: decoded, cleanup: () => rmSync(decoded, { force: true }) };
}

/** Lê PCM 16-bit, tolerando o `data` com tamanho inflado do encoder em stream. */
function readWav(path) {
  const buf = readFileSync(path);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`${path}: não é um WAV RIFF`);
  }

  let offset = 12;
  let fmt = null;
  let dataOffset = 0;
  let dataLength = 0;

  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);

    if (id === 'fmt ') {
      fmt = {
        format: buf.readUInt16LE(offset + 8),
        channels: buf.readUInt16LE(offset + 10),
        sampleRate: buf.readUInt32LE(offset + 12),
        bits: buf.readUInt16LE(offset + 22),
      };
    } else if (id === 'data') {
      dataOffset = offset + 8;
      // O aperto do cabeçalho quebrado: nunca confie no tamanho declarado.
      dataLength = Math.min(size, buf.length - dataOffset);
    }

    offset += 8 + size + (size % 2);
    if (size === 0 || size > buf.length) break;
  }

  if (!fmt || dataLength === 0) throw new Error(`${path}: sem chunk fmt/data utilizável`);
  if (fmt.format !== 1 || fmt.bits !== 16) {
    throw new Error(`${path}: só PCM 16-bit é suportado (veio format=${fmt.format} bits=${fmt.bits})`);
  }

  const frames = Math.floor(dataLength / (2 * fmt.channels));
  const mono = new Float64Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let c = 0; c < fmt.channels; c++) {
      sum += buf.readInt16LE(dataOffset + (i * fmt.channels + c) * 2) / 32768;
    }
    mono[i] = sum / fmt.channels;
  }

  return { sampleRate: fmt.sampleRate, channels: fmt.channels, samples: mono };
}

function slice(samples, sampleRate, startSec, endSec) {
  const from = startSec === undefined ? 0 : Math.max(0, Math.round(startSec * sampleRate));
  const to =
    endSec === undefined ? samples.length : Math.min(samples.length, Math.round(endSec * sampleRate));
  return samples.slice(from, to);
}

/** Corta o silêncio das pontas, deixando um respiro antes do primeiro transiente. */
function trim(samples, sampleRate) {
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  if (peak === 0) return samples;

  const floor = peak * SILENCE_RATIO;
  let first = samples.findIndex((sample) => Math.abs(sample) > floor);
  let last = samples.length - 1;
  while (last > 0 && Math.abs(samples[last]) <= floor) last--;
  if (first === -1) return samples;

  first = Math.max(0, first - Math.round(PRE_ROLL_SEC * sampleRate));
  return samples.slice(first, last + 1);
}

/** Normaliza o pico e aplica rampas curtas: sem elas, o corte vira clique. */
function shape(samples, sampleRate) {
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const gain = peak === 0 ? 0 : PEAK / peak;

  const fadeIn = Math.max(1, Math.round(FADE_IN_SEC * sampleRate));
  const fadeOut = Math.max(1, Math.round(FADE_OUT_SEC * sampleRate));

  const out = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const toEnd = samples.length - 1 - i;
    const edge = Math.min(1, (i + 1) / fadeIn, (toEnd + 1) / fadeOut);
    out[i] = samples[i] * gain * edge;
  }
  return { samples: out, gain };
}

function writeWav(path, samples, sampleRate) {
  const dataBytes = samples.length * 2;
  const buf = Buffer.alloc(44 + dataBytes);

  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataBytes, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  writeFileSync(path, buf);
  return buf.length;
}

const { input, output, start, end } = parseArgs(process.argv.slice(2));
const decoded = decodeToWav(input);
const source = readWav(decoded.path);
decoded.cleanup();
const windowed = slice(source.samples, source.sampleRate, start, end);
const trimmed = trim(windowed, source.sampleRate);
const { samples, gain } = shape(trimmed, source.sampleRate);
const bytes = writeWav(output, samples, source.sampleRate);

console.log(
  [
    `entrada: ${input} (${source.channels}ch, ${source.sampleRate} Hz, ${(source.samples.length / source.sampleRate).toFixed(3)}s)`,
    `janela:  ${start ?? 0}s → ${end ?? (source.samples.length / source.sampleRate).toFixed(3)}s`,
    `saída:   ${output} (mono, ${(samples.length / source.sampleRate).toFixed(3)}s, ${bytes} bytes, ganho ${gain.toFixed(2)}x)`,
  ].join('\n'),
);
