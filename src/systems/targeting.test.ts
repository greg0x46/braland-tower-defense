import { describe, it, expect } from 'vitest';
import { pickMostAdvancedInRange, type Targetable } from './targeting';

function enemy(x: number, distanceTravelled: number, alive = true): Targetable {
  return { x, y: 0, alive, distanceTravelled };
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
