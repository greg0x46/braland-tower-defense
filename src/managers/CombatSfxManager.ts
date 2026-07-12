import Phaser from 'phaser';
import { AudioSettings } from '../core/AudioSettings';
import {
  GameEvents,
  offGameEvent,
  onGameEvent,
  type CombatAudioEventPayload,
  type GameEventPayloads,
} from '../core/EventBus';
import { COMBAT_SFX_CATALOG, COMBAT_SFX_DEFAULTS, COMBAT_SFX_LIMITS } from '../data/audio';
import { ENEMY_TYPES } from '../data/enemies';
import { TOWER_TYPES } from '../data/towers';
import {
  combatSfxVolume,
  createCombatSfxState,
  decideCombatSfx,
  isWellFormedCombatAudioEvent,
  registerCombatSfxPlayback,
  releaseCombatSfxPlayback,
  resetCombatSfxState,
  resolveCombatSfxEffect,
  soundProfileEffectId,
  type CombatSfxEffect,
  type CombatSfxRequest,
} from '../systems/combatSfx';

/** O que `SoundManager.add()` devolve, qualquer que seja o motor disponível. */
type CombatSound =
  | Phaser.Sound.WebAudioSound
  | Phaser.Sound.HTML5AudioSound
  | Phaser.Sound.NoAudioSound;

/**
 * A cola entre os eventos de combate e o Sound Manager do Phaser — o único módulo
 * que toca efeito de combate (contrato P1), como o `MusicManager` é o único que toca
 * a trilha.
 *
 * Ele é **deliberadamente separado** do MusicManager: a música tem ciclo de vida
 * global (nasce na BootScene e atravessa o restart); o efeito de combate pertence à
 * partida e precisa morrer com ela — senão um som da partida anterior toca por cima
 * da nova (FR-011, contrato P5).
 *
 * O que ele não faz, e não pode passar a fazer (contrato P6): decidir dano,
 * recompensa, vida, mira ou cadência. Ele não importa `GameState`, `Tower`, `Enemy`
 * nem `Projectile` — lê o catálogo de dados, pergunta à regra pura se pode tocar, e
 * obedece. Remover todos os assets de SFX degrada só a apresentação.
 */
export class CombatSfxManager {
  private readonly scene: Phaser.Scene;
  private readonly state = createCombatSfxState();
  /** Sons soando agora. Cada um devolve sua vaga ao terminar (ou ao ser parado). */
  private readonly active = new Map<CombatSound, CombatSfxEffect>();
  /** Chaves já reportadas: uma rajada de eventos não pode virar uma rajada de erros (P4). */
  private readonly loggedFailures = new Set<string>();

  private effectiveVolume = AudioSettings.effectiveVolume;
  private started = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Idempotente: chamar duas vezes não duplica listener (contrato C5). */
  start(): void {
    if (this.started) return;
    this.started = true;

    this.effectiveVolume = AudioSettings.effectiveVolume;

    onGameEvent(GameEvents.COMBAT_AUDIO_EVENT, this.onCombatAudioEvent, this);
    onGameEvent(GameEvents.ENEMY_KILLED, this.onEnemyKilled, this);
    onGameEvent(GameEvents.ENEMY_LEAKED, this.onEnemyLeaked, this);
    onGameEvent(GameEvents.AUDIO_SETTINGS_CHANGED, this.onAudioSettingsChanged, this);
    onGameEvent(GameEvents.MATCH_RESET, this.onMatchReset, this);
  }

  /** Shutdown da cena: sem listener pendurado, sem som atravessando a partida (P5). */
  destroy(): void {
    if (!this.started) return;
    this.started = false;

    offGameEvent(GameEvents.COMBAT_AUDIO_EVENT, this.onCombatAudioEvent, this);
    offGameEvent(GameEvents.ENEMY_KILLED, this.onEnemyKilled, this);
    offGameEvent(GameEvents.ENEMY_LEAKED, this.onEnemyLeaked, this);
    offGameEvent(GameEvents.AUDIO_SETTINGS_CHANGED, this.onAudioSettingsChanged, this);
    offGameEvent(GameEvents.MATCH_RESET, this.onMatchReset, this);

    this.stopActiveSounds();
    resetCombatSfxState(this.state);
    this.loggedFailures.clear();
  }

  // --- Consumo de eventos ---

  private onCombatAudioEvent = (payload: CombatAudioEventPayload): void => {
    // Produtor quebrado (ataque sem torre, dano sem inimigo) tocaria o som padrão e
    // passaria batido. Melhor aparecer uma vez e ser corrigido (Constitution X).
    if (!isWellFormedCombatAudioEvent(payload)) {
      this.logFailureOnce(
        `malformed:${payload.category}`,
        `[CombatSfxManager] Evento de áudio "${payload.category}" sem o tipo do conteúdo; ignorado.`,
      );
      return;
    }

    this.play(payload, payload.occurredAtMs);
  };

  /**
   * Derrota e vazamento reaproveitam os eventos de domínio: o som é efeito colateral
   * de apresentação, e a recompensa/vida continuam com o `GameState` (contrato C3).
   */
  private onEnemyKilled = ({ enemyTypeId }: GameEventPayloads['enemy-killed']): void => {
    this.play({ category: 'enemy-killed', enemyTypeId }, this.sceneNowMs());
  };

  private onEnemyLeaked = ({ enemyTypeId }: GameEventPayloads['enemy-leaked']): void => {
    this.play({ category: 'enemy-leaked', enemyTypeId }, this.sceneNowMs());
  };

  /**
   * Consome o volume efetivo; não recalcula a regra de mudo (P2). Volume 0 precisa
   * calar o que **já está soando** — esperar o próximo evento deixaria o efeito
   * atual terminando depois do mudo.
   */
  private onAudioSettingsChanged = ({
    effectiveVolume,
  }: GameEventPayloads['audio-settings-changed']): void => {
    this.effectiveVolume = effectiveVolume;

    if (effectiveVolume <= 0) {
      this.stopActiveSounds();
      return;
    }

    for (const [sound, effect] of this.active) {
      sound.setVolume(combatSfxVolume(effectiveVolume, effect));
    }
  };

  /** Nova partida: nada da anterior atravessa — nem som tocando, nem janela de throttle. */
  private onMatchReset = (): void => {
    this.stopActiveSounds();
    resetCombatSfxState(this.state);
    this.loggedFailures.clear();
  };

  // --- Reprodução ---

  private play(request: CombatSfxRequest, occurredAtMs: number): void {
    // Mudo: nenhum efeito novo fica audível (SC-004). Sair aqui também evita queimar
    // janela de throttle com som que ninguém ouviria.
    if (this.effectiveVolume <= 0) return;

    // Autoplay ainda travado é espera normal, não falha (P4/D8): sem log, sem fila.
    if (this.scene.sound.locked) return;

    const effectId = soundProfileEffectId(request, TOWER_TYPES, ENEMY_TYPES);
    const effect = resolveCombatSfxEffect(
      COMBAT_SFX_CATALOG,
      COMBAT_SFX_DEFAULTS,
      { category: request.category, effectId },
      this.isLoaded,
    );

    if (!effect) {
      this.logFailureOnce(
        `missing:${request.category}:${effectId ?? 'default'}`,
        `[CombatSfxManager] Nenhum efeito disponível para "${request.category}" ` +
          `(pedido: ${effectId ?? 'padrão da categoria'}); o combate segue em silêncio para este evento.`,
      );
      return;
    }

    const decision = decideCombatSfx(this.state, effect, occurredAtMs, COMBAT_SFX_LIMITS);
    // Evento suprimido é comportamento esperado numa onda intensa: não é erro e não
    // muda gameplay (P3).
    if (decision.kind === 'suppressed') return;

    const sound = this.scene.sound.add(effect.cacheKey, {
      volume: combatSfxVolume(this.effectiveVolume, effect),
    });

    this.active.set(sound, effect);
    registerCombatSfxPlayback(this.state, effect, occurredAtMs);

    sound.once(Phaser.Sound.Events.COMPLETE, () => this.release(sound));
    sound.play();
  }

  /** Devolve a vaga e destrói a instância. Idempotente: parar e completar não contam duas vezes. */
  private release(sound: CombatSound): void {
    const effect = this.active.get(sound);
    if (!effect) return;

    this.active.delete(sound);
    releaseCombatSfxPlayback(this.state, effect);
    sound.destroy();
  }

  private stopActiveSounds(): void {
    // Parar antes de liberar: `release()` destrói a instância, e parar um som já
    // destruído é o caminho para um erro no console por nada.
    for (const sound of [...this.active.keys()]) {
      sound.stop();
      this.release(sound);
    }
  }

  /** O asset carregou? É o que decide se vale tentar o fallback (P1). */
  private isLoaded = (effect: CombatSfxEffect): boolean =>
    this.scene.cache.audio.exists(effect.cacheKey);

  /** Relógio da cena — controlado, e zerado a cada partida (data-model). */
  private sceneNowMs(): number {
    return this.scene.time.now;
  }

  private logFailureOnce(key: string, message: string): void {
    if (this.loggedFailures.has(key)) return;
    this.loggedFailures.add(key);
    console.error(message);
  }
}
