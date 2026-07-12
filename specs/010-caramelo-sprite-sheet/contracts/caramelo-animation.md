# Contract — Animação visual do Vira-lata Caramelo

Contrato interno entre `src/core/spriteSheets.ts`, `src/data/towers.ts`,
`src/scenes/BootScene.ts`, `src/entities/Tower.ts` e
`src/entities/TowerAttackAnimator.ts`.

## Sheet

```ts
export const CARAMELO_SPRITE_SHEET: SpriteSheetSpec = {
  rawTextureKey: `${TEXTURES.towerCarameloSheet}-raw`,
  textureKey: TEXTURES.towerCarameloSheet,
  columns: 8,
  rows: 4,
  animations: [
    { key: ANIMS.carameloPrepare, start: 8, end: 15, frameRate: 12, repeat: 0 },
    { key: ANIMS.carameloRun, start: 16, end: 23, frameRate: 14, repeat: -1 },
    { key: ANIMS.carameloAttack, start: 25, end: 29, frameRate: 14, repeat: 0 },
  ],
  visualScale: {
    displayWidthRadiusMultiplier: 3,
    preserveFrameAspectRatio: true,
    origin: { x: 0.5, y: 0.5 },
  },
};
```

`animations` é contrato de faixa/validação. A torre não precisa usar o
`AnimationManager`; ela pode selecionar frames diretamente.

## Tower data

```ts
spriteFrame: { textureKey: TEXTURES.towerCarameloSheet, frame: 0, label: 'idle' },
attackAnimation: {
  id: 'vira-lata-caramelo-attack',
  visualScale: 3,
  visualSpeedPxPerSec: 520,
  arrivalDistancePx: 22,
  idleFrame: { textureKey: TEXTURES.towerCarameloSheet, frame: 0 },
  fallbackSpriteKey: TEXTURES.towerCaramelo,
  stages: [
    { name: 'prepare', kind: 'once', frameDurationMs: 90, minDurationMs: 120, frames: 8..15 },
    { name: 'run', kind: 'loopUntilArrival', frameDurationMs: 70, minDurationMs: 80, frames: 16..23 },
    { name: 'attack', kind: 'once', frameDurationMs: 70, fireCueFrameIndex: 2, frames: 25..29 },
  ],
}
```

## Runtime behavior

1. `BootScene.preload()` carrega a imagem final preparada como
   `CARAMELO_SPRITE_SHEET.rawTextureKey`.
2. `BootScene.create()` resolve a grade com `resolveSpriteSheetSpec()`.
3. Se válida, `BootScene` adiciona `TEXTURES.towerCarameloSheet` como spritesheet
   com `frameWidth`/`frameHeight` derivados.
4. `Tower` cria a imagem inicial com `spriteFrame` quando a textura existe.
5. `TowerAttackAnimator` seleciona `textureKey + frame` conforme a fase do
   `EngagementState`.
6. Se textura ou frame não existir, registra erro uma vez e usa fallback visual.

## Non-goals

- A sheet não define dano, alcance, cadência, colisão, custo, alvo ou progressão.
- A sheet não é pré-requisito para a torre atacar.
- O PNG bruto da raiz não é importado por Vite nem consumido pelo runtime.
