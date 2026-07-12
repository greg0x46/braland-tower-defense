# Implementation Plan: Sprite Sheet Animado do Vira-lata Caramelo

**Branch**: `010-caramelo-sprite-sheet` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-caramelo-sprite-sheet/spec.md`

## Summary

Preparar o sprite sheet bruto `ChatGPT Image Jul 12, 2026, 01_14_06 AM.png`
como uma sheet final regular do Vira-lata Caramelo e integrar essa sheet à
apresentação da torre. A gameplay aceita do Caramelo permanece intocada: dano,
alcance, cadência, custo, alvo, engajamento e progressão continuam vindos de
`src/data/towers.ts`, `src/data/contracts.ts` e `src/systems/engagement.ts`.

Abordagem técnica: normalizar a arte bruta em `src/assets/towers/vira-lata-caramelo-sheet.png`
com grade `8x4`, frames `256x256`, alpha real e preview de validação; declarar
o contrato da sheet em `src/core/spriteSheets.ts`; carregar e validar a sheet em
`BootScene`; e ajustar `Tower`/`TowerAttackAnimator` para renderizar frames de
uma única textura com fallback visual jogável quando a sheet estiver ausente ou
inválida.

## Technical Context

**Language/Version**: TypeScript strict (ES2020) + Python 3 para utilitário de asset

**Primary Dependencies**: Phaser 3.88.2, Vite 5, Vitest 2, Pillow via `tools/fix_sprite_sheet.py`

**Storage**: N/A; asset PNG versionado em `src/assets/towers/`

**Testing**: `npm run check` (`tsc --noEmit` + `vitest run`) e `npm run build`; validação visual por preview gerado pelo script

**Target Platform**: Navegador via Phaser canvas, resolução base 1280x720 + sidebar 300

**Project Type**: Single project (jogo web) no layout `src/`

**Performance Goals**: Manter 60 fps perceptíveis; troca de frame O(1) por torre, sem usar dimensões de textura em gameplay

**Constraints**: `strict: true`; sem `any`/`as` de conveniência; assets substituíveis; erro de asset deve ser registrado e cair em fallback; animações não alteram regras de combate

**Scale/Scope**: 1 torre (`vira-lata-caramelo`), 1 sprite sheet final `8x4` com 32 frames; estados visuais mínimos: idle, prepare, run, attack

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|-----------|-----------|
| I. Gameplay em primeiro lugar | PASS: feature é visual e preserva o loop construir -> onda -> combate. |
| III. Performance desde o início | PASS: validação acontece no load; runtime só troca frame e posição já existentes. |
| IV. Arquitetura desacoplada | PASS: `TowerAttackAnimator` segue só apresentação; `systems/engagement.ts` continua dono da regra. |
| V. Dados, lógica e apresentação | PASS: stats e contratos de gameplay permanecem em `src/data/`; sheet vive em `core/assets`. |
| VII. TypeScript rigoroso | PASS: contrato de frame tipado, sem depender de `any`. |
| VIII. Determinismo | PASS: cadência/dano/engajamento continuam controlados por delta e dados, não pelo asset. |
| IX. Testabilidade | PASS: validação de contrato da sheet em Vitest; regressões de gameplay já cobertas por sistemas puros. |
| X. Observabilidade | PASS: falhas de carregamento/grade são `console.error` explícito e fallback jogável. |
| XI. Assets substituíveis | PASS: ausência/invalidade da sheet não bloqueia combate nem construção. |
| XIV. Definição de concluído | PASS: inclui check/build, preview visual, fallback, sem regressão de contratos. |

**Resultado do gate: PASS.** Nenhuma violação; sem entradas em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/010-caramelo-sprite-sheet/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── caramelo-animation.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── assets/
│   └── towers/
│       └── vira-lata-caramelo-sheet.png     # novo asset final preparado
├── core/
│   ├── constants.ts                         # chaves de textura/animação
│   ├── spriteSheets.ts                      # contrato da sheet do Caramelo
│   └── spriteSheets.test.ts                 # validação do contrato
├── data/
│   ├── towers.ts                            # frames de idle/prepare/run/attack por dado
│   └── towers.test.ts                       # invariantes de frames e gameplay preservado
├── entities/
│   ├── Tower.ts                             # exibe frame inicial da sheet com fallback
│   └── TowerAttackAnimator.ts               # troca frames da sheet por estado visual
└── scenes/
    └── BootScene.ts                         # carrega, valida e materializa a sheet

tools/
└── fix_sprite_sheet.py                      # suporte a fundo checkerboard RGB
```

**Structure Decision**: manter projeto único e as camadas atuais. O asset entra
em `src/assets/towers/`; o contrato de sheet fica em `src/core/`; a escolha de
frames fica em `src/data/towers.ts`; `BootScene` centraliza load/validação; e
`TowerAttackAnimator` continua sem regra de gameplay.

## Complexity Tracking

> Constitution Check passou sem violações — seção não aplicável.
