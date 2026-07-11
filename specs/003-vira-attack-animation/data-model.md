# Data Model — Animacao de ataque do Vira-lata Caramelo

Este modelo descreve dados e estados da feature. Nomes finais podem variar na implementacao, mas os contratos abaixo devem ser preservados.

## Entity: TowerType (extensao existente)

Fonte: `src/data/towers.ts`

| Campo | Tipo | Regras |
|---|---|---|
| `id` | `string` | Identificador estavel da torre. |
| `name`, `emoji`, `color` | existentes | Mantidos para UI/fallback. |
| `cost`, `range`, `damage`, `fireRate`, `projectileSpeed`, `radius` | existentes | Continuam sendo a unica fonte de regras de gameplay. |
| `spriteKey?` | `string` | Sprite idle/fallback da apresentacao. |
| `attackAnimation?` | `AttackAnimationDefinition` | Definicao visual opcional; nao altera stats. |

Validation:

- `attackAnimation` e opcional; torres sem animacao continuam usando o comportamento/visual existente.
- `range`, `damage`, `fireRate`, `projectileSpeed` e `radius` nao podem ser inferidos de `attackAnimation`.
- Para a Vira-lata Caramelo, a definicao deve conter as etapas `prepare`, `run` e `attack` nessa ordem.

## Entity: AttackAnimationDefinition

Representa a sequencia visual de ataque de uma torre.

| Campo | Tipo | Regras |
|---|---|---|
| `id` | `string` | Ex.: `vira-lata-caramelo-attack`; usado para logs/debug. |
| `visualScale` | `number` | Multiplicador visual relativo ao `TowerType.radius`; nao afeta hitbox. |
| `visualSpeedPxPerSec` | `number` | Velocidade da corrida visual; usa delta time. |
| `arrivalDistancePx` | `number` | Distancia visual considerada "chegou perto do alvo"; nao altera alcance. |
| `stages` | `AttackAnimationStage[]` | Lista ordenada de etapas. |
| `fallbackSpriteKey?` | `string` | Sprite preferencial quando etapa/frame falha. |

Validation:

- `stages.length >= 1`.
- Para esta feature, exatamente uma etapa deve ter `kind: 'loopUntilArrival'` e seu `name` deve ser `run`.
- `visualSpeedPxPerSec > 0`, `visualScale > 0`, `arrivalDistancePx >= 0`.
- O tempo total configurado para preparacao + corrida maxima dentro do alcance + ataque deve ser compativel com a cadencia atual da torre para evitar sobreposicao perceptivel.

## Entity: AttackAnimationStage

Parte nomeada da sequencia.

| Campo | Tipo | Regras |
|---|---|---|
| `name` | `'prepare' \| 'run' \| 'attack' \| string` | Nome semantico da etapa. |
| `kind` | `'once' \| 'loopUntilArrival'` | `once` e finita; `loopUntilArrival` repete frames enquanto o deslocamento visual nao terminou. |
| `frames` | `SpriteFrameRef[]` | Um ou mais frames esperados; frames ausentes podem ser filtrados com log. |
| `frameDurationMs` | `number` | Duracao por frame. |
| `fireCueFrameIndex?` | `number` | Apenas etapa de ataque; frame que emite o projetil/efeito uma unica vez. |
| `minDurationMs?` | `number` | Opcional para preservar leitura visual em distancias curtas. |

Validation:

- `frames.length >= 1` na definicao.
- `frameDurationMs > 0`.
- `fireCueFrameIndex`, se presente, deve apontar para um frame existente.
- Etapas `prepare` e `attack` usam `kind: 'once'`.
- Etapa `run` usa `kind: 'loopUntilArrival'`; se houver um unico frame valido, ele pode repetir sozinho.

## Entity: SpriteFrameRef

Referencia a um sprite carregado no Phaser.

| Campo | Tipo | Regras |
|---|---|---|
| `textureKey` | `string` | Chave estavel em `TEXTURES`; caminho fisico fica somente em `BootScene`. |
| `label?` | `string` | Nome humano para logs/debug. |

Validation:

- `textureKey` nao deve ser caminho de arquivo.
- Falha de carregamento deve ser registrada por `BootScene`; ausencia em runtime deve ser registrada ou sinalizada pelo player quando relevante.

## Entity: TowerVisualState

Estado interno da apresentacao da torre.

Estados:

- `idle`: visual parado no sprite idle/fallback.
- `preparing`: etapa finita de preparacao.
- `running`: deslocamento visual em direcao ao alvo; frames em loop.
- `attacking`: etapa finita de ataque; pode emitir `fireCue`.
- `returning`: retorno/limpeza visual para origem da torre.
- `cancelled`: animacao interrompida por alvo invalido, shutdown ou nova condicao de jogo.

State transitions:

```text
idle -> preparing -> running -> attacking -> returning -> idle
preparing -> cancelled -> idle
running -> cancelled -> idle
attacking -> returning -> idle
returning -> idle
```

Validation:

- Somente uma animacao ativa por `Tower`.
- `fireCue` pode ocorrer no maximo uma vez entre `idle -> ... -> idle`.
- Ao entrar em `idle`, o visual interno deve voltar para offset `(0, 0)` e frame idle/fallback.

## Entity: VisualAttackTarget

Snapshot visual do alvo usado pela animacao.

| Campo | Tipo | Regras |
|---|---|---|
| `enemy` | `Enemy` | Referencia usada apenas para ler posicao/status e para o callback de disparo existente. |
| `initialX`, `initialY` | `number` | Posicao no inicio da animacao; util para fallback se o alvo sumir. |
| `lastKnownX`, `lastKnownY` | `number` | Atualizado enquanto alvo esta vivo. |

Validation:

- Antes do `fireCue`, `Tower` deve revalidar `enemy.status === 'alive'` e distancia dentro de `def.range`.
- O player visual nao decide dano; ele apenas informa o momento visual do cue.

## Entity: AssetLoadResult (conceitual)

Estado de disponibilidade dos sprites.

Estados:

- `loaded`: `scene.textures.exists(textureKey) === true`.
- `missing`: loader falhou ou textura inexistente.
- `fallback`: etapa usa sprite substituto/placeholder.

Validation:

- Falha nao impede construir torre nem atacar.
- Falha nao deve ser silenciosa em desenvolvimento.
