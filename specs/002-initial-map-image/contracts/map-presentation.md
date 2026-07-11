# Contrato de Apresentação — Mapa inicial

Este projeto é um jogo front-end; não expõe API de rede. As interfaces
relevantes aqui são contratos internos entre carregamento de asset, apresentação
da cena e regras de gameplay.

## C1 — Contrato de carregamento do mapa

**Produtor**: `BootScene.preload()`  
**Consumidores**: `GameScene`, validação visual/manual

| Item | Contrato |
|---|---|
| Chave de textura | `TEXTURES.initialMap`, string estável |
| Origem | URL importada de `src/assets/maps/initial-map.png` |
| Momento | Carregado antes de `GameScene.create()` |
| Sucesso | `scene.textures.exists(TEXTURES.initialMap) === true` |
| Erro | Falha registrada/sinalizada com chave/URL; jogo não lança nem trava |
| Pós-erro | `GameScene` renderiza fallback simples |

**Garantia**: o caminho físico do asset aparece apenas no import central de
carregamento; gameplay consome somente identificadores e dados próprios.

## C2 — Contrato de renderização do mapa

**Produtor**: `GameScene.create()` / helper de background  
**Área permitida**: `x=0`, `y=0`, `width=PLAY_WIDTH`, `height=GAME_HEIGHT`

Regra de resolução:

```text
if textures.exists(TEXTURES.initialMap):
  render Image(TEXTURES.initialMap)
  origin = (0, 0)
  displaySize = (PLAY_WIDTH, GAME_HEIGHT)
  depth = fundo
else:
  render fallback retangular simples
  origin = (0, 0)
  size = (PLAY_WIDTH, GAME_HEIGHT)
  depth = fundo
```

Invariantes:

| Aspecto | Obrigatório |
|---|---|
| Sidebar | Nunca coberta pelo mapa |
| HUD/UI | Continua visível e interativo |
| Trilha antiga | Não aparece no modo normal |
| Ordem visual | Inimigos, torres, projéteis e debug ficam acima do fundo |
| Fallback | Mantém a partida jogável sem asset |

## C3 — Contrato do caminho de gameplay

**Produtor**: `src/data/path.ts` + `PATH_WIDTH` em `constants.ts`  
**Consumidores**: `Enemy`, `BuildManager`, `DebugOverlay`, `placement.ts`

| Item | Contrato |
|---|---|
| Coordenadas | Pixels da área jogável base (`1280×720`) |
| Autoridade | `PATH` define movimento e estrada bloqueada |
| Largura | `PATH_WIDTH` é largura total; placement usa `PATH_WIDTH / 2` |
| Construção | Rejeita ponto quando `distanceToPath < PATH_WIDTH / 2 + tower.radius` |
| Arte | Imagem não é lida para regra de movimento ou construção |

Invariantes:

- Inimigos seguem `PATH` do primeiro ao último waypoint.
- `isValidPlacement()` continua puro e sem dependência de Phaser.
- Ajustar caminho/largura não altera custo, dano, alcance, ondas ou economia.

## C4 — Contrato do debug overlay

**Produtor**: `DebugOverlay` em desenvolvimento  
**Consumidor**: desenvolvedor ajustando mapa/caminho

| Estado | Contrato |
|---|---|
| Desativado | Nenhum caminho visual extra aparece no jogo normal |
| Ativado | Linha central do `PATH`, métricas e informações atuais aparecem acima do mapa/fallback |
| Fallback | Overlay ainda funciona quando o asset do mapa falhou |

## Critérios de conformidade

- C1 cumpre FR-001, FR-010 e FR-011.
- C2 cumpre FR-002, FR-003, FR-004 e SC-001/SC-002.
- C3 cumpre FR-005 a FR-009, FR-014 e SC-003/SC-004.
- C4 cumpre FR-012 e SC-006.
