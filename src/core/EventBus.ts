import Phaser from 'phaser';

/**
 * Barramento de eventos global (singleton) para desacoplar a cena de gameplay
 * (GameScene) do HUD (UIScene) e do estado de partida (GameState).
 */
export const EventBus = new Phaser.Events.EventEmitter();

/** Eventos conhecidos do jogo. Payloads documentados ao lado. */
export const GameEvents = {
  /** money: number — saldo atualizado. */
  MONEY_CHANGED: 'money-changed',
  /** lives: number — vida atualizada. */
  LIVES_CHANGED: 'lives-changed',
  /** wave: number, total: number — onda atual iniciada (total=0: progressão infinita). */
  WAVE_CHANGED: 'wave-changed',
  /** waveActive: boolean — se há onda em andamento (indicador opcional de HUD). */
  WAVE_STATE_CHANGED: 'wave-state-changed',
  /** paused: boolean — estado de pausa global mudou (controla o botão do HUD). */
  PAUSE_STATE_CHANGED: 'pause-state-changed',
  /** towerTypeId: string | null — torre selecionada no HUD para construir. */
  SELECT_TOWER: 'select-tower',
  /** reward: number — inimigo abatido (economia credita dinheiro). */
  ENEMY_KILLED: 'enemy-killed',
  /** (sem payload) — inimigo vazou (chegou ao fim do caminho). */
  ENEMY_LEAKED: 'enemy-leaked',
  /** (sem payload) — vida chegou a zero. */
  GAME_OVER: 'game-over',
} as const;
