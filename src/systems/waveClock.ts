import type { Wave } from '../data/waves';
import { buildSpawnSchedule, type ScheduledSpawn } from './waves';

/**
 * Relógio de ondas — máquina de estados PURA (sem Phaser) que controla auto-início,
 * agendamento de spawns por delta time e o intervalo entre ondas (Constituição
 * VIII/IX). Recebe `dt` e a contagem de inimigos vivos por tick e devolve os
 * eventos daquele tick. A pausa é implementada **não chamando `tick`**: como todo o
 * progresso vive no estado interno, congelar = não avançar; retomar = seguir do
 * mesmo ponto (FR-013), sem onda pulada/duplicada.
 */

export interface WaveTiming {
  /** Segundos antes da onda 1 iniciar. */
  initialDelaySec: number;
  /** Segundos de intervalo entre ondas. */
  interWaveSec: number;
}

/** Fase atual do relógio — união discriminada (Constituição VII). */
export type WaveClockPhase =
  | { kind: 'initial-delay'; remainingSec: number }
  | {
      kind: 'spawning';
      waveIndex: number;
      elapsedSec: number;
      schedule: ScheduledSpawn[];
      nextSpawnCursor: number;
    }
  | { kind: 'awaiting-clear'; waveIndex: number }
  | { kind: 'interval'; nextWaveIndex: number; remainingSec: number };

export interface WaveTickResult {
  /** enemyTypeIds a instanciar neste tick (ordem determinística). */
  spawns: string[];
  /** índice 1-based da onda iniciada agora → HUD. */
  waveStarted?: number;
}

export interface WaveClockConfig {
  timing: WaveTiming;
  /** Injeta `generateWave(index, profile, roster)`. */
  generate: (waveIndex: number) => Wave;
}

export class WaveClock {
  private readonly timing: WaveTiming;
  private readonly generate: (waveIndex: number) => Wave;

  private _phase: WaveClockPhase;

  // Reaproveitados para não alocar no caminho comum (sem spawn) do tick (FR-012).
  private readonly emptySpawns: string[] = [];
  private readonly result: WaveTickResult = { spawns: this.emptySpawns };

  constructor(config: WaveClockConfig) {
    this.timing = config.timing;
    this.generate = config.generate;
    this._phase = { kind: 'initial-delay', remainingSec: config.timing.initialDelaySec };
  }

  /** Leitura da fase (debug/teste). */
  get phase(): WaveClockPhase {
    return this._phase;
  }

  tick(dt: number, aliveEnemyCount: number): WaveTickResult {
    const result = this.result;
    result.spawns = this.emptySpawns;
    result.waveStarted = undefined;

    const phase = this._phase;
    switch (phase.kind) {
      case 'initial-delay': {
        phase.remainingSec -= dt;
        if (phase.remainingSec <= 0) this.startWave(0, result);
        break;
      }
      case 'spawning': {
        phase.elapsedSec += dt;
        this.collectDueSpawns(phase, result);
        if (phase.nextSpawnCursor >= phase.schedule.length) {
          this._phase = { kind: 'awaiting-clear', waveIndex: phase.waveIndex };
        }
        break;
      }
      case 'awaiting-clear': {
        if (aliveEnemyCount === 0) {
          this._phase = {
            kind: 'interval',
            nextWaveIndex: phase.waveIndex + 1,
            remainingSec: this.timing.interWaveSec,
          };
        }
        break;
      }
      case 'interval': {
        phase.remainingSec -= dt;
        if (phase.remainingSec <= 0) this.startWave(phase.nextWaveIndex, result);
        break;
      }
    }
    return result;
  }

  /** Inicia a onda `waveIndex`, emitindo os spawns devidos em t=0 no mesmo tick. */
  private startWave(waveIndex: number, result: WaveTickResult): void {
    const schedule = buildSpawnSchedule(this.generate(waveIndex));
    const phase: WaveClockPhase = {
      kind: 'spawning',
      waveIndex,
      elapsedSec: 0,
      schedule,
      nextSpawnCursor: 0,
    };
    this._phase = phase;
    result.waveStarted = waveIndex + 1;
    this.collectDueSpawns(phase, result);
    if (phase.nextSpawnCursor >= schedule.length) {
      this._phase = { kind: 'awaiting-clear', waveIndex };
    }
  }

  /** Emite em `result.spawns` todos os inimigos cujo `atSeconds ≤ elapsedSec`. */
  private collectDueSpawns(
    phase: Extract<WaveClockPhase, { kind: 'spawning' }>,
    result: WaveTickResult,
  ): void {
    const { schedule } = phase;
    let cursor = phase.nextSpawnCursor;
    if (cursor >= schedule.length || schedule[cursor].atSeconds > phase.elapsedSec) return;

    const spawns: string[] = [];
    while (cursor < schedule.length && schedule[cursor].atSeconds <= phase.elapsedSec) {
      spawns.push(schedule[cursor].enemyTypeId);
      cursor++;
    }
    phase.nextSpawnCursor = cursor;
    result.spawns = spawns;
  }
}
