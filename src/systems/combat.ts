import { pickMostAdvancedInRange } from './targeting';
import type { AttackArea, AttackBehavior, AttackTarget } from '../data/towers';

/**
 * Resolução de ataque — regra pura de gameplay, sem Phaser (Constitution IX).
 *
 * Este módulo é a resposta ao acoplamento que existia na `Tower`: o dano deixava
 * de ser projétil e virava dano direto **só porque havia um sprite de animação
 * carregado**. Aqui quem decide o efeito é o `kind` do comportamento; a animação
 * pode, no máximo, dizer *quando* aplicar (`visualCuePolicy`). Sem asset, o
 * mesmo comportamento se aplica no tempo de fallback.
 */

export type AttackOutcome<T extends AttackTarget> =
  | { kind: 'none' }
  | { kind: 'projectile'; target: T; damage: number; speed: number }
  | { kind: 'direct'; targets: readonly T[]; damage: number }
  | { kind: 'area'; targets: readonly T[]; damage: number };

export interface Origin {
  readonly x: number;
  readonly y: number;
}

/** Intervalo entre ataques, em segundos. */
export function cooldownSeconds(behavior: AttackBehavior): number {
  return 1 / behavior.cadence;
}

/** O efeito espera a deixa da animação? (Com fallback quando ela não existe.) */
export function appliesOnCue(behavior: AttackBehavior): boolean {
  return behavior.visualCuePolicy === 'onCue';
}

/**
 * Alvo válido = vivo e dentro do alcance. Revalidado antes de aplicar dano, para
 * um alvo que morreu ou vazou durante a animação não ser atingido.
 */
export function isTargetValid(
  behavior: AttackBehavior,
  origin: Origin,
  target: AttackTarget,
): boolean {
  if (!target.alive) return false;
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  return dx * dx + dy * dy <= behavior.range * behavior.range;
}

/** Aplica a regra de alvo do comportamento. */
export function acquireTarget<T extends AttackTarget>(
  behavior: AttackBehavior,
  origin: Origin,
  candidates: readonly T[],
): T | null {
  return pickMostAdvancedInRange(origin.x, origin.y, behavior.range, candidates);
}

/** Alvos dentro da área, do mais avançado para o menos, respeitando `maxTargets`. */
function targetsInArea<T extends AttackTarget>(
  area: AttackArea,
  epicenter: AttackTarget,
  candidates: readonly T[],
): readonly T[] {
  const radiusSq = area.radius * area.radius;
  const hit = candidates.filter((candidate) => {
    if (!candidate.alive) return false;
    const dx = candidate.x - epicenter.x;
    const dy = candidate.y - epicenter.y;
    return dx * dx + dy * dy <= radiusSq;
  });

  hit.sort((a, b) => b.distanceTravelled - a.distanceTravelled);
  return area.maxTargets === undefined ? hit : hit.slice(0, area.maxTargets);
}

/**
 * Decide o que este ataque faz. Retorna uma descrição do efeito — quem aplica
 * (cena, projétil, animação) fica de fora da regra.
 */
export function resolveAttack<T extends AttackTarget>(
  behavior: AttackBehavior,
  origin: Origin,
  candidates: readonly T[],
): AttackOutcome<T> {
  const target = acquireTarget(behavior, origin, candidates);
  if (!target) return { kind: 'none' };

  switch (behavior.kind) {
    case 'projectile':
      return {
        kind: 'projectile',
        target,
        damage: behavior.damage,
        speed: behavior.projectileSpeed ?? 0,
      };

    case 'direct':
      return { kind: 'direct', targets: [target], damage: behavior.damage };

    case 'area': {
      if (!behavior.area) return { kind: 'none' };
      return {
        kind: 'area',
        targets: targetsInArea(behavior.area, target, candidates),
        damage: behavior.damage,
      };
    }
  }
}
