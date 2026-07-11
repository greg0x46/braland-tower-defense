# Contrato de Apresentação — Sprite da torre

Este projeto é um jogo front-end; não expõe API de rede. As "interfaces" são os
contratos internos entre a camada de dados/carregamento e a camada de
apresentação. Este documento fixa esses contratos para que a implementação e os
testes de aceite tenham um alvo verificável.

## C1 — Contrato de carregamento de asset (BootScene)

**Produtor**: `BootScene.preload()`  ·  **Consumidores**: `Tower`, `UIScene`, `BuildManager`

| Item | Contrato |
|---|---|
| Chave de textura | `TEXTURES.towerCaramelo` (`'tower-vira-lata-caramelo'`), estável |
| Origem | URL importada de `src/assets/towers/vira-lata-caramelo.png` (Vite) |
| Momento | Carregado no `preload` da `BootScene`, **antes** de `GameScene`/`UIScene` |
| Sucesso | `scene.textures.exists(TEXTURES.towerCaramelo) === true` ao criar torres |
| Erro | Emite `console.error` com chave/URL via `FILE_LOAD_ERROR`; **não lança** |
| Pós-erro | `textures.exists(key) === false`; consumidores usam fallback |

**Garantia**: nenhum caminho de arquivo aparece fora do import da `BootScene`.

## C2 — Contrato de resolução visual da torre (Tower)

**Entrada**: `TowerType` (`def`) + `scene.textures`

Regra de resolução (determinística):

```
resolveVisual(def, textures):
  if def.spriteKey != null AND textures.exists(def.spriteKey):
     → render Phaser.Image(def.spriteKey)
       displayWidth  = radius * TOWER_SPRITE_SCALE
       displayHeight = displayWidth * (imgHeight / imgWidth)   // preserva aspecto
       origin centrada (offset vertical de apresentação permitido)
  else:
     → render fallback atual: circle(radius, def.color) + text(def.emoji)
```

**Invariantes do contrato (não podem mudar):**

| Aspecto | Antes (placeholder) | Depois (sprite) | Igual? |
|---|---|---|---|
| Hitbox interativa | `Circle(0,0,radius)` | `Circle(0,0,radius)` | ✅ obrigatório |
| Anel de alcance | `circle(range)` centrado | `circle(range)` centrado | ✅ obrigatório |
| Hover mostra alcance | sim | sim | ✅ obrigatório |
| Alvo/cadência/dano | `def.*` | `def.*` | ✅ obrigatório |
| Depth | `DEPTH.tower` (externo) | `DEPTH.tower` (externo) | ✅ obrigatório |
| Origem do projétil | `(this.x, this.y)` | `(this.x, this.y)` | ✅ obrigatório |

Somente o **objeto de exibição** interno do container muda; a geometria de
interação e todos os campos de combate permanecem regidos por `def`.

## C3 — Contrato do card da sidebar (UIScene, US2)

**Produtor**: `UIScene.buildCard(type)`

| Item | Contrato |
|---|---|
| Ícone | Se `type.spriteKey` existe na textura → `Image` escalada ao slot do ícone (~40px, aspecto preservado); senão → `text(type.emoji)` atual |
| Layout | Posição/tamanho do card, nome, custo e stats **inalterados** |
| Interação | Seleção/hover/afetação por saldo **inalteradas** |

## C4 — Contrato do preview de construção (BuildManager, opcional)

| Item | Contrato |
|---|---|
| Preview | Pode exibir o sprite (fallback emoji) seguindo o mouse |
| Validação | `isValidPlacement` e `radius`/`range` do preview **inalterados** |
| Cor válido/inválido | Feedback verde/vermelho preservado (pode recair no corpo/anel) |

## Critérios de conformidade (rastreiam FR/SC)

- C1 cumpre FR-005, FR-006, FR-007.
- C2 cumpre FR-001, FR-002, FR-003, FR-008 e SC-001, SC-002, SC-003.
- C3 cumpre US2 / FR-001 (coesão de card).
- Mover o arquivo cumpre FR-004 / SC-004.
- `npm run build` verde cumpre SC-005.
