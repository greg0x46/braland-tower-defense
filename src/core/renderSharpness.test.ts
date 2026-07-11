import { describe, expect, it } from 'vitest';
import {
  createPhaserRenderSharpnessConfig,
  DEFAULT_RENDER_SHARPNESS,
  resolveDevicePixelRatio,
  snapVisualPosition,
} from './renderSharpness';

describe('DEFAULT_RENDER_SHARPNESS', () => {
  it('mantem os defaults de nitidez sem pixel art', () => {
    expect(DEFAULT_RENDER_SHARPNESS).toEqual({
      snapSpriteToPixel: true,
      preserveLogicalPosition: true,
      maxDevicePixelRatio: 2,
      pixelArt: false,
    });
  });
});

describe('snapVisualPosition', () => {
  it('retorna offset visual alinhado sem alterar x/y logicos', () => {
    const result = snapVisualPosition({ x: 10.25, y: 20.75 }, DEFAULT_RENDER_SHARPNESS, 1);

    expect(result.logicalX).toBe(10.25);
    expect(result.logicalY).toBe(20.75);
    expect(result.visualX).toBe(10);
    expect(result.visualY).toBe(21);
    expect(result.offsetX).toBe(-0.25);
    expect(result.offsetY).toBe(0.25);
  });

  it('usa a resolucao de render para snap em passos de subpixel fisico', () => {
    const result = snapVisualPosition({ x: 10.25, y: 20.75 }, DEFAULT_RENDER_SHARPNESS, 2);

    expect(result.visualX).toBe(10.5);
    expect(result.visualY).toBe(21);
    expect(result.offsetX).toBe(0.25);
    expect(result.offsetY).toBe(0.25);
  });

  it('nao muta campos logicos usados por targeting, path ou estado', () => {
    const logicalState = Object.freeze({
      x: 10.25,
      y: 20.75,
      distanceTravelled: 123.4,
      segmentIndex: 3,
      status: 'alive',
    });

    snapVisualPosition(logicalState, DEFAULT_RENDER_SHARPNESS, 1);

    expect(logicalState).toEqual({
      x: 10.25,
      y: 20.75,
      distanceTravelled: 123.4,
      segmentIndex: 3,
      status: 'alive',
    });
  });
});

describe('HiDPI render config', () => {
  it('limita devicePixelRatio ao maxDevicePixelRatio configurado', () => {
    expect(resolveDevicePixelRatio(DEFAULT_RENDER_SHARPNESS, 3)).toBe(2);
    expect(resolveDevicePixelRatio(DEFAULT_RENDER_SHARPNESS, 1.5)).toBe(1.5);
    expect(resolveDevicePixelRatio(DEFAULT_RENDER_SHARPNESS, 0)).toBe(1);
  });

  it('preserva pixelArt=false e expõe zoom/roundPixels sem tocar nas premissas FIT/CENTER', () => {
    expect(createPhaserRenderSharpnessConfig(DEFAULT_RENDER_SHARPNESS, 3)).toEqual({
      zoom: 2,
      pixelArt: false,
      roundPixels: true,
    });
  });
});
