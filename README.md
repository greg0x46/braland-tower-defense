# BR-TD — Tower Defense Brasileiro (protótipo)

Protótipo jogável de um Tower Defense com identidade brasileira, feito em
**Phaser 3 + TypeScript + Vite**. Esta fatia valida o loop central antes de
expandir conteúdo (ver `Escopo` abaixo).

## Rodar

```bash
npm install
npm run dev      # http://localhost:5173
```

Outros scripts: `npm run build` (typecheck + build de produção), `npm run preview`,
`npm test` (regras puras do domínio via Vitest), `npm run check` (typecheck + testes).

Em desenvolvimento, tecle **`` ` ``** (backtick) para ligar/desligar o overlay de
depuração (FPS, contagem de entidades, caminho, alcance das torres, alvo atual e
hitboxes). O overlay não existe no build de produção.

## Ajustar sprite sheets geradas por IA

Quando o GPT gerar uma sprite sheet em tamanho irregular, use a imagem como fonte
bruta e normalize com:

```bash
npm run adjust:sprite-sheet -- <input> <output> \
  --source-cols <colunas-originais> \
  --source-rows <linhas-originais> \
  --frame-width <largura-final> \
  --frame-height <altura-final> \
  --output-cols <colunas-finais>
```

Exemplo para uma imagem `1774x887` que deveria ser uma sheet `8x2`:

```bash
npm run adjust:sprite-sheet -- \
  src/assets/enemies/dois-caras-numa-moto-sheet.png \
  src/assets/enemies/dois-caras-numa-moto-sheet-fixed.png \
  --source-cols 8 \
  --source-rows 2 \
  --frame-width 256 \
  --frame-height 512 \
  --output-cols 8
```

Esse comando gera uma sheet limpa `2048x1024`, com 16 frames de `256x512`.
Se substituir o asset usado pelo jogo, o runtime deriva `frameWidth` e
`frameHeight` do contrato central em `src/core/spriteSheets.ts`; não coloque
dimensões hardcoded no `BootScene`.

Se a arte de um frame estiver entrando no frame vizinho, use o modo de extração
por componente principal. Ele recorta a maior ilha alfa de cada célula, remove
fragmentos vazados do vizinho e recentraliza com margem interna:

```bash
npm run adjust:sprite-sheet -- \
  raw/dois-caras-numa-moto-sheet.png \
  src/assets/enemies/dois-caras-numa-moto-sheet.png \
  --source-cols 8 \
  --source-rows 2 \
  --frame-width 256 \
  --frame-height 512 \
  --output-cols 8 \
  --extract-mode main-component \
  --component-frame-padding 20 \
  --preview-grid /tmp/motoboy-grid.png \
  --validate-frame-edges \
  --edge-margin 1
```

Confira o preview com grade antes de substituir o asset final. Nenhuma parte da
arte deve tocar as linhas vermelhas.

Opções úteis:

- `--fit contain` preserva proporção e centraliza no frame final (padrão).
- `--fit cover` preenche o frame e corta excesso.
- `--fit stretch` força o frame ao tamanho final.
- `--extract-mode main-component` remove pedaços de frames vizinhos quando a
  arte vazou para fora da célula original.
- `--component-frame-padding <px>` define a margem interna no modo
  `main-component`.
- `--preview-grid <arquivo.png>` gera uma imagem de inspeção com a grade de
  corte.
- `--validate-frame-edges` falha se algum frame encostar na borda de corte.
- `--filter nearest` é melhor para pixel art; `lanczos` é o padrão para arte
  gerada/pintada.
- `--trim-alpha <threshold>` remove bordas transparentes de cada célula antes de
  redimensionar.
- `--trim-bg <tolerance>` remove um fundo sólido baseado nos cantos da célula.

O script usa Python + Pillow. Se o ambiente não tiver Pillow:

```bash
python3 -m pip install Pillow
```

## Como jogar

1. Clique no card **🐕 Vira-lata Caramelo ($50)** na barra lateral para entrar no
   modo de construção.
2. Mova o mouse pelo campo: o preview fica **verde** (válido) ou **vermelho**
   (em cima do caminho / sobre outra torre / sem dinheiro). Clique para construir.
3. Clique em **▶ Iniciar**. Os 🛵 seguem o caminho; as torres atiram.
4. Inimigos abatidos dão dinheiro; inimigos que chegam ao fim tiram vida.
5. As ondas são **infinitas** e ficam progressivamente mais difíceis. Não há
   vitória: o objetivo é aguentar o máximo de ondas possível. Vida zerada =
   derrota.

**Contrato de partida** (modo `endless`): a partida abre pausada no setup — dá
para construir antes de iniciar. Depois do primeiro **Iniciar**, pausar congela
o jogo *e* trava a construção. Derrota é a única condição de fim, e só o
**Jogar novamente** sai dela. Detalhes em
[`src/systems/matchProgression.ts`](src/systems/matchProgression.ts).

## Escopo desta fatia

Incluído: 1 mapa, 1 inimigo (🛵 Dois Caras numa Moto), 1 torre (🐕 Vira-lata
Caramelo), caminho + movimento, ondas infinitas com dificuldade progressiva,
construção livre, dano, dinheiro, vida, pausa e derrota.

Fora (próximas rodadas): Motoboy, Faria Limer, Político, Ônibus Lotado, Carreta
Furacão (chefe), upgrades, backend.

## Arquitetura

```
src/
  main.ts              Config do Phaser + registro de cenas
  core/
    constants.ts       Dimensões, cores, valores iniciais
    EventBus.ts        Catálogo de eventos (produtor/consumidor/payload) + emissão tipada
    GameState.ts       Dinheiro, vida, onda e estado da partida (emite eventos)
  data/                Config data-driven (adicionar conteúdo = nova entrada)
    contracts.ts       Valores de gameplay ACEITOS (o portão falha se derivarem)
    maps.ts            Contrato de mapa: visual, caminho, construção e debug
    enemies.ts  towers.ts  waves.ts  path.ts
  systems/             Regras puras sem Phaser (testáveis via Vitest)
    matchProgression.ts Máquina de estados da partida (endless, derrota-só)
    combat.ts          Resolve o ataque pelo comportamento, não pelo sprite
    mapContract.ts     Valida o contrato de mapa (caminho, estrada, limites)
    rosterLayout.ts    Quantos cards cabem, rolagem, alcançabilidade
    geometry.ts        Distância ponto→segmento / ponto→caminho
    targeting.ts       Seleção do alvo mais avançado no alcance
    placement.ts       Validação de construção (limites/caminho/overlap/$)
    waves.ts           Cronograma determinístico de spawns
    *.test.ts          Testes unitários das regras acima
  debug/
    DebugOverlay.ts    Overlay de depuração (só em dev; tecla backtick)
  entities/
    Enemy.ts           Segue o caminho; barra de vida
    Tower.ts           Mira e ataca na cadência (via systems/combat)
    Projectile.ts      Perseguição simples; aplica dano
    TowerAttackAnimator.ts  Só apresentação: dá a deixa de tempo, não o dano
  managers/
    BuildManager.ts    Seleção + preview + validação + compra
    WaveManager.ts     Agenda spawns; encadeia a próxima onda (progressão infinita)
  scenes/
    BootScene.ts       Reinicia estado e sobe Game + UI
    GameScene.ts       Mundo, loop principal, listas de entidades
    UIScene.ts         HUD, menu de torres (rolável), tela de fim
```

**Como estender**: um novo inimigo/torre é uma entrada em `data/enemies.ts` /
`data/towers.ts` — a torre declara seu `attack` (`projectile`, `direct` ou
`area`), e o dano nunca depende de qual sprite existe. Um novo mapa é uma entrada
em `data/maps.ts`, e movimento, construção e debug o seguem juntos.

**Contratos aceitos**: valores de gameplay críticos (stats do roster, perfil de
onda, comportamento de ataque) ficam em `data/contracts.ts`. Se o runtime divergir,
`npm run check` falha dizendo qual métrica mudou. Mudança intencional de
balanceamento = atualizar o contrato com `reason`; nunca afrouxar o teste.
