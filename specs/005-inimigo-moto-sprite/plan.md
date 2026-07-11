# Implementation Plan: Sprite animado e orientação do inimigo "Dois Caras numa Moto"

**Branch**: `005-inimigo-moto-sprite` | **Date**: 2026-07-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-inimigo-moto-sprite/spec.md`

## Summary

Substituir o placeholder (círculo + emoji 🛵) do inimigo "Dois Caras numa Moto"
por um sprite animado (ciclo de pilotar em loop) e — requisito central — orientar
o sprite ao deslocamento ao longo do caminho: **espelhamento horizontal** por
sentido (esq./dir.) + **inclinação discreta em 3 estados** (subindo/plano/
descendo, ~±15°), sem rotação livre. O critério de aceite é que a moto **nunca**
aparente andar de ré.

Abordagem técnica: a decisão de orientação (vetor de movimento → `{ flipX, tilt }`)
vira um **módulo puro em `src/systems/orientation.ts`**, sem Phaser, testável via
Vitest (Constitution IX). O `Enemy` passa a derivar o vetor de deslocamento em
`step()` e aplica a orientação à `Sprite` (substituindo o `setFlipX(true)` fixo
atual). Grande parte da apresentação (load da sheet, animação `motoboyRide`,
fallback, dimensionamento 2,6× o raio) **já está prototipada** — o plano formaliza
isso e adiciona a orientação dinâmica. Nenhuma regra de gameplay muda.

## Technical Context

**Language/Version**: TypeScript (strict) — ES2020+ via Vite

**Primary Dependencies**: Phaser 3 (render/anim/sprite), Vite (bundler/asset import)

**Storage**: N/A (sem persistência nesta feature)

**Testing**: Vitest (`vitest run`); lógica de orientação exercitada sem renderização

**Target Platform**: Navegador (canvas WebGL/Canvas via Phaser), resolução base 1280×720 + sidebar 300

**Project Type**: Single project (jogo web) — layout `src/` já existente

**Performance Goals**: 60 fps estáveis com o volume de uma onda avançada; orientação O(1) por inimigo/frame, sem alocação no game loop (Constitution III)

**Constraints**: `strict: true`, sem `any`/`as` de conveniência; delta-time (sem timers Phaser para gameplay); assets substituíveis com fallback sem erro silencioso; nenhuma métrica de gameplay alterada

**Scale/Scope**: 1 tipo de inimigo com sheet nesta feature; padrão data-driven para os próximos; dezenas de inimigos simultâneos por onda

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|-----------|-----------|
| I. Gameplay em primeiro lugar | ✅ Puramente apresentação; loop principal intocado. |
| III. Performance desde o início | ✅ Orientação O(1) sem alocação; `setFlipX`/`rotation` só quando o estado muda. |
| IV. Arquitetura desacoplada | ✅ Regra de orientação isolada do Phaser; `Enemy` consome via função pura. |
| V. Dados × lógica × apresentação | ✅ Orientação é apresentação derivada do movimento; nenhum stat lê dimensão de sprite. |
| VI. Evolução incremental | ✅ Reaproveita o protótipo; um módulo novo pequeno, sem sistema novo. |
| VII. TypeScript rigoroso | ✅ Contrato tipado `{ flipX, tilt }`; sem `any`/`as`. |
| VIII. Determinismo | ✅ Orientação é função pura do vetor de movimento; sem aleatoriedade; delta-time preservado. |
| IX. Testabilidade | ✅ `orientation.ts` testável sem cena (mesmo padrão de `geometry.ts`). |
| X. Observabilidade | ✅ Fallback já registra falha; sem erro silencioso novo. |
| XI. Assets substituíveis | ✅ Raio de colisão vem dos dados; sheet/animação por chave estável; fallback mantém jogável. |
| XIV. Definição de concluído | ✅ Alcançável: typecheck verde, teste da regra crítica de orientação, sem regressão. |

**Resultado do gate: PASS.** Nenhuma violação; sem entradas em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/005-inimigo-moto-sprite/
├── plan.md              # Este arquivo (/speckit-plan)
├── research.md          # Fase 0 (/speckit-plan)
├── data-model.md        # Fase 1 (/speckit-plan)
├── quickstart.md        # Fase 1 (/speckit-plan)
├── contracts/
│   └── orientation.md   # Contrato do módulo puro de orientação
└── tasks.md             # /speckit-tasks (NÃO criado aqui)
```

### Source Code (repository root)

```text
src/
├── systems/
│   ├── orientation.ts        # NOVO: função pura movimento → { flipX, tilt } (3 estados)
│   ├── orientation.test.ts   # NOVO: testes Vitest da regra de orientação
│   └── geometry.ts           # existente (padrão de módulo puro a seguir)
├── entities/
│   └── Enemy.ts              # ALTERADO: deriva vetor em step(); aplica orientação (substitui setFlipX fixo)
├── data/
│   └── enemies.ts           # existente: spriteKey já presente; sem novo código por inimigo
├── core/
│   └── constants.ts         # possível: limiares de tilt/deadzone (tunning de apresentação)
└── scenes/
    ├── BootScene.ts         # existente: load da sheet + registro das animações (ride/shoot) — já pronto
    └── GameScene.ts         # existente: cria Enemy com DEPTH.enemy; sem alteração de contrato
```

**Structure Decision**: Single project, layout `src/` já materializa a Arquitetura
de Referência da constitution. A única adição estrutural é o módulo puro
`src/systems/orientation.ts` (+ teste), seguindo o precedente de `geometry.ts`.
As demais mudanças são pontuais em `entities/Enemy.ts` (e, se necessário, limiares
em `core/constants.ts`).

## Complexity Tracking

> Constitution Check passou sem violações — seção não aplicável.
