# Tasks: Comportamento de Engajamento de Ataque da Torre

**Input**: Design documents from `/specs/009-engajamento-ataque-torre/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Incluídos. A spec exige regra testável sem renderização (FR-016) e a
constitution (IX, XIV) faz de `npm run check` o portão de conclusão. Os testes puros
**não** são opcionais nesta fatia — são o único lugar onde encadeamento, coleira e
retorno podem ser provados.

**Organization**: Tarefas agrupadas por história de usuário. Cada fase entrega um
incremento observável e independentemente testável.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivo diferente, sem dependência pendente)
- **[Story]**: US1 / US2 / US3
- Todo caminho de arquivo é relativo à raiz do repositório

## Path Conventions

Projeto único (`src/`), conforme `plan.md` → *Project Structure*. Testes ficam ao
lado do módulo (`src/systems/*.test.ts`), como já é a convenção do repo.

---

## Phase 1: Setup

**Purpose**: Confirmar a linha de base antes de mexer em contrato de gameplay.

- [X] T001 Rodar `npm run check` (tsc + vitest) e registrar que a árvore está verde **antes** da fatia — a partir daqui, qualquer vermelho é desta feature

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: O tipo do perfil de engajamento e o esqueleto do sistema puro. Toda
história depende disto.

**⚠️ CRITICAL**: Nenhuma história começa antes desta fase fechar.

**Nota de projeto**: `engagementTimingsOf` (T007) vive em `src/data/towers.ts`, não
em `src/entities/Tower.ts` como o `plan.md` esboçou. Motivo: nenhum teste do repo
importa `entities/` (Phaser), e a derivação dos timings precisa ser testável a seco
(FR-015/FR-016). `data/towers.ts` é puro, já é dono de `attackAnimation` e já importa
tipos de `systems/`. `Tower.ts` apenas chama a função.

- [X] T002 Adicionar `export type EngagementProfile = 'stationary' | 'pursuer'` e o campo **obrigatório** `engagement: EngagementProfile` em `AttackBehaviorSpec`, propagado por `attackBehaviorOf()`, em `src/data/towers.ts` (quebra a compilação até T003 — é o FR-001 sendo forçado pelo compilador)
- [X] T003 Declarar `engagement: 'pursuer'` na entrada `vira-lata-caramelo` (bloco `attack`) em `src/data/towers.ts`, restaurando a compilação (FR-005)
- [X] T004 [P] Atualizar o contrato `tower.vira-lata-caramelo.attack-behavior` com `engagement: 'pursuer'` em `acceptedValues`, acrescentando ao `reason` a justificativa do cão solto na coleira e `changedBy: '009-engajamento-ataque-torre'`, em `src/data/contracts.ts`
- [X] T005 [P] Adicionar `ENGAGEMENT_FALLBACK = { prepareSec, strikeSec, cueAtSec, pursuitSpeedPxPerSec, arrivalDistancePx }` (torre sem `attackAnimation`) em `src/core/constants.ts`
- [X] T006 Criar `src/systems/engagement.ts` com os tipos e o esqueleto puro (sem Phaser): `EngagementTimings`, `EngagementConfig`, `EngagementPhase<T>` e `EngagementState<T>` como união discriminada (data-model §3), `EngagementCommand<T>`, `createEngagementState()`, a constante `EMPTY` de comandos compartilhada, o helper de clamp ao disco da coleira, e `stepEngagement()` avançando `phaseElapsedSec`/`cooldownSec` por `deltaSec` (ainda sem os ramos de fase)
- [X] T007 Implementar `engagementTimingsOf(type: TowerType): EngagementTimings` em `src/data/towers.ts`, derivando `prepareSec`/`strikeSec` de `frames.length × frameDurationMs` respeitando `minDurationMs`, `cueAtSec` de `fireCueFrameIndex × frameDurationMs` (ausente ⇒ 0) e `pursuitSpeedPxPerSec`/`arrivalDistancePx` de `attackAnimation`, caindo em `ENGAGEMENT_FALLBACK` quando a torre não declara animação (D3, FR-015)
- [X] T008 [P] Cobrir os dados em `src/data/towers.test.ts`: toda entrada de `TOWER_TYPES` declara um `engagement` conhecido; `attackBehaviorOf()` propaga o perfil sem alterá-lo; `engagementTimingsOf()` respeita `minDurationMs`, a deixa do golpe e o fallback sem animação (invariantes `>= 0` e `cueAtSec <= strikeSec`)
- [X] T009 Criar `src/systems/engagement.test.ts` com o harness da fatia (fábrica de alvos falsos com `x`/`y`/`alive`/`distanceTravelled` e builder de `EngagementConfig`) e os dois invariantes estruturais: I7 (avançar `deltaSec` em N passos de `deltaSec/N` produz o mesmo estado, dentro de epsilon) e I8 (`stepEngagement` nunca lança; alvo sumido da lista é tratado como inválido)
- [X] T010 [P] Deixar explícito em `src/systems/combat.ts` que o `origin` de `isTargetValid`/`acquireTarget` é a **base fixa** da torre, nunca a posição corrente do perseguidor (FR-012) — mudança de nome/doc, sem mudar comportamento

**Checkpoint**: Tipos e motor existem, `npm run check` verde, roster compila com o perfil declarado. As histórias podem começar.

---

## Phase 3: User Story 1 - Vira-lata encadeia alvos sem voltar à base (Priority: P1) 🎯 MVP

**Goal**: O Caramelo sai da base, morde o inimigo mais avançado no alcance e parte
direto para o próximo alvo válido — sem passar pela base, sem sair da coleira.

**Independent Test**: Torre ao lado do caminho, fila de 3+ inimigos: entre a 1ª e a
2ª mordida o cão vai de um alvo ao outro sem retornar ao posto (quickstart Cenário 1).

### Implementação — regra pura

- [X] T011 [US1] Alterar `range` do `vira-lata-caramelo` de 120 para 200 em `src/data/towers.ts` (FR-006 — é o alcance que dá caça a encadear)
- [X] T012 [P] [US1] Atualizar o contrato `tower.vira-lata-caramelo.base-stats` com `range: 200` em `src/data/contracts.ts`, com o `reason` de balanceamento (a 90 px/s do motoboy, 200 px cobrem ~4,4 s de pista contra ~2,3 s antes — a janela que permite 2+ mordidas encadeadas) e `changedBy: '009-engajamento-ataque-torre'` (D8; dano/custo/cadência ficam intocados)
- [X] T013 [US1] Implementar as fases `preparing` e `pursuing` em `src/systems/engagement.ts`: `idle → preparing` com alvo válido e cooldown zerado, `preparing → pursuing` ao cumprir `prepareSec`, deslocamento a `pursuitSpeedPxPerSec × deltaSec` rumo ao alvo, e **clamp da posição ao disco `|pos − base| <= range`** a cada passo (D4, FR-012a/SC-008)
- [X] T014 [US1] Implementar a fase `striking` em `src/systems/engagement.ts`: `pursuing → striking` quando `dist <= arrivalDistancePx` **e** `cooldownSec <= 0` (D6), emissão de um único comando `strike` em `cueAtSec` dentro da fase (guardado por `strikeEmitted`), e cooldown `1 / cadence` armado no início da mordida — correndo durante o deslocamento seguinte (FR-013, SC-003)
- [X] T015 [US1] Implementar o encadeamento em `src/systems/engagement.ts`: ao cumprir `strikeSec`, se existe alvo válido no alcance, ir para `pursuing` **a partir da posição corrente** — nunca `preparing`, nunca `idle`, nunca passando pela base (FR-008, invariante I5)
- [X] T016 [US1] Implementar a reavaliação de alvo a cada passo em `src/systems/engagement.ts` via `acquireTarget` a partir da base: alvo morto, vazado ou fora do alcance deixa de ser válido, não recebe dano e é substituído imediatamente por outro alvo válido, se houver (FR-007, FR-014, D5 — desempate determinístico pelo primeiro na ordem de avaliação)
- [X] T017 [US1] Cobrir a US1 em `src/systems/engagement.test.ts`: dois alvos válidos ⇒ fase pós-mordida é `pursuing` e a posição não passa pela base (I5, AC-1); dano por mordida idêntico ao comportamento atual (AC-2); o alvo encadeado é o mais avançado, não o mais próximo do cão (AC-3); alvo que morre/vaza durante a corrida não leva dano e a torre reengaja sem voltar (AC-4, I4); duas mordidas distam `>= 1 / cadence` (I3); alvo que cruza a borda do alcance durante a corrida mantém o perseguidor dentro do disco em **todo** passo (I1, quickstart Cenário 4)

### Integração — apresentação

- [X] T018 [US1] Converter `src/entities/Tower.ts` em adaptador: montar `EngagementConfig` (behavior + `engagementTimingsOf(def)` + base `{x, y}`) e `createEngagementState<Enemy>()` na construção; no `update()`, chamar `stepEngagement()` e aplicar cada comando `strike` revalidando o alvo com `isTargetValid` e resolvendo o efeito por `resolveAttack`/`applyOutcome` (projétil continua saindo pela `fire`); remover `pendingOutcome`, `handleFireCue`, `discardPendingOutcome` e o `cooldown` local — o estado do engajamento passa a ser a única fonte
- [X] T019 [US1] Reduzir `src/entities/TowerAttackAnimator.ts` a apresentação pura: um `render(state)` que, dada a fase e o tempo nela, escolhe o frame do estágio, espelha o sprite pela direção do alvo e **lê** a posição do estado para posicionar o `visualRoot` (em coordenadas locais à base); remover `moveTowardTarget`, `hasArrived`, `onFireCue`, `onComplete`, `cancel` e `VisualAttackTarget` — nenhuma regra sobra aqui (D2, FR-015). O log de textura faltante permanece (Constitution X)
- [X] T020 [US1] Validar a US1 **em jogo** com a skill `verify` (quickstart Cenário 1): Caramelo na curva, 3+ inimigos em fila, conferir que o cão não "pisca" de volta ao posto entre mordidas — o sinal de falha é o teleporte do antigo `reset()` sobrevivendo ao refactor

**Checkpoint**: O Caramelo encadeia mordidas dentro da coleira. Ele ainda **não** volta à base (US2) — depois da última mordida fica parado onde estava, como a spec antecipa.

---

## Phase 4: User Story 2 - Vira-lata volta à base quando não há mais alvos (Priority: P2)

**Goal**: Esvaziado o alcance, o cão retorna ao posto e fica ocioso lá; um alvo que
apareça durante o retorno o faz reengajar na hora.

**Independent Test**: Um inimigo, morto dentro do alcance ⇒ cão ocioso na base em até
2 s (SC-004). Spawnar um novo inimigo durante o retorno ⇒ reengajamento imediato,
sem completar o trajeto (quickstart Cenário 2).

- [X] T021 [US2] Implementar a fase `returning` em `src/systems/engagement.ts`: `striking → returning` ao cumprir `strikeSec` sem alvo válido e `pursuing → returning` quando o alcance esvazia, deslocando-se rumo à base a `pursuitSpeedPxPerSec` (FR-009)
- [X] T022 [US2] Implementar as saídas do retorno em `src/systems/engagement.ts`: `returning → idle` ao chegar à base, com a posição fixada exatamente em `base` (FR-011); `returning → pursuing` assim que um alvo válido entra no alcance, retomando **da posição corrente** — o reengajamento vence o trajeto de volta (FR-010, I6)
- [X] T023 [US2] Cobrir a US2 em `src/systems/engagement.test.ts`: sem candidatos válidos após a mordida ⇒ fase `returning` (AC-1); avançar o relógio ⇒ `idle` na posição da base (AC-2); injetar candidato válido no meio do retorno ⇒ `pursuing` a partir da posição corrente, sem passar pela base (AC-3, I6); do pior caso (perseguidor na borda dos 200 px) o retorno até `idle` cabe em **2 s** com a velocidade configurada (SC-004); o retorno acontece sem depender de nova onda (AC-4)
- [X] T024 [US2] Refletir as fases `returning` e `idle` em `src/entities/TowerAttackAnimator.ts`: frames de corrida durante o retorno, orientação apontando para a base, e o sprite de idle na base ao voltar a `idle` — sem teleporte, sem resíduo visual
- [ ] T025 [US2] Validar a US2 **em jogo** com a skill `verify` (quickstart Cenário 2): cronometrar o retorno após o último inimigo e confirmar o reengajamento com um inimigo novo no meio do caminho de volta

**Checkpoint**: O ciclo completo — ocioso → perseguindo → atacando → encadeando/retornando → ocioso — fecha em jogo. US1 e US2 funcionam juntas.

---

## Phase 5: User Story 3 - Perfil de engajamento como característica declarada (Priority: P3)

**Goal**: Trocar o perfil de uma torre é uma edição de **dado**. `stationary`
reproduz exatamente o roster de hoje; `pursuer` reproduz US1 + US2.

**Independent Test**: Alternar o `engagement` do Caramelo para `'stationary'` **só**
em `src/data/towers.ts` e ver a torre atacar sem sair do posto, sem tocar em nenhum
arquivo de sistema (quickstart Cenário 3, SC-006).

- [X] T026 [US3] Implementar o ramo `stationary` em `src/systems/engagement.ts`: `preparing → striking` direto (não há trajeto), posição corrente sempre igual à base, fases `pursuing`/`returning` inalcançáveis, ciclo `idle → preparing → striking → idle` governado pela cadência (D7, FR-002, FR-003) — um motor só, com os ramos de movimento desligados **por dado**, nunca por `if` de sistema
- [X] T027 [US3] Cobrir o perfil `stationary` em `src/systems/engagement.test.ts` (o playtest nunca pegaria: hoje não há torre estacionária no roster): posição idêntica à base em todo passo e nenhuma fase `pursuing`/`returning` (I2); alvo no alcance é atacado sem deslocamento; o intervalo entre mordidas é governado só pela cadência (AC-1); trocar apenas o campo `engagement` do config para `'pursuer'` reativa perseguição e encadeamento, sem nenhuma outra mudança (AC-2/AC-3, SC-006)
- [X] T028 [US3] Executar o quickstart Cenário 3 ponta a ponta: trocar o dado para `'stationary'` em `src/data/towers.ts`, confirmar que só `src/data/contracts.test.ts` falha (o portão de deriva funcionando de propósito, não um bug), que nenhum arquivo de sistema precisou mudar, e **reverter para `'pursuer'`** ao final

**Checkpoint**: O perfil é dado. Todas as histórias fechadas.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T029 [P] Atualizar `src/debug/DebugOverlay.ts`: desenhar o anel de alcance a partir da **base** da torre (contrato visual do FR-012a) e marcar a posição corrente do perseguidor, para que a coleira seja inspecionável a olho nu
- [X] T030 Cobrir o FR-015 em `src/systems/engagement.test.ts`: com os timings de fallback (torre sem `attackAnimation`), o motor produz o **mesmo número de `strike`** no mesmo intervalo que com os timings derivados da animação — nenhuma fase depende de textura (quickstart Cenário 5)
- [X] T031 Varrer o código morto do modelo antigo: `pendingOutcome`/`handleFireCue`/`discardPendingOutcome` fora de `src/entities/Tower.ts`, `moveTowardTarget`/`hasArrived`/`cancel`/`VisualAttackTarget` e os callbacks `onFireCue`/`onComplete`/`onCancel` fora de `src/entities/TowerAttackAnimator.ts`; confirmar que nenhuma regra nova entrou no animador e que não há `any`/`as` de conveniência (Constitution VII)
- [X] T032 Rodar `npm run check` (tsc --noEmit + vitest run) e fechar verde — portão obrigatório da constitution
- [ ] T033 Fechar o checklist do quickstart em jogo: pausa com o cão fora da base (congela e retoma sem salto) e reinício de partida (torre volta a ociosa na base, sem resíduo) — Cenário 6; conferir FPS estável na onda mais cheia (SC-007)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)**: sem dependências
- **Foundational (T002–T010)**: depende do Setup — **bloqueia todas as histórias**
- **US1 (T011–T020)**: depende da Foundational. É o MVP
- **US2 (T021–T025)**: depende da Foundational; assume o motor da US1 no mesmo arquivo (encadeamento e retorno são ramos da mesma máquina de estados) — na prática, sequencial após a US1
- **US3 (T026–T028)**: depende da Foundational; independente da US1/US2 em regra (é o ramo `stationary` do mesmo motor), mas seu teste de troca de perfil só é significativo com os ramos de perseguição prontos
- **Polish (T029–T033)**: depois das histórias desejadas

### Dentro de cada história

- Regra pura antes de apresentação: `systems/engagement.ts` → testes → `entities/Tower.ts` → `entities/TowerAttackAnimator.ts` → validação em jogo
- Dado e contrato andam **juntos** (T003/T004, T011/T012): mudar o runtime sem o contrato falha o portão de deriva de propósito

### Parallel Opportunities

- **Foundational**: T004 (`data/contracts.ts`), T005 (`core/constants.ts`) e T010 (`systems/combat.ts`) tocam arquivos distintos e podem correr juntas; T008 (`data/towers.test.ts`) paraleliza com T009 (`systems/engagement.test.ts`)
- **US1**: T012 (`data/contracts.ts`) paraleliza com T013–T016 (`systems/engagement.ts`)
- **Polish**: T029 (`debug/DebugOverlay.ts`) é independente do resto
- ⚠️ T013–T016, T021–T022 e T026 editam **o mesmo arquivo** (`src/systems/engagement.ts`) — são sequenciais por construção, não marcadas `[P]`

---

## Parallel Example: Foundational

```bash
# Depois de T002/T003 (o tipo e a declaração do perfil):
Task: "T004 Contrato attack-behavior + engagement em src/data/contracts.ts"
Task: "T005 ENGAGEMENT_FALLBACK em src/core/constants.ts"
Task: "T010 origin → base explícito em src/systems/combat.ts"
```

---

## Implementation Strategy

### MVP (US1)

1. Setup (T001) → Foundational (T002–T010)
2. US1 (T011–T020)
3. **PARE E VALIDE**: fila de 3 inimigos, o cão encadeia sem voltar ao posto (SC-001/SC-002)
4. Já é entregável: o cachorro-ioiô sumiu, que era o pedido original

### Entrega incremental

1. Foundational → o perfil existe no dado, o motor existe no código
2. + US1 → encadeamento dentro da coleira (**MVP**)
3. + US2 → ciclo fechado: retorno e reengajamento
4. + US3 → perfil provado como dado (`stationary` sem regressão)
5. + Polish → overlay, código morto, quickstart completo

---

## Notes

- `[P]` = arquivos diferentes, sem dependência pendente
- Commitar por tarefa ou grupo lógico; parar em qualquer checkpoint deixa o jogo jogável
- **Nunca** afrouxar `src/data/contracts.test.ts` para "passar": o portão falhar é ele funcionando — decida entre reverter o dado ou aceitar o novo valor com `reason`/`changedBy`
- **Nenhuma** regra de gameplay pode voltar a morar em `TowerAttackAnimator`: se um teste precisar de Phaser, a regra está no lugar errado (FR-016)
