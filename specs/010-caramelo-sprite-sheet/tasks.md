# Tasks: Sprite Sheet Animado do Vira-lata Caramelo

**Input**: Design documents from `/specs/010-caramelo-sprite-sheet/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Incluídos. A spec exige regressão aplicável, validação de tipo e
validação visual do asset final; a constitution exige `npm run build` verde.

**Organization**: Tarefas agrupadas por história de usuário. Cada fase entrega
um incremento observável e independentemente testável.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivo diferente, sem dependência pendente)
- **[Story]**: US1 / US2 / US3
- Todo caminho é relativo à raiz do repositório

## Path Conventions

Projeto único (`src/`), conforme `plan.md`. Testes ficam ao lado dos módulos em
`src/**/*.test.ts`, como já é a convenção do repositório.

---

## Phase 1: Setup

**Purpose**: Confirmar baseline e preparar o utilitário de asset.

- [X] T001 Rodar `npm run check` para registrar a linha de base antes da feature
- [X] T002 [P] Confirmar a imagem bruta com `file "ChatGPT Image Jul 12, 2026, 01_14_06 AM.png"` e registrar dimensões/grade em `specs/010-caramelo-sprite-sheet/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Suporte compartilhado para sheet, frames e transparência.

**CRITICAL**: Nenhuma história começa antes desta fase fechar.

- [X] T003 Adicionar suporte `--transparent-checkerboard` em `tools/fix_sprite_sheet.py` para remover checkerboard RGB conectado às bordas antes de recorte/extração
- [X] T004 [P] Adicionar `TEXTURES.towerCarameloSheet` e chaves `ANIMS.carameloPrepare`, `ANIMS.carameloRun`, `ANIMS.carameloAttack` em `src/core/constants.ts`
- [X] T005 Declarar `CARAMELO_SPRITE_SHEET` em `src/core/spriteSheets.ts` com grade 8x4, faixas prepare/run/attack e escala visual do contrato
- [X] T006 [P] Estender `src/core/spriteSheets.test.ts` para validar a grade 8x4, frame count 32, rejeição de 1774x887 e ranges do Caramelo dentro da sheet
- [X] T007 Atualizar `SpriteFrameRef`, `TowerType` e `AttackAnimationDefinition` em `src/data/towers.ts` para aceitar frame index opcional e idle frame sem alterar stats de gameplay

**Checkpoint**: contrato de sheet e tipos existem; histórias podem integrar asset.

---

## Phase 3: User Story 1 - Jogador ve o caramelo animado com fluidez (Priority: P1) MVP

**Goal**: O jogador vê idle, preparação, corrida com 6+ frames e mordida clara
durante o ciclo de ataque do Caramelo.

**Independent Test**: Construir um Caramelo perto do caminho, iniciar onda e
observar ciclo completo sem salto brusco de escala/posição.

### Tests for User Story 1

- [X] T008 [P] [US1] Adicionar testes em `src/data/towers.test.ts` para garantir que o Caramelo usa `CARAMELO_SPRITE_SHEET`, corrida tem pelo menos 6 frames distintos, ataque tem `fireCueFrameIndex` válido e stats aceitos permanecem iguais
- [X] T009 [P] [US1] Adicionar testes em `src/entities/TowerAttackAnimator.test.ts` ou módulo puro auxiliar equivalente para validar seleção de frame por estágio sem Phaser quando possível

### Implementation for User Story 1

- [X] T010 [US1] Gerar `src/assets/towers/vira-lata-caramelo-sheet.png` a partir da imagem bruta usando `npm run adjust:sprite-sheet` com grade 8x4, frames 256x256, preview `/tmp/caramelo-grid.png` e validação de bordas
- [X] T011 [US1] Atualizar `src/scenes/BootScene.ts` para importar o PNG final, carregar `CARAMELO_SPRITE_SHEET.rawTextureKey`, materializar a sheet validada e registrar erro claro se ausente/inválida
- [X] T012 [US1] Atualizar `src/data/towers.ts` para trocar os frames avulsos de prepare/run/attack por referências `textureKey + frame` da sheet final
- [X] T013 [US1] Atualizar `src/entities/Tower.ts` para criar o visual inicial por `spriteFrame` quando a sheet existe e preservar fallback por `spriteKey`/emoji quando não existe
- [X] T014 [US1] Atualizar `src/entities/TowerAttackAnimator.ts` para chamar `setTexture(textureKey, frame)` e dimensionar pelo frame ativo, preservando orientação e posição do engajamento

**Checkpoint**: US1 funcional com sheet preparada e animação visual fluida.

---

## Phase 4: User Story 2 - Artista/desenvolvedor prepara o sprite sheet bruto com seguranca (Priority: P2)

**Goal**: O asset final tem grade regular, alpha real, preview de inspeção e sem
bleed/corte relevante.

**Independent Test**: Abrir `/tmp/caramelo-grid.png` e confirmar visualmente
frames regulares, margens e ausência de bleed.

- [X] T015 [US2] Validar visualmente `/tmp/caramelo-grid.png` gerado pelo script e ajustar parâmetros em `tools/fix_sprite_sheet.py`/quickstart se houver corte, fundo ou bleed
- [X] T016 [US2] Atualizar `README.md` com exemplo específico do Caramelo 8x4, checkerboard RGB e comando de preview
- [X] T017 [US2] Atualizar `specs/010-caramelo-sprite-sheet/quickstart.md` com dimensões finais reais, comando final usado e localização do preview

**Checkpoint**: Asset final rastreável e processo repetível documentado.

---

## Phase 5: User Story 3 - Jogo continua funcional se o asset animado falhar (Priority: P3)

**Goal**: Ausência/invalidade da sheet registra erro e mantém a torre jogável
com as mesmas regras de combate.

**Independent Test**: Remover/invalidar a sheet final e confirmar fallback visual
com gameplay preservado.

### Tests for User Story 3

- [X] T018 [P] [US3] Adicionar teste em `src/core/spriteSheets.test.ts` para formatar erro da sheet do Caramelo inválida com chave correta e sem aceitar grade irregular
- [X] T019 [P] [US3] Adicionar teste em `src/data/contracts.test.ts` ou `src/data/towers.test.ts` garantindo que a feature não altera contratos de base stats e attack behavior do Caramelo

### Implementation for User Story 3

- [X] T020 [US3] Garantir em `src/scenes/BootScene.ts` que falha no raw/final Caramelo remove textura pública inválida e registra fallback sem interromper `GameScene`
- [X] T021 [US3] Garantir em `src/entities/TowerAttackAnimator.ts` que estágio sem frames válidos usa idle/fallback uma vez por estágio e não lança erro

**Checkpoint**: asset animado é substituível; combate continua coberto por regressão.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T022 Rodar `npm run check` e corrigir qualquer falha de typecheck/Vitest
- [X] T023 Rodar `npm run build` e corrigir qualquer falha de build de produção
- [X] T024 Validar manualmente o quickstart em jogo: ciclo completo, pausa/retomada com cão fora da base, reinício sem resíduo visual e fallback por asset ausente
- [X] T025 Atualizar `specs/010-caramelo-sprite-sheet/tasks.md` marcando todas as tarefas concluídas `[X]`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001-T002)**: sem dependências
- **Foundational (T003-T007)**: depende do Setup e bloqueia todas as histórias
- **US1 (T008-T014)**: depende da Foundational; é o MVP visual
- **US2 (T015-T017)**: depende de T010 e do preview gerado
- **US3 (T018-T021)**: depende da Foundational e integra com BootScene/Animator
- **Polish (T022-T025)**: depois das histórias

### Parallel Opportunities

- T002, T004 e T006 tocam arquivos distintos e podem paralelizar após T003/T005 onde aplicável
- T008 e T009 podem ser escritos em paralelo
- T018 e T019 podem ser escritos em paralelo
- T011, T013 e T014 tocam arquivos distintos, mas T014 depende do tipo de frame definido em T007

---

## Parallel Example: User Story 1

```bash
Task: "T008 Testes de dados da torre em src/data/towers.test.ts"
Task: "T009 Testes do animador/seleção de frame em src/entities/TowerAttackAnimator.test.ts"
```

---

## Implementation Strategy

### MVP First

1. Completar Setup + Foundational
2. Implementar US1 e validar o ciclo visual em jogo
3. Rodar `npm run check`

### Incremental Delivery

1. US1 entrega a animação fluida com a sheet final
2. US2 documenta e valida o processo de preparação do asset
3. US3 prova que o asset é substituível e não controla gameplay
4. Polish fecha quickstart, check e build

---

## Notes

- Nunca importar a imagem bruta da raiz no runtime.
- Nunca usar dimensões/frame count da sheet para dano, alcance, cadência ou alvo.
- Se a validação visual do preview mostrar corte/bleed, ajuste o asset/script,
  não o raio ou posicionamento de gameplay.
