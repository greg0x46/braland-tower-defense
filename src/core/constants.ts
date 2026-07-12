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

/** Vida perdida por inimigo que chega ao fim do caminho. */
export const LEAK_DAMAGE = 1;

/**
 * Timing do relógio de ondas (fonte de verdade — FR-003/D7). O jogo flui sozinho:
 * a onda 1 começa após `initialDelaySec` e, entre ondas, há `interWaveSec` de
 * intervalo. Valores em segundos, consumidos por delta time (sem timers Phaser).
 */
export const WAVE_TIMING = {
  initialDelaySec: 2,
  interWaveSec: 3,
} as const;

/** Altura da barra de HUD no topo (zona reservada, sem construção). */
export const HUD_HEIGHT = 64;

/**
 * Áudio. `defaultVolume` é o fundo audível que deixa espaço para efeitos sonoros
 * futuros; o catálogo de faixas (`data/audio.ts`) o consome. `storageKey` é onde a
 * preferência do jogador (mudo/volume) vive no localStorage.
 */
export const AUDIO = {
  defaultVolume: 0.35,
  storageKey: 'br-td:audio',
} as const;

/**
 * Efeitos sonoros de combate. Só chaves de cache e números de mixagem/limitação —
 * o catálogo (`data/audio.ts`) monta as entradas e o `CombatSfxManager` as toca.
 * O caminho do arquivo não aparece aqui (Constitution XI).
 *
 * `mix` fica abaixo do volume da trilha (0.35) de propósito: o efeito é um destaque
 * momentâneo, não uma segunda camada de música (FR-007). O alerta de vazamento é o
 * mais alto porque é o único que informa uma perda.
 *
 * `throttle` é o que impede uma onda de 20 inimigos de virar massa sonora (FR-008).
 * `maxSimultaneous` é o teto global; `alwaysAudiblePriority` é a porta de escape:
 * um efeito com prioridade igual ou maior atravessa o teto, e é por isso que o
 * vazamento nunca some atrás de uma rajada de impactos (SC-005).
 */
export const COMBAT_SFX = {
  cacheKeys: {
    attackDefault: 'sfx-combat-attack-default',
    impactDefault: 'sfx-combat-impact-default',
    killDefault: 'sfx-combat-kill-default',
    leakDefault: 'sfx-combat-leak-default',
    attackChinelada: 'sfx-combat-attack-chinelada',
    impactChinelada: 'sfx-combat-impact-chinelada',
    attackLatido: 'sfx-combat-attack-latido',
  },
  mix: {
    towerAttack: 0.3,
    enemyDamaged: 0.24,
    enemyKilled: 0.38,
    enemyLeaked: 0.55,
  },
  priority: {
    towerAttack: 10,
    enemyDamaged: 20,
    enemyKilled: 50,
    enemyLeaked: 90,
  },
  throttle: {
    towerAttackCooldownMs: 70,
    enemyDamagedCooldownMs: 90,
    enemyKilledCooldownMs: 60,
    enemyLeakedCooldownMs: 220,
    towerAttackMaxConcurrent: 3,
    enemyDamagedMaxConcurrent: 3,
    enemyKilledMaxConcurrent: 3,
    enemyLeakedMaxConcurrent: 2,
    /** Espaçamento mínimo entre dois sons quaisquer da mesma categoria. */
    categorySpacingMs: 40,
    maxSimultaneous: 6,
    alwaysAudiblePriority: 80,
  },
} as const;

/**
 * Timings usados quando uma torre nao declara `attackAnimation`. Mantem gameplay
 * testavel e independente de textura: a apresentacao pode falhar sem desligar
 * dano, cadencia, encadeamento ou retorno.
 */
export const ENGAGEMENT_FALLBACK = {
  standUpSec: 0.12,
  strikeSec: 0.16,
  cueAtSec: 0,
  lieDownSec: 0,
  pursuitSpeedPxPerSec: 520,
  arrivalDistancePx: 22,
} as const;

/** Chaves das texturas placeholder geradas em BootScene. */
export const TEXTURES = {
  circle: 'tex-circle',
  projectile: 'tex-projectile',
  initialMap: 'map-initial',
  towerCaramelo: 'tower-vira-lata-caramelo',
  towerCarameloSheet: 'tower-vira-lata-caramelo-sheet',
  towerMaeHavaianasSheet: 'tower-mae-de-havaianas-sheet',
  enemyMotoboy: 'enemy-dois-caras-moto',
} as const;

/**
 * Chaves das animações registradas no AnimationManager global (BootScene.create).
 * Sprite sheets são fatiados no load; a animação em si vive aqui, referenciada
 * por chave — nunca recriada por instância (contrato de mercado p/ Phaser).
 */
export const ANIMS = {
  motoboyRide: 'motoboy-ride',
  motoboyShoot: 'motoboy-shoot',
  carameloStandingUp: 'caramelo-standing-up',
  carameloChasing: 'caramelo-chasing',
  carameloBiting: 'caramelo-biting',
  carameloLyingDown: 'caramelo-lying-down',
  maeHavaianasIdle: 'mae-de-havaianas-idle',
  maeHavaianasReadying: 'mae-de-havaianas-readying',
  maeHavaianasThrowing: 'mae-de-havaianas-throwing',
  maeHavaianasRecovering: 'mae-de-havaianas-recovering',
} as const;

/**
 * Tunning de orientação do sprite do inimigo (apresentação — não é gameplay,
 * por isso fica fora de `src/data/`). Consumido pela regra pura
 * `src/systems/orientation.ts` e pela aplicação no `Enemy`.
 *
 * - `tiltDeg`: magnitude da inclinação discreta (subindo −15 / descendo +15).
 * - `tiltEnterSin`/`tiltExitSin`: limiares (em |ny| normalizado) para entrar em
 *   inclinado e voltar a plano — `tiltExitSin < tiltEnterSin` cria histerese e
 *   evita flicker na fronteira.
 * - `flipDeadzone`: zona neutra de `nx` onde o flip preserva o sentido anterior
 *   (segmentos ~verticais não trocam o espelhamento nervosamente).
 */
const DEG_TO_RAD = Math.PI / 180;
export const ORIENTATION = {
  tiltDeg: 15,
  tiltEnterSin: Math.sin(DEG_TO_RAD * 20),
  tiltExitSin: Math.sin(DEG_TO_RAD * 17),
  flipDeadzone: 0.15,
} as const;

/** Paleta com cara brasileira (verde/amarelo/azul) + apoio. */
export const COLORS = {
  background: 0x2e7d32, // verde grama
  path: 0x8d6e63, // marrom asfalto/terra
  towerCaramelo: 0xd9a066, // caramelo
  towerMaeHavaianas: 0xe85d75, // rosa/vermelho da havaiana
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
