# Contrato: Eventos do EventBus

Alterações no `GameEvents` (`src/core/EventBus.ts`). O EventBus é o único canal entre
GameScene (gameplay), UIScene (HUD) e GameState (estado). Payloads são tipados por
convenção documentada ao lado de cada evento.

## Adicionados

| Evento | Chave | Payload | Emissor → Ouvinte | Motivo |
|--------|-------|---------|-------------------|--------|
| `PAUSE_STATE_CHANGED` | `pause-state-changed` | `paused: boolean` | `GameState` → `UIScene` | Botão Pausar/Continuar reflete o estado global (FR-009). |

## Removidos

| Evento | Chave | Por quê |
|--------|-------|---------|
| `REQUEST_START_WAVE` | `request-start-wave` | Ondas agora iniciam sozinhas; não há mais pedido manual (FR-001, FR-007). |
| `GAME_WON` | `game-won` | Não existe mais condição de vitória (FR-004, D5). |

## Mantidos (sem mudança de payload)

`MONEY_CHANGED`, `LIVES_CHANGED`, `WAVE_CHANGED (wave, total)`, `WAVE_STATE_CHANGED
(waveActive: boolean)`, `SELECT_TOWER`, `ENEMY_KILLED`, `ENEMY_LEAKED`, `GAME_OVER`.

> Nota: `WAVE_CHANGED` continua com assinatura `(wave, total)`. Como não há total
> finito, `total` passa a ser `0` (ou omitido semanticamente) e o HUD exibe apenas o
> índice atual (FR-011). `WAVE_STATE_CHANGED` continua indicando se há onda ativa —
> hoje usado para habilitar/desabilitar o botão; com o botão virando Pausar/Continuar,
> permanece opcional para futuros indicadores de HUD.

## Invariantes

- Nenhum novo evento é emitido dentro do game loop por frame (evita ruído/alocação;
  Constituição III). `PAUSE_STATE_CHANGED` só dispara na transição.
- Handlers registrados em `create()` DEVEM ser removidos em `SHUTDOWN` (padrão já
  existente nas cenas) — sem listener órfão após restart.
