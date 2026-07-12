import { GameEvents, emitGameEvent, onGameEvent } from './EventBus';
import { STARTING_MONEY, STARTING_LIVES } from './constants';
import {
  INITIAL_MATCH_STATE,
  advancesGameplay,
  canBuild,
  canToggleFlow,
  hasStarted,
  isDefeated,
  transition,
  type MatchAction,
  type MatchState,
} from '../systems/matchProgression';

/**
 * Estado central da partida: economia, vida, onda e o estado do contrato de
 * progressão. Toda mutação passa por aqui e emite eventos tipados para o HUD.
 *
 * O ciclo de vida (setup → jogando → pausado → derrota) vive em
 * `systems/matchProgression.ts`. Ações inválidas para o estado atual são
 * rejeitadas pela máquina de estados, não por `if`s espalhados pelas cenas.
 *
 * Economia e vida reagem ao gameplay por evento (ENEMY_KILLED / ENEMY_LEAKED):
 * a GameScene anuncia o que aconteceu, o estado decide o que isso custa.
 */
class GameStateManager {
  private _money = STARTING_MONEY;
  private _lives = STARTING_LIVES;
  private _wave = 0;
  private _state: MatchState = INITIAL_MATCH_STATE;

  constructor() {
    onGameEvent(GameEvents.ENEMY_KILLED, ({ reward }) => this.addMoney(reward));
    onGameEvent(GameEvents.ENEMY_LEAKED, ({ damage }) => this.loseLife(damage));
  }

  reset(): void {
    this._money = STARTING_MONEY;
    this._lives = STARTING_LIVES;
    this._wave = 0;
    this._state = INITIAL_MATCH_STATE;
    emitGameEvent(GameEvents.MONEY_CHANGED, { money: this._money });
    emitGameEvent(GameEvents.LIVES_CHANGED, { lives: this._lives });
    emitGameEvent(GameEvents.WAVE_CHANGED, { wave: this._wave, total: 0 });
    emitGameEvent(GameEvents.MATCH_RESET);
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

  /** Estado da partida no contrato de progressão (fonte de verdade). */
  get state(): MatchState {
    return this._state;
  }

  get isOver(): boolean {
    return isDefeated(this._state);
  }

  /** Gameplay congelado: setup pré-início, pausa ou derrota. */
  get isPaused(): boolean {
    return !advancesGameplay(this._state);
  }

  /** Se a partida já foi iniciada ao menos uma vez (o botão vira Pausar/Continuar). */
  get isStarted(): boolean {
    return hasStarted(this._state);
  }

  /**
   * Construção travada = pausa "cheia" DURANTE a partida. Antes do primeiro
   * Iniciar (setup), o jogador monta a defesa livremente; depois, pausar congela
   * também a construção (FR-005).
   */
  get isBuildLocked(): boolean {
    return !canBuild(this._state);
  }

  /** Se inimigos, torres, projéteis e o relógio de ondas devem avançar. */
  get advancesGameplay(): boolean {
    return advancesGameplay(this._state);
  }

  /**
   * Alterna entre jogar e pausar. No setup, é o clique em "Iniciar". Inerte após
   * a derrota (a tela de fim domina a interação).
   */
  togglePause(): void {
    if (!canToggleFlow(this._state)) return;
    this.apply(advancesGameplay(this._state) ? 'pause' : this.resumeAction());
  }

  /** Define a pausa; emite PAUSE_STATE_CHANGED apenas quando o estado muda. */
  setPaused(value: boolean): void {
    if (value === this.isPaused) return;
    this.apply(value ? 'pause' : this.resumeAction());
  }

  private resumeAction(): MatchAction {
    return hasStarted(this._state) ? 'resume' : 'start';
  }

  /** Aplica a ação; transição inválida preserva o estado e não emite evento. */
  private apply(action: MatchAction): void {
    const next = transition(this._state, action);
    if (next === null || next === this._state) return;
    this._state = next;
    emitGameEvent(GameEvents.PAUSE_STATE_CHANGED, {
      paused: this.isPaused,
      started: this.isStarted,
    });
  }

  canAfford(cost: number): boolean {
    return this._money >= cost;
  }

  /** Debita se houver saldo. Compra sem saldo não altera nada nem emite evento. */
  spend(cost: number): boolean {
    if (!this.canAfford(cost)) return false;
    this._money -= cost;
    emitGameEvent(GameEvents.MONEY_CHANGED, { money: this._money });
    return true;
  }

  addMoney(amount: number): void {
    this._money += amount;
    emitGameEvent(GameEvents.MONEY_CHANGED, { money: this._money });
  }

  setWave(wave: number, total: number): void {
    this._wave = wave;
    emitGameEvent(GameEvents.WAVE_CHANGED, { wave, total });
  }

  /**
   * Aplica dano à base (inimigo vazou). A vida nunca fica negativa; ao zerar,
   * o LIVES_CHANGED sai antes da derrota, para o HUD conseguir mostrar o zero.
   */
  loseLife(amount = 1): void {
    if (this.isOver) return;
    this._lives = Math.max(0, this._lives - amount);
    emitGameEvent(GameEvents.LIVES_CHANGED, { lives: this._lives });
    if (this._lives <= 0) this.defeat();
  }

  private defeat(): void {
    const next = transition(this._state, 'defeat');
    if (next === null) return;
    this._state = next;
    emitGameEvent(GameEvents.MATCH_DEFEATED, { reason: 'lives-depleted' });
  }
}

export const GameState = new GameStateManager();
