# Implementation Plan: Animacao de ataque do Vira-lata Caramelo

**Branch**: `003-vira-attack-animation` | **Date**: 2026-07-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-vira-attack-animation/spec.md`

## Summary

Adicionar uma animacao visual de ataque para a torre **Vira-lata Caramelo** composta por preparacao, corrida em loop ate o alvo visual e ataque, mantendo dano, alcance, cadencia, custo, selecao de alvo e colisao exatamente como regras de gameplay independentes de assets. A solucao sera data-driven: a definicao da torre passa a referenciar uma sequencia de animacao com etapas tipadas, sprites ordenados, duracoes e regra de repeticao. `BootScene` carrega os sprites por chaves estaveis; `Tower` delega a apresentacao para um pequeno player reutilizavel que roda somente na camada visual, orienta o cachorro para o alvo, emite um unico cue de disparo na etapa de ataque e retorna ao idle/fallback quando a sequencia termina ou e cancelada.

## Technical Context

**Language/Version**: TypeScript 5.6 (`strict: true`)

**Primary Dependencies**: Phaser 3.88, Vite 5.4, Vitest 2.1

**Storage**: N/A (assets estaticos empacotados pelo Vite)

**Testing**: Vitest (`src/systems/*.test.ts`) para regras puras; validacao manual no dev server para animacao/renderizacao Phaser; `npm run check` como gate de implementacao

**Target Platform**: Navegador (canvas Phaser; build estatico)

**Project Type**: Single project (jogo web front-end) com codigo em `src/`

**Performance Goals**: 60 fps estaveis; animacao sem alocacoes recorrentes no game loop, sem criar/destroir varios sprites por frame e com no maximo uma animacao ativa por torre

**Constraints**: Regras de gameplay nao podem depender de dimensoes de sprites; corrida visual deve usar delta time; corrida deve loopar sem congelar; dano/projetil deve ser emitido uma unica vez no cue de ataque; falha de asset deve registrar erro e cair em fallback; escopo limitado ao Vira-lata Caramelo e a base reutilizavel necessaria

**Scale/Scope**: 1 torre existente, 1 definicao de animacao de ataque, sprites atuais do caramelo em `src/assets/towers/`, helper/player reutilizavel para etapas, sem sistema global de animacoes para todo o jogo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação contra `.specify/memory/constitution.md` v1.0.0.

| Princípio / Regra | Situação | Como o plano cumpre |
|---|---|---|
| **I. Gameplay em Primeiro Lugar** | PASS | A mudanca melhora feedback do ataque dentro do loop atual sem introduzir novas mecanicas, balanceamento ou upgrades. |
| **II. Responsividade** | PASS | A torre inicia feedback visual assim que reserva um ataque valido; o cue de disparo acontece em ponto configurado da etapa de ataque. |
| **III. Performance desde o Início** | PASS | O player reutiliza objetos Phaser da torre, atualiza por delta e evita criar multiplos cachorros/animacoes sobrepostas. |
| **IV. Arquitetura Desacoplada** | PASS | Selecao de alvo, alcance, cooldown e dano seguem em `Tower`/sistemas existentes; o novo player e apresentacao. |
| **V. Dados / Lógica / Apresentação** | PASS | A sequencia visual e configurada por chaves de textura e etapas em dados; gameplay consome `range`, `damage`, `fireRate`, `projectileSpeed` como antes. |
| **VI. Evolução Incremental** | PASS | Introduz apenas a abstracao necessaria para etapas prepare/run/attack do caramelo, reutilizavel por futuras torres via a mesma interface. |
| **VII. TypeScript Rigoroso** | PASS | Etapas serao modeladas por tipos discriminados (`once`/`loopUntilArrival`) e callbacks tipados, sem `any` de conveniencia. |
| **VIII. Determinismo** | PASS | Timers usam `deltaSec`; o cue de disparo e emitido no maximo uma vez por ataque; regras de alvo continuam previsiveis. |
| **IX. Testabilidade** | PASS | Regras puras existentes permanecem sem Phaser; logica pura de progressao de frames/etapas pode ser testada se extraida para helper sem renderizacao. |
| **X. Observabilidade / Depuração** | PASS | Falhas de asset registram chave/URL; fallback visual e explicito; debug overlay continua lendo alvo/range sem depender da animacao. |
| **XI. Assets Substituíveis** | PASS | Sprites sao referenciados por chaves estaveis e carregados centralmente; adicionar frames exige alterar a definicao da etapa, nao regras de combate. |
| **XIII. Escalabilidade Visual** | PASS | Dimensoes visuais usam escala relativa ao `radius` e orientacao por alvo; colisao/alcance nao leem pixels do sprite. |
| **XIV. Definição de Concluído** | PASS | Inclui feedback visual, fallback, typecheck/testes aplicaveis e preservacao do loop principal. |

**Resultado do gate inicial**: PASS — nenhuma violação ou clarificacao pendente.

## Project Structure

### Documentation (this feature)

```text
specs/003-vira-attack-animation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── attack-animation.md
└── tasks.md              # Phase 2 output (/speckit-tasks; not created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── assets/
│   └── towers/
│       ├── vira-lata-caramelo.png
│       ├── vira-lata-caramelo-waking.png
│       ├── vira-lata-caramelo-running.png
│       ├── vira-lata-caramelo-running-1.png
│       └── vira-lata-ramelo-atack.png       # asset atual; chave estavel esconde o nome fisico
├── core/
│   └── constants.ts                         # TEXTURES para idle/prep/run/attack do caramelo
├── data/
│   └── towers.ts                            # TowerType com attackAnimation opcional e fonte unica da sequencia
├── entities/
│   ├── Tower.ts                             # agenda/cancela animacao e emite fire no cue de ataque
│   └── TowerAttackAnimator.ts               # novo player visual reutilizavel por etapas
├── scenes/
│   ├── BootScene.ts                         # preload central dos sprites + erro do loader
│   └── GameScene.ts                         # cria Tower como hoje; sem conhecer sprites especificos
├── systems/
│   ├── targeting.ts                         # continua fonte da selecao de alvo
│   └── *.test.ts                            # suite existente deve continuar verde
└── debug/
    └── DebugOverlay.ts                      # sem dependencia nova; pode continuar mostrando alvo/range
```

**Structure Decision**: Single project, preservando o layout atual. A nova estrutura fica no menor ponto coerente: `TowerAttackAnimator` vive ao lado de `Tower` porque e apresentacao da entidade; a definicao visual vive na entrada de dados da torre para manter uma fonte unica da sequencia; `BootScene` segue sendo o unico ponto que conhece imports de arquivo. Nao sera criado um sistema global de animacoes, registry multi-entidade ou backend.

## Phase 0 Output

`research.md` foi gerado com as decisoes de modelo de etapas, carregamento de assets, cue de disparo, loop de corrida, cancelamento/fallback e limites de performance.

## Phase 1 Output

`data-model.md`, `contracts/attack-animation.md` e `quickstart.md` foram gerados. Nao ha API de rede; o contrato documenta interfaces internas entre dados, carregamento, `Tower`, player visual e regras de combate.

## Post-Design Constitution Check

Reavaliacao apos gerar `research.md`, `data-model.md`, `contracts/` e `quickstart.md`.

| Gate | Situação | Evidência |
|---|---|---|
| Separação visual vs. gameplay | PASS | `data-model.md` separa `AttackAnimationDefinition` de `range/damage/fireRate`; contrato C4 proibe sprite influenciar colisao, alvo ou alcance. |
| Fonte unica da animacao | PASS | Contrato C2 fixa `TowerType.attackAnimation` como origem de etapas, ordem, frames, duracoes e repeticao. |
| Cue de combate unico | PASS | Contrato C5 define que a animacao pode emitir exatamente um `fire` por ataque e deve revalidar alvo antes do cue. |
| Fallback e observabilidade | PASS | Contratos C1/C6 exigem `console.error` em falha de asset e fallback para idle/circulo+emoji sem travar partida. |
| Performance | PASS | Quickstart inclui cenarios de ataques consecutivos e observacao de FPS/debug; modelo evita multiplas animacoes simultaneas por torre. |
| Testabilidade | PASS | Quickstart mantem `npm run check`; research recomenda teste unitario para helper puro de sequenciamento se extraido. |

**Resultado do gate pós-design**: PASS — nenhuma violação ou clarificacao pendente.

## Complexity Tracking

> Sem violações de Constitution Check — seção intencionalmente vazia.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
