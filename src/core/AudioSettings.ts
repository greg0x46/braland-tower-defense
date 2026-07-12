import { GameEvents, emitGameEvent } from './EventBus';
import { AUDIO } from './constants';
import { localStorageAdapter, type PreferenceStorage } from './preferenceStorage';
import { parse, serialize } from '../systems/audioPreferencesCodec';
import {
  DEFAULT_PREFERENCES,
  effectiveVolume,
  setVolume,
  toggleMute,
  type AudioPreferences,
} from '../systems/audioSettings';

/**
 * Preferência de áudio do jogador (mudo + volume). Espelha o padrão de
 * `GameState`: guarda o estado, delega as decisões às regras puras de
 * `systems/audioSettings.ts` e anuncia mudanças por evento tipado.
 *
 * É um singleton **separado** do `GameState` de propósito: a preferência de áudio
 * tem ciclo de vida maior que o da partida. Amarrá-la ao estado do jogo a faria
 * ser zerada a cada `reset()`, que é o oposto do que FR-007 pede — e acoplaria o
 * áudio à máquina de progressão, que é o que FR-004 proíbe (contrato P6).
 */
class AudioSettingsManager {
  private prefs: AudioPreferences = DEFAULT_PREFERENCES;
  private storage: PreferenceStorage = localStorageAdapter;
  private loaded = false;

  /**
   * Carrega a preferência salva. Precisa rodar **antes** de o som ser criado: é o
   * que garante que uma preferência "mudo" não deixe escapar um instante de música
   * alta antes de silenciar (contrato C6).
   *
   * Idempotente, e tolerante por construção — o parse nunca lança (P4). Anuncia uma
   * vez ao final para o HUD nascer já sincronizado com o que foi carregado (P5).
   */
  load(storage: PreferenceStorage = localStorageAdapter): void {
    if (this.loaded) return;
    this.loaded = true;
    this.storage = storage;

    this.prefs = parse(this.storage.read(AUDIO.storageKey));
    this.announce();
  }

  get muted(): boolean {
    return this.prefs.muted;
  }

  get volume(): number {
    return this.prefs.volume;
  }

  /** O único valor que o motor de áudio consome (contrato C6). */
  get effectiveVolume(): number {
    return effectiveVolume(this.prefs);
  }

  toggleMute(): void {
    this.apply(toggleMute(this.prefs));
  }

  setVolume(volume: number): void {
    this.apply(setVolume(this.prefs, volume));
  }

  /** Aplica, persiste e anuncia — mas só quando o estado muda de fato (contrato P5). */
  private apply(next: AudioPreferences): void {
    if (next.muted === this.prefs.muted && next.volume === this.prefs.volume) return;
    this.prefs = next;
    this.save();
    this.announce();
  }

  /** Falha ao gravar já vira `warn` no adaptador; o jogo segue, só não lembra (P4). */
  private save(): void {
    this.storage.write(AUDIO.storageKey, JSON.stringify(serialize(this.prefs)));
  }

  private announce(): void {
    emitGameEvent(GameEvents.AUDIO_SETTINGS_CHANGED, {
      muted: this.prefs.muted,
      volume: this.prefs.volume,
      effectiveVolume: this.effectiveVolume,
    });
  }
}

export const AudioSettings = new AudioSettingsManager();
