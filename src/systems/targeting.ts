/**
 * Seleção de alvo — regra pura de gameplay, sem Phaser (Constitution IX).
 * A assinatura usa primitivos para não alocar no hot path (Constitution III).
 */

/** Qualquer coisa que uma torre possa mirar. Enemy satisfaz estruturalmente. */
export interface Targetable {
  readonly x: number;
  readonly y: number;
  readonly alive: boolean;
  /** Distância total já percorrida no caminho (maior = mais avançado). */
  readonly distanceTravelled: number;
  /** Vida atual usada por regras de alvo que priorizam inimigos resistentes. */
  readonly currentHp: number;
}

/**
 * Retorna o alvo VIVO mais avançado (maior distanceTravelled) dentro do alcance,
 * ou null se nenhum. Compara distância ao quadrado para evitar sqrt.
 */
export function pickMostAdvancedInRange<T extends Targetable>(
  x: number,
  y: number,
  range: number,
  candidates: readonly T[],
): T | null {
  const rangeSq = range * range;
  let best: T | null = null;
  for (const c of candidates) {
    if (!c.alive) continue;
    const dx = c.x - x;
    const dy = c.y - y;
    if (dx * dx + dy * dy > rangeSq) continue;
    if (!best || c.distanceTravelled > best.distanceTravelled) {
      best = c;
    }
  }
  return best;
}

/**
 * Retorna o alvo VIVO com maior vida atual dentro do alcance. Empates favorecem
 * o mais avançado para manter determinismo útil ao jogador.
 */
export function pickHighestCurrentHealthInRange<T extends Targetable>(
  x: number,
  y: number,
  range: number,
  candidates: readonly T[],
): T | null {
  const rangeSq = range * range;
  let best: T | null = null;
  for (const c of candidates) {
    if (!c.alive) continue;
    const dx = c.x - x;
    const dy = c.y - y;
    if (dx * dx + dy * dy > rangeSq) continue;
    if (
      !best ||
      c.currentHp > best.currentHp ||
      (c.currentHp === best.currentHp && c.distanceTravelled > best.distanceTravelled)
    ) {
      best = c;
    }
  }
  return best;
}
