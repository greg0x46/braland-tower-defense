/**
 * Registro de contratos de gameplay aceitos (entidade "Gameplay Contract").
 *
 * Um contrato guarda os valores que o time **aceitou como intencionais** para uma
 * regra crítica — stats de inimigo, torre, perfil de onda, comportamento de ataque
 * ou mapa. Todo teste de regressão de regra deve apontar para um contrato daqui.
 *
 * A consequência prática: se um valor de runtime muda, ou o contrato muda junto
 * (decisão de design, com `reason`/`changedBy`) ou o teste falha. Afrouxar o teste
 * para "passar" é justamente o que este registro existe para impedir.
 */

export type ContractSubject =
  | 'enemy'
  | 'tower'
  | 'wave-profile'
  | 'match-progression'
  | 'attack-behavior'
  | 'map';

export interface GameplayContract<T = Record<string, unknown>> {
  /** Identificador estável, ex.: `enemy.dois-caras-moto.base-stats`. */
  id: string;
  subject: ContractSubject;
  /** Valores canônicos que o runtime deve satisfazer. */
  acceptedValues: T;
  /** Por que estes valores são os aceitos. */
  reason: string;
  /** Referência da mudança quando o contrato é alterado de propósito. */
  changedBy?: string;
}

export const ACCEPTED_CONTRACTS = {
  'enemy.dois-caras-moto.base-stats': {
    id: 'enemy.dois-caras-moto.base-stats',
    subject: 'enemy',
    acceptedValues: { maxHp: 20, speed: 90, reward: 8, radius: 25 },
    reason:
      'A 90 px/s o motoboy passa ~2,3 s dentro do alcance de uma torre bem ' +
      'posicionada (o alcance de 120 px cobre ~208 px de pista). O Caramelo ' +
      'precisa de 2,0 s para derrubar os 20 HP (5 de dano a 2 mordidas/s), entao ' +
      'uma torre sozinha CONSEGUE abater — a economia fecha e o loop funciona. ' +
      'radius 25 casa com o corpo do sprite da moto.',
    changedBy:
      '007-technical-debt-hardening: a velocidade tinha virado 200 na 004 (ondas ' +
      'infinitas) e 300 na 006 (nitidez de sprites — um commit visual mexendo em ' +
      'gameplay). A 200+ o inimigo atravessa o alcance em ~1 s: a torre nunca ' +
      'completa o abate e o jogador nao ganha dinheiro. Playtest confirmou; ' +
      'restaurado o valor do MVP (90), que e o unico faixa em que o combate fecha.',
  },
  'tower.vira-lata-caramelo.base-stats': {
    id: 'tower.vira-lata-caramelo.base-stats',
    subject: 'tower',
    acceptedValues: {
      cost: 50,
      range: 200,
      damage: 5,
      fireRate: 2,
      radius: 20,
    },
    reason:
      'Unica torre do prototipo: custo 50 permite duas torres com o dinheiro ' +
      'inicial (150) e ainda guardar troco; 5 de dano a 2 ataques/s continua ' +
      'inalterado. O alcance de 200 px cobre ~4,4 s da pista contra ~2,3 s com ' +
      '120 px para o motoboy a 90 px/s, criando janela para 2+ mordidas ' +
      'encadeadas dentro da coleira sem alterar dano/custo/cadencia.',
    changedBy: '009-engajamento-ataque-torre',
  },
  'tower.vira-lata-caramelo.attack-behavior': {
    id: 'tower.vira-lata-caramelo.attack-behavior',
    subject: 'attack-behavior',
    acceptedValues: {
      kind: 'direct',
      targetRule: 'most-advanced-in-range',
      visualCuePolicy: 'onCue',
      engagement: 'pursuer',
    },
    reason:
      'Corpo-a-corpo: o Caramelo corre ate o alvo mais avancado no alcance e morde. ' +
      'E o comportamento que o jogo ja entregava com os assets presentes; agora ele ' +
      'esta declarado no dado em vez de emergir da existencia de um sprite. Sem a ' +
      'animacao, a mordida sai no tempo de fallback com o mesmo dano. Como cao solto ' +
      'na coleira, o perfil pursuer permite sair da base, encadear alvos dentro do ' +
      'alcance medido da base e voltar quando o caminho esvazia; trocar para ' +
      'stationary devolve o comportamento antigo por dado, sem mudar sistemas.',
    changedBy: '009-engajamento-ataque-torre',
  },
  'tower.mae-de-havaianas.base-stats': {
    id: 'tower.mae-de-havaianas.base-stats',
    subject: 'tower',
    acceptedValues: {
      cost: 140,
      range: 420,
      damage: 18,
      fireRate: 0.55,
      radius: 22,
    },
    reason:
      'Torre de elite: custa quase tres Caramelos, cobre area muito maior, bate ' +
      'forte e ataca devagar para nao substituir o Caramelo em custo-beneficio. ' +
      'O raio visual ligeiramente maior acomoda a personagem sem mudar pathing.',
    changedBy: 'generalizacao-animacao-mae-havaianas',
  },
  'tower.mae-de-havaianas.attack-behavior': {
    id: 'tower.mae-de-havaianas.attack-behavior',
    subject: 'attack-behavior',
    acceptedValues: {
      kind: 'projectile',
      targetRule: 'highest-current-health-in-range',
      visualCuePolicy: 'onCue',
      engagement: 'stationary',
    },
    reason:
      'A Mãe de Havaianas é uma atiradora de elite: fica na base, arremessa à ' +
      'distância e sempre prioriza o inimigo vivo com maior vida atual dentro do ' +
      'alcance, usando o avanço no caminho apenas como desempate.',
    changedBy: 'generalizacao-animacao-mae-havaianas',
  },
  'wave.progression-profile': {
    id: 'wave.progression-profile',
    subject: 'wave-profile',
    acceptedValues: {
      baseCount: 2,
      countGrowth: 2,
      baseIntervalSec: 0.4,
      intervalDecay: 0.03,
      minIntervalSec: 0.35,
      hpGrowthPerWave: 0.12,
      varietyStep: 4,
    },
    reason:
      'Escalada monotonica sem picos: quantidade e HP crescem a cada onda e o ' +
      'intervalo decai ate um piso anti-transbordo (minIntervalSec).',
  },
} as const satisfies Record<string, GameplayContract>;

export type AcceptedContractId = keyof typeof ACCEPTED_CONTRACTS;

/**
 * Lista as métricas em que o runtime diverge do contrato. Vazio = runtime aceito.
 * Só compara as chaves declaradas no contrato: campos de apresentação (emoji,
 * cor, spriteKey) podem mudar livremente sem quebrar o portão.
 */
export function findContractDrift<T extends Record<string, unknown>>(
  contract: GameplayContract<T>,
  actual: object,
): string[] {
  const runtime = actual as Record<string, unknown>;
  const drift: string[] = [];

  for (const [metric, accepted] of Object.entries(contract.acceptedValues)) {
    const current = runtime[metric];
    if (!Object.is(current, accepted)) {
      drift.push(`${metric}: runtime=${String(current)} contrato=${String(accepted)}`);
    }
  }

  return drift;
}

/**
 * Mensagem de falha do portão de verificação. Nomeia cada métrica divergente e
 * a decisão a tomar — reverter o runtime ou aceitar o novo valor no contrato
 * (FR-002).
 */
export function describeContractDrift<T extends Record<string, unknown>>(
  contract: GameplayContract<T>,
  drift: string[],
): string {
  return [
    `Contrato "${contract.id}" divergiu do runtime:`,
    ...drift.map((line) => `  - ${line}`),
    `Motivo do contrato atual: ${contract.reason}`,
    'Decida: reverta a mudança de balanceamento OU aceite os novos valores em',
    'src/data/contracts.ts (atualizando `reason` e `changedBy`).',
  ].join('\n');
}
