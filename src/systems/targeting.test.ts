import { describe, it, expect } from 'vitest';
import {
  pickHighestCurrentHealthInRange,
  pickMostAdvancedInRange,
  type Targetable,
} from './targeting';

function enemy(
  x: number,
  distanceTravelled: number,
  alive = true,
  currentHp = 10,
): Targetable {
  return { x, y: 0, alive, distanceTravelled, currentHp };
}

describe('pickMostAdvancedInRange', () => {
  it('retorna null quando não há candidatos', () => {
    expect(pickMostAdvancedInRange(0, 0, 100, [])).toBeNull();
  });

  it('ignora inimigos fora do alcance', () => {
    const far = enemy(200, 50);
    expect(pickMostAdvancedInRange(0, 0, 100, [far])).toBeNull();
  });

  it('inclui inimigo exatamente na borda do alcance', () => {
    const edge = enemy(100, 50);
    expect(pickMostAdvancedInRange(0, 0, 100, [edge])).toBe(edge);
  });

  it('escolhe o mais avançado (maior distanceTravelled) dentro do alcance', () => {
    const behind = enemy(30, 10);
    const ahead = enemy(60, 90);
    expect(pickMostAdvancedInRange(0, 0, 100, [behind, ahead])).toBe(ahead);
  });

  it('nunca mira inimigos mortos, mesmo que mais avançados e no alcance', () => {
    const deadAhead = enemy(20, 999, false);
    const aliveBehind = enemy(20, 5, true);
    expect(pickMostAdvancedInRange(0, 0, 100, [deadAhead, aliveBehind])).toBe(aliveBehind);
  });
});

describe('pickHighestCurrentHealthInRange', () => {
  it('escolhe o inimigo vivo com maior vida atual dentro do alcance', () => {
    const advanced = enemy(30, 100, true, 5);
    const tough = enemy(60, 10, true, 50);

    expect(pickHighestCurrentHealthInRange(0, 0, 100, [advanced, tough])).toBe(tough);
  });

  it('usa progresso como desempate quando a vida atual empata', () => {
    const behind = enemy(30, 10, true, 30);
    const ahead = enemy(60, 90, true, 30);

    expect(pickHighestCurrentHealthInRange(0, 0, 100, [behind, ahead])).toBe(ahead);
  });

  it('ignora mortos e fora de alcance mesmo com vida maior', () => {
    const dead = enemy(20, 999, false, 500);
    const far = enemy(200, 1, true, 400);
    const valid = enemy(40, 2, true, 20);

    expect(pickHighestCurrentHealthInRange(0, 0, 100, [dead, far, valid])).toBe(valid);
  });
});
