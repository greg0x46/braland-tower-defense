import { describe, expect, it } from 'vitest';
import {
  ROSTER_CONTROL,
  SIDEBAR_ROSTER_LAYOUT as LAYOUT,
  cardCenterY,
  clampScroll,
  computeRosterLayout,
  isCardFullyVisible,
  scrollToCard,
} from './rosterLayout';
import { TOWER_TYPES } from '../data/towers';

/** Ensaio de expansão exigido pelo contrato: pelo menos 4 torres (SC-005). */
const REHEARSAL_COUNT = 4;

describe('roster atual', () => {
  it('a torre existente cabe sem rolagem', () => {
    const layout = computeRosterLayout(Object.keys(TOWER_TYPES).length);

    expect(layout.scrollable).toBe(false);
    expect(layout.maxScroll).toBe(0);
  });
});

describe('ensaio com 4 torres (SC-005)', () => {
  const layout = computeRosterLayout(REHEARSAL_COUNT);

  it('as 4 entradas cabem inteiras na area visivel', () => {
    expect(layout.visibleCapacity).toBeGreaterThanOrEqual(REHEARSAL_COUNT);
    expect(layout.scrollable).toBe(false);
  });

  it('toda entrada aparece inteira, sem rolar', () => {
    for (let index = 0; index < REHEARSAL_COUNT; index++) {
      expect(isCardFullyVisible(index, 0), `card ${index} cortado`).toBe(true);
    }
  });

  it('nenhum card invade os controles de Iniciar/Pausar', () => {
    const controlTop = ROSTER_CONTROL.centerY - ROSTER_CONTROL.height / 2;

    for (let index = 0; index < REHEARSAL_COUNT; index++) {
      const bottom = cardCenterY(index, 0) + LAYOUT.cardHeight / 2;
      expect(bottom, `card ${index} sobrepoe o botao`).toBeLessThanOrEqual(controlTop);
    }
  });
});

describe('crescimento alem da area visivel', () => {
  const COUNT = 8;
  const layout = computeRosterLayout(COUNT);

  it('passa a rolar quando o roster excede a capacidade', () => {
    expect(COUNT).toBeGreaterThan(layout.visibleCapacity);
    expect(layout.scrollable).toBe(true);
    expect(layout.maxScroll).toBeGreaterThan(0);
  });

  it('toda entrada permanece alcancavel por rolagem (FR-011)', () => {
    for (let index = 0; index < COUNT; index++) {
      const scroll = scrollToCard(index, COUNT);

      expect(clampScroll(scroll, layout)).toBe(scroll);
      expect(isCardFullyVisible(index, scroll), `card ${index} inalcancavel`).toBe(true);
    }
  });

  it('a ultima entrada aparece inteira no fim da rolagem', () => {
    expect(isCardFullyVisible(COUNT - 1, layout.maxScroll)).toBe(true);
  });

  it('a rolagem nao passa dos limites', () => {
    expect(clampScroll(-500, layout)).toBe(0);
    expect(clampScroll(99999, layout)).toBe(layout.maxScroll);
  });

  it('nenhum card invade os controles, em qualquer rolagem', () => {
    const controlTop = ROSTER_CONTROL.centerY - ROSTER_CONTROL.height / 2;

    for (const scroll of [0, layout.maxScroll / 2, layout.maxScroll]) {
      for (let index = 0; index < COUNT; index++) {
        if (!isCardFullyVisible(index, scroll)) continue; // fora da janela: mascarado
        const bottom = cardCenterY(index, scroll) + LAYOUT.cardHeight / 2;
        expect(bottom).toBeLessThanOrEqual(controlTop);
      }
    }
  });
});

describe('geometria', () => {
  it('cards consecutivos nao se sobrepoem', () => {
    const first = cardCenterY(0, 0);
    const second = cardCenterY(1, 0);

    expect(second - first).toBe(LAYOUT.cardHeight + LAYOUT.cardGap);
  });

  it('rolar desloca os cards para cima', () => {
    expect(cardCenterY(0, 50)).toBe(cardCenterY(0, 0) - 50);
  });

  it('roster vazio nao rola', () => {
    const layout = computeRosterLayout(0);

    expect(layout.contentHeight).toBe(0);
    expect(layout.scrollable).toBe(false);
    expect(layout.maxScroll).toBe(0);
  });
});
