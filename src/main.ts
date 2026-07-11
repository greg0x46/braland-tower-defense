import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './core/constants';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1b1b23',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // Ordem importa: UIScene é listada por último para renderizar sobre a GameScene.
  scene: [BootScene, GameScene, UIScene],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
