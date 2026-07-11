# Data Model — Mapa inicial com imagem

Fase 1. O modelo é deliberadamente pequeno: um asset visual de mapa, um caminho
de gameplay existente ajustado e uma largura efetiva da estrada. Não há sistema
de múltiplos mapas nesta fatia.

## Entidade: Mapa visual inicial

Arte exibida como fundo da área jogável.

- **Arquivo**: `src/assets/maps/initial-map.png`
- **Origem**: `image.png` movido/renomeado da raiz.
- **Dimensões originais**: `1672×941`.
- **Chave de textura**: `TEXTURES.initialMap` (valor estável sugerido:
  `'map-initial'`).
- **Área de renderização**: `(0, 0, PLAY_WIDTH, GAME_HEIGHT)`.

### Regras

- Deve ser carregado centralmente antes de `GameScene`.
- Deve preencher somente a área jogável, nunca `SIDEBAR_WIDTH`.
- Deve preservar proporção visual aceitável; como o aspecto já combina com a
  área base, `setDisplaySize(PLAY_WIDTH, GAME_HEIGHT)` é suficiente.
- Se a textura não existir, consumidores usam fallback visual.

## Entidade: Caminho de gameplay

Sequência de waypoints que define movimento dos inimigos e bloqueio de
construção.

- **Local**: `src/data/path.ts`
- **Tipo existente**: `Point[]` com `{ x: number; y: number }`
- **Coordenadas**: pixels na área jogável base (`1280×720`).
- **Consumidores**: `Enemy`, `BuildManager`, `DebugOverlay`, sistemas de
  geometria/placement.

### Regras

- O caminho é a autoridade de gameplay, não a imagem.
- Os pontos devem acompanhar visualmente o centro da estrada.
- Pontos de entrada/saída podem ficar levemente fora da área jogável para
  spawns e vazamentos suaves, mas os segmentos visíveis devem atravessar a
  estrada da arte.
- O caminho não depende de API Phaser e permanece testável por geometria pura.

## Entidade: Largura efetiva da estrada

Valor compartilhado que representa a largura total usada para bloqueio de
construção e depuração.

- **Local**: `src/core/constants.ts`
- **Campo existente**: `PATH_WIDTH`
- **Uso atual**: `BuildManager` passa `PATH_WIDTH / 2` como meia-largura para
  `isValidPlacement()`.
- **Valor alvo inicial**: revisar de `48` para aproximadamente `80–90` px,
  confirmando visualmente com debug overlay e casos de placement.

### Regras

- `PATH_WIDTH` representa largura total da estrada para fins de gameplay.
- A validação bloqueia construção quando a distância ao caminho é menor que
  `PATH_WIDTH / 2 + tower.radius`.
- Ajustar `PATH_WIDTH` não deve alterar economia, alcance, dano, ondas ou
  seleção de alvo.

## Entidade: Fallback visual do mapa

Apresentação simples usada quando a textura do mapa não está disponível.

- **Local de renderização**: `GameScene`.
- **Formato**: fundo retangular simples na área jogável.
- **Propósito**: manter partida, construção, inimigos, HUD e debug funcionando.

### Regras

- Deve ser visível apenas quando a textura principal não existe/falhou.
- Deve registrar ou sinalizar a falha de forma útil para desenvolvimento.
- Não deve reintroduzir a trilha visual antiga no modo normal.

## Relacionamentos e invariantes

```text
TEXTURES.initialMap ──carrega──▶ src/assets/maps/initial-map.png
        │
        ├── existe ─────────────▶ GameScene renderiza imagem em PLAY_WIDTH x GAME_HEIGHT
        └── ausente/falha ──────▶ GameScene renderiza fallback simples

PATH + PATH_WIDTH ─────────────▶ Enemy movement + placement validation + debug overlay
```

- **INV-1**: Sidebar e HUD não são cobertos pelo mapa visual.
- **INV-2**: Movimento e bloqueio de construção não leem pixels nem dimensões da
  imagem.
- **INV-3**: `DebugOverlay` é a única visualização normal do caminho real sobre
  o mapa quando depuração está ativada.
- **INV-4**: Jogo normal não desenha a trilha antiga por código sobre a arte.
- **INV-5**: Falha do asset não impede iniciar partida, onda ou construção.

## Transições de estado

```text
[BootScene.preload]
  ├── load map asset com sucesso
  │     └── [GameScene.create] renderiza imagem do mapa
  └── load map asset falha
        ├── erro registrado/sinalizado
        └── [GameScene.create] renderiza fallback simples

[DebugOverlay]
  ├── desativado → nenhum caminho visual extra no jogo normal
  └── ativado    → desenha PATH real sobre mapa ou fallback
```
