import { describe, expect, it } from 'vitest';
import {
  formatSpriteSheetErrors,
  MOTOBOY_SPRITE_SHEET,
  resolveSpriteSheetSpec,
} from './spriteSheets';
import { ANIMS, TEXTURES } from './constants';

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

describe('resolveSpriteSheetSpec', () => {
  it('deriva dimensoes inteiras do frame para uma sheet 8x2 exata', () => {
    const result = resolveSpriteSheetSpec(MOTOBOY_SPRITE_SHEET, 2048, 1024);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.errors.join(', '));
    expect(result.spec.frameWidth).toBe(256);
    expect(result.spec.frameHeight).toBe(512);
    expect(result.spec.frameCount).toBe(16);
  });

  it('valida ranges de animacao dentro da contagem total de frames', () => {
    const result = resolveSpriteSheetSpec(MOTOBOY_SPRITE_SHEET, 2048, 1024);

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
});
