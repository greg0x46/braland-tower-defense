# Contrato: Estado de Pausa e Botão Pausar/Continuar

Congelamento total da partida (FR-008, FR-010) e o controle de HUD que o aciona
(FR-007, FR-009). Fonte única de verdade em `core/GameState`.

## API em `GameState` — `src/core/GameState.ts`

```text
get isPaused(): boolean
togglePause(): void      // inverte; NO-OP se isOver (edge case da spec)
setPaused(v: boolean): void
```

- Emite `PAUSE_STATE_CHANGED: boolean` **apenas quando o valor muda**.
- `reset()` restaura `isPaused = false` (nova partida nunca começa pausada).
- Alternar rapidamente Pausar/Continuar não corrompe estado (SC-007): é só um boolean.

## Gate no loop — `src/scenes/GameScene.ts`

```text
update(_time, delta):
  this.debug?.update();                      // debug pode continuar (dev-only)
  if (GameState.isOver || GameState.isPaused) return;   // congela tudo
  ... resto do loop (enemies/towers/projectiles/waveManager.update(dt)) ...
```

**Congelado ao pausar** (SC-005): movimento de inimigos, ataque/cooldown de torres,
animação de ataque (TowerAttackAnimator só avança dentro do loop), projéteis, o relógio
de ondas (não é tickado) e a contagem do intervalo. Nenhuma contagem avança.

## Gate na construção — `src/managers/BuildManager.ts`

Bloqueia enquanto pausado (FR-010):

```text
onSelect(id):        if (GameState.isPaused) return;
onPointerMove(p):    if (GameState.isPaused) return;
onPointerDown(p):    if (GameState.isPaused) return;
```

## Botão no HUD — `src/scenes/UIScene.ts`

Substitui o botão "▶ Iniciar Onda" pelo **botão de pausa** no mesmo slot da sidebar
(FR-007, mesma posição de `GAME_HEIGHT - 44`).

| Estado | Rótulo | Ação ao clicar |
|--------|--------|----------------|
| Jogando | `⏸ Pausar` | `GameState.togglePause()` |
| Pausado | `▶ Continuar` | `GameState.togglePause()` |
| Encerrada (derrota) | inerte (desabilitado) | nenhuma |

- Ouve `PAUSE_STATE_CHANGED` para trocar rótulo/cor imediatamente (FR-009, SC-005).
- Deixa de ouvir `WAVE_STATE_CHANGED` para habilitar/desabilitar (não há mais início
  manual). O botão fica habilitado durante toda a partida, exceto após `GAME_OVER`.
- Cliques nos cards de torre são ignorados enquanto pausado (espelha o gate do
  BuildManager; congelamento total).
- **Remoções**: `onGameWon`, a tela de "VITÓRIA" e o listener de `GAME_WON`. A tela de
  "DERROTA" (via `GAME_OVER`) permanece; `restartGame()` reinicia da onda 1 com o loop
  automático.

## Estados inválidos evitados (Constituição VII)

- Não há flag `paused` duplicada em cenas — só `GameState.isPaused`.
- `togglePause` inerte quando `isOver` impede o estado "pausado após derrota" (edge
  case da spec): a tela de fim já domina a interação.
