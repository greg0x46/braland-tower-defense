/**
 * Adaptador de armazenamento persistente, atrás de uma interface.
 *
 * A abstração existe por duas razões concretas — não por gosto de abstrair
 * (Princípio VI):
 *
 * 1. O `localStorage` **lança exceção** no Safari em modo privado, e pode lançar
 *    por cota cheia em qualquer navegador. Um `try/catch` isolado aqui impede que
 *    uma preferência de áudio derrube o boot do jogo.
 * 2. O Vitest deste projeto roda em `environment: 'node'`, sem DOM. As regras que
 *    leem e escrevem preferência precisam de um storage falso para serem testadas.
 */
export interface PreferenceStorage {
  read(key: string): string | null;
  write(key: string, value: string): void;
}

/**
 * O storage real. Toda falha vira `warn` e o jogo segue no default: perder a
 * persistência é aborrecimento; travar a partida por causa dela seria bug (P4).
 */
export const localStorageAdapter: PreferenceStorage = {
  read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`[preferenceStorage] Não foi possível ler "${key}"; usando o padrão.`, error);
      return null;
    }
  },

  write(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn(
        `[preferenceStorage] Não foi possível salvar "${key}"; a escolha não será lembrada.`,
        error,
      );
    }
  },
};
