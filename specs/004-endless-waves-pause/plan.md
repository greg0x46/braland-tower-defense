# Implementation Plan: Ondas Automáticas, Infinitas e Pausa

**Branch**: `004-endless-waves-pause` | **Date**: 2026-07-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-endless-waves-pause/spec.md`

## Summary

Redefinir o loop de ondas do BR-TD: a partida passa a fluir sozinha — a onda 1 começa
após um breve intervalo inicial e, sempre que a onda é limpa, um curto intervalo
configurável antecede a próxima, indefinidamente. As ondas deixam de ser uma lista
fixa (`WAVES`) e passam a ser geradas por um **motor de progressão data-driven** que
escala dificuldade de forma monotônica com o índice e incorpora automaticamente novos
tipos de inimigo. O antigo botão "Iniciar Onda" vira **"Pausar/Continuar"**, que
congela por completo o gameplay.

Abordagem técnica central: **substituir o agendamento por timers do Phaser
(`scene.time.delayedCall`) por um relógio de ondas dirigido por delta time**, tickado
a partir de `GameScene.update()` — que já é a única fonte de avanço do jogo. Isso
torna o congelamento por pausa trivial (não avança o tick) e determinístico
(Constituição VIII), e mantém a lógica de progressão/agendamento testável sem Phaser
(Constituição IX). A pausa vira estado global em `GameState`, propagado por evento; o
gating de gameplay e de construção lê esse estado.

## Technical Context

**Language/Version**: TypeScript 5.6 (`strict: true`, sem `any`/`as` de conveniência)

**Primary Dependencies**: Phaser 3.88 (render/loop/input), Vite 5 (build/dev), Vitest 2 (testes)

**Storage**: N/A (estado em memória por partida; sem persistência nesta feature)

**Testing**: Vitest — testes de comportamento das regras puras (progressão de onda e
relógio de ondas) sem instanciar cena Phaser

**Target Platform**: Navegador (canvas WebGL/Canvas via Phaser), desktop primeiro

**Project Type**: Single project (jogo front-end) — estrutura `src/` já existente

**Performance Goals**: 60 fps estáveis com ondas avançadas (dezenas de inimigos);
sem alocação no game loop nem picos de spawn instantâneo (FR-012, Constituição III)

**Constraints**: Lógica de gameplay dirigida por delta time (sem dependência de frame
rate); domínio de progressão/agendamento exercitável sem renderização; pausa =
congelamento total sem skip/duplicação/reset (FR-013)

**Scale/Scope**: 1 tipo de inimigo hoje (motor pronto para N); ondas ilimitadas;
alvo de teste ≥ 20 ondas sem degradação (SC-003). Toca ~6 arquivos existentes + 2 novos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação contra os 14 princípios da Constituição BR-TD v1.0.0:

| Princípio | Status | Observação |
|-----------|--------|------------|
| I. Gameplay em primeiro lugar | ✅ | Redefine o loop central (construir → onda → dano/dinheiro) para fluxo contínuo. |
| II. Responsividade | ✅ | Botão Pausar/Continuar dá feedback imediato; rótulo troca na hora. |
| III. Performance | ✅ | Escala controlada (FR-012); sem picos instantâneos; sem alocação no loop; reusa entidades por frame. |
| IV. Arquitetura desacoplada | ✅ | Progressão e relógio de ondas são sistemas puros; comunicação por EventBus; `GameScene` só orquestra. |
| V. Dados/lógica/apresentação | ✅ | Perfil de progressão vive em `src/data/waves.ts`; regra em `src/systems/`; HUD só reage a eventos. |
| VI. Evolução incremental | ✅ | Novo tipo de inimigo = nova entrada em `data/enemies.ts`, incorporado automaticamente (FR-006). Sem herança nova. |
| VII. TypeScript rigoroso | ✅ | Estado de pausa e fases de onda como uniões discriminadas; sem `any`/`as`. |
| VIII. Determinismo | ✅ | **Motivador central**: timing por delta/relógio controlado substitui timers do Phaser; progressão determinística por índice. |
| IX. Testabilidade | ✅ | `generateWave()` e o relógio de ondas testados sem cena; testes de monotonicidade e de pausa. |
| X. Observabilidade | ✅ | Sem erro silencioso; overlay de debug existente inalterado; log de fase de onda apenas em DEV se necessário. |
| XI. Assets substituíveis | ✅ | Nenhuma regra depende de emoji/sprite; feature não toca em assets. |
| XII. Qualidade de código | ✅ | Uma fonte de verdade para timing; remove condição de vitória morta. |
| XIII. Escalabilidade visual | ✅ | Botão ocupa o slot atual do HUD lateral; sem coordenada nova hardcoded fora do padrão existente. |
| XIV. Definição de concluído | ✅ | Loop funciona, feedback visual, tipos, testes de regra crítica, config em `data/`, `npm run build` verde. |

**Regras Obrigatórias**: dados fora do código (perfil em `data/`), domínio sem Phaser
(sistemas puros), delta time obrigatório (relógio de ondas), comunicação por eventos
(`PAUSE_STATE_CHANGED`), `strict` sem `any`, typecheck verde. **Todas atendidas.**

**Resultado do gate: PASS.** Nenhuma violação → `Complexity Tracking` vazio.

## Project Structure

### Documentation (this feature)

```text
specs/004-endless-waves-pause/
├── plan.md              # Este arquivo (/speckit-plan)
├── research.md          # Fase 0 — decisões técnicas
├── data-model.md        # Fase 1 — entidades e estados
├── quickstart.md        # Fase 1 — roteiro de validação
├── contracts/           # Fase 1 — contratos de módulo e eventos
│   ├── events.md
│   ├── wave-progression.md
│   └── pause-state.md
└── tasks.md             # Fase 2 (/speckit-tasks — NÃO criado aqui)
```

### Source Code (repository root)

Estrutura `src/` já existente (Phaser + camadas da Arquitetura de Referência). Arquivos
afetados e novos:

```text
src/
├── core/
│   ├── GameState.ts         # + estado de pausa (isPaused/togglePause) e evento
│   ├── EventBus.ts          # + PAUSE_STATE_CHANGED; REQUEST_START_WAVE/GAME_WON removidos
│   └── constants.ts         # + WAVE_TIMING (delay inicial, intervalo entre ondas)
├── data/
│   └── waves.ts             # substitui WAVES fixo por PROGRESSION_PROFILE (data-driven)
├── systems/
│   ├── waves.ts             # + generateWave(index, profile, roster) — progressão pura
│   ├── waves.test.ts        # + testes de monotonicidade e variedade
│   ├── waveClock.ts         # NOVO — relógio/máquina de estados de ondas (puro, delta)
│   └── waveClock.test.ts    # NOVO — testes de auto-início, intervalo e pausa
├── managers/
│   └── WaveManager.ts       # adapta o relógio puro; remove timers do Phaser e GAME_WON
├── scenes/
│   ├── GameScene.ts         # gate de pausa no update; passa dt ao WaveManager
│   └── UIScene.ts           # botão Pausar/Continuar; remove tela de VITÓRIA
└── managers/
    └── BuildManager.ts      # bloqueia seleção/colocação quando pausado (FR-010)
```

**Structure Decision**: Mantém-se o layout single-project atual, alinhado à
Arquitetura de Referência da Constituição. A regra de gameplay nova vive em `systems/`
(progressão e relógio, puros e testáveis), a configuração em `data/`, o estado global
em `core/GameState`, e as cenas apenas orquestram/reagem. Nenhuma camada nova é criada.

## Complexity Tracking

> Sem violações da Constituição. Nada a justificar.
