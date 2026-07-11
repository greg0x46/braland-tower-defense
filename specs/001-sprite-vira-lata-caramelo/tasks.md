---
description: "Task list for feature implementation"
---

# Tasks: Sprite da torre Vira-lata Caramelo

**Input**: Design documents from `/specs/001-sprite-vira-lata-caramelo/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/presentation.md, quickstart.md

**Tests**: Nenhum teste novo é solicitado. A feature é 100% de apresentação; a
suíte Vitest de regras puras existente (`geometry`, `placement`, `targeting`,
`waves`) apenas precisa continuar verde (SC-002) — validada na fase de Polish.

**Organization**: Tarefas agrupadas por user story para permitir implementação e
teste independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências)
- **[Story]**: A qual user story a tarefa pertence (US1, US2)
- Caminhos de arquivo exatos incluídos nas descrições

## Path Conventions

- **Single project**: código-fonte em `src/` na raiz do repositório (conforme plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar o local do asset e higienizar o repositório (FR-004, SC-004)

- [X] T001 Criar o diretório de assets `src/assets/towers/` na raiz do projeto
- [X] T002 Mover e renomear a imagem da raiz `2d-game-tower-defense-sprite-of-a-caramel-colored-.png` para `src/assets/towers/vira-lata-caramelo.png` (usar `git mv`), garantindo que ela deixe de existir na raiz do repositório (FR-004, SC-004)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Registrar a chave de textura estável, estender o modelo de dados e
carregar o asset centralmente — pré-requisitos que TODAS as user stories consomem

**⚠️ CRITICAL**: Nenhuma user story pode renderizar o sprite antes desta fase

- [X] T003 [P] Adicionar a chave de textura estável `towerCaramelo: 'tower-vira-lata-caramelo'` ao objeto `TEXTURES` em `src/core/constants.ts` (data-model: Asset registry / FR-005)
- [X] T004 [P] Adicionar o campo opcional `spriteKey?: string` à interface `TowerType` em `src/data/towers.ts` e preencher `spriteKey: TEXTURES.towerCaramelo` apenas na entrada `vira-lata-caramelo`, sem alterar nenhum valor de gameplay (`cost/range/damage/fireRate/projectileSpeed/radius`) (data-model: TowerType / FR-002, FR-005)
- [X] T005 Adicionar `preload()` à `src/scenes/BootScene.ts`: importar a URL via `import caramelUrl from '../assets/towers/vira-lata-caramelo.png'` e registrar `this.load.image(TEXTURES.towerCaramelo, caramelUrl)`, mantendo o caminho literal exclusivamente neste import (contrato C1 / FR-006)
- [X] T006 Registrar tratamento de erro do loader em `src/scenes/BootScene.ts` via `this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, ...)` com `console.error` incluindo chave/URL, sem lançar exceção, para que consumidores caiam no fallback (contrato C1 / FR-007, Constitution X)

**Checkpoint**: Textura carregada (ou erro logado) e dados prontos — user stories podem iniciar

---

## Phase 3: User Story 1 - Ver a torre Vira-lata Caramelo com sua arte no campo (Priority: P1) 🎯 MVP

**Goal**: A torre construída no mapa renderiza a ilustração do cachorro caramelo
no lugar do círculo + emoji, sem alterar nenhuma métrica de gameplay observável.

**Independent Test**: Construir uma Vira-lata Caramelo numa partida e confirmar
que a arte aparece na posição da torre; hover mostra o anel de alcance com o
mesmo raio; ao atirar, projéteis saem da posição da torre com alvo/cadência/dano
idênticos (quickstart §4 US1).

### Implementation for User Story 1

- [X] T007 [US1] Definir a constante de apresentação de escala do sprite (ex.: `TOWER_SPRITE_SCALE = 3.0`) como constante de módulo em `src/entities/Tower.ts`, separada das métricas de gameplay (data-model: Constante de apresentação / Constitution XIII)
- [X] T008 [US1] Implementar a resolução visual em `src/entities/Tower.ts`: se `def.spriteKey` existe e `scene.textures.exists(def.spriteKey)`, adicionar um `Phaser.GameObjects.Image(def.spriteKey)` ao container com `displayWidth = radius * TOWER_SPRITE_SCALE`, `displayHeight` preservando o aspecto (imgHeight/imgWidth) e origem centrada (offset vertical de apresentação permitido); caso contrário, manter o fallback atual `body` (círculo `def.color`) + `emoji` (contrato C2 / FR-001, FR-007, SC-001)
- [X] T009 [US1] Verificar em `src/entities/Tower.ts` que a hitbox interativa permanece `Phaser.Geom.Circle(0,0,radius)`, o `rangeRing` continua centrado com raio `range`, o hover continua exibindo o alcance e a origem do projétil segue `(this.x, this.y)` — nenhum desses valores derivado das dimensões da imagem (contrato C2 invariantes / FR-002, FR-003)

**Checkpoint**: US1 completa — a torre aparece com a arte no campo e o combate é idêntico ao placeholder (MVP entregável)

---

## Phase 4: User Story 2 - Reconhecer a torre no menu de construção (Priority: P2)

**Goal**: O card da Vira-lata Caramelo na sidebar exibe a arte da torre (com
fallback emoji), mantendo layout, nome, custo, stats e interações inalterados.

**Independent Test**: Abrir o jogo e verificar que o card da Vira-lata Caramelo
na sidebar apresenta um ícone coerente com a torre construída no campo, sem
mudança de layout (quickstart §4 US2).

### Implementation for User Story 2

- [X] T010 [US2] Ajustar `buildCard(type)` em `src/scenes/UIScene.ts`: se `type.spriteKey` existe e a textura existe, renderizar um `Phaser.GameObjects.Image` escalado ao slot do ícone (~40px, aspecto preservado); caso contrário, manter o `text(type.emoji)` atual — preservando posição/tamanho do card, nome, custo, stats e interações de seleção/hover/saldo (contrato C3 / US2, FR-001)

**Checkpoint**: US1 e US2 funcionam de forma independente — campo e card coesos

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Coerência do preview de construção e validação ponta a ponta

- [X] T011 [US1] Fazer o preview de construção em `src/managers/BuildManager.ts` exibir o sprite (via `type.spriteKey`/`textures.exists`) seguindo o mouse, com fallback para `previewEmoji`/`previewBody`, preservando `isValidPlacement`, `radius`/`range` do preview e o feedback de cor válido/inválido (contrato C4)
- [X] T012 Rodar `npm run build` (tsc --noEmit && vite build) e confirmar que passa sem erros de tipo, incluindo a resolução do import de `.png` (quickstart §1 / SC-005)
- [X] T013 [P] Rodar `npm test` (vitest run) e confirmar que as suítes de regra `geometry`, `placement`, `targeting` e `waves` continuam todas verdes (quickstart §2 / SC-002)
- [X] T014 [P] Executar a validação manual do quickstart: cenários de aceite US1/US2 (§4), depth/camadas (FR-008), caminho de falha do asset com fallback + erro no console (§5, FR-007) e higiene do repositório (§6, SC-004)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente
- **Foundational (Phase 2)**: Depende do Setup (asset precisa existir no novo caminho para o import de T005) — BLOQUEIA as user stories
- **User Stories (Phase 3, 4)**: Dependem da conclusão da Foundational
  - Após a Foundational, US1 e US2 podem prosseguir em paralelo (arquivos distintos: `Tower.ts` vs `UIScene.ts`)
- **Polish (Phase 5)**: Depende das user stories desejadas concluídas

### User Story Dependencies

- **User Story 1 (P1)**: Começa após a Foundational — sem dependência de US2
- **User Story 2 (P2)**: Começa após a Foundational — reaproveita a mesma textura de US1, mas é independentemente testável

### Within Each User Story

- US1: T007 (constante) antes de T008 (usa a constante); T009 valida invariantes após T008
- US2: T010 é tarefa única

### Parallel Opportunities

- **Setup**: T001 → T002 são sequenciais (mesmo alvo)
- **Foundational**: T003 e T004 em paralelo (`constants.ts` vs `towers.ts`); T005 e T006 no mesmo arquivo (`BootScene.ts`), sequenciais, e dependem de T003 (chave) e de T002 (arquivo movido)
- **Cross-story**: após a Foundational, US1 (Phase 3) e US2 (Phase 4/T010) podem ser feitas em paralelo por pessoas diferentes
- **Polish**: T013 e T014 em paralelo entre si (T014 depende de T012 verde)

---

## Parallel Example: Foundational (Phase 2)

```bash
# T003 e T004 tocam arquivos diferentes — podem rodar juntas:
Task: "Adicionar TEXTURES.towerCaramelo em src/core/constants.ts"
Task: "Adicionar spriteKey?: string em src/data/towers.ts e preencher na vira-lata-caramelo"
```

## Parallel Example: após a Foundational

```bash
# US1 e US2 em arquivos distintos — em paralelo:
Task: "US1 — renderizar sprite da torre em src/entities/Tower.ts"
Task: "US2 — renderizar ícone do card em src/scenes/UIScene.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup (mover/renomear o asset)
2. Completar Phase 2: Foundational (chave, `spriteKey`, preload + erro) — CRÍTICO
3. Completar Phase 3: User Story 1 (sprite no campo)
4. **PARAR e VALIDAR**: testar US1 isoladamente (quickstart §4 US1)
5. Demonstrar (MVP!)

### Incremental Delivery

1. Setup + Foundational → base pronta
2. US1 → testar → demo (MVP: torre com arte no campo)
3. US2 → testar → demo (card coeso na sidebar)
4. Polish → preview + validação de build/test/quickstart

---

## Notes

- [P] = arquivos diferentes, sem dependências
- Nenhum teste unitário novo (feature de apresentação); a suíte de regras existente é a rede de segurança (SC-002)
- O caminho literal do asset vive apenas no import da `BootScene` (contrato C1)
- Colisão/alcance/depth derivam sempre de `def`/`DEPTH.tower`, nunca das dimensões da imagem (INV-1..INV-4)
- Commitar após cada tarefa ou grupo lógico
