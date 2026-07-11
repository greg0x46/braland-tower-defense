import Phaser from 'phaser';
import { GameState } from '../core/GameState';
import { TEXTURES, ANIMS } from '../core/constants';
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

    // Sprite sheet do inimigo: grade uniforme 8×2 (16 frames de 221×443).
    // Linha 1 = ciclo de pilotar; linha 2 = atirar. Fatiado aqui; a animação é
    // registrada em create() (ver ANIMS). 1774/8=221, 887/2=443 → 8×2 frames.
    this.load.spritesheet(TEXTURES.enemyMotoboy, motoboySheetUrl, {
      frameWidth: 221,
      frameHeight: 443,
    });

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
        console.error(
          `[BootScene] Falha ao carregar asset "${file.key}" (${file.url}).`,
        );
      },
    );
  }

  create(): void {
    this.registerAnimations();
    GameState.reset();
    this.scene.launch('UIScene');
    this.scene.start('GameScene');
  }

  /**
   * Registra as animações no AnimationManager global (compartilhado entre cenas).
   * Só cria se a textura carregou — sem sheet, o inimigo cai no fallback emoji.
   */
  private registerAnimations(): void {
    if (!this.textures.exists(TEXTURES.enemyMotoboy)) return;

    this.anims.create({
      key: ANIMS.motoboyRide,
      frames: this.anims.generateFrameNumbers(TEXTURES.enemyMotoboy, {
        start: 0,
        end: 7, // linha 1: ciclo de pilotar
      }),
      frameRate: 12,
      repeat: -1, // loop infinito
    });

    this.anims.create({
      key: ANIMS.motoboyShoot,
      frames: this.anims.generateFrameNumbers(TEXTURES.enemyMotoboy, {
        start: 8,
        end: 15, // linha 2: atirar
      }),
      frameRate: 14,
      repeat: 0, // dispara uma vez
    });
  }
}
