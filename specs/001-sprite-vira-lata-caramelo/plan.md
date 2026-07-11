# Implementation Plan: Sprite da torre Vira-lata Caramelo

**Branch**: `001-sprite-vira-lata-caramelo` | **Date**: 2026-07-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-sprite-vira-lata-caramelo/spec.md`

## Summary

Substituir o placeholder visual da torre **Vira-lata Caramelo** (círculo colorido + emoji 🐕) pela ilustração fornecida, **sem alterar nenhuma regra ou métrica de gameplay**. A imagem (`2d-game-tower-defense-sprite-of-a-caramel-colored-.png`, 832×1280, com base de pedra) é renomeada e movida da raiz para `src/assets/towers/vira-lata-caramelo.png`, importada via Vite (URL com hash) e carregada de forma centralizada no `preload` da `BootScene`, sob uma **chave de textura estável** registrada em `constants.ts`. A `TowerType` ganha um campo opcional `spriteKey`; a camada de apresentação (`Tower`, card da `UIScene` e preview do `BuildManager`) passa a resolver o visual por essa chave, com **fallback para o círculo + emoji atual** caso o asset não carregue. Colisão, alcance, hover e depth continuam derivados exclusivamente dos dados da torre (`radius`, `range`, `DEPTH.tower`), nunca das dimensões da imagem.

## Technical Context

**Language/Version**: TypeScript 5.6 (`strict: true`)

**Primary Dependencies**: Phaser 3.88, Vite 5.4, Vitest 2.1

**Storage**: N/A (asset estático empacotado pelo bundler)

**Testing**: Vitest (regras puras em `src/systems/*.test.ts`, ambiente `node`, sem Phaser/DOM)

**Target Platform**: Navegador (canvas WebGL/Canvas via Phaser); build estático

**Project Type**: Single project (jogo web front-end) — layout atual em `src/`

**Performance Goals**: 60 fps estáveis; a troca de forma por `Phaser.Image` é neutra em custo de render e não introduz alocação no game loop

**Constraints**: Sem regressão de gameplay observável (SC-002); `npm run build` verde (SC-005); sem erro silencioso no carregamento (FR-007); imagem fora da raiz do repo (SC-004)

**Scale/Scope**: 1 asset, 1 tipo de torre afetado. Arquivos tocados: `data/towers.ts`, `core/constants.ts`, `scenes/BootScene.ts`, `entities/Tower.ts`, `scenes/UIScene.ts`, `managers/BuildManager.ts` (+ novo diretório `src/assets/`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação contra `.specify/memory/constitution.md` v1.0.0. Esta fatia é praticamente o caso-modelo dos princípios **V** e **XI**.

| Princípio / Regra | Situação | Como o plano cumpre |
|---|---|---|
| **IV. Arquitetura Desacoplada** | ✅ | Mudança 100% de apresentação; nenhuma regra depende do sprite. `Tower` continua consumindo `def` para combate. |
| **V. Dados / Lógica / Apresentação** | ✅ | Visual referenciado por `spriteKey` (identificador estável) em `src/data/towers.ts`; caminho do arquivo isolado no import + registro de textura, nunca embutido na lógica. |
| **VI. Evolução Incremental** | ✅ | Campo opcional `spriteKey` na `TowerType` existente; nenhum sistema novo. Motoboy/Faria Limer herdam o mesmo mecanismo adicionando uma entrada de dado. |
| **VII. TypeScript Rigoroso** | ✅ | `spriteKey?: string` tipado; import de `.png` já coberto por `vite/client` (ver `src/vite-env.d.ts`). Sem `any`/`as` de conveniência. |
| **VIII. Determinismo** | ✅ | Nenhuma alteração em dano/spawn/cooldown/timers. |
| **IX. Testabilidade** | ✅ | Regras puras intocadas; os testes existentes (`geometry`, `placement`, `targeting`, `waves`) continuam válidos e passando (SC-002). Código novo é de render (Phaser) — fora do escopo de teste unitário por design da constitution. |
| **X. Observabilidade / sem erro silencioso** | ✅ | Erro do loader tratado em `BootScene` (`Phaser.Loader.Events.FILE_LOAD_ERROR` + `console.error`); ausência da textura leva a fallback explícito, não a crash silencioso (FR-007). |
| **XI. Assets Substituíveis** | ✅ | Carregamento centralizado no `preload`; dimensões de colisão/gameplay (`radius`, `range`) separadas das dimensões visuais da imagem; sprite trocável sem tocar no domínio. |
| **XIII. Escalabilidade Visual** | ✅ | Imagem escalada por fator relativo ao `radius` (display size), preservando aspecto; nada de coordenada/resolução hardcoded nova. |
| **XIV. Definição de Concluído** | ✅ | Loop principal intacto, feedback visual presente, fallback garante funcionamento sem asset final, typecheck verde. |
| **Regra: sem ler dimensão de sprite para regra** | ✅ | Interatividade/colisão usam `Phaser.Geom.Circle(0,0,radius)`; a imagem não alimenta nenhuma decisão de gameplay. |

**Resultado do gate**: PASS — nenhuma violação. `Complexity Tracking` fica vazio.

## Project Structure

### Documentation (this feature)

```text
specs/001-sprite-vira-lata-caramelo/
├── plan.md              # Este arquivo (/speckit-plan)
├── research.md          # Fase 0 — decisões (local do asset, carregamento, escala, fallback)
├── data-model.md        # Fase 1 — TowerType.spriteKey, registro de texturas, entidade Asset
├── quickstart.md        # Fase 1 — como validar (build, dev, cenários de aceite)
├── contracts/
│   └── presentation.md  # Fase 1 — contrato de carregamento de asset + resolução visual da torre
└── tasks.md             # Fase 2 (/speckit-tasks — NÃO criado por /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── assets/                     # NOVO — assets empacotados pelo Vite (import → URL com hash)
│   └── towers/
│       └── vira-lata-caramelo.png   # imagem movida/renomeada da raiz (FR-004)
├── core/
│   └── constants.ts            # registrar chave de textura estável (TEXTURES.towerCaramelo)
├── data/
│   └── towers.ts               # TowerType.spriteKey opcional + preencher na Vira-lata Caramelo
├── scenes/
│   ├── BootScene.ts            # preload() central do sprite + tratamento de erro do loader
│   └── UIScene.ts              # card da sidebar usa sprite (US2) com fallback emoji
├── entities/
│   └── Tower.ts                # renderizar Phaser.Image por spriteKey; fallback círculo+emoji
├── managers/
│   └── BuildManager.ts         # preview de construção coerente com o sprite (fallback emoji)
└── vite-env.d.ts               # já contém /// <reference types="vite/client" /> (imports .png tipados)

# Fora de src/: remover a imagem da raiz do repositório após mover (SC-004)
```

**Structure Decision**: Single project, reaproveitando o layout existente. A única estrutura nova é `src/assets/towers/`, alinhada à camada de apresentação da Arquitetura de Referência da constitution. O asset entra por `import` (Vite → URL com hash, cache-busting), e não em `public/`, para manter o mapeamento caminho→identificador em um único módulo e o versionamento de cache automático. A chave de textura (não o caminho) é o identificador estável consumido pela gameplay.

## Complexity Tracking

> Sem violações de Constitution Check — seção intencionalmente vazia.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
