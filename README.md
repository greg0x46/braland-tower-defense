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

1. Clique em **🐕 Vira-lata Caramelo ($50)** no topo para entrar no modo de construção.
2. Mova o mouse pelo campo: o preview fica **verde** (válido) ou **vermelho**
   (em cima do caminho / sobre outra torre / sem dinheiro). Clique para construir.
3. Clique em **▶ Iniciar Onda**. Os 🛵 seguem o caminho; as torres atiram.
4. Inimigos abatidos dão dinheiro; inimigos que chegam ao fim tiram vida.
5. Sobreviva às 3 ondas para vencer. Vida zerada = derrota.

## Escopo desta fatia

Incluído: 1 mapa, 1 inimigo (🛵 Dois Caras numa Moto), 1 torre (🐕 Vira-lata
Caramelo), caminho + movimento, ondas, construção livre, dano, dinheiro, vida,
vitória/derrota. Visual com formas + emoji (sem assets externos).

Fora (próximas rodadas): Motoboy, Faria Limer, Político, Ônibus Lotado, Carreta
Furacão (chefe), ondas 4–10, upgrades, backend.

## Arquitetura

```
src/
  main.ts              Config do Phaser + registro de cenas
  core/
    constants.ts       Dimensões, cores, valores iniciais
    EventBus.ts        EventEmitter global + nomes de eventos
    GameState.ts       Dinheiro, vida, onda (emite eventos)
  data/                Config data-driven (adicionar conteúdo = nova entrada)
    path.ts  enemies.ts  towers.ts  waves.ts
  systems/             Regras puras sem Phaser (testáveis via Vitest)
    geometry.ts        Distância ponto→segmento / ponto→caminho
    targeting.ts       Seleção do alvo mais avançado no alcance
    placement.ts       Validação de construção (limites/caminho/overlap/$)
    waves.ts           Cronograma determinístico de spawns
    *.test.ts          Testes unitários das regras acima
  debug/
    DebugOverlay.ts    Overlay de depuração (só em dev; tecla backtick)
  entities/
    Enemy.ts           Segue o caminho; barra de vida
    Tower.ts           Mira e dispara na cadência
    Projectile.ts      Perseguição simples; aplica dano
  managers/
    BuildManager.ts    Seleção + preview + validação + compra
    WaveManager.ts     Agenda spawns; detecta fim da onda / vitória
  scenes/
    BootScene.ts       Reinicia estado e sobe Game + UI
    GameScene.ts       Mundo, loop principal, listas de entidades
    UIScene.ts         HUD, botões, tela de fim
```

**Como estender**: um novo inimigo/torre é uma entrada em `data/enemies.ts` /
`data/towers.ts`; uma nova onda é uma entrada em `data/waves.ts`. Mecânicas
próprias (ex.: Motoboy móvel, debuff do Político) entram como subclasses/campos
extras nas entidades correspondentes.
