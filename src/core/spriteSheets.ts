import { ANIMS, TEXTURES } from './constants';

export interface SpriteAnimationSpec {
  readonly key: string;
  readonly start: number;
  readonly end: number;
  readonly frameRate: number;
  readonly repeat: number;
}

export interface VisualScaleSpec {
  readonly displayWidthRadiusMultiplier: number;
  readonly preserveFrameAspectRatio: boolean;
  readonly origin: {
    readonly x: number;
    readonly y: number;
  };
}

export interface SpriteSheetSpec {
  readonly rawTextureKey: string;
  readonly textureKey: string;
  readonly columns: number;
  readonly rows: number;
  readonly animations: readonly SpriteAnimationSpec[];
  readonly visualScale: VisualScaleSpec;
}

export interface ResolvedSpriteSheetSpec extends SpriteSheetSpec {
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frameCount: number;
}

export type SpriteSheetResolutionResult =
  | {
      readonly ok: true;
      readonly spec: ResolvedSpriteSheetSpec;
    }
  | {
      readonly ok: false;
      readonly spec: SpriteSheetSpec;
      readonly imageWidth: number;
      readonly imageHeight: number;
      readonly errors: readonly string[];
    };

export const MOTOBOY_SPRITE_SHEET: SpriteSheetSpec = {
  rawTextureKey: `${TEXTURES.enemyMotoboy}-raw`,
  textureKey: TEXTURES.enemyMotoboy,
  columns: 8,
  rows: 2,
  animations: [
    { key: ANIMS.motoboyRide, start: 0, end: 7, frameRate: 12, repeat: -1 },
    { key: ANIMS.motoboyShoot, start: 8, end: 15, frameRate: 14, repeat: 0 },
  ],
  visualScale: {
    displayWidthRadiusMultiplier: 3.8,
    preserveFrameAspectRatio: true,
    origin: { x: 0.5, y: 0.5 },
  },
} as const;

export function resolveSpriteSheetSpec(
  spec: SpriteSheetSpec,
  imageWidth: number,
  imageHeight: number,
): SpriteSheetResolutionResult {
  const errors = validateSpriteSheetInputs(spec, imageWidth, imageHeight);

  if (errors.length > 0) {
    return {
      ok: false,
      spec,
      imageWidth,
      imageHeight,
      errors,
    };
  }

  const frameCount = spec.columns * spec.rows;
  return {
    ok: true,
    spec: {
      ...spec,
      imageWidth,
      imageHeight,
      frameWidth: imageWidth / spec.columns,
      frameHeight: imageHeight / spec.rows,
      frameCount,
    },
  };
}

export function formatSpriteSheetErrors(
  result: Exclude<SpriteSheetResolutionResult, { readonly ok: true }>,
): string {
  return [
    `Sprite sheet "${result.spec.textureKey}" inválida (${result.imageWidth}x${result.imageHeight}, grade ${result.spec.columns}x${result.spec.rows}).`,
    ...result.errors.map((error) => `- ${error}`),
  ].join('\n');
}

function validateSpriteSheetInputs(
  spec: SpriteSheetSpec,
  imageWidth: number,
  imageHeight: number,
): string[] {
  const errors: string[] = [];
  const frameCount = spec.columns * spec.rows;

  if (!Number.isInteger(spec.columns) || spec.columns <= 0) {
    errors.push(`columns deve ser inteiro positivo; recebido ${spec.columns}.`);
  }
  if (!Number.isInteger(spec.rows) || spec.rows <= 0) {
    errors.push(`rows deve ser inteiro positivo; recebido ${spec.rows}.`);
  }
  if (!Number.isInteger(imageWidth) || imageWidth <= 0) {
    errors.push(`imageWidth deve ser inteiro positivo; recebido ${imageWidth}.`);
  }
  if (!Number.isInteger(imageHeight) || imageHeight <= 0) {
    errors.push(`imageHeight deve ser inteiro positivo; recebido ${imageHeight}.`);
  }

  if (errors.length === 0) {
    if (imageWidth % spec.columns !== 0) {
      errors.push(
        `largura ${imageWidth} não divide exatamente por ${spec.columns} colunas.`,
      );
    }
    if (imageHeight % spec.rows !== 0) {
      errors.push(
        `altura ${imageHeight} não divide exatamente por ${spec.rows} linhas.`,
      );
    }
  }

  for (const animation of spec.animations) {
    if (!Number.isInteger(animation.start) || !Number.isInteger(animation.end)) {
      errors.push(`animação "${animation.key}" deve usar frames inteiros.`);
      continue;
    }
    if (animation.start < 0 || animation.end < animation.start) {
      errors.push(
        `animação "${animation.key}" tem faixa inválida ${animation.start}..${animation.end}.`,
      );
    }
    if (animation.end >= frameCount) {
      errors.push(
        `animação "${animation.key}" termina no frame ${animation.end}, mas a sheet tem ${frameCount} frames.`,
      );
    }
    if (animation.frameRate <= 0) {
      errors.push(`animação "${animation.key}" deve ter frameRate positivo.`);
    }
  }

  if (spec.visualScale.displayWidthRadiusMultiplier <= 0) {
    errors.push('displayWidthRadiusMultiplier deve ser positivo.');
  }
  if (!spec.visualScale.preserveFrameAspectRatio) {
    errors.push('preserveFrameAspectRatio deve permanecer true.');
  }

  return errors;
}
