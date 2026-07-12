import { AUDIO } from '../core/constants';

/**
 * Catálogo de faixas — dados, não código (Constitution V). Trocar a música é
 * trocar uma entrada aqui.
 *
 * O caminho do arquivo NÃO aparece neste módulo: a faixa é referenciada por
 * `cacheKey`, e só o `MusicManager` conhece o `.mp3` (Constitution XI). Uma faixa
 * ausente deixa o jogo em silêncio, nunca quebrado.
 */
export interface MusicTrack {
  /** Identificador estável do domínio. Nunca o caminho do arquivo. */
  id: string;
  /** Chave no cache de áudio do Phaser. */
  cacheKey: string;
  /** Volume base em [0,1]. */
  defaultVolume: number;
  loop: boolean;
}

export const MUSIC_TRACKS: Record<string, MusicTrack> = {
  sidewaysSamba: {
    id: 'sideways-samba',
    cacheKey: 'bgm-sideways-samba',
    defaultVolume: AUDIO.defaultVolume,
    loop: true,
  },
};

/** A trilha que toca durante a partida. Uma faixa só, em loop (FR-001). */
export const BACKGROUND_TRACK: MusicTrack = MUSIC_TRACKS.sidewaysSamba;
