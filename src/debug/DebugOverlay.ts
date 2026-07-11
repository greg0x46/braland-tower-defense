import Phaser from 'phaser';
import { PATH } from '../data/path';
import { PLAY_WIDTH, GAME_HEIGHT, PATH_WIDTH, HUD_HEIGHT } from '../core/constants';
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
const C = {
  path: 0x00e5ff,
  range: 0xffb300,
  target: 0xff1744,
  hitbox: 0x76ff03,
} as const;

/**
 * Overlay de depuração (Constitution X). Ativável apenas em desenvolvimento e
 * alternável pela tecla ` (backtick). Mostra FPS, contagem de entidades,
 * caminho, alcance das torres, hitboxes e a linha até o alvo atual de cada
 * torre. Não altera nenhuma regra de gameplay — só lê e desenha.
 */
export class DebugOverlay {
  private readonly scene: Phaser.Scene;
  private readonly sources: DebugSources;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;
  private enabled = false;

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

    // Só existe em dev; em produção o overlay nunca é instanciado (ver GameScene).
    scene.input.keyboard?.on('keydown-BACKTICK', this.toggle, this);
  }

  toggle(): void {
    this.enabled = !this.enabled;
    this.gfx.setVisible(this.enabled);
    this.text.setVisible(this.enabled);
    if (!this.enabled) this.gfx.clear();
  }

  update(): void {
    if (!this.enabled) return;

    const enemies = this.sources.enemies();
    const towers = this.sources.towers();

    this.gfx.clear();

    // Caminho (linha central).
    this.gfx.lineStyle(1, C.path, 0.8);
    this.gfx.beginPath();
    this.gfx.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i++) this.gfx.lineTo(PATH[i].x, PATH[i].y);
    this.gfx.strokePath();

    // Torres: alcance + linha até o alvo atual (mesma regra usada em combate).
    for (const tower of towers) {
      this.gfx.lineStyle(1, C.range, 0.7);
      this.gfx.strokeCircle(tower.x, tower.y, tower.def.range);
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

    const fps = Math.round(this.scene.game.loop.actualFps);
    this.text.setText(
      [
        `FPS ${fps}`,
        `inimigos  ${enemies.length}`,
        `torres    ${towers.length}`,
        `projéteis ${this.sources.projectiles().length}`,
        `path w=${PATH_WIDTH}  play=${PLAY_WIDTH}x${GAME_HEIGHT}`,
      ].join('\n'),
    );
  }

  destroy(): void {
    this.scene.input.keyboard?.off('keydown-BACKTICK', this.toggle, this);
    this.gfx.destroy();
    this.text.destroy();
  }
}
