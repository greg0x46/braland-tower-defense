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
