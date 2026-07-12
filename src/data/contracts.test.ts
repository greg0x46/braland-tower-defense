import { describe, expect, it } from 'vitest';
import {
  ACCEPTED_CONTRACTS,
  describeContractDrift,
  findContractDrift,
  type ContractSubject,
  type GameplayContract,
} from './contracts';

const SUBJECTS: ContractSubject[] = [
  'enemy',
  'tower',
  'wave-profile',
  'match-progression',
  'attack-behavior',
  'map',
];

const entries = Object.entries(ACCEPTED_CONTRACTS) as [string, GameplayContract][];

describe('ACCEPTED_CONTRACTS integrity', () => {
  it('indexa cada contrato pelo proprio id', () => {
    for (const [key, contract] of entries) {
      expect(contract.id).toBe(key);
    }
  });

  it('exige um motivo declarado para cada contrato aceito', () => {
    for (const [key, contract] of entries) {
      expect(contract.reason.trim(), `contrato ${key} sem motivo`).not.toBe('');
    }
  });

  it('usa apenas assuntos previstos no data model', () => {
    for (const [key, contract] of entries) {
      expect(SUBJECTS, `contrato ${key} com subject invalido`).toContain(contract.subject);
    }
  });

  it('nao aceita contrato sem valores', () => {
    for (const [key, contract] of entries) {
      expect(
        Object.keys(contract.acceptedValues).length,
        `contrato ${key} sem valores aceitos`,
      ).toBeGreaterThan(0);
    }
  });
});

describe('findContractDrift', () => {
  const contract: GameplayContract<{ speed: number; radius: number }> = {
    id: 'test.subject.base-stats',
    subject: 'enemy',
    acceptedValues: { speed: 300, radius: 20 },
    reason: 'valores de teste',
  };

  it('nao acusa divergencia quando o runtime bate com o contrato', () => {
    expect(findContractDrift(contract, { speed: 300, radius: 20 })).toEqual([]);
  });

  it('ignora campos de apresentacao fora do contrato', () => {
    expect(findContractDrift(contract, { speed: 300, radius: 20, emoji: '🛵' })).toEqual([]);
  });

  it('nomeia cada metrica divergente', () => {
    const drift = findContractDrift(contract, { speed: 200, radius: 25 });

    expect(drift).toHaveLength(2);
    expect(drift[0]).toContain('speed');
    expect(drift[1]).toContain('radius');
  });

  it('descreve a decisao a tomar quando ha divergencia', () => {
    const drift = findContractDrift(contract, { speed: 200, radius: 20 });
    const message = describeContractDrift(contract, drift);

    expect(message).toContain('test.subject.base-stats');
    expect(message).toContain('speed');
    expect(message).toContain('valores de teste');
  });
});
