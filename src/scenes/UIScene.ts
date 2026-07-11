import Phaser from 'phaser';
import { EventBus, GameEvents } from '../core/EventBus';
import { GameState } from '../core/GameState';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAY_WIDTH,
  SIDEBAR_WIDTH,
  HUD_HEIGHT,
  COLORS,
} from '../core/constants';
import { TOWER_TYPES, type TowerType } from '../data/towers';

/** Layout da sidebar de torres (à direita do campo de jogo). */
const SIDEBAR_CX = PLAY_WIDTH + SIDEBAR_WIDTH / 2;
const CARD_WIDTH = SIDEBAR_WIDTH - 40;
const CARD_HEIGHT = 96;
const CARD_GAP = 14;
const FIRST_CARD_Y = 96;

/** Card de uma torre no menu lateral, com estados de seleção/saldo. */
interface TowerCard {
  type: TowerType;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  cost: Phaser.GameObjects.Text;
  selected: boolean;
}

/** Botão genérico (retângulo + rótulo) com feedback de clique. */
interface Button {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  baseColor: number;
  hoverColor: number;
  enabled: boolean;
}

/**
 * HUD do jogo. Barra superior (dinheiro/vida/onda) sobre o campo e uma sidebar
 * à direita, estilo Bloons TD, com cards das torres e o botão de iniciar onda.
 * Toda comunicação com a gameplay passa pelo EventBus.
 */
export class UIScene extends Phaser.Scene {
  private moneyText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private startButton!: Button;

  private cards: TowerCard[] = [];
  private selectedTypeId: string | null = null;
  private waveActive = false;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.cards = [];
    this.selectedTypeId = null;
    this.waveActive = false;

    this.buildTopBar();
    this.buildSidebar();

    this.registerEvents();
    this.refreshAffordability();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  // --- Barra superior (stats) ---

  private buildTopBar(): void {
    this.add
      .rectangle(0, 0, PLAY_WIDTH, HUD_HEIGHT, COLORS.hudPanel, 0.92)
      .setOrigin(0)
      .setDepth(0);

    this.moneyText = this.stat(24, `💰 ${GameState.money}`);
    this.livesText = this.stat(230, `❤️ ${GameState.lives}`);
    this.waveText = this.stat(420, this.waveLabel(GameState.wave));
  }

  private stat(x: number, value: string): Phaser.GameObjects.Text {
    return this.add
      .text(x, HUD_HEIGHT / 2, value, { fontSize: '22px', color: '#ffffff' })
      .setOrigin(0, 0.5)
      .setDepth(1);
  }

  // --- Sidebar de torres ---

  private buildSidebar(): void {
    // Painel de fundo com borda-acento à esquerda.
    this.add
      .rectangle(PLAY_WIDTH, 0, SIDEBAR_WIDTH, GAME_HEIGHT, COLORS.sidebarPanel)
      .setOrigin(0)
      .setDepth(0);
    this.add
      .rectangle(PLAY_WIDTH, 0, 4, GAME_HEIGHT, COLORS.sidebarBorder)
      .setOrigin(0)
      .setDepth(1);

    this.add
      .text(SIDEBAR_CX, 40, '🏰 TORRES', {
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(1);

    const types = Object.values(TOWER_TYPES);
    types.forEach((type, i) => {
      const cy = FIRST_CARD_Y + i * (CARD_HEIGHT + CARD_GAP) + CARD_HEIGHT / 2;
      this.cards.push(this.buildCard(type, cy));
    });

    this.startButton = this.makeButton(
      SIDEBAR_CX,
      GAME_HEIGHT - 44,
      CARD_WIDTH,
      52,
      '▶  Iniciar Onda',
      COLORS.startButton,
      COLORS.startButtonHover,
      () => {
        if (!this.waveActive && !GameState.isOver) EventBus.emit(GameEvents.REQUEST_START_WAVE);
      },
    );
  }

  private buildCard(type: TowerType, cy: number): TowerCard {
    const w = CARD_WIDTH;
    const h = CARD_HEIGHT;

    const bg = this.add
      .rectangle(0, 0, w, h, COLORS.cardBg)
      .setStrokeStyle(2, COLORS.cardBorder);

    const emoji = this.add
      .text(-w / 2 + 34, 0, type.emoji, { fontSize: '40px' })
      .setOrigin(0.5);
    const name = this.add
      .text(-w / 2 + 68, -h / 2 + 20, type.name, {
        fontSize: '17px',
        color: '#ffffff',
        fontStyle: 'bold',
        wordWrap: { width: w / 2 + 40 },
      })
      .setOrigin(0, 0.5);
    const cost = this.add
      .text(-w / 2 + 68, 6, `💰 ${type.cost}`, { fontSize: '15px', color: '#ffe082' })
      .setOrigin(0, 0.5);
    const stats = this.add
      .text(-w / 2 + 68, 28, `⚔️ ${type.damage}   🎯 ${type.range}`, {
        fontSize: '13px',
        color: '#b0b0c0',
      })
      .setOrigin(0, 0.5);

    const container = this.add
      .container(SIDEBAR_CX, cy, [bg, emoji, name, cost, stats])
      .setSize(w, h)
      .setDepth(1)
      .setInteractive(
        new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
        Phaser.Geom.Rectangle.Contains,
      );

    const card: TowerCard = { type, container, bg, cost, selected: false };

    container.on('pointerover', () => {
      this.input.setDefaultCursor('pointer');
      if (!card.selected) bg.setFillStyle(COLORS.cardBgHover);
    });
    container.on('pointerout', () => {
      this.input.setDefaultCursor('default');
      if (!card.selected) bg.setFillStyle(COLORS.cardBg);
    });
    container.on('pointerdown', () => {
      this.pressFeedback(container);
      this.toggleBuild(type.id);
    });

    return card;
  }

  private makeButton(
    cx: number,
    cy: number,
    w: number,
    h: number,
    label: string,
    baseColor: number,
    hoverColor: number,
    onClick: () => void,
  ): Button {
    const bg = this.add.rectangle(0, 0, w, h, baseColor).setStrokeStyle(2, 0xffffff, 0.25);
    const text = this.add
      .text(0, 0, label, { fontSize: '18px', color: '#ffffff', fontStyle: 'bold', align: 'center' })
      .setOrigin(0.5);
    const container = this.add
      .container(cx, cy, [bg, text])
      .setSize(w, h)
      .setDepth(1)
      .setInteractive(
        new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
        Phaser.Geom.Rectangle.Contains,
      );

    const button: Button = { container, bg, label: text, baseColor, hoverColor, enabled: true };
    container.on('pointerover', () => {
      if (button.enabled) {
        this.input.setDefaultCursor('pointer');
        bg.setFillStyle(hoverColor);
      }
    });
    container.on('pointerout', () => {
      this.input.setDefaultCursor('default');
      bg.setFillStyle(baseColor);
    });
    container.on('pointerdown', () => {
      if (!button.enabled) return;
      this.pressFeedback(container);
      onClick();
    });
    return button;
  }

  /** Pequeno "afunda e volta" no clique — feedback tátil imediato. */
  private pressFeedback(target: Phaser.GameObjects.Container): void {
    this.tweens.killTweensOf(target);
    target.setScale(0.94);
    this.tweens.add({ targets: target, scale: 1, duration: 120, ease: 'Back.Out' });
  }

  private setButtonEnabled(button: Button, enabled: boolean): void {
    button.enabled = enabled;
    button.container.setAlpha(enabled ? 1 : 0.45);
    button.bg.setFillStyle(button.baseColor);
  }

  // --- Ações do HUD ---

  private toggleBuild(typeId: string): void {
    const next = this.selectedTypeId === typeId ? null : typeId;
    EventBus.emit(GameEvents.SELECT_TOWER, next);
  }

  private setSelected(typeId: string | null): void {
    this.selectedTypeId = typeId;
    for (const card of this.cards) {
      card.selected = card.type.id === typeId;
      card.bg
        .setFillStyle(card.selected ? COLORS.cardBgHover : COLORS.cardBg)
        .setStrokeStyle(card.selected ? 3 : 2, card.selected ? COLORS.cardSelected : COLORS.cardBorder);
    }
  }

  private refreshAffordability(): void {
    for (const card of this.cards) {
      const affordable = GameState.canAfford(card.type.cost);
      // Mantém clicável (para desmarcar), mas sinaliza indisponibilidade.
      card.cost.setColor(affordable ? '#ffe082' : '#ff9e9e');
      card.container.setAlpha(affordable || card.selected ? 1 : 0.5);
    }
  }

  private waveLabel(wave: number): string {
    return wave === 0 ? '🌊 Onda: —' : `🌊 Onda: ${wave}`;
  }

  // --- Eventos do EventBus ---

  private registerEvents(): void {
    EventBus.on(GameEvents.MONEY_CHANGED, this.onMoney, this);
    EventBus.on(GameEvents.LIVES_CHANGED, this.onLives, this);
    EventBus.on(GameEvents.WAVE_CHANGED, this.onWave, this);
    EventBus.on(GameEvents.WAVE_STATE_CHANGED, this.onWaveState, this);
    EventBus.on(GameEvents.SELECT_TOWER, this.onSelectSync, this);
    EventBus.on(GameEvents.GAME_OVER, this.onGameOver, this);
    EventBus.on(GameEvents.GAME_WON, this.onGameWon, this);
  }

  private onMoney = (money: number): void => {
    this.moneyText.setText(`💰 ${money}`);
    this.refreshAffordability();
  };

  private onLives = (lives: number): void => {
    this.livesText.setText(`❤️ ${lives}`);
  };

  private onWave = (wave: number): void => {
    this.waveText.setText(this.waveLabel(wave));
  };

  private onWaveState = (active: boolean): void => {
    this.waveActive = active;
    this.setButtonEnabled(this.startButton, !active);
  };

  /** Sincroniza a seleção quando muda fora do card (ex.: após construir). */
  private onSelectSync = (towerTypeId: string | null): void => {
    this.setSelected(towerTypeId);
    this.refreshAffordability();
  };

  private onGameOver = (): void => {
    this.showEndScreen('DERROTA', 'Sua cidade foi tomada!', 0xc62828);
  };

  private onGameWon = (): void => {
    this.showEndScreen('VITÓRIA!', 'Você defendeu a cidade!', 0x2e7d32);
  };

  private showEndScreen(title: string, subtitle: string, color: number): void {
    this.setButtonEnabled(this.startButton, false);
    for (const card of this.cards) card.container.disableInteractive().setAlpha(0.45);

    const cx = PLAY_WIDTH / 2;
    const overlay = this.add.container(0, 0).setDepth(100);
    overlay.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setOrigin(0));
    overlay.add(
      this.add
        .rectangle(cx, GAME_HEIGHT / 2, 520, 300, color, 0.95)
        .setStrokeStyle(4, 0xffffff, 0.3),
    );
    overlay.add(
      this.add
        .text(cx, GAME_HEIGHT / 2 - 70, title, {
          fontSize: '52px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );
    overlay.add(
      this.add
        .text(cx, GAME_HEIGHT / 2 - 10, subtitle, { fontSize: '24px', color: '#ffffff' })
        .setOrigin(0.5),
    );

    const restart = this.makeButton(
      cx,
      GAME_HEIGHT / 2 + 70,
      240,
      56,
      '🔁 Jogar novamente',
      COLORS.startButton,
      COLORS.startButtonHover,
      () => this.restartGame(),
    );
    restart.label.setFontSize(20);
    overlay.add(restart.container);
  }

  private restartGame(): void {
    GameState.reset();
    this.scene.get('GameScene').scene.restart();
    this.scene.restart();
  }

  private onShutdown(): void {
    EventBus.off(GameEvents.MONEY_CHANGED, this.onMoney, this);
    EventBus.off(GameEvents.LIVES_CHANGED, this.onLives, this);
    EventBus.off(GameEvents.WAVE_CHANGED, this.onWave, this);
    EventBus.off(GameEvents.WAVE_STATE_CHANGED, this.onWaveState, this);
    EventBus.off(GameEvents.SELECT_TOWER, this.onSelectSync, this);
    EventBus.off(GameEvents.GAME_OVER, this.onGameOver, this);
    EventBus.off(GameEvents.GAME_WON, this.onGameWon, this);
    this.input.setDefaultCursor('default');
  }
}
