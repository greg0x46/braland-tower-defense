/**
 * Dimensões base (Phaser escala para caber na janela). O canvas total é
 * PLAY_WIDTH (campo de jogo) + SIDEBAR_WIDTH (menu à direita, estilo BTD).
 */
export const PLAY_WIDTH = 1280;
export const SIDEBAR_WIDTH = 300;
export const GAME_WIDTH = PLAY_WIDTH + SIDEBAR_WIDTH;
export const GAME_HEIGHT = 720;

/** Estado inicial da partida. */
export const STARTING_MONEY = 150;
export const STARTING_LIVES = 20;

/**
 * Timing do relógio de ondas (fonte de verdade — FR-003/D7). O jogo flui sozinho:
 * a onda 1 começa após `initialDelaySec` e, entre ondas, há `interWaveSec` de
 * intervalo. Valores em segundos, consumidos por delta time (sem timers Phaser).
 */
export const WAVE_TIMING = {
  initialDelaySec: 2,
  interWaveSec: 3,
} as const;

/** Largura total da estrada — usada para validação de construção e debug. */
export const PATH_WIDTH = 55;

/** Altura da barra de HUD no topo (zona reservada, sem construção). */
export const HUD_HEIGHT = 64;

/** Chaves das texturas placeholder geradas em BootScene. */
export const TEXTURES = {
  circle: 'tex-circle',
  projectile: 'tex-projectile',
  initialMap: 'map-initial',
  towerCaramelo: 'tower-vira-lata-caramelo',
  towerCarameloPrepare: 'tower-vira-lata-caramelo-prepare',
  towerCarameloRun: 'tower-vira-lata-caramelo-run',
  towerCarameloRunAlt: 'tower-vira-lata-caramelo-run-alt',
  towerCarameloAttack: 'tower-vira-lata-caramelo-attack',
  towerCarameloAttackAlt: 'tower-vira-lata-caramelo-attack-alt',
} as const;

/** Paleta com cara brasileira (verde/amarelo/azul) + apoio. */
export const COLORS = {
  background: 0x2e7d32, // verde grama
  path: 0x8d6e63, // marrom asfalto/terra
  pathBorder: 0x5d4037,
  towerCaramelo: 0xd9a066, // caramelo
  enemyMoto: 0xef5350, // vermelho
  projectile: 0xfff176, // amarelo
  rangeValid: 0x66bb6a,
  rangeInvalid: 0xe53935,
  hpBarBg: 0x000000,
  hpBarFill: 0x66bb6a,
  hudPanel: 0x1b1b23,
  hudText: 0xffffff,
  // Sidebar (menu de torres à direita).
  sidebarPanel: 0x21212b,
  sidebarBorder: 0x3949ab,
  cardBg: 0x2c2c38,
  cardBgHover: 0x37374a,
  cardSelected: 0xf9a825,
  cardBorder: 0x44445a,
  startButton: 0x2e7d32,
  startButtonHover: 0x388e3c,
  // Botão Pausar (âmbar = "pausar"); Continuar reaproveita o verde de startButton.
  pauseButton: 0xf9a825,
  pauseButtonHover: 0xffb300,
} as const;
