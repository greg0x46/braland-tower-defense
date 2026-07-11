import Phaser from 'phaser';
import { EventBus, GameEvents } from '../core/EventBus';
import { GameState } from '../core/GameState';
import { WAVES } from '../data/waves';
import { buildSpawnSchedule, totalSpawnCount } from '../systems/waves';

/**
 * Controla a progressão das ondas: agenda os spawns de cada onda e detecta o
 * fim da onda (todos spawnados + nenhum inimigo vivo). A última onda limpa
 * dispara GAME_WON. O início de cada onda é pedido pelo HUD (REQUEST_START_WAVE).
 */
export class WaveManager {
  private readonly scene: Phaser.Scene;
  private readonly spawnEnemy: (enemyTypeId: string) => void;
  private readonly getEnemyCount: () => number;

  private waveIndex = -1;
  private waveActive = false;
  private spawnsRemaining = 0;
  private timers: Phaser.Time.TimerEvent[] = [];

  constructor(
    scene: Phaser.Scene,
    spawnEnemy: (enemyTypeId: string) => void,
    getEnemyCount: () => number,
  ) {
    this.scene = scene;
    this.spawnEnemy = spawnEnemy;
    this.getEnemyCount = getEnemyCount;
    EventBus.on(GameEvents.REQUEST_START_WAVE, this.startNextWave, this);
  }

  get isActive(): boolean {
    return this.waveActive;
  }

  get hasMoreWaves(): boolean {
    return this.waveIndex < WAVES.length - 1;
  }

  startNextWave(): void {
    if (this.waveActive || GameState.isOver || !this.hasMoreWaves) return;

    this.waveIndex++;
    this.waveActive = true;
    GameState.setWave(this.waveIndex + 1, WAVES.length);
    EventBus.emit(GameEvents.WAVE_STATE_CHANGED, true);

    const wave = WAVES[this.waveIndex];
    this.spawnsRemaining = totalSpawnCount(wave);

    for (const spawn of buildSpawnSchedule(wave)) {
      const timer = this.scene.time.delayedCall(spawn.atSeconds * 1000, () => {
        if (GameState.isOver) return;
        this.spawnEnemy(spawn.enemyTypeId);
        this.spawnsRemaining--;
      });
      this.timers.push(timer);
    }
  }

  /** Chamado a cada frame por GameScene para detectar o fim da onda. */
  update(): void {
    if (!this.waveActive || GameState.isOver) return;
    if (this.spawnsRemaining > 0 || this.getEnemyCount() > 0) return;

    // Onda limpa.
    this.waveActive = false;
    EventBus.emit(GameEvents.WAVE_STATE_CHANGED, false);

    if (!this.hasMoreWaves) {
      EventBus.emit(GameEvents.GAME_WON);
    }
  }

  destroy(): void {
    EventBus.off(GameEvents.REQUEST_START_WAVE, this.startNextWave, this);
    this.timers.forEach((t) => t.remove(false));
    this.timers = [];
  }
}
