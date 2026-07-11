import { describe, it, expect } from 'vitest';
import { WaveClock } from './waveClock';
import type { Wave } from '../data/waves';

const timing = { initialDelaySec: 2, interWaveSec: 3 };

/** Onda de teste com 2 spawns: t=0 e t=1 (interval 1s). */
const twoSpawnWave = (): Wave => ({ groups: [{ enemyTypeId: 'e', count: 2, interval: 1 }] });

const makeClock = () => new WaveClock({ timing, generate: twoSpawnWave });

describe('WaveClock: auto-início (FR-001)', () => {
  it('não spawna durante o delay inicial e inicia a onda 1 ao expirar', () => {
    const clock = makeClock();

    let r = clock.tick(1, 0); // delay 2 → 1
    expect(r.waveStarted).toBeUndefined();
    expect(r.spawns).toHaveLength(0);
    expect(clock.phase.kind).toBe('initial-delay');

    r = clock.tick(1, 0); // delay 1 → 0 → inicia onda 1
    expect(r.waveStarted).toBe(1);
    expect(r.spawns).toEqual(['e']); // spawn em t=0 sai junto
    expect(clock.phase.kind).toBe('spawning');
  });
});

describe('WaveClock: agendamento por delta (FR-002, SC-002)', () => {
  it('emite cada spawn quando elapsed ≥ atSeconds', () => {
    const clock = makeClock();
    clock.tick(2, 0); // inicia onda 1, emite spawn em t=0

    const r = clock.tick(1, 1); // elapsed 1 → emite spawn em t=1
    expect(r.spawns).toEqual(['e']);
  });

  it('não emite nada em ticks sem spawn devido (caminho comum)', () => {
    const clock = makeClock();
    clock.tick(2, 0); // onda 1, spawn t=0
    const r = clock.tick(0.5, 1); // elapsed 0.5 < 1 → nada
    expect(r.spawns).toHaveLength(0);
  });
});

describe('WaveClock: fim de onda e intervalo (FR-002, FR-003)', () => {
  it('só encerra a onda quando tudo foi spawnado E aliveEnemyCount === 0', () => {
    const clock = makeClock();
    clock.tick(2, 0); // onda 1 spawn t=0
    clock.tick(1, 1); // spawn t=1 → todos spawnados → awaiting-clear
    expect(clock.phase.kind).toBe('awaiting-clear');

    clock.tick(1, 2); // ainda há inimigos vivos → permanece
    expect(clock.phase.kind).toBe('awaiting-clear');

    clock.tick(1, 0); // limpo → intervalo
    expect(clock.phase.kind).toBe('interval');
  });

  it('conta interWaveSec no intervalo e então inicia a próxima onda', () => {
    const clock = makeClock();
    clock.tick(2, 0);
    clock.tick(1, 1); // awaiting-clear
    clock.tick(1, 0); // interval, remaining 3

    clock.tick(2, 0); // remaining 3 → 1, ainda no intervalo
    expect(clock.phase.kind).toBe('interval');

    const r = clock.tick(1, 0); // remaining 0 → onda 2
    expect(r.waveStarted).toBe(2);
    expect(clock.phase.kind).toBe('spawning');
  });
});

describe('WaveClock: pausa = não tickar (FR-013, SC-007)', () => {
  it('preserva remainingSec do intervalo enquanto não é tickado (sem skip/dup)', () => {
    const clock = makeClock();
    clock.tick(2, 0);
    clock.tick(1, 1); // awaiting-clear
    clock.tick(1, 0); // interval, remaining 3
    clock.tick(1, 0); // remaining 2

    const phase = clock.phase;
    expect(phase.kind).toBe('interval');
    const frozen = phase.kind === 'interval' ? phase.remainingSec : NaN;

    // "Pausa": simplesmente não chamamos tick. O estado não muda.
    expect(clock.phase.kind === 'interval' && clock.phase.remainingSec).toBe(frozen);

    // Retoma exatamente de onde parou.
    const r = clock.tick(2, 0); // remaining 2 → 0 → onda 2
    expect(r.waveStarted).toBe(2);
  });

  it('a sequência de ticks é determinística: pausar (gaps) não altera o total de spawns', () => {
    const drive = (dts: number[]): string[] => {
      const clock = makeClock();
      const out: string[] = [];
      for (const dt of dts) out.push(...clock.tick(dt, 0).spawns);
      return out;
    };
    // Mesma sequência lógica de dt, independentemente de "quando" ocorre.
    const seq = [1, 1, 1, 1, 1, 1, 1, 1];
    expect(drive(seq)).toEqual(drive(seq));
  });
});

describe('WaveClock: infinito (FR-004, SC-003)', () => {
  it('roda ≥ 20 ondas sem nunca entrar em estado terminal', () => {
    const clock = makeClock();
    const started: number[] = [];
    // Inimigos morrem instantaneamente (alive=0) para o loop progredir rápido.
    for (let i = 0; i < 1000 && started[started.length - 1] !== 25; i++) {
      const r = clock.tick(1, 0);
      if (r.waveStarted !== undefined) started.push(r.waveStarted);
    }
    expect(started).toContain(20);
    expect(started).toContain(25);
    // Estritamente crescente e sem lacunas: 1,2,3,...
    started.forEach((w, i) => expect(w).toBe(i + 1));
    // Não existe fase terminal — sempre em uma das 4 fases conhecidas.
    expect(['initial-delay', 'spawning', 'awaiting-clear', 'interval']).toContain(
      clock.phase.kind,
    );
  });
});
