# Implementation Plan: Comportamento de Engajamento de Ataque da Torre

**Branch**: `009-engajamento-ataque-torre` | **Date**: 2026-07-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-engajamento-ataque-torre/spec.md`

## Summary

Introduzir o **perfil de engajamento** (`stationary` | `pursuer`) como característica
declarada da torre, e fazer o Vira-lata Caramelo encadear alvos sem voltar à base
enquanto houver caça dentro do seu alcance (agora 200 px, medido sempre a partir
da base).

A abordagem técnica é uma **inversão de dono**: hoje a perseguição existe apenas
como deslocamento visual dentro de `TowerAttackAnimator` (`moveTowardTarget`,
`hasArrived`), que também decide, pela deixa da animação, *quando* o dano sai. Isso
torna impossível testar encadeamento, retorno e coleira sem renderizar (FR-016) e
mantém o gameplay refém do animador (FR-015).

O plano move a máquina de estados do engajamento — incluindo a **posição corrente
do perseguidor** e o instante do golpe — para um sistema puro
`src/systems/engagement.ts`, sem Phaser. `TowerAttackAnimator` passa a ser
estritamente apresentação: lê a fase e a posição do estado e escolhe o frame. A
`Tower` vira um adaptador fino entre os dois. Timings (preparar, golpear, deixa do
golpe) são derivados dos **dados** da animação — que existem mesmo quando a textura
não carrega —, com constantes de fallback quando a torre não declara animação.

## Technical Context

**Language/Version**: TypeScript 5.6 (`strict: true`), ES modules

**Primary Dependencies**: Phaser 3.88 (apenas nas camadas `scenes/`, `entities/`,
`debug/`), eventemitter3 (EventBus)

**Storage**: N/A (preferências de áudio em localStorage; esta fatia não persiste nada)

**Testing**: Vitest 2.1 — testes unitários colocados ao lado do módulo
(`src/systems/*.test.ts`). Validação em jogo real via skill `verify` (Playwright
headless). Gate: `npm run check` (`tsc --noEmit && vitest run`).

**Target Platform**: Browser (Vite dev server / build estático)

**Project Type**: Jogo single-page (Tower Defense), projeto único em `src/`

**Performance Goals**: 60 fps estáveis com o volume atual de torres e inimigos
(SC-007). Orçamento por torre/frame: uma varredura O(n) sobre os inimigos — o mesmo
custo do `resolveAttack` de hoje. Zero alocação nova no hot path.

**Constraints**: Lógica independente de frame rate (delta time); o perseguidor
NUNCA renderiza fora do anel de alcance (FR-012a/SC-008); nenhuma regra pode
depender da existência de asset (FR-015); dano/custo/cadência do Caramelo
inalterados (só o `range` muda: 120 → 200).

**Scale/Scope**: 1 torre no roster, 1 inimigo, ~10–40 inimigos vivos por onda.
Superfície da mudança: 3 arquivos novos (sistema puro + testes + contrato de dados),
4 arquivos editados (`data/towers.ts`, `data/contracts.ts`, `entities/Tower.ts`,
`entities/TowerAttackAnimator.ts`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Veredito | Como o design satisfaz |
|-----------|----------|------------------------|
| I. Gameplay em primeiro lugar | ✅ | A fatia existe para consertar uma sensação ruim (cachorro-ioiô). Nenhuma abstração além do que as US1–US3 exigem. |
| III. Performance desde o início | ✅ | Uma varredura O(n) por torre/frame (igual a hoje). Estado do engajamento é mutado in-place, sem alocar por frame. Sem otimização especulativa. |
| IV. Arquitetura desacoplada | ✅ | Regra sai de uma classe Phaser (`TowerAttackAnimator`) para um módulo puro. `Tower` coordena; não concentra regra. Sem ciclo: `systems/engagement` → `systems/targeting` + `data/towers` (tipos). |
| V. Dados / lógica / apresentação | ✅ | `engagement` é campo de dado da torre (FR-004). Animação vira apresentação pura. Velocidade de perseguição e distância de chegada continuam em `attackAnimation` (apresentação) e são **injetadas** no sistema, não lidas por ele. |
| VI. Evolução incremental | ✅ | Dois perfis, uma união discriminada. Nada de "patrulha/orbital" antecipado. Nova torre = nova entrada em `src/data/`. |
| VII. TypeScript rigoroso | ✅ | `engagement` é campo **obrigatório** → o compilador força FR-001. Fases do engajamento como união discriminada, não flags. Sem `any`/`as`. |
| VIII. Determinismo | ✅ | Máquina de estados avança por `deltaSec`. Desempate de alvo = primeiro na ordem de avaliação (sem sorteio). Timings em segundos, não em frames. |
| IX. Testabilidade | ✅ | Encadear vs. retornar, validade de alvo, coleira e chegada à base são exercitáveis com objetos simples, sem cena (FR-016). |
| X. Observabilidade | ✅ | `DebugOverlay` já desenha alcance e alvo por torre; passa a desenhar a partir da base e a marcar a posição do perseguidor. Erros de textura continuam logando (sem erro silencioso). |
| XI. Assets substituíveis | ✅ | **Melhora**: hoje o dano sai na deixa do animador (com `onComplete` como rede de segurança). Passa a sair num instante calculado a partir dos *dados* da animação — textura ausente não muda nem o dano nem o tempo. |
| XIV. Definição de concluído | ✅ | Testes de regra, typecheck verde, contrato de gameplay atualizado em `data/contracts.ts`, validação em jogo via `verify`. |

**Resultado: PASS.** Nenhuma violação a justificar; a seção Complexity Tracking
fica vazia. O design **remove** acoplamento em vez de adicioná-lo — o que ele
introduz de novo (um módulo de sistema) é exatamente a camada que a Arquitetura de
Referência prevê para "sistemas de regra ... isoláveis e testáveis sem renderização".

### Re-check pós-design (Fase 1)

Reavaliado após `data-model.md` e `contracts/`: **PASS, sem novas violações.** O
design final não acrescentou nenhuma abstração além das previstas — um módulo de
sistema, uma união discriminada de fases, um enum de duas variantes. Dois pontos
que o design fechou e que o gate inicial só previa:

- **Alocação no hot path (III)**: `stepEngagement` muta o estado in-place e devolve
  um array vazio compartilhado nos frames sem golpe — nenhum lixo novo por frame.
- **Estado inválido irrepresentável (VII)**: o alvo vive *dentro* da variante de
  fase, então "perseguindo sem alvo" e "ocioso com alvo" não compilam.

### Nota de mudança arquitetural (Governança)

Esta fatia quebra um contrato interno atual: `TowerAttackAnimator` deixa de ser
dono da posição do perseguidor e da deixa do golpe. Motivação: as regras das US1/US2
(encadear, retornar, coleira) são gameplay e não podem viver numa classe Phaser sem
violar os princípios IV/IX e o FR-016. Trade-off aceito: um refactor do animador
agora, em troca de regras testáveis e de um caminho de dano que não depende de
asset. Nenhuma outra torre depende do animador hoje, então o custo é local.

## Project Structure

### Documentation (this feature)

```text
specs/009-engajamento-ataque-torre/
├── plan.md              # Este arquivo
├── research.md          # Fase 0: decisões e alternativas
├── data-model.md        # Fase 1: entidades e tipos
├── quickstart.md        # Fase 1: como validar a fatia
├── contracts/
│   ├── engagement-system.md   # API do módulo puro de engajamento
│   └── tower-data.md          # Esquema de dados da torre + contrato de gameplay
└── tasks.md             # Fase 2 (/speckit-tasks — não criado aqui)
```

### Source Code (repository root)

```text
src/
├── core/
│   └── constants.ts                   # [EDIT] timings de fallback do engajamento
├── data/
│   ├── towers.ts                      # [EDIT] EngagementProfile + engagement:'pursuer', range 200
│   ├── towers.test.ts                 # [EDIT] toda torre declara um perfil
│   ├── contracts.ts                   # [EDIT] contrato aceito: range 200 + engagement
│   └── contracts.test.ts              # (gate de deriva — passa a cobrir os novos valores)
├── systems/
│   ├── engagement.ts                  # [NOVO] máquina de estados pura (sem Phaser)
│   ├── engagement.test.ts             # [NOVO] US1, US2, edge cases, coleira
│   ├── targeting.ts                   # (reusado como está)
│   └── combat.ts                      # [EDIT] leve: `isTargetValid` medido da base
├── entities/
│   ├── Tower.ts                       # [EDIT] adaptador: estado puro → dano + animação
│   └── TowerAttackAnimator.ts         # [EDIT] só apresentação (frames + flip + posição lida)
└── debug/
    └── DebugOverlay.ts                # [EDIT] alcance a partir da base; marca o perseguidor
```

**Structure Decision**: Projeto único, mantendo o layout já materializado em `src/`
e descrito na Arquitetura de Referência da constitution. O engajamento entra como
**sistema de regra** (`src/systems/`), a camada que a constitution reserva para
lógica isolável e testável sem renderização — a mesma prateleira de `targeting.ts`
e `combat.ts`, com quem ele compõe.

## Complexity Tracking

> Constitution Check passou sem violações. Nada a justificar.
