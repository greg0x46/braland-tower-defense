import Phaser from 'phaser';
import { GameState } from '../core/GameState';

/**
 * Cena de entrada. Não carrega assets externos (o jogo usa formas + emoji).
 * Reinicia o estado e sobe GameScene + UIScene em paralelo.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    GameState.reset();
    this.scene.launch('UIScene');
    this.scene.start('GameScene');
  }
}
