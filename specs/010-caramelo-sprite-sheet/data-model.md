# Phase 1 — Data Model

Feature de apresentação: não há persistência nem nova regra de domínio. Os
modelos abaixo são contratos em memória para asset, frames e fallback.

## Entidade: RawCarameloSpriteSheet

Fonte de arte bruta deixada na raiz do projeto.

| Campo | Tipo | Valor/Regra |
|-------|------|-------------|
| `path` | `string` | `ChatGPT Image Jul 12, 2026, 01_14_06 AM.png` |
| `sourceColumns` | `number` | `8` |
| `sourceRows` | `number` | `4` |
| `usage` | `'source-only'` | Nunca consumida pelo runtime |
| `background` | `'checkerboard-rgb'` | Deve virar alpha real no asset final |

## Entidade: CarameloSpriteSheetSpec

Contrato de grade consumido por `BootScene`.

| Campo | Tipo | Valor/Regra |
|-------|------|-------------|
| `rawTextureKey` | `string` | Chave privada de load da imagem final bruta |
| `textureKey` | `string` | Chave pública da sheet materializada |
| `columns` | `number` | `8` |
| `rows` | `number` | `4` |
| `frameWidth` | derivado | `imageWidth / columns`, deve ser inteiro |
| `frameHeight` | derivado | `imageHeight / rows`, deve ser inteiro |
| `frameCount` | derivado | `32` |
| `visualScale` | `VisualScaleSpec` | Apresentação relativa ao `radius`, não gameplay |

**Validation rules**:
- `imageWidth % columns === 0`
- `imageHeight % rows === 0`
- todos os frames referenciados por estados visuais ficam dentro de `0..31`
- `preserveFrameAspectRatio` permanece `true`

## Entidade: SpriteFrameRef

Referência tipada a um frame de textura Phaser.

| Campo | Tipo | Regra |
|-------|------|-------|
| `textureKey` | `string` | Deve existir no `TextureManager` para renderizar |
| `frame` | `number | undefined` | Para sheets, inteiro `>=0`; para PNG simples, ausente |
| `label` | `string | undefined` | Apenas depuração/leitura |

## Entidade: CarameloVisualState

Estado visual associado ao engajamento da torre.

| Estado | Frames | Tipo | Regra |
|--------|--------|------|-------|
| `idle` | `0` | estável | usado quando `EngagementState.phase.kind === 'idle'` |
| `prepare` | `8..15` | once | preparação perceptível antes da corrida |
| `run` | `16..23` | loopUntilArrival | pelo menos 6 frames distintos por ciclo |
| `attack` | `25..29` | once | deixa de mordida em `fireCueFrameIndex = 2` |

## Entidade: FallbackVisual

Representação alternativa quando a sheet animada falha.

| Campo | Tipo | Regra |
|-------|------|-------|
| `fallbackSpriteKey` | `string | undefined` | Pode usar o PNG antigo de idle se carregado |
| `emoji`/`color` | dados da torre | círculo+emoji continuam suficientes para jogar |
| `errorLog` | `console.error` | falha de load, grade inválida ou frame ausente é registrada |

**Invariant**: fallback visual nunca altera `cost`, `range`, `damage`,
`fireRate`, `radius`, `attack.kind`, `targetRule`, `visualCuePolicy` ou
`engagement`.
