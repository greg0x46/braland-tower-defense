import { AUDIO } from '../core/constants';

/**
 * Coerência entre mudo e volume — regra pura (Constitution IX).
 *
 * Sem Phaser, sem DOM, sem localStorage: só a matemática do estado. O estado
 * guardado é `{ muted, volume }`; o valor entregue ao motor de áudio é
 * **derivado** (`effectiveVolume`), nunca armazenado. É isso que torna o estado
 * inválido "desmutei e continuo sem ouvir nada" irrepresentável (Constitution VII).
 *
 * Invariantes (contrato P1):
 * 1. `volume ∈ [0,1]` sempre — inclusive vindo de storage adulterado.
 * 2. `effectiveVolume === 0` ⟺ `muted === true`.
 * 3. `muted === false` ⟹ `volume > 0`.
 * 4. Nenhuma operação de áudio toca em GameState.
 */
export interface AudioPreferences {
  muted: boolean;
  /** Volume escolhido, em (0,1]. Preservado mesmo quando mudo — é o "volta como estava". */
  volume: number;
}

export const MIN_VOLUME = 0;
export const MAX_VOLUME = 1;

/** Primeira visita: som ligado, no volume base da trilha. */
export const DEFAULT_PREFERENCES: AudioPreferences = {
  muted: false,
  volume: AUDIO.defaultVolume,
};

export function clampVolume(volume: number): number {
  return Math.min(Math.max(volume, MIN_VOLUME), MAX_VOLUME);
}

/** O único valor que chega ao som (contrato C6). */
export function effectiveVolume(prefs: AudioPreferences): number {
  return prefs.muted ? 0 : prefs.volume;
}

/**
 * Inverte o mudo **sem tocar no volume** — desmutar devolve o som no volume em
 * que estava, sem o jogador reajustar nada (P2). Zerar o volume aqui seria o bug
 * clássico desta feature.
 */
export function toggleMute(prefs: AudioPreferences): AudioPreferences {
  return { muted: !prefs.muted, volume: prefs.volume };
}

/**
 * Define o volume aplicando, nesta ordem: clamp → coerência (P3).
 *
 * O caso `v === 0` é o coração do contrato: "slider no mínimo" e "mudo" são o
 * mesmo estado audível, então colapsam em `muted = true` — mas o último volume
 * não-zero é **preservado**, senão o slider engoliria a preferência do jogador.
 *
 * Entrada não-finita (NaN) não corrompe o estado: registra e devolve o atual.
 */
export function setVolume(prefs: AudioPreferences, volume: number): AudioPreferences {
  if (!Number.isFinite(volume)) {
    console.warn(`[audioSettings] Volume inválido ignorado: ${volume}.`);
    return prefs;
  }

  const clamped = clampVolume(volume);
  if (clamped === MIN_VOLUME) {
    return { muted: true, volume: restorableVolume(prefs.volume) };
  }
  // Mexer no slider acima de zero "acorda" o áudio.
  return { muted: false, volume: clamped };
}

/**
 * Força as invariantes sobre um estado de origem duvidosa (storage adulterado,
 * arquivo editado à mão). Volume fora da faixa é clampado; volume zero vira mudo
 * com um volume de retorno audível — nunca `{ muted: false, volume: 0 }`, que
 * violaria as invariantes 2 e 3.
 */
export function normalize(prefs: AudioPreferences): AudioPreferences {
  const volume = Number.isFinite(prefs.volume)
    ? clampVolume(prefs.volume)
    : DEFAULT_PREFERENCES.volume;

  if (volume === MIN_VOLUME) return { muted: true, volume: DEFAULT_PREFERENCES.volume };
  return { muted: prefs.muted, volume };
}

/** Volume ao qual o áudio volta ao desmutar — nunca zero (invariantes 2 e 3). */
function restorableVolume(volume: number): number {
  return volume > MIN_VOLUME ? volume : DEFAULT_PREFERENCES.volume;
}
