import Phaser from 'phaser';
import { GameState } from '../core/GameState';
import { TEXTURES } from '../core/constants';
import {
  formatSpriteSheetErrors,
  MOTOBOY_SPRITE_SHEET,
  resolveSpriteSheetSpec,
} from '../core/spriteSheets';
import initialMapUrl from '../assets/maps/initial-map.png';
import motoboySheetUrl from '../assets/enemies/dois-caras-numa-moto-sheet.png';
import caramelUrl from '../assets/towers/vira-lata-caramelo.png';
import caramelPrepareUrl from '../assets/towers/vira-lata-caramelo-waking.png';
import caramelRunUrl from '../assets/towers/vira-lata-caramelo-running.png';
import caramelRunAltUrl from '../assets/towers/vira-lata-caramelo-running-1.png';
import caramelAttackUrl from '../assets/towers/vira-lata-ramelo-atack.png';
import caramelAttackAltUrl from '../assets/towers/vira-lata-ramelo-atack-2.png';

/**
 * Cena de entrada. Carrega centralmente os sprites das torres (o restante do
 * jogo usa formas + emoji). Reinicia o estado e sobe GameScene + UIScene em
 * paralelo.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // Único ponto que conhece o caminho literal do asset (contrato C1).
    this.load.image(TEXTURES.initialMap, initialMapUrl);
    this.load.image(TEXTURES.towerCaramelo, caramelUrl);
    this.load.image(TEXTURES.towerCarameloPrepare, caramelPrepareUrl);
    this.load.image(TEXTURES.towerCarameloRun, caramelRunUrl);
    this.load.image(TEXTURES.towerCarameloRunAlt, caramelRunAltUrl);
    this.load.image(TEXTURES.towerCarameloAttack, caramelAttackUrl);
    this.load.image(TEXTURES.towerCarameloAttackAlt, caramelAttackAltUrl);

    // Carrega a imagem crua; o recorte público só é materializado em create()
    // após validar a grade contra as dimensões reais do asset.
    this.load.image(MOTOBOY_SPRITE_SHEET.rawTextureKey, motoboySheetUrl);

    // Sem erro silencioso: registra a falha e deixa os consumidores caírem no
    // fallback (círculo + emoji). Não relança — o jogo segue jogável (FR-007).
    this.load.on(
      Phaser.Loader.Events.FILE_LOAD_ERROR,
      (file: Phaser.Loader.File) => {
        if (file.key === TEXTURES.initialMap) {
          console.error(
            `[BootScene] Falha ao carregar mapa inicial "${file.key}" (${file.url}); GameScene usará fallback visual.`,
          );
          return;
        }
        if (file.key === MOTOBOY_SPRITE_SHEET.rawTextureKey) {
          console.error(
            `[BootScene] Falha ao carregar sprite sheet "${file.key}" (${file.url}); Enemy usará fallback círculo+emoji.`,
          );
          return;
        }
        console.error(
          `[BootScene] Falha ao carregar asset "${file.key}" (${file.url}).`,
        );
      },
    );
  }

  create(): void {
    this.materializeMotoboySpriteSheet();
    this.registerAnimations();
    GameState.reset();
    this.scene.launch('UIScene');
    this.scene.start('GameScene');
  }

  private materializeMotoboySpriteSheet(): void {
    const spec = MOTOBOY_SPRITE_SHEET;
    if (!this.textures.exists(spec.rawTextureKey)) {
      console.error(
        `[BootScene] Sprite sheet crua "${spec.rawTextureKey}" ausente; Enemy usará fallback círculo+emoji.`,
      );
      return;
    }

    const rawTexture = this.textures.get(spec.rawTextureKey);
    const source = rawTexture.getSourceImage();
    if (!(source instanceof HTMLImageElement)) {
      console.error(
        `[BootScene] Sprite sheet "${spec.rawTextureKey}" não veio de uma imagem HTML; Enemy usará fallback círculo+emoji.`,
      );
      return;
    }
    const result = resolveSpriteSheetSpec(spec, source.width, source.height);

    if (!result.ok) {
      if (this.textures.exists(spec.textureKey)) this.textures.remove(spec.textureKey);
      console.error(`[BootScene] ${formatSpriteSheetErrors(result)}`);
      return;
    }

    if (this.textures.exists(spec.textureKey)) this.textures.remove(spec.textureKey);
    this.textures.addSpriteSheet(spec.textureKey, source, {
      frameWidth: result.spec.frameWidth,
      frameHeight: result.spec.frameHeight,
    });
  }

  /**
   * Registra as animações no AnimationManager global (compartilhado entre cenas).
   * Só cria se a textura carregou — sem sheet, o inimigo cai no fallback emoji.
   */
  private registerAnimations(): void {
    const spec = MOTOBOY_SPRITE_SHEET;
    if (!this.textures.exists(spec.textureKey)) return;

    for (const animation of spec.animations) {
      if (this.anims.exists(animation.key)) continue;
      this.anims.create({
        key: animation.key,
        frames: this.anims.generateFrameNumbers(spec.textureKey, {
          start: animation.start,
          end: animation.end,
        }),
        frameRate: animation.frameRate,
        repeat: animation.repeat,
      });
    }
  }
}
