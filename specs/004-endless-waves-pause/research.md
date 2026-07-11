# Research: Ondas Automáticas, Infinitas e Pausa

**Fase 0** — Resolve as incógnitas técnicas antes do design. O código atual foi
inspecionado (WaveManager, GameScene, GameState, EventBus, UIScene, BuildManager,
Enemy, Tower, TowerAttackAnimator). Não restaram itens `NEEDS CLARIFICATION`; a spec
já fixou os padrões em Assumptions (intervalo ~3s, pausa = congelamento total, sem
vitória).

---

## D1 — Como congelar o timing de ondas na pausa (Phaser timers vs. delta clock)

- **Decisão**: Substituir o agendamento por `scene.time.delayedCall` (usado hoje no
  `WaveManager`) por um **relógio de ondas dirigido por delta time**, tickado dentro
  de `GameScene.update(delta)`. O intervalo inicial, os spawns de cada onda e a
  contagem entre ondas passam a acumular tempo por `dt`.
- **Rationale**:
  - `GameScene.update()` já é o único ponto de avanço do jogo e já ignora o frame
    quando `GameState.isOver`. Adicionar um gate de pausa ali congela **tudo de uma
    vez** — inimigos, torres, projéteis e o timing de ondas — satisfazendo FR-008 e
    FR-013 sem tocar em relógios espalhados.
  - Timers do Phaser continuariam contando durante a pausa (ou exigiriam
    pausar/retomar `scene.time`, que é global e frágil quanto a skip/duplicação).
  - Constituição VIII exige relógio controlado por delta; IX exige lógica testável
    sem cena. Um relógio puro atende ambos e permite testar auto-início, intervalo e
    pausa sem Phaser.
- **Alternativas consideradas**:
  - *Pausar `scene.time` e todos os tweens*: acopla a regra ao motor, difícil de
    testar, e o TowerAttackAnimator já usa delta próprio — ficaria inconsistente.
  - *Manter `delayedCall` e cancelar/reagendar na pausa*: recalcular tempos restantes
    é justamente o que arrisca skip/duplicação proibidos por FR-013.

## D2 — Onde vive o estado de pausa

- **Decisão**: Em `core/GameState` como estado global (`isPaused`, `togglePause()` /
  `setPaused()`), emitindo `PAUSE_STATE_CHANGED: boolean` no EventBus.
- **Rationale**: Pausa é condição global da partida, irmã de dinheiro/vida/onda/over,
  que já moram no `GameState`. Um único ponto de verdade evita flags duplicadas nas
  cenas. O HUD (UIScene), o loop (GameScene) e a construção (BuildManager) apenas leem
  esse estado / reagem ao evento.
- **Alternativas**: guardar `paused` na UIScene (viraria fonte de verdade de UI
  ditando regra) ou na GameScene (BuildManager e HUD teriam de alcançá-la) —
  ambas violam desacoplamento (Constituição IV).

## D3 — Congelamento total, incluindo construção (FR-010)

- **Decisão**: Com pausa ativa, `GameScene.update()` retorna cedo (não avança
  entidades nem o relógio) e o `BuildManager` ignora `SELECT_TOWER`, `POINTER_MOVE` e
  `POINTER_DOWN`. A UIScene também ignora cliques nos cards enquanto pausado.
- **Rationale**: FR-010 pede congelamento total, inclusive build/seleção. Gatear na
  entrada de cada handler é barato e explícito. O botão Pausar/Continuar em si
  permanece ativo (é o único controle vivo durante a pausa).
- **Alternativas**: desabilitar input da cena inteira — bloquearia também o próprio
  botão de continuar; rejeitada.

## D4 — Motor de progressão infinito e monotônico (P2)

- **Decisão**: Função pura `generateWave(index, profile, roster)` em `systems/waves.ts`
  que produz um `Wave` (mesma estrutura `groups` já consumida por `buildSpawnSchedule`)
  a partir de um `PROGRESSION_PROFILE` data-driven em `data/waves.ts` e do roster de
  inimigos (`ENEMY_TYPES`). Quantidade, ritmo (menor `interval`) e/ou resistência
  crescem de forma monotônica com o índice; a variedade de tipos é sorteada do roster
  disponível conforme o índice sobe.
- **Rationale**: Reaproveita o pipeline determinístico existente
  (`buildSpawnSchedule`), mantém dados fora do código (Constituição V) e incorpora
  novos inimigos automaticamente (FR-006) sem reescrever a escalada. Ser pura permite
  testar monotonicidade (SC-004) sem cena.
- **Alternativas**:
  - *Continuar com lista `WAVES` estendida à mão*: fere FR-005/FR-006 (não é infinito
    nem data-driven de verdade) e Constituição VI.
  - *Escalada puramente aleatória*: violaria determinismo/testabilidade; a
    aleatoriedade, se usada para variedade, deve aceitar seed (Constituição VIII).
- **Controle de transbordo (FR-012, SC-003)**: a resistência (HP por inimigo) absorve
  parte da escalada para que a **contagem** não exploda; o `interval` tem piso e a
  quantidade cresce de forma sublinear/limitada, evitando spawn instantâneo.

## D5 — Remoção da condição de vitória (FR-004)

- **Decisão**: Remover a emissão de `GAME_WON`, a noção de `hasMoreWaves` e a tela de
  "VITÓRIA" na UIScene. A partida termina apenas por `GAME_OVER` (vidas zeradas).
- **Rationale**: Ondas infinitas eliminam "limpar todas as ondas" como fim. Deixar o
  caminho morto seria regra sem fonte de verdade (Constituição XII).
- **Alternativas**: manter `GAME_WON` desativado — código morto, rejeitado.

## D6 — Máquina de estados do relógio de ondas

- **Decisão**: Estados como **união discriminada** (Constituição VII): `initial-delay`
  → `spawning` → `awaiting-clear` → `interval` → (próxima onda) `spawning`…
  `awaiting-clear` consulta a contagem de inimigos vivos (injetada por tick); os demais
  só acumulam `dt`. O relógio emite, por tick, quais spawns disparam e quando uma nova
  onda inicia (para o `WaveManager` chamar `spawnEnemy` e atualizar o HUD).
- **Rationale**: Estados explícitos tornam a pausa trivial (não tickar) e o teste
  direto; evita booleans soltos (`waveActive`) espalhados.
- **Alternativas**: manter flags `waveActive`/`spawnsRemaining` no manager — já
  existe e não modela o intervalo/auto-início; evoluir para máquina de estados é a
  simplificação correta.

## D7 — Valores de timing configuráveis

- **Decisão**: `WAVE_TIMING` em `core/constants.ts`: `initialDelaySec` (breve espera
  inicial) e `interWaveSec` (~3s, padrão da spec). Ajustáveis sem mudar comportamento
  observável.
- **Rationale**: Constituição V/Regras Obrigatórias — valores de gameplay fora do
  código, centralizados em `constants`.

---

## Resumo das decisões

| # | Decisão | Requisitos atendidos |
|---|---------|----------------------|
| D1 | Relógio de ondas por delta (sem timers Phaser) | FR-001..003, FR-008, FR-013, SC-002 |
| D2 | Pausa em `GameState` + `PAUSE_STATE_CHANGED` | FR-008, FR-009 |
| D3 | Gate de pausa em loop e build | FR-008, FR-010, SC-005 |
| D4 | `generateWave()` data-driven monotônico | FR-005, FR-006, FR-011, SC-003, SC-004 |
| D5 | Remoção da vitória | FR-004 |
| D6 | Máquina de estados (união discriminada) | FR-002, FR-013, SC-007 |
| D7 | `WAVE_TIMING` em constants | FR-003, SC-002 |
