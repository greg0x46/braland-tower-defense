import Phaser from 'phaser';
import { EventBus, GameEvents } from '../core/EventBus';
import { GameState } from '../core/GameState';
import { PLAY_WIDTH, GAME_HEIGHT, PATH_WIDTH, HUD_HEIGHT, COLORS } from '../core/constants';
import { PATH } from '../data/path';
import { TOWER_TYPES, type TowerType } from '../data/towers';
import { TOWER_SPRITE_SCALE, type Tower } from '../entities/Tower';
import { isValidPlacement } from '../systems/placement';

/**
 * Gerencia a construção de torres com posicionamento livre: seleção via HUD,
 * preview seguindo o mouse (verde = válido / vermelho = inválido) e validação
 * (fora do caminho, sem sobreposição, dentro do mapa, com dinheiro).
 */
export class BuildManager {
  private readonly scene: Phaser.Scene;
  private readonly getTowers: () => Tower[];
  private readonly placeTower: (x: number, y: number, type: TowerType) => void;

  private selectedType: TowerType | null = null;
  private readonly preview: Phaser.GameObjects.Container;
  private readonly previewBody: Phaser.GameObjects.Arc;
  private readonly previewRange: Phaser.GameObjects.Arc;
  private readonly previewEmoji: Phaser.GameObjects.Text;
  private previewSprite: Phaser.GameObjects.Image | null = null;
  private valid = false;

  constructor(
    scene: Phaser.Scene,
    getTowers: () => Tower[],
    placeTower: (x: number, y: number, type: TowerType) => void,
  ) {
    this.scene = scene;
    this.getTowers = getTowers;
    this.placeTower = placeTower;

    this.previewRange = scene.add.circle(0, 0, 10, COLORS.rangeValid, 0.1);
    this.previewBody = scene.add.circle(0, 0, 20, COLORS.rangeValid, 0.5);
    this.previewEmoji = scene.add.text(0, 0, '', { fontSize: '28px' }).setOrigin(0.5);
    this.preview = scene.add
      .container(0, 0, [this.previewRange, this.previewBody, this.previewEmoji])
      .setDepth(1000)
      .setVisible(false);

    EventBus.on(GameEvents.SELECT_TOWER, this.onSelect, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
  }

  private onSelect(towerTypeId: string | null): void {
    if (GameState.isBuildLocked) return;
    this.selectedType = towerTypeId ? TOWER_TYPES[towerTypeId] : null;
    if (!this.selectedType) {
      this.preview.setVisible(false);
      return;
    }
    const t = this.selectedType;
    this.previewRange.setRadius(t.range);

    // Espelha a resolução visual da torre (contrato C4): sprite quando existe,
    // senão corpo + emoji. O anel mantém o feedback de cor válido/inválido.
    if (t.spriteKey && this.scene.textures.exists(t.spriteKey)) {
      const sprite = this.ensurePreviewSprite(t.spriteKey);
      const src = sprite.texture.getSourceImage();
      const displayWidth = t.radius * TOWER_SPRITE_SCALE;
      sprite.setDisplaySize(displayWidth, displayWidth * (src.height / src.width)).setVisible(true);
      this.previewBody.setVisible(false);
      this.previewEmoji.setVisible(false);
    } else {
      if (this.previewSprite) this.previewSprite.setVisible(false);
      this.previewBody.setRadius(t.radius).setVisible(true);
      this.previewEmoji.setText(t.emoji).setFontSize(t.radius * 1.4).setVisible(true);
    }

    this.preview.setVisible(true);
    this.refreshPreview(this.scene.input.activePointer);
  }

  /** Cria (uma vez) e reaproveita a imagem de preview, atualizando a textura. */
  private ensurePreviewSprite(spriteKey: string): Phaser.GameObjects.Image {
    if (!this.previewSprite) {
      this.previewSprite = this.scene.add.image(0, 0, spriteKey).setOrigin(0.5);
      this.preview.add(this.previewSprite);
    } else {
      this.previewSprite.setTexture(spriteKey);
    }
    return this.previewSprite;
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (GameState.isBuildLocked || !this.selectedType) return;
    this.refreshPreview(pointer);
  }

  private refreshPreview(pointer: Phaser.Input.Pointer): void {
    const t = this.selectedType;
    if (!t) return;
    const { x, y } = pointer;
    this.preview.setPosition(x, y);
    this.valid = this.isValidPlacement(x, y, t);

    const color = this.valid ? COLORS.rangeValid : COLORS.rangeInvalid;
    this.previewBody.setFillStyle(color, 0.5);
    this.previewRange.setFillStyle(color, 0.1);
  }

  private isValidPlacement(x: number, y: number, t: TowerType): boolean {
    return isValidPlacement({
      x,
      y,
      radius: t.radius,
      cost: t.cost,
      money: GameState.money,
      path: PATH,
      pathHalfWidth: PATH_WIDTH / 2,
      bounds: { minX: 0, maxX: PLAY_WIDTH, minY: HUD_HEIGHT, maxY: GAME_HEIGHT },
      towers: this.getTowers(),
      towerGap: 4,
    });
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (GameState.isBuildLocked || !this.selectedType) return;
    this.refreshPreview(pointer);
    if (!this.valid) return;

    const t = this.selectedType;
    if (!GameState.spend(t.cost)) return;
    this.placeTower(pointer.x, pointer.y, t);

    // Sai do modo de construção após colocar (o jogador reabre pelo HUD).
    this.selectedType = null;
    this.preview.setVisible(false);
    EventBus.emit(GameEvents.SELECT_TOWER, null);
  }

  destroy(): void {
    EventBus.off(GameEvents.SELECT_TOWER, this.onSelect, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
  }
}
