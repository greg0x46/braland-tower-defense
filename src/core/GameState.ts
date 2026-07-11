import { EventBus, GameEvents } from './EventBus';
import { STARTING_MONEY, STARTING_LIVES } from './constants';

/**
 * Estado central da partida. Toda mutação passa por aqui e emite eventos no
 * EventBus para o HUD reagir. Reinicializado a cada partida via reset().
 */
class GameStateManager {
  private _money = STARTING_MONEY;
  private _lives = STARTING_LIVES;
  private _wave = 0;
  private _over = false;
  /** A partida começa congelada (pausada) até o jogador clicar em Iniciar. */
  private _paused = true;
  /** Marca se a partida já foi iniciada — distingue "Iniciar" de "Continuar". */
  private _started = false;

  reset(): void {
    this._money = STARTING_MONEY;
    this._lives = STARTING_LIVES;
    this._wave = 0;
    this._over = false;
    this._paused = true;
    this._started = false;
    EventBus.emit(GameEvents.MONEY_CHANGED, this._money);
    EventBus.emit(GameEvents.LIVES_CHANGED, this._lives);
    EventBus.emit(GameEvents.WAVE_CHANGED, this._wave, 0);
  }

  get money(): number {
    return this._money;
  }

  get lives(): number {
    return this._lives;
  }

  get wave(): number {
    return this._wave;
  }

  get isOver(): boolean {
    return this._over;
  }

  get isPaused(): boolean {
    return this._paused;
  }

  /** Se a partida já foi iniciada ao menos uma vez (o botão vira Pausar/Continuar). */
  get isStarted(): boolean {
    return this._started;
  }

  /**
   * Construção travada = pausa "cheia" DURANTE a partida. Antes do primeiro
   * Iniciar (setup), o jogador monta a defesa livremente; depois, pausar congela
   * também a construção (FR-010).
   */
  get isBuildLocked(): boolean {
    return this._paused && this._started;
  }

  /**
   * Inverte a pausa. No primeiro despausar, marca a partida como iniciada — é o
   * clique em "Iniciar". Inerte após derrota (a tela de fim domina a interação).
   */
  togglePause(): void {
    this.setPaused(!this._paused);
  }

  /** Define a pausa; emite PAUSE_STATE_CHANGED apenas quando o valor muda. */
  setPaused(value: boolean): void {
    if (this._over || value === this._paused) return;
    this._paused = value;
    if (!value) this._started = true;
    EventBus.emit(GameEvents.PAUSE_STATE_CHANGED, this._paused);
  }

  canAfford(cost: number): boolean {
    return this._money >= cost;
  }

  /** Debita se houver saldo. Retorna true se a compra ocorreu. */
  spend(cost: number): boolean {
    if (!this.canAfford(cost)) return false;
    this._money -= cost;
    EventBus.emit(GameEvents.MONEY_CHANGED, this._money);
    return true;
  }

  addMoney(amount: number): void {
    this._money += amount;
    EventBus.emit(GameEvents.MONEY_CHANGED, this._money);
  }

  setWave(wave: number, total: number): void {
    this._wave = wave;
    EventBus.emit(GameEvents.WAVE_CHANGED, wave, total);
  }

  /** Aplica dano à base (inimigo vazou). Dispara GAME_OVER ao zerar. */
  loseLife(amount = 1): void {
    if (this._over) return;
    this._lives = Math.max(0, this._lives - amount);
    EventBus.emit(GameEvents.LIVES_CHANGED, this._lives);
    if (this._lives <= 0) {
      this._over = true;
      EventBus.emit(GameEvents.GAME_OVER);
    }
  }
}

export const GameState = new GameStateManager();
