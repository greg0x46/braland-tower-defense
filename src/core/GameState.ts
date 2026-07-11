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

  reset(): void {
    this._money = STARTING_MONEY;
    this._lives = STARTING_LIVES;
    this._wave = 0;
    this._over = false;
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
