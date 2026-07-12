import { describe, expect, it } from 'vitest';
import {
  CARAMELO_SPRITE_SHEET,
  formatSpriteSheetErrors,
  MAE_DE_HAVAIANAS_SPRITE_SHEET,
  MOTOBOY_SPRITE_SHEET,
  resolveSpriteSheetSpec,
} from './spriteSheets';
import { ANIMS, TEXTURES } from './constants';
import { existsSync } from 'node:fs';

describe('MOTOBOY_SPRITE_SHEET', () => {
  it('centraliza as chaves publicas, raw e a grade 8x2', () => {
    expect(MOTOBOY_SPRITE_SHEET.rawTextureKey).toBe(`${TEXTURES.enemyMotoboy}-raw`);
    expect(MOTOBOY_SPRITE_SHEET.textureKey).toBe(TEXTURES.enemyMotoboy);
    expect(MOTOBOY_SPRITE_SHEET.columns).toBe(8);
    expect(MOTOBOY_SPRITE_SHEET.rows).toBe(2);
  });

  it('declara ride 0..7 e shoot 8..15 sem numeros magicos no BootScene', () => {
    expect(MOTOBOY_SPRITE_SHEET.animations).toEqual([
      { key: ANIMS.motoboyRide, start: 0, end: 7, frameRate: 12, repeat: -1 },
      { key: ANIMS.motoboyShoot, start: 8, end: 15, frameRate: 14, repeat: 0 },
    ]);
  });
});

describe('CARAMELO_SPRITE_SHEET', () => {
  it('centraliza a sheet animada do Caramelo em grade 8x4', () => {
    expect(CARAMELO_SPRITE_SHEET.rawTextureKey).toBe(`${TEXTURES.towerCarameloSheet}-raw`);
    expect(CARAMELO_SPRITE_SHEET.textureKey).toBe(TEXTURES.towerCarameloSheet);
    expect(CARAMELO_SPRITE_SHEET.columns).toBe(8);
    expect(CARAMELO_SPRITE_SHEET.rows).toBe(4);
  });

  it('declara levantar, corrida, mordida e deitar dentro dos 32 frames da sheet', () => {
    expect(CARAMELO_SPRITE_SHEET.animations).toEqual([
      { key: ANIMS.carameloStandingUp, start: 10, end: 15, frameRate: 12, repeat: 0 },
      { key: ANIMS.carameloChasing, start: 16, end: 23, frameRate: 14, repeat: -1 },
      { key: ANIMS.carameloBiting, start: 25, end: 29, frameRate: 14, repeat: 0 },
      { key: ANIMS.carameloLyingDown, start: 8, end: 15, frameRate: 12, repeat: 0 },
    ]);

    for (const animation of CARAMELO_SPRITE_SHEET.animations) {
      expect(animation.start).toBeGreaterThanOrEqual(0);
      expect(animation.end).toBeLessThan(32);
    }
  });
});

describe('MAE_DE_HAVAIANAS_SPRITE_SHEET', () => {
  it('centraliza a sheet animada da Mãe de Havaianas em grade 8x4', () => {
    expect(MAE_DE_HAVAIANAS_SPRITE_SHEET.rawTextureKey).toBe(
      `${TEXTURES.towerMaeHavaianasSheet}-raw`,
    );
    expect(MAE_DE_HAVAIANAS_SPRITE_SHEET.textureKey).toBe(TEXTURES.towerMaeHavaianasSheet);
    expect(MAE_DE_HAVAIANAS_SPRITE_SHEET.columns).toBe(8);
    expect(MAE_DE_HAVAIANAS_SPRITE_SHEET.rows).toBe(4);
  });

  it('declara idle, preparo, arremesso e recuperacao dentro dos 32 frames', () => {
    expect(MAE_DE_HAVAIANAS_SPRITE_SHEET.animations).toEqual([
      { key: ANIMS.maeHavaianasIdle, start: 0, end: 7, frameRate: 8, repeat: -1 },
      { key: ANIMS.maeHavaianasReadying, start: 9, end: 13, frameRate: 12, repeat: 0 },
      { key: ANIMS.maeHavaianasThrowing, start: 24, end: 27, frameRate: 14, repeat: 0 },
      { key: ANIMS.maeHavaianasRecovering, start: 30, end: 31, frameRate: 10, repeat: 0 },
    ]);

    for (const animation of MAE_DE_HAVAIANAS_SPRITE_SHEET.animations) {
      expect(animation.start).toBeGreaterThanOrEqual(0);
      expect(animation.end).toBeLessThan(32);
    }
  });
});

describe('resolveSpriteSheetSpec', () => {
  it('deriva dimensoes inteiras do frame para uma sheet 8x2 exata', () => {
    const result = resolveSpriteSheetSpec(MOTOBOY_SPRITE_SHEET, 2048, 512);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.errors.join(', '));
    expect(result.spec.frameWidth).toBe(256);
    expect(result.spec.frameHeight).toBe(256);
    expect(result.spec.frameCount).toBe(16);
  });

  it('valida ranges de animacao dentro da contagem total de frames', () => {
    const result = resolveSpriteSheetSpec(MOTOBOY_SPRITE_SHEET, 2048, 512);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.errors.join(', '));
    for (const animation of result.spec.animations) {
      expect(animation.start).toBeGreaterThanOrEqual(0);
      expect(animation.end).toBeLessThan(result.spec.frameCount);
      expect(animation.end).toBeGreaterThanOrEqual(animation.start);
    }
  });

  it('rejeita dimensoes irregulares 1774x887 em vez de aceitar recorte silencioso', () => {
    const result = resolveSpriteSheetSpec(MOTOBOY_SPRITE_SHEET, 1774, 887);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected invalid sheet');
    expect(result.errors).toEqual([
      'largura 1774 não divide exatamente por 8 colunas.',
      'altura 887 não divide exatamente por 2 linhas.',
    ]);
    expect(formatSpriteSheetErrors(result)).toContain('Sprite sheet "enemy-dois-caras-moto" inválida');
  });

  it('deriva frames 256x256 para a sheet final 8x4 do Caramelo', () => {
    const result = resolveSpriteSheetSpec(CARAMELO_SPRITE_SHEET, 2048, 1024);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.errors.join(', '));
    expect(result.spec.frameWidth).toBe(256);
    expect(result.spec.frameHeight).toBe(256);
    expect(result.spec.frameCount).toBe(32);
  });

  it('deriva frames 256x256 para a sheet final 8x4 da Mãe de Havaianas', () => {
    const result = resolveSpriteSheetSpec(MAE_DE_HAVAIANAS_SPRITE_SHEET, 2048, 1024);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.errors.join(', '));
    expect(result.spec.frameWidth).toBe(256);
    expect(result.spec.frameHeight).toBe(256);
    expect(result.spec.frameCount).toBe(32);
  });

  it('rejeita a imagem bruta 1774x887 do Caramelo como asset runtime', () => {
    const result = resolveSpriteSheetSpec(CARAMELO_SPRITE_SHEET, 1774, 887);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected invalid sheet');
    expect(result.errors).toEqual([
      'largura 1774 não divide exatamente por 8 colunas.',
      'altura 887 não divide exatamente por 4 linhas.',
    ]);
    expect(formatSpriteSheetErrors(result)).toContain(
      'Sprite sheet "tower-vira-lata-caramelo-sheet" inválida',
    );
  });
});

describe('asset layout', () => {
  it('mantem sprites runtime organizados por dominio', () => {
    expect(existsSync('src/assets/towers/vira-lata-caramelo/vira-lata-caramelo-sheet.png')).toBe(
      true,
    );
    expect(existsSync('src/assets/towers/mae-de-havaianas/mae-de-havaianas-sheet.png')).toBe(
      true,
    );
    expect(
      existsSync('src/assets/enemies/dois-caras-numa-moto/dois-caras-numa-moto-sheet.png'),
    ).toBe(true);
  });
});
