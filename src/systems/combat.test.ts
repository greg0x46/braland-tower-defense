import { describe, expect, it } from 'vitest';
import {
  acquireTarget,
  appliesOnCue,
  cooldownSeconds,
  isTargetValid,
  resolveAttack,
} from './combat';
import { TOWER_TYPES, attackBehaviorOf, type AttackBehavior } from '../data/towers';

/** Alvo mínimo: nenhum Phaser, nenhuma textura (SC-003). */
interface TestTarget {
  id: string;
  x: number;
  y: number;
  alive: boolean;
  distanceTravelled: number;
}

function target(id: string, x: number, distanceTravelled: number, alive = true): TestTarget {
  return { id, x, y: 0, alive, distanceTravelled };
}

const ORIGIN = { x: 0, y: 0 };

const base = {
  targetRule: 'most-advanced-in-range',
  damage: 5,
  range: 100,
  cadence: 2,
} as const;

const PROJECTILE: AttackBehavior = {
  ...base,
  id: 'test-projectile',
  kind: 'projectile',
  visualCuePolicy: 'onImpact',
  projectileSpeed: 400,
};

const DIRECT: AttackBehavior = {
  ...base,
  id: 'test-direct',
  kind: 'direct',
  visualCuePolicy: 'onCue',
};

const AREA: AttackBehavior = {
  ...base,
  id: 'test-area',
  kind: 'area',
  visualCuePolicy: 'none',
  area: { radius: 30 },
};

describe('categorias de ataque', () => {
  it('projectile: cria um projétil contra o alvo mais avançado', () => {
    const outcome = resolveAttack(PROJECTILE, ORIGIN, [target('a', 50, 10), target('b', 60, 90)]);

    expect(outcome).toEqual({
      kind: 'projectile',
      target: expect.objectContaining({ id: 'b' }),
      damage: 5,
      speed: 400,
    });
  });

  it('direct: aplica dano no alvo, sem projétil', () => {
    const outcome = resolveAttack(DIRECT, ORIGIN, [target('a', 50, 10), target('b', 60, 90)]);

    expect(outcome.kind).toBe('direct');
    if (outcome.kind !== 'direct') throw new Error('esperado direct');
    expect(outcome.targets.map((t) => t.id)).toEqual(['b']);
    expect(outcome.damage).toBe(5);
  });

  it('area: atinge todos dentro do raio ao redor do epicentro', () => {
    const outcome = resolveAttack(AREA, ORIGIN, [
      target('epicentro', 60, 90),
      target('perto', 80, 20), // 20 px do epicentro — dentro do raio 30
      target('longe', 10, 50), // 50 px do epicentro — fora
    ]);

    expect(outcome.kind).toBe('area');
    if (outcome.kind !== 'area') throw new Error('esperado area');
    expect(outcome.targets.map((t) => t.id).sort()).toEqual(['epicentro', 'perto']);
  });

  it('area: respeita o teto de alvos, priorizando os mais avançados', () => {
    const limited = { ...AREA, area: { radius: 30, maxTargets: 2 } };
    const outcome = resolveAttack(limited, ORIGIN, [
      target('mais-avancado', 60, 90),
      target('meio', 65, 80),
      target('menos-avancado', 70, 10),
    ]);

    if (outcome.kind !== 'area') throw new Error('esperado area');
    expect(outcome.targets.map((t) => t.id)).toEqual(['mais-avancado', 'meio']);
  });

  it('sem alvo no alcance, nenhum ataque acontece', () => {
    for (const behavior of [PROJECTILE, DIRECT, AREA]) {
      expect(resolveAttack(behavior, ORIGIN, [target('longe', 500, 10)])).toEqual({ kind: 'none' });
    }
  });
});

describe('validacao de alvo', () => {
  it('alvo morto ou vazado nunca recebe dano', () => {
    const dead = target('morto', 50, 90, false);

    expect(isTargetValid(DIRECT, ORIGIN, dead)).toBe(false);
    expect(acquireTarget(DIRECT, ORIGIN, [dead])).toBeNull();
    expect(resolveAttack(DIRECT, ORIGIN, [dead])).toEqual({ kind: 'none' });
  });

  it('alvo fora do alcance nao e valido', () => {
    expect(isTargetValid(DIRECT, ORIGIN, target('longe', 101, 10))).toBe(false);
    expect(isTargetValid(DIRECT, ORIGIN, target('borda', 100, 10))).toBe(true);
  });

  it('area nao inclui alvos mortos no raio', () => {
    const outcome = resolveAttack(AREA, ORIGIN, [
      target('vivo', 60, 90),
      target('morto', 65, 95, false),
    ]);

    if (outcome.kind !== 'area') throw new Error('esperado area');
    expect(outcome.targets.map((t) => t.id)).toEqual(['vivo']);
  });
});

describe('cadencia', () => {
  it('deriva o intervalo entre ataques da cadencia', () => {
    expect(cooldownSeconds(DIRECT)).toBe(0.5);
    expect(cooldownSeconds({ ...DIRECT, cadence: 4 })).toBe(0.25);
  });
});

/**
 * O teste independente da US3: o resultado de gameplay vem do comportamento,
 * nunca da apresentacao.
 */
describe('gameplay independe da apresentacao', () => {
  it('dois ataques visualmente diferentes produzem o mesmo gameplay', () => {
    const comAnimacao: AttackBehavior = { ...DIRECT, id: 'morde-com-animacao', visualCuePolicy: 'onCue' };
    const semAnimacao: AttackBehavior = { ...DIRECT, id: 'morde-sem-animacao', visualCuePolicy: 'none' };
    const enemies = [target('a', 50, 10), target('b', 60, 90)];

    const a = resolveAttack(comAnimacao, ORIGIN, enemies);
    const b = resolveAttack(semAnimacao, ORIGIN, enemies);

    // Só a hora de aplicar difere; o efeito é idêntico.
    expect(a).toEqual(b);
    expect(appliesOnCue(comAnimacao)).toBe(true);
    expect(appliesOnCue(semAnimacao)).toBe(false);
  });

  it('dois ataques visualmente parecidos produzem gameplay diferente', () => {
    const mordida: AttackBehavior = { ...DIRECT, id: 'mordida' };
    const explosao: AttackBehavior = { ...AREA, id: 'explosao', visualCuePolicy: 'onCue' };
    const enemies = [target('epicentro', 60, 90), target('perto', 80, 20)];

    const um = resolveAttack(mordida, ORIGIN, enemies);
    const outro = resolveAttack(explosao, ORIGIN, enemies);

    if (um.kind !== 'direct' || outro.kind !== 'area') throw new Error('kinds inesperados');
    expect(um.targets).toHaveLength(1);
    expect(outro.targets).toHaveLength(2);
  });

  it('adicionar uma categoria nao exige mudar as existentes', () => {
    // As tres categorias coexistem sob o mesmo resolvedor (FR-007).
    const kinds = [PROJECTILE, DIRECT, AREA].map(
      (behavior) => resolveAttack(behavior, ORIGIN, [target('alvo', 50, 10)]).kind,
    );

    expect(kinds).toEqual(['projectile', 'direct', 'area']);
  });
});

describe('contrato de ataque do Vira-lata Caramelo', () => {
  const behavior = attackBehaviorOf(TOWER_TYPES['vira-lata-caramelo']);

  it('e corpo-a-corpo com deixa da animacao', () => {
    expect(behavior.kind).toBe('direct');
    expect(behavior.visualCuePolicy).toBe('onCue');
  });

  it('herda dano, alcance e cadencia dos stats da torre (fonte unica)', () => {
    expect(behavior.damage).toBe(5);
    expect(behavior.range).toBe(120);
    expect(behavior.cadence).toBe(2);
    expect(cooldownSeconds(behavior)).toBe(0.5);
  });

  it('resolve a mordida no alvo mais avancado dentro do alcance', () => {
    const outcome = resolveAttack(behavior, ORIGIN, [
      target('atras', 50, 10),
      target('na-frente', 100, 80),
      target('fora-de-alcance', 200, 999),
    ]);

    if (outcome.kind !== 'direct') throw new Error('esperado direct');
    expect(outcome.targets.map((t) => t.id)).toEqual(['na-frente']);
    expect(outcome.damage).toBe(5);
  });
});
