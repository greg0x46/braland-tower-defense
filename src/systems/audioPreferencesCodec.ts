import { DEFAULT_PREFERENCES, normalize, type AudioPreferences } from './audioSettings';

/**
 * Serialização das preferências de áudio — regra pura (Constitution IX).
 *
 * **Tolerante por contrato** (P4): a leitura NUNCA lança. JSON inválido, versão
 * desconhecida, campo faltando, tipo errado ou volume fora da faixa caem no
 * default e registram um `console.warn` — falha visível, mas não fatal
 * (Princípio X). Perder a preferência é aborrecimento; travar o boot por causa
 * dela seria bug.
 *
 * A única exceção deliberada é a **chave ausente**: primeira visita não é anomalia,
 * então cai no default *em silêncio*. Avisar aqui seria ruído em todo jogador novo.
 */
export const PREFERENCES_VERSION = 1;

/** O formato em disco. `v` permite migrar depois sem adivinhar. */
export interface StoredPreferences {
  v: number;
  muted: boolean;
  volume: number;
}

export function serialize(prefs: AudioPreferences): StoredPreferences {
  return { v: PREFERENCES_VERSION, muted: prefs.muted, volume: prefs.volume };
}

export function parse(raw: string | null): AudioPreferences {
  // Primeira visita: nada salvo ainda. Não é anomalia — nada de warn.
  if (raw === null) return DEFAULT_PREFERENCES;

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return fallback('conteúdo não é JSON válido');
  }

  if (!isRecord(data)) return fallback('conteúdo não é um objeto');
  if (data.v !== PREFERENCES_VERSION) return fallback(`versão desconhecida (${String(data.v)})`);
  if (typeof data.muted !== 'boolean') return fallback('campo "muted" ausente ou de tipo errado');
  if (typeof data.volume !== 'number') return fallback('campo "volume" ausente ou de tipo errado');

  // Volume fora de [0,1] é clampado, não descartado: a intenção do jogador ainda é
  // legível. `normalize` também garante as invariantes de coerência mudo↔volume.
  return normalize({ muted: data.muted, volume: data.volume });
}

function fallback(reason: string): AudioPreferences {
  console.warn(`[audioPreferences] Preferência salva ignorada (${reason}); usando o padrão.`);
  return DEFAULT_PREFERENCES;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
