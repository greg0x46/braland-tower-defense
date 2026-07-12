import Phaser from 'phaser';
import { ACTIVE_MAP } from '../data/maps';
import { PLAY_WIDTH, GAME_HEIGHT, HUD_HEIGHT } from '../core/constants';
import { pickMostAdvancedInRange } from '../systems/targeting';
import type { Enemy } from '../entities/Enemy';
import type { Tower } from '../entities/Tower';

/** Fontes de dados que o overlay inspeciona (somente leitura). */
export interface DebugSources {
  enemies: () => readonly Enemy[];
  towers: () => readonly Tower[];
  projectiles: () => readonly Phaser.GameObjects.GameObject[];
}

const DEBUG_DEPTH = 5000;
const GRID_MINOR = 40;
const GRID_MAJOR = 80;
const GRID_LABEL_STEP = GRID_MAJOR;
const C = {
  gridMinor: 0xffffff,
  gridMajor: 0xffffff,
  gridPoint: 0xfff176,
  mouse: 0xfff176,
  path: 0x00e5ff,
  pathArea: 0x002b36,
  range: 0xffb300,
  pursuer: 0x00e676,
  target: 0xff1744,
  hitbox: 0x76ff03,
} as const;

type DebugViewMode = 'path' | 'grid-points';

/**
 * Overlay de depuração (Constitution X). Ativável apenas em desenvolvimento e
 * alternável pela tecla ` (backtick). A tecla G alterna entre a visão de
 * gameplay/path e a visão de pontos da grid para captura. Não altera nenhuma
 * regra de gameplay — só lê e desenha.
 */
export class DebugOverlay {
  private readonly scene: Phaser.Scene;
  private readonly sources: DebugSources;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;
  private readonly waypointLabels: Phaser.GameObjects.Text[];
  private readonly gridLabels: Phaser.GameObjects.Text[];
  private enabled = false;
  private mode: DebugViewMode = 'path';

  constructor(scene: Phaser.Scene, sources: DebugSources) {
    this.scene = scene;
    this.sources = sources;

    this.gfx = scene.add.graphics().setDepth(DEBUG_DEPTH).setVisible(false);
    this.text = scene.add
      .text(8, HUD_HEIGHT + 8, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#00e5ff',
        backgroundColor: '#000000a0',
      })
      .setDepth(DEBUG_DEPTH)
      .setVisible(false);

    this.waypointLabels = ACTIVE_MAP.path.map((point, index) =>
      scene.add
        .text(point.x + 6, point.y + 6, String(index), {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#ffffff',
          backgroundColor: '#000000b8',
        })
        .setDepth(DEBUG_DEPTH + 1)
        .setVisible(false),
    );

    this.gridLabels = this.createGridLabels(scene);

    // Só existe em dev; em produção o overlay nunca é instanciado (ver GameScene).
    scene.input.keyboard?.on('keydown-BACKTICK', this.toggle, this);
    scene.input.keyboard?.on('keydown-G', this.cycleMode, this);
  }

  toggle(): void {
    this.enabled = !this.enabled;
    this.gfx.setVisible(this.enabled);
    this.text.setVisible(this.enabled);
    this.syncLabelVisibility();
    if (!this.enabled) this.gfx.clear();
  }

  private cycleMode(): void {
    this.mode = this.mode === 'path' ? 'grid-points' : 'path';
    this.syncLabelVisibility();
  }

  update(): void {
    if (!this.enabled) return;

    const enemies = this.sources.enemies();
    const towers = this.sources.towers();

    this.gfx.clear();

    this.drawGrid();

    if (this.mode === 'path') {
      // Caminho real: faixa de bloqueio + linha central, sempre acima do mapa.
      this.gfx.lineStyle(ACTIVE_MAP.roadWidth, C.pathArea, 0.28);
      this.strokePath();
      this.gfx.lineStyle(3, C.path, 0.95);
      this.strokePath();
      this.drawWaypointMarkers();
    } else {
      this.drawGridPointMarkers();
    }

    this.drawPointerMarker();

    // Torres: alcance + linha até o alvo atual (mesma regra usada em combate).
    if (this.mode === 'path') {
      for (const tower of towers) {
        this.gfx.lineStyle(1, C.range, 0.7);
        this.gfx.strokeCircle(tower.x, tower.y, tower.def.range);
        this.gfx.fillStyle(C.pursuer, 0.85);
        this.gfx.fillCircle(tower.engagementX, tower.engagementY, 4);
        this.gfx.lineStyle(1, C.pursuer, 0.7);
        this.gfx.lineBetween(tower.x, tower.y, tower.engagementX, tower.engagementY);
        const target = pickMostAdvancedInRange(tower.x, tower.y, tower.def.range, enemies);
        if (target) {
          this.gfx.lineStyle(2, C.target, 0.9);
          this.gfx.lineBetween(tower.x, tower.y, target.x, target.y);
        }
      }

      // Hitboxes dos inimigos.
      this.gfx.lineStyle(1, C.hitbox, 0.9);
      for (const enemy of enemies) {
        this.gfx.strokeCircle(enemy.x, enemy.y, enemy.radius);
      }
    }

    this.syncLabelVisibility();

    const fps = Math.round(this.scene.game.loop.actualFps);
    const pointer = this.scene.input.activePointer;
    const pointerX = Math.round(pointer.x);
    const pointerY = Math.round(pointer.y);
    const pointerInPlayfield =
      pointerX >= 0 && pointerX <= PLAY_WIDTH && pointerY >= 0 && pointerY <= GAME_HEIGHT;
    this.text.setText(
      [
        `FPS ${fps}`,
        `modo      ${this.mode} (G)`,
        `inimigos  ${enemies.length}`,
        `torres    ${towers.length}`,
        `projéteis ${this.sources.projectiles().length}`,
        `mouse     ${pointerX},${pointerY}${pointerInPlayfield ? '' : ' fora'}`,
        `grid      ${GRID_MINOR}/${GRID_MAJOR} labels=${GRID_LABEL_STEP}`,
        `mapa      ${ACTIVE_MAP.id}  estrada w=${ACTIVE_MAP.roadWidth}  play=${PLAY_WIDTH}x${GAME_HEIGHT}`,
      ].join('\n'),
    );
  }

  private createGridLabels(scene: Phaser.Scene): Phaser.GameObjects.Text[] {
    const labels: Phaser.GameObjects.Text[] = [];

    for (const x of this.gridValues(PLAY_WIDTH)) {
      for (const y of this.gridValues(GAME_HEIGHT)) {
        const labelX = x === PLAY_WIDTH ? x - 4 : x + 4;
        const labelY = y === GAME_HEIGHT ? y - 4 : y + 4;
        labels.push(
          scene.add
            .text(labelX, labelY, `${x},${y}`, {
              fontFamily: 'monospace',
              fontSize: '9px',
              color: '#fff176',
              backgroundColor: '#000000a8',
            })
            .setOrigin(x === PLAY_WIDTH ? 1 : 0, y === GAME_HEIGHT ? 1 : 0)
            .setDepth(DEBUG_DEPTH + 1)
            .setVisible(false),
        );
      }
    }

    return labels;
  }

  private gridValues(max: number): number[] {
    const values: number[] = [];
    for (let value = 0; value <= max; value += GRID_LABEL_STEP) values.push(value);
    if (values[values.length - 1] !== max) values.push(max);
    return values;
  }

  private drawGrid(): void {
    for (let x = 0; x <= PLAY_WIDTH; x += GRID_MINOR) {
      const major = x % GRID_MAJOR === 0;
      this.gfx.lineStyle(major ? 1 : 1, major ? C.gridMajor : C.gridMinor, major ? 0.28 : 0.12);
      this.gfx.lineBetween(x, 0, x, GAME_HEIGHT);
    }

    for (let y = 0; y <= GAME_HEIGHT; y += GRID_MINOR) {
      const major = y % GRID_MAJOR === 0;
      this.gfx.lineStyle(major ? 1 : 1, major ? C.gridMajor : C.gridMinor, major ? 0.28 : 0.12);
      this.gfx.lineBetween(0, y, PLAY_WIDTH, y);
    }
  }

  private strokePath(): void {
    this.gfx.beginPath();
    const path = ACTIVE_MAP.path;
    this.gfx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) this.gfx.lineTo(path[i].x, path[i].y);
    this.gfx.strokePath();
  }

  private drawWaypointMarkers(): void {
    this.gfx.lineStyle(2, C.path, 0.95);
    this.gfx.fillStyle(0x000000, 0.75);
    for (const point of ACTIVE_MAP.path) {
      this.gfx.fillCircle(point.x, point.y, 5);
      this.gfx.strokeCircle(point.x, point.y, 5);
    }
  }

  private drawGridPointMarkers(): void {
    this.gfx.fillStyle(C.gridPoint, 0.95);
    for (const x of this.gridValues(PLAY_WIDTH)) {
      for (const y of this.gridValues(GAME_HEIGHT)) {
        this.gfx.fillCircle(x, y, 3);
      }
    }
  }

  private drawPointerMarker(): void {
    const pointer = this.scene.input.activePointer;
    const x = Math.round(pointer.x);
    const y = Math.round(pointer.y);
    if (x < 0 || x > PLAY_WIDTH || y < 0 || y > GAME_HEIGHT) return;

    this.gfx.lineStyle(1, C.mouse, 0.75);
    this.gfx.lineBetween(x, 0, x, GAME_HEIGHT);
    this.gfx.lineBetween(0, y, PLAY_WIDTH, y);
    this.gfx.strokeCircle(x, y, 6);
  }

  private syncLabelVisibility(): void {
    const showPathLabels = this.enabled && this.mode === 'path';
    const showGridLabels = this.enabled && this.mode === 'grid-points';

    for (const label of this.waypointLabels) label.setVisible(showPathLabels);
    for (const label of this.gridLabels) label.setVisible(showGridLabels);
  }

  destroy(): void {
    this.scene.input.keyboard?.off('keydown-BACKTICK', this.toggle, this);
    this.scene.input.keyboard?.off('keydown-G', this.cycleMode, this);
    this.gfx.destroy();
    this.text.destroy();
    for (const label of this.waypointLabels) label.destroy();
    for (const label of this.gridLabels) label.destroy();
  }
}
