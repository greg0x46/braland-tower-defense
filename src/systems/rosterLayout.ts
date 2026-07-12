import { GAME_HEIGHT } from '../core/constants';

/**
 * Layout do menu de torres — regra pura (Constitution IX).
 *
 * A sidebar era dimensionada para uma torre só: bastava um roster maior para os
 * cards passarem por baixo do botão Iniciar e ficarem inalcançáveis. Aqui o
 * cálculo de quantos cards cabem, quanto dá para rolar e onde cada um fica é
 * testável sem renderizar nada (FR-011).
 */

export interface RosterLayoutConfig {
  /** Topo do primeiro card. */
  firstCardY: number;
  cardHeight: number;
  cardGap: number;
  /** Limite inferior da área de cards — abaixo disso ficam os controles. */
  viewportBottom: number;
}

export interface RosterLayout {
  /** Quantos cards cabem inteiros na área visível. */
  visibleCapacity: number;
  /** Se o roster excede a área e precisa rolar. */
  scrollable: boolean;
  /** Rolagem máxima, em pixels. Zero quando tudo cabe. */
  maxScroll: number;
  /** Altura total ocupada por todos os cards. */
  contentHeight: number;
  /** Altura da área visível. */
  viewportHeight: number;
}

/** Geometria dos controles no rodapé da sidebar (Iniciar/Pausar). */
export const ROSTER_CONTROL = {
  height: 52,
  centerY: GAME_HEIGHT - 44,
  /**
   * Faixa entre o fim dos cards e o botão. Precisa caber a dica de rolagem —
   * com 16 px ela era desenhada por cima do "Iniciar".
   */
  margin: 30,
} as const;

/** Onde a área de cards termina — os controles ficam sempre abaixo e alcançáveis. */
export const ROSTER_VIEWPORT_BOTTOM =
  ROSTER_CONTROL.centerY - ROSTER_CONTROL.height / 2 - ROSTER_CONTROL.margin;

/** Layout real da sidebar. Fonte única, compartilhada com a UIScene. */
export const SIDEBAR_ROSTER_LAYOUT: RosterLayoutConfig = {
  firstCardY: 96,
  cardHeight: 96,
  cardGap: 14,
  viewportBottom: ROSTER_VIEWPORT_BOTTOM,
};

/** Distância entre os topos de dois cards consecutivos. */
export function slotHeight(config: RosterLayoutConfig): number {
  return config.cardHeight + config.cardGap;
}

export function computeRosterLayout(
  count: number,
  config: RosterLayoutConfig = SIDEBAR_ROSTER_LAYOUT,
): RosterLayout {
  const viewportHeight = Math.max(0, config.viewportBottom - config.firstCardY);
  const slot = slotHeight(config);

  // O último card visível não precisa do gap depois dele.
  const capacity =
    viewportHeight <= 0
      ? 0
      : Math.max(0, Math.floor((viewportHeight + config.cardGap) / slot));

  const contentHeight = count === 0 ? 0 : count * slot - config.cardGap;
  const maxScroll = Math.max(0, contentHeight - viewportHeight);

  return {
    visibleCapacity: capacity,
    scrollable: count > capacity,
    maxScroll,
    contentHeight,
    viewportHeight,
  };
}

/** Centro vertical do card `index` para uma dada rolagem. */
export function cardCenterY(
  index: number,
  scrollOffset: number,
  config: RosterLayoutConfig = SIDEBAR_ROSTER_LAYOUT,
): number {
  return config.firstCardY + index * slotHeight(config) + config.cardHeight / 2 - scrollOffset;
}

/** Mantém a rolagem dentro dos limites (sem passar do fim nem do começo). */
export function clampScroll(scrollOffset: number, layout: RosterLayout): number {
  return Math.min(Math.max(scrollOffset, 0), layout.maxScroll);
}

/** O card aparece inteiro na área visível? */
export function isCardFullyVisible(
  index: number,
  scrollOffset: number,
  config: RosterLayoutConfig = SIDEBAR_ROSTER_LAYOUT,
): boolean {
  const center = cardCenterY(index, scrollOffset, config);
  const top = center - config.cardHeight / 2;
  const bottom = center + config.cardHeight / 2;
  return top >= config.firstCardY && bottom <= config.viewportBottom;
}

/** Rolagem que traz o card `index` inteiro para a área visível. */
export function scrollToCard(
  index: number,
  count: number,
  config: RosterLayoutConfig = SIDEBAR_ROSTER_LAYOUT,
): number {
  const layout = computeRosterLayout(count, config);
  const slot = slotHeight(config);
  const cardTop = index * slot;
  const cardBottom = cardTop + config.cardHeight;
  const desired = Math.max(0, cardBottom - layout.viewportHeight);
  return clampScroll(Math.min(cardTop, desired), layout);
}
