export interface RenderSharpnessConfig {
  readonly snapSpriteToPixel: boolean;
  readonly preserveLogicalPosition: boolean;
  readonly maxDevicePixelRatio: number;
  readonly pixelArt: boolean;
}

export interface LogicalPosition {
  readonly x: number;
  readonly y: number;
}

export interface VisualPositionSnap {
  readonly logicalX: number;
  readonly logicalY: number;
  readonly visualX: number;
  readonly visualY: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

export interface PhaserRenderSharpnessConfig {
  readonly zoom: number;
  readonly pixelArt: boolean;
  readonly roundPixels: boolean;
}

export const DEFAULT_RENDER_SHARPNESS: RenderSharpnessConfig = {
  snapSpriteToPixel: true,
  preserveLogicalPosition: true,
  maxDevicePixelRatio: 2,
  pixelArt: false,
} as const;

export function snapVisualPosition(
  position: LogicalPosition,
  config: RenderSharpnessConfig = DEFAULT_RENDER_SHARPNESS,
  devicePixelRatio = 1,
): VisualPositionSnap {
  const logicalX = position.x;
  const logicalY = position.y;

  if (!config.snapSpriteToPixel) {
    return {
      logicalX,
      logicalY,
      visualX: logicalX,
      visualY: logicalY,
      offsetX: 0,
      offsetY: 0,
    };
  }

  const resolution = clampDevicePixelRatio(devicePixelRatio, config.maxDevicePixelRatio);
  const visualX = Math.round(logicalX * resolution) / resolution;
  const visualY = Math.round(logicalY * resolution) / resolution;

  return {
    logicalX,
    logicalY,
    visualX,
    visualY,
    offsetX: config.preserveLogicalPosition ? visualX - logicalX : 0,
    offsetY: config.preserveLogicalPosition ? visualY - logicalY : 0,
  };
}

export function clampDevicePixelRatio(value: number, maxDevicePixelRatio: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  if (!Number.isFinite(maxDevicePixelRatio) || maxDevicePixelRatio <= 0) return 1;
  return Math.min(value, maxDevicePixelRatio);
}

export function resolveDevicePixelRatio(
  config: RenderSharpnessConfig = DEFAULT_RENDER_SHARPNESS,
  devicePixelRatio = readBrowserDevicePixelRatio(),
): number {
  return clampDevicePixelRatio(devicePixelRatio, config.maxDevicePixelRatio);
}

export function createPhaserRenderSharpnessConfig(
  config: RenderSharpnessConfig = DEFAULT_RENDER_SHARPNESS,
  devicePixelRatio = readBrowserDevicePixelRatio(),
): PhaserRenderSharpnessConfig {
  return {
    zoom: resolveDevicePixelRatio(config, devicePixelRatio),
    pixelArt: config.pixelArt,
    roundPixels: config.snapSpriteToPixel,
  };
}

function readBrowserDevicePixelRatio(): number {
  if (typeof window === 'undefined') return 1;
  return window.devicePixelRatio;
}
