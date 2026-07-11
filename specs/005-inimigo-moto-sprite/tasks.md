---
description: "Task list — Sprite animado e orientação do inimigo Dois Caras numa Moto"
---

# Tasks: Sprite animado e orientação do inimigo "Dois Caras numa Moto"

**Input**: Design documents from `/specs/005-inimigo-moto-sprite/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/orientation.md ✓, quickstart.md ✓

**Tests**: INCLUÍDOS. A spec/plano/quickstart exigem Vitest para a regra crítica de
orientação (`orientation.test.ts`, casos C1–C10 do contrato + invariante "nunca
andar de ré"). Constitution IX torna a testabilidade dessa regra obrigatória.

**Organization**: Tarefas agrupadas por user story para implementação e teste
independentes. Boa parte da apresentação (load da sheet, animação `motoboyRide`,
fallback, dimensionamento 2,6×) **já está prototipada** — as tarefas formalizam
isso e adicionam a orientação dinâmica.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências)
- **[Story]**: A qual user story a tarefa pertence (US1, US2, US3)
- Caminhos de arquivo exatos incluídos em cada descrição

## Path Conventions

- **Single project**: `src/` na raiz do repositório (layout já existente)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verificar pré-requisitos de asset e ferramentas antes de codar.

- [X] T001 Confirmar presença do asset `src/assets/enemies/dois-caras-numa-moto-sheet.png` (1774×887, grade 8×2) e que `npm run check` (tsc --noEmit + vitest run) roda limpo na base atual, estabelecendo baseline sem regressão.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura de apresentação compartilhada (constantes de tunning e
carregamento/registro da sheet) da qual todas as stories dependem.

**⚠️ CRITICAL**: Nenhuma story pode ser concluída antes desta fase.

- [X] T002 [P] Adicionar o bloco de constantes de orientação `ORIENTATION` em `src/core/constants.ts` com `tiltDeg = 15`, `tiltEnterSin = Math.sin(DegToRad(20))`, `tiltExitSin = Math.sin(DegToRad(17))`, `flipDeadzone = 0.15` (apresentação, fora de `src/data/` — research D7 / data-model).
- [X] T003 Confirmar em `src/scenes/BootScene.ts` o load da sheet do inimigo em `TEXTURES.enemyMotoboy` (fatiamento 8×2, frames 221×443) e o registro centralizado das animações `ANIMS.motoboyRide` (loop, frames 0–7) e `ANIMS.motoboyShoot` (once, frames 8–15), garantindo que estejam prontas ao spawn (FR-012); ajustar se o protótipo estiver incompleto.

**Checkpoint**: Constantes disponíveis e sheet/animações registradas — stories podem prosseguir.

---

## Phase 3: User Story 2 - A moto sempre aponta para onde está indo (Priority: P1) 🎯 MVP

**Goal**: Orientar o sprite ao deslocamento — espelhamento horizontal por sentido +
inclinação discreta em 3 estados (subindo/plano/descendo, ~±15°) — de modo que a
moto **nunca** aparente andar de ré. É o requisito central da feature.

**Independent Test**: Rodar `orientation.test.ts` (regra pura, C1–C10) e, no jogo,
acompanhar uma moto do início ao fim confirmando que em cada segmento o sentido
horizontal do sprite coincide com o do deslocamento e o tilt segue a componente
vertical, sem oscilação nas fronteiras.

> **NOTA**: Escrever os testes PRIMEIRO e garantir que FALHAM antes de implementar.

### Tests for User Story 2 ⚠️

- [X] T004 [P] [US2] Criar `src/systems/orientation.test.ts` cobrindo os casos C1–C10 do contrato (`contracts/orientation.md`): flip por sinal de dx (C1/C2), deadzone preserva flip em segmento vertical (C3/C4), tilt up/down/flat (C5/C6/C7), histerese do tilt (C8), vetor nulo retorna prev (C9), independência flip×tilt subindo p/ ambos os lados (C10/FR-009a) e o invariante "nunca andar de ré" para todo `|dx| > flipDeadzone`. Deve FALHAR (módulo ainda inexistente).

### Implementation for User Story 2

- [X] T005 [US2] Implementar o módulo puro `src/systems/orientation.ts`: tipos `TiltState`/`OrientationState` e `resolveOrientation(prev, dx, dy)` conforme o contrato — normaliza (dx,dy), aplica deadzone no flip (preserva anterior dentro dela), tilt por `ny` com histerese (`tiltEnterSin`/`tiltExitSin`), vetor nulo ⇒ `prev`. Sem import de Phaser (Constitution IX/IV). Fazer T004 passar.
- [X] T006 [US2] Em `src/entities/Enemy.ts`, guardar `OrientationState` por inimigo (inicial `{ flipX: true, tilt: 'flat' }`) e, em `step()`, derivar o vetor de deslocamento do frame, chamar `resolveOrientation` e persistir o estado retornado (histerese) — sem alocação no loop (Constitution III).
- [X] T007 [US2] Em `src/entities/Enemy.ts`, aplicar a orientação ao Sprite apenas quando muda: `setFlipX(next.flipX)` (substituindo o `setFlipX(true)` fixo) se o flip mudou; `setRotation(...)` a partir de `tilt→graus` (`up→-15`, `flat→0`, `down→+15`, usando `ORIENTATION.tiltDeg`) com ajuste de sinal por `flipX` para manter "nariz p/ cima ao subir" nos dois sentidos (research D3/D6) se o tilt mudou. Barra de vida permanece fora da rotação (FR-003).

**Checkpoint**: Orientação correta e testada — a moto nunca anda de ré (com o sprite ou o fallback movendo-se normalmente).

---

## Phase 4: User Story 1 - Ver a moto como sprite animado percorrendo o caminho (Priority: P1)

**Goal**: A moto aparece como sprite animado (ciclo de pilotar em loop) no lugar do
placeholder, sem alterar nenhuma métrica de gameplay, com a barra de vida acima e
depth consistente.

**Independent Test**: Iniciar uma partida, deixar uma onda de motos entrar e
confirmar sprite animado em loop, barra de vida acima, depth correto e combate
(HP/morte/recompensa) idêntico à versão com placeholder.

### Implementation for User Story 1

- [X] T008 [US1] Validar em `src/entities/Enemy.ts` o caminho do sprite animado: quando `type.spriteKey` existe na textura, usa `scene.add.sprite(...).play(ANIMS.motoboyRide)` em loop, `setDisplaySize` pela largura ≈ 2,6× o raio preservando proporção do frame (FR-004), origem 0.5, e depth consistente com `DEPTH.enemy` (FR-005). Confirmar que a barra de vida é adicionada acima do sprite no mesmo Container (FR-003).
- [X] T009 [US1] Confirmar que nenhuma métrica de gameplay muda (HP/velocidade/recompensa/raio de colisão vêm de `src/data/enemies.ts`, intocados — FR-002/SC-003) e que a animação `motoboyShoot` está registrada mas NÃO é disparada nesta feature (FR-013); revisar `Enemy.ts` para garantir que só `motoboyRide` toca.

**Checkpoint**: Sprite animado em campo sem regressão de gameplay; combina com a orientação da US2.

---

## Phase 5: User Story 3 - Fallback jogável quando a sheet não carrega (Priority: P2)

**Goal**: Se a sheet falhar, o inimigo cai no placeholder (círculo + emoji), a
partida segue jogável e a falha é registrada (sem erro silencioso).

**Independent Test**: Simular ausência/falha do asset e confirmar que a moto aparece
como círculo + emoji, se move normalmente e a falha é registrada no console.

### Implementation for User Story 3

- [X] T010 [US3] Validar em `src/entities/Enemy.ts` o ramo de fallback (`spriteKey` ausente ou textura inexistente ⇒ círculo colorido + emoji 🛵), garantindo que a moto percorre o caminho e a orientação (US2) não quebra sem Sprite (flip/tilt só se aplicam quando há Sprite). Mesmo contrato de fallback das torres (FR-010).
- [X] T011 [US3] Garantir em `src/scenes/BootScene.ts` que a falha de carregamento da sheet é registrada/visível (log ou aviso no `loaderror`), sem erro silencioso (FR-010/SC-004), seguindo o padrão já usado para os assets das torres.

**Checkpoint**: Todas as stories independentemente funcionais.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificação final e ajuste de tunning.

- [X] T012 Rodar `npm run check` (tsc --noEmit + vitest run) e confirmar typecheck `strict` verde, sem `any`/`as` de conveniência, com `orientation.test.ts` passando (Constitution VII/XIV).
- [ ] T013 Executar o `quickstart.md` (passos 1–5): regra pura, typecheck, validação visual (sprite animado, flip por sentido, nunca de ré, tilt 3 estados sem flicker), fallback e verificação data-driven (SC-001…SC-006).
- [ ] T014 [P] Ajuste fino (opcional) dos limiares em `ORIENTATION` (`src/core/constants.ts`) caso a validação visual revele flicker ou magnitude de tilt inadequada — apenas tunning de apresentação, sem tocar em gameplay.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode iniciar imediatamente.
- **Foundational (Phase 2)**: Depende do Setup — BLOQUEIA todas as stories.
- **User Stories (Phase 3–5)**: Dependem da Fase 2. US2 é o MVP e a base técnica; US1 e US3 tocam o mesmo `Enemy.ts` e assumem a orientação da US2 em campo.
- **Polish (Phase 6)**: Depende das stories desejadas concluídas.

### User Story Dependencies

- **US2 (P1, MVP)**: Após a Fase 2. Sem dependência de outras stories (função pura + aplicação no Enemy).
- **US1 (P1)**: Após a Fase 2. Independentemente testável; convive com US2 no `Enemy.ts`.
- **US3 (P2)**: Após a Fase 2. Independentemente testável (ramo de fallback + log).

### Within Each User Story

- Testes (US2) escritos e FALHANDO antes da implementação.
- Módulo puro antes da aplicação no Enemy.
- Story completa antes de passar para a próxima prioridade.

### Parallel Opportunities

- T002 e T003 (Fase 2) podem correr em paralelo (arquivos diferentes).
- T004 (teste) é [P] — arquivo próprio.
- Atenção: T006/T007/T008/T009/T010 tocam o mesmo `src/entities/Enemy.ts` — **não** paralelizar entre si (sem [P]).
- T014 é [P] no polish (arquivo de constantes).

---

## Parallel Example: Foundational

```bash
# Fase 2 — constantes e boot em paralelo (arquivos distintos):
Task T002: "Adicionar bloco ORIENTATION em src/core/constants.ts"
Task T003: "Confirmar load da sheet + registro de animações em src/scenes/BootScene.ts"
```

---

## Implementation Strategy

### MVP First (User Story 2 — o requisito central)

1. Fase 1: Setup (baseline verde + asset presente)
2. Fase 2: Foundational (constantes + sheet/animações)
3. Fase 3: US2 — regra de orientação testada e aplicada (nunca andar de ré)
4. **PARAR e VALIDAR**: `orientation.test.ts` verde + acompanhar uma moto no jogo
5. Demo se pronto

### Incremental Delivery

1. Setup + Foundational → base pronta
2. US2 → testar (C1–C10 + visual) → demo (MVP: orientação correta)
3. US1 → sprite animado sem regressão de gameplay → demo
4. US3 → fallback + log → demo
5. Cada story agrega valor sem quebrar as anteriores

---

## Notes

- Ordem por prioridade: US2 vem primeiro por ser o requisito central e a base
  técnica (função pura testável); US1 e US3 formalizam/validam o protótipo já
  existente e reusam a orientação.
- [P] = arquivos diferentes, sem dependências. Tarefas no `Enemy.ts` são sequenciais.
- Nenhuma regra de gameplay muda (FR-002/SC-003) — validado em T009/T012/T013.
- Commit após cada tarefa ou grupo lógico; parar em qualquer checkpoint para validar.
