# Implementation Plan: Mapa inicial com imagem

**Branch**: `002-initial-map-image` | **Date**: 2026-07-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-initial-map-image/spec.md`

## Summary

Substituir o fundo verde e a trilha desenhada por código pela arte fornecida
como mapa visual inicial, mantendo o gameplay baseado em waypoints e validação
pura de construção. A imagem atual (`image.png`, 1672×941) tem proporção
praticamente idêntica à área jogável base (`PLAY_WIDTH x GAME_HEIGHT` =
1280×720), então será movida para `src/assets/maps/initial-map.png`, carregada
centralmente na `BootScene` por uma chave estável e renderizada em `GameScene`
apenas dentro da área jogável. A trilha visual antiga deixa de ser desenhada no
jogo normal; `PATH` e `PATH_WIDTH` continuam sendo a autoridade de gameplay e
serão ajustados para acompanhar a estrada da arte. Caso o asset falhe, a cena
usa um fundo simples de fallback e o debug overlay continua capaz de mostrar o
caminho real.

## Technical Context

**Language/Version**: TypeScript 5.6 (`strict: true`)

**Primary Dependencies**: Phaser 3.88, Vite 5.4, Vitest 2.1

**Storage**: N/A (asset estático empacotado pelo bundler)

**Testing**: Vitest (`src/systems/*.test.ts`) para regras puras; validação visual manual via dev server para cena/renderização

**Target Platform**: Navegador (canvas Phaser, build estático)

**Project Type**: Single project (jogo web front-end) com código em `src/`

**Performance Goals**: 60 fps estáveis; a mudança adiciona uma única imagem de fundo estática e não cria alocação no game loop

**Constraints**: Mapa não cobre sidebar/HUD; caminho de gameplay permanece separado da arte; `systems/placement.ts` e geometria continuam puros; sem sistema completo de múltiplos mapas; fallback obrigatório para falha de asset; `npm run check` verde ao final da implementação

**Scale/Scope**: 1 mapa visual inicial, 1 asset novo/movido, 1 conjunto de waypoints, 1 largura de caminho revisada. Arquivos esperados: `src/assets/maps/initial-map.png`, `src/core/constants.ts`, `src/scenes/BootScene.ts`, `src/scenes/GameScene.ts`, `src/data/path.ts`, `src/debug/DebugOverlay.ts` e testes de placement/geometria se o comportamento de bloqueio precisar de novos casos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação contra `.specify/memory/constitution.md` v1.0.0.

| Princípio / Regra | Situação | Como o plano cumpre |
|---|---|---|
| **I. Gameplay em Primeiro Lugar** | PASS | Movimento, construção, ondas e HUD permanecem funcionando; a arte melhora clareza visual sem bloquear o loop. |
| **IV. Arquitetura Desacoplada** | PASS | A imagem é apresentação. Movimento e construção continuam consumindo `PATH`/`PATH_WIDTH`, não pixels do asset. |
| **V. Dados / Lógica / Apresentação** | PASS | `src/data/path.ts` mantém waypoints; `constants.ts` mantém chave/textura/dimensões compartilhadas; `GameScene` apenas renderiza. |
| **VI. Evolução Incremental** | PASS | Sem `MapDefinition` completo agora; apenas nomes e fontes de verdade preparados para extração futura. |
| **VII. TypeScript Rigoroso** | PASS | Novas constantes e helpers devem ser tipados; imports `.png` já são cobertos por `vite/client`. Sem `any`/`as` de conveniência. |
| **VIII. Determinismo** | PASS | Nenhuma alteração em timers, dano, spawn ou cooldown; somente waypoints determinísticos. |
| **IX. Testabilidade** | PASS | `placement.ts` e `geometry.ts` permanecem puros; largura/path ajustados via dados e validáveis com testes existentes ou novos casos focados. |
| **X. Observabilidade / Depuração** | PASS | Debug overlay continua mostrando caminho real sobre mapa/fallback; erro de asset é registrado. |
| **XI. Assets Substituíveis** | PASS | Carregamento centralizado em `BootScene`; fallback mantém jogo sem depender do asset final. |
| **XIII. Escalabilidade Visual** | PASS | Imagem usa constantes de área jogável e não invade sidebar; nenhuma regra lê dimensão visual do sprite/mapa. |
| **XIV. Definição de Concluído** | PASS | Inclui fallback, feedback visual, testes/check e validação do loop principal. |

**Resultado do gate inicial**: PASS — nenhuma violação. `Complexity Tracking`
fica vazio.

## Project Structure

### Documentation (this feature)

```text
specs/002-initial-map-image/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── map-presentation.md
└── tasks.md              # Phase 2 output (/speckit-tasks; not created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── assets/
│   ├── maps/
│   │   └── initial-map.png        # image.png movido/renomeado
│   └── towers/
│       └── vira-lata-caramelo.png # asset existente, não relacionado
├── core/
│   └── constants.ts               # TEXTURES.initialMap; PLAY_WIDTH/GAME_HEIGHT/PATH_WIDTH
├── data/
│   └── path.ts                    # PATH ajustado à estrada da arte
├── debug/
│   └── DebugOverlay.ts            # overlay continua desenhando o caminho real
├── scenes/
│   ├── BootScene.ts               # preload central do mapa + erro do loader
│   ├── GameScene.ts               # renderiza mapa/fallback; remove path visual normal
│   └── UIScene.ts                 # não deve ser impactada
├── managers/
│   └── BuildManager.ts            # continua usando PATH/PATH_WIDTH via placement puro
└── systems/
    ├── geometry.ts
    ├── geometry.test.ts
    ├── placement.ts
    └── placement.test.ts          # adicionar casos só se necessário para PATH_WIDTH
```

**Structure Decision**: Single project, preservando o layout existente. O novo
diretório `src/assets/maps/` organiza o asset sem criar sistema de mapas. A
feature mantém a divisão atual: `BootScene` carrega assets, `GameScene` renderiza
apresentação, `src/data/path.ts` define a rota, `BuildManager` consome a regra
de posicionamento e `systems/placement.ts` permanece puro.

## Post-Design Constitution Check

Reavaliação após gerar `research.md`, `data-model.md`, `contracts/` e
`quickstart.md`.

| Gate | Situação | Evidência |
|---|---|---|
| Separação arte vs. gameplay | PASS | `data-model.md` define mapa visual separado de `PATH`/`PATH_WIDTH`; contrato C3 proíbe leitura de pixels para regra. |
| Evolução incremental | PASS | Arte e dados do mapa atual são organizados sem registry, editor ou seleção de múltiplos mapas. |
| Testabilidade | PASS | `placement.ts` permanece puro; quickstart mantém `npm run check` como gate e prevê novos casos apenas se necessários. |
| Observabilidade | PASS | Contrato C4 preserva debug overlay sobre mapa e fallback. |
| Assets substituíveis | PASS | Contrato C1 define preload central, chave estável e fallback sem crash. |
| Escalabilidade visual | PASS | Contrato C2 restringe renderização a `PLAY_WIDTH x GAME_HEIGHT`, sem invadir sidebar. |

**Resultado do gate pós-design**: PASS — nenhuma violação ou clarificação
pendente.

## Complexity Tracking

> Sem violações de Constitution Check — seção intencionalmente vazia.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
