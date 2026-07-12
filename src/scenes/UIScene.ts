import Phaser from 'phaser';
import {
  GameEvents,
  emitGameEvent,
  offGameEvent,
  onGameEvent,
  type GameEventPayloads,
} from '../core/EventBus';
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
import {
  ROSTER_CONTROL,
  SIDEBAR_ROSTER_LAYOUT as ROSTER,
  cardCenterY,
  clampScroll,
  computeRosterLayout,
  scrollToCard,
  type RosterLayout,
} from '../systems/rosterLayout';

/** Layout da sidebar de torres (à direita do campo de jogo). */
const SIDEBAR_CX = PLAY_WIDTH + SIDEBAR_WIDTH / 2;
const CARD_WIDTH = SIDEBAR_WIDTH - 40;
const CARD_HEIGHT = ROSTER.cardHeight;

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
  private pauseButton!: Button;

  private cards: TowerCard[] = [];
  private selectedTypeId: string | null = null;

  /** Cards vivem aqui dentro para poderem rolar sob uma máscara. */
  private rosterViewport!: Phaser.GameObjects.Container;
  private rosterLayout!: RosterLayout;
  private scrollOffset = 0;
  private scrollHint!: Phaser.GameObjects.Text;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.cards = [];
    this.selectedTypeId = null;
    this.scrollOffset = 0;

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

    // Cards numa janela rolável: o roster pode crescer sem empurrar nenhum card
    // para fora do alcance nem por baixo dos controles (FR-011).
    const types = Object.values(TOWER_TYPES);
    this.rosterLayout = computeRosterLayout(types.length);
    this.rosterViewport = this.add.container(0, 0).setDepth(1);
    this.rosterViewport.setMask(this.createRosterMask());

    types.forEach((type, index) => {
      const card = this.buildCard(type, cardCenterY(index, this.scrollOffset));
      this.rosterViewport.add(card.container);
      this.cards.push(card);
    });

    // Fica na faixa reservada entre os cards e o botão — nunca por cima dele.
    this.scrollHint = this.add
      .text(SIDEBAR_CX, ROSTER.viewportBottom + 4, '▾  role para ver mais', {
        fontSize: '12px',
        color: '#b0b0c0',
      })
      .setOrigin(0.5, 0)
      .setDepth(2)
      .setVisible(false);

    this.input.on(Phaser.Input.Events.POINTER_WHEEL, this.onWheel, this);
    this.refreshScroll();

    // Mesmo slot: começa como "Iniciar" (partida congelada) e vira Pausar/Continuar.
    this.pauseButton = this.makeButton(
      SIDEBAR_CX,
      ROSTER_CONTROL.centerY,
      CARD_WIDTH,
      ROSTER_CONTROL.height,
      '▶  Iniciar',
      COLORS.startButton,
      COLORS.startButtonHover,
      () => GameState.togglePause(),
    );
  }

  /** Recorta a área de cards: nada vaza sobre o título nem sobre os controles. */
  private createRosterMask(): Phaser.Display.Masks.GeometryMask {
    const shape = this.make.graphics({}, false);
    shape.fillStyle(0xffffff);
    shape.fillRect(
      PLAY_WIDTH,
      ROSTER.firstCardY,
      SIDEBAR_WIDTH,
      ROSTER.viewportBottom - ROSTER.firstCardY,
    );
    return shape.createGeometryMask();
  }

  private onWheel = (
    pointer: Phaser.Input.Pointer,
    _objects: unknown,
    _dx: number,
    dy: number,
  ): void => {
    if (!this.rosterLayout.scrollable) return;
    if (pointer.x < PLAY_WIDTH) return; // roda sobre o campo não rola o menu
    this.setScroll(this.scrollOffset + dy * 0.5);
  };

  private setScroll(next: number): void {
    const clamped = clampScroll(next, this.rosterLayout);
    if (clamped === this.scrollOffset) return;
    this.scrollOffset = clamped;
    this.refreshScroll();
  }

  /** Reposiciona os cards conforme a rolagem e atualiza a dica. */
  private refreshScroll(): void {
    this.cards.forEach((card, index) => {
      card.container.setY(cardCenterY(index, this.scrollOffset));
    });

    const hasMoreBelow =
      this.rosterLayout.scrollable && this.scrollOffset < this.rosterLayout.maxScroll;
    this.scrollHint.setVisible(hasMoreBelow);
  }

  /** Traz um card inteiro para a área visível (usado ao selecionar por teclado/HUD). */
  private revealCard(index: number): void {
    if (!this.rosterLayout.scrollable) return;
    this.setScroll(scrollToCard(index, this.cards.length));
  }

  private buildCard(type: TowerType, cy: number): TowerCard {
    const w = CARD_WIDTH;
    const h = CARD_HEIGHT;

    const bg = this.add
      .rectangle(0, 0, w, h, COLORS.cardBg)
      .setStrokeStyle(2, COLORS.cardBorder);

    const icon = this.buildCardIcon(type, -w / 2 + 34);
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
      .container(SIDEBAR_CX, cy, [bg, icon, name, cost, stats])
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

  /**
   * Ícone do card (contrato C3): sprite escalado ao slot (~40px, aspecto
   * preservado) quando a textura existe; senão, o emoji atual. Layout do card
   * (posição/tamanho, nome, custo, stats) permanece inalterado.
   */
  private buildCardIcon(type: TowerType, x: number): Phaser.GameObjects.GameObject {
    const SLOT = 40;
    if (type.spriteKey && this.textures.exists(type.spriteKey)) {
      const image = this.add.image(x, 0, type.spriteKey).setOrigin(0.5);
      const src = image.texture.getSourceImage();
      // Encaixa a imagem inteira dentro de um quadrado SLOT×SLOT, preservando o aspecto.
      const scale = SLOT / Math.max(src.width, src.height);
      image.setDisplaySize(src.width * scale, src.height * scale);
      return image;
    }
    return this.add.text(x, 0, type.emoji, { fontSize: '40px' }).setOrigin(0.5);
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
    // Congelamento durante a partida: cliques nos cards ignorados quando pausado.
    // (No setup pré-início a construção é liberada.)
    if (GameState.isBuildLocked) return;
    const next = this.selectedTypeId === typeId ? null : typeId;
    emitGameEvent(GameEvents.SELECT_TOWER, { towerTypeId: next });
  }

  private setSelected(typeId: string | null): void {
    this.selectedTypeId = typeId;
    for (const card of this.cards) {
      card.selected = card.type.id === typeId;
    }
    this.refreshCardStates();

    const index = this.cards.findIndex((card) => card.selected);
    if (index >= 0) this.revealCard(index);
  }

  private refreshAffordability(): void {
    this.refreshCardStates();
  }

  /**
   * Seleção e saldo são dois canais visuais independentes (contrato de roster UI):
   * a seleção é o anel âmbar; o saldo é a cor do custo + a opacidade. Assim uma
   * torre selecionada-sem-saldo nunca se confunde com uma disponível-não-selecionada.
   */
  private refreshCardStates(): void {
    for (const card of this.cards) {
      const affordable = GameState.canAfford(card.type.cost);

      card.bg
        .setFillStyle(card.selected ? COLORS.cardBgHover : COLORS.cardBg)
        .setStrokeStyle(
          card.selected ? 3 : 2,
          card.selected ? COLORS.cardSelected : COLORS.cardBorder,
        );

      card.cost.setColor(affordable ? '#ffe082' : '#ff9e9e');
      // Sem saldo → esmaecido; selecionado sem saldo fica intermediário, para
      // continuar legível como "selecionada" sem parecer disponível.
      card.container.setAlpha(affordable ? 1 : card.selected ? 0.75 : 0.5);
    }
  }

  /**
   * Modo endless: mostra a onda atual sem sugerir um total. O "∞" deixa o
   * contrato explícito para o jogador — não existe onda final nem vitória.
   */
  private waveLabel(wave: number): string {
    return wave === 0 ? '🌊 Onda: — /∞' : `🌊 Onda: ${wave}/∞`;
  }

  // --- Eventos do EventBus ---

  private registerEvents(): void {
    onGameEvent(GameEvents.MONEY_CHANGED, this.onMoney, this);
    onGameEvent(GameEvents.LIVES_CHANGED, this.onLives, this);
    onGameEvent(GameEvents.WAVE_CHANGED, this.onWave, this);
    onGameEvent(GameEvents.PAUSE_STATE_CHANGED, this.onPauseChanged, this);
    onGameEvent(GameEvents.SELECT_TOWER, this.onSelectSync, this);
    onGameEvent(GameEvents.MATCH_DEFEATED, this.onMatchDefeated, this);
  }

  private onMoney = ({ money }: GameEventPayloads['money-changed']): void => {
    this.moneyText.setText(`💰 ${money}`);
    this.refreshAffordability();
  };

  private onLives = ({ lives }: GameEventPayloads['lives-changed']): void => {
    this.livesText.setText(`❤️ ${lives}`);
  };

  private onWave = ({ wave }: GameEventPayloads['wave-changed']): void => {
    this.waveText.setText(this.waveLabel(wave));
  };

  /**
   * Reflete o estado de execução no botão imediatamente (FR-009, SC-005):
   * "▶ Iniciar" antes do primeiro start, "⏸ Pausar" em jogo, "▶ Continuar" pausado.
   */
  private onPauseChanged = ({
    paused,
    started,
  }: GameEventPayloads['pause-state-changed']): void => {
    const button = this.pauseButton;
    const label = paused ? (started ? '▶  Continuar' : '▶  Iniciar') : '⏸  Pausar';
    button.label.setText(label);
    button.baseColor = paused ? COLORS.startButton : COLORS.pauseButton;
    button.hoverColor = paused ? COLORS.startButtonHover : COLORS.pauseButtonHover;
    button.bg.setFillStyle(button.baseColor);
  };

  /** Sincroniza a seleção quando muda fora do card (ex.: após construir). */
  private onSelectSync = ({ towerTypeId }: GameEventPayloads['select-tower']): void => {
    this.setSelected(towerTypeId);
    this.refreshAffordability();
  };

  private onMatchDefeated = (): void => {
    this.showEndScreen('DERROTA', 'Sua cidade foi tomada!', 0xc62828);
  };

  private showEndScreen(title: string, subtitle: string, color: number): void {
    // Botão Pausar/Continuar fica inerte após o fim de jogo (edge case da spec).
    this.setButtonEnabled(this.pauseButton, false);
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

  /**
   * Reinício: volta ao setup-paused. `GameState.reset()` zera economia, vida,
   * onda e estado; recriar as cenas descarta torres, inimigos, projéteis, a tela
   * de fim e a seleção pendente (contrato de progressão).
   */
  private restartGame(): void {
    GameState.reset();
    this.scene.get('GameScene').scene.restart();
    this.scene.restart();
  }

  private onShutdown(): void {
    offGameEvent(GameEvents.MONEY_CHANGED, this.onMoney, this);
    offGameEvent(GameEvents.LIVES_CHANGED, this.onLives, this);
    offGameEvent(GameEvents.WAVE_CHANGED, this.onWave, this);
    offGameEvent(GameEvents.PAUSE_STATE_CHANGED, this.onPauseChanged, this);
    offGameEvent(GameEvents.SELECT_TOWER, this.onSelectSync, this);
    offGameEvent(GameEvents.MATCH_DEFEATED, this.onMatchDefeated, this);
    this.input.off(Phaser.Input.Events.POINTER_WHEEL, this.onWheel, this);
    this.input.setDefaultCursor('default');
  }
}
