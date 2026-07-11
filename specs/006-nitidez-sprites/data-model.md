# Phase 1 - Data Model

Feature de apresentacao: nao ha persistencia nem entidades de dominio novas. Os
modelos abaixo descrevem configuracoes/estados em memoria que protegem a nitidez
sem alterar regras de gameplay.

## Entity: SpriteSheetSpec

Contrato de apresentacao para uma folha uniforme de sprites.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `textureKey` | `string` | Chave estavel usada pelo jogo (`TEXTURES.enemyMotoboy`) | Deve ser unica no Texture Manager. |
| `assetUrl` | `string` | Asset importado pelo Vite | Conhecido apenas pela camada de carregamento. |
| `columns` | `number` | Quantidade de quadros por linha | Inteiro positivo; moto usa `8`. |
| `rows` | `number` | Quantidade de linhas | Inteiro positivo; moto usa `2`. |
| `frameWidth` | `number` | Largura derivada por quadro | `imageWidth / columns`, inteiro. |
| `frameHeight` | `number` | Altura derivada por quadro | `imageHeight / rows`, inteiro. |
| `animations` | `SpriteAnimationSpec[]` | Faixas de frames por animacao | Indices dentro de `columns * rows`. |

Validation rules:

- `imageWidth % columns === 0`.
- `imageHeight % rows === 0`.
- `frameWidth > 0` e `frameHeight > 0`.
- Para a moto corrigida, alvo recomendado `2048x1024` (`256x512` por frame), mas
  qualquer dimensao exata e com detalhe suficiente e valida.
- Asset atual `1774x887` e invalido para `8x2` exato; deve acionar log/fallback
  ou caminho legado explicitamente marcado durante transicao.

## Entity: SpriteAnimationSpec

Faixa de frames registrada no AnimationManager do Phaser.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `key` | `string` | Chave da animacao (`ANIMS.motoboyRide`) | Unica no AnimationManager. |
| `start` | `number` | Primeiro frame | Inteiro `>= 0`. |
| `end` | `number` | Ultimo frame | Inteiro `>= start` e `< columns * rows`. |
| `frameRate` | `number` | FPS da animacao | Positivo; ride atual `12`, shoot atual `14`. |
| `repeat` | `number` | Repeticao Phaser | Ride `-1`; shoot `0`. |

Moto:

- `motoboyRide`: frames `0..7`, linha de pilotar, loop infinito.
- `motoboyShoot`: frames `8..15`, linha de atirar, reservado para uso futuro.

## Entity: VisualScaleSpec

Regra de tamanho visual do sprite, separada de colisao/gameplay.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `displayWidthRadiusMultiplier` | `number` | Largura exibida em funcao do `EnemyType.radius` | Mantem valor visual atual; nao altera `radius`. |
| `preserveFrameAspectRatio` | `boolean` | Usa `frameHeight / frameWidth` para altura | Deve ser `true`. |
| `origin` | `{ x: number; y: number }` | Origem visual | Moto usa `{0.5, 0.5}`. |

Rules:

- `displayWidth = enemy.radius * displayWidthRadiusMultiplier`.
- `displayHeight = displayWidth * (frameHeight / frameWidth)`.
- O calculo usa dimensoes do frame, nunca a dimensao total da sheet.
- `EnemyType.radius`, HP, velocidade e recompensa permanecem fonte de gameplay e
  nao sao recalculados a partir do sprite.

## Entity: RenderSharpnessConfig

Configuracao global/de apresentacao para reduzir borrao.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `snapSpriteToPixel` | `boolean` | Alinha desenho visual do sprite a pixels | `true` para sprites texturizados em movimento. |
| `preserveLogicalPosition` | `boolean` | Mantem `Enemy.x/y` fracionario para gameplay | Deve ser `true`. |
| `maxDevicePixelRatio` | `number` | Limite de DPR usado no canvas | Inicialmente `2` para equilibrar nitidez/performance. |
| `pixelArt` | `boolean` | Phaser nearest/pixel-art mode | Deve permanecer `false`. |

Rules:

- Snap visual nao pode alterar path, velocidade, targeting, projeteis ou colisao.
- HiDPI deve manter `FIT`/`CENTER_BOTH`, enquadramento e centralizacao.
- Em DPR alto, o limite evita regressao perceptivel de FPS.

## Existing Entity: EnemyType

Ja existe em `src/data/enemies.ts`.

| Field | Role in this feature |
|-------|----------------------|
| `id`, `name` | Identidade do inimigo; inalterada. |
| `spriteKey?` | Opt-in para sprite sheet; ausente ou asset falho usa fallback. |
| `radius` | Base de colisao e escala visual; valor nao muda. |
| `maxHp`, `speed`, `reward` | Gameplay; devem permanecer identicos. |
| `emoji`, `color` | Fallback jogavel. |

State transitions:

- `asset loading` -> `valid sheet`: cria sprite animado com frame exato.
- `asset loading` -> `missing/invalid sheet`: registra falha e usa fallback.
- `alive/dead/leaked`: estados atuais do inimigo permanecem inalterados.
