import { GameState } from '../core/GameState';
import { WAVE_TIMING } from '../core/constants';
import { PROGRESSION_PROFILE } from '../data/waves';
import { ENEMY_TYPES } from '../data/enemies';
import { generateWave, waveEnemyHp } from '../systems/waves';
import { WaveClock } from '../systems/waveClock';

/**
 * Adaptador fino do `WaveClock` puro. A cada frame repassa o `dt` e a contagem de
 * inimigos vivos ao relógio, spawna os inimigos que ele emite (com o HP já escalado
 * pela onda atual) e atualiza a onda no `GameState`. Não agenda timers do Phaser — o
 * avanço vem só de `GameScene.update`, tornando a pausa trivial (não é chamado).
 */
export class WaveManager {
  private readonly spawnEnemy: (enemyTypeId: string, hp: number) => void;
  private readonly getEnemyCount: () => number;
  private readonly clock: WaveClock;

  /** Índice (0-based) da onda em spawn — dita o HP escalado dos inimigos. */
  private currentWaveIndex = 0;

  constructor(
    spawnEnemy: (enemyTypeId: string, hp: number) => void,
    getEnemyCount: () => number,
  ) {
    this.spawnEnemy = spawnEnemy;
    this.getEnemyCount = getEnemyCount;

    const roster = Object.values(ENEMY_TYPES);
    this.clock = new WaveClock({
      timing: WAVE_TIMING,
      generate: (waveIndex) => generateWave(waveIndex, PROGRESSION_PROFILE, roster),
    });
  }

  /** Chamado por GameScene.update quando NÃO pausado/encerrado. */
  update(dt: number): void {
    const result = this.clock.tick(dt, this.getEnemyCount());

    if (result.waveStarted !== undefined) {
      this.currentWaveIndex = result.waveStarted - 1;
      GameState.setWave(result.waveStarted, 0);
    }

    for (const id of result.spawns) {
      const base = ENEMY_TYPES[id]?.maxHp ?? 0;
      this.spawnEnemy(id, waveEnemyHp(base, this.currentWaveIndex, PROGRESSION_PROFILE));
    }
  }

  destroy(): void {
    // Sem timers/listeners a limpar — o relógio é puro e o loop é dono do avanço.
  }
}
