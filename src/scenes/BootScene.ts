import Phaser from 'phaser';
import { GameState } from '../core/GameState';
import { COMBAT_SFX, TEXTURES } from '../core/constants';
import { MusicManager } from '../managers/MusicManager';
import {
  CARAMELO_SPRITE_SHEET,
  formatSpriteSheetErrors,
  MAE_DE_HAVAIANAS_SPRITE_SHEET,
  MOTOBOY_SPRITE_SHEET,
  resolveSpriteSheetSpec,
  type SpriteSheetSpec,
} from '../core/spriteSheets';
import initialMapUrl from '../assets/maps/initial-map.png';
import combatAttackSfxUrl from '../assets/audio/combat-attack-default.wav';
import combatImpactSfxUrl from '../assets/audio/combat-impact-default.wav';
import combatKillSfxUrl from '../assets/audio/combat-kill-default.wav';
import combatLeakSfxUrl from '../assets/audio/combat-leak-default.wav';
import chineladaAttackSfxUrl from '../assets/audio/combat-attack-chinelada.wav';
import chineladaImpactSfxUrl from '../assets/audio/combat-impact-chinelada.wav';
import latidoAttackSfxUrl from '../assets/audio/combat-attack-latido.wav';
import motoboySheetUrl from '../assets/enemies/dois-caras-numa-moto/dois-caras-numa-moto-sheet.png';
import caramelUrl from '../assets/towers/vira-lata-caramelo/vira-lata-caramelo.png';
import caramelSheetUrl from '../assets/towers/vira-lata-caramelo/vira-lata-caramelo-sheet.png';
import maeDeHavaianasSheetUrl from '../assets/towers/mae-de-havaianas/mae-de-havaianas-sheet.png';

/**
 * Cena de entrada. Carrega centralmente os sprites das torres (o restante do
 * jogo usa formas + emoji). Reinicia o estado e sobe GameScene + UIScene em
 * paralelo.
 *
 * Ela permanece **ativa** depois disso (daí `launch` em vez de `start`), sem nada
 * para desenhar nem atualizar: é a dona do carregamento em segundo plano da trilha
 * sonora. Ver `startBackgroundMusic()`.
 */
export class BootScene extends Phaser.Scene {
  private music!: MusicManager;

  /** Chaves que esta cena enfileirou — as únicas cujas falhas ela reporta. */
  private readonly ownedAssets = new Set<string>();

  /** Subconjunto de áudio: a falha aqui cai no fallback do catálogo, não no visual. */
  private readonly combatSfxKeys = new Set<string>();

  constructor() {
    super('BootScene');
  }

  preload(): void {
    // Único ponto que conhece o caminho literal do asset (contrato C1).
    this.loadImage(TEXTURES.initialMap, initialMapUrl);
    this.loadImage(TEXTURES.towerCaramelo, caramelUrl);
    this.loadImage(CARAMELO_SPRITE_SHEET.rawTextureKey, caramelSheetUrl);
    this.loadImage(MAE_DE_HAVAIANAS_SPRITE_SHEET.rawTextureKey, maeDeHavaianasSheetUrl);

    // Carrega a imagem crua; o recorte público só é materializado em create()
    // após validar a grade contra as dimensões reais do asset.
    this.loadImage(MOTOBOY_SPRITE_SHEET.rawTextureKey, motoboySheetUrl);

    // Efeitos de combate entram no preload (ao contrário da trilha de 6 MB, que
    // corre em segundo plano): são poucos KB e precisam estar prontos quando o
    // primeiro tiro sair, senão o ataque inicial nasce mudo (D4).
    this.loadAudio(COMBAT_SFX.cacheKeys.attackDefault, combatAttackSfxUrl);
    this.loadAudio(COMBAT_SFX.cacheKeys.impactDefault, combatImpactSfxUrl);
    this.loadAudio(COMBAT_SFX.cacheKeys.killDefault, combatKillSfxUrl);
    this.loadAudio(COMBAT_SFX.cacheKeys.leakDefault, combatLeakSfxUrl);
    this.loadAudio(COMBAT_SFX.cacheKeys.attackChinelada, chineladaAttackSfxUrl);
    this.loadAudio(COMBAT_SFX.cacheKeys.impactChinelada, chineladaImpactSfxUrl);
    this.loadAudio(COMBAT_SFX.cacheKeys.attackLatido, latidoAttackSfxUrl);

    // Sem erro silencioso: registra a falha e deixa os consumidores caírem no
    // fallback (círculo + emoji). Não relança — o jogo segue jogável (FR-007).
    this.load.on(
      Phaser.Loader.Events.FILE_LOAD_ERROR,
      (file: Phaser.Loader.File) => {
        // O loader é da cena, mas os arquivos nem todos: a trilha sonora corre
        // neste mesmo loader e tem outro dono, que registra a própria falha
        // (MusicManager, contrato C4). Sem esta guarda, uma falha sai duas vezes.
        if (!this.ownedAssets.has(file.key)) return;

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
        if (file.key === CARAMELO_SPRITE_SHEET.rawTextureKey) {
          console.error(
            `[BootScene] Falha ao carregar sprite sheet "${file.key}" (${file.url}); Vira-lata Caramelo usará fallback visual jogável.`,
          );
          return;
        }
        if (file.key === MAE_DE_HAVAIANAS_SPRITE_SHEET.rawTextureKey) {
          console.error(
            `[BootScene] Falha ao carregar sprite sheet "${file.key}" (${file.url}); Mãe de Havaianas usará fallback visual jogável.`,
          );
          return;
        }
        if (this.combatSfxKeys.has(file.key)) {
          console.error(
            `[BootScene] Falha ao carregar efeito de combate "${file.key}" (${file.url}); ` +
              'o CombatSfxManager tentará o fallback do catálogo ou seguirá em silêncio.',
          );
          return;
        }
        console.error(
          `[BootScene] Falha ao carregar asset "${file.key}" (${file.url}).`,
        );
      },
    );
  }

  /** Enfileira a imagem e registra a posse — quem carrega é quem reporta a falha. */
  private loadImage(key: string, url: string): void {
    this.ownedAssets.add(key);
    this.load.image(key, url);
  }

  /** Mesma disciplina para áudio: quem carrega é quem reporta a falha (FR-009). */
  private loadAudio(key: string, url: string): void {
    this.ownedAssets.add(key);
    this.combatSfxKeys.add(key);
    this.load.audio(key, url);
  }

  create(): void {
    this.materializeSpriteSheet(MOTOBOY_SPRITE_SHEET, 'Enemy');
    this.materializeSpriteSheet(CARAMELO_SPRITE_SHEET, 'Vira-lata Caramelo');
    this.materializeSpriteSheet(MAE_DE_HAVAIANAS_SPRITE_SHEET, 'Mãe de Havaianas');
    this.registerAnimations();
    this.startBackgroundMusic();
    GameState.reset();
    this.scene.launch('UIScene');
    this.scene.launch('GameScene');
  }

  /**
   * A trilha é carregada em segundo plano, fora do `preload()`: o jogo abre e é
   * jogável antes de a música existir (contrato C2).
   *
   * Isso é o que mantém esta cena viva. Antes, `create()` terminava em
   * `scene.start('GameScene')`, que **encerra** a BootScene — e o encerramento
   * chama `LoaderPlugin.shutdown()`, que faz `removeAllListeners()` no loader.
   * O download da música seria descartado no frame seguinte, sem nunca disparar o
   * `COMPLETE`. Com `launch`, GameScene e UIScene sobem por cima e a BootScene fica
   * ao fundo — sem desenhar nada, sem `update()` — apenas segurando o loader.
   *
   * Ela continua sendo a cena certa para isso porque é a única que **nunca
   * reinicia**: "🔁 Jogar novamente" recria GameScene e UIScene, e a música
   * atravessa o reinício sem parar nem duplicar (C1, FR-003).
   */
  private startBackgroundMusic(): void {
    this.music = new MusicManager(this);
    this.music.start();
  }

  private materializeSpriteSheet(spec: SpriteSheetSpec, ownerLabel: string): void {
    if (!this.textures.exists(spec.rawTextureKey)) {
      console.error(
        `[BootScene] Sprite sheet crua "${spec.rawTextureKey}" ausente; ${ownerLabel} usará fallback círculo+emoji.`,
      );
      return;
    }

    const rawTexture = this.textures.get(spec.rawTextureKey);
    const source = rawTexture.getSourceImage();
    if (!(source instanceof HTMLImageElement)) {
      console.error(
        `[BootScene] Sprite sheet "${spec.rawTextureKey}" não veio de uma imagem HTML; ${ownerLabel} usará fallback círculo+emoji.`,
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
    for (const spec of [
      MOTOBOY_SPRITE_SHEET,
      CARAMELO_SPRITE_SHEET,
      MAE_DE_HAVAIANAS_SPRITE_SHEET,
    ]) {
      if (!this.textures.exists(spec.textureKey)) continue;

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
}
