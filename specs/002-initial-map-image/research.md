# Research — Mapa inicial com imagem

Fase 0. Não havia clarificações pendentes no contexto técnico; este documento
registra as decisões de implementação que removem ambiguidades antes do design.

## Estado atual verificado

- `image.png` existe na raiz do repositório e tem **1672×941 px**, RGB, não
  entrelaçado.
- A área jogável base é `PLAY_WIDTH x GAME_HEIGHT = 1280×720`; a sidebar ocupa
  `SIDEBAR_WIDTH = 300` à direita, fora dessa área.
- O mapa atual é desenhado por código em `GameScene`: um retângulo verde em
  `drawBackground()` e a trilha em `drawPath()` usando `PATH` e `PATH_WIDTH`.
- `PATH` vive em `src/data/path.ts` e é consumido por `Enemy` para movimento.
- A validação de construção em `BuildManager` passa `PATH` e `PATH_WIDTH / 2`
  para `isValidPlacement()`, que é uma regra pura em `src/systems/placement.ts`.
- `DebugOverlay` já desenha a linha central do `PATH` e mostra `PATH_WIDTH`,
  então é o ponto natural para validar alinhamento sobre a arte.
- `BootScene` já centraliza carregamento de asset da torre e registra
  `FILE_LOAD_ERROR`, com fallback pelos consumidores quando a textura não existe.

## Decisão 1 — Local, nome e chave do asset do mapa

- **Decision**: mover `image.png` para `src/assets/maps/initial-map.png` e
  carregar com uma chave estável, por exemplo
  `TEXTURES.initialMap = 'map-initial'`.
- **Rationale**: tira o asset da raiz, organiza por domínio (`maps`) e mantém
  o padrão já usado para a torre: código de gameplay conhece a chave, não o
  caminho físico. Vite empacota a imagem via import e gera URL versionada.
- **Alternatives considered**:
  - Manter `image.png` na raiz: rejeitado por organização e pelo critério de
    aceite que permite mover/renomear para assets.
  - Colocar em `public/`: funciona, mas exigiria caminho literal e perde o
    cache-busting do import pelo bundler.

## Decisão 2 — Encaixe visual na área jogável

- **Decision**: renderizar a imagem com origem em `(0, 0)` e display size
  `PLAY_WIDTH x GAME_HEIGHT`, depth de fundo, sem afetar `GAME_WIDTH` ou a
  sidebar.
- **Rationale**: a proporção da imagem é `1672 / 941 = 1.7768`; a proporção da
  área jogável é `1280 / 720 = 1.7778`. A diferença é menor que 0,1%, então
  preencher diretamente a área jogável evita crop, barras ou cálculo extra e
  preserva a estrada visualmente.
- **Alternatives considered**:
  - `cover` com crop: desnecessário e arriscaria cortar túneis/entradas.
  - `contain` com barras: deixaria faixa vazia e reduziria legibilidade.
  - Expandir para `GAME_WIDTH`: rejeitado porque cobriria a sidebar.

## Decisão 3 — Fallback visual do mapa

- **Decision**: `GameScene` deve tentar renderizar a textura do mapa apenas se
  ela existir; caso contrário, desenha o fundo retangular simples atual dentro
  de `PLAY_WIDTH x GAME_HEIGHT` e registra que o fallback está ativo.
- **Rationale**: cumpre FR-010/FR-011 e a constitution (sem erro silencioso,
  assets substituíveis). O jogo continua jogável sem depender da arte final.
- **Alternatives considered**:
  - Travar o boot se o mapa falhar: rejeitado porque o jogo deve continuar
    jogável.
  - Desenhar a trilha antiga como fallback automático: rejeitado para o jogo
    normal porque poderia mascarar desalinhamento; o debug overlay cobre a
    necessidade de visualizar caminho.

## Decisão 4 — Remoção da trilha visual antiga

- **Decision**: o jogo normal não chama mais o desenho de caminho por código.
  A linha antiga fica ausente da apresentação normal; apenas o debug overlay
  mostra o caminho real quando ativado em desenvolvimento.
- **Rationale**: atende FR-004 e preserva observabilidade. A trilha desenhada
  por código era apresentação, não regra; manter sobre a arte poluiria o mapa.
- **Alternatives considered**:
  - Manter a trilha semi-transparente: rejeitado porque o critério de aceite
    exige que a trilha antiga não apareça por cima da arte.

## Decisão 5 — Waypoints e largura da estrada

- **Decision**: manter `PATH` em `src/data/path.ts` como sequência de waypoints
  em coordenadas da área jogável base (`1280×720`) e ajustar seus pontos para
  seguir a estrada da imagem. Revisar `PATH_WIDTH` de `48` para um valor mais
  próximo da largura visual da estrada, inicialmente na faixa de **80–90 px**
  como largura total, validado com overlay e testes de placement.
- **Rationale**: o caminho continua testável, determinístico e independente da
  arte. A imagem original escala quase exatamente para a área base; portanto,
  coordenadas medidas visualmente no mapa renderizado correspondem diretamente
  às coordenadas de gameplay. Uma estrada de ~80–90 px evita torres sobre asfalto
  e meio-fio sem bloquear grandes áreas verdes.
- **Alternatives considered**:
  - Derivar caminho a partir da imagem: rejeitado por complexidade e baixa
    testabilidade.
  - Migrar para tilemap/Tiled/LDtk: fora de escopo.
  - Criar `MapDefinition` completo agora: fora de escopo; preparar nomes e
    fontes de verdade basta para esta fatia.

## Decisão 6 — Preparação incremental para `MapDefinition`

- **Decision**: usar nomes claros e concentrar os dados do mapa atual em
  constantes e `src/data/path.ts`, sem introduzir seleção de mapa. Um futuro
  `MapDefinition` poderá reunir `textureKey`, `path`, `pathWidth` e bounds.
- **Rationale**: preserva evolução incremental. A feature precisa de um mapa
  inicial, não de um framework de mapas.
- **Alternatives considered**:
  - Criar interface e registry de mapas agora: rejeitado por overengineering.

## Decisão 7 — Validação

- **Decision**: `npm run check` é o gate automatizado final. A validação visual
  do alinhamento será manual com o dev server e debug overlay, porque o render
  Phaser/canvas atual não tem teste automatizado no projeto.
- **Rationale**: preserva testes existentes e evita introduzir dependência nova.
  A regra crítica de construção permanece em `placement.ts`, onde testes
  unitários continuam possíveis.
- **Alternatives considered**:
  - Adicionar Playwright ou teste de screenshot: útil no futuro, mas dependência
    nova fora do escopo atual.
